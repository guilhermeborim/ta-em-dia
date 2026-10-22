---
description: Implementa a próxima feature do backlog (ou a indicada) e abre o PR
argument-hint: [item do backlog, opcional]
---

Implemente uma feature do Tá em Dia seguindo o `docs/06-backlog.md`.

Item pedido: $ARGUMENTS
Se estiver vazio, use o primeiro item sem `[x]` da Fase A (se a Fase A acabou, pare e pergunte).

## Passos

1. Leia `CLAUDE.md`, `apps/mobile/CLAUDE.md` (se existir), `docs/02-telas-e-fluxos.md`, `docs/03-arquitetura.md` e `docs/05-privacidade-lgpd.md`. Leia também os arquivos da feature mais parecida que já existe em `apps/mobile/src/features/`, para seguir o mesmo padrão (View, ViewModel, Model).
2. Abra no Figma os frames do item (links no backlog) com `get_design_context`. Se a skill `figma-design-to-code` não existir, siga sem ela. Se houver telas para iPhone e Android, trate a diferença com `Platform.OS`.
3. Reuse os componentes de `apps/mobile/src/ui`. Tokens de cor, fonte e espaçamento vêm de lá. Não crie componente novo se já existir um parecido; se criar, adicione também ao catálogo `features/devtools/views/ComponentsView.tsx`.
4. Regras de negócio (cálculos, previsões) ficam em `packages/shared`, puras e com teste. Dados só no SQLite local, com UUID v7, exclusão lógica e `outbox`. Migration nova só adiciona.
5. Não colete dado novo sem estar em `docs/05-privacidade-lgpd.md`. Não implemente Fase 2 ou Futuro.
6. Escreva testes para a lógica (Models e ViewModels).
7. Se houver emulador aberto, tire screenshot e compare com o Figma. Se não houver, diga isso no PR.
8. Rode `pnpm turbo run lint typecheck test build` e corrija o que falhar.
9. Marque o item como `[x]` no `docs/06-backlog.md` e atualize os docs que a feature mudou, no mesmo PR.
10. Crie o branch a partir da `main` (`feat/...`), faça commits Conventional Commits com escopo (`mobile`, `shared`, `docs`...), faça push e abra o PR com `gh pr create`. Se o `gh` não estiver disponível, faça o push e diga como abrir o PR.
11. Não faça merge. Ao final, responda em português: o que foi feito, o que ficou de fora, o que conferir no aparelho e qual é o próximo item do backlog.

Um PR por item. Se o item for grande demais, divida em dois PRs e avise.
