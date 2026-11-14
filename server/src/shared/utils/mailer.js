
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
