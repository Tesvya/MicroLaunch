import axios from 'axios'
import { publicClientUrl, publicServerUrl } from '../../shared/utils/urls.js'

// Base URLs can be overridden with env vars (used by the automated tests to point at a mock gateway).
const paymongoBase = () => process.env.PAYMONGO_BASE_URL || 'https://api.paymongo.com/v1'
const paypalBase = () => process.env.PAYPAL_BASE_URL || (process.env.PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com')
const paymongoAuth = () => { const k = process.env.PAYMONGO_SECRET_KEY; if (!k) throw new Error('PAYMONGO_SECRET_KEY not configured'); return `Basic ${Buffer.from(k + ':').toString('base64')}` }

export const createPaymongoLink = async ({ amount, description, method, metadata = {} }) => {
    const r = await axios.post(`${paymongoBase()}/links`, { data: { attributes: { amount: Math.round(amount * 100), description, remarks: metadata?.referenceNumber || '' } } }, { headers: { Authorization: paymongoAuth(), 'Content-Type': 'application/json' } })
    const l = r.data.data
    return { provider: 'PAYMONGO', method, checkoutUrl: l.attributes.checkout_url, referenceId: l.id, status: 'PENDING', rawResponse: l }
}
export const retrievePaymongoLink = async (linkId) => {
    const r = await axios.get(`${paymongoBase()}/links/${linkId}`, { headers: { Authorization: paymongoAuth() } })
    const l = r.data.data
    return { referenceId: l.id, status: l.attributes.status === 'paid' ? 'SUCCESS' : 'PENDING', rawResponse: l }
}

let _pt = null, _pte = 0
const getPaypalToken = async () => {
    if (_pt && Date.now() < _pte) return _pt
    const ci = process.env.PAYPAL_CLIENT_ID, cs = process.env.PAYPAL_CLIENT_SECRET
    if (!ci || !cs) throw new Error('PayPal credentials not configured')
    const r = await axios.post(`${paypalBase()}/v1/oauth2/token`, 'grant_type=client_credentials', { headers: { Authorization: `Basic ${Buffer.from(`${ci}:${cs}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' } })
    _pt = r.data.access_token; _pte = Date.now() + (r.data.expires_in - 60) * 1000
    return _pt
}
export const createPaypalOrder = async ({ amount, description, referenceNumber }) => {
    const t = await getPaypalToken()
    // PayPal sends the buyer back to OUR SERVER first (so we can capture the payment), which then redirects to the site.
    const r = await axios.post(`${paypalBase()}/v2/checkout/orders`, {
        intent: 'CAPTURE',
        purchase_units: [{ reference_id: referenceNumber, description, amount: { currency_code: 'PHP', value: amount.toFixed(2) } }],
        application_context: { return_url: `${publicServerUrl()}/api/v1/payments/paypal/capture`, cancel_url: `${publicClientUrl()}/app/payments/paypal/cancel` }
    }, { headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } })
    const o = r.data
    return { provider: 'PAYPAL', method: 'PAYPAL', checkoutUrl: o.links.find((l) => l.rel === 'approve')?.href, referenceId: o.id, status: 'PENDING', rawResponse: o }
}
export const capturePaypalOrder = async (orderId) => {
    const t = await getPaypalToken()
    const r = await axios.post(`${paypalBase()}/v2/checkout/orders/${orderId}/capture`, {}, { headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' } })
    const o = r.data
    return { referenceId: o.id, status: o.status === 'COMPLETED' ? 'SUCCESS' : 'PENDING', rawResponse: o }
}
export const getPaypalOrder = async (orderId) => {
    const t = await getPaypalToken()
    const r = await axios.get(`${paypalBase()}/v2/checkout/orders/${orderId}`, { headers: { Authorization: `Bearer ${t}` } })
    return r.data
}
