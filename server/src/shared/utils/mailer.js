import nodemailer from 'nodemailer'

export const isMailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)

let transporter = null
const getTransporter = () => {
    if (!transporter) {
        const port = Number(process.env.SMTP_PORT || 587)
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: String(process.env.SMTP_SECURE) === 'true' || port === 465,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        })
    }
    return transporter
}

export const escapeHtml = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/** Sends an email. With no SMTP configured it logs the message instead (dev fallback) and returns { sent:false }. */
export const sendMail = async ({ to, subject, text, html }) => {
    if (!isMailConfigured()) {
        if (process.env.NODE_ENV === 'production') console.log(`[Mail] SMTP not configured: email to ${to} was NOT sent. An admin can verify the account from Manage Users.`)
        else console.log(`\n[Mail:DEV] SMTP not configured, email NOT sent.\n  To: ${to}\n  Subject: ${subject}\n  ${text}\n`)
        return { sent: false }
    }
    await getTransporter().sendMail({ from: process.env.MAIL_FROM || `MICROLAUNCH <${process.env.SMTP_USER}>`, to, subject, text, html })
    return { sent: true }
}

export const verificationEmail = ({ name, url }) => ({
    subject: 'Verify your MICROLAUNCH account',
    text: `Hi ${name},\n\nWelcome to MICROLAUNCH! Confirm your email address to activate your account:\n${url}\n\nThis link expires in 24 hours. If you did not create an account, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#14213d">
<h2 style="margin-bottom:4px">Welcome to MICROLAUNCH, ${escapeHtml(name)}!</h2>
<p>Confirm your email address to activate your account.</p>
<p style="margin:24px 0"><a href="${url}" style="background:#fca311;color:#14213d;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Verify my email</a></p>
<p style="font-size:13px;color:#6b7280">Or paste this link into your browser:<br>${url}</p>
<p style="font-size:13px;color:#6b7280">This link expires in 24 hours. If you did not create an account, you can ignore this email.</p></div>`
})
