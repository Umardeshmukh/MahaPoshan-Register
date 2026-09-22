import { Resend } from 'resend';

export async function handler(event: any) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { to, subject, html, from } = body;

    const apiKey = process.env.RESEND_API_KEY || 're_TxV9nR8Q_GYfaRUa6a4SPWjFo8B9Y44gC';
    const resend = new Resend(apiKey);

    const fromAddress = from || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const toAddress = to || process.env.SUPER_ADMIN_EMAIL || 'umardesh@gmail.com';

    const result = await resend.emails.send({
      from: fromAddress,
      to: toAddress,
      subject: subject || 'MahaPoshan Register Notification',
      html: html || '<p>MahaPoshan Register Alert</p>',
    });

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
