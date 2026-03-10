import { defineConfig } from 'vitest/config';

const liveModelEnabled = process.env['LOCALCOWORK_MODEL_ENDPOINT'] != null;

export default defineConfig({
  test: {
    include: ['tests/model-behavior/**/*.test.ts'],
    globals: false,
    environment: 'node',
    testTimeout: liveModelEnabled ? 120_000 : 30_000,
    hookTimeout: liveModelEnabled ? 120_000 : 30_000,
  },
});
