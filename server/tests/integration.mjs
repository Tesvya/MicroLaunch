// Cross-module integration tests. Boots its own server wired to MOCK email (Resend) and payment (PayMongo) providers.
// Run through: npm run test:integration
import crypto from 'crypto'
import { spawn } from 'child_process'
import express from 'express'
import mongoose from 'mongoose'

if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL || '')) { console.error('Refusing to run: DATABASE_URL is not local. Use npm run test:integration'); process.exit(1) }

const MOCK = 4030, APP = 4031, SECRET = 'whsec_integration', RUN = Date.now().toString(36)
const mails = [], links = {}
let mailDown = false, payDown = false, n = 0
const mock = express(); mock.use(express.json())
mock.post('/emails', (req, res) => { if (mailDown) return res.status(422).json({ name: 'validation_error', message: 'mail provider down', statusCode: 422 }); mails.push(req.body); res.json({ id: `m${mails.length}` }) })
mock.post('/v1/links', (req, res) => { if (payDown) return res.status(503).json({}); const id = `link_int${RUN}x${++n}`; links[id] = { status: 'unpaid', amount: req.body.data.attributes.amount }; res.json({ data: { id, attributes: { checkout_url: `https://pm.test/${id}`, status: 'unpaid' } } }) })
mock.get('/v1/links/:id', (req, res) => res.json({ data: { id: req.params.id, attributes: { status: links[req.params.id].status } } }))
const mockSrv = mock.listen(MOCK)
const app = spawn('node', ['src/server.js'], { stdio: 'ignore', env: { ...process.env, PORT: String(APP), RESEND_API_KEY: 're_test', RESEND_BASE_URL: `http://127.0.0.1:${MOCK}`, MAIL_FROM: 'Test <t@example.com>', PAYMONGO_SECRET_KEY: 'sk_test_mock', PAYMONGO_WEBHOOK_SECRET: SECRET, PAYMONGO_BASE_URL: `http://127.0.0.1:${MOCK}/v1` } })

const B = `http://localhost:${APP}/api/v1`
let pass = 0, fail = 0
const section = (t) => console.log(`\n${t}`)
const check = (id, label, ok, extra = '') => { ok ? pass++ : fail++; console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id}  ${label} ${ok ? '' : `-> ${extra}`}`) }
const client = () => {
  const c = { cookie: '' }
  c.req = async (method, path, body) => {
    const form = body instanceof FormData
    const r = await fetch(B + path, { method, headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), ...(c.cookie ? { Cookie: c.cookie } : {}) }, body: body === undefined ? undefined : form ? body : JSON.stringify(body) })
    const set = r.headers.getSetCookie?.() || []
    if (set.length) c.cookie = set.map((x) => x.split(';')[0]).join('; ')
    let data = null; try { data = await r.json() } catch { /* no body */ }
    return { status: r.status, data, p: data?.properties }
  }
  return c
}
const mailTo = (e) => mails.filter((m) => [].concat(m.to).includes(e))
const tokenFrom = (m) => m.text.match(/token=([a-f0-9]+)/)[1]
const newUser = async (label) => {
  const c = client(); c.email = `${label}${Date.now()}${Math.floor(Math.random() * 1e5)}@example.com`
  await c.req('POST', '/auth/register', { name: `${label} user`, email: c.email, password: 'Password123', confirmPassword: 'Password123' })
  await c.req('POST', '/auth/verify-email', { token: tokenFrom(mailTo(c.email)[0]) })
  await c.req('POST', '/auth/login', { email: c.email, password: 'Password123' })
  c.id = (await c.req('GET', '/auth/check-user')).p.user._id
  return c
}
const admin = client()
const mkListing = async (title, extra = {}) => (await admin.req('POST', '/side-hustles', { title, description: 'integration listing', requiredSkills: ['writing'], category: ['writing'], workMode: 'REMOTE', payType: 'FIXED', payAmountMin: 100, payAmountMax: 200, openings: 5, ...extra })).p.sideHustle
const decide = (id, applicationStatus, decisionMessage) => admin.req('PATCH', `/applications/${id}/status`, { applicationStatus, ...(decisionMessage ? { decisionMessage } : {}) })
const hired = async (c, listing) => { const a = (await c.req('POST', '/applications', { sideHustleId: listing._id })).p.application; await decide(a._id, 'APPROVED'); return a }
const doneEntry = async (c, listing, amountEarned = 500) => (await c.req('POST', '/income/entries', { title: listing.title, sideHustleId: listing._id, amountEarned, hoursSpent: 4, status: 'COMPLETED' })).p.entry
const notes = async (c) => (await c.req('GET', '/notifications')).p.notifications
const png = () => new Blob([Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)])])
const proof = () => { const f = new FormData(); f.append('files', png(), 'card.png'); return f }
const REASON = 'Please correct this and try again.'

try {
  for (let i = 0; i < 60 && !(await fetch(`${B}/health`).then((r) => r.ok, () => false)); i++) await new Promise((r) => setTimeout(r, 500))
  await mongoose.connect(process.env.DATABASE_URL)
  await admin.req('POST', '/auth/login', { email: 'admin@microlaunch.local', password: 'Admin12345!' })
  let r

  section('IT-01 Accounts <-> Email')
  {
    const c = client(); const email = `mail${Date.now()}@example.com`; const body = { name: 'Mail User', email, password: 'Password123', confirmPassword: 'Password123' }
    r = await c.req('POST', '/auth/register', body)
    check('01.1', 'registering sends one verification email; the link is never returned by the API', r.status === 201 && mailTo(email).length === 1 && !r.p.devVerificationUrl, JSON.stringify(r.data))
    await c.req('POST', '/auth/resend-verification', { email })
    check('01.2', 'resend within 60 seconds does not send another email', mailTo(email).length === 1, `sent=${mailTo(email).length}`)
    r = await c.req('POST', '/auth/verify-email', { token: tokenFrom(mailTo(email)[0]) })
    const l = await c.req('POST', '/auth/login', { email, password: 'Password123' })
    check('01.3', 'the emailed link verifies the account and login works', r.status === 200 && l.status === 200)
    mailDown = true
    const e2 = `down${Date.now()}@example.com`
    r = await client().req('POST', '/auth/register', { ...body, email: e2 })
    mailDown = false
    check('01.4', 'email outage: account is still created and reports emailSent=false', r.status === 201 && r.p.emailSent === false, JSON.stringify(r.data))
    await client().req('POST', '/auth/resend-verification', { email: e2 })
    check('01.5', 'after the outage the user can resend immediately', mailTo(e2).length === 1)
  }

  section('IT-08 Password reset <-> Email <-> Sessions')
  {
    const u = await newUser('reset'); const other = client()
    await other.req('POST', '/auth/login', { email: u.email, password: 'Password123' })
    const resetMails = () => mailTo(u.email).filter((m) => m.subject.includes('Reset your'))
    const linkOf = (m) => m.text.match(/reset-password\?token=([a-f0-9]{64})/)[1]
    r = await client().req('POST', '/auth/forgot-password', { email: 'nobody-here@example.com' })
    const unknown = r.data.message
    r = await client().req('POST', '/auth/forgot-password', { email: u.email })
    check('08.1', 'known and unknown emails get the same answer; the link is only emailed', r.status === 200 && r.data.message === unknown && resetMails().length === 1 && !JSON.stringify(r.data).includes('token'), JSON.stringify(r.data))
    await client().req('POST', '/auth/forgot-password', { email: u.email })
    check('08.2', 'asking again within 60 seconds sends no second email', resetMails().length === 1)
    const token = linkOf(resetMails()[0])
    r = await client().req('POST', '/auth/reset-password', { token, password: 'short', confirmPassword: 'short' })
    const r2 = await client().req('POST', '/auth/reset-password', { token, password: 'NewPassword456', confirmPassword: 'Different456' })
    check('08.3', 'short or mismatched passwords are refused and the link stays usable', r.status === 400 && r2.status === 400)
    const both = await Promise.all([1, 2].map(() => client().req('POST', '/auth/reset-password', { token, password: 'NewPassword456', confirmPassword: 'NewPassword456' })))
    check('08.4', 'the link resets the password exactly once', both.filter((x) => x.status === 200).length === 1 && both.filter((x) => x.status === 400).length === 1, both.map((x) => x.status).join())
    const oldLogin = await client().req('POST', '/auth/login', { email: u.email, password: 'Password123' }), newLogin = await client().req('POST', '/auth/login', { email: u.email, password: 'NewPassword456' })
    check('08.5', 'the old password stops working and the new one works', oldLogin.status === 401 && newLogin.status === 200)
    const s1 = await u.req('GET', '/auth/check-user'), s2 = await other.req('GET', '/auth/check-user')
    check('08.6', 'sessions opened before the reset are logged out', s1.status === 401 && s2.status === 401, `${s1.status},${s2.status}`)
    const fresh = client(); await fresh.req('POST', '/auth/login', { email: u.email, password: 'NewPassword456' })
    check('08.7', 'the user is notified that the password changed', (await fresh.req('GET', '/notifications')).p.notifications.some((x) => x.title === 'Password changed'))
    await mongoose.connection.collection('users').updateOne({ email: u.email }, { $set: { passwordResetSentAt: null } })
    await client().req('POST', '/auth/forgot-password', { email: u.email })
    const t2 = linkOf(resetMails().at(-1))
    await mongoose.connection.collection('users').updateOne({ email: u.email }, { $set: { passwordResetExpires: new Date(Date.now() - 1000) } })
    r = await client().req('POST', '/auth/reset-password', { token: t2, password: 'Another789xyz', confirmPassword: 'Another789xyz' })
    check('08.8', 'an expired link is refused', r.status === 400)
    const c = client(); const ue = `unverified${Date.now()}@example.com`
    await c.req('POST', '/auth/register', { name: 'Unverified', email: ue, password: 'Password123', confirmPassword: 'Password123' })
    await c.req('POST', '/auth/forgot-password', { email: ue })
    const t3 = linkOf(mailTo(ue).find((m) => m.subject.includes('Reset your')))
    await c.req('POST', '/auth/reset-password', { token: t3, password: 'Verified123', confirmPassword: 'Verified123' })
    r = await c.req('POST', '/auth/login', { email: ue, password: 'Verified123' })
    check('08.9', 'resetting through the emailed link also verifies an unverified account', r.status === 200, JSON.stringify(r.data))
    await admin.req('PATCH', `/admin/users/${fresh.id || (await fresh.req('GET', '/auth/check-user')).p.user._id}/status`, { isActive: false })
    const before = resetMails().length
    await mongoose.connection.collection('users').updateOne({ email: u.email }, { $set: { passwordResetSentAt: null } })
    r = await client().req('POST', '/auth/forgot-password', { email: u.email })
    check('08.10', 'a suspended account gets the same answer but no email', r.status === 200 && r.data.message === unknown && resetMails().length === before)
  }

  section('IT-02 Profile <-> PWD verification <-> Recommendations')
  {
    const u = await newUser('pwdrec')
    const listing = await mkListing('PWD Friendly Job', { suitableFor: ['PWD'] })
    const save = (g) => u.req('PUT', '/profile/me', { skills: ['writing'], interests: ['writing'], experienceLevel: 'BEGINNER', weeklyAvailabilityHours: 10, availableDays: ['MON'], preferredWorkMode: 'REMOTE', userGroup: g })
    const conf = async () => JSON.stringify((await u.req('GET', '/recommendations/me?limit=100')).p.recommendations.map((x) => [x.sideHustle._id, x.score, x.breakdown.mlComponent?.rfConfidence]).sort())
    await save('OTHER'); const asOther = await conf()
    const v = (await u.req('POST', '/profile/pwd-verification', proof())).p.pwdVerification
    await save('PWD'); const pending = await conf()
    check('02.1', 'pending PWD claim does not change any recommendation', pending === asOther)
    r = await admin.req('PATCH', `/profile/pwd-verification/${v._id}/decision`, { decision: 'APPROVED' })
    const approved = await conf()
    check('02.2', 'approved PWD claim reaches the matching engine', r.status === 200 && approved !== asOther && approved.includes(listing._id), 'recommendations are identical before and after approval')
    check('02.3', 'user is notified and the decision is in the activity log', (await notes(u)).some((x) => x.title === 'PWD verification approved') && (await admin.req('GET', '/activity-logs')).p.logs.some((x) => x.activity.includes('Approved PWD verification of pwdrec user')))
  }

  section('IT-03 Applications <-> Email <-> Notifications <-> Listings')
  {
    const u = await newUser('apply'); const listing = await mkListing('Decision Job')
    const a = (await u.req('POST', '/applications', { sideHustleId: listing._id, coverNote: 'first try' })).p.application
    await decide(a._id, 'REJECTED', REASON)
    const m = mailTo(u.email).find((x) => x.subject.includes('Update on your application'))
    check('03.1', 'rejection reason reaches email, notification and My Applications', !!m?.text.includes(REASON) && (await notes(u)).some((x) => x.message.includes(REASON)) && (await u.req('GET', '/applications/me')).p.applications[0].decisionMessage === REASON)
    r = await u.req('POST', '/applications', { sideHustleId: listing._id, coverNote: 'second try' })
    const row = (await admin.req('GET', '/applications/admin/all?status=PENDING')).p.applications.find((x) => x._id === a._id)
    check('03.2', 'rejected applicant re-applies and reappears in the admin queue', r.status === 201 && row?.coverNote === 'second try')
    mailDown = true; r = await decide(a._id, 'APPROVED', 'Welcome!'); mailDown = false
    check('03.3', 'email outage does not block an admin decision', r.status === 200 && (await u.req('GET', '/applications/me')).p.applications[0].applicationStatus === 'APPROVED')
    const d = await newUser('double'); const dl = await mkListing('Double Click Job')
    const both = await Promise.all([1, 2, 3].map(() => d.req('POST', '/applications', { sideHustleId: dl._id })))
    check('03.4', 'triple-clicking Apply creates one application', both.filter((x) => x.status === 201).length === 1 && (await d.req('GET', '/applications/me')).p.applications.length === 1, both.map((x) => x.status).join())
    const one = await mkListing('One Opening Race', { openings: 1 }); const x = await newUser('racea'), y = await newUser('raceb')
    const ax = (await x.req('POST', '/applications', { sideHustleId: one._id })).p.application, ay = (await y.req('POST', '/applications', { sideHustleId: one._id })).p.application
    const res = await Promise.all([decide(ax._id, 'APPROVED'), decide(ay._id, 'APPROVED')])
    check('03.5', 'two admins approving at once cannot overfill a single opening', res.filter((q) => q.status === 200).length === 1, `approvals accepted=${res.filter((q) => q.status === 200).length}`)
  }

  section('IT-04 Applications <-> Income <-> Payouts <-> Payment provider')
  {
    const u = await newUser('payout'); const listing = await mkListing('Payout Job')
    const early = await doneEntry(u, listing)
    r = await u.req('POST', '/payments/request', { incomeEntryId: early._id, method: 'GCASH' })
    check('04.1', 'no payout for a job the user was never approved for', r.status === 400)
    const a = await hired(u, listing); const e = await doneEntry(u, listing, 750)
    const t = (await u.req('POST', '/payments/request', { incomeEntryId: e._id, method: 'GCASH' })).p.transaction
    payDown = true; r = await admin.req('POST', `/payments/${t._id}/approve`, { jobConfirmed: true }); payDown = false
    const still = (await admin.req('GET', '/payments/admin/all?status=REQUESTED')).p.payouts.some((x) => x._id === t._id)
    check('04.2', 'provider outage: approval fails cleanly and the request keeps waiting', r.status === 502 && still && (await u.req('GET', '/applications/me')).p.applications[0].applicationStatus === 'APPROVED', `status=${r.status}`)
    r = await admin.req('POST', `/payments/${t._id}/approve`, { jobConfirmed: true })
    const link = r.p?.transaction?.gatewayReferenceId
    check('04.3', 'retry works; provider is asked for the exact amount', r.status === 200 && !!r.p.checkoutUrl && links[link]?.amount === 75000)
    const mine = (await u.req('GET', '/payments/me')).p.transactions.find((x) => x._id === t._id)
    check('04.4', 'user sees it approved, without the admin checkout link', mine?.status === 'PENDING' && !JSON.stringify(mine).includes('pm.test'))
    check('04.5', 'approval completes the application', (await u.req('GET', '/applications/me')).p.applications.find((x) => x._id === a._id).applicationStatus === 'COMPLETED')
    links[link].status = 'paid'
    const body = JSON.stringify({ data: { attributes: { type: 'link.payment.paid', data: { id: link } } } }); const ts = Math.floor(Date.now() / 1000)
    const hook = await fetch(`${B}/payments/paymongo/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Paymongo-Signature': `t=${ts},te=${crypto.createHmac('sha256', SECRET).update(`${ts}.${body}`).digest('hex')},li=` }, body })
    const entry = (await u.req('GET', '/income/entries')).p.entries.find((x) => x._id === e._id)
    check('04.6', 'provider webhook marks the payout and income entry as paid and notifies the user', hook.status === 200 && entry.payoutStatus === 'PAID' && (await notes(u)).some((x) => x.title === 'Payment confirmed'))
    r = await u.req('POST', '/ratings', { sideHustleId: listing._id, incomeEntryId: e._id, stars: 5, feedback: 'ok' })
    check('04.7', 'paid job can be rated and the listing average updates', r.status === 201 && (await u.req('GET', `/ratings/side-hustle/${listing._id}/summary`)).p.averageStars === 5)

    const w = await newUser('withdrawn'); const wl = await mkListing('Withdrawn Job'); const wa = await hired(w, wl); const we = await doneEntry(w, wl)
    const wt = (await w.req('POST', '/payments/request', { incomeEntryId: we._id, method: 'MOCK_GCASH' })).p.transaction
    await decide(wa._id, 'REJECTED', REASON)
    r = await admin.req('POST', `/payments/${wt._id}/approve`, { jobConfirmed: true })
    check('04.8', 'payout cannot be approved after the approval was withdrawn', r.status === 409)

    const g = await newUser('deleted'); const gl = await mkListing('Deleted Job'); await hired(g, gl); const ge = await doneEntry(g, gl)
    const gt = (await g.req('POST', '/payments/request', { incomeEntryId: ge._id, method: 'MOCK_GCASH' })).p.transaction
    await admin.req('DELETE', `/side-hustles/${gl._id}`)
    const pages = await Promise.all([g.req('GET', '/applications/me'), g.req('GET', '/income/entries'), g.req('GET', '/payments/me'), admin.req('GET', '/applications/admin/all'), admin.req('GET', '/payments/admin/all')])
    check('04.9', 'deleting a listing does not break any user or admin page', pages.every((x) => x.status === 200), pages.map((x) => x.status).join())
    r = await admin.req('POST', `/payments/${gt._id}/approve`, { jobConfirmed: true })
    check('04.10', 'work done on a since-deleted listing can still be paid', r.status === 200 && r.p.transaction.status === 'SUCCESS', JSON.stringify(r.data))
  }

  section('IT-05 Transactions <-> Dashboard <-> Reports')
  {
    const db = mongoose.connection
    const paid = (await db.collection('transactions').aggregate([{ $match: { status: 'SUCCESS' } }, { $group: { _id: null, total: { $sum: '$amount' }, n: { $sum: 1 } } }]).toArray())[0]
    const o = (await admin.req('GET', '/admin/overview')).p
    const f = (await admin.req('POST', '/reports/generate', { reportType: 'FINANCIAL', reportPeriod: 'ALL_TIME' })).p.report.summary
    check('05.1', 'overview, financial report and database agree on paid payouts', o.successfulTransactionCount === paid.n && f.successfulTransactions === paid.n && f.totalTransacted === paid.total, JSON.stringify({ o: o.successfulTransactionCount, f, paid }))
    check('05.2', 'requested and rejected payouts are not counted as paid', (await db.collection('transactions').countDocuments({ status: { $ne: 'SUCCESS' } })) > 0 && f.successfulTransactions === paid.n)
    check('05.3', 'overview waiting counts match the admin queues', o.pendingPayouts === (await admin.req('GET', '/payments/admin/all?status=REQUESTED')).p.payouts.length && o.pendingApplications === (await admin.req('GET', '/applications/admin/all?status=PENDING')).p.applications.length && o.pendingPwdVerifications === (await admin.req('GET', '/profile/pwd-verification/admin/all?status=PENDING')).p.verifications.length)
  }

  section('IT-06 Access control across modules')
  {
    const u = await newUser('access'); const X = '000000000000000000000000'
    const adminRoutes = [['GET', '/admin/overview'], ['GET', '/admin/users'], ['PATCH', `/admin/users/${X}/status`], ['GET', '/applications/admin/all'], ['PATCH', `/applications/${X}/status`], ['GET', '/payments/admin/all'], ['POST', `/payments/${X}/approve`], ['POST', `/payments/${X}/reject`], ['GET', '/profile/pwd-verification/admin/all'], ['PATCH', `/profile/pwd-verification/${X}/decision`], ['GET', '/reports'], ['POST', '/reports/generate'], ['GET', '/activity-logs'], ['POST', '/side-hustles'], ['PUT', `/side-hustles/${X}`], ['DELETE', `/side-hustles/${X}`]]
    const body = (m) => (m === 'GET' ? undefined : {})
    const asUser = await Promise.all(adminRoutes.map(([m, p]) => u.req(m, p, body(m)))), asAnon = await Promise.all(adminRoutes.map(([m, p]) => client().req(m, p, body(m))))
    check('06.1', `all ${adminRoutes.length} admin endpoints refuse a normal user (403)`, asUser.every((x) => x.status === 403), adminRoutes.filter((_, i) => asUser[i].status !== 403).join(' | '))
    check('06.2', `all ${adminRoutes.length} admin endpoints refuse anonymous visitors (401)`, asAnon.every((x) => x.status === 401), adminRoutes.filter((_, i) => asAnon[i].status !== 401).join(' | '))
    const v = await newUser('victim'); const vl = await mkListing('Victim Job'); await hired(v, vl); const ve = await doneEntry(v, vl)
    const steal = await Promise.all([u.req('PUT', `/income/entries/${ve._id}`, { amountEarned: 1 }), u.req('DELETE', `/income/entries/${ve._id}`), u.req('POST', '/payments/request', { incomeEntryId: ve._id, method: 'MOCK_GCASH' })])
    check('06.3', "a user cannot edit, delete or claim another user's income (404)", steal.every((x) => x.status === 404), steal.map((x) => x.status).join())
    r = await u.req('POST', '/ratings', { sideHustleId: vl._id, incomeEntryId: ve._id, stars: 1, feedback: 'never worked here' })
    check('06.4', 'a user cannot rate a job they never worked on', r.status >= 400, `accepted with ${r.status}`)
    const fake = (await u.req('POST', '/income/entries', { title: 'fake', sideHustleId: vl._id, amountEarned: 1, status: 'COMPLETED' })).p.entry
    r = await u.req('POST', '/ratings', { sideHustleId: vl._id, incomeEntryId: fake._id, stars: 1 })
    check('06.6', 'logging fake income for a listing does not allow rating it', r.status === 403, `status=${r.status}`)
    await admin.req('PATCH', `/admin/users/${u.id}/status`, { isActive: false })
    r = await u.req('GET', '/income/entries')
    check('06.5', 'suspending a user ends their existing session', [401, 403].includes(r.status), `still allowed with ${r.status}`)
  }

  section('IT-07 Invalid input')
  {
    const u = await newUser('input')
    r = await client().req('POST', '/auth/login', { email: { $gt: '' }, password: { $gt: '' } })
    check('07.1', 'database-operator injection at login is refused (400)', r.status === 400, `status=${r.status}`)
    const bad = [['GET', '/side-hustles/not-an-id'], ['GET', '/ratings/side-hustle/not-an-id/summary'], ['PUT', '/income/entries/not-an-id', { hoursSpent: 1 }], ['POST', '/payments/not-an-id/verify', {}], ['POST', '/payments/request', { incomeEntryId: 'x', method: 'GCASH' }], ['PATCH', '/applications/not-an-id/cancel', {}]]
    const res = await Promise.all(bad.map(([m, p, b]) => u.req(m, p, b)))
    check('07.2', 'malformed IDs give a clean 4xx, not a server error', res.every((x) => x.status < 500), bad.filter((_, i) => res[i].status >= 500).map((x) => `${x[0]} ${x[1]}`).join(' | '))
    r = await u.req('GET', '/side-hustles?search=' + encodeURIComponent('c++ (remote'))
    check('07.3', 'searching with special characters works', r.status === 200, `status=${r.status}`)
  }
} catch (e) { fail++; console.log('  FAIL  suite crashed:', e) }

console.log(`\n=== Integration: ${pass} passed, ${fail} failed ===`)
app.kill(); mockSrv.close(); await mongoose.disconnect(); process.exit(fail ? 1 : 0)
