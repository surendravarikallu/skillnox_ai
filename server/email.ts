import nodemailer from 'nodemailer';

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.brevo.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || 'no-reply@kitaghire.in';
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'no-reply@kitaghire.in';
const SENDER_NAME = process.env.SENDER_NAME || 'Skillnox AI (Kitaghire)';

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: BREVO_API_KEY,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  // Method 1: Brevo HTTP REST API (Primary)
  if (BREVO_API_KEY) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: SENDER_NAME, email: SENDER_EMAIL },
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
  try {
    const info = await transporter.sendMail({
      from: `"${SENDER_NAME}" <${SENDER_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    console.log(`[EMAIL SUCCESS via Nodemailer SMTP] Sent to ${options.to}, Message ID: ${info.messageId}`);
    return true;
  } catch (smtpError) {
    console.error('[EMAIL ERROR] Failed to send email via SMTP:', smtpError);
    return false;
  }
}
