# Oficina 15/10 — Recuperação de senha (RF-12) — Gabarito

**Grupo:** Nome 1 (PO), Nome 2 (Dev), Nome 3 (QA), Nome 4 (Explorador)
**Data:** 15/10/2026

> **RF-12 — Recuperação de senha. O usuário informa o e-mail cadastrado e recebe um link para redefinir a senha. O link expira em 15 minutos e só pode ser usado uma vez. A nova senha deve ter entre 8 e 64 caracteres.**

**Integração com 08/10:** todas as tabelas abaixo estão implementadas e testadas no projeto `api-tarefas`:
- Código: `src/recuperacao-app.js`
- Técnicas (Jest + Supertest): `tests/integration/recuperacao.test.js` → `npm test`
- Cenários BDD (Cucumber): `features/recuperacao_senha.feature` → `npm run test:bdd`

A coluna "Teste automatizado" traz o nome do teste no Jest. Para rodar só um: `npx jest -t "VL7"`.

## 1. Ambiguidades e decisões do PO

| ID | Ambiguidade | Decisão do PO | Justificativa | Onde está no código |
|---|---|---|---|---|
| A1 | O que acontece se o e-mail não estiver cadastrado? | Mesma mensagem neutra do e-mail cadastrado; nenhum e-mail enviado | Evita enumeração de usuários | POST /recuperacao responde 202 nos dois casos |
| A2 | 15:00 exatos ainda vale? | Não. Válido enquanto tempo decorrido < 15:00 | Na dúvida de segurança, fecha-se a janela | linkEstaValido(): '<' e não '<=' |
| A3 | Pedir um 2º link invalida o 1º? | Sim. Só um link ativo por usuário | Reduz superfície de ataque | linkAtivoPorEmail |
| A4 | Senha fora da política gasta o link? | Não. Link só é consumido em troca bem-sucedida | Erro de digitação não obriga novo pedido | 422 não muda o estado do link |
| A5 | E-mail diferencia maiúsculas/espaços? | Trim + comparação em minúsculas | ' Ana@Exemplo.COM ' é a mesma pessoa | normalizarEmail() |
| A6 | Como contar o tamanho da senha? Espaços contam? | Senha usada como digitada; tamanho em caracteres (emoji = 1) | Cortar espaços mudaria a senha sem aviso | Array.from(senha).length |
| A7 | Nova senha pode ser igual à anterior? | Fora do escopo do RF-12; pergunta pendente | Requisito não trata histórico | Não implementado (pendente) |

## 2. Particionamento de equivalência — campo e-mail

| ID | Classe | Tipo | Representante | Resultado esperado | Teste automatizado (Jest) |
|---|---|---|---|---|---|
| EQ1 | Cadastrado, formato válido | Válida | ana@exemplo.com | 202 + mensagem neutra + e-mail enviado | EQ1 cadastrado, formato válido |
| EQ2 | Maiúsculas e espaços nas pontas | Válida (normalização) | ' Ana@Exemplo.COM ' | Tratado como ana@exemplo.com | EQ2 maiúsculas e espaços nas pontas |
| EQ3 | Formato válido, não cadastrado | Inválida (negócio) | fantasma@exemplo.com | MESMA resposta da EQ1, nenhum e-mail | EQ3 não cadastrado: MESMA resposta da EQ1 |
| EQ4 | Sem @ | Inválida | ana.exemplo.com | 400 'Informe um e-mail válido' | EQ4 sem @ |
| EQ5 | Sem domínio | Inválida | ana@ | 400 'Informe um e-mail válido' | EQ5 sem domínio |
| EQ6 | Vazio ou só espaços | Inválida | '   ' | 400 'Informe um e-mail' | EQ6 só espaços / EQ6b vazio |
| EQ7 | Mais de 254 caracteres | Inválida | 300 caracteres | 400 'Informe um e-mail válido' | EQ7 mais de 254 caracteres |

## 3. Valores limite

| ID | Variável | Valor testado | Posição | Esperado | Status HTTP | Teste automatizado (Jest) |
|---|---|---|---|---|---|---|
| VL1 | Tamanho da senha | 7 | Abaixo do mínimo | Rejeita | 422 | VL1 senha com 7 caracteres |
| VL2 | Tamanho da senha | 8 | No mínimo | Aceita | 200 | VL2 senha com 8 caracteres |
| VL3 | Tamanho da senha | 20 | Dentro | Aceita | 200 | VL3 senha com 20 caracteres |
| VL4 | Tamanho da senha | 64 | No máximo | Aceita | 200 | VL4 senha com 64 caracteres |
| VL5 | Tamanho da senha | 65 | Acima do máximo | Rejeita | 422 | VL5 senha com 65 caracteres |
| VL6 | Expiração do link | 14 min 59 s | Abaixo da borda | Válido | 200 | VL6 uso aos 14 min 59 s |
| VL7 | Expiração do link | 15 min 00 s | Na borda (decisão A2) | Expirado | 410 | VL7 uso aos 15 min 0 s |
| VL8 | Expiração do link | 15 min 01 s | Acima da borda | Expirado | 410 | VL8 uso aos 15 min 1 s |

**Decisão sobre o instante exato:** o link vale enquanto `tempo decorrido < 15 min`. Em 15:00 exato, já expirou.
**Automação:** o relógio é injetado (`tests/helpers/fakes.js` → `criarRelogioFalso`). Nenhum teste espera 15 minutos.

## 4. Tabela de decisão

Condições: **C1** e-mail cadastrado? · **C2** link válido? · **C3** senha atende à política? → 2³ = **8 regras**.

| Regra | C1 Cadastrado? | C2 Link válido? | C3 Senha OK? | Ação | Teste automatizado (Jest) |
|---|---|---|---|---|---|
| R1 | Sim | Sim | Sim | Senha alterada, link invalidado (200) | R1 cadastrado + link válido + senha OK |
| R2 | Sim | Sim | Não | Mensagem de política, link continua válido (422) | R2 link válido + senha fora da política |
| R3 | Sim | Não | Sim | Link inválido, oferecer novo (410) | R3 link inválido + senha OK |
| R4 | Sim | Não | Não | Link inválido, oferecer novo (410) — link checado antes da senha | R4 link inválido + senha fora da política |
| R5 | Não | Sim | Sim | IMPOSSÍVEL: sem cadastro nenhum link é gerado | — (não há como montar o caso) |
| R6 | Não | Sim | Não | IMPOSSÍVEL: idem | — (não há como montar o caso) |
| R7 | Não | Não | Sim | Mensagem neutra, nenhum e-mail (202) | R7/R8 não cadastrado |
| R8 | Não | Não | Não | Mensagem neutra, nenhum e-mail (202) | R7/R8 não cadastrado |

### 4.1 Transição de estados do link

| ID | De | Evento | Para | Tipo | Esperado | Teste automatizado (Jest) |
|---|---|---|---|---|---|---|
| ET1 | Gerado | Redefine a senha | Usado | Válida | 200, senha alterada | ET1 Gerado -> Usado |
| ET2 | Gerado | Passam 15 min | Expirado | Válida | Link deixa de funcionar | VL7 / ET5 |
| ET3 | Gerado | Novo link solicitado | Invalidado | Válida | Link antigo deixa de funcionar | ET3/ET6 Gerado -> Invalidado |
| ET4 | Usado | Usar de novo | — | INVÁLIDA | Bloqueado: 410 | ET4 Usado -> Usado (inválida) |
| ET5 | Expirado | Usar | — | INVÁLIDA | Bloqueado: 410 | ET5 Expirado -> Usado (inválida) |
| ET6 | Invalidado | Usar | — | INVÁLIDA | Bloqueado: 410 | ET3/ET6 Gerado -> Invalidado |

## 5. Cenários BDD (Gherkin)

Arquivo executável: `features/recuperacao_senha.feature` (rode com `npm run test:bdd`).

```gherkin
# language: pt
Funcionalidade: Recuperação de senha (RF-12)
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

  Cenário: Pedir um segundo link invalida o primeiro
    Dado um link de redefinição válido para "ana@exemplo.com"
    Quando ela solicita um novo link de recuperação
    Então o primeiro link deixa de funcionar
    E o novo link funciona

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

| # | Cenário | Cobre | Comando |
|---|---|---|---|
| G1 | Solicitar recuperação com e-mail cadastrado | EQ1, R1 (caminho feliz) | npm run test:bdd |
| G2 | Solicitar recuperação com e-mail não cadastrado | EQ3, R7, A1 | npm run test:bdd |
| G3 | Usar um link já utilizado | ET4 | npm run test:bdd |
| G4 | Usar um link expirado | VL7, ET5, R3 | npm run test:bdd |
| G5 | Informar senha fora da política | VL1, R2, A4 | npm run test:bdd |
| G6 | Pedir um segundo link invalida o primeiro | A3, ET3, ET6 | npm run test:bdd |
| G7 | Esquema do Cenário: Validar tamanho da nova senha (7, 8, 20, 64, 65) | VL1 a VL5 | npm run test:bdd |

## 6. Sessão exploratória

**Charter:** Explorar o fluxo de recuperação de senha do **<nome do sistema>**, usando múltiplas abas, botão voltar do navegador e links antigos, para descobrir falhas de segurança e de estado.
**Explorador:** <nome> | **Conta usada:** própria | **Ambiente:** <navegador, SO>
**Início:** <hh:mm> | **Fim:** <hh:mm> | **Duração:** 20 min

### Roteiro de ataques

| # | Heurística | Ação |
|---|---|---|
| 1 | Neutralidade | Pedir recuperação para e-mail inventado. A mensagem é igual à do seu e-mail real? |
| 2 | Concorrência | Pedir dois links seguidos. O primeiro ainda funciona? |
| 3 | Estado | Redefinir a senha e abrir o MESMO link de novo |
| 4 | Interrupção | No formulário de nova senha, apertar voltar e reenviar |
| 5 | Interrupção | Abrir o link em outro navegador ou aba anônima |
| 6 | Limite | Senha com exatamente o mínimo e mínimo - 1 |
| 7 | Dados estranhos | E-mail com maiúsculas, espaços nas pontas ou com + |
| 8 | Dados estranhos | Senha com emoji ou acento |
| 9 | E se...? | Clicar duas vezes rápido em Enviar |
| 10 | Tempo | Usar o link só depois de 15+ minutos (fazer no fim) |

### Notas da sessão

| Hora | Ação tentada | O que aconteceu | Observação |
|---|---|---|---|
| | | | |

## 7. Registro de defeito

| Campo | Conteúdo |
|---|---|
| ID | DEF-001 |
| Título | Link de recuperação pode ser reutilizado após redefinir a senha |
| Ambiente | <navegador e versão>, <sistema operacional>, <sistema testado> |
| Pré-condição | Conta própria cadastrada com <seu e-mail> |
| Passos | 1) Solicitar recuperação para <seu e-mail>. 2) Abrir o link e redefinir a senha. 3) Abrir o MESMO link novamente. 4) Informar outra senha válida e enviar. |
| Resultado esperado | Mensagem 'Este link é inválido ou expirou' e senha não alterada (RF-12: link de uso único) |
| Resultado obtido | Formulário de nova senha exibido e a segunda senha foi aceita |
| Evidência | evidencias/def-001.png (ou vídeo) |
| Severidade | Crítica — se o link vazar (e-mail encaminhado, histórico do navegador), qualquer pessoa assume a conta |
| Prioridade | Alta — corrigir antes da próxima release, afeta todos os usuários |
| Teste de regressão | Jest: 'ET4 Usado -> Usado (inválida)' \| Cucumber: 'Usar um link já utilizado' |

## Checklist de avaliação

| # | Critério | OK se... |
|---|---|---|
| 1 | Ambiguidades identificadas E decididas | ≥ 3 ambiguidades com decisão escrita |
| 2 | Classes de equivalência | Cada classe com representante e resultado; 'não cadastrado' com mensagem neutra |
| 3 | Valores limite | Abaixo/borda/acima para senha E expiração; 15:00 decidido |
| 4 | Tabela de decisão completa | 8 combinações listadas, impossíveis marcadas |
| 5 | Gherkin declarativo | ≥ 4 cenários, '# language: pt', mensagens iguais nos cenários 1 e 2 |
| 6 | Registro de defeito reproduzível | Passos numerados, esperado × obtido, severidade ≠ prioridade justificadas |
