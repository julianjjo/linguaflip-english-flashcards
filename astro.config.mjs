import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [
    react({
      include: ['**/react/*']
    }),
    tailwind({
      applyBaseStyles: false
    })
  ],
  vite: {
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
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

            // Application chunks
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
            if (id.includes('/utils/')) {
              return 'utils';
            }
          }
        }
      }
    },
    // Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@nanostores/react',
        'nanostores'
      ],
      exclude: ['@google/genai']
    }
  },
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto'
  }
});