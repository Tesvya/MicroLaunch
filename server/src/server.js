import './configs/load-env.js'
import app from './app.js'
import { dbConnection } from './configs/db.config.js'
import { loadModel } from './modules/ml/modelLoader.js'
import { publicClientUrl } from './shared/utils/urls.js'

// Refuse to start a production server that is misconfigured in ways that would be insecure or silently broken.
if (process.env.NODE_ENV === 'production') {
    const problems = []
    if (!process.env.DATABASE_URL) problems.push('DATABASE_URL is not set (use your MongoDB Atlas connection string).')
    const secret = process.env.JWT_SECRET || ''
    if (secret.length < 32 || /replace-with|changeme|testsecret|secret123/i.test(secret)) problems.push('JWT_SECRET must be a long random string (32+ characters), not a placeholder.')
    if (!publicClientUrl()) problems.push('CLIENT_PRODUCTION is not set. It must be the public https URL of your site (used in verification emails and payment redirects).')
    if (problems.length) {
        console.error('\n[STARTUP ABORTED] Production configuration problems:\n' + problems.map((p) => `  - ${p}`).join('\n') + '\n')
        process.exit(1)
    }
}

const PORT = process.env.PORT || 4000
app.listen(PORT, async () => {
    await dbConnection()
    loadModel()
    console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`)
})
