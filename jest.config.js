// Fonte ÚNICA dos mínimos de cobertura: quality/politica.json (o quality-gate lê o mesmo arquivo)
const politica = require('./quality/politica.json');

// Jest só roda tests/**/*.test.js. Os *.spec.js em e2e/ são do Playwright.
module.exports = {
  testMatch: ['<rootDir>/tests/**/*.test.js'],

  // 29/10 — COBERTURA: mede só o código de produção (nada de helpers de teste nem server*.js, que só chamam listen)
  collectCoverageFrom: ['src/**/*.js', '!src/server*.js'],
  // json-summary é o que o quality-gate lê; lcov/text são para humanos
  coverageReporters: ['text', 'json-summary', 'lcov'],

  // QUALITY GATE nº 1 (nativo do Jest): abaixo disso, `jest --coverage` termina com erro => o CI fica vermelho.
  // Para mudar o número, edite quality/politica.json (decisão do time, via pull request).
  coverageThreshold: { global: politica.cobertura.minimos },
};
