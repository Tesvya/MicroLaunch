import mongoose from 'mongoose'
import PwdVerification from './models/pwd-verification.model.js'
import PwdFile from './models/pwd-file.model.js'
import UserProfile from './models/user-profile.model.js'
import { createNotification } from '../notifications/notifications.controller.js'
import { logActivity } from '../activitylogs/activitylogs.controller.js'
import { detectFileType, cleanFileName } from '../applications/fileTypes.js'
import { attachmentHeader } from '../applications/applications.controller.js'

const ALREADY = 'Your PWD proof is already approved or waiting for review.'

export const submitPwdProof = async (req, res) => {
    const userId = req.user._id
    let newIds = []
    try {
        if (!req.files?.length) return res.status(400).json({ message: 'Attach your PWD card or supporting documents.' })
        const checked = []
        for (const f of req.files) {
            const originalName = cleanFileName(f.originalname)
            const type = detectFileType(f.buffer, originalName)
            if (!type) return res.status(400).json({ message: `"${originalName}" is not a supported file. Attach PDF, PNG, JPG or Word (.doc/.docx) files only.` })
            checked.push({ userId, originalName, mimeType: type.mimeType, size: f.size, data: f.buffer })
        }
        if (await PwdVerification.exists({ userId, status: { $ne: 'REJECTED' } })) return res.status(409).json({ message: ALREADY })

        const docs = await PwdFile.insertMany(checked)
        newIds = docs.map((d) => d._id)
        // Only a missing or REJECTED record matches. Any other record trips the unique index (11000), even in a race.
        const verification = await PwdVerification.findOneAndUpdate(
            { userId, status: 'REJECTED' },
            { $set: { status: 'PENDING', files: docs.map((d) => ({ fileId: d._id, originalName: d.originalName, mimeType: d.mimeType, size: d.size })), rejectionReason: '', submittedAt: new Date(), decidedAt: null, decidedBy: null } },
            { new: true, upsert: true }
        )
        const keep = newIds
        newIds = [] // now referenced by the record, so never clean these up below
        await PwdFile.deleteMany({ userId, _id: { $nin: keep } }) // drop the previously rejected proof
        return res.status(201).json({ message: 'Proof submitted for review', properties: { pwdVerification: verification } })
    } catch (error) {
        if (newIds.length) await PwdFile.deleteMany({ _id: { $in: newIds } }).catch(() => {})
        if (error.code === 11000) return res.status(409).json({ message: ALREADY })
        return res.status(500).json({ message: error.message })
    }
}

export const downloadPwdFile = async (req, res) => {
    try {
        const file = mongoose.isValidObjectId(req.params.fileId) ? await PwdFile.findById(req.params.fileId) : null
        const isAdmin = req.user.roleId?.name === 'ADMIN'
        if (!file || (!isAdmin && String(file.userId) !== String(req.user._id))) return res.status(404).json({ message: 'File not found' })
        res.setHeader('Content-Disposition', attachmentHeader(file.originalName))
        res.setHeader('Content-Type', file.mimeType)
        res.setHeader('Cache-Control', 'private, no-store')
        return res.send(file.data)
    } catch (error) { return res.status(500).json({ message: error.message }) }
}

export const listPwdVerifications = async (req, res) => {
    try {
        const status = ['PENDING', 'APPROVED', 'REJECTED'].includes(req.query.status) ? req.query.status : null
        const verifications = await PwdVerification.find(status ? { status } : {}).populate('userId', 'name email').sort({ submittedAt: -1 })
        return res.status(200).json({ properties: { verifications } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}

export const decidePwdVerification = async (req, res) => {
    try {
        const { decision } = req.body
        const reason = String(req.body.reason || '').trim().slice(0, 500)
        if (!['APPROVED', 'REJECTED'].includes(decision)) return res.status(400).json({ message: 'Invalid decision' })
        if (decision === 'REJECTED' && reason.length < 10) return res.status(400).json({ message: 'Please give a reason for the rejection (at least 10 characters).' })
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Verification not found' })
        const v = await PwdVerification.findOneAndUpdate(
            { _id: req.params.id, status: 'PENDING' },
            { $set: { status: decision, rejectionReason: decision === 'REJECTED' ? reason : '', decidedAt: new Date(), decidedBy: req.user._id } },
            { new: true }
        ).populate('userId', 'name email')
        if (!v) return res.status(409).json({ message: 'This verification was not found or has already been decided' })
        if (v.userId) {
            if (decision === 'REJECTED') await UserProfile.updateOne({ userId: v.userId._id, userGroup: 'PWD' }, { $set: { userGroup: 'OTHER', updatedAt: new Date() } })
            const note = decision === 'APPROVED'
                ? { title: 'PWD verification approved', message: 'Your PWD status has been verified and now counts toward your matches.' }
                : { title: 'PWD verification not approved', message: `Your PWD proof was not approved. Reason: ${reason} You can submit new proof from My Profile.` }
            await createNotification({ userId: v.userId._id, notificationType: 'SYSTEM', ...note })
        }
        await logActivity({ adminId: req.user._id, activity: `${decision === 'APPROVED' ? 'Approved' : 'Rejected'} PWD verification of ${v.userId?.name || 'a deleted user'}`, module: 'USER_MANAGEMENT' })
        return res.status(200).json({ message: 'Verification updated', properties: { verification: v } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}
