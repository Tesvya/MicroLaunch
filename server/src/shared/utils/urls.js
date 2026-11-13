// Single source of truth for "where does this app live" so emails/redirects never fall back to localhost in production.
const trim = (u = '') => String(u).replace(/\/+$/, '')
const isProd = () => process.env.NODE_ENV === 'production'

/** Public address of the website (what users type in the browser). */
export const publicClientUrl = () => {
    if (!isProd()) return trim(process.env.CLIENT_LOCAL || 'http://localhost:5173')
    return trim(
        process.env.CLIENT_PRODUCTION ||
        process.env.RENDER_EXTERNAL_URL ||                                   // set automatically by Render
        (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '') // set automatically by Railway
    )
}

/** Public address of this API server (PayPal sends the user's browser back here). Same as the site when served together. */
export const publicServerUrl = () =>
    trim(process.env.SERVER_URL || (isProd() ? publicClientUrl() : `http://localhost:${process.env.PORT || 4000}`))
