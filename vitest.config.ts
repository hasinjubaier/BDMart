import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Ensure .env.local is loaded for test execution against development database
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // File may not exist in CI or alternate environments
  }
}

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
});
