import crypto from 'crypto'
import mongoose from 'mongoose'
import IncomeEntry from '../income/models/income-entry.model.js'
import Application from '../applications/models/application.model.js'
import Transaction from '../transactions/models/transaction.model.js'
import { createNotification } from '../notifications/notifications.controller.js'
import { logActivity } from '../activitylogs/activitylogs.controller.js'
import { createPaymongoLink, createPaypalOrder } from './gateway.js'
import { forUser, markSuccess, peso } from './payments.controller.js'

const METHODS = ['GCASH', 'MAYA', 'PAYPAL', 'MOCK_GCASH', 'MOCK_BANK_TRANSFER', 'MOCK_CARD']
const ACTIVE = ['REQUESTED', 'PENDING', 'SUCCESS']
const ALREADY = 'A payout for this entry was already requested or paid'
const DECIDED = 'This payout was not found or has already been decided'

const genRef = () => `ML-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
const findWorkedApplication = (userId, sideHustleId) => Application.findOne({ userId, sideHustleId, applicationStatus: { $in: ['APPROVED', 'COMPLETED'] } })

/** USER: asks for a payout. No money moves until an admin confirms the job was completed. */
export const requestPayout = async (req, res) => {
    let claimed = null
    try {
        const { incomeEntryId, method } = req.body
        if (!METHODS.includes(method)) return res.status(400).json({ message: 'Invalid payment method' })
        const entry = mongoose.isValidObjectId(incomeEntryId) ? await IncomeEntry.findOne({ _id: String(incomeEntryId), userId: req.user._id }) : null
        if (!entry) return res.status(404).json({ message: 'Income entry not found' })
        if (entry.status !== 'COMPLETED') return res.status(400).json({ message: 'Mark the entry as completed before requesting a payout' })
        if (!(entry.amountEarned > 0)) return res.status(400).json({ message: 'The entry needs an amount greater than zero' })
        if (!entry.sideHustleId || !(await findWorkedApplication(req.user._id, entry.sideHustleId))) return res.status(400).json({ message: 'Payouts are only available for side-hustles you were approved for. Manual entries are for tracking only.' })
        if (await Transaction.exists({ incomeEntryId: entry._id, status: { $in: ACTIVE } })) return res.status(409).json({ message: ALREADY })

        // Atomic claim: two simultaneous clicks cannot create two requests, and the entry is frozen from here on
        claimed = await IncomeEntry.findOneAndUpdate({ _id: entry._id, status: 'COMPLETED', payoutStatus: { $in: [null, 'NONE', 'REJECTED'] } }, { $set: { payoutStatus: 'REQUESTED' } }, { new: true })
        if (!claimed) return res.status(409).json({ message: ALREADY })
        const transaction = await Transaction.create({ userId: req.user._id, incomeEntryId: entry._id, method, amount: claimed.amountEarned, referenceNumber: genRef(), status: 'REQUESTED' })
        await createNotification({ userId: req.user._id, notificationType: 'PAYMENT', title: 'Payout requested', message: `Your payout request of ${peso(transaction.amount)} for "${entry.title}" is waiting for admin approval.` })
        return res.status(201).json({ message: 'Payout requested', properties: { transaction: forUser(transaction) } })
    } catch (error) {
        if (claimed) await IncomeEntry.updateOne({ _id: claimed._id }, { $set: { payoutStatus: 'NONE' } }).catch(() => {})
        return res.status(500).json({ message: error.message })
    }
}

/** ADMIN: every payout, with what is needed to judge whether the job was really done. */
export const listPayouts = async (req, res) => {
    try {
        const status = ['REQUESTED', 'PENDING', 'SUCCESS', 'REJECTED', 'FAILED', 'REFUNDED'].includes(req.query.status) ? req.query.status : null
        const rows = await Transaction.find(status ? { status } : {}).select('-simulatedGatewayResponse').populate('userId', 'name email')
            .populate({ path: 'incomeEntryId', select: 'title hoursSpent notes completedAt sideHustleId', populate: { path: 'sideHustleId', select: 'title payAmountMin payAmountMax payType' } })
            .populate('reviewedBy', 'name').sort({ createdAt: -1 }).lean()
        const key = (u, s) => `${u}:${s}`
        const userIds = rows.map((t) => t.userId?._id).filter(Boolean)
        const apps = await Application.find({ userId: { $in: userIds } }).select('userId sideHustleId applicationStatus').lean()
        const appMap = new Map(apps.map((a) => [key(a.userId, a.sideHustleId), a.applicationStatus]))
        // What was already paid for the same job: helps spot duplicate claims
        const paidRows = await Transaction.find({ userId: { $in: userIds }, status: 'SUCCESS', incomeEntryId: { $ne: null } }).select('userId amount incomeEntryId').populate('incomeEntryId', 'sideHustleId').lean()
        const paid = new Map()
        for (const t of paidRows) {
            if (!t.incomeEntryId?.sideHustleId) continue
            const k = key(t.userId, t.incomeEntryId.sideHustleId)
            paid.set(k, (paid.get(k) || 0) + t.amount)
        }
        const payouts = rows.map((t) => {
            const k = key(t.userId?._id, t.incomeEntryId?.sideHustleId?._id)
            return { ...t, applicationStatus: appMap.get(k) || null, paidForSameJob: paid.get(k) || 0 }
        })
        return res.status(200).json({ properties: { payouts } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}

const startGatewayPayment = async ({ method, amount, referenceNumber }) => {
    const description = `MICROLAUNCH payout - ${referenceNumber}`
    const isMock = method.startsWith('MOCK') || (!process.env.PAYMONGO_SECRET_KEY && ['GCASH', 'MAYA'].includes(method)) || (!process.env.PAYPAL_CLIENT_ID && method === 'PAYPAL')
    if (isMock) return { provider: 'MOCK_GATEWAY', checkoutUrl: null, referenceId: referenceNumber, status: 'SUCCESS', rawResponse: { note: 'Simulated. No real funds moved.', processedAt: new Date().toISOString() } }
    if (method === 'PAYPAL') return createPaypalOrder({ amount, description, referenceNumber })
    return createPaymongoLink({ amount, description, method, metadata: { referenceNumber } })
}

/** ADMIN: confirms the job was completed and releases the payout. */
export const approvePayout = async (req, res) => {
    try {
        if (req.body.jobConfirmed !== true) return res.status(400).json({ message: 'Confirm that the job was completed before approving the payout' })
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Payout not found' })
        // Atomic claim so two admins cannot both release the same payout
        const t = await Transaction.findOneAndUpdate({ _id: req.params.id, status: 'REQUESTED' }, { $set: { status: 'PENDING', reviewedBy: req.user._id, reviewedAt: new Date() } }, { new: true })
        if (!t) return res.status(409).json({ message: DECIDED })
        const release = () => Transaction.updateOne({ _id: t._id }, { $set: { status: 'REQUESTED', reviewedBy: null, reviewedAt: null } })

        let gr, application, entry
        try {
            entry = await IncomeEntry.findById(t.incomeEntryId)
            application = entry ? await findWorkedApplication(t.userId, entry.sideHustleId) : null
            if (!application) { await release(); return res.status(409).json({ message: 'The applicant is no longer approved for this side-hustle. Reject this request instead.' }) }
            gr = await startGatewayPayment(t)
        } catch (error) {
            await release()
            console.error('[Payments]', error?.response?.data || error.message)
            return res.status(502).json({ message: 'Payment gateway error, the request is still waiting: ' + error.message })
        }

        t.provider = gr.provider; t.gatewayReferenceId = gr.referenceId; t.checkoutUrl = gr.checkoutUrl || null; t.simulatedGatewayResponse = gr.rawResponse
        if (gr.status === 'SUCCESS') await markSuccess(t, gr.rawResponse)
        else {
            await t.save()
            await IncomeEntry.updateOne({ _id: t.incomeEntryId }, { $set: { payoutStatus: 'PROCESSING' } })
            await createNotification({ userId: t.userId, notificationType: 'PAYMENT', title: 'Payout approved', message: `Your payout of ${peso(t.amount)} for "${entry.title}" was approved and is being processed.` })
        }
        await Application.updateOne({ _id: application._id, applicationStatus: 'APPROVED' }, { $set: { applicationStatus: 'COMPLETED', decidedAt: new Date(), decidedBy: req.user._id, updatedAt: new Date() } })
        await logActivity({ adminId: req.user._id, activity: `Confirmed job completion and approved payout ${t.referenceNumber} (${peso(t.amount)})`, module: 'TRANSACTIONS' })
        return res.status(200).json({ message: 'Payout approved', properties: { transaction: t, checkoutUrl: t.checkoutUrl } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}

export const rejectPayout = async (req, res) => {
    try {
        const reason = String(req.body.reason || '').trim().slice(0, 500)
        if (reason.length < 10) return res.status(400).json({ message: 'Please give a reason for the rejection (at least 10 characters).' })
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Payout not found' })
        const t = await Transaction.findOneAndUpdate({ _id: req.params.id, status: 'REQUESTED' }, { $set: { status: 'REJECTED', rejectionReason: reason, reviewedBy: req.user._id, reviewedAt: new Date() } }, { new: true })
        if (!t) return res.status(409).json({ message: DECIDED })
        await IncomeEntry.updateOne({ _id: t.incomeEntryId }, { $set: { payoutStatus: 'REJECTED' } })
        await createNotification({ userId: t.userId, notificationType: 'PAYMENT', title: 'Payout not approved', message: `Your payout request of ${peso(t.amount)} was not approved. Reason: ${reason} You can correct the entry and request again.` })
        await logActivity({ adminId: req.user._id, activity: `Rejected payout ${t.referenceNumber} (${peso(t.amount)})`, module: 'TRANSACTIONS' })
        return res.status(200).json({ message: 'Payout rejected', properties: { transaction: t } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}
