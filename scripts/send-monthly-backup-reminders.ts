/**
 * Monthly Automated Backup & 12-Month Retention Reminder Script
 * 
 * Execution:
 *   npx tsx scripts/send-monthly-backup-reminders.ts
 * 
 * Can be run via:
 *   - GitHub Actions Cron on the 28th-30th of each month
 *   - Super Admin manual trigger
 *   - Supabase Edge Function / cron
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://oagkvgocsqjpxrhmbvtl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZ2t2Z29jc3FqcHhyaG1idnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0NjQ1OTUsImV4cCI6MjA2MDA0MDU5NX0.n7K54P-r9g_7e2YdMvQc0l12F4j_M6G3S-D3z8q5J4o';
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_TxV9nR8Q_GYfaRUa6a4SPWjFo8B9Y44gC';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'MahaPoshan Register <onboarding@resend.dev>';

async function runMonthlyReminders() {
  console.log('🚀 Starting MahaPoshan Monthly Backup & 12-Month Retention Reminders Broadcast...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const resend = new Resend(RESEND_API_KEY);

  // Fetch all registered schools with valid email
  const { data: schools, error } = await supabase
    .from('schools')
    .select('id, udise_number, school_name, headmaster_name, incharge_teacher, user_email, user_name, access_status')
    .not('user_email', 'is', null);

  if (error) {
    console.error('❌ Failed to fetch schools from Supabase:', error.message);
    process.exit(1);
  }

  if (!schools || schools.length === 0) {
    console.log('ℹ️ No registered schools found with valid email address.');
    return;
  }

  console.log(`📋 Found ${schools.length} registered school records.`);

  const dateNow = new Date();
  const currentMonthMr = dateNow.toLocaleString('mr-IN', { month: 'long', year: 'numeric' });
  const yearMonth = dateNow.toISOString().slice(0, 7); // e.g. "2026-10"

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const school of schools) {
    const toEmail = school.user_email?.trim();
    if (!toEmail || !toEmail.includes('@')) {
      skipCount++;
      continue;
    }

    const schoolName = school.school_name || 'शाळा';
    const udise = school.udise_number || 'UDISE';
    const contactPerson = school.headmaster_name || school.incharge_teacher || school.user_name || 'मुख्याध्यापक / शिक्षक';

    console.log(`✉️ Sending reminder to: ${contactPerson} (${schoolName} - ${udise}) -> ${toEmail}`);

    const html = `
      <!DOCTYPE html>
      <html lang="mr">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: linear-gradient(135deg, #92400e 0%, #b45309 100%); color: #ffffff; padding: 24px; text-align: center; }
          .logo-title { font-size: 20px; font-weight: 800; margin: 0; }
          .subtitle { font-size: 13px; color: #fef3c7; margin-top: 4px; }
          .content { padding: 28px 24px; }
          .badge { display: inline-block; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px; }
          .greeting { font-size: 15px; font-weight: 600; color: #0f172a; margin-bottom: 14px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; }
          .card-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
          .label { color: #64748b; font-weight: 500; }
          .value { color: #0f172a; font-weight: 700; }
          .alert-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0; }
          .alert-title { font-size: 13px; font-weight: 700; color: #b45309; margin-bottom: 6px; }
          .alert-text { font-size: 12px; color: #78350f; margin: 0; line-height: 1.5; }
          .steps { background: #f1f5f9; padding: 16px; border-radius: 10px; margin: 16px 0; font-size: 13px; color: #334155; }
          .steps ol { margin: 0; padding-left: 20px; }
          .steps li { margin-bottom: 6px; }
          .btn-container { text-align: center; margin: 24px 0 16px; }
          .btn { display: inline-block; background: #92400e; color: #ffffff !important; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: bold; border-radius: 10px; }
          .footer { background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="badge">मासिक अहवाल व बॅकअप स्मरणपत्र</div>
            <h1 class="logo-title">MahaPoshan Register</h1>
            <p class="subtitle">शालेय पोषण आहार योजना (PM POSHAN) • महाराष्ट्र शासन</p>
          </div>
          <div class="content">
            <p class="greeting">
              सस्नेह नमस्कार, <strong>${contactPerson}</strong>,
            </p>
            <p style="font-size: 13px; color: #334155;">
              आपल्या शाळेचा <strong>${currentMonthMr}</strong> या महिन्याचा शालेय पोषण आहार (PM-POSHAN) दैनिक खर्च व साठा हिशोब पूर्ण झाला असेल. कृपया महिना अखेरीस खालील अधिकृत शासकीय अहवाल त्वरित डाउनलोड करून जतन करून घ्या:
            </p>
            <div class="card">
              <div class="card-row">
                <span class="label">शाळेचे नाव:</span>
                <span class="value">${schoolName}</span>
              </div>
              <div class="card-row">
                <span class="label">UDISE क्रमांक:</span>
                <span class="value">${udise}</span>
              </div>
              <div class="card-row">
                <span class="label">कालावधी:</span>
                <span class="value">${currentMonthMr}</span>
              </div>
            </div>
            <div class="alert-box">
              <div class="alert-title">
                ⚠️ महत्त्वाची सूचना: १२ महिन्यांचे डेटा सुरक्षितता धोरण (Data Retention Policy)
              </div>
              <p class="alert-text">
                महापोषण नोंदवही प्रणालीच्या नियमांनुसार आपल्या शाळेचा डेटा क्लाउडवर <strong>१२ महिने (१ वर्ष)</strong> सुरक्षित राहतो. <strong>१२ महिन्यांनंतर जुना डेटा स्वयंचलितपणे हटवला (Auto-purged) जातो.</strong>
                <br><br>
                शासकीय तपासणी व ऑडिटसाठी प्रत्यक्ष दप्तरी अहवाल असणे अनिवार्य असल्याने <strong>कृपया दर महिन्याचा अहवाल (PDF व Excel) डाऊनलोड करून स्वतंत्र सुरक्षित फोल्डरमध्ये ठेवा.</strong>
              </p>
            </div>
            <div class="steps">
              <strong>अहवाल डाउनलोड करण्याच्या सोप्या पायऱ्या:</strong>
              <ol>
                <li>खालील बटनावर क्लिक करून <strong>शासकीय अहवाल</strong> विभागात जा.</li>
                <li><strong>${currentMonthMr}</strong> निवडा आणि <strong>"Excel डाउनलोड"</strong> व <strong>"प्रिंट / PDF सेव्ह करा"</strong> वर क्लिक करा.</li>
                <li>सेटिंग्जमधून <strong>"डेटा बॅकअप फाईल (.json)"</strong> सुद्धा डाउनलोड करून ठेवा.</li>
              </ol>
            </div>
            <div class="btn-container">
              <a href="https://mahaposhan.in/#report" class="btn" target="_blank">
                मासिक अहवाल व बॅकअप डाउनलोड करा &rarr;
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 16px;">
              काही मदत हवी असल्यास: <a href="mailto:poshanregister@gmail.com" style="color: #92400e; font-weight: bold;">poshanregister@gmail.com</a>
            </p>
          </div>
          <div class="footer">
            <p style="margin: 0;">MahaPoshan Register • स्वतंत्र शालेय साहाय्यक प्रणाली • महाराष्ट्र शासन</p>
            <p style="margin: 4px 0 0;">हे स्वयंचलित महिनाअखेर डेटा सुरक्षा स्मरणपत्र आहे. सुरक्षिततेसाठी आपले अहवाल नियमित डाऊनलोड करा.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const res = await resend.emails.send({
        from: FROM_EMAIL,
        to: toEmail,
        subject: `[महत्त्वाचे] मासिक पोषण आहार अहवाल डाऊनलोड करा (${currentMonthMr}) - ${schoolName}`,
        html,
      });

      if (res.error) {
        console.warn(`⚠️ Resend returned error for ${toEmail}:`, res.error);
        failCount++;
      } else {
        console.log(`✅ Sent successfully to ${toEmail} (ID: ${res.data?.id})`);
        successCount++;
      }
    } catch (err: any) {
      console.error(`❌ Exception sending to ${toEmail}:`, err.message);
      failCount++;
    }

    // Gentle 200ms throttle to comply with email rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\n🎉 Reminder Broadcast Finished:`);
  console.log(`   ✅ Sent: ${successCount}`);
  console.log(`   ⏭️ Skipped (invalid email): ${skipCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
}

runMonthlyReminders().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
