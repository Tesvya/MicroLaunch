import crypto from 'crypto'
import IncomeEntry from '../income/models/income-entry.model.js'
import Transaction from '../transactions/models/transaction.model.js'
import { createNotification } from '../notifications/notifications.controller.js'
import { publicClientUrl } from '../../shared/utils/urls.js'
import { capturePaypalOrder, retrievePaymongoLink, getPaypalOrder } from './gateway.js'

export const peso = (n) => `\u20b1${Number(n).toLocaleString('en-PH')}`

export const markSuccess = async (t, rawResponse) => {
    t.status = 'SUCCESS'; t.simulatedGatewayResponse = rawResponse; t.completedAt = new Date(); await t.save()
    if (t.incomeEntryId) await IncomeEntry.updateOne({ _id: t.incomeEntryId }, { $set: { payoutStatus: 'PAID' } })
    await createNotification({ userId: t.userId, notificationType: 'PAYMENT', title: 'Payment confirmed', message: `Your payout of ${peso(t.amount)} (${t.referenceNumber}) was approved and paid.` })
}

// Users never see the checkout link: the admin is the one who pays.
export const forUser = (t) => { const o = t.toObject(); delete o.checkoutUrl; delete o.simulatedGatewayResponse; return o }

/** Asks the payment provider (the source of truth) for the current state of a pending transaction and updates it. */
const refreshFromProvider = async (t) => {
    if (t.status !== 'PENDING' || !t.gatewayReferenceId) return t
    let result = null
    if (t.provider === 'PAYMONGO') result = await retrievePaymongoLink(t.gatewayReferenceId)
    else if (t.provider === 'PAYPAL') {
        const o = await getPaypalOrder(t.gatewayReferenceId)
        result = o.status === 'APPROVED' ? await capturePaypalOrder(t.gatewayReferenceId) : { status: o.status === 'COMPLETED' ? 'SUCCESS' : 'PENDING', rawResponse: o }
    }
    if (result?.status === 'SUCCESS') await markSuccess(t, result.rawResponse)
    return t
}

// PayPal sends the buyer's browser here after they approve. We capture the money, then send them back to the site.
export const capturePaypal = async (req, res) => {
    const site = publicClientUrl()
    try {
        const orderId = req.query.token
        if (!orderId) return res.redirect(`${site}/admin/payouts?paypal=cancel`)
        const t = await Transaction.findOne({ gatewayReferenceId: String(orderId), provider: 'PAYPAL' })
        if (!t) return res.redirect(`${site}/admin/payouts?paypal=cancel`)
        if (t.status === 'PENDING') {
            const result = await capturePaypalOrder(orderId)
            if (result.status === 'SUCCESS') await markSuccess(t, result.rawResponse)
        }
        return res.redirect(`${site}/admin/payouts?paypal=success&ref=${encodeURIComponent(t.referenceNumber)}`)
    } catch (error) { console.error('[PayPal capture]', error?.response?.data || error.message); return res.redirect(`${site}/admin/payouts?paypal=cancel`) }
}

/**
 * PayMongo webhook. Verifies the signature against the RAW body, then re-checks the payment with PayMongo itself
 * rather than trusting the payload, so a forged or oddly-shaped event can never mark a payment as paid.
 */
export const paymongoWebhook = async (req, res) => {
    try {
        const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body || {})
        const secret = process.env.PAYMONGO_WEBHOOK_SECRET
        if (secret) {
            const parts = Object.fromEntries(String(req.headers['paymongo-signature'] || '').split(',').map((kv) => { const i = kv.indexOf('='); return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()] }))
            const provided = parts.li || parts.te // li = live-mode signature, te = test-mode signature (the unused one is empty)
            const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest('hex')
            if (!parts.t || !provided || provided.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) return res.status(400).json({ message: 'Invalid signature' })
        }
        let event
        try { event = JSON.parse(rawBody) } catch { return res.status(400).json({ message: 'Invalid payload' }) }
        const attrs = event?.data?.attributes
        if (attrs?.type === 'link.payment.paid') {
            const candidates = new Set([attrs.data?.id, ...(JSON.stringify(attrs.data || {}).match(/link_[A-Za-z0-9]+/g) || [])].filter(Boolean))
            for (const linkId of candidates) {
                const t = await Transaction.findOne({ gatewayReferenceId: linkId, provider: 'PAYMONGO', status: 'PENDING' })
                if (t) { await refreshFromProvider(t); break }
            }
        }
        return res.status(200).json({ received: true })
    } catch (error) { console.error('[Webhook]', error?.response?.data || error.message); return res.status(500).json({ message: 'Webhook processing failed' }) }
}

export const verifyPayment = async (req, res) => {
    try {
        const isAdmin = req.user.roleId?.name === 'ADMIN'
        const t = await Transaction.findOne({ _id: req.params.id, ...(isAdmin ? {} : { userId: req.user._id }) })
        if (!t) return res.status(404).json({ message: 'Transaction not found' })
        await refreshFromProvider(t)
        return res.status(200).json({ properties: { transaction: forUser(t) } })
    } catch (error) { return res.status(500).json({ message: 'Could not verify payment: ' + (error?.response?.data?.errors?.[0]?.detail || error.message) }) }
}

export const listMyTransactions = async (req, res) => {
    try { return res.status(200).json({ properties: { transactions: await Transaction.find({ userId: req.user._id }).select('-checkoutUrl -simulatedGatewayResponse').populate('incomeEntryId', 'title').sort({ createdAt: -1 }) } }) }
    catch (error) { return res.status(500).json({ message: error.message }) }
}
