import jwt from 'jsonwebtoken'
import User from '../../modules/auth/models/user.model.js'
export const guard = ([...roles]) => async (req, res, next) => {
    try {
        const token = req.cookies.accessToken
        if (!token) return res.status(401).json({ message: 'Unauthorized' })
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded._id).populate('roleId').select('-password')
        if (!user) return res.status(404).json({ message: 'User not found' })
        if (roles && roles.length > 0 && !roles.includes(user.roleId.name)) return res.status(403).json({ message: 'Forbidden' })
        req.user = user; next()
    } catch { res.status(401).json({ message: 'Invalid or expired session' }) }
}
