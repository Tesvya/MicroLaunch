import crypto from 'crypto'
import bcrypt from 'bcrypt'
import User from './models/user.model.js'
import Role from './models/role.model.js'
import { generateAccessToken, clearAuthCookies } from '../../shared/utils/generateJwt.js'
import { sendMail, verificationEmail } from '../../shared/utils/mailer.js'
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

export const login = async (req, res) => {
    try {
        const { email, password } = req.validatedData.body
        const user = await User.findOne({ email }).populate('roleId')
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
