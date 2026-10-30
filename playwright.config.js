const { defineConfig, devices } = require('@playwright/test');

const CI = !!process.env.CI;

module.exports = defineConfig({
  testDir: 'e2e',
  fullyParallel: true,            // testes rodam em paralelo: por isso cada um usa dados ÚNICOS
  forbidOnly: CI,                 // test.only esquecido derruba o CI
  retries: CI ? 1 : 0,            // retry DETECTA flaky (aparece como "flaky" no relatório), não cura
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3100',   // páginas: page.goto('/cadastro.html')
    screenshot: 'only-on-failure',      // evidência 1: print no momento da falha
    video: 'retain-on-failure',         // evidência 2: vídeo (só guarda se falhar)
    trace: CI ? 'on-first-retry' : 'retain-on-failure', // evidência 3: trace (passo a passo navegável)
  },

  // O Playwright sobe o app sozinho antes dos testes e derruba no fim
  webServer: {
    command: 'npm run start:web',
    url: 'http://localhost:3100',
    reuseExistingServer: !CI,
  },

  projects: [
    // Login feito UMA vez e reaproveitado (storageState)
    { name: 'setup', testMatch: /auth\.setup\.js/ },

    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, dependencies: ['setup'] },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, dependencies: ['setup'] },
  ],
});
