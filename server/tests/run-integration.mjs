// Runs every suite against a throwaway in-memory MongoDB. Nothing here can reach the real database, email or payment accounts:
// every credential is overridden below, and dotenv never overrides variables that are already set.
import net from 'net'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn, spawnSync } from 'child_process'
import { MongoMemoryServer } from 'mongodb-memory-server-core'

const cwd = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// Never talk to a server we did not start: a running "npm run dev" uses the real database.
const PORT = 4055
for (const port of [PORT, 4010, 4011, 4020, 4021, 4030, 4031]) {
  const free = await new Promise((res) => { const s = net.createServer().once('error', () => res(false)).once('listening', () => s.close(() => res(true))).listen(port) })
  if (!free) { console.error(`Port ${port} is already in use. Stop whatever is using it and try again.`); process.exit(1) }
}
const mongo = await MongoMemoryServer.create()
const env = {
  ...process.env, DATABASE_URL: mongo.getUri('microlaunch_test'), NODE_ENV: 'development', PORT: String(PORT), E2E_BASE: `http://localhost:${PORT}/api/v1`, JWT_SECRET: 'integration-tests-only-0123456789abcdef',
  SEED_ADMIN_EMAIL: 'admin@microlaunch.local', SEED_ADMIN_PASSWORD: 'Admin12345!', CLIENT_LOCAL: 'http://localhost:5173', CLIENT_PRODUCTION: '', SERVER_URL: '',
  RENDER_EXTERNAL_URL: '', RAILWAY_PUBLIC_DOMAIN: '', RATE_LIMIT_ENABLED: 'false', RESEND_API_KEY: '', MAIL_FROM: '', SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '',
  PAYMONGO_SECRET_KEY: '', PAYMONGO_WEBHOOK_SECRET: '', PAYPAL_CLIENT_ID: '', PAYPAL_CLIENT_SECRET: '', PAYPAL_MODE: 'sandbox'
}
const wanted = process.argv.slice(2)
const suites = wanted.length ? wanted : ['e2e.mjs', 'integration.mjs', 'gateway-mock-e2e.mjs', 'prod-hardening.mjs']
const summary = []
let server
try {
  for (const s of ['seed-admin', 'seed-sidehustles']) {
    const r = spawnSync('node', [`src/migrations/${s}.js`], { cwd, env, encoding: 'utf8' })
    if (r.status !== 0) throw new Error(`${s} failed: ${r.stderr}`)
  }
  server = spawn('node', ['src/server.js'], { cwd, env, stdio: 'ignore' })
  for (let i = 0; ; i++) {
    if (server.exitCode !== null) throw new Error('The server stopped during startup.')
    if (await fetch(`${env.E2E_BASE}/health`).then((r) => r.ok, () => false)) break
    if (i > 60) throw new Error('The server did not start within 30 seconds')
    await new Promise((r) => setTimeout(r, 500))
  }
  for (const s of suites) {
    console.log(`\n##### ${s}`)
    const code = await new Promise((res) => spawn('node', [`tests/${s}`], { cwd, env, stdio: 'inherit' }).on('close', res))
    summary.push([s, code])
  }
} catch (e) { summary.push([e.message, 1]) } finally { server?.kill(); await mongo.stop() }

console.log('\n===== SUITES =====')
for (const [s, code] of summary) console.log(`  ${code === 0 ? 'PASS' : 'FAIL'}  ${s}`)
process.exit(summary.every(([, c]) => c === 0) ? 0 : 1)
