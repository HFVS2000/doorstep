import { defineConfig } from '@playwright/test';

// Chromium path override for sandboxes that ship their own browser.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4321',
    geolocation: { latitude: 51.7208, longitude: 0.4655 },
    permissions: ['geolocation'],
    launchOptions: { executablePath },
  },
  webServer: {
    command: 'npm run build && npx vite preview --port 4321 --strictPort',
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'tablet-landscape', use: { viewport: { width: 1280, height: 800 }, hasTouch: true } },
    { name: 'tablet-portrait', use: { viewport: { width: 800, height: 1280 }, hasTouch: true } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
});
