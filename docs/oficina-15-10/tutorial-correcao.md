# Correção da Oficina — Aula 11 (15/10/2026)
## Testes Funcionais, Aceitação e BDD — Requisito RF-12 (Recuperação de senha)

**Entregável:** um arquivo `entrega.md` com 7 seções. Este tutorial monta o arquivo seção por seção, com o gabarito de cada uma.

**Pré-requisito:** VS Code instalado.

---

## Parte 0 — Preparar o ambiente

**1.** Abra o VS Code.

**2.** Abra o terminal: `Terminal > New Terminal`. Na seta ao lado do `+`, escolha **Git Bash**.

**3.** Crie a pasta e o arquivo da entrega:

```bash
mkdir oficina-bdd
cd oficina-bdd
touch entrega.md
code -r .
```

**4.** No painel lateral (Explorer), clique em `entrega.md` para abrir.

**5.** Instale a extensão do Gherkin para colorir os cenários: `Ctrl + Shift + X` → busque **Cucumber (Gherkin) Full Support** → **Install**.

**6.** Para ver o Markdown formatado enquanto escreve: `Ctrl + K` e depois `V` (abre a pré-visualização ao lado).

**7.** Cole o cabeçalho no topo do `entrega.md`:

```markdown
# Oficina — Recuperação de senha (RF-12)

**Grupo:** Nome 1 (PO), Nome 2 (Dev), Nome 3 (QA), Nome 4 (Explorador)
**Data:** 15/10/2026

> **RF-12 — Recuperação de senha.** O usuário informa o e-mail cadastrado e recebe um link para redefinir a senha. O link **expira em 15 minutos** e só pode ser usado **uma vez**. A nova senha deve ter **entre 8 e 64 caracteres**.
```

Troque os nomes e salve (`Ctrl + S`).

---

## Parte 1 — Ambiguidades e decisões (passo 1 da oficina)

**8.** Cole abaixo do cabeçalho:

```markdown
## 1. Ambiguidades e decisões do PO

| # | Ambiguidade | Decisão do PO | Justificativa |
|---|---|---|---|
| A1 | O que acontece se o e-mail não estiver cadastrado? | Exibe a **mesma mensagem neutra** do e-mail cadastrado e **não envia** e-mail | Evita enumeração de usuários (descobrir quem tem conta) |
| A2 | "Expira em 15 minutos": 15:00 ainda vale? | **Não.** Válido enquanto o tempo decorrido for **menor que 15:00**. Em 15:00 exato já expirou | Na dúvida de segurança, fecha-se a janela |
| A3 | Se o usuário pedir um segundo link, o primeiro continua válido? | **Não.** Gerar um novo link **invalida** o anterior | Só um link ativo por usuário reduz a superfície de ataque |
| A4 | Se a senha não atender à política, o link é "gasto"? | **Não.** O link só é consumido quando a senha é **alterada com sucesso** | Um erro de digitação não deve obrigar a pedir outro link |
| A5 | O e-mail é sensível a maiúsculas e espaços? | Remove espaços nas pontas e compara **sem diferenciar maiúsculas** | `" Ana@Exemplo.COM "` é a mesma pessoa que `ana@exemplo.com` |
| A6 | Espaços contam no tamanho da senha? | **Sim.** A senha é usada exatamente como digitada, sem cortar espaços | Cortar espaços mudaria a senha sem o usuário saber |
| A7 | A nova senha pode ser igual à anterior? | **Fora do escopo do RF-12.** Registrado como pergunta pendente para o próximo refinamento | O requisito não trata histórico de senhas |
```

> **Correção:** o critério de avaliação exige ambiguidades **decididas**, não só listadas. Cada linha precisa ter a coluna "Decisão" preenchida. Mínimo: 3 (A1, A2, A3 são as do slide).

---

## Parte 2 — Particionamento de equivalência (passo 2 da oficina)

**9.** Cole:

```markdown
## 2. Particionamento de equivalência — campo e-mail

| ID | Classe | Tipo | Representante | Resultado esperado |
|---|---|---|---|---|
| EQ1 | Cadastrado, formato válido | Válida | `ana@exemplo.com` | Link enviado + mensagem neutra |
| EQ2 | Válido com maiúsculas e espaços nas pontas | Válida (normalização) | `" Ana@Exemplo.COM "` | Tratado como `ana@exemplo.com`, link enviado |
| EQ3 | Formato válido, **não cadastrado** | Inválida (negócio) | `fantasma@exemplo.com` | **Mesma mensagem neutra** da EQ1, nenhum e-mail enviado |
| EQ4 | Sem `@` | Inválida | `ana.exemplo.com` | Erro "Informe um e-mail válido" |
| EQ5 | Sem domínio após `@` | Inválida | `ana@` | Erro "Informe um e-mail válido" |
| EQ6 | Vazio ou só espaços | Inválida | `"   "` | Erro "Informe um e-mail" |
| EQ7 | Maior que 254 caracteres | Inválida | 300 caracteres | Erro "Informe um e-mail válido" |
```

> **Correção:** a classe EQ3 é a mais importante. Se o grupo colocou "Erro: e-mail não encontrado", está **errado**: isso permite a enumeração de usuários.

---

## Parte 3 — Valores limite (passo 3 da oficina)

**10.** Cole:

```markdown
## 3. Valores limite

### 3.1 Tamanho da nova senha (8 a 64)

| ID | Valor | Tamanho | Esperado |
|---|---|---|---|
| VL1 | Abaixo do mínimo | 7 | Rejeita |
| VL2 | **No mínimo** | **8** | Aceita |
| VL3 | Dentro da faixa | 20 | Aceita |
| VL4 | **No máximo** | **64** | Aceita |
| VL5 | Acima do máximo | 65 | Rejeita |

### 3.2 Expiração do link (15 minutos)

| ID | Momento do uso | Esperado |
|---|---|---|
| VL6 | 14 min 59 s | Válido |
| VL7 | **15 min 00 s** | **Expirado** (decisão A2) |
| VL8 | 15 min 01 s | Expirado |

**Decisão sobre o instante exato:** o link é válido enquanto `tempo decorrido < 15 min`. Em 15:00 exato, já expirou.

**Nota para automação:** nos testes automatizados o relógio é **injetado** (ex.: `jest.useFakeTimers()` / `jest.setSystemTime()`), nunca esperado de verdade.
```

> **Correção:** precisa ter **abaixo, na borda e acima** para cada limite. Sem a linha dos 15:00 com decisão escrita, perde o critério 3.

---

## Parte 4 — Tabela de decisão (passo 4 da oficina)

**11.** Cole:

```markdown
## 4. Tabela de decisão — recuperação de senha

Condições: **C1** e-mail cadastrado? | **C2** link válido? | **C3** senha atende à política?
3 condições binárias → 2³ = **8 combinações**.

### 4.1 Tabela completa

| Regra | C1 Cadastrado? | C2 Link válido? | C3 Senha OK? | Ação |
|---|---|---|---|---|
| R1 | Sim | Sim | Sim | Senha alterada, link invalidado, mensagem de sucesso |
| R2 | Sim | Sim | Não | Mensagem da política de senha, link **continua válido** (A4) |
| R3 | Sim | Não | Sim | Mensagem "link inválido ou expirou", oferecer novo link |
| R4 | Sim | Não | Não | Mensagem "link inválido ou expirou", oferecer novo link (link checado antes da senha) |
| R5 | Não | Sim | Sim | **Impossível**: sem cadastro nenhum link é gerado |
| R6 | Não | Sim | Não | **Impossível**: idem |
| R7 | Não | Não | Sim | Mensagem neutra, nenhum e-mail enviado |
| R8 | Não | Não | Não | Mensagem neutra, nenhum e-mail enviado |

### 4.2 Tabela reduzida (regras com mesma ação agrupadas)

| Regra | C1 | C2 | C3 | Ação |
|---|---|---|---|---|
| R1 | Sim | Sim | Sim | Senha alterada, link invalidado |
| R2 | Sim | Sim | Não | Mensagem de política, link continua válido |
| R3+R4 | Sim | Não | — | Link inválido, oferecer novo |
| R7+R8 | Não | — | — | Mensagem neutra, nenhum e-mail |

### 4.3 Transição de estados do link

| De | Evento | Para | Tipo | Esperado |
|---|---|---|---|---|
| Gerado | Redefine a senha | Usado | Válida | Senha alterada |
| Gerado | Passam 15 min | Expirado | Válida | Link deixa de funcionar |
| Gerado | Novo link solicitado | Invalidado | Válida | Link antigo deixa de funcionar (A3) |
| Usado | Usar de novo | — | **Inválida** | Bloqueado: "link inválido ou expirou" |
| Expirado | Usar | — | **Inválida** | Bloqueado: "link inválido ou expirou" |
| Invalidado | Usar | — | **Inválida** | Bloqueado: "link inválido ou expirou" |
```

> **Correção:** o critério 4 exige tabela **completa**. As 8 linhas têm que aparecer, inclusive as impossíveis (R5, R6), marcadas como tal. A reduzida vem **depois** da completa, nunca no lugar dela. A 4.3 (estados) não é exigida, mas cobre "só pode ser usado uma vez".

---

## Parte 5 — Cenários Gherkin (passo 5 da oficina)

**12.** Cole no `entrega.md`:

~~~~markdown
## 5. Cenários BDD (Gherkin)

```gherkin
# language: pt
Funcionalidade: Recuperação de senha
  Para recuperar o acesso à minha conta
  Como usuária cadastrada
  Quero redefinir minha senha por um link enviado ao meu e-mail

  Cenário: Solicitar recuperação com e-mail cadastrado
    Dado que existe um usuário cadastrado com o e-mail "ana@exemplo.com"
    Quando ela solicita a recuperação de senha para "ana@exemplo.com"
    Então um e-mail com link de redefinição é enviado para "ana@exemplo.com"
    E a tela exibe "Se o e-mail estiver cadastrado, você receberá as instruções"

  Cenário: Solicitar recuperação com e-mail não cadastrado
    Dado que não existe usuário com o e-mail "fantasma@exemplo.com"
    Quando alguém solicita a recuperação de senha para "fantasma@exemplo.com"
    Então nenhum e-mail é enviado
    E a tela exibe "Se o e-mail estiver cadastrado, você receberá as instruções"

  Cenário: Usar um link já utilizado
    Dado que o link de redefinição de "ana@exemplo.com" já foi usado
    Quando ela tenta usar o mesmo link novamente
    Então a senha não é alterada
    E a tela exibe "Este link é inválido ou expirou"

  Cenário: Usar um link expirado
    Dado que o link de redefinição de "ana@exemplo.com" foi gerado há 15 minutos
    Quando ela tenta redefinir a senha com esse link
    Então a senha não é alterada
    E a tela exibe "Este link é inválido ou expirou"
    E é oferecida a opção de solicitar um novo link

  Cenário: Informar senha fora da política
    Dado um link de redefinição válido para "ana@exemplo.com"
    Quando ela informa uma nova senha com 7 caracteres
    Então a senha não é alterada
    E a tela exibe "A senha deve ter entre 8 e 64 caracteres"
    E o link continua válido

  Esquema do Cenário: Validar tamanho da nova senha
    Dado um link de redefinição válido para "ana@exemplo.com"
    Quando ela informa uma nova senha com <tamanho> caracteres
    Então a nova senha é <resultado>

    Exemplos:
      | tamanho | resultado |
      | 7       | rejeitada |
      | 8       | aceita    |
      | 20      | aceita    |
      | 64      | aceita    |
      | 65      | rejeitada |
```

**Rastreabilidade:** Cenário 1 → EQ1/R1 · Cenário 2 → EQ3/R7 · Cenário 3 → estado Usado · Cenário 4 → VL7 · Cenário 5 → VL1/R2 · Esquema → VL1 a VL5
~~~~

**13.** (Opcional) Salve os cenários também como arquivo `.feature`, que será reaproveitado na aula de 22/10:

```bash
mkdir features
touch features/recuperacao_senha.feature
```

Abra `features/recuperacao_senha.feature` e cole **só** o conteúdo de dentro do bloco `gherkin` (de `# language: pt` até a última linha da tabela de Exemplos).

> **Correção:**
> - Mínimo 4 cenários: caminho feliz, não cadastrado, expirado/usado, senha fora da política. Bônus: Esquema do Cenário.
> - `# language: pt` na primeira linha é obrigatório para o Cucumber entender `Dado/Quando/Então`.
> - **Errado (imperativo):** `Quando ela clica no botão azul "Enviar"`. **Certo (declarativo):** `Quando ela solicita a recuperação de senha`.
> - Os cenários 1 e 2 precisam ter a **mesma mensagem** na tela.

---

## Parte 6 — Sessão exploratória (passo 6 da oficina)

**14.** Escolham um sistema real que o grupo usa (ex.: o portal acadêmico, um app de banco, uma rede social). Usem **somente a própria conta** do Explorador.

**15.** Antes de começar, cole o charter no `entrega.md` e preencha os campos entre `< >`:

```markdown
## 6. Sessão exploratória

**Charter:** Explorar o fluxo de recuperação de senha do **<nome do sistema>**, usando múltiplas abas, botão voltar do navegador e links antigos, para descobrir falhas de segurança e de estado.
**Explorador:** <nome> | **Conta usada:** própria | **Ambiente:** <navegador e versão, sistema operacional>
**Início:** <hh:mm> | **Fim:** <hh:mm> | **Duração:** 20 min

### Notas da sessão

| Hora | Ação tentada | O que aconteceu | Observação |
|---|---|---|---|
| | | | |
```

**16.** Abra um cronômetro de 20 minutos e execute os ataques abaixo, **anotando uma linha na tabela para cada um**:

| # | Heurística | Ação |
|---|---|---|
| 1 | Neutralidade | Pedir recuperação para um e-mail inventado. A mensagem é igual à do seu e-mail real? |
| 2 | Concorrência | Pedir dois links seguidos. O primeiro ainda funciona? |
| 3 | Estado | Redefinir a senha e abrir o **mesmo** link de novo |
| 4 | Interrupção | No formulário de nova senha, apertar **voltar** e reenviar |
| 5 | Interrupção | Abrir o link em outro navegador ou em aba anônima |
| 6 | Limite | Senha com exatamente 7 e 8 caracteres (ou o limite do sistema) |
| 7 | Dados estranhos | E-mail com maiúsculas, espaços nas pontas, ou com `+` (`ana+teste@...`) |
| 8 | Dados estranhos | Senha com emoji ou acento |
| 9 | "E se...?" | Clicar duas vezes rápido em "Enviar" |
| 10 | Tempo | Deixar o link aberto e só usar depois de 15+ minutos (fazer no fim da sessão) |

> **Correção:** as notas variam por grupo, não há gabarito. Avalie se tem **charter preenchido, tempo registrado e uma linha por ação**. "Testei e funcionou" sem detalhe não vale.

---

## Parte 7 — Registro de defeito/risco (passo 7 da oficina)

**17.** Escolha o achado mais relevante da sessão. Se nada falhou, registre um **risco** (algo que poderia falhar ou que ficou duvidoso).

**18.** Cole e adapte. O exemplo abaixo usa o caso do slide 10:

```markdown
## 7. Registro de defeito

| Campo | Conteúdo |
|---|---|
| **ID** | DEF-001 |
| **Título** | Link de recuperação pode ser reutilizado após redefinir a senha |
| **Ambiente** | <navegador e versão>, <sistema operacional>, <sistema testado> |
| **Pré-condição** | Conta própria cadastrada com `<seu e-mail>` |
| **Passos** | 1) Solicitar recuperação para `<seu e-mail>`. 2) Abrir o link recebido e redefinir a senha. 3) Abrir o **mesmo** link novamente. 4) Informar outra senha válida e enviar. |
| **Resultado esperado** | Mensagem "Este link é inválido ou expirou" e senha não alterada (RF-12: link de uso único) |
| **Resultado obtido** | Formulário de nova senha exibido e a segunda senha foi aceita |
| **Evidência** | `evidencias/def-001.png` (ou vídeo) |
| **Severidade** | **Crítica**: se o link vazar (e-mail encaminhado, histórico do navegador), qualquer pessoa assume a conta |
| **Prioridade** | **Alta**: corrigir antes da próxima release, afeta todos os usuários |
```

**19.** Salve o print da evidência:

```bash
mkdir evidencias
```

Tire o print (`Win + Shift + S`), salve em `oficina-bdd/evidencias/def-001.png`.

> **Correção:**
> - Passos **numerados e determinísticos**: outra pessoa reproduz sem perguntar nada.
> - Esperado cita o **requisito**. Obtido descreve o **fato**, sem opinião.
> - Severidade e prioridade **justificadas** e tratadas como coisas diferentes.
> - **Errado:** "Recuperação de senha não funciona."

---

## Parte 8 — Conferir e entregar

**20.** Confira a estrutura da pasta:

```bash
ls -R
```

Esperado:

```
.:
entrega.md  evidencias  features

./evidencias:
def-001.png

./features:
recuperacao_senha.feature
```

**21.** Abra a pré-visualização (`Ctrl + K`, `V`) e confira se todas as tabelas renderizaram. Tabela quebrada = falta `|` em alguma linha ou falta linha em branco antes da tabela.

**22.** Gere o zip para entregar:

```bash
cd ..
zip -r oficina-bdd.zip oficina-bdd
```

> Se o Git Bash disser `zip: command not found`: clique com o botão direito na pasta `oficina-bdd` no Windows Explorer → **Compactar para arquivo ZIP**.

---

## Checklist de correção

| # | Critério | OK se... |
|---|---|---|
| 1 | Ambiguidades | ≥ 3 ambiguidades **com decisão** escrita |
| 2 | Equivalência | Cada classe tem representante e resultado; "não cadastrado" com mensagem neutra |
| 3 | Limites | Abaixo/borda/acima para senha **e** expiração; 15:00 decidido |
| 4 | Tabela de decisão | 8 combinações listadas (impossíveis marcadas) |
| 5 | Gherkin | ≥ 4 cenários declarativos, `# language: pt`, mensagens iguais nos cenários 1 e 2 |
| 6 | Exploratório | Charter + tempo + notas por ação |
| 7 | Defeito | Passos reproduzíveis, esperado × obtido, severidade ≠ prioridade justificadas |

## Erros mais comuns

| Erro | Por que está errado |
|---|---|
| "E-mail não encontrado" para não cadastrado | Permite enumeração de usuários |
| Só "8 e 64" na tabela de limites | Faltam 7 e 65 (abaixo e acima) |
| 15:00 marcado como "❓" sem decisão | A técnica serve para **forçar** a decisão |
| Tabela de decisão com 4 linhas só | Combinações omitidas, mesmo as impossíveis precisam aparecer |
| `Quando clica no botão "Enviar"` | Cenário imperativo, quebra se a tela mudar |
| Severidade = Prioridade sem justificativa | São conceitos diferentes (impacto × urgência) |

---

## Parte 9 — Integração com o projeto de 08/10 (rodar o gabarito)

O RF-12 está implementado e testado dentro do projeto `api-tarefas`. Cada tabela da oficina virou teste.

**23.** Extraia o zip `api-tarefas-15-10.zip` e abra a pasta `api-tarefas` no VS Code (`File > Open Folder...`).

**24.** Abra o terminal Git Bash (`Terminal > New Terminal`, opção **Git Bash**).

**25.** Instale as dependências:

```bash
npm install
```

**26.** Rode as técnicas (equivalência, limite, decisão, estados) no Jest:

```bash
npm test
```

Esperado: `Tests: 56 passed, 56 total` (26 de 08/10 + 30 de hoje).

**27.** Rode os cenários Gherkin no Cucumber:

```bash
npm run test:bdd
```

Esperado: `11 scenarios (11 passed)` e `41 steps (41 passed)`, cada passo em português com ✔.

**28.** Rode só um caso pelo ID da tabela:

```bash
npx jest -t "VL7"
```

**29.** Prove que o teste de limite pega o bug `<` versus `<=`: abra `src/recuperacao-app.js`, procure `criadoEm < VALIDADE_MS`, troque `<` por `<=`, salve e rode:

```bash
npm run test:tudo
```

Esperado: o Jest falha em `VL7` e o Cucumber falha em `Usar um link expirado`. **Volte para `<`.**

**30.** Cobertura:

```bash
npm run test:coverage
```

### Onde está cada coisa

| Oficina | Arquivo no projeto |
|---|---|
| Requisito implementado | `src/recuperacao-app.js` |
| Relógio e e-mail falsos (test doubles) | `tests/helpers/fakes.js` |
| Equivalência, limite, decisão, estados | `tests/integration/recuperacao.test.js` |
| Cenários Gherkin | `features/recuperacao_senha.feature` |
| Passos Gherkin → chamadas HTTP | `features/step_definitions/recuperacao.steps.js` |
| Isolamento por cenário (beforeEach do Cucumber) | `features/support/world.js` |
| Gabarito preenchido | `docs/oficina-15-10/entrega.md` e `gabarito-oficina.xlsx` |
