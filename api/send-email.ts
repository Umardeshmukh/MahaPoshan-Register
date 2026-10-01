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

export default async function handler(req: any, res: any) {
  // CORS & Preflight Caching Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method Not Allowed' });
    return;
  }

  // Rate Limiting Check
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(clientIp)) {
    res.status(429).json({ success: false, error: 'Too many requests. Please try again shortly.' });
    return;
  }

  const { to, subject, html, from } = req.body || {};

  // Input Validation & Sanitization
  const apiKey = process.env.RESEND_API_KEY || 're_TxV9nR8Q_GYfaRUa6a4SPWjFo8B9Y44gC';
  const defaultTo = process.env.SUPER_ADMIN_EMAIL || 'poshanregister@gmail.com';
  const toAddress = (to && typeof to === 'string' ? to.trim() : defaultTo);
  const fromAddress = (from && typeof from === 'string' ? from.trim() : (process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'));

  if (!EMAIL_REGEX.test(toAddress)) {
    res.status(400).json({ success: false, error: 'Invalid recipient email format' });
    return;
  }

  const sanitizedSubject = typeof subject === 'string' ? subject.trim().slice(0, 300) : 'MahaPoshan Register Notification';
  const sanitizedHtml = typeof html === 'string' ? html.slice(0, 250000) : '<p>MahaPoshan Register Email</p>';

  try {
    const resend = new Resend(apiKey);

    // Enforce 8-second execution timeout to prevent hung serverless instances
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
      console.warn('Resend API returned error:', result.error);
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error: any) {
    console.error('Error in Resend handler:', error);
    res.status(500).json({ success: false, error: error?.message || 'Internal Server Error' });
  }
}

