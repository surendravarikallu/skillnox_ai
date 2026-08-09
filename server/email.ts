import nodemailer from 'nodemailer';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY || '';
  const smtpHost = process.env.SMTP_HOST || '';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER || '';
  const senderEmail = process.env.SENDER_EMAIL || '';
  const senderName = process.env.SENDER_NAME || 'Skillnox AI';

  // Method 1: Brevo HTTP REST API (Primary)
  if (apiKey) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text || options.subject,
        }),
      });

      if (response.ok) {
        console.log(`[EMAIL SUCCESS via Brevo API] Sent to ${options.to}`);
        return true;
      }
      const errorText = await response.text();
      console.warn(`[WARN] Brevo API failed (${response.status}): ${errorText}. Falling back to Nodemailer SMTP...`);
    } catch (apiError) {
      console.warn('[WARN] Brevo API fetch error:', apiError, 'Falling back to Nodemailer SMTP...');
    }
  }

  // Method 2: Nodemailer SMTP Fallback
  if (smtpHost && smtpUser) {
    try {
      const dynamicTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
        auth: {
          user: smtpUser,
          pass: apiKey,
        },
      });

      const info = await dynamicTransporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.subject,
      });
      console.log(`[EMAIL SUCCESS via Nodemailer SMTP] Sent to ${options.to}, Message ID: ${info.messageId}`);
      return true;
    } catch (smtpError) {
      console.error('[EMAIL ERROR] Failed to send email via SMTP:', smtpError);
      return false;
    }
  }

  console.error('[EMAIL ERROR] No email service credentials configured in environment variables.');
  return false;
}
