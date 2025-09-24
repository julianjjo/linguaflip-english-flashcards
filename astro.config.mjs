import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 4321,
    host: process.env.HOST || 'localhost',
  },
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [
    react({
      include: ['**/react/*'],
    }),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  vite: {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Exclude server-only modules completely from client bundle
            if (
              id.includes('mongodb') ||
              id.includes('bcrypt') ||
              id.includes('jsonwebtoken') ||
              id.includes('/services/') ||
              id.includes('/utils/database') ||
              id.includes('/utils/migration') ||
              id.includes('/pages/api/')
            ) {
              return undefined; // Don't bundle server-only modules
            }

            // Vendor libraries
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('@nanostores') || id.includes('nanostores')) {
                return 'state-vendor';
              }
              if (id.includes('@google/genai')) {
                return 'ai-vendor';
              }
              return 'vendor';
            }

            // Application chunks - client-side only
            if (id.includes('/hooks/')) {
              return 'hooks';
            }
            if (id.includes('/components/')) {
              if (id.includes('Audio') || id.includes('ServiceWorker')) {
                return 'settings-components';
              }
              if (id.includes('Flashcard') || id.includes('OptimizedImage')) {
                return 'flashcard-components';
              }
              return 'ui-components';
            }
            if (
              id.includes('/utils/') &&
              !id.includes('database') &&
              !id.includes('migration')
            ) {
              return 'utils';
            }
          },
        },
      },
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', '@nanostores/react', 'nanostores'],
      exclude: [
        '@google/genai',
        'mongodb',
        'whatwg-url',
        'webidl-conversions',
        'bcrypt',
        'jsonwebtoken',
      ],
    },
    // Configure SSR externals to keep server-only modules out of client bundle
    ssr: {
      external: [
        'mongodb',
        'bcrypt',
        'jsonwebtoken',
        'crypto',
        'whatwg-url',
        'webidl-conversions',
      ],
      noExternal: [],
    },
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp',
    },
  },
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
});
