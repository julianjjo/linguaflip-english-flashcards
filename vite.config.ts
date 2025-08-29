import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/',
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      css: {
        // Ensure CSS is processed correctly
        devSourcemap: true,
        // PostCSS configuration is handled by postcss.config.js
      },
      build: {
        // Ensure CSS is not tree-shaken incorrectly
        cssCodeSplit: true,
        // Optimize CSS for production
        cssMinify: true,
        // Ensure proper asset handling
        assetsDir: 'assets',
        // Optimize chunk splitting
        rollupOptions: {
          output: {
            // Ensure CSS files have consistent naming
            assetFileNames: (assetInfo) => {
              if (assetInfo.name?.endsWith('.css')) {
                return 'assets/[name]-[hash][extname]';
              }
              return 'assets/[name]-[hash][extname]';
            },
            // Ensure JS files have consistent naming
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js',
            // Optimize chunk splitting for better caching
            manualChunks: {
              // Vendor chunks
              'react-vendor': ['react', 'react-dom'],
              'astro-vendor': ['astro'],
              'ui-vendor': ['@nanostores/react', 'nanostores'],

              // Feature chunks
              'audio-system': ['./src/hooks/useAudioSystem.ts'],
              'cache-system': ['./src/hooks/useCacheSystem.ts'],
              'ai-generation': ['./hooks/useAICardGeneration.ts'],

              // Component chunks
              'flashcard-components': [
                './src/components/Flashcard.tsx',
                './src/components/OptimizedImage.tsx'
              ],
              'settings-components': [
                './src/components/AudioSettings.tsx',
                './src/components/ServiceWorkerStatus.tsx'
              ],
            },
          },
        },
        // Enable source maps for debugging
        sourcemap: mode === 'development',
        // Optimize dependencies
        commonjsOptions: {
          include: [/node_modules/],
        },
      },
      // Optimize dependencies
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          '@nanostores/react',
          'nanostores',
          'astro'
        ],
        exclude: ['@google/genai'], // Exclude large dependencies from pre-bundling
      },
    };
});
