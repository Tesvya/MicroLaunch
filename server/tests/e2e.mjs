import '../src/configs/load-env.js'
import mongoose from 'mongoose'
if (!process.env.E2E_BASE || !/127.0.0.1|localhost/.test(process.env.DATABASE_URL || '')) { console.error('Refusing to run: these tests create data. Use npm run test:integration'); process.exit(1) }
await mongoose.connect(process.env.DATABASE_URL)
const usersCol = mongoose.connection.collection('users')
const BASE = process.env.E2E_BASE
let pass = 0, fail = 0
const results = []

class Client {
  constructor(name) { this.name = name; this.cookie = '' }
  async req(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(this.cookie ? { Cookie: this.cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'manual'
    })
    const set = res.headers.getSetCookie?.() || []
    if (set.length) this.cookie = set.map((c) => c.split(';')[0]).join('; ')
    let data = null
    try { data = await res.json() } catch {}
    return { status: res.status, data }
  }
}

const check = (label, cond, extra = '') => {
  if (cond) { pass++; results.push(`  PASS  ${label}`) }
  else { fail++; results.push(`  FAIL  ${label} ${extra}`) }
}

const user = new Client('user')
const admin = new Client('admin')
const email = `tester${Date.now()}@example.com`

let r

// ---- AUTH ----
r = await user.req('POST', '/auth/register', { name: 'Test User', email, password: 'Password123', confirmPassword: 'Password123' })
check('register user', r.status === 201, JSON.stringify(r.data))
const devUrl = r.data?.properties?.devVerificationUrl
check('dev verification link returned (no SMTP configured)', !!devUrl, JSON.stringify(r.data))
const verifyToken = devUrl ? new URL(devUrl).searchParams.get('token') : ''
check('register does not log the user in', !user.cookie)
{ const doc = await usersCol.findOne({ email }); check('token stored hashed, never in plain text', doc?.emailVerificationTokenHash && doc.emailVerificationTokenHash !== verifyToken && doc.emailVerificationTokenHash.length === 64) ; check('new account starts unverified', doc?.isEmailVerified === false) }
r = await user.req('POST', '/auth/register', { name: 'Test User', email, password: 'Password123', confirmPassword: 'Password123' })
check('duplicate email rejected (409)', r.status === 409)
r = await user.req('POST', '/auth/login', { email, password: 'wrongpass' })
check('wrong password rejected (401)', r.status === 401)
r = await user.req('POST', '/auth/login', { email, password: 'Password123' })
check('login BLOCKED before verification (403 EMAIL_NOT_VERIFIED)', r.status === 403 && r.data?.code === 'EMAIL_NOT_VERIFIED', JSON.stringify(r.data))
r = await user.req('POST', '/auth/verify-email', { token: 'a'.repeat(64) })
check('wrong token rejected (400)', r.status === 400)
r = await user.req('POST', '/auth/verify-email', { token: 'x' })
check('malformed token rejected by validation (400)', r.status === 400)
r = await user.req('POST', '/auth/verify-email', { token: verifyToken })
check('verify email with valid token', r.status === 200, JSON.stringify(r.data))
r = await user.req('POST', '/auth/verify-email', { token: verifyToken })
check('token cannot be reused (400)', r.status === 400)
r = await user.req('POST', '/auth/resend-verification', { email })
check('resend for already-verified account: generic 200, no new link', r.status === 200 && !r.data?.properties?.devVerificationUrl)
r = await user.req('POST', '/auth/resend-verification', { email: 'nobody@example.com' })
check('resend for unknown email: same generic 200 (no account enumeration)', r.status === 200 && !r.data?.properties?.devVerificationUrl)

// --- second account: expiry, resend, cooldown, token invalidation ---
{
  const e2 = `expiry${Date.now()}@example.com`; const c2 = new Client('c2')
  let q = await c2.req('POST', '/auth/register', { name: 'Expiry Tester', email: e2, password: 'Password123', confirmPassword: 'Password123' })
  const t1 = new URL(q.data.properties.devVerificationUrl).searchParams.get('token')
  await usersCol.updateOne({ email: e2 }, { $set: { emailVerificationExpires: new Date(Date.now() - 1000) } })
  q = await c2.req('POST', '/auth/verify-email', { token: t1 })
  check('expired token rejected (400)', q.status === 400)
  // Only an email that was really sent starts the cooldown, and none is sent here, so simulate one
  await usersCol.updateOne({ email: e2 }, { $set: { emailVerificationSentAt: new Date() } })
  q = await c2.req('POST', '/auth/resend-verification', { email: e2 })
  check('resend inside 60s cooldown does NOT issue a new link', q.status === 200 && !q.data?.properties?.devVerificationUrl)
  await usersCol.updateOne({ email: e2 }, { $set: { emailVerificationSentAt: new Date(Date.now() - 120000) } })
  q = await c2.req('POST', '/auth/resend-verification', { email: e2 })
  const t2 = q.data?.properties?.devVerificationUrl ? new URL(q.data.properties.devVerificationUrl).searchParams.get('token') : ''
  check('resend after cooldown issues a new link', !!t2 && t2 !== t1)
  q = await c2.req('POST', '/auth/verify-email', { token: t1 })
  check('old token is invalidated by the new one (400)', q.status === 400)
  q = await c2.req('POST', '/auth/verify-email', { token: t2 })
  check('new token verifies the account', q.status === 200)
  q = await c2.req('POST', '/auth/login', { email: e2, password: 'Password123' })
  check('account logs in after verifying via resent link', q.status === 200)
  const n = await c2.req('GET', '/notifications')
  check('welcome notification created on verification', n.data?.properties?.notifications?.some((x) => x.title.includes('Welcome')))
}
r = await user.req('POST', '/auth/login', { email, password: 'Password123' })
check('user login', r.status === 200 && r.data?.properties?.user?.role === 'USER', JSON.stringify(r.data))
r = await user.req('GET', '/auth/check-user')
check('check-user returns session', r.status === 200)
r = await admin.req('POST', '/auth/login', { email: 'admin@microlaunch.local', password: 'Admin12345!' })
check('admin login', r.status === 200 && r.data?.properties?.user?.role === 'ADMIN', JSON.stringify(r.data))
r = await user.req('GET', '/admin/overview')
check('user blocked from admin route (403)', r.status === 403)
const anon = new Client('anon')
r = await anon.req('GET', '/recommendations/me')
check('anonymous blocked (401)', r.status === 401)

// ---- FORGOT PASSWORD (link delivery is covered by integration.mjs with a mock mail provider) ----
r = await anon.req('POST', '/auth/forgot-password', { email })
check('forgot password: generic 200, no link or token in the response', r.status === 200 && !JSON.stringify(r.data).includes('token'))
r = await anon.req('POST', '/auth/forgot-password', { email: 'not-an-email' }); check('forgot password: invalid email -> 400', r.status === 400)
r = await anon.req('POST', '/auth/reset-password', { token: 'a'.repeat(64), password: 'Password999', confirmPassword: 'Password999' }); check('reset with an unknown token -> 400', r.status === 400)
r = await user.req('GET', '/auth/check-user'); check('requesting a reset does not log the user out', r.status === 200)

// ---- PROFILE ----
r = await user.req('GET', '/recommendations/me')
check('recommendations without profile -> 400', r.status === 400)
r = await user.req('PUT', '/profile/me', {
  bio: 'tester', skills: ['writing', 'social media', 'content creation'], interests: ['writing', 'marketing'],
  qualifications: 'BSIT', experienceLevel: 'BEGINNER', weeklyAvailabilityHours: 12,
  availableDays: ['MON', 'WED', 'FRI'], preferredWorkMode: 'REMOTE', userGroup: 'STUDENT',
  monthlyIncomeGoal: 5000, savingsGoal: 1000, location: 'Cebu'
})
check('save profile', r.status === 200, JSON.stringify(r.data))
r = await user.req('GET', '/profile/me')
check('profile persisted (savingsGoal + qualifications)', r.data?.properties?.profile?.savingsGoal === 1000 && r.data?.properties?.profile?.qualifications === 'BSIT')

// ---- RECOMMENDATIONS ----
r = await user.req('GET', '/recommendations/me')
const recs = r.data?.properties?.recommendations || []
check('recommendations returned', r.status === 200 && recs.length > 0, JSON.stringify(r.data)?.slice(0, 200))
check('top match is the writing job', recs[0]?.sideHustle?.title?.includes('Content Writer'), recs[0]?.sideHustle?.title)
check('scores are sorted descending', recs.every((x, i) => i === 0 || recs[i - 1].score >= x.score))
check('ML component present in breakdown', recs[0]?.breakdown?.mlComponent !== undefined)
check('ML model loaded (rfConfidence is a number)', typeof recs[0]?.breakdown?.mlComponent?.rfConfidence === 'number', JSON.stringify(recs[0]?.breakdown?.mlComponent))
const rfValues = new Set(recs.map((x) => x.breakdown?.mlComponent?.rfConfidence))
check('ML confidence is a vote share 0-100 (not hardcoded 72/28)', recs.every((x)=>{const v=x.breakdown?.mlComponent?.rfConfidence;return v>=0&&v<=100}) && ![...rfValues].every((v)=>v===72||v===28), `values=${[...rfValues]}`)
check('ML confidence varies across listings (not constant)', rfValues.size > 1, `values=${[...rfValues]}`)
const target = recs[0].sideHustle
r = await user.req('POST', `/recommendations/${target._id}/respond`, { response: 'SAVED' })
check('save a recommendation', r.status === 200)

// ---- BROWSE / DETAIL ----
r = await user.req('GET', '/side-hustles')
check('browse listings', r.status === 200 && r.data.properties.sideHustles.length >= 6)
r = await user.req('GET', `/side-hustles/${target._id}`)
check('listing detail', r.status === 200)
r = await user.req('GET', `/ratings/side-hustle/${target._id}/summary`)
check('ratings summary endpoint', r.status === 200)

// ---- APPLICATIONS ----
r = await user.req('POST', '/applications', { sideHustleId: target._id, coverNote: 'I am a good fit' })
check('apply to listing', r.status === 201, JSON.stringify(r.data))
const appId = r.data?.properties?.application?._id
r = await user.req('POST', '/applications', { sideHustleId: target._id })
check('duplicate application rejected (409)', r.status === 409)
r = await user.req('GET', '/applications/me')
check('my applications lists it (populated)', r.data?.properties?.applications?.[0]?.sideHustleId?.title === target.title)
r = await admin.req('GET', '/applications/admin/all?status=PENDING')
check('admin sees pending application', r.data?.properties?.applications?.some((a) => a._id === appId))
r = await user.req('PATCH', `/applications/${appId}/status`, { applicationStatus: 'APPROVED' })
check('user cannot approve own application (403)', r.status === 403)
r = await admin.req('PATCH', `/applications/${appId}/status`, { applicationStatus: 'APPROVED' })
check('admin approves application', r.status === 200, JSON.stringify(r.data))
r = await user.req('PATCH', `/applications/${appId}/cancel`)
check('cannot cancel an approved application (400)', r.status === 400)

// ---- NOTIFICATIONS ----
r = await user.req('GET', '/notifications/unread-count')
check('unread notifications exist (submitted + approved)', r.data?.properties?.count >= 2, JSON.stringify(r.data))
r = await user.req('GET', '/notifications')
const notifs = r.data?.properties?.notifications || []
check('approval notification delivered', notifs.some((n) => n.title.toLowerCase().includes('approved')))
r = await user.req('PATCH', `/notifications/${notifs[0]._id}/read`)
check('mark one notification read', r.status === 200)
r = await user.req('PATCH', '/notifications/read-all')
r = await user.req('GET', '/notifications/unread-count')
check('mark all read -> count 0', r.data?.properties?.count === 0)

// ---- INCOME ----
r = await user.req('POST', '/income/entries', { title: target.title, sideHustleId: target._id, amountEarned: 1500, hoursSpent: 6, status: 'IN_PROGRESS' })
check('log income from approved listing', r.status === 201, JSON.stringify(r.data))
const entryId = r.data?.properties?.entry?._id
r = await user.req('PUT', `/income/entries/${entryId}`, { hoursSpent: 9, amountEarned: 2000 })
check('edit hours/amount on entry', r.status === 200 && r.data.properties.entry.hoursSpent === 9)
r = await user.req('PUT', `/income/entries/${entryId}`, { status: 'COMPLETED' })
check('mark entry completed', r.status === 200 && r.data.properties.entry.status === 'COMPLETED')
r = await user.req('POST', '/income/entries', { title: 'Manual gig', amountEarned: 500, hoursSpent: 2, status: 'COMPLETED' })
check('log manual income entry', r.status === 201)
const manualId = r.data?.properties?.entry?._id
r = await user.req('GET', '/income/summary')
const s = r.data?.properties
check('summary totals correct (2500 earned)', s?.totalEarned === 2500, JSON.stringify(s))
check('summary hours correct (11)', s?.totalHours === 11)
check('goal progress computed (50%)', s?.goalProgressPercent === 50, String(s?.goalProgressPercent))
check('6 month trend returned', s?.monthlyTrend?.length === 6)

// ---- PAYMENT (mock) ----
r = await user.req('POST', '/payments/request', { incomeEntryId: entryId, method: 'BITCOIN' })
check('invalid payment method rejected', r.status === 400)
r = await user.req('POST', '/payments/request', { incomeEntryId: manualId, method: 'MOCK_GCASH' })
check('manual entry cannot request a payout (400)', r.status === 400 && /manual/i.test(r.data?.message || ''), JSON.stringify(r.data))
{
  const both = await Promise.all([1, 2, 3].map(() => user.req('POST', '/payments/request', { incomeEntryId: entryId, method: 'GCASH', amount: 999999 })))
  check('simultaneous requests create exactly one payout', both.filter((x) => x.status === 201).length === 1 && both.filter((x) => x.status === 409).length === 2, both.map((x) => x.status).join())
  r = both.find((x) => x.status === 201)
}
const payout1 = r?.data?.properties?.transaction
check('request waits for approval; amount comes from the entry, not the client', payout1?.status === 'REQUESTED' && payout1?.amount === 2000, JSON.stringify(r?.data))
r = await user.req('PUT', `/income/entries/${entryId}`, { amountEarned: 50000 }); check('entry is locked while under review (409)', r.status === 409)
r = await user.req('DELETE', `/income/entries/${entryId}`); check('locked entry cannot be deleted (409)', r.status === 409)
r = await user.req('POST', `/payments/${payout1._id}/approve`, { jobConfirmed: true }); check('user cannot approve their own payout (403)', r.status === 403)
r = await user.req('GET', '/payments/admin/all'); check('user cannot list all payouts (403)', r.status === 403)
r = await admin.req('GET', '/payments/admin/all?status=REQUESTED')
{ const row = r.data?.properties?.payouts?.find((x) => x._id === payout1._id); check('admin sees the request with job details', row?.applicationStatus === 'APPROVED' && row?.incomeEntryId?.sideHustleId?.title === target.title && row?.paidForSameJob === 0, JSON.stringify(row)) }
r = await admin.req('GET', '/admin/overview'); check('overview counts pending payouts', r.data?.properties?.pendingPayouts >= 1)
r = await admin.req('POST', `/payments/${payout1._id}/reject`, { reason: 'short' }); check('payout rejection needs a reason (400)', r.status === 400)
r = await admin.req('POST', `/payments/${payout1._id}/reject`, { reason: 'Please log the correct number of hours.' }); check('admin rejects payout', r.status === 200, JSON.stringify(r.data))
r = await user.req('GET', '/income/entries')
{ const e = r.data?.properties?.entries?.find((x) => x._id === entryId); check('user sees rejection and reason', e?.payoutStatus === 'REJECTED' && /hours/.test(e?.payoutRejectionReason), JSON.stringify(e)) }
r = await user.req('PUT', `/income/entries/${entryId}`, { hoursSpent: 9 }); check('entry unlocked after rejection', r.status === 200)
r = await user.req('POST', '/payments/request', { incomeEntryId: entryId, method: 'GCASH' }); check('can request again after rejection', r.status === 201, JSON.stringify(r.data))
const payout2 = r.data?.properties?.transaction
r = await admin.req('POST', `/payments/${payout2._id}/approve`, {}); check('approval requires confirming the job (400)', r.status === 400)
{
  const both = await Promise.all([1, 2].map(() => admin.req('POST', `/payments/${payout2._id}/approve`, { jobConfirmed: true })))
  check('double approval pays exactly once (GCASH without keys is simulated)', both.filter((x) => x.status === 200).length === 1 && both.filter((x) => x.status === 409).length === 1, both.map((x) => x.status).join())
  check('approved payout is paid', both.find((x) => x.status === 200)?.data?.properties?.transaction?.status === 'SUCCESS')
}
r = await admin.req('POST', `/payments/${payout2._id}/reject`, { reason: 'Too late to reject this now.' }); check('paid payout cannot be rejected (409)', r.status === 409)
r = await user.req('POST', '/payments/request', { incomeEntryId: entryId, method: 'GCASH' }); check('paid entry cannot be paid twice (409)', r.status === 409)
r = await user.req('GET', '/income/entries'); check('entry shows PAID', r.data?.properties?.entries?.find((x) => x._id === entryId)?.payoutStatus === 'PAID')
r = await user.req('GET', '/applications/me'); check('approving the payout completes the application', r.data?.properties?.applications?.find((x) => x._id === appId)?.applicationStatus === 'COMPLETED')
r = await user.req('GET', '/payments/me')
check('transactions list', r.data?.properties?.transactions?.length >= 2)
const txId = r.data.properties.transactions[0]._id
r = await user.req('POST', `/payments/${txId}/verify`)
check('verify endpoint returns transaction', r.status === 200 && r.data?.properties?.transaction?._id === txId, JSON.stringify(r.data)?.slice(0,150))
r = await user.req('POST', '/payments/000000000000000000000000/verify')
check('verify unknown transaction -> 404', r.status === 404)

// ---- RATINGS ----
r = await user.req('POST', '/ratings', { sideHustleId: target._id, incomeEntryId: entryId, stars: 5, feedback: 'Great', wasAccurateMatch: true })
check('rate completed listing-linked entry', r.status === 201, JSON.stringify(r.data))
r = await user.req('POST', '/ratings', { incomeEntryId: manualId, stars: 4, feedback: 'ok' })
check('rate a MANUAL entry (no listing)', r.status === 201, `status=${r.status} ${JSON.stringify(r.data)}`)
r = await user.req('GET', '/ratings/me')
check('my ratings listed', r.data?.properties?.ratings?.length >= 1)

// ---- ADMIN ----
r = await admin.req('GET', '/admin/overview')
const o = r.data?.properties
check('admin overview stats', r.status === 200 && o?.userCount >= 2 && o?.totalApplications >= 1, JSON.stringify(o))
r = await admin.req('GET', '/admin/users')
const users = r.data?.properties?.users || []
const tUser = users.find((u) => u.email === email)
check('admin lists users', !!tUser)
{
  const e3 = `manual${Date.now()}@example.com`; const c3 = new Client('c3')
  await c3.req('POST', '/auth/register', { name: 'Manual Verify', email: e3, password: 'Password123', confirmPassword: 'Password123' })
  let q = await c3.req('POST', '/auth/login', { email: e3, password: 'Password123' })
  check('unverified account cannot log in', q.status === 403)
  const list = (await admin.req('GET', '/admin/users')).data.properties.users
  const mu = list.find((u) => u.email === e3)
  check('admin list shows isEmailVerified=false', mu?.isEmailVerified === false)
  q = await user.req('PATCH', `/admin/users/${mu._id}/verify-email`)
  check('regular user cannot manually verify accounts (403)', q.status === 403)
  q = await admin.req('PATCH', `/admin/users/${mu._id}/verify-email`)
  check('admin manually verifies an account', q.status === 200 && q.data?.properties?.user?.isEmailVerified === true, JSON.stringify(q.data))
  q = await admin.req('PATCH', `/admin/users/${mu._id}/verify-email`)
  check('verifying twice -> 409', q.status === 409)
  q = await admin.req('PATCH', '/admin/users/000000000000000000000000/verify-email')
  check('verifying unknown user -> 404', q.status === 404)
  q = await c3.req('POST', '/auth/login', { email: e3, password: 'Password123' })
  check('manually verified account can now log in', q.status === 200)
  const lg = (await admin.req('GET', '/activity-logs')).data.properties.logs
  check('manual verification recorded in the activity log', lg.some((l) => l.activity.includes('Manually verified email')))
}
check('admin user list does not leak verification token hash', !JSON.stringify(users).includes('emailVerificationTokenHash'))
r = await admin.req('POST', '/side-hustles', { title: 'E2E Listing', description: 'test listing', requiredSkills: ['testing'], category: ['qa'], workMode: 'REMOTE', payType: 'FIXED', payAmountMin: 100, payAmountMax: 200, openings: 3 })
check('admin creates listing', r.status === 201, JSON.stringify(r.data))
const newId = r.data?.properties?.sideHustle?._id
r = await admin.req('PUT', `/side-hustles/${newId}`, { title: 'E2E Listing Edited' })
check('admin edits listing', r.status === 200 && r.data.properties.sideHustle.title === 'E2E Listing Edited')
r = await admin.req('DELETE', `/side-hustles/${newId}`)
check('admin deletes listing', r.status === 200)
for (const type of ['USERS', 'APPLICATIONS', 'RECOMMENDATIONS', 'FINANCIAL', 'FEEDBACK', 'TRANSACTIONS']) {
  r = await admin.req('POST', '/reports/generate', { reportType: type, reportPeriod: 'ALL_TIME' })
  check(`generate ${type} report`, r.status === 201, JSON.stringify(r.data)?.slice(0, 150))
}
r = await admin.req('GET', '/reports')
check('list reports', r.data?.properties?.reports?.length >= 6)
r = await admin.req('GET', '/activity-logs')
const logs = r.data?.properties?.logs || []
check('activity logs recorded admin actions', logs.length >= 4, `count=${logs.length}`)
check('log covers listing + application + report', ['LISTINGS', 'APPLICATIONS', 'REPORTS'].every((m) => logs.some((l) => l.module === m)))
r = await admin.req('PATCH', `/admin/users/${tUser._id}/status`, { isActive: false })
check('admin suspends user', r.status === 200)
const u2 = new Client('u2')
r = await u2.req('POST', '/auth/login', { email, password: 'Password123' })
check('suspended user cannot log in (403)', r.status === 403)
r = await admin.req('PATCH', `/admin/users/${tUser._id}/status`, { isActive: true })
r = await u2.req('POST', '/auth/login', { email, password: 'Password123' })
check('reactivated user can log in', r.status === 200)
r = await user.req('POST', '/auth/logout')
check('logout', r.status === 200)


// ===================== NEW: files, decisions, openings, favorites =====================
console.log('') // (section marker in raw output)
const bytesPdf = (n = 200) => Buffer.concat([Buffer.from('%PDF-1.4\n% test resume\n'), Buffer.alloc(n, 0x20)])
const bytesPng = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 0)])
const formWith = (fields, files = []) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.append(k, v); for (const x of files) f.append('files', new Blob([x.bytes], { type: x.type || 'application/octet-stream' }), x.name); return f }
const send = async (c, method, path, body) => { const res = await fetch(BASE + path, { method, headers: c.cookie ? { Cookie: c.cookie } : {}, body }); let data = null; try { data = await res.json() } catch {} return { status: res.status, data } }
const fetchFile = async (c, id) => { const res = await fetch(BASE + `/applications/files/${id}`, { headers: c.cookie ? { Cookie: c.cookie } : {} }); return { status: res.status, headers: res.headers, bytes: Buffer.from(await res.arrayBuffer()) } }
const newUser = async (label) => {
  const c = new Client(label); const em = `${label}${Date.now()}${Math.floor(Math.random() * 1e5)}@example.com`
  const q = await c.req('POST', '/auth/register', { name: `${label} user`, email: em, password: 'Password123', confirmPassword: 'Password123' })
  await c.req('POST', '/auth/verify-email', { token: new URL(q.data.properties.devVerificationUrl).searchParams.get('token') })
  await c.req('POST', '/auth/login', { email: em, password: 'Password123' }); c.email = em; return c
}
const mkListing = async (title, openings) => (await admin.req('POST', '/side-hustles', { title, description: 'listing created by the automated tests', requiredSkills: ['testing'], category: ['qa'], workMode: 'REMOTE', payType: 'FIXED', payAmountMin: 100, payAmountMax: 200, openings })).data?.properties?.sideHustle
const status = (id, applicationStatus, decisionMessage) => admin.req('PATCH', `/applications/${id}/status`, { applicationStatus, ...(decisionMessage !== undefined ? { decisionMessage } : {}) })

// --- openings field on listings ---
r = await admin.req('POST', '/side-hustles', { title: 'No openings', description: 'x', requiredSkills: [], category: [] })
check('listing without "applicants needed" is rejected (400)', r.status === 400 && /applicants/i.test(r.data?.message || ''), JSON.stringify(r.data))
r = await admin.req('POST', '/side-hustles', { title: 'Zero', description: 'x', requiredSkills: [], category: [], openings: 0 })
check('openings = 0 rejected (400)', r.status === 400)
r = await admin.req('POST', '/side-hustles', { title: 'Fraction', description: 'x', requiredSkills: [], category: [], openings: 2.5 })
check('openings = 2.5 rejected (400)', r.status === 400)
const L1 = await mkListing('Upload Test Listing', 3)
check('listing stores openings', L1?.openings === 3)

// --- applying with files ---
const U1 = await newUser('applicant')
await U1.req('PUT', '/profile/me', { skills: ['writing', 'excel'], interests: ['writing'], qualifications: 'BSIT', experienceLevel: 'BEGINNER', weeklyAvailabilityHours: 10, availableDays: ['MON'], preferredWorkMode: 'REMOTE', userGroup: 'STUDENT', monthlyIncomeGoal: 1000, savingsGoal: 0, location: 'Cebu' })
const resume = { name: 'Résumé Juan Peña.pdf', bytes: bytesPdf(), type: 'application/pdf' }
const cert = { name: 'TESDA-certificate.png', bytes: bytesPng(), type: 'image/png' }
r = await send(U1, 'POST', '/applications', formWith({ sideHustleId: L1._id, coverNote: 'I have 3 years experience; resume attached.' }, [resume, cert]))
check('apply with 2 files (multipart)', r.status === 201, JSON.stringify(r.data))
const app1 = r.data?.properties?.application
check('both attachments recorded', app1?.attachments?.length === 2)
check('response carries file metadata only, never the file bytes', !JSON.stringify(app1).includes('"data"'))
check('UTF-8 file name survives the upload', app1?.attachments?.[0]?.originalName === 'Résumé Juan Peña.pdf', app1?.attachments?.[0]?.originalName)
check('stored types come from the file contents (pdf + png)', app1?.attachments?.[0]?.mimeType === 'application/pdf' && app1?.attachments?.[1]?.mimeType === 'image/png')

// --- unsafe / invalid uploads ---
const U2 = await newUser('badfiles'); const L2 = await mkListing('Bad Files Listing', 5)
const tryUpload = (files) => send(U2, 'POST', '/applications', formWith({ sideHustleId: L2._id }, files))
r = await tryUpload([{ name: 'resume.pdf', bytes: Buffer.concat([Buffer.from('MZ'), Buffer.alloc(300, 1)]), type: 'application/pdf' }])
check('Windows executable renamed .pdf is rejected (400)', r.status === 400 && r.data.message.includes('not a supported file'), JSON.stringify(r.data))
r = await tryUpload([{ name: 'resume.pdf', bytes: Buffer.from('<html><script>alert(document.cookie)</script></html>'), type: 'application/pdf' }])
check('HTML/script file disguised as .pdf is rejected (400)', r.status === 400)
r = await tryUpload([{ name: 'photo.png', bytes: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'), type: 'image/png' }])
check('SVG disguised as .png is rejected (400)', r.status === 400)
r = await tryUpload([{ name: 'a.pdf', bytes: bytesPdf(), type: 'application/pdf' }, { name: 'b.pdf', bytes: bytesPdf(), type: 'application/pdf' }, { name: 'c.pdf', bytes: bytesPdf(), type: 'application/pdf' }, { name: 'd.pdf', bytes: bytesPdf(), type: 'application/pdf' }])
check('4 files rejected: the limit is 3 (400)', r.status === 400 && /up to 3/.test(r.data?.message || ''), JSON.stringify(r.data))
r = await tryUpload([{ name: 'huge.pdf', bytes: Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(3 * 1024 * 1024)]), type: 'application/pdf' }])
check('file over 3 MB rejected (413)', r.status === 413, `status=${r.status}`)
r = await U2.req('GET', '/applications/me')
check('none of the failed uploads created an application', r.data?.properties?.applications?.length === 0)
r = await send(new Client('anon'), 'POST', '/applications', formWith({ sideHustleId: L2._id }, [resume]))
check('anonymous upload refused before the files are read (401)', r.status === 401)
r = await U2.req('POST', '/applications', { sideHustleId: L2._id, coverNote: 'plain JSON still works' })
check('plain JSON application (no files) still works', r.status === 201)

// --- PWD verification ---
{
  const P = await newUser('pwd'), X = await newUser('other')
  const prof = (g) => P.req('PUT', '/profile/me', { skills: ['writing'], interests: ['writing'], userGroup: g })
  const proof = (files) => send(P, 'POST', '/profile/pwd-verification', formWith({}, files))
  const card = { name: 'pwd-card.png', bytes: bytesPng(), type: 'image/png' }
  let q = await prof('PWD'); check('PWD without proof is refused (400)', q.status === 400)
  q = await proof([]); check('empty proof refused (400)', q.status === 400)
  q = await proof([{ name: 'card.png', bytes: Buffer.from('<html>not an image</html>') }]); check('fake image refused (400)', q.status === 400)
  q = await proof([card]); check('proof submitted -> PENDING', q.status === 201 && q.data.properties.pwdVerification.status === 'PENDING', JSON.stringify(q.data))
  const v = q.data.properties.pwdVerification
  q = await proof([card]); check('second submission while pending -> 409', q.status === 409)
  q = await prof('PWD'); check('PWD can be saved once proof is submitted', q.status === 200)
  const get = async (c, id) => (await fetch(BASE + '/profile/pwd-verification/files/' + id, { headers: { Cookie: c.cookie } })).status
  check('owner and admin can open the proof, others cannot', await get(P, v.files[0].fileId) === 200 && await get(admin, v.files[0].fileId) === 200 && await get(X, v.files[0].fileId) === 404)
  q = await P.req('PATCH', `/profile/pwd-verification/${v._id}/decision`, { decision: 'APPROVED' }); check('user cannot approve own proof (403)', q.status === 403)
  q = await admin.req('GET', '/profile/pwd-verification/admin/all?status=PENDING'); check('admin sees it pending', q.data?.properties?.verifications?.some((x) => x._id === v._id))
  q = await admin.req('PATCH', `/profile/pwd-verification/${v._id}/decision`, { decision: 'REJECTED', reason: 'no' }); check('PWD rejection needs a reason (400)', q.status === 400)
  q = await admin.req('PATCH', `/profile/pwd-verification/${v._id}/decision`, { decision: 'REJECTED', reason: 'The photo is too blurry to read.' }); check('admin rejects proof', q.status === 200)
  q = await P.req('GET', '/profile/me'); check('rejection resets the group and shows the reason', q.data.properties.profile.userGroup === 'OTHER' && /blurry/.test(q.data.properties.pwdVerification.rejectionReason))
  q = await prof('PWD'); check('rejected user cannot pick PWD without new proof (400)', q.status === 400)
  q = await proof([card]); check('rejected user can resubmit', q.status === 201, JSON.stringify(q.data))
  check('old rejected file is removed', await get(admin, v.files[0].fileId) === 404)
  const both = await Promise.all([1, 2].map(() => admin.req('PATCH', `/profile/pwd-verification/${v._id}/decision`, { decision: 'APPROVED' })))
  check('approval is decided exactly once', both.filter((x) => x.status === 200).length === 1 && both.filter((x) => x.status === 409).length === 1)
  q = await prof('PWD'); check('approved user keeps PWD', q.status === 200 && q.data.properties.profile.userGroup === 'PWD')
}

// --- downloads + access control ---
const f0 = app1.attachments[0]
let d = await fetchFile(U1, f0.fileId)
check('applicant downloads their own file, bytes identical', d.status === 200 && d.bytes.equals(resume.bytes))
check('served as attachment, verified type, nosniff, no-store', /attachment/.test(d.headers.get('content-disposition')) && d.headers.get('content-type').startsWith('application/pdf') && d.headers.get('x-content-type-options') === 'nosniff' && /no-store/.test(d.headers.get('cache-control')))
check('download keeps the unicode file name', decodeURIComponent(d.headers.get('content-disposition')).includes('Résumé Juan Peña.pdf'))
d = await fetchFile(admin, f0.fileId); check('admin can download it', d.status === 200 && d.bytes.equals(resume.bytes))
d = await fetchFile(U2, f0.fileId); check("another user cannot download someone else's file (404)", d.status === 404)
d = await fetchFile(new Client('anon'), f0.fileId); check('anonymous cannot download (401)', d.status === 401)
d = await fetchFile(admin, 'not-an-id'); check('bad file id -> 404, not a crash', d.status === 404)

// --- what the admin sees ---
r = await admin.req('GET', '/applications/admin/all')
const row = r.data?.properties?.applications?.find((a) => a._id === app1._id)
check('admin sees the applicant message', row?.coverNote?.includes('3 years experience'))
check('admin sees the attached files', row?.attachments?.length === 2 && row.attachments[1].originalName === 'TESDA-certificate.png')
check("admin sees the applicant's profile (skills, qualifications)", row?.applicantProfile?.skills?.includes('writing') && row.applicantProfile.qualifications === 'BSIT')
check('admin sees the listing openings and how many are filled', row?.sideHustleId?.openings === 3 && row.approvedCount === 0)

// --- rejection needs a reason, and the applicant receives it ---
r = await status(app1._id, 'REJECTED')
check('rejecting with no reason is refused (400)', r.status === 400 && /reason/i.test(r.data?.message || ''), JSON.stringify(r.data))
r = await status(app1._id, 'REJECTED', 'too short')
check('a one-word reason is refused (400)', r.status === 400)
const reason = 'Your TESDA certificate has expired. Please renew it and apply again.'
r = await status(app1._id, 'REJECTED', reason)
check('admin rejects with a reason', r.status === 200, JSON.stringify(r.data))
r = await U1.req('GET', '/applications/me'); const mine = r.data?.properties?.applications?.find((a) => a._id === app1._id)
check('applicant sees status REJECTED and the exact reason', mine?.applicationStatus === 'REJECTED' && mine?.decisionMessage === reason)
r = await U1.req('GET', '/notifications'); const nt = r.data?.properties?.notifications || []
check('applicant is notified, reason included', nt.some((n) => n.title === 'Application not approved' && n.message.includes(`Reason: ${reason}`)))
r = await status(app1._id, 'REJECTED', 'Rejecting this a second time for no reason')
check('a rejection is final: rejecting again -> 409', r.status === 409)
r = await status(app1._id, 'APPROVED')
check('a rejected application cannot be approved afterwards -> 409', r.status === 409)
r = await U1.req('POST', '/applications', { sideHustleId: L1._id })
check('a rejected applicant can re-apply: same record, back to PENDING, old reason cleared', r.status === 201 && r.data.properties.application._id === app1._id && r.data.properties.application.applicationStatus === 'PENDING' && r.data.properties.application.decisionMessage === '', JSON.stringify(r.data))
r = await U1.req('POST', '/applications', { sideHustleId: L1._id })
check('a pending re-application cannot be duplicated -> 409', r.status === 409)
r = await admin.req('GET', '/activity-logs'); check('rejection is in the activity log', r.data?.properties?.logs?.some((l) => l.activity.startsWith('Rejected application')))

// --- openings: cap, auto-close, reopen ---
const L3 = await mkListing('Single Opening Listing', 1)
const A3 = await newUser('openA'), B3 = await newUser('openB'), C3 = await newUser('openC')
const appA = (await A3.req('POST', '/applications', { sideHustleId: L3._id, coverNote: 'pick me' })).data.properties.application
const appB = (await B3.req('POST', '/applications', { sideHustleId: L3._id, coverNote: 'or me' })).data.properties.application
r = await status(appA._id, 'APPROVED', 'Please message us on Viber at 0917-000-0000 to start.')
check('approve with an optional message', r.status === 200)
r = await A3.req('GET', '/notifications')
check('approval message reaches the applicant', r.data?.properties?.notifications?.some((n) => n.title === 'Application approved' && n.message.includes('Viber')))
let list = (await admin.req('GET', '/side-hustles/admin/all')).data.properties.sideHustles; let l3 = list.find((x) => x._id === L3._id)
check('listing closes automatically when its last opening is filled', l3?.status === 'CLOSED' && l3?.approvedCount === 1, JSON.stringify({ s: l3?.status, c: l3?.approvedCount }))
r = await status(appB._id, 'APPROVED')
check('approving beyond the openings is blocked (409)', r.status === 409 && /opening/i.test(r.data?.message || ''), JSON.stringify(r.data))
r = await status(appB._id, 'REJECTED', 'The single opening was filled by another applicant.')
check('the other applicant can still be rejected with a reason', r.status === 200)
r = await C3.req('POST', '/applications', { sideHustleId: L3._id })
check('nobody can apply to a closed listing (404)', r.status === 404)
r = await A3.req('GET', '/side-hustles'); check('closed listing disappears from Browse', !r.data.properties.sideHustles.some((x) => x._id === L3._id))
r = await admin.req('PUT', `/side-hustles/${L3._id}`, { openings: 2, status: 'ACTIVE' })
check('admin raises openings and reopens the listing', r.status === 200)
r = await A3.req('GET', '/side-hustles'); const shown = r.data.properties.sideHustles.find((x) => x._id === L3._id)
check('Browse shows openings and how many are taken', shown?.openings === 2 && shown?.approvedCount === 1, JSON.stringify(shown && { o: shown.openings, c: shown.approvedCount }))
r = await C3.req('POST', '/applications', { sideHustleId: L3._id, coverNote: 'now there is room' }); const appC = r.data?.properties?.application
check('applying works again after reopening', r.status === 201)
r = await status(appC._id, 'APPROVED'); check('second approval fits the raised cap', r.status === 200)
r = await status(appA._id, 'COMPLETED'); check('approved -> completed', r.status === 200)
r = await status(appA._id, 'REJECTED', 'Trying to reject a completed application.')
check('a completed application is final (409)', r.status === 409)

// --- cancel and re-apply (e.g. forgot to attach the resume) ---
const R = await newUser('reapply'); const L4 = await mkListing('Reapply Listing', 5)
r = await send(R, 'POST', '/applications', formWith({ sideHustleId: L4._id, coverNote: 'v1' }, []))
check('apply with no files via the form works', r.status === 201 && r.data.properties.application.attachments.length === 0)
const a4 = r.data.properties.application
await R.req('PATCH', `/applications/${a4._id}/cancel`)
r = await send(R, 'POST', '/applications', formWith({ sideHustleId: L4._id, coverNote: 'v2 with resume' }, [resume]))
const a4b = r.data?.properties?.application
check('can re-apply after cancelling, now with a file', r.status === 201 && a4b?._id === a4._id && a4b.applicationStatus === 'PENDING' && a4b.attachments.length === 1 && a4b.coverNote === 'v2 with resume', JSON.stringify(r.data))
r = await R.req('GET', '/applications/me'); check('still exactly one application record', r.data.properties.applications.length === 1)
r = await R.req('POST', '/applications', { sideHustleId: L4._id }); check('cannot apply twice while one is active (409)', r.status === 409)
await R.req('PATCH', `/applications/${a4._id}/cancel`)
r = await send(R, 'POST', '/applications', formWith({ sideHustleId: L4._id, coverNote: 'v3' }, [cert]))
d = await fetchFile(R, a4b.attachments[0].fileId)
check('files from the cancelled attempt are deleted on re-apply (404)', r.status === 201 && d.status === 404)

// --- favorites (replaces the dead-end "save") ---
const F = await newUser('fav')
await F.req('PUT', '/profile/me', { skills: ['writing', 'social media'], interests: ['writing', 'marketing'], qualifications: 'x', experienceLevel: 'BEGINNER', weeklyAvailabilityHours: 12, availableDays: ['MON', 'WED'], preferredWorkMode: 'REMOTE', userGroup: 'STUDENT', monthlyIncomeGoal: 1000, savingsGoal: 0, location: 'Cebu' })
r = await F.req('GET', '/favorites'); check('favorites start empty', r.status === 200 && r.data.properties.favorites.length === 0)
r = await F.req('POST', `/favorites/${L1._id}`); check('add a favorite', r.status === 201)
r = await F.req('POST', `/favorites/${L1._id}`); check('adding twice is harmless (idempotent)', r.status === 201)
r = await F.req('GET', '/favorites'); const fv = r.data?.properties?.favorites
check('favorites list shows it once, with listing details and openings', fv?.length === 1 && fv[0].sideHustle.title === 'Upload Test Listing' && fv[0].sideHustle.openings === 3 && typeof fv[0].sideHustle.approvedCount === 'number')
r = await F.req('POST', '/favorites/not-an-id'); check('invalid id -> 400', r.status === 400)
r = await F.req('POST', '/favorites/000000000000000000000000'); check('unknown listing -> 404', r.status === 404)
r = await F.req('POST', `/favorites/${L2._id}`); check('can favorite another active listing', r.status === 201)
r = await new Client('anon').req('GET', '/favorites'); check('favorites need a login (401)', r.status === 401)
r = await admin.req('GET', '/favorites'); check('favorites are a user feature (admin 403)', r.status === 403)
r = await F.req('DELETE', `/favorites/${L1._id}`); check('remove a favorite', r.status === 200)
r = await F.req('DELETE', `/favorites/${L1._id}`); check('removing twice is harmless', r.status === 200)
r = await F.req('GET', '/favorites'); check('only the other favorite remains', r.data.properties.favorites.length === 1 && r.data.properties.favorites[0].sideHustle._id === L2._id)
r = await F.req('GET', '/recommendations/me'); const frecs = r.data?.properties?.recommendations || []
check('recommendations carry openings info too', typeof frecs[0]?.sideHustle?.approvedCount === 'number')
await new Promise((x) => setTimeout(x, 400))
const fid = (await F.req('GET', '/auth/check-user')).data.properties.user._id
await F.req('POST', `/favorites/${frecs[0].sideHustle._id}`); await new Promise((x) => setTimeout(x, 400))
const logRow = await mongoose.connection.collection('recommendationlogs').findOne({ userId: new mongoose.Types.ObjectId(fid), sideHustleId: new mongoose.Types.ObjectId(frecs[0].sideHustle._id), userResponse: 'SAVED' })
check('favoriting still feeds the recommendation feedback loop', !!logRow)

console.log(results.join('\n'))
console.log(`\n=== ${pass} passed, ${fail} failed (${pass + fail} total) ===`)
process.exit(fail ? 1 : 0)
