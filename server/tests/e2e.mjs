import '../src/configs/load-env.js'
import mongoose from 'mongoose'
await mongoose.connect(process.env.DATABASE_URL)
const usersCol = mongoose.connection.collection('users')
const BASE = 'http://localhost:4000/api/v1'
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
r = await user.req('POST', '/payments/initiate', { incomeEntryId: entryId, amount: 2000, method: 'MOCK_GCASH' })
check('mock payout succeeds + saved', r.status === 201 && r.data?.properties?.transaction?.status === 'SUCCESS', JSON.stringify(r.data))
r = await user.req('POST', '/payments/initiate', { incomeEntryId: entryId, amount: 2000, method: 'GCASH' })
check('GCASH without keys falls back to mock', r.status === 201 && r.data?.properties?.transaction?.provider === 'MOCK_GATEWAY', JSON.stringify(r.data))
r = await user.req('POST', '/payments/initiate', { amount: 100, method: 'BITCOIN' })
check('invalid payment method rejected', r.status === 400)
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
r = await admin.req('POST', '/side-hustles', { title: 'E2E Listing', description: 'test listing', requiredSkills: ['testing'], category: ['qa'], workMode: 'REMOTE', payType: 'FIXED', payAmountMin: 100, payAmountMax: 200 })
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

console.log(results.join('\n'))
console.log(`\n=== ${pass} passed, ${fail} failed (${pass + fail} total) ===`)
process.exit(fail ? 1 : 0)
