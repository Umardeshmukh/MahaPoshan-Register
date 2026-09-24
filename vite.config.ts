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
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return {
    name: 'resend-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/send-email', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Accept');
          res.setHeader('Access-Control-Max-Age', '86400');
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
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

            const toAddress = (body.to && typeof body.to === 'string' ? body.to.trim() : defaultTo);
            const fromAddress = (body.from && typeof body.from === 'string' ? body.from.trim() : defaultFrom);

            res.setHeader('Content-Type', 'application/json');

            if (!EMAIL_REGEX.test(toAddress)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Invalid recipient email format' }));
              return;
            }

            const resend = new Resend(apiKey);
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Resend dispatch timed out after 8s')), 8000)
            );

            const sendPromise = resend.emails.send({
              from: fromAddress,
              to: toAddress,
              subject: body.subject?.slice(0, 300) || 'MahaPoshan Register Notification',
              html: body.html?.slice(0, 250000) || '<p>MahaPoshan Register Alert</p>',
            });

            const result: any = await Promise.race([sendPromise, timeoutPromise]);

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
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('xlsx')) {
                return 'vendor-export';
              }
              if (id.includes('@clerk')) {
                return 'vendor-clerk';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('gsap') || id.includes('motion')) {
                return 'vendor-animation';
              }
              return 'vendor-core';
            }
          },
        },
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
