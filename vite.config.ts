import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('recharts')) return 'charts';
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('react-router-dom')) return 'router';
          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('scheduler')
          ) {
            return 'react-vendor';
          }
        },
      },
    },
  },
  plugins: [
    react(),
    {
      name: 'local-vercel-og',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/og')) {
            try {
              const { generateOGImage } = await server.ssrLoadModule('/vite-og-plugin.ts');
              const pngBuffer = await generateOGImage(req.url);
              res.setHeader('Content-Type', 'image/png');
              res.end(pngBuffer);
            } catch (err) {
              console.error('OG Image Generation Error:', err);
              res.statusCode = 500;
              res.end((err as Error).message);
            }
          } else {
            next();
          }
        });
      }
    },
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'QuestDo - Gamified Tasks',
        short_name: 'QuestDo',
        description: 'Gamified to-do app with XP, streaks, and achievements',
        theme_color: '#5c7cfa',
        background_color: '#020617',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
});
