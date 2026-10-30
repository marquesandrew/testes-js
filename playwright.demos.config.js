const { defineConfig, devices } = require('@playwright/test');

// DEMOS DE AULA — falhar é ESPERADO aqui. Por isso ficam fora da suíte principal (playwright.config.js).
//   npm run e2e:demos
module.exports = defineConfig({
  testDir: 'e2e-demos',
  workers: 1,                       // ordem fixa => a "rede lenta" simulada é reproduzível
  retries: 2,                       // um teste que falha e depois passa é classificado como FLAKY
  expect: { timeout: 3000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-demos' }]],
  outputDir: 'test-results-demos',
  use: {
    baseURL: 'http://localhost:3100',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: { command: 'npm run start:web', url: 'http://localhost:3100', reuseExistingServer: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
