import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/__tests__/**', 'src/index.ts'],
    },
    // Set required env vars before any module loads
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/foundu_test',
      JWT_SECRET: 'test-jwt-secret-must-be-at-least-32-chars!!',
      JWT_REFRESH_SECRET: 'test-refresh-secret-must-be-32-chars!!',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      ARGON2_PEPPER: 'test-argon2-pepper-must-be-32-chars!!',
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'test-access-key-id',
      AWS_SECRET_ACCESS_KEY: 'test-secret-access-key',
      S3_BUCKET_MAIN: 'test-main-bucket',
      S3_BUCKET_QUARANTINE: 'test-quarantine-bucket',
      CLOUDFRONT_DOMAIN: 'https://test.cloudfront.net',
      GOOGLE_AI_API_KEY: 'test-gemini-api-key',
      RESEND_API_KEY: 'test-resend-api-key',
    },
  },
});
