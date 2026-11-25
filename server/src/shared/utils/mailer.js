import { Resend } from 'resend';

export const isMailConfigured = () =>
    Boolean(process.env.RESEND_API_KEY);

export const escapeHtml = (s = '') =>
    String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));

export const sendMail = async ({ to, subject, text, html }) => {
    if (!isMailConfigured()) {
        console.error('[Mail] RESEND_API_KEY is missing.');
        return { sent: false };
    }

    try {
        const resend = new Resend(process.env.RESEND_API_KEY);

        const { data, error } = await resend.emails.send({
            from: process.env.MAIL_FROM || 'MICROLAUNCH <onboarding@resend.dev>',
            to,
            subject,
            text,
            html
        });

        if (error) {
            console.error('[Mail] Resend API failed:', error);
            throw new Error(error.message);
        }

        console.log('[Mail] Successfully submitted:', {
            messageId: data?.id
        });

        return { sent: true };

    } catch (error) {
        console.error('[Mail] Sending failed:', error.message);
        throw error;
    }
};

export const verificationEmail = ({ name, url }) => ({
    subject: 'Verify your MICROLAUNCH account',
    text: `Hi ${name},

Welcome to MICROLAUNCH! Confirm your email address to activate your account:
${url}

This link expires in 24 hours. If you did not create an account, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#14213d">
<h2 style="margin-bottom:4px">Welcome to MICROLAUNCH, ${escapeHtml(name)}!</h2>
<p>Confirm your email address to activate your account.</p>
<p style="margin:24px 0"><a href="${url}" style="background:#fca311;color:#14213d;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Verify my email</a></p>
<p style="font-size:13px;color:#6b7280">Or paste this link into your browser:<br>${url}</p>
<p style="font-size:13px;color:#6b7280">This link expires in 24 hours. If you did not create an account, you can ignore this email.</p></div>`
});

const nl2br = (t = '') => escapeHtml(t).replace(/\n/g, '<br>')
export const decisionEmail = ({ name, listingTitle, status, message, siteUrl }) => {
    const approved = status === 'APPROVED'
    const subject = approved ? `Your application was approved: ${listingTitle}` : `Update on your application: ${listingTitle}`
    const intro = approved ? `Good news! Your application for "${listingTitle}" has been approved.` : `Thank you for applying to "${listingTitle}". Unfortunately your application was not approved this time.`
    const label = approved ? 'Message from the admin' : 'Reason'
    const text = `Hi ${name},\n\n${intro}\n\n${message ? `${label}: ${message}\n\n` : ''}You can see the details any time under My Applications: ${siteUrl}/app/applications`
    const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#14213d">
<h2 style="margin-bottom:4px">Hi ${escapeHtml(name)},</h2><p>${escapeHtml(intro)}</p>
${message ? `<div style="background:#f7f7f2;border-left:4px solid #fca311;padding:12px 14px;border-radius:6px;margin:16px 0"><strong>${label}:</strong><br>${nl2br(message)}</div>` : ''}
<p><a href="${siteUrl}/app/applications" style="color:#14213d;font-weight:bold">View it under My Applications</a></p></div>`
    return { subject, text, html }
}
