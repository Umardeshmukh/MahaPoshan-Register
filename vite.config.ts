import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

// Load .env.local variables into process.env for the Vite config process
try {
  const envPath = path.resolve(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && vals.length > 0) {
          process.env[key.trim()] = vals.join('=').trim();
        }
      }
    });
  }
} catch (e) {
  // Ignore env read errors
}

function resendDevPlugin(): Plugin {
  return {
    name: 'resend-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/send-email', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        let bodyStr = '';
        req.on('data', (chunk) => {
          bodyStr += chunk;
        });

        req.on('end', async () => {
          try {
            const body = JSON.parse(bodyStr || '{}');
            const { Resend } = await import('resend');
            const apiKey =
              process.env.RESEND_API_KEY ||
              're_TxV9nR8Q_GYfaRUa6a4SPWjFo8B9Y44gC';
            const defaultFrom =
              process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
            const defaultTo =
              process.env.SUPER_ADMIN_EMAIL || 'umardesh@gmail.com';

            const resend = new Resend(apiKey);
            const result = await resend.emails.send({
              from: body.from || defaultFrom,
              to: body.to || defaultTo,
              subject: body.subject || 'MahaPoshan Register Notification',
              html: body.html || '<p>MahaPoshan Register Alert</p>',
            });

            res.setHeader('Content-Type', 'application/json');
            if (result.error) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: result.error }));
              return;
            }

            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, data: result.data }));
          } catch (err: any) {
            console.error('Resend Dev API error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: false,
                error: err?.message || 'Internal Server Error',
              })
            );
          }
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), resendDevPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
