// Runs the REAL GCash/Maya (PayMongo) and PayPal code paths against a local MOCK of those providers.
// It proves our code's flow (redirects, capture, webhook signature, verify) is internally correct.
// It does NOT prove the real providers accept our requests: do one sandbox payment to confirm that.
import '../src/configs/load-env.js'
import crypto from 'crypto'
import { spawn } from 'child_process'
import express from 'express'
import mongoose from 'mongoose'

const MOCK = 4010, APP = 4011, SECRET = 'whsec_testsecret'
const RUN = Date.now().toString(36) // unique per run, like real provider IDs, so reruns never collide with old rows
const state = { links: {}, orders: {}, seen: [], n: 0 }
const mock = express(); mock.use(express.json()); mock.use(express.urlencoded({ extended: true }))
mock.post('/v1/links', (req, res) => { const id = `link_mock${RUN}x${++state.n}`; state.links[id] = { status: 'unpaid', amount: req.body.data.attributes.amount }; res.json({ data: { id, attributes: { checkout_url: `https://pm.test/checkout/${id}`, status: 'unpaid' } } }) })
mock.get('/v1/links/:id', (req, res) => { const l = state.links[req.params.id]; if (!l) return res.status(404).json({}); res.json({ data: { id: req.params.id, attributes: { status: l.status } } }) })
mock.post('/__pay/:id', (req, res) => { state.links[req.params.id].status = 'paid'; res.json({}) })
mock.post('/v1/oauth2/token', (_q, res) => res.json({ access_token: 'tok', expires_in: 3600 }))
mock.post('/v2/checkout/orders', (req, res) => { const id = `ORDER${RUN}X${++state.n}`; state.orders[id] = { status: 'CREATED', captures: 0, ctx: req.body.application_context }; res.json({ id, status: 'CREATED', links: [{ rel: 'approve', href: `https://pp.test/approve/${id}` }] }) })
mock.get('/v2/checkout/orders/:id', (req, res) => res.json({ id: req.params.id, status: state.orders[req.params.id].status }))
mock.post('/__approve/:id', (req, res) => { state.orders[req.params.id].status = 'APPROVED'; res.json({}) })
mock.post('/v2/checkout/orders/:id/capture', (req, res) => { const o = state.orders[req.params.id]; if (o.status === 'APPROVED') { o.status = 'COMPLETED'; o.captures++ } res.json({ id: req.params.id, status: o.status }) })
const mockSrv = mock.listen(MOCK)

const app = spawn('node', ['src/server.js'], { env: { ...process.env, NODE_ENV: 'development', PORT: String(APP), PAYMONGO_SECRET_KEY: 'sk_test_mock', PAYMONGO_WEBHOOK_SECRET: SECRET, PAYMONGO_BASE_URL: `http://127.0.0.1:${MOCK}/v1`, PAYPAL_CLIENT_ID: 'id', PAYPAL_CLIENT_SECRET: 'sec', PAYPAL_BASE_URL: `http://127.0.0.1:${MOCK}`, CLIENT_LOCAL: 'http://localhost:5173' } })
await new Promise((r) => setTimeout(r, 4000))
await mongoose.connect(process.env.DATABASE_URL)

const B = `http://localhost:${APP}/api/v1`
let pass = 0, fail = 0
const check = (l, c, x = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'PASS' : 'FAIL'}  ${l} ${c ? '' : x}`) }
let cookie = ''
const req = async (m, p, b, extra = {}) => { const r = await fetch(B + p, { method: m, redirect: 'manual', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...extra }, body: b === undefined ? undefined : (typeof b === 'string' ? b : JSON.stringify(b)) }); const s = r.headers.getSetCookie?.() || []; if (s.length) cookie = s.map((c) => c.split(';')[0]).join('; '); let d = null; try { d = await r.json() } catch {} return { status: r.status, data: d, headers: r.headers } }
const sign = (body, secret = SECRET) => { const t = Math.floor(Date.now() / 1000); return `t=${t},te=${crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')},li=` }
const hook = (linkId) => JSON.stringify({ data: { id: 'evt_1', type: 'event', attributes: { type: 'link.payment.paid', livemode: false, data: { id: linkId, type: 'link', attributes: {} } } } })

try {
  const email = `gw${Date.now()}@example.com`
  let r = await req('POST', '/auth/register', { name: 'GW Tester', email, password: 'Password123', confirmPassword: 'Password123' })
  await req('POST', '/auth/verify-email', { token: new URL(r.data.properties.devVerificationUrl).searchParams.get('token') })
  await req('POST', '/auth/login', { email, password: 'Password123' })
  // Payouts now need an approved job, a user request, and an admin approval (which starts the gateway payment)
  const userCookie = cookie; cookie = ''
  await req('POST', '/auth/login', { email: 'admin@microlaunch.local', password: 'Admin12345!' }); const adminCookie = cookie
  const as = async (c, ...args) => { const prev = cookie; cookie = c; const out = await req(...args); cookie = prev; return out }
  cookie = userCookie
  const listing = (await as(adminCookie, 'POST', '/side-hustles', { title: 'GW Listing', description: 'gateway test', requiredSkills: ['x'], category: ['qa'], workMode: 'REMOTE', payType: 'FIXED', payAmountMin: 1, payAmountMax: 2, openings: 3 })).data.properties.sideHustle
  const gwApp = (await req('POST', '/applications', { sideHustleId: listing._id })).data.properties.application
  await as(adminCookie, 'PATCH', `/applications/${gwApp._id}/status`, { applicationStatus: 'APPROVED' })
  const initiate = async (method, amount = 1500) => {
    const entry = (await req('POST', '/income/entries', { title: 'GW job', sideHustleId: listing._id, amountEarned: amount, status: 'COMPLETED' })).data.properties.entry
    const q = await req('POST', '/payments/request', { incomeEntryId: entry._id, method })
    return as(adminCookie, 'POST', `/payments/${q.data.properties.transaction._id}/approve`, { jobConfirmed: true })
  }

  console.log('PayMongo (GCash / Maya)')
  r = await initiate('GCASH'); const g1 = r.data?.properties?.transaction; const url1 = r.data?.properties?.checkoutUrl
  check('GCash payout creates a PENDING PayMongo transaction', r.status === 200 && g1?.provider === 'PAYMONGO' && g1?.status === 'PENDING', JSON.stringify(r.data))
  check('returns the provider checkout URL for redirect', url1 === `https://pm.test/checkout/${g1?.gatewayReferenceId}`, url1)
  check('amount sent in centavos (PHP 1500 -> 150000)', state.links[g1.gatewayReferenceId]?.amount === 150000)
  r = await req('POST', `/payments/${g1._id}/verify`)
  check('verify while unpaid keeps it PENDING', r.data?.properties?.transaction?.status === 'PENDING')
  await fetch(`http://127.0.0.1:${MOCK}/__pay/${g1.gatewayReferenceId}`, { method: 'POST' })
  r = await req('POST', `/payments/${g1._id}/verify`)
  check('verify after the customer pays -> SUCCESS', r.data?.properties?.transaction?.status === 'SUCCESS', JSON.stringify(r.data))
  r = await req('GET', '/notifications'); check('payment confirmation notification sent', r.data?.properties?.notifications?.some((n) => n.title === 'Payment confirmed'))
  r = await initiate('MAYA', 800); check('Maya payout also goes through PayMongo', r.data?.properties?.transaction?.provider === 'PAYMONGO' && r.data?.properties?.transaction?.method === 'MAYA')

  console.log('PayMongo webhook')
  r = await initiate('GCASH', 900); const g2 = r.data.properties.transaction
  await fetch(`http://127.0.0.1:${MOCK}/__pay/${g2.gatewayReferenceId}`, { method: 'POST' })
  const body = hook(g2.gatewayReferenceId)
  r = await req('POST', '/payments/paymongo/webhook', body, { 'Paymongo-Signature': sign(body) })
  check('correctly signed webhook accepted (200)', r.status === 200, JSON.stringify(r.data))
  check('...and the transaction flips to SUCCESS', (await mongoose.connection.collection('transactions').findOne({ referenceNumber: g2.referenceNumber })).status === 'SUCCESS')
  r = await req('POST', '/payments/paymongo/webhook', body, { 'Paymongo-Signature': sign(body, 'wrong-secret') })
  check('wrong secret rejected (400)', r.status === 400)
  r = await req('POST', '/payments/paymongo/webhook', body)
  check('missing signature rejected (400)', r.status === 400)
  const sigForOther = sign('{"other":1}')
  r = await req('POST', '/payments/paymongo/webhook', body, { 'Paymongo-Signature': sigForOther })
  check('signature for a different body rejected (tampering)', r.status === 400)
  r = await initiate('GCASH', 700); const g3 = r.data.properties.transaction   // NOT paid at the provider
  const forged = hook(g3.gatewayReferenceId)
  r = await req('POST', '/payments/paymongo/webhook', forged, { 'Paymongo-Signature': sign(forged) })
  check('validly-signed "paid" event for an UNPAID link does not mark it paid', r.status === 200 && (await mongoose.connection.collection('transactions').findOne({ referenceNumber: g3.referenceNumber })).status === 'PENDING')

  console.log('PayPal')
  r = await initiate('PAYPAL', 1200); const p1 = r.data.properties.transaction
  check('PayPal payout creates a PENDING order + approval URL', r.status === 200 && p1.provider === 'PAYPAL' && p1.status === 'PENDING' && r.data.properties.checkoutUrl?.startsWith('https://pp.test/approve/'))
  check('PayPal return_url points at OUR capture endpoint (the bug I fixed)', state.orders[p1.gatewayReferenceId].ctx.return_url === `http://localhost:${APP}/api/v1/payments/paypal/capture`, state.orders[p1.gatewayReferenceId].ctx.return_url)
  check('PayPal cancel_url points at the site cancel page', state.orders[p1.gatewayReferenceId].ctx.cancel_url === 'http://localhost:5173/admin/payouts?paypal=cancel')
  state.orders[p1.gatewayReferenceId].status = 'APPROVED'
  r = await req('GET', `/payments/paypal/capture?token=${p1.gatewayReferenceId}&PayerID=X`)
  check('capture endpoint redirects the buyer back to the success page', r.status === 302 && r.headers.get('location') === `http://localhost:5173/admin/payouts?paypal=success&ref=${p1.referenceNumber}`, r.headers.get('location'))
  check('...and the order was captured exactly once -> SUCCESS', state.orders[p1.gatewayReferenceId].captures === 1 && (await mongoose.connection.collection('transactions').findOne({ referenceNumber: p1.referenceNumber })).status === 'SUCCESS')
  await req('GET', `/payments/paypal/capture?token=${p1.gatewayReferenceId}`)
  check('replaying the capture URL does not double-capture', state.orders[p1.gatewayReferenceId].captures === 1)
  r = await req('GET', '/payments/paypal/capture?token=NOPE')
  check('unknown order token redirects to the cancel page', r.status === 302 && r.headers.get('location')?.endsWith('/admin/payouts?paypal=cancel'))
  r = await initiate('PAYPAL', 400); const p2 = r.data.properties.transaction
  state.orders[p2.gatewayReferenceId].status = 'APPROVED'
  r = await req('POST', `/payments/${p2._id}/verify`)
  check('"Check status" captures an approved PayPal order', r.data?.properties?.transaction?.status === 'SUCCESS')
  r = await req('GET', '/payments/me'); check('transactions history lists exactly the 6 payments made (GCash x3, Maya, PayPal x2)', r.data?.properties?.transactions?.length === 6, `count=${r.data?.properties?.transactions?.length}`)
} catch (e) { fail++; console.log('  FAIL  test crashed:', e) }

console.log(`\n=== Gateways (mock): ${pass} passed, ${fail} failed ===`)
app.kill(); mockSrv.close(); await mongoose.disconnect(); process.exit(fail ? 1 : 0)
