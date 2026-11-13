// Local-only: boots the server in PRODUCTION mode and proves the safety guards work.
import '../src/configs/load-env.js'
import { spawn, spawnSync } from 'child_process'
import { runSmoke } from './deploy-smoke.mjs'

let pass = 0, fail = 0
const check = (l, c, x = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'PASS' : 'FAIL'}  ${l} ${c ? '' : x}`) }
const STRONG = 'k9Qv2LrT8xZpM4nB7cYwE1sHdJfU6aGo3VtXiRb5'
const run = (script, env) => spawnSync('node', [script], { env: { ...process.env, ...env }, encoding: 'utf8', timeout: 20000 })

console.log('Startup guards')
let r = run('src/server.js', { NODE_ENV: 'production', PORT: '4020', JWT_SECRET: 'short', CLIENT_PRODUCTION: 'https://x.test' })
check('refuses to start with a weak JWT_SECRET', r.status === 1 && r.stderr.includes('JWT_SECRET'))
r = run('src/server.js', { NODE_ENV: 'production', PORT: '4020', JWT_SECRET: 'replace-with-a-long-random-string-0123456789abcdef', CLIENT_PRODUCTION: 'https://x.test' })
check('refuses the placeholder secret from .env.example', r.status === 1 && r.stderr.includes('JWT_SECRET'))
r = run('src/server.js', { NODE_ENV: 'production', PORT: '4020', JWT_SECRET: STRONG, CLIENT_PRODUCTION: '', RENDER_EXTERNAL_URL: '', RAILWAY_PUBLIC_DOMAIN: '' })
check('refuses to start without the public site URL (would put localhost in emails)', r.status === 1 && r.stderr.includes('CLIENT_PRODUCTION'))
r = run('src/server.js', { NODE_ENV: 'production', PORT: '4020', JWT_SECRET: STRONG, CLIENT_PRODUCTION: 'https://x.test', DATABASE_URL: '' })
check('refuses to start without DATABASE_URL', r.status === 1 && r.stderr.includes('DATABASE_URL'))
r = run('src/migrations/seed-admin.js', { DATABASE_URL: 'mongodb://db.example.invalid:27017/prod', SEED_ADMIN_PASSWORD: '' })
check('seed REFUSES the default admin password on a remote database', r.status === 1 && r.stderr.includes('SEED ABORTED'))
r = run('src/migrations/seed-admin.js', { DATABASE_URL: 'mongodb://db.example.invalid:27017/prod', SEED_ADMIN_PASSWORD: 'Admin12345!' })
check('...even if the default is typed explicitly', r.status === 1 && r.stderr.includes('SEED ABORTED'))
r = run('src/migrations/seed-admin.js', { DATABASE_URL: 'mongodb://db.example.invalid:27017/prod', SEED_ADMIN_PASSWORD: 'short' })
check('...and short passwords are refused', r.status === 1 && r.stderr.includes('SEED ABORTED'))

const PORT = 4021, B = `http://localhost:${PORT}`, SITE = 'https://microlaunch.example.com'
const srv = spawn('node', ['src/server.js'], { env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT), JWT_SECRET: STRONG, CLIENT_PRODUCTION: SITE, SMTP_HOST: '', LOGIN_FAIL_LIMIT: '3', AUTH_RATE_LIMIT_MAX: '5' } })
await new Promise((r) => setTimeout(r, 4000))
try {
  console.log('\nDeployment smoke checks (production mode)')
  await runSmoke(B, check)

  console.log('\nProduction behaviour')
  const post = (p, b, h = {}) => fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(b) })
  let res = await post('/api/v1/auth/login', { email: 'admin@microlaunch.local', password: 'Admin12345!' }, { 'X-Forwarded-For': '9.9.9.9' })
  const cookie = (res.headers.getSetCookie?.() || []).join(' | ')
  check('login sets the session cookie', res.status === 200 && cookie.includes('accessToken='), `status=${res.status}`)
  check('cookie is HttpOnly + Secure + SameSite=Lax', /HttpOnly/i.test(cookie) && /Secure/i.test(cookie) && /SameSite=Lax/i.test(cookie), cookie)
  res = await fetch(B + '/api/v1/health', { headers: { Origin: 'https://evil.example.com' } })
  check('CORS: unknown origin gets no access headers', !res.headers.get('access-control-allow-origin'))
  res = await fetch(B + '/api/v1/health', { headers: { Origin: SITE } })
  check('CORS: the real site origin is allowed with credentials', res.headers.get('access-control-allow-origin') === SITE && res.headers.get('access-control-allow-credentials') === 'true')
  res = await post('/api/v1/auth/register', { name: 'Prod Reg', email: `prod${Date.now()}@example.com`, password: 'Password123', confirmPassword: 'Password123' }, { 'X-Forwarded-For': '8.8.8.1' })
  const rj = await res.json()
  check('registering without SMTP never exposes a dev verification link in production', res.status === 201 && !rj.properties?.devVerificationUrl && rj.properties?.emailSent === false)

  console.log('\nRate limiting (per client IP, behind a proxy)')
  const bad = (ip) => post('/api/v1/auth/login', { email: 'admin@microlaunch.local', password: 'wrong-password' }, { 'X-Forwarded-For': ip })
  const codes = []; for (let i = 0; i < 5; i++) codes.push((await bad('1.1.1.1')).status)
  check('failed logins are throttled (401,401,401, then 429)', codes.slice(0, 3).every((c) => c === 401) && codes[3] === 429 && codes[4] === 429, `codes=${codes}`)
  res = await bad('1.1.1.1'); const tj = await res.json()
  check('429 response is a friendly JSON message', tj.message?.includes('Too many attempts'))
  check('standard RateLimit headers are sent', !!(res.headers.get('ratelimit') || res.headers.get('ratelimit-policy')))
  res = await bad('2.2.2.2')
  check('a DIFFERENT client IP is not affected (trust-proxy works)', res.status === 401, `status=${res.status}`)
  res = await post('/api/v1/auth/login', { email: 'admin@microlaunch.local', password: 'Admin12345!' }, { 'X-Forwarded-For': '3.3.3.3' })
  check('successful logins are NOT counted against the limit', res.status === 200)
  const regCodes = []; for (let i = 0; i < 6; i++) regCodes.push((await post('/api/v1/auth/register', { name: 'Spam', email: `spam${Date.now()}${i}@example.com`, password: 'Password123', confirmPassword: 'Password123' }, { 'X-Forwarded-For': '7.7.7.7' })).status)
  check('registration spam is throttled (5 allowed, 6th -> 429)', regCodes.slice(0, 5).every((c) => c === 201) && regCodes[5] === 429, `codes=${regCodes}`)
} catch (e) { fail++; console.log('  FAIL  crashed:', e) }

console.log(`\n=== Production hardening: ${pass} passed, ${fail} failed ===`)
srv.kill(); process.exit(fail ? 1 : 0)
