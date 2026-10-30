const { test: setup, expect } = require('@playwright/test');

const { ARQUIVO, CONTA } = require('./auth');

// Roda UMA vez antes dos projetos de navegador: faz login pela tela e guarda cookies/localStorage.
setup('autentica uma vez e salva o estado', async ({ page, request }) => {
  const r = await request.post('/cadastro', { data: CONTA });
  expect([201, 409]).toContain(r.status());        // 409 = já existe (servidor reaproveitado)

  await page.goto('/');
  await page.getByLabel('E-mail').fill(CONTA.email);
  await page.getByLabel('Senha').fill(CONTA.senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/minha-conta/);

  await page.context().storageState({ path: ARQUIVO });
});
