# API de Tarefas — Laboratórios de Teste (08/10, 15/10, 22/10 e 29/10)

Projeto de referência das aulas de **08/10/2026** (integração e API) **15/10/2026** (testes funcionais, aceitação e BDD) **22/10/2026** (automação End-to-End com Playwright) e **29/10/2026** (integração contínua e quality gates), Qualidade de Software 2026/2, Unoesc.
Stack: Node.js + Express 5 + Jest 30 + Supertest 7 + Cucumber 13 + Playwright 1.56.1 + ESLint 10 + GitHub Actions.

## Como usar

```bash
npm install            # instala dependências
npm test               # todos os testes Jest (08/10 + 15/10)
npm run test:bdd       # cenários Gherkin em português (Cucumber) — 15/10
npm run test:tudo      # Jest + Cucumber
npm run test:coverage  # testes + relatório de cobertura
npm run test:ordem     # testes em ordem aleatória (prova de isolamento)
npm start              # sobe a API de tarefas em http://localhost:3000
npx jest -t "VL7"      # roda só um caso pelo ID da tabela da oficina
```

### Aula 29/10 — CI e Quality Gates

```bash
npm install
npm run ci                  # o MESMO que o job "qualidade" do GitHub Actions: lint → testes+cobertura → BDD → quality gate → auditoria
npm run ci:completo         # + E2E em Chromium
npm run lint                # só o ESLint
npm run test:coverage       # testes + cobertura (aplica o coverageThreshold)
npm run quality             # só o quality gate (precisa ter rodado a cobertura antes)
npm run quality:baseline    # SOBE o piso de cobertura (recusa baixar)
npm run audit:prod          # npm audit só de produção, severidade alta
npm run release:check -- v1.2.0   # tag = package.json = CHANGELOG?
```

**Princípio:** o que o CI roda é o que você roda na sua máquina. Se `npm run ci` passa local, o CI passa. Se falha local, você nem precisa fazer push para descobrir.

O pipeline está em `.github/workflows/ci.yml` (3 jobs: `qualidade` → `e2e` → `release`). A política completa, com fluxograma, está em [`docs/politica-quality-gates.md`](docs/politica-quality-gates.md).

#### Roteiro de demonstração: "quebre a main de propósito" (≈ 25 min)

Faça numa branch. Cada falha foi **executada de verdade**; as saídas abaixo são as reais.

| # | Provocação | O que digitar | Quem barra e como |
|---|---|---|---|
| 0 | Estado verde | `npm run ci` | `QUALITY GATE ... RESULTADO: ✔ APROVADO` e `found 0 vulnerabilities` |
| A | **Regressão de regra de negócio.** Em `src/recuperacao-app.js`, troque `< VALIDADE_MS` por `<= VALIDADE_MS` (link passaria a valer 15:00 exatos) | `npm test` | **1 teste falha: `VL7 uso aos 15 min 0 s -> 410`** (o valor-limite da aula de 08/10). 68 passam. Um único teste protege essa regra. |
| B | **Código novo sem teste.** Em `src/app.js`, acrescente no fim: `module.exports.ehVip = (c) => c === 'vip';` | `npm run test:coverage && npm run quality` | Jest **passa** (piso 90/80/90/90 respeitado), mas o gate **reprova pelo ratchet**: statements 98,13 → 97,54 e functions 100 → 96,77. O piso absoluto deixou passar; o ratchet não. |
| B+ | Mesmo, mas uma função com 2 `if`s sem teste | idem | Aqui os **dois** barram: branches cai para 79,77 < 80 (`Jest: Coverage for branches (79.77%) does not meet "global" threshold (80%)`) e o ratchet também. |
| C | **`.only` esquecido** em `e2e/login.spec.js` (`test.only(...)`) | `npm run quality` | Higiene reprova: `e2e/login.spec.js:4 test.only(...)`. No CI, o Playwright **também** recusa (`forbidOnly`): *"item focused with '.only' is not allowed"*. Duas barreiras, e o gate barra antes de abrir navegador. |
| D | **Release inconsistente** | `npm run release:check -- v1.2.1` | `tag (1.2.1) ≠ package.json (1.2.0)`. Com `main`: *"tag não é uma versão"*. Com CHANGELOG sem data: *"não tem a seção datada"*. |
| E | **Tentar "resolver" baixando o baseline** | `npm run quality:baseline` (após B) | `✖ Recusado: a cobertura (statements, functions) está abaixo do baseline`. Só passa com `--forcar`, e isso vai aparecer no diff do PR. |

Desfaça a edição (ou `git restore .`, se estiver num repositório) entre uma provocação e outra.

#### Custo do pipeline (decisões que valem explicar)

| Decisão | Onde | Por quê |
|---|---|---|
| PR roda só Chromium; Firefox/WebKit só no noturno/manual | matriz do job `e2e` | feedback rápido no PR, cobertura de navegadores à noite |
| `needs: qualidade` | job `e2e` | não abre navegador se lint/testes já falharam |
| `npm ci` + `cache: npm` | steps de setup | instalação exata do lockfile e reaproveitada |
| `concurrency` + `cancel-in-progress` | topo do workflow | push novo cancela a execução velha do mesmo PR |
| `permissions: contents: read` | topo do workflow | menor privilégio |
| `upload-artifact` com `if: always()` / `if: failure()` | final dos jobs | evidência existe justamente quando o job falha |
| Dependabot | `.github/dependabot.yml` | mantém as próprias actions e dependências atualizadas, via PR (que passa pelo mesmo CI) |

> **Verificação (limites honestos):** `npm run ci`, os gates, o release-check e o lint foram executados e aprovados; o `ci.yml` foi validado com **actionlint** e como YAML. O workflow **não foi executado no GitHub** (isso só acontece quando o repositório existir e receber um push). A configuração de branch protection é manual: ver `docs/politica-quality-gates.md`. As actions usam `@v4`; o Dependabot sugere atualizações.

### Aula 22/10 — E2E com Playwright

```bash
npm install
npx playwright install            # 1ª vez: baixa os navegadores (chromium, firefox, webkit)
npm run e2e:chromium              # suíte E2E, só Chromium (a que verificamos de ponta a ponta)
npm run e2e                       # Chromium + Firefox
npm run e2e:todos                 # Chromium + Firefox + WebKit
npm run e2e:ui                    # modo UI: timeline, locators, time-travel
npm run relatorio                 # abre o relatório HTML da última execução
npm run e2e:demos                 # DEMOS: flaky test e evidências (falhar é esperado!)
npm run start:web                 # sobe a aplicação web em http://localhost:3100 (conta demo: ana@exemplo.com / senhaAntiga123)
```

O `playwright.config.js` sobe a aplicação sozinho (`webServer`). Não precisa abrir outro terminal.

#### Roteiro de demonstração (≈ 25 min)

| # | Mostrar | Comando | O que observar |
|---|---|---|---|
| 1 | Suíte verde | `npm run e2e:chromium` | 13 execuções (12 testes + 1 setup de login) |
| 2 | Seletores | abrir `e2e/pages/*.js` | `getByRole`/`getByLabel` em vez de CSS/XPath; Page Object |
| 3 | Login uma vez | abrir `e2e/auth.setup.js` + `e2e/area-logada.spec.js` | `storageState`: a sessão é reaproveitada, sem refazer login |
| 4 | Isolamento | `npx playwright test --project=chromium --workers=4 --repeat-each=5` | e-mails únicos por teste: nenhum teste depende de outro |
| 5 | Flaky | `npm run e2e:demos` | `❌ FLAKY` falha na 1ª tentativa e passa no retry (rede lenta na 1ª); `✅ CORRIGIDO` passa mesmo na rede lenta |
| 6 | Evidências | `npx playwright show-report playwright-report-demos` | screenshot, vídeo e **trace** do teste que falha de propósito |
| 7 | Trace | `npx playwright show-trace test-results-demos/<pasta>/trace.zip` | passo a passo navegável, DOM em cada ação |

**Por que o teste ❌ é flaky?** `waitForTimeout(300)` chuta um tempo e `innerText()` lê só uma vez. Se a resposta demora mais que o chute, o texto ainda está vazio. O ✅ usa `expect(locator).toHaveText(...)`, uma *web-first assertion* que tenta de novo até o estado aparecer. **Retry detecta flaky, não cura.**

#### Estratégia de evidências (`playwright.config.js`)

| Evidência | Configuração | Por quê |
|---|---|---|
| Screenshot | `only-on-failure` | só custa quando há falha |
| Vídeo | `retain-on-failure` | grava sempre, mantém só se falhou |
| Trace | local: `retain-on-failure` · CI: `on-first-retry` | em CI o trace nasce no retry, que já é o sinal de flaky |

## Estrutura

```
src/
  app.js                 # 08/10 — fábrica do app de tarefas (NÃO chama listen)
  server.js              # 08/10 — só chama listen() -> npm start
  pedidos-app.js         # 08/10 BÔNUS — pagamento injetado + idempotência
  recuperacao-app.js     # 15/10 — RF-12 recuperação de senha (relógio e e-mail injetados)
                         # 22/10 — + cadastro, sessão por cookie, /eu e /logout (aditivo)
  web-app.js             # 22/10 — monta a API + caixa de e-mail de DEV + arquivos estáticos
  server-web.js          # 22/10 — npm run start:web (porta 3100)
public/                  # 22/10 — telas HTML: login, cadastro, recuperar, redefinir, minha conta
e2e/                     # 22/10 — testes Playwright (specs, fixtures, pages/, auth.setup.js)
e2e-demos/               # 22/10 — demos de flaky e evidência (falham de propósito)
playwright.config.js     # 22/10 — suíte principal (webServer, projects, evidências)
playwright.demos.config.js  # 22/10 — config das demos (retries 2, workers 1)
jest.config.js           # 22/10 — ignora os *.spec.js do Playwright · 29/10 — coverageThreshold + collectCoverageFrom
.github/                 # 29/10 — workflows/ci.yml, pull_request_template.md, dependabot.yml
scripts/                 # 29/10 — quality-gate.js (ratchet + higiene) e release-check.js
quality/                 # 29/10 — politica.json (regras) e baseline.json (piso atual de cobertura)
docs/politica-quality-gates.md  # 29/10 — política, fluxo (mermaid) e configuração do repositório
eslint.config.js         # 29/10 — ESLint (flat config)
CHANGELOG.md             # 29/10 — histórico por versão (usado pelo release-check)
tests/
  helpers/fakes.js       # 15/10 — relógio falso e e-mail falso (test doubles)
  integration/
    tarefas.test.js      # 08/10 — laboratório principal
    pedidos.test.js      # 08/10 BÔNUS
    web.test.js          # 22/10 — cadastro, sessão e caixa de e-mail de DEV (API)
    recuperacao.test.js  # 15/10 — equivalência, limite, tabela de decisão, estados
features/
  recuperacao_senha.feature          # 15/10 — cenários Gherkin (# language: pt)
  step_definitions/recuperacao.steps.js  # Dado/Quando/Então -> chamadas HTTP
  support/world.js                   # estado novo por cenário (isolamento)
docs/oficina-15-10/
  entrega.md             # gabarito preenchido da oficina
  gabarito-oficina.xlsx  # mesmo gabarito em planilha + rastreabilidade + avaliação
  tutorial-correcao.md   # passo a passo da correção
cucumber.js              # configuração do Cucumber
requests.http            # chamadas manuais (extensão REST Client)
```

## Rotas

### Tarefas (08/10)

| Método | Rota | Sucesso | Erros |
|---|---|---|---|
| POST | `/tarefas` | 201 + tarefa | 400 (titulo inválido ou JSON malformado) |
| GET | `/tarefas/:id` | 200 + tarefa | 404 |
| GET | `/tarefas` | 200 + lista | — |
| DELETE | `/tarefas/:id` | 204 (idempotente) | — |

### Recuperação de senha, cadastro e sessão — RF-12 (15/10) + 22/10

| Método | Rota | Sucesso | Erros |
|---|---|---|---|
| POST | `/recuperacao` `{ email }` | 202 + mensagem neutra (cadastrado ou não) | 400 (e-mail vazio ou inválido) |
| POST | `/recuperacao/redefinir` `{ token, novaSenha }` | 200 | 410 (link inválido, usado ou expirado), 422 (senha fora de 8–64) |
| POST | `/login` `{ email, senha }` | 200 (+ cookie `sessao`) | 401 |
| POST | `/cadastro` `{ email, senha }` | 201 | 400 (e-mail), 409 (já em uso), 422 (senha fora de 8–64) |
| GET | `/eu` | 200 `{ email }` | 401 |
| POST | `/logout` | 204 | — |
| GET | `/__dev/emails?para=` | 200 lista de e-mails (**só DEV**, só em `web-app.js`) | — |

Decisões de negócio (A1–A7) documentadas em `docs/oficina-15-10/entrega.md`.

Requisitos: Node.js 20 ou superior (`engines: >=20.19`). Verificado com Node 20.20.2 e 22. O Cucumber 13 exigia Node 22+; por isso o projeto usa o Cucumber 12.x, que roda no Node 20.

> **Verificação:** a suíte E2E foi executada e aprovada em **Chromium**. Firefox e WebKit estão configurados, mas dependem de `npx playwright install` na sua máquina; rode `npm run e2e:todos` e veja se algo diverge — essa divergência é justamente o assunto do cross-browser.
