import jwt from 'jsonwebtoken'
const isProduction = process.env.NODE_ENV === 'production'
// 'lax' is correct (and safest) when the site and API share one domain, which is how this app is deployed.
// Only set COOKIE_SAMESITE=none if you host the frontend on a DIFFERENT domain than the API (requires HTTPS).
const sameSite = process.env.COOKIE_SAMESITE || 'lax'
const cookieOptions = { httpOnly: true, secure: isProduction || sameSite === 'none', sameSite, maxAge: 7 * 24 * 60 * 60 * 1000 }
export const generateAccessToken = (user, res) => { const token = jwt.sign({ _id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' }); res.cookie('accessToken', token, cookieOptions); return token }
export const clearAuthCookies = (res) => res.clearCookie('accessToken', { ...cookieOptions, maxAge: undefined })
