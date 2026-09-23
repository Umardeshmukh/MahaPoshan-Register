import { Resend } from 'resend';

// Simple in-memory rate limiter per IP (max 20 requests per minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
    return false;
  }
  if (record.count >= 20) {
    return true;
  }
  record.count += 1;
  return false;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handler(event: any) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With, Accept',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'OK' }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' }),
    };
  }

  // Rate Limiting Check
  const clientIp = event.headers?.['client-ip'] || event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ success: false, error: 'Too many requests. Please try again shortly.' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { to, subject, html, from } = body;

    const apiKey = process.env.RESEND_API_KEY || 're_TxV9nR8Q_GYfaRUa6a4SPWjFo8B9Y44gC';
    const defaultTo = process.env.SUPER_ADMIN_EMAIL || 'umardesh@gmail.com';
    const toAddress = (to && typeof to === 'string' ? to.trim() : defaultTo);
    const fromAddress = (from && typeof from === 'string' ? from.trim() : (process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'));

    if (!EMAIL_REGEX.test(toAddress)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid recipient email format' }),
      };
    }

    const sanitizedSubject = typeof subject === 'string' ? subject.trim().slice(0, 300) : 'MahaPoshan Register Notification';
    const sanitizedHtml = typeof html === 'string' ? html.slice(0, 250000) : '<p>MahaPoshan Register Alert</p>';

    const resend = new Resend(apiKey);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Resend dispatch timed out after 8s')), 8000)
    );

    const sendPromise = resend.emails.send({
      from: fromAddress,
      to: toAddress,
      subject: sanitizedSubject,
      html: sanitizedHtml,
    });

    const result: any = await Promise.race([sendPromise, timeoutPromise]);

    if (result.error) {
      console.warn('Resend send returned error:', result.error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: result.error }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: result.data }),
    };
  } catch (error: any) {
    console.error('Error in Netlify Resend handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: error?.message || 'Internal Server Error' }),
    };
  }
}

