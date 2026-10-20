import { UserAccessRequest } from '../types';
import { logStructuredEvent } from './observability';

export interface SendEmailOptions {
  to?: string;
  from?: string;
  subject: string;
  html: string;
  dedupKey?: string;
  dedupTtlHours?: number;
}

export interface SendEmailResponse {
  success: boolean;
  message?: string;
  id?: string;
  error?: any;
  deduplicated?: boolean;
}

// Endpoint preference memory to avoid probing failed endpoints on subsequent dispatches
let preferredEndpoint: string | null = null;

// In-flight request deduplication & cooldown cache
const inFlightRequests = new Map<string, Promise<SendEmailResponse>>();
const recentDispatches = new Map<string, { response: SendEmailResponse; expiresAt: number }>();

const NOTIFICATION_DEDUP_KEY = 'pm_poshan_notification_dedup_v1';

/**
 * Checks if a specific lifecycle notification (e.g., expiry warning, referral eligibility)
 * was already sent within its TTL window so users are never spammed with duplicate emails.
 */
export function hasNotificationBeenSent(dedupKey: string, ttlHours: number = 24): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem(NOTIFICATION_DEDUP_KEY);
    if (!raw) return false;
    const ledger: Record<string, number> = JSON.parse(raw);
    const sentAt = ledger[dedupKey];
    if (!sentAt) return false;
    return Date.now() - sentAt < ttlHours * 3600 * 1000;
  } catch {
    return false;
  }
}

export function markNotificationSent(dedupKey: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(NOTIFICATION_DEDUP_KEY);
    const ledger: Record<string, number> = raw ? JSON.parse(raw) : {};
    ledger[dedupKey] = Date.now();
    // Prune entries older than 30 days to keep storage bounded
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    for (const [k, ts] of Object.entries(ledger)) {
      if (ts < cutoff) delete ledger[k];
    }
    localStorage.setItem(NOTIFICATION_DEDUP_KEY, JSON.stringify(ledger));
  } catch {
    // Ignore storage quota errors
  }
}

function generateRequestKey(options: SendEmailOptions): string {
  return options.dedupKey || `${options.to || ''}_${options.subject}_${options.html.length}`;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResponse> {
  const key = generateRequestKey(options);
  const now = Date.now();

  // 0. Check persistent deduplication ledger if dedupKey is provided
  if (options.dedupKey && hasNotificationBeenSent(options.dedupKey, options.dedupTtlHours ?? 24)) {
    return {
      success: true,
      deduplicated: true,
      message: 'Notification suppressed by deduplication ledger',
    };
  }

  // 1. Check if identical request was already sent within the last 10 seconds (cooldown)
  const cached = recentDispatches.get(key);
  if (cached && cached.expiresAt > now) {
    return { ...cached.response, deduplicated: true };
  }

  // 2. Check if identical request is already actively in-flight (deduplication)
  const activePromise = inFlightRequests.get(key);
  if (activePromise) {
    return activePromise;
  }

  // 3. In headless CLI/Node test environment without a window origin, simulate dispatch cleanly
  if (typeof window === 'undefined') {
    const simulatedResponse: SendEmailResponse = {
      success: true,
      id: `sim_${Date.now()}`,
      message: 'Simulated email dispatch in CLI test environment',
    };
    recentDispatches.set(key, {
      response: simulatedResponse,
      expiresAt: Date.now() + 10000,
    });
    if (options.dedupKey) {
      markNotificationSent(options.dedupKey);
    }
    return simulatedResponse;
  }

  const dispatchPromise = (async (): Promise<SendEmailResponse> => {
    const candidateEndpoints = preferredEndpoint
      ? [preferredEndpoint, ...['/api/send-email', '/.netlify/functions/send-email'].filter((e) => e !== preferredEndpoint)]
      : ['/api/send-email', '/.netlify/functions/send-email'];

    for (const endpoint of candidateEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(options),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const text = await response.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch {
          // Returned HTML (e.g. 404/redirect), try next endpoint
          continue;
        }

        if (response.ok && data.success) {
          preferredEndpoint = endpoint;
          const successResponse: SendEmailResponse = {
            success: true,
            message: 'Email successfully sent via Resend',
            id: data.data?.id,
          };

          // Cache in recent dispatches for 10s cooldown
          recentDispatches.set(key, {
            response: successResponse,
            expiresAt: Date.now() + 10000,
          });
          if (options.dedupKey) {
            markNotificationSent(options.dedupKey);
          }

          return successResponse;
        }

        if (data && data.error) {
          console.warn(`Resend email endpoint ${endpoint} returned error:`, data.error);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn(`Email dispatch to ${endpoint} timed out after 8s`);
        } else {
          console.warn(`Attempt on ${endpoint} failed:`, error?.message);
        }
      }
    }

    logStructuredEvent({
      category: 'EMAIL_FAILURE',
      severity: 'warn',
      message: `Failed to dispatch email: ${options.subject}`,
      context: { to: options.to, subject: options.subject },
    });

    return {
      success: false,
      message: 'Failed to dispatch email via serverless endpoints',
    };
  })();

  inFlightRequests.set(key, dispatchPromise);
  try {
    return await dispatchPromise;
  } finally {
    inFlightRequests.delete(key);
  }
}

/**
 * Sends a notification email to Super Admin when a school registers or requests renewal.
 */
export async function sendSchoolRegistrationAlert(
  request: UserAccessRequest
): Promise<SendEmailResponse> {
  const isRenewal = request.notes?.toLowerCase().includes('renewal') || request.status === 'expired';
  const title = isRenewal ? 'सदस्यत्व नूतनीकरण विनंती' : 'नवीन शाळा नोंदणी विनंती';
  const appUrl = typeof window !== 'undefined' ? `${window.location.origin}/#super-admin` : 'https://mahaposhan.in/#super-admin';

  const html = `
    <!DOCTYPE html>
    <html lang="mr">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: #92400e; color: #ffffff; padding: 24px; text-align: center; }
        .badge { display: inline-block; background: #fef3c7; color: #78350f; font-size: 11px; font-weight: bold; padding: 4px 10px; border-radius: 9999px; margin-bottom: 8px; }
        .content { padding: 24px; }
        .table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        .table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
        .table td.label { color: #64748b; font-weight: 500; width: 35%; }
        .table td.value { color: #0f172a; font-weight: 600; }
        .btn { display: inline-block; background: #d97706; color: #ffffff !important; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 10px; margin-top: 24px; text-align: center; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="badge">MahaPoshan Register Alert</div>
          <h2 style="margin: 0; font-size: 20px;">${title}</h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">शाळेकडून नवीन प्रवेश मागणी प्राप्त झाली आहे</p>
        </div>

        <div class="content">
          <p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
            नमस्कार Super Admin,<br>
            <strong>MahaPoshan Register</strong> प्रणालीवर खालील शाळेने प्रवेशासाठी विनंती नोंदवली आहे:
          </p>

          <table class="table">
            <tr>
              <td class="label">शाळेचे नाव:</td>
              <td class="value">${request.schoolName}</td>
            </tr>
            <tr>
              <td class="label">UDISE क्रमांक:</td>
              <td class="value" style="font-family: monospace; font-size: 14px;">${request.udiseNumber}</td>
            </tr>
            <tr>
              <td class="label">केंद्र / Cluster:</td>
              <td class="value">${request.centerCluster || '-'}</td>
            </tr>
            <tr>
              <td class="label">जिल्हा:</td>
              <td class="value">${request.district || '-'}</td>
            </tr>
            <tr>
              <td class="label">मुख्याध्यापक / शिक्षक:</td>
              <td class="value">${request.userName || '-'}</td>
            </tr>
            <tr>
              <td class="label">ईमेल:</td>
              <td class="value"><a href="mailto:${request.userEmail}" style="color: #d97706;">${request.userEmail}</a></td>
            </tr>
            <tr>
              <td class="label">संपर्क फोन:</td>
              <td class="value">${request.phone || 'N/A'}</td>
            </tr>
            ${request.notes ? `
            <tr>
              <td class="label">टीप:</td>
              <td class="value">${request.notes}</td>
            </tr>` : ''}
            <tr>
              <td class="label">नोंदणी वेळ:</td>
              <td class="value">${new Date(request.requestedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${appUrl}" class="btn" style="display: inline-block; background: #d97706; color: #ffffff !important; text-decoration: none; padding: 12px 28px; font-weight: bold; border-radius: 10px; font-size: 14px;">
              ⚡ Super Admin पॅनलवर मंजुरी द्या
            </a>
            <p style="margin-top: 14px; font-size: 12px; color: #64748b; word-break: break-all;">
              किंवा थेट लिंकवर जा: <a href="${appUrl}" style="color: #d97706; font-weight: 600;">${appUrl}</a>
            </p>
            <p style="margin-top: 4px; font-size: 11px; color: #94a3b8;">
              (ॲडमिन ईमेल: poshanregister@gmail.com • पासकोड: Admin@1234)
            </p>
          </div>
        </div>

        <div class="footer">
          © 2026 MahaPoshan Register • स्वयंचलित सूचना प्रणाली द्वारे Resend
        </div>
      </div>
    </body>
    </html>
  `.trim();

  return sendEmail({
    to: 'poshanregister@gmail.com',
    subject: `[MahaPoshan] ${title}: ${request.schoolName} (${request.udiseNumber})`,
    html,
  });
}

/**
 * Sends a confirmation email to the school teacher when access is approved.
 */
export async function sendApprovalConfirmationEmail(params: {
  schoolName: string;
  userEmail: string;
  expiresAt: string;
  durationMonths: number;
}): Promise<SendEmailResponse> {
  const expiryFormatted = new Date(params.expiresAt).toLocaleDateString('mr-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html lang="mr">
    <head>
      <meta charset="utf-8">
      <title>खाते सक्रिय झाले!</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
        .header { background: #047857; color: #ffffff; padding: 24px; text-align: center; }
        .content { padding: 24px; font-size: 14px; line-height: 1.6; }
        .highlight { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin: 16px 0; }
        .btn { display: inline-block; background: #047857; color: #ffffff !important; text-decoration: none; padding: 12px 24px; font-weight: bold; border-radius: 10px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">अभिनंदन! आपले खाते सक्रिय झाले आहे</h2>
        </div>
        <div class="content">
          <p>सस्नेह नमस्कार,</p>
          <p>
            आपल्या <strong>${params.schoolName}</strong> शाळेसाठी <strong>MahaPoshan Register</strong> चे 
            सदस्यत्व यशस्वीरीत्या मंजूर करण्यात आले आहे.
          </p>

          <div class="highlight">
            <strong>मंजूर कालावधी:</strong> ${params.durationMonths} महिने<br>
            <strong>वैधता मुदत (Expiry):</strong> ${expiryFormatted}
          </div>

          <p>आपण आता दैनिक खर्च नोंद, मासिक साठा व शासकीय अहवाल (.xlsx व PDF) तयार करू शकता.</p>

          <div style="text-align: center;">
            <a href="https://mahaposhan.in" class="btn">पोर्टल सुरू करा</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `.trim();

  // Note: On Resend free tier without a custom domain, emails can only be sent to the verified account owner (umardesh@gmail.com).
  // When a custom domain is verified in Resend, params.userEmail can receive it directly.
  return sendEmail({
    to: params.userEmail,
    subject: `[MahaPoshan] आपले खाते सक्रिय झाले आहे: ${params.schoolName}`,
    html,
  });
}

/**
 * Dispatches a test email to verify the Resend connection.
 */
export async function sendTestEmail(toEmail: string = 'poshanregister@gmail.com'): Promise<SendEmailResponse> {
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
      <h2 style="color: #92400e;">⚡ MahaPoshan Register • Resend Email चाचणी</h2>
      <p>अभिनंदन! आपले <strong>Resend API</strong> यशस्वीरीत्या कनेक्ट झाले आहे.</p>
      <ul>
        <li><strong>पाठवण्याची वेळ:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</li>
        <li><strong>प्राप्तकर्ता:</strong> ${toEmail}</li>
        <li><strong>सर्व्हिस:</strong> Resend Email Platform</li>
      </ul>
      <p style="color: #16a34a; font-weight: bold;">✔ ईमेल अलर्ट्स प्रणाली पूर्णपणे कार्यरत आहे.</p>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject: '⚡ MahaPoshan Register - Resend चाचणी संदेश (Test Email)',
    html,
  });
}

/**
 * Sends notification when Super Admin requests additional information.
 */
export async function sendMoreInfoRequiredEmail(params: {
  schoolName: string;
  userEmail: string;
  adminMessage: string;
}): Promise<SendEmailResponse> {
  const html = `
    <div style="font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="background: #f59e0b; color: white; padding: 18px; border-radius: 12px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px;">शाळा नोंदणी: अतिरिक्त माहिती आवश्यक</h2>
      </div>
      <div style="padding: 20px 0;">
        <p>सस्नेह नमस्कार,</p>
        <p>आपल्या <strong>${params.schoolName}</strong> शाळेच्या नोंदणी खातरजमेसाठी सुपर ॲडमिन कडून खालील माहिती विचारण्यात आली आहे:</p>
        <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 10px; color: #92400e; font-size: 14px; margin: 16px 0;">
          <strong>ॲडमिन संदेश:</strong><br>${params.adminMessage}
        </div>
        <p>कृपया MahaPoshan Register पोर्टलवर जाऊन माहिती दुरुस्त करून पुन्हा सादर करा.</p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://mahaposhan.in" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">पोर्टलवर माहिती दुरुस्त करा</a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.userEmail,
    subject: `[MahaPoshan] अतिरिक्त माहिती आवश्यक: ${params.schoolName}`,
    html,
  });
}

/**
 * Sends notification when registration or access request is rejected.
 */
export async function sendRejectionEmail(params: {
  schoolName: string;
  userEmail: string;
  reason: string;
}): Promise<SendEmailResponse> {
  const html = `
    <div style="font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="background: #e11d48; color: white; padding: 18px; border-radius: 12px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px;">नोंदणी विनंती नाकारण्यात आली</h2>
      </div>
      <div style="padding: 20px 0;">
        <p>सस्नेह नमस्कार,</p>
        <p>आपल्या <strong>${params.schoolName}</strong> शाळेसाठी सादर केलेली विनंती खालील कारणास्तव नाकारण्यात आली आहे:</p>
        <div style="background: #ffe4e6; border: 1px solid #fecdd3; padding: 16px; border-radius: 10px; color: #9f1239; font-size: 14px; margin: 16px 0;">
          <strong>नाकारण्याचे कारण:</strong><br>${params.reason}
        </div>
        <p>काही शंका असल्यास किंवा नवीन माहितीसह अर्ज करावयाचा असल्यास आपण पोर्टलवरून योग्य माहितीसह पुन्हा अर्ज करू शकता.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.userEmail,
    subject: `[MahaPoshan] नोंदणी विनंती नाकारली: ${params.schoolName}`,
    html,
  });
}

/**
 * Sends notification to School Admin when a teacher joins the school.
 */
export async function sendTeacherJoinedNotification(params: {
  schoolName: string;
  adminEmail: string;
  teacherName: string;
  teacherEmail: string;
}): Promise<SendEmailResponse> {
  const html = `
    <div style="font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="background: #0284c7; color: white; padding: 18px; border-radius: 12px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px;">नवीन शिक्षक शाळेत जोडले गेले</h2>
      </div>
      <div style="padding: 20px 0;">
        <p>सस्नेह नमस्कार मुख्याध्यापक महोदय,</p>
        <p>आपल्या <strong>${params.schoolName}</strong> शाळेमध्ये खालील शिक्षकाने प्रवेश घेतला आहे:</p>
        <ul>
          <li><strong>शिक्षकाचे नाव:</strong> ${params.teacherName}</li>
          <li><strong>ईमेल:</strong> ${params.teacherEmail}</li>
          <li><strong>भूमिका:</strong> TEACHER (दैनिक नोंदणी अधिकार)</li>
        </ul>
        <p>हे शिक्षक आता आपल्या शाळेच्या पोषण आहाराच्या दैनिक नोंदी करू शकतील.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.adminEmail,
    subject: `[MahaPoshan] नवीन शिक्षक जोडले: ${params.teacherName} (${params.schoolName})`,
    html,
  });
}

/**
 * Sends notification when subscription is expiring soon.
 */
export async function sendSubscriptionExpiryAlert(params: {
  schoolName: string;
  userEmail: string;
  expiresAt: string;
  daysLeft: number;
}): Promise<SendEmailResponse> {
  const formattedDate = new Date(params.expiresAt).toLocaleDateString('mr-IN');
  const html = `
    <div style="font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="background: #ea580c; color: white; padding: 18px; border-radius: 12px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px;">सदस्यत्व मुदत संपत आली आहे (${params.daysLeft} दिवस शिल्लक)</h2>
      </div>
      <div style="padding: 20px 0;">
        <p>सस्नेह नमस्कार,</p>
        <p>आपल्या <strong>${params.schoolName}</strong> शाळेच्या MahaPoshan Register सदस्यत्वाची मुदत <strong>${formattedDate}</strong> रोजी समाप्त होत आहे.</p>
        <p>अखंड सेवेसाठी व नोंदी चालू ठेवण्यासाठी कृपया मुदत संपण्यापूर्वी नूतनीकरण करा.</p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://mahaposhan.in" style="display: inline-block; background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">नूतनीकरण विनंती पाठवा</a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.userEmail,
    subject: `[MahaPoshan] सदस्यत्व समाप्त होत आहे (${params.daysLeft} दिवस): ${params.schoolName}`,
    html,
    dedupKey: `sub_expiry_${params.userEmail}_${params.daysLeft <= 3 ? '3d' : '15d'}`,
    dedupTtlHours: 72,
  });
}

/**
 * Sends confirmation email to applicant that their school registration was received.
 */
export async function sendSchoolRegistrationConfirmation(params: {
  schoolName: string;
  userEmail: string;
  udiseNumber: string;
}): Promise<SendEmailResponse> {
  const html = `
    <div style="font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="background: #92400e; color: white; padding: 18px; border-radius: 12px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px;">शाळा नोंदणी विनंती प्राप्त झाली</h2>
      </div>
      <div style="padding: 20px 0;">
        <p>सस्नेह नमस्कार,</p>
        <p>आपल्या <strong>${params.schoolName}</strong> (UDISE: ${params.udiseNumber}) शाळेची नोंदणी विनंती MahaPoshan प्रणालीमध्ये यशस्वीरीत्या नोंदवली गेली आहे.</p>
        <p>सुपर ॲडमिन द्वारे माहितीची खातरजमा होताच आपले खाते त्वरित सक्रिय केले जाईल आणि आपल्याला ईमेलद्वारे कळवले जाईल.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.userEmail,
    subject: `[MahaPoshan] नोंदणी विनंती प्राप्त झाली: ${params.schoolName}`,
    html,
    dedupKey: `reg_confirm_${params.udiseNumber}_${params.userEmail}`,
    dedupTtlHours: 24,
  });
}

/**
 * Sends an invitation email to a teacher to join a verified school.
 */
export async function sendTeacherInvitationEmail(params: {
  schoolName: string;
  udiseNumber: string;
  teacherEmail: string;
  invitedByName: string;
  expiresAt?: string;
}): Promise<SendEmailResponse> {
  const expiryText = params.expiresAt
    ? new Date(params.expiresAt).toLocaleDateString('mr-IN')
    : '७ दिवसांत';
  const html = `
    <div style="font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="background: #0284c7; color: white; padding: 18px; border-radius: 12px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px;">शाळेमध्ये शिक्षक म्हणून सहभागी होण्याचे निमंत्रण</h2>
      </div>
      <div style="padding: 20px 0;">
        <p>सस्नेह नमस्कार,</p>
        <p><strong>${params.invitedByName}</strong> यांनी आपल्याला <strong>${params.schoolName}</strong> (UDISE: ${params.udiseNumber}) च्या MahaPoshan Register मध्ये शिक्षक (TEACHER) म्हणून सामील होण्यासाठी निमंत्रित केले आहे.</p>
        <p>कृपया ${expiryText} पूर्वी लॉगिन करून UDISE क्रमांक <strong>${params.udiseNumber}</strong> द्वारे शाळेत प्रवेश घ्या.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.teacherEmail,
    subject: `[MahaPoshan] शिक्षक निमंत्रण: ${params.schoolName} (${params.udiseNumber})`,
    html,
    dedupKey: `invite_${params.udiseNumber}_${params.teacherEmail}`,
    dedupTtlHours: 24,
  });
}

/**
 * Sends notification when a teacher invitation has expired.
 */
export async function sendInvitationExpiryEmail(params: {
  schoolName: string;
  udiseNumber: string;
  teacherEmail: string;
}): Promise<SendEmailResponse> {
  const html = `
    <div style="font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="background: #64748b; color: white; padding: 18px; border-radius: 12px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px;">निमंत्रणाची मुदत संपली (Invitation Expired)</h2>
      </div>
      <div style="padding: 20px 0;">
        <p>सस्नेह नमस्कार,</p>
        <p><strong>${params.schoolName}</strong> (UDISE: ${params.udiseNumber}) साठी पाठवलेल्या शिक्षक निमंत्रणाची मुदत संपली आहे. आवश्यक असल्यास मुख्याध्यापकांकडून नवीन निमंत्रण मागवा किंवा थेट UDISE द्वारे विनंती पाठवा.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.teacherEmail,
    subject: `[MahaPoshan] निमंत्रण मुदत संपली: ${params.schoolName}`,
    html,
    dedupKey: `invite_expired_${params.udiseNumber}_${params.teacherEmail}`,
    dedupTtlHours: 72,
  });
}

/**
 * Sends notification when a school subscription is renewed.
 */
export async function sendRenewalConfirmationEmail(params: {
  schoolName: string;
  userEmail: string;
  additionalMonths: number;
  newExpiresAt: string;
}): Promise<SendEmailResponse> {
  const formattedDate = new Date(params.newExpiresAt).toLocaleDateString('mr-IN');
  const html = `
    <div style="font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="background: #059669; color: white; padding: 18px; border-radius: 12px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px;">सदस्यत्व नूतनीकरण यशस्वी (+${params.additionalMonths} महिने)</h2>
      </div>
      <div style="padding: 20px 0;">
        <p>सस्नेह नमस्कार,</p>
        <p>आपल्या <strong>${params.schoolName}</strong> शाळेचे MahaPoshan Register सदस्यत्व <strong>+${params.additionalMonths} महिन्यांनी</strong> वाढवण्यात आले आहे.</p>
        <p><strong>नवीन मुदत (New Expiry):</strong> ${formattedDate}</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.userEmail,
    subject: `[MahaPoshan] सदस्यत्व नूतनीकरण यशस्वी: ${params.schoolName}`,
    html,
    dedupKey: `renewal_${params.userEmail}_${params.newExpiresAt.slice(0, 10)}`,
    dedupTtlHours: 12,
  });
}

/**
 * Sends notification to a referrer teacher when their referred school is approved and reward becomes eligible.
 */
export async function sendReferralEligibilityEmail(params: {
  referrerEmail: string;
  referrerName: string;
  referredSchoolName: string;
  rewardAmount: number;
}): Promise<SendEmailResponse> {
  const html = `
    <div style="font-family: sans-serif; padding: 24px; color: #1e293b; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="background: #d97706; color: white; padding: 18px; border-radius: 12px; text-align: center;">
        <h2 style="margin: 0; font-size: 18px;">रेफरल बक्षीस पात्र (Referral Reward Eligible)!</h2>
      </div>
      <div style="padding: 20px 0;">
        <p>सस्नेह नमस्कार ${params.referrerName || 'शिक्षक मित्र'},</p>
        <p>आपण रेफर केलेली <strong>${params.referredSchoolName}</strong> शाळा सत्यापित व सक्रिय झाली आहे!</p>
        <p>आपण <strong>₹${params.rewardAmount}</strong> रेफरल बक्षिसासाठी पात्र झाला आहात. कृपया आपला UPI आयडी अद्ययावत ठेवा.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: params.referrerEmail,
    subject: `[MahaPoshan] अभिनंदन! रेफरल बक्षीस पात्र: ${params.referredSchoolName}`,
    html,
    dedupKey: `referral_eligible_${params.referrerEmail}_${params.referredSchoolName}`,
    dedupTtlHours: 168,
  });
}

/**
 * Sends end-of-month personalized notification reminding schools to export PDF/Excel
 * and alerting them about the 12-month data retention policy.
 */
export async function sendMonthlyBackupReminderEmail(params: {
  userEmail: string;
  userName?: string;
  schoolName: string;
  udiseNumber: string;
  monthName?: string;
  yearMonth?: string;
}): Promise<SendEmailResponse> {
  const currentMonth = params.monthName || new Date().toLocaleString('mr-IN', { month: 'long', year: 'numeric' });
  const appUrl = typeof window !== 'undefined' ? `${window.location.origin}/#report` : 'https://mahaposhan.in/#report';
  const ymKey = params.yearMonth || new Date().toISOString().slice(0, 7);

  const html = `
    <!DOCTYPE html>
    <html lang="mr">
    <head>
      <meta charset="utf-8">
      <title>शालेय पोषण आहार मासिक अहवाल व बॅकअप स्मरणपत्र</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #92400e 0%, #b45309 100%); color: #ffffff; padding: 24px; text-align: center; }
        .logo-title { font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
        .subtitle { font-size: 13px; color: #fef3c7; margin-top: 4px; }
        .content { padding: 28px 24px; }
        .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px; }
        .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 14px; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; }
        .card-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
        .card-row:last-child { border-bottom: none; }
        .label { color: #64748b; font-weight: 500; }
        .value { color: #0f172a; font-weight: 700; }
        .alert-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0; }
        .alert-title { font-size: 13px; font-weight: 700; color: #b45309; display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
        .alert-text { font-size: 12px; color: #78350f; margin: 0; line-height: 1.5; }
        .steps { background: #f1f5f9; padding: 16px; border-radius: 10px; margin: 16px 0; font-size: 13px; color: #334155; }
        .steps ol { margin: 0; padding-left: 20px; }
        .steps li { margin-bottom: 6px; }
        .btn-container { text-align: center; margin: 24px 0 16px; }
        .btn { display: inline-block; background: #92400e; color: #ffffff !important; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: bold; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .footer { background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <div class="badge">मासिक अहवाल व बॅकअप स्मरणपत्र</div>
          <h1 class="logo-title">MahaPoshan Register</h1>
          <p class="subtitle">शालेय पोषण आहार योजना (PM POSHAN) • महाराष्ट्र शासन</p>
        </div>

        <!-- Body Content -->
        <div class="content">
          <p class="greeting">
            सस्नेह नमस्कार, ${params.userName ? `<strong>${params.userName}</strong> (मुख्याध्यापक / पोषण आहार प्रभारी)` : 'मुख्याध्यापक / शिक्षक बंधू-भगिनींनो'},
          </p>

          <p style="font-size: 13px; color: #334155;">
            आपल्या शाळेचा <strong>${currentMonth}</strong> या महिन्याचा शालेय पोषण आहार (PM-POSHAN) दैनिक खर्च व साठा हिशोब पूर्ण झाला असेल. कृपया महिना अखेरीस खालील अधिकृत शासकीय अहवाल त्वरित डाउनलोड करून जतन करून घ्या:
          </p>

          <!-- School Meta Card -->
          <div class="card">
            <div class="card-row">
              <span class="label">शाळेचे नाव:</span>
              <span class="value">${params.schoolName}</span>
            </div>
            <div class="card-row">
              <span class="label">UDISE क्रमांक:</span>
              <span class="value">${params.udiseNumber}</span>
            </div>
            <div class="card-row">
              <span class="label">कालावधी:</span>
              <span class="value">${currentMonth}</span>
            </div>
          </div>

          <!-- 12-Month Data Retention Policy Alert -->
          <div class="alert-box">
            <div class="alert-title">
              ⚠️ महत्त्वाची सूचना: १२ महिन्यांचे डेटा सुरक्षितता धोरण (Data Retention Policy)
            </div>
            <p class="alert-text">
              महापोषण नोंदवही प्रणालीच्या नियमांनुसार आपल्या शाळेचा दैनिक व साठा डेटा क्लाउडवर <strong>१२ महिने (१ वर्ष)</strong> पर्यंत सुरक्षित ठेवला जातो. <strong>१२ महिन्यांनंतर जुना डेटा स्वयंचलितपणे हटवला (Auto-purged) जातो.</strong>
              <br><br>
              शासकीय लेखापरीक्षण (Audit), केंद्रप्रमुख व शिक्षण विस्तार अधिकारी तपासणीसाठी शाळेच्या प्रत्यक्ष दप्तरी अहवाल असणे अनिवार्य असल्याने <strong>कृपया दर महिन्याचा अहवाल (PDF व Excel) डाऊनलोड करून शाळेच्या कॉम्प्युटर किंवा गुगल ड्राइव्हवर सुरक्षित ठेवा.</strong>
            </p>
          </div>

          <!-- Simple 3-step action guide -->
          <div class="steps">
            <strong>अहवाल डाउनलोड करण्याच्या सोप्या पायऱ्या:</strong>
            <ol>
              <li>खालील बटनावर क्लिक करून <strong>शासकीय अहवाल</strong> विभागात जा.</li>
              <li><strong>${currentMonth}</strong> निवडा आणि <strong>"Excel डाउनलोड"</strong> व <strong>"प्रिंट / PDF सेव्ह करा"</strong> वर क्लिक करा.</li>
              <li>सेटिंग्जमधून <strong>"डेटा बॅकअप फाईल (.json)"</strong> सुद्धा डाउनलोड करून ठेवा.</li>
            </ol>
          </div>

          <!-- Direct CTA Button -->
          <div class="btn-container">
            <a href="${appUrl}" class="btn" target="_blank">
              मासिक अहवाल व बॅकअप डाउनलोड करा &rarr;
            </a>
          </div>

          <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 16px;">
            काही अडचण आल्यास आपण आम्हाला <a href="mailto:poshanregister@gmail.com" style="color: #92400e; font-weight: bold;">poshanregister@gmail.com</a> वर संपर्क साधू शकता.
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p style="margin: 0;">MahaPoshan Register • स्वतंत्र शालेय साहाय्यक प्रणाली • महाराष्ट्र शासन</p>
          <p style="margin: 4px 0 0;">हे स्वयंचलित महिनाअखेर डेटा सुरक्षा स्मरणपत्र आहे. सुरक्षिततेसाठी आपले अहवाल नियमित डाऊनलोड करा.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: params.userEmail,
    subject: `[महत्त्वाचे] मासिक पोषण आहार अहवाल डाऊनलोड करा (${currentMonth}) - ${params.schoolName}`,
    html,
    dedupKey: `monthly_backup_reminder_${params.userEmail}_${ymKey}`,
    dedupTtlHours: 360, // Only 1 reminder per month (15 days TTL window)
  });
}


