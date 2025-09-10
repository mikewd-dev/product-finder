import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV),
    },
    server: {
      host: '0.0.0.0',
      port: 5000,
      strictPort: true,
      allowedHosts: [
        'd7b5f6e8-0246-40ce-b0a2-b1c6f4fcb63e-00-21oyeas9e83yx.worf.replit.dev',
      ],
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/tests/setup.js'],
    },
  };
});