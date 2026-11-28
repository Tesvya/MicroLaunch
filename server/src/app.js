import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import { publicClientUrl } from './shared/utils/urls.js'
import authRoutes from './modules/auth/auth.routes.js'
import profileRoutes from './modules/profile/profile.routes.js'
import sideHustleRoutes from './modules/sidehustles/sidehustles.routes.js'
import recommendationRoutes from './modules/recommendations/recommendations.routes.js'
import incomeRoutes from './modules/income/income.routes.js'
import ratingRoutes from './modules/ratings/ratings.routes.js'
import applicationRoutes from './modules/applications/applications.routes.js'
import notificationRoutes from './modules/notifications/notifications.routes.js'
import activityLogRoutes from './modules/activitylogs/activitylogs.routes.js'
import reportRoutes from './modules/reports/reports.routes.js'
import paymentRoutes from './modules/payments/payments.routes.js'
import adminRoutes from './modules/admin/admin.routes.js'
import favoriteRoutes from './modules/favorites/favorites.routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'
const app = express()

// Behind Render/Railway/etc. there is one proxy hop. Needed for correct client IPs (rate limiting) and https detection.
if (isProduction || process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY || 1))

// Security headers. 'upgrade-insecure-requests' is disabled so the app still works if run over plain http locally.
app.use(helmet({ contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': null } } }))

// PayMongo signs the RAW body, so the webhook must be parsed raw BEFORE express.json().
app.use('/api/v1/payments/paymongo/webhook', express.raw({ type: '*/*', limit: '1mb' }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(cookieParser())
if (process.env.NODE_ENV !== 'test') app.use(morgan(isProduction ? 'combined' : 'dev'))

// Cross-origin access is only needed if the frontend is hosted on a different domain than the API.
const allowedOrigins = [process.env.CLIENT_LOCAL, process.env.CLIENT_PRODUCTION, publicClientUrl()].filter(Boolean)
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)), credentials: true }))

// Brute-force / abuse protection. Limits are per IP and deliberately generous so a whole classroom on one
// school Wi-Fi (shared IP) can still sign in. Only FAILED logins count toward the login limit.
const limitsEnabled = () => isProduction || process.env.RATE_LIMIT_ENABLED === 'true'
const limiter = (limit, extra = {}) => rateLimit({
    windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-7', legacyHeaders: false,
    skip: () => !limitsEnabled(), message: { message: 'Too many attempts. Please wait a few minutes and try again.' }, ...extra
})
app.post('/api/v1/auth/login', limiter(Number(process.env.LOGIN_FAIL_LIMIT || 30), { skipSuccessfulRequests: true }))
app.post(['/api/v1/auth/register', '/api/v1/auth/resend-verification', '/api/v1/auth/verify-email', '/api/v1/auth/forgot-password', '/api/v1/auth/reset-password'], limiter(Number(process.env.AUTH_RATE_LIMIT_MAX || 100)))

app.get('/api/v1/health', (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1
    res.status(dbUp ? 200 : 503).json({ ok: dbUp, db: dbUp ? 'connected' : 'disconnected', uptimeSeconds: Math.round(process.uptime()) })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/profile', profileRoutes)
app.use('/api/v1/side-hustles', sideHustleRoutes)
app.use('/api/v1/recommendations', recommendationRoutes)
app.use('/api/v1/income', incomeRoutes)
app.use('/api/v1/ratings', ratingRoutes)
app.use('/api/v1/applications', applicationRoutes)
app.use('/api/v1/notifications', notificationRoutes)
app.use('/api/v1/activity-logs', activityLogRoutes)
app.use('/api/v1/reports', reportRoutes)
app.use('/api/v1/payments', paymentRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/favorites', favoriteRoutes)

// One-service deployment: if the React app has been built (web/dist), serve it from this same server.
// Same domain => no CORS problems and the login cookie stays first-party.
const webDist = process.env.WEB_DIST_PATH || path.resolve(__dirname, '../../web/dist')
const serveWeb = process.env.SERVE_WEB !== 'false' && fs.existsSync(path.join(webDist, 'index.html'))
if (serveWeb) {
    app.use(express.static(webDist, {
        index: false,
        setHeaders: (res, filePath) => {
            if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable') // hashed filenames
            else res.setHeader('Cache-Control', 'no-cache')
        }
    }))
    // React Router paths (/app/income, /verify-email, ...) must all return index.html. Paths with a dot (files) and /api are excluded.
    app.get(/^\/(?!api\/)[^.]*$/, (_req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(webDist, 'index.html')) })
} else {
    app.get('/', (_req, res) => res.status(200).json({ ok: true, name: 'MICROLAUNCH API' }))
}

app.use((_req, res) => res.status(404).json({ message: 'Route not found' }))

// Never leak stack traces or HTML error pages to clients.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON in request body' })
    if (err?.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large' })
    console.error('[Unhandled error]', err)
    return res.status(err?.status || 500).json({ message: isProduction ? 'Something went wrong. Please try again.' : err.message })
})

export default app
