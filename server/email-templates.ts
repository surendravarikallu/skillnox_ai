// Professional Email Templates for Skillnox AI (Kitaghire Subsystem)
// All emails sent from: no-reply@kitaghire.in

const PLATFORM_URL = process.env.NODE_ENV === 'production'
  ? 'https://skillnoxai.kitaghire.in'
  : 'http://localhost:5070';

function baseLayout(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0e14; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0c0e14;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="background: linear-gradient(145deg, #111827, #0f172a); border: 1px solid #1e293b; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 20px 40px; text-align: center; border-bottom: 1px solid #1e293b;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">
                <span style="color: #818cf8;">Skillnox</span><span style="color: #f8fafc;"> AI</span>
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b; letter-spacing: 1px; text-transform: uppercase;">
                Interview &amp; Placement Readiness Platform | Kitaghire
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 40px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 28px 40px; border-top: 1px solid #1e293b; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #475569;">
                This is an automated notification from Skillnox AI &mdash; a subsystem of Kitaghire.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                <a href="${PLATFORM_URL}" style="color: #818cf8; text-decoration: none;">${PLATFORM_URL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function scoreBox(label: string, value: number, color: string): string {
  return `
    <td style="padding: 12px 8px; text-align: center; background: #1e293b; border-radius: 10px;">
      <span style="display: block; font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">${label}</span>
      <span style="display: block; font-size: 26px; font-weight: 800; color: ${color}; margin-top: 4px;">${Math.round(value)}%</span>
    </td>`;
}

// ─── Interview Scheduled Notification ───
export interface ScheduledEmailData {
  studentName: string;
  rollNumber: string;
  interviewType: string;
  difficulty: string;
  scheduledDate?: string;
  scheduledTime?: string;
  company?: string;
  questionCount: number;
}

export function buildScheduledEmail(data: ScheduledEmailData): { subject: string; html: string } {
  const dateStr = data.scheduledDate || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = data.scheduledTime || 'As per your slot allotment';

  const body = `
    <p style="font-size: 16px; color: #f1f5f9; margin: 0 0 6px 0;">Dear <strong>${data.studentName}</strong>,</p>
    <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0;">
      Your interview session has been scheduled on the Skillnox AI platform. Please review the details below and ensure you are prepared before the scheduled time.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #1e293b; border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8; width: 140px;">Candidate</td>
              <td style="padding: 6px 0; font-size: 14px; color: #f1f5f9; font-weight: 600;">${data.studentName} (${data.rollNumber})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Interview Type</td>
              <td style="padding: 6px 0; font-size: 14px; color: #f1f5f9; font-weight: 600;">${data.interviewType.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Difficulty Level</td>
              <td style="padding: 6px 0; font-size: 14px; color: #f1f5f9; font-weight: 600;">${data.difficulty.toUpperCase()}</td>
            </tr>
            ${data.company ? `<tr>
              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Company</td>
              <td style="padding: 6px 0; font-size: 14px; color: #f1f5f9; font-weight: 600;">${data.company}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Scheduled Date</td>
              <td style="padding: 6px 0; font-size: 14px; color: #818cf8; font-weight: 700;">${dateStr}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Scheduled Time</td>
              <td style="padding: 6px 0; font-size: 14px; color: #818cf8; font-weight: 700;">${timeStr}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Total Questions</td>
              <td style="padding: 6px 0; font-size: 14px; color: #f1f5f9; font-weight: 600;">${data.questionCount}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding: 16px 20px; background: linear-gradient(135deg, #312e81, #1e1b4b); border-radius: 12px; border: 1px solid #3730a3;">
          <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #a5b4fc;">Preparation Checklist</p>
          <ul style="margin: 0; padding: 0 0 0 16px; font-size: 13px; color: #c7d2fe; line-height: 1.8;">
            <li>Ensure a stable internet connection and a quiet environment</li>
            <li>Test your microphone and camera before the session</li>
            <li>Use Google Chrome for the best experience</li>
            <li>Keep your resume and technical notes handy</li>
          </ul>
        </td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 24px 0 0 0;">
      Log in to <a href="${PLATFORM_URL}" style="color: #818cf8; text-decoration: none; font-weight: 600;">${PLATFORM_URL}</a> at the scheduled time to begin your interview.
    </p>
    <p style="font-size: 13px; color: #64748b; margin: 16px 0 0 0;">
      Best regards,<br />
      <strong style="color: #94a3b8;">Skillnox AI Placement Cell</strong>
    </p>`;

  return {
    subject: `[Skillnox AI] Interview Scheduled - ${data.interviewType.toUpperCase()} | ${dateStr}`,
    html: baseLayout('Interview Scheduled - Skillnox AI', body),
  };
}

// ─── Maintenance & Credential Update Notification ───
export interface MaintenanceEmailData {
  studentName: string;
  rollNumber: string;
  scheduledDate: string;
  scheduledTime: string;
}

export function buildMaintenanceUpdateEmail(data: MaintenanceEmailData): { subject: string; html: string } {
  const capsRoll = data.rollNumber.toUpperCase();

  const body = `
    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
      <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #fca5a5; text-transform: uppercase; letter-spacing: 0.5px;">
        ⚠️ System Update Notice
      </p>
      <p style="margin: 0; font-size: 13px; color: #fecaca; line-height: 1.5;">
        Due to recent server maintenance and platform upgrades, your account login credentials and interview questions have been updated for an improved experience. We apologize for any inconvenience caused and truly appreciate your patience.
      </p>
    </div>

    <p style="font-size: 16px; color: #f1f5f9; margin: 0 0 8px 0;">Dear <strong>${data.studentName}</strong>,</p>
    <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0;">
      Please find your updated portal login credentials and scheduled interview slot details below:
    </p>

    <!-- Credentials Box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1e1b4b, #312e81); border: 1px solid #4338ca; border-radius: 14px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px 24px;">
          <p style="margin: 0 0 14px 0; font-size: 12px; font-weight: 800; color: #a5b4fc; text-transform: uppercase; letter-spacing: 1px;">
            🔑 Your Updated Account Credentials
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #c7d2fe; width: 140px;">Portal Web URL</td>
              <td style="padding: 6px 0; font-size: 14px; color: #ffffff; font-weight: 700;">
                <a href="${PLATFORM_URL}" style="color: #818cf8; text-decoration: none;">${PLATFORM_URL}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #c7d2fe;">Username (Roll No)</td>
              <td style="padding: 6px 0; font-size: 15px; color: #38bdf8; font-weight: 800; font-family: monospace;">${capsRoll}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #c7d2fe;">Password</td>
              <td style="padding: 6px 0; font-size: 15px; color: #38bdf8; font-weight: 800; font-family: monospace;">${capsRoll}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Slot Details Box -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #1e293b; border: 1px solid #334155; border-radius: 14px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px 24px;">
          <p style="margin: 0 0 14px 0; font-size: 12px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">
            📅 Interview Slot Details
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8; width: 140px;">Candidate Name</td>
              <td style="padding: 6px 0; font-size: 14px; color: #f1f5f9; font-weight: 600;">${data.studentName} (${capsRoll})</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Scheduled Date</td>
              <td style="padding: 6px 0; font-size: 15px; color: #818cf8; font-weight: 800;">${data.scheduledDate}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Scheduled Time</td>
              <td style="padding: 6px 0; font-size: 15px; color: #818cf8; font-weight: 800;">${data.scheduledTime}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Interview Format</td>
              <td style="padding: 6px 0; font-size: 14px; color: #f1f5f9; font-weight: 600;">Communication, Basic Technical & Behavioral</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Total Questions</td>
              <td style="padding: 6px 0; font-size: 14px; color: #f1f5f9; font-weight: 600;">15 Questions (General)</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Guidelines -->
    <div style="background: #0f172a; border-radius: 12px; padding: 16px 20px; border: 1px solid #1e293b;">
      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #38bdf8;">📌 Instructions for Candidates:</p>
      <ul style="margin: 0; padding: 0 0 0 16px; font-size: 13px; color: #94a3b8; line-height: 1.8;">
        <li>Log in to <a href="${PLATFORM_URL}" style="color: #818cf8; text-decoration: none; font-weight: 600;">${PLATFORM_URL}</a> using your UPPERCASE Roll Number for both Username & Password.</li>
        <li>Join the session 5 minutes prior to your scheduled time slot.</li>
        <li>Ensure you test your microphone and camera before starting the interview.</li>
        <li>Use Google Chrome browser for optimal voice recognition performance.</li>
      </ul>
    </div>

    <p style="font-size: 13px; color: #64748b; margin: 24px 0 0 0;">
      Warm regards,<br />
      <strong style="color: #94a3b8;">Skillnox AI Training & Placement Cell</strong>
    </p>`;

  return {
    subject: `[Skillnox AI] Credentials & Interview Slot Update - ${capsRoll}`,
    html: baseLayout('Credentials & Slot Update - Skillnox AI', body),
  };
}

// ─── Interview Completed & Results Report ───
export interface ResultsEmailData {
  studentName: string;
  rollNumber: string;
  interviewType: string;
  difficulty: string;
  company?: string;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  emotionScore: number;
  voiceScore: number;
  feedback: string;
  improvements: string[];
  interviewId: string;
  completedAt: string;
  duration?: number;
}

export function buildResultsEmail(data: ResultsEmailData): { subject: string; html: string } {
  const grade = data.overallScore >= 85 ? 'Outstanding' : data.overallScore >= 70 ? 'Good' : data.overallScore >= 55 ? 'Average' : 'Needs Improvement';
  const gradeColor = data.overallScore >= 85 ? '#10b981' : data.overallScore >= 70 ? '#6366f1' : data.overallScore >= 55 ? '#f59e0b' : '#ef4444';
  const durationStr = data.duration ? `${Math.floor(data.duration / 60)}m ${data.duration % 60}s` : 'N/A';

  const body = `
    <p style="font-size: 16px; color: #f1f5f9; margin: 0 0 6px 0;">Dear <strong>${data.studentName}</strong>,</p>
    <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0;">
      Your interview session has been evaluated by our AI assessment engine. Below is your comprehensive performance report with detailed scores and personalized feedback.
    </p>

    <!-- Performance Summary -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px 24px; background: linear-gradient(135deg, #312e81, #1e1b4b); border-radius: 12px; border: 1px solid #3730a3; text-align: center;">
          <span style="display: block; font-size: 12px; color: #a5b4fc; text-transform: uppercase; letter-spacing: 1px;">Overall Performance</span>
          <span style="display: block; font-size: 48px; font-weight: 900; color: ${gradeColor}; margin: 8px 0 4px 0;">${Math.round(data.overallScore)}%</span>
          <span style="display: inline-block; padding: 4px 16px; font-size: 12px; font-weight: 700; color: ${gradeColor}; background: ${gradeColor}20; border-radius: 20px; letter-spacing: 0.5px;">${grade}</span>
        </td>
      </tr>
    </table>

    <!-- Dimension Scores Grid -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin-bottom: 24px;">
      <tr>
        ${scoreBox('Technical', data.technicalScore, '#10b981')}
        ${scoreBox('Communication', data.communicationScore, '#f59e0b')}
        ${scoreBox('Confidence', data.emotionScore, '#06b6d4')}
        ${scoreBox('Voice & Clarity', data.voiceScore, '#ec4899')}
      </tr>
    </table>

    <!-- Session Details -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #1e293b; border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 4px 0; font-size: 12px; color: #94a3b8;">Candidate</td>
              <td style="padding: 4px 0; font-size: 13px; color: #f1f5f9; font-weight: 600; text-align: right;">${data.studentName} (${data.rollNumber})</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 12px; color: #94a3b8;">Interview Type</td>
              <td style="padding: 4px 0; font-size: 13px; color: #f1f5f9; font-weight: 600; text-align: right;">${data.interviewType.toUpperCase()}${data.company ? ' | ' + data.company : ''}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 12px; color: #94a3b8;">Difficulty</td>
              <td style="padding: 4px 0; font-size: 13px; color: #f1f5f9; font-weight: 600; text-align: right;">${data.difficulty.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 12px; color: #94a3b8;">Duration</td>
              <td style="padding: 4px 0; font-size: 13px; color: #f1f5f9; font-weight: 600; text-align: right;">${durationStr}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 12px; color: #94a3b8;">Completed</td>
              <td style="padding: 4px 0; font-size: 13px; color: #f1f5f9; font-weight: 600; text-align: right;">${data.completedAt}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- AI Feedback -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #1e293b; border-radius: 12px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px 24px;">
          <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 0.5px;">AI Feedback Summary</p>
          <p style="margin: 0; font-size: 14px; color: #cbd5e1; line-height: 1.7;">${data.feedback || 'Great effort! Continue practicing to improve your scores across all dimensions.'}</p>
        </td>
      </tr>
    </table>

    ${data.improvements.length > 0 ? `
    <!-- Improvement Areas -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #422006, #1c1917); border-radius: 12px; border: 1px solid #92400e40; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px 24px;">
          <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #fbbf24;">Areas for Improvement</p>
          <ul style="margin: 0; padding: 0 0 0 16px; font-size: 13px; color: #fde68a; line-height: 1.8;">
            ${data.improvements.map(i => '<li>' + i + '</li>').join('\n            ')}
          </ul>
        </td>
      </tr>
    </table>` : ''}

    <!-- CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td align="center" style="padding: 16px 0;">
          <a href="${PLATFORM_URL}/interview/${data.interviewId}/results" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
            View Full Detailed Report
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #64748b; margin: 0;">
      Best regards,<br />
      <strong style="color: #94a3b8;">Skillnox AI Assessment Engine</strong>
    </p>`;

  return {
    subject: `[Skillnox AI] Interview Results - ${grade} (${Math.round(data.overallScore)}%) | ${data.studentName}`,
    html: baseLayout('Interview Results - Skillnox AI', body),
  };
}

// ─── Account Created Welcome & Login Credentials Email ───
export interface AccountCreatedEmailData {
  studentName: string;
  rollNumber: string;
  email: string;
  department: string;
  password: string;
}

export function buildAccountCreatedEmail(data: AccountCreatedEmailData): { subject: string; html: string } {
  const body = `
    <p style="font-size: 16px; color: #f1f5f9; margin: 0 0 6px 0;">Dear <strong>${data.studentName}</strong>,</p>
    <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0;">
      Welcome to <strong>Skillnox AI</strong> — the AI-powered placement simulation and skill assessment platform. Your candidate account has been successfully created by the placement cell.
    </p>

    <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px 0; font-size: 14px; color: #818cf8; text-transform: uppercase; letter-spacing: 1px;">Your Login Credentials</h3>
      
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 8px 0; font-size: 13px; color: #94a3b8; width: 140px;">Candidate Name</td>
          <td style="padding: 8px 0; font-size: 14px; color: #f8fafc; font-weight: 600;">${data.studentName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 13px; color: #94a3b8;">Roll Number</td>
          <td style="padding: 8px 0; font-size: 14px; color: #818cf8; font-weight: 700;">${data.rollNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 13px; color: #94a3b8;">Department / Branch</td>
          <td style="padding: 8px 0; font-size: 14px; color: #f8fafc; font-weight: 600;">${data.department}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 13px; color: #94a3b8;">Registered Email</td>
          <td style="padding: 8px 0; font-size: 14px; color: #f8fafc; font-weight: 600;">${data.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 13px; color: #94a3b8;">Login Password</td>
          <td style="padding: 8px 0; font-size: 14px; color: #10b981; font-weight: 700; font-family: monospace;">${data.password}</td>
        </tr>
      </table>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px 20px; background: rgba(99, 102, 241, 0.1); border-radius: 12px; border: 1px solid rgba(99, 102, 241, 0.2);">
          <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #a5b4fc;">Next Steps to Access Your Placement Slot</p>
          <ol style="margin: 0; padding: 0 0 0 18px; font-size: 13px; color: #c7d2fe; line-height: 1.8;">
            <li>Visit the portal at <a href="${PLATFORM_URL}" style="color: #818cf8; font-weight: 600;">${PLATFORM_URL}</a></li>
            <li>Log in using your <strong>Roll Number</strong> or <strong>Email</strong> and the password listed above</li>
            <li>Complete your profile setup and upload your resume</li>
            <li>Join your assigned placement slot waiting room prior to your interview time</li>
          </ol>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td align="center" style="padding: 12px 0;">
          <a href="${PLATFORM_URL}/login" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
            Log In to Skillnox AI Portal
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #64748b; margin: 0;">
      Best regards,<br />
      <strong style="color: #94a3b8;">Skillnox AI Placement Administration | Kitaghire</strong>
    </p>`;

  return {
    subject: `[Skillnox AI] Your Account Created - Login Credentials for ${data.studentName} (${data.rollNumber})`,
    html: baseLayout('Account Created - Skillnox AI', body),
  };
}

// ─── Complete Account Created & Scheduled Interview Confirmation Email ───
export interface AccountAndScheduleEmailData {
  studentName: string;
  rollNumber: string;
  email: string;
  department: string;
  password: string;
  slotDateDisplay: string;
  slotTimeDisplay: string;
  portalUrl: string;
}

export function buildAccountAndInterviewScheduleEmail(data: AccountAndScheduleEmailData): { subject: string; html: string } {
  const body = `
    <p style="font-size: 16px; color: #f1f5f9; margin: 0 0 6px 0;">Dear <strong>${data.studentName}</strong>,</p>
    <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0;">
      Welcome to <strong>Skillnox AI</strong> — an AI-driven Placement Assessment Subsystem powered by <strong>Kitaghire</strong>. Your student candidate portal account has been provisioned, and your upcoming placement mock interview session has been officially scheduled.
    </p>

    <!-- Account Credentials Card -->
    <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border: 1px solid #334155; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 16px 0; font-size: 13px; color: #818cf8; text-transform: uppercase; letter-spacing: 1px;">🔐 Candidate Login Credentials</h3>
      
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #94a3b8; width: 140px;">Candidate Name</td>
          <td style="padding: 6px 0; font-size: 14px; color: #f8fafc; font-weight: 600;">${data.studentName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Roll Number (User ID)</td>
          <td style="padding: 6px 0; font-size: 14px; color: #818cf8; font-weight: 700;">${data.rollNumber}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Department / Branch</td>
          <td style="padding: 6px 0; font-size: 14px; color: #f8fafc; font-weight: 600;">${data.department}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Registered Email</td>
          <td style="padding: 6px 0; font-size: 14px; color: #f8fafc; font-weight: 600;">${data.email}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Default Password</td>
          <td style="padding: 6px 0; font-size: 14px; color: #10b981; font-weight: 700; font-family: monospace;">${data.password}</td>
        </tr>
      </table>
    </div>

    <!-- Interview Schedule Card -->
    <div style="background: linear-gradient(135deg, #1e1b4b, #0f172a); border: 1px solid #4338ca; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 16px 0; font-size: 13px; color: #a5b4fc; text-transform: uppercase; letter-spacing: 1px;">📅 Confirmed Interview Schedule</h3>
      
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #94a3b8; width: 140px;">Scheduled Date</td>
          <td style="padding: 6px 0; font-size: 14px; color: #fbbf24; font-weight: 700;">${data.slotDateDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">20-Min Slot Window</td>
          <td style="padding: 6px 0; font-size: 14px; color: #34d399; font-weight: 700;">${data.slotTimeDisplay}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Assessment Topics</td>
          <td style="padding: 6px 0; font-size: 13px; color: #e2e8f0;">Foundational CS (OOPs, OS, Process vs Thread, C Data Types, SQL &amp; Arrays), Behavioral &amp; Communication Skills</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #94a3b8;">Session Format</td>
          <td style="padding: 6px 0; font-size: 13px; color: #e2e8f0;">15 Questions / 20-Min Cap (AI Simulated Audio &amp; Video Interview)</td>
        </tr>
      </table>
    </div>

    <!-- Instructions -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px; background: rgba(99, 102, 241, 0.08); border-radius: 12px; border: 1px solid rgba(99, 102, 241, 0.2);">
          <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #a5b4fc;">📌 Instructions for Joining Your Session:</p>
          <ol style="margin: 0; padding: 0 0 0 18px; font-size: 13px; color: #cbd5e1; line-height: 1.8;">
            <li>Access the portal domain: <a href="${data.portalUrl}" style="color: #818cf8; font-weight: 700;">${data.portalUrl}</a></li>
            <li>Log in using your <strong>Roll Number (${data.rollNumber})</strong> or <strong>Email</strong> and password (<code>${data.password}</code>).</li>
            <li>Join the online <strong>Waiting Room</strong> 5 minutes prior to your assigned slot time (<strong>${data.slotTimeDisplay}</strong>).</li>
            <li>Ensure your camera and microphone permissions are enabled on your web browser.</li>
            <li>Upon finishing your session, your detailed evaluation report copy will be automatically emailed to you.</li>
          </ol>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
      <tr>
        <td align="center" style="padding: 12px 0;">
          <a href="${data.portalUrl}/login" style="display: inline-block; padding: 15px 38px; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 10px; letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
            Access Skillnox AI Portal &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.5;">
      Best regards,<br />
      <strong style="color: #94a3b8;">Skillnox AI Placement Cell &amp; Technical Administration</strong><br />
      <span style="font-size: 12px; color: #475569;">A Subsystem of Kitaghire | <a href="https://kitaghire.in" style="color: #6366f1; text-decoration: none;">kitaghire.in</a></span>
    </p>`;

  return {
    subject: `[Skillnox AI] Account Created & Interview Scheduled - ${data.studentName} (${data.rollNumber})`,
    html: baseLayout('Account Created & Interview Scheduled - Skillnox AI', body),
  };
}
