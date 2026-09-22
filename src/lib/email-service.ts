import { UserAccessRequest } from '../types';

export interface SendEmailOptions {
  to?: string;
  from?: string;
  subject: string;
  html: string;
}

export interface SendEmailResponse {
  success: boolean;
  message?: string;
  id?: string;
  error?: any;
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResponse> {
  const endpoints = ['/api/send-email', '/.netlify/functions/send-email'];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        // Returned HTML (e.g. 404/redirect), try next endpoint
        continue;
      }

      if (response.ok && data.success) {
        return {
          success: true,
          message: 'Email successfully sent via Resend',
          id: data.data?.id,
        };
      }

      if (data && data.error) {
        console.warn(`Resend email endpoint ${endpoint} returned error:`, data.error);
      }
    } catch (error: any) {
      console.warn(`Attempt on ${endpoint} failed:`, error?.message);
    }
  }

  return {
    success: false,
    message: 'Failed to dispatch email via serverless endpoints',
  };
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

          <div style="text-align: center;">
            <a href="${appUrl}" class="btn">
              ⚡ Super Admin पॅनलवर मंजुरी द्या
            </a>
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
    to: 'umardesh@gmail.com',
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
export async function sendTestEmail(toEmail: string = 'umardesh@gmail.com'): Promise<SendEmailResponse> {
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
