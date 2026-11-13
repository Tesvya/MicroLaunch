import crypto from 'crypto'
import Transaction from '../transactions/models/transaction.model.js'
import { createNotification } from '../notifications/notifications.controller.js'
import { publicClientUrl } from '../../shared/utils/urls.js'
import { createPaymongoLink, createPaypalOrder, capturePaypalOrder, retrievePaymongoLink, getPaypalOrder } from './gateway.js'

const genRef = () => `ML-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`
const peso = (n) => `\u20b1${Number(n).toLocaleString('en-PH')}`

const markSuccess = async (t, rawResponse) => {
    t.status = 'SUCCESS'; t.simulatedGatewayResponse = rawResponse; t.completedAt = new Date(); await t.save()
    await createNotification({ userId: t.userId, notificationType: 'PAYMENT', title: 'Payment confirmed', message: `Payment of ${peso(t.amount)} (${t.referenceNumber}) confirmed.` })
}

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

export const initiatePayment = async (req, res) => {
    try {
        const { incomeEntryId, amount, method } = req.body
        if (!amount || amount <= 0) return res.status(400).json({ message: 'Valid amount required' })
        if (!['GCASH', 'MAYA', 'PAYPAL', 'MOCK_GCASH', 'MOCK_BANK_TRANSFER', 'MOCK_CARD'].includes(method)) return res.status(400).json({ message: 'Invalid payment method' })
        const referenceNumber = genRef(); const description = `MICROLAUNCH payout - ${referenceNumber}`
        const isMock = method.startsWith('MOCK') || (!process.env.PAYMONGO_SECRET_KEY && ['GCASH', 'MAYA'].includes(method)) || (!process.env.PAYPAL_CLIENT_ID && method === 'PAYPAL')
        let gr
        if (isMock) gr = { provider: 'MOCK_GATEWAY', method, checkoutUrl: null, referenceId: referenceNumber, status: 'SUCCESS', rawResponse: { note: 'Simulated. No real funds moved.', processedAt: new Date().toISOString() } }
        else if (['GCASH', 'MAYA'].includes(method)) gr = await createPaymongoLink({ amount, description, method, metadata: { referenceNumber } })
        else gr = await createPaypalOrder({ amount, description, referenceNumber })
        const transaction = await Transaction.create({ userId: req.user._id, incomeEntryId: incomeEntryId || null, provider: gr.provider, method: gr.method, amount, referenceNumber, gatewayReferenceId: gr.referenceId, status: gr.status, checkoutUrl: gr.checkoutUrl || null, simulatedGatewayResponse: gr.rawResponse, completedAt: gr.status === 'SUCCESS' ? new Date() : null })
        if (gr.status === 'SUCCESS') await createNotification({ userId: req.user._id, notificationType: 'PAYMENT', title: 'Payment processed', message: `Payout of ${peso(amount)} (${referenceNumber}) processed successfully.` })
        return res.status(201).json({ message: gr.checkoutUrl ? 'Redirect to payment gateway' : 'Payment processed', properties: { transaction, checkoutUrl: gr.checkoutUrl || null } })
    } catch (error) { console.error('[Payments]', error?.response?.data || error.message); return res.status(500).json({ message: 'Payment gateway error: ' + error.message }) }
}

// PayPal sends the buyer's browser here after they approve. We capture the money, then send them back to the site.
export const capturePaypal = async (req, res) => {
    const site = publicClientUrl()
    try {
        const orderId = req.query.token
        if (!orderId) return res.redirect(`${site}/app/payments/paypal/cancel`)
        const t = await Transaction.findOne({ gatewayReferenceId: String(orderId), provider: 'PAYPAL' })
        if (!t) return res.redirect(`${site}/app/payments/paypal/cancel`)
        if (t.status === 'PENDING') {
            const result = await capturePaypalOrder(orderId)
            if (result.status === 'SUCCESS') await markSuccess(t, result.rawResponse)
        }
        return res.redirect(`${site}/app/payments/paypal/success?ref=${encodeURIComponent(t.referenceNumber)}`)
    } catch (error) { console.error('[PayPal capture]', error?.response?.data || error.message); return res.redirect(`${site}/app/payments/paypal/cancel`) }
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
        const t = await Transaction.findOne({ _id: req.params.id, userId: req.user._id })
        if (!t) return res.status(404).json({ message: 'Transaction not found' })
        await refreshFromProvider(t)
        return res.status(200).json({ properties: { transaction: t } })
    } catch (error) { return res.status(500).json({ message: 'Could not verify payment: ' + (error?.response?.data?.errors?.[0]?.detail || error.message) }) }
}

export const listMyTransactions = async (req, res) => {
    try { return res.status(200).json({ properties: { transactions: await Transaction.find({ userId: req.user._id }).sort({ createdAt: -1 }) } }) }
    catch (error) { return res.status(500).json({ message: error.message }) }
}
