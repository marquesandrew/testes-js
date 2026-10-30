## O que muda e por quê
<!-- 1–3 linhas. Link para a issue/requisito, se houver. -->

## Definition of Done (marque o que é verdade)
- [ ] O CI está verde (lint, testes, cobertura, quality gate, auditoria, E2E)
- [ ] Todo comportamento novo tem teste; todo bug corrigido tem um teste que falharia sem a correção
- [ ] Nenhum `.only` / `.skip` / `xit` / `retry` adicionado para "fazer passar"
- [ ] A cobertura não caiu (se subiu: rodei `npm run quality:baseline`)
- [ ] Se mudei `quality/politica.json`: expliquei aqui o motivo
- [ ] Se é release: `package.json`, `CHANGELOG.md` e a tag `vX.Y.Z` batem

## Risco e como foi validado
<!-- O que pode quebrar? O que você rodou além do CI? -->
