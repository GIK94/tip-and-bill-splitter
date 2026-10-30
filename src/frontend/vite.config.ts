import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // The calculation engine is shared with the backend (src/shared).
    alias: { '@shared': fileURLToPath(new URL('../shared', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep the large, rarely-changing UI library in its own cacheable chunk.
        manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom'], antd: ['antd', '@ant-design/icons'] },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    // Local development without Docker: forward API calls to the NestJS dev server.
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
    testTimeout: 60_000, // Ant Design components are slow to render under jsdom
  },
});
