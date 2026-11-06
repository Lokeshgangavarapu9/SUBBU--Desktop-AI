import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'framer-ui': ['framer-motion', 'lucide-react'],
          'subbu-state': ['zustand'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    watch: {
      ignored: [
        '**/.edge*/**',
        '**/.chrome*/**',
        '**/*.journal',
        '**/*.log',
        '**/third_party/**',
      ],
    },
  },
});

