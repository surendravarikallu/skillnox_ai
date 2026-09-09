import nodemailer from 'nodemailer';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let currentBrevoKeyIndex = 0;

function getBrevoApiKeys(): string[] {
  const rawKeys = process.env.BREVO_API_KEYS || process.env.BREVO_API_KEY || '';
  return rawKeys
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const apiKeys = getBrevoApiKeys();
  const smtpHost = process.env.SMTP_HOST || '';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER || '';
  const senderEmail = process.env.SENDER_EMAIL || 'no-reply@kitaghire.in';
  const senderName = process.env.SENDER_NAME || 'Skillnox AI';

  // Method 1: Brevo HTTP REST API with Multi-Key Round-Robin & Failover
  if (apiKeys.length > 0) {
    const totalKeys = apiKeys.length;
    const startIndex = currentBrevoKeyIndex % totalKeys;

    for (let attempt = 0; attempt < totalKeys; attempt++) {
      const selectedKeyIndex = (startIndex + attempt) % totalKeys;
      const apiKey = apiKeys[selectedKeyIndex];
      const keySnippet = apiKey.substring(0, 12) + '...' + apiKey.slice(-6);

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
          const data: any = await response.json().catch(() => ({}));
          console.log(`[EMAIL SUCCESS via Brevo API Key #${selectedKeyIndex + 1} (${keySnippet})] Sent to ${options.to} | MessageID: ${data.messageId || 'OK'}`);
          // Rotate pointer for next email
          currentBrevoKeyIndex = (selectedKeyIndex + 1) % totalKeys;
          return true;
        }

        const errorText = await response.text();
        console.warn(`[WARN] Brevo API Key #${selectedKeyIndex + 1} (${keySnippet}) returned HTTP ${response.status}: ${errorText}`);

        // If quota exceeded (402) or rate limit (429) or other issue, try the next key
        if (attempt < totalKeys - 1) {
          console.log(`[Brevo Failover] Switching to next available Brevo API key...`);
        }
      } catch (apiError: any) {
        console.warn(`[WARN] Brevo API Key #${selectedKeyIndex + 1} (${keySnippet}) network error:`, apiError?.message || apiError);
        if (attempt < totalKeys - 1) {
          console.log(`[Brevo Failover] Switching to next available Brevo API key...`);
        }
      }
    }
    console.warn('[WARN] All Brevo API keys exhausted or failed. Attempting Nodemailer SMTP fallback...');
  }

  // Method 2: Nodemailer SMTP Fallback
  if (smtpHost && smtpUser) {
    const primaryKey = apiKeys[0] || process.env.BREVO_API_KEY || '';
    try {
      const dynamicTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: false,
        auth: {
          user: smtpUser,
          pass: primaryKey,
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
