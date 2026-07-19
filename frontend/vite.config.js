import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteCompression({ algorithm: 'brotliCompress', ext: '.br' })],
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router') || id.includes('node_modules/axios')) {
            return 'vendor';
          }
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/gsap')) {
            return 'animations';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'ui';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.js',
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
  },
})
