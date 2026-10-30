# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) · Versionamento: [SemVer](https://semver.org/lang/pt-BR/)

## [Não lançado]

## [1.2.0] - 2026-10-29
### Adicionado
- Pipeline de CI (GitHub Actions): lint, testes, cobertura, BDD, quality gate, auditoria e E2E.
- Quality gates como código: cobertura mínima, ratchet (cobertura não cai) e higiene de testes (`.only`/`.skip`).
- Critério de release: tag = `package.json` = CHANGELOG (`npm run release:check`).
- ESLint, template de pull request (Definition of Done) e Dependabot.

### Alterado
- Cobertura passa a medir só `src/` (sem helpers de teste nem `server*.js`).

## [1.1.0] - 2026-10-22
### Adicionado
- Camada web (`public/`), cadastro, sessão por cookie e testes E2E com Playwright.

## [1.0.0] - 2026-10-15
### Adicionado
- Recuperação de senha (RF-12), testes funcionais e BDD (Cucumber).
