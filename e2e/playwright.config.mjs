import { tmpdir } from 'node:os';
import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.mjs',
  timeout: 45_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: 'line',
  outputDir: path.join(tmpdir(), 'whitechapel-playwright-results'),
  use: {
    baseURL: 'http://127.0.0.1:4173/whitechapel/',
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node e2e/server.mjs',
    url: 'http://127.0.0.1:4173/whitechapel/',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
