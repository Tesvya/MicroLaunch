import mongoose from 'mongoose'
import Application from './models/application.model.js'
import ApplicationFile from './models/application-file.model.js'
import SideHustle from '../sidehustles/models/side-hustle.model.js'
import UserProfile from '../profile/models/user-profile.model.js'
import { createNotification } from '../notifications/notifications.controller.js'
import { logActivity } from '../activitylogs/activitylogs.controller.js'
import { sendMail, decisionEmail } from '../../shared/utils/mailer.js'
import { publicClientUrl } from '../../shared/utils/urls.js'
import { detectFileType, cleanFileName } from './fileTypes.js'
import { filledCountMap } from './filledCounts.js'


// RFC 6266/5987: ASCII fallback for old clients + the real UTF-8 name in filename*. (Raw accents in a quoted filename are not portable.)
const attachmentHeader = (name) => {
    const ascii = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
    const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

// ── USER ──────────────────────────────────────────────────────────────────────

export const applyToSideHustle = async (req, res) => {
    try {
        const { sideHustleId, recommendationId, coverNote } = req.validatedData.body
        if (!mongoose.isValidObjectId(sideHustleId)) return res.status(404).json({ message: 'Side-hustle listing not found or no longer active' })

        // Check every file by its real contents before anything is stored
        const checked = []
        for (const f of req.files || []) {
            const name = cleanFileName(f.originalname)
            const type = detectFileType(f.buffer, name)
            if (!type) return res.status(400).json({ message: `"${name}" is not a supported file. Attach PDF, PNG, JPG or Word (.doc/.docx) files only.` })
            checked.push({ name, mimeType: type.mimeType, size: f.size, buffer: f.buffer })
        }

        const listing = await SideHustle.findById(sideHustleId)
        if (!listing || listing.status !== 'ACTIVE') return res.status(404).json({ message: 'Side-hustle listing not found or no longer active' })

        const fields = { coverNote: coverNote || '', recommendationId: mongoose.isValidObjectId(recommendationId) ? recommendationId : null }
        let application = await Application.findOne({ userId: req.user._id, sideHustleId })
        if (application && application.applicationStatus !== 'CANCELLED') return res.status(409).json({ message: 'You have already applied to this opportunity' })

        if (application) {
            // Re-applying after cancelling (e.g. forgot to attach a resume): reuse the record, drop the old files
            await ApplicationFile.deleteMany({ applicationId: application._id })
            application.set({ ...fields, applicationStatus: 'PENDING', attachments: [], decisionMessage: '', decidedAt: null, decidedBy: null, applicationDate: new Date(), updatedAt: new Date() })
            await application.save()
        } else {
            application = await Application.create({ userId: req.user._id, sideHustleId, ...fields })
        }

        if (checked.length) {
            const docs = await ApplicationFile.insertMany(checked.map((c) => ({ userId: req.user._id, applicationId: application._id, originalName: c.name, mimeType: c.mimeType, size: c.size, data: c.buffer })))
            application.attachments = docs.map((d) => ({ fileId: d._id, originalName: d.originalName, mimeType: d.mimeType, size: d.size }))
            await application.save()
        }

        await createNotification({ userId: req.user._id, notificationType: 'APPLICATION', title: 'Application submitted', message: `You successfully applied to "${listing.title}". Your application is pending review.` })
        return res.status(201).json({ message: 'Application submitted successfully', properties: { application } })
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: 'You have already applied to this opportunity' })
        return res.status(500).json({ message: error.message })
    }
}

export const listMyApplications = async (req, res) => {
    try {
        const applications = await Application.find({ userId: req.user._id }).populate('sideHustleId', 'title workMode payAmountMin payAmountMax payType location status').sort({ applicationDate: -1 })
        return res.status(200).json({ properties: { applications } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}

export const cancelApplication = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Application not found' })
        const app = await Application.findOne({ _id: req.params.id, userId: req.user._id })
        if (!app) return res.status(404).json({ message: 'Application not found' })
        if (app.applicationStatus !== 'PENDING') return res.status(400).json({ message: 'Only pending applications can be cancelled' })
        app.applicationStatus = 'CANCELLED'; app.updatedAt = new Date(); await app.save()
        return res.status(200).json({ message: 'Application cancelled', properties: { application: app } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}

/** Downloads one attached file. Only the applicant who uploaded it and admins may fetch it. */
export const downloadAttachment = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.fileId)) return res.status(404).json({ message: 'File not found' })
        const file = await ApplicationFile.findById(req.params.fileId)
        const isAdmin = req.user.roleId?.name === 'ADMIN'
        // 404 (not 403) for other people's files so their existence is not revealed
        if (!file || (!isAdmin && String(file.userId) !== String(req.user._id))) return res.status(404).json({ message: 'File not found' })
        res.setHeader('Content-Disposition', attachmentHeader(file.originalName)) // always a download, never rendered inline by the browser
        res.setHeader('Content-Type', file.mimeType)    // the type we VERIFIED from the file's contents
        res.setHeader('Cache-Control', 'private, no-store')
        return res.send(file.data)
    } catch (error) { return res.status(500).json({ message: error.message }) }
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────

export const listAllApplications = async (req, res) => {
    try {
        const { status } = req.query
        const apps = await Application.find(status ? { applicationStatus: status } : {})
            .populate('userId', 'name email')
            .populate('sideHustleId', 'title workMode payAmountMin payAmountMax payType openings status')
            .sort({ applicationDate: -1 }).lean()
        // Give the admin what they need to decide: applicant profile + how many openings are already filled
        const userIds = [...new Set(apps.map((a) => a.userId?._id).filter(Boolean).map(String))]
        const profiles = userIds.length ? await UserProfile.find({ userId: { $in: userIds.map((i) => new mongoose.Types.ObjectId(i)) } }).select('userId bio skills interests qualifications experienceLevel weeklyAvailabilityHours availableDays userGroup location').lean() : []
        const profileByUser = new Map(profiles.map((p) => [String(p.userId), p]))
        const filled = await filledCountMap(apps.map((a) => a.sideHustleId?._id).filter(Boolean))
        const applications = apps.map((a) => ({ ...a, applicantProfile: a.userId ? profileByUser.get(String(a.userId._id)) || null : null, approvedCount: a.sideHustleId ? filled.get(String(a.sideHustleId._id)) || 0 : 0 }))
        return res.status(200).json({ properties: { applications } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}

// Allowed moves. REJECTED / COMPLETED / CANCELLED are final.
const ALLOWED = { PENDING: ['APPROVED', 'REJECTED'], APPROVED: ['COMPLETED', 'REJECTED'] }

export const updateApplicationStatus = async (req, res) => {
    try {
        const { applicationStatus, decisionMessage } = req.validatedData.body
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Application not found' })
        const app = await Application.findById(req.params.id).populate('userId', 'name email').populate('sideHustleId', 'title openings status')
        if (!app) return res.status(404).json({ message: 'Application not found' })
        if (!app.userId || !app.sideHustleId) return res.status(409).json({ message: 'The applicant or the listing no longer exists' })
        if (!ALLOWED[app.applicationStatus]?.includes(applicationStatus)) return res.status(409).json({ message: `An application that is ${app.applicationStatus.toLowerCase()} cannot be changed to ${applicationStatus.toLowerCase()}.` })

        const listing = app.sideHustleId
        let fillsLastOpening = false
        if (applicationStatus === 'APPROVED' && listing.openings != null) {
            const taken = await Application.countDocuments({ sideHustleId: listing._id, applicationStatus: { $in: ['APPROVED', 'COMPLETED'] } })
            if (taken >= listing.openings) return res.status(409).json({ message: `All ${listing.openings} opening(s) for this side-hustle are already filled. Increase the number of openings on the listing first.` })
            fillsLastOpening = taken + 1 >= listing.openings
        }

        app.applicationStatus = applicationStatus
        if (applicationStatus !== 'COMPLETED') app.decisionMessage = (decisionMessage || '').trim()
        app.decidedAt = new Date(); app.decidedBy = req.user._id; app.updatedAt = new Date()
        await app.save()

        if (fillsLastOpening) {
            await SideHustle.updateOne({ _id: listing._id }, { $set: { status: 'CLOSED', updatedAt: new Date() } })
            await logActivity({ adminId: req.user._id, activity: `All ${listing.openings} opening(s) filled, "${listing.title}" was closed automatically`, module: 'LISTINGS' })
        }

        const msg = app.decisionMessage
        const note = {
            APPROVED: { title: 'Application approved', message: `Congratulations! Your application to "${listing.title}" has been approved.${msg ? ` Message from the admin: ${msg}` : ''}` },
            REJECTED: { title: 'Application not approved', message: `Your application to "${listing.title}" was not approved. Reason: ${msg}` },
            COMPLETED: { title: 'Application completed', message: `Your application to "${listing.title}" has been marked as completed.` }
        }[applicationStatus]
        await createNotification({ userId: app.userId._id, notificationType: 'APPLICATION', ...note })

        if (applicationStatus !== 'COMPLETED') { // email is best-effort and never blocks the decision
            try { await sendMail({ to: app.userId.email, ...decisionEmail({ name: app.userId.name, listingTitle: listing.title, status: applicationStatus, message: msg, siteUrl: publicClientUrl() }) }) }
            catch (error) { console.error('[Mail] Decision email failed:', error.message) }
        }

        await logActivity({ adminId: req.user._id, activity: `${applicationStatus === 'REJECTED' ? 'Rejected' : applicationStatus === 'APPROVED' ? 'Approved' : 'Completed'} application of ${app.userId.name} for "${listing.title}"`, module: 'APPLICATIONS' })
        return res.status(200).json({ message: 'Application updated', properties: { application: app } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}
