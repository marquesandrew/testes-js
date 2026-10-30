const { test, expect } = require('@playwright/test');

/**
 * DEMO — flaky por TEMPO.
 * A rede "oscila": a 1ª tentativa pega uma resposta lenta (700 ms), a seguinte pega uma rápida (80 ms).
 * (A latência depende do nº da tentativa — testInfo.retry — porque o Playwright reinicia o worker após uma falha.)
 *
 * Teste ruim: chuta uma espera.  Teste bom: espera o ESTADO.
 */
const NEUTRA = 'Se o e-mail estiver cadastrado, você receberá as instruções';
const LENTA_MS = 700;
const RAPIDA_MS = 80;

async function solicitar(page, atrasoMs) {
  await page.route('**/recuperacao', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, atrasoMs));
    await route.continue();
  });
  await page.goto('/recuperar.html');
  await page.getByLabel('E-mail').fill('qualquer@exemplo.com');
  await page.getByRole('button', { name: 'Enviar link' }).click();
}

test('❌ FLAKY — espera fixa e leitura única', async ({ page }, testInfo) => {
  await solicitar(page, testInfo.retry === 0 ? LENTA_MS : RAPIDA_MS); // falha na 1ª, passa no retry => "flaky"

  await page.waitForTimeout(300);                            // "chuto que em 300 ms já chegou"
  const texto = await page.locator('#mensagem').innerText(); // lê UMA vez, sem retry
  expect(texto).toBe(NEUTRA);                                // expect sobre string: não tenta de novo
});

test('✅ CORRIGIDO — espera pelo estado (web-first assertion)', async ({ page }) => {
  await solicitar(page, LENTA_MS);                           // mesmo cenário lento do teste ruim

  await expect(page.getByRole('status')).toHaveText(NEUTRA); // tenta de novo até aparecer (ou estourar o timeout)
});
