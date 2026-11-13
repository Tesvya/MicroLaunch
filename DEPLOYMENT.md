# Deploying MICROLAUNCH

**What you are deploying:** ONE web service. The Node server serves both the website (the built React app) and the API, so
the site and API share one address. That avoids CORS and login-cookie problems. The database is MongoDB Atlas (free).

```
Browser ──https──> Render (Node server: website + /api/v1/...) ──> MongoDB Atlas
                         └── sends email via SMTP (optional) / talks to PayMongo + PayPal (optional)
```

Total cost: **free** (Render free plan + Atlas M0). Time: about 30-45 minutes the first time.

---

## Step 1: Create the database (MongoDB Atlas)

1. Sign up at mongodb.com/atlas and create a **free (M0)** cluster. Pick a region near you (e.g. Singapore).
2. **Database Access** -> *Add New Database User*. Username + a strong password. Avoid `@ : / ?` in the password
   (or URL-encode them).
3. **Network Access** -> *Add IP Address* -> **Allow access from anywhere (0.0.0.0/0)**.
   Render's free plan has no fixed IP, so this is required. Your database is still protected by the user/password and TLS.
4. **Database -> Connect -> Drivers**, copy the connection string. It looks like
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`.
   **Insert the database name** before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/microlaunch?retryWrites=true&w=majority`

## Step 2: Seed the database ONCE (from your own computer)

This creates the two roles (registration fails without them), your admin account, and 6 sample listings.

Create `server/.env` on your computer (it is git-ignored, never uploaded):

```
DATABASE_URL=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/microlaunch?retryWrites=true&w=majority
JWT_SECRET=anything-for-this-local-step-0123456789abcdef
SEED_ADMIN_EMAIL=you@yourdomain.com
SEED_ADMIN_PASSWORD=choose-a-long-unique-password
```

Then:

```bash
cd server
npm install
npm run seed:all
```

The seed **refuses** the well-known default admin password on a non-local database, on purpose.
Seeding twice is harmless (it skips what exists). To change the admin password later, change it in the database
or delete the admin user in Atlas and seed again.

## Step 3: Put the code on GitHub

```bash
git init
git add .
git commit -m "MICROLAUNCH"
# create an empty (private is fine) repo on github.com, then:
git remote add origin https://github.com/YOUR-USER/microlaunch.git
git push -u origin main
```

Check on github.com that **no `.env` file** was uploaded. The `.gitignore` already prevents it.

## Step 4: Deploy on Render

**Option A: Blueprint (uses `render.yaml`)**
1. render.com -> **New +** -> **Blueprint** -> connect your GitHub repo.
2. When asked, paste your `DATABASE_URL`. `JWT_SECRET` is generated for you. Leave the optional ones empty for now.
3. Click **Apply**. The first build takes ~3-5 minutes.

**Option B: Manual (if the Blueprint is rejected)**
**New +** -> **Web Service** -> your repo, then:

| Setting | Value |
|---|---|
| Runtime | Node |
| Build Command | `cd web && npm install --include=dev && npm run build && cd ../server && npm install && npm run build` |
| Start Command | `cd server && npm start` |
| Health Check Path | `/api/v1/health` |
| Environment | `NODE_ENV=production`, `NODE_VERSION=22`, `DATABASE_URL=...`, `JWT_SECRET=<40+ random characters>` |

> The `--include=dev` part matters. Hosts set `NODE_ENV=production` during install, which silently skips Vite and the
> build then fails with `ERR_MODULE_NOT_FOUND`. (Verified in testing.)

The build also trains the Random Forest model (it is deterministic: same 87% accuracy every build).

## Step 5: Verify the live site

Your URL is shown in Render (`https://microlaunch-xxxx.onrender.com`). From your computer:

```bash
cd server
npm run smoke -- https://microlaunch-xxxx.onrender.com
```

All 16 checks should pass (database connected, site served, deep links work, security headers, etc.).
Then in the browser: log in as your admin, register a test user, apply to a listing, approve it as admin.

If the server refuses to start, Render's **Logs** will show `[STARTUP ABORTED]` with the exact reason.

## Step 6: Email (account verification)

New users must verify their email. Without SMTP configured, **no email is sent** and new accounts will be stuck, but
an admin can click **Verify email** next to the user in **Admin -> Manage Users**. That is your fallback for any demo.

For real emails, add these in Render -> Environment (Gmail example):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-address@gmail.com
SMTP_PASS=<16-character Google App Password>     (Google account -> Security -> 2-Step Verification -> App passwords)
MAIL_FROM=MICROLAUNCH <your-address@gmail.com>
```

Register with a real address and confirm the email arrives **before** exhibit day. Check spam.

## Step 7: Payments (optional; Simulated payouts work with no setup)

**PayMongo (GCash + Maya)**: add `PAYMONGO_SECRET_KEY` (a `sk_test_...` key). For automatic confirmation, create a webhook in
the PayMongo dashboard -> Developers -> Webhooks: URL `https://YOUR-SITE/api/v1/payments/paymongo/webhook`, event
`link.payment.paid`; put its signing secret in `PAYMONGO_WEBHOOK_SECRET`.
**The webhook is optional**: users can always press **Check status** on the Transactions page, which asks PayMongo directly.

**PayPal**: add `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from a *Sandbox* app (`PAYPAL_MODE=sandbox`).

Do one real sandbox payment end to end before relying on either. The code is tested against a simulated provider, which
proves our flow, **not** that the real providers accept our requests.

## Exhibit-day checklist

- [ ] **Free Render services sleep after ~15 min idle** and take 30-60 s to wake. Open the site 10 minutes before you
      present, or set a free UptimeRobot monitor to hit `https://YOUR-SITE/api/v1/health` every 5 minutes (or use a paid plan).
- [ ] `npm run smoke -- https://YOUR-SITE` passes.
- [ ] Log in as admin and as a user in **two different browsers** (one login per browser).
- [ ] Send yourself a real verification email (or know how to use admin **Verify email**).
- [ ] **Backup plan:** keep a laptop running locally (`cd server && npm run dev` and `cd web && npm run dev`) in case the
      venue Wi-Fi or the host fails. Everything works offline except email and real payments.
- [ ] Rate limits are generous on purpose (30 failed logins / 100 registrations per 15 min per IP) so a classroom sharing one
      Wi-Fi is not blocked. Raise `LOGIN_FAIL_LIMIT` / `AUTH_RATE_LIMIT_MAX` if you expect more.

## Updating the live site

`git push` to GitHub. Render rebuilds and redeploys automatically.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Logs: `[STARTUP ABORTED]` | A required setting is missing or weak. The message names it (`JWT_SECRET`, `DATABASE_URL`, ...). |
| Logs: `Database failed to connect` | Atlas Network Access must allow `0.0.0.0/0`; check the password and the `/microlaunch` db name. |
| Register says "USER role not configured" | Step 2 (seed) was not run against this database. |
| Build fails: `ERR_MODULE_NOT_FOUND` / vite | Build command is missing `--include=dev`. |
| Verification email links to `localhost` | Not on Render/Railway: set `CLIENT_PRODUCTION=https://your-site`. |
| New users can't log in | They haven't verified. Fix SMTP, or use admin **Verify email**. |
| `429 Too many attempts` | Rate limiter. Wait 15 min or raise the limits above. |
| Site and API on different domains | Set `VITE_SERVER_PRODUCTION` at build time, `CLIENT_PRODUCTION` and `COOKIE_SAMESITE=none` on the server. Not recommended. |

## Environment variable reference

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV=production` | yes | Enables hardening (rate limits, secure cookies, startup checks). |
| `DATABASE_URL` | yes | MongoDB Atlas connection string. |
| `JWT_SECRET` | yes | 32+ random characters; the server refuses to start otherwise. |
| `CLIENT_PRODUCTION` | auto on Render/Railway | Public https URL of the site (emails, redirects). |
| `SERVER_URL` | no | Defaults to the site URL. |
| `SMTP_HOST/PORT/USER/PASS`, `MAIL_FROM` | for real email | Verification emails. |
| `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET` | for GCash/Maya | PayMongo. |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE` | for PayPal | PayPal (`sandbox` or `live`). |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | when seeding a real DB | Admin account for the seed script. |
| `LOGIN_FAIL_LIMIT`, `AUTH_RATE_LIMIT_MAX` | no | Rate limits per IP per 15 minutes. |
| `COOKIE_SAMESITE` | no | Only `none` for split-domain hosting. |

## Other hosts

Railway, Fly.io, or any VPS work with the **same build and start commands**. Railway's public domain is detected
automatically; elsewhere set `CLIENT_PRODUCTION`.
