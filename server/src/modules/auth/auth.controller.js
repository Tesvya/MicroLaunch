import crypto from 'crypto'
import bcrypt from 'bcrypt'
import User from './models/user.model.js'
import Role from './models/role.model.js'
import { generateAccessToken, clearAuthCookies } from '../../shared/utils/generateJwt.js'
import { sendMail, verificationEmail, passwordResetEmail } from '../../shared/utils/mailer.js'
import { createNotification } from '../notifications/notifications.controller.js'
import { publicClientUrl } from '../../shared/utils/urls.js'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex')
const clientBase = () => publicClientUrl()

/** Creates a fresh token (invalidating any older one), saves its hash, and emails the link. */
const issueVerification = async (user) => {
    const token = crypto.randomBytes(32).toString('hex');

    user.emailVerificationTokenHash = hashToken(token);
    user.emailVerificationExpires = new Date(Date.now() + TOKEN_TTL_MS);

    // Clear previous timestamp so failed attempts don't trigger cooldown.
    user.emailVerificationSentAt = null;
    await user.save();

    const url = `${clientBase()}/verify-email?token=${token}`;

    let sent = false;

    try {
        const result = await sendMail({
            to: user.email,
            ...verificationEmail({ name: user.name, url })
        });

        sent = result.sent;

        if (sent) {
            user.emailVerificationSentAt = new Date();
            await user.save();
        }
    } catch (error) {
        console.error('[Verification] Email failed:', {
            message: error.message,
            code: error.code,
            response: error.response
        });
    }

    const devVerificationUrl =
        !sent && process.env.NODE_ENV !== 'production'
            ? url
            : undefined;

    return { sent, devVerificationUrl };
};

export const register = async (req, res) => {
    try {
        const { name, email, password } = req.validatedData.body
        if (await User.findOne({ email })) return res.status(409).json({ message: 'Email is already registered' })
        const role = await Role.findOne({ name: 'USER' })
        if (!role) return res.status(500).json({ message: 'USER role not configured. Run seed:admin first.' })
        const user = await new User({ name, email, password: await bcrypt.hash(password, await bcrypt.genSalt(10)), roleId: role._id, isEmailVerified: false }).save()
        const { sent, devVerificationUrl } = await issueVerification(user)
        return res.status(201).json({
            message: sent ? 'Account created. Check your email to verify your address.' : 'Account created, but we could not send the verification email. Use "Resend" on the next screen.',
            properties: { email: user.email, emailSent: sent, devVerificationUrl }
        })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}

export const verifyEmail = async (req, res) => {
    try {
        const { token } = req.validatedData.body
        const user = await User.findOne({ emailVerificationTokenHash: hashToken(token), emailVerificationExpires: { $gt: new Date() } })
        if (!user) return res.status(400).json({ message: 'This verification link is invalid or has expired. If you already verified, just log in; otherwise request a new link.' })
        user.isEmailVerified = true
        user.emailVerificationTokenHash = null
        user.emailVerificationExpires = null
        user.updatedAt = new Date()
        await user.save()
        await createNotification({ userId: user._id, notificationType: 'SYSTEM', title: 'Welcome to MICROLAUNCH', message: 'Your email is verified. Complete your profile to get your first side-hustle matches.' })
        return res.status(200).json({ message: 'Email verified successfully. You can now log in.' })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}

export const resendVerification = async (req, res) => {
    console.log('MICROLAUNCH RESEND CONTROLLER HIT');
    const generic = {
        message: 'If that account exists and is not yet verified, a new verification email has been sent.'
    };

    try {
        const { email } = req.validatedData.body;

        console.log('[Resend] Request received');

        const user = await User.findOne({ email })
            .select('+emailVerificationSentAt');

        console.log('[Resend] User found:', !!user);

        if (!user || user.isEmailVerified) {
            console.log('[Resend] User missing or already verified');
            return res.status(200).json(generic);
        }

        console.log('[Resend] Already verified:', user.isEmailVerified);
        console.log('[Resend] Has timestamp:', !!user.emailVerificationSentAt);

        const since = Date.now() -
            (user.emailVerificationSentAt
                ? user.emailVerificationSentAt.getTime()
                : 0);

        const remaining = RESEND_COOLDOWN_MS - since;

        console.log('[Resend] Cooldown remaining (ms):', Math.max(0, remaining));

        if (since < RESEND_COOLDOWN_MS) {
            console.log('[Resend] Blocked by cooldown');
            return res.status(200).json(generic);
        }

        console.log('[Resend] Calling issueVerification');

        const { sent, devVerificationUrl } = await issueVerification(user);

        console.log('[Resend] Email sending result:', sent);

        return res.status(200).json({
            ...generic,
            properties: { emailSent: sent, devVerificationUrl }
        });

    } catch (error) {
        console.error('[Resend] Error:', error.message);
        return res.status(500).json({ message: error.message });
    }
};

const RESET_TTL_MS = 60 * 60 * 1000
const resetGeneric = { message: 'If an account exists for that email, a password reset link has been sent.' }

/** Same answer whether or not the account exists, so this cannot be used to find out who is registered. */
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.validatedData.body
        const user = await User.findOne({ email }).select('+passwordResetSentAt')
        if (!user || !user.isActive) return res.status(200).json(resetGeneric)
        if (user.passwordResetSentAt && Date.now() - user.passwordResetSentAt.getTime() < RESEND_COOLDOWN_MS) return res.status(200).json(resetGeneric)
        const token = crypto.randomBytes(32).toString('hex')
        await User.updateOne({ _id: user._id }, { $set: { passwordResetTokenHash: hashToken(token), passwordResetExpires: new Date(Date.now() + RESET_TTL_MS) } }) // replaces any older link
        const url = `${clientBase()}/reset-password?token=${token}`
        let sent = false
        try { sent = (await sendMail({ to: user.email, ...passwordResetEmail({ name: user.name, url }) })).sent }
        catch (error) { console.error('[Password reset] Email failed:', error.message) }
        if (sent) await User.updateOne({ _id: user._id }, { $set: { passwordResetSentAt: new Date() } }) // only a delivered email starts the cooldown
        // Never returned to the browser (anyone could request it for any account); only printed for local development
        else if (process.env.NODE_ENV !== 'production') console.log(`\n[Password reset:DEV] Email not configured. Reset link for ${user.email}:\n  ${url}\n`)
        return res.status(200).json(resetGeneric)
    } catch (error) { return res.status(500).json({ message: error.message }) }
}

export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.validatedData.body
        const passwordHash = await bcrypt.hash(password, await bcrypt.genSalt(10))
        // Atomic: the link works exactly once, even if submitted twice at the same moment
        const user = await User.findOneAndUpdate(
            { passwordResetTokenHash: hashToken(token), passwordResetExpires: { $gt: new Date() } },
            // Opening the emailed link also proves the address, so an unverified account becomes verified
            { $set: { password: passwordHash, passwordResetTokenHash: null, passwordResetExpires: null, passwordResetSentAt: null, passwordChangedAt: new Date(), isEmailVerified: true, emailVerificationTokenHash: null, emailVerificationExpires: null, updatedAt: new Date() }, $inc: { sessionVersion: 1 } },
            { new: true }
        )
        if (!user) return res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' })
        await createNotification({ userId: user._id, notificationType: 'SYSTEM', title: 'Password changed', message: 'Your password was reset. If this was not you, reset it again right away and contact an administrator.' })
        clearAuthCookies(res)
        return res.status(200).json({ message: 'Your password has been reset. You can now log in.' })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.validatedData.body
        const user = await User.findOne({ email }).populate('roleId').select('+sessionVersion')
        if (!user || !await bcrypt.compare(password, user.password)) return res.status(401).json({ message: 'Invalid credentials' })
        if (!user.isEmailVerified) return res.status(403).json({ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address before logging in. Check your inbox for the verification link.' })
        if (!user.isActive) return res.status(403).json({ message: 'This account has been suspended.' })
        generateAccessToken(user, res)
        return res.status(200).json({ message: 'Logged in successfully', properties: { user: { _id: user._id, name: user.name, email: user.email, role: user.roleId.name, avatar: user.avatar||null, hasCompletedProfile: user.hasCompletedProfile } } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}
export const logout = async (_req, res) => { clearAuthCookies(res); return res.status(200).json({ message: 'Logged out successfully' }) }
export const checkUser = async (req, res) => {
    try {
        const user = req.user
        return res.status(200).json({ properties: { user: { _id: user._id, name: user.name, email: user.email, role: user.roleId.name, avatar: user.avatar||null, hasCompletedProfile: user.hasCompletedProfile } } })
    } catch (error) { return res.status(500).json({ message: error.message }) }
}
