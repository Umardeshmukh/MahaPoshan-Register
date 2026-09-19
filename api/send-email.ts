import { Resend } from 'resend';

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const { to, subject, html, from } = req.body || {};

  try {
    const apiKey = process.env.RESEND_API_KEY || 're_TxV9nR8Q_GYfaRUa6a4SPWjFo8B9Y44gC';
    const resend = new Resend(apiKey);

    const fromAddress = from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const toAddress = to || process.env.SUPER_ADMIN_EMAIL || 'umardesh@gmail.com';

    const result = await resend.emails.send({
      from: fromAddress,
      to: toAddress,
      subject: subject || 'MahaPoshan Register Notification',
      html: html || '<p>MahaPoshan Register Email</p>',
    });

    if (result.error) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.status(200).json({ success: true, data: result.data });
  } catch (error: any) {
    console.error('Error in Resend handler:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
}
