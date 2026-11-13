// Read-only checks that are safe to run against a LIVE deployment:
//   node tests/deploy-smoke.mjs https://your-app.onrender.com
export const runSmoke = async (base, check) => {
  const get = (p, opts = {}) => fetch(base + p, { redirect: 'manual', ...opts })

  let r = await get('/api/v1/health'); let j = await r.json().catch(() => ({}))
  check('health endpoint reports database connected', r.status === 200 && j.ok === true && j.db === 'connected', JSON.stringify(j))

  r = await get('/'); const html = await r.text()
  check('home page serves the React app', r.status === 200 && html.includes('<div id="root">') && (r.headers.get('content-type') || '').includes('text/html'))
  check('index.html is never cached (so new deploys show up)', (r.headers.get('cache-control') || '').includes('no-cache'))
  for (const p of ['/app/income', '/admin/dashboard', '/login', '/verify-email?token=abc']) {
    r = await get(p); const t = await r.text()
    check(`deep link ${p.split('?')[0]} returns the app (SPA fallback)`, r.status === 200 && t.includes('<div id="root">'))
  }
  const asset = html.match(/\/assets\/[^"']+\.js/)?.[0]
  r = await get(asset || '/assets/none.js')
  check('JS bundle served with correct type', r.status === 200 && (r.headers.get('content-type') || '').includes('javascript'), asset)
  check('hashed assets are cached for a year (immutable)', (r.headers.get('cache-control') || '').includes('immutable'))
  r = await get('/assets/does-not-exist.js')
  check('missing asset is a real 404, not the HTML page', r.status === 404 && !(await r.text()).includes('<div id="root">'))

  r = await get('/')
  check('security headers: CSP present', !!r.headers.get('content-security-policy'))
  check('security headers: nosniff', r.headers.get('x-content-type-options') === 'nosniff')
  check('does not advertise Express (x-powered-by)', !r.headers.get('x-powered-by'))

  r = await get('/api/v1/nope'); j = await r.json().catch(() => null)
  check('unknown API route -> JSON 404', r.status === 404 && j?.message === 'Route not found')
  r = await get('/api/v1/recommendations/me')
  check('protected API route without a session -> 401', r.status === 401)
  r = await get('/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' }); const t2 = await r.text()
  check('malformed JSON -> clean 400 JSON (no stack trace)', r.status === 400 && t2.includes('Invalid JSON') && !t2.includes('at '))
}

if (process.argv[1]?.endsWith('deploy-smoke.mjs')) {
  const base = (process.argv[2] || 'http://localhost:4000').replace(/\/+$/, '')
  let pass = 0, fail = 0
  console.log(`Smoke-testing ${base}\n`)
  try { await runSmoke(base, (l, c, x = '') => { c ? pass++ : fail++; console.log(`  ${c ? 'PASS' : 'FAIL'}  ${l} ${c ? '' : x}`) }) }
  catch (e) { fail++; console.log(`  FAIL  could not reach ${base}: ${e.message}`) }
  console.log(`\n=== ${pass} passed, ${fail} failed ===`); process.exit(fail ? 1 : 0)
}
