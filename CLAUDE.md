# Tá em Dia

App para controlar gastos e manutenções do carro (abastecimentos, consumo, manutenções com alerta, documentos). Monorepo pnpm + Turborepo: `apps/mobile` (Expo), `apps/api` (NestJS + Prisma + PostgreSQL), `packages/shared` (`@ta-em-dia/shared`).

Use a skill `i-have-adhd` em todas as respostas (invoque `/i-have-adhd` no início da sessão).

Responda e escreva textos de interface em português (BR). Código, nomes e commits em inglês técnico ou português, seguindo o que já existe no arquivo.

## Leia antes de decidir

- `docs/01-roadmap.md`: o que é MVP, Fase 2 e Futuro. Não implemente algo de Fase 2 ou Futuro sem pedido.
- `docs/02-telas-e-fluxos.md`: telas e fluxos que o designer recebe.
- `docs/03-arquitetura.md`: decisões de arquitetura. Mudou uma decisão, atualize o doc no mesmo PR.
- `docs/06-backlog.md`: ordem das próximas features (o que já foi feito sai de lá; links antigos do Figma ficam no git). Use `/proxima-feature` para pegar o próximo item.
- `docs/07-validacao-e-decisoes.md`: o que ainda precisa ser testado no aparelho e o que está esperando decisão do dono do projeto. Não decida sozinho o que está listado em "Decisões em aberto".
- `docs/05-privacidade-lgpd.md`: dados pessoais e LGPD. Não colete dado novo (CNH, foto de documento, localização) sem decidir ali.

## Comandos

```bash
pnpm install
pnpm turbo run lint typecheck test build      # o mesmo que o CI roda
pnpm --filter @ta-em-dia/api test:e2e
pnpm format                                    # Prettier
```

Node 24 (`.nvmrc`). O NestJS 12 é só ESM e o Jest da API roda com `--experimental-vm-modules`; em Node 22 os testes da API falham.

## Regras do projeto

- Formulários: campo obrigatório mostra `*` vermelho no rótulo; o que não tem `*` é opcional. Ver `apps/mobile/CLAUDE.md`.
- Offline-first: as telas do app leem só o SQLite local; a API é backup e sync, nunca a fonte de leitura das telas.
- Regras de negócio (km/l, projeção, próxima manutenção, flags) ficam em `packages/shared`, puras e com teste. Não duplique no app nem na API.
- IDs são UUID v7 gerados no app. Exclusão é lógica (`deleted_at`), nunca `DELETE` em tabela sincronizável.
- Toda query da API filtra pelo `userId` do token, nunca do corpo da requisição.
- Migrations compatíveis com a versão anterior do app: adicionar antes de usar, remover só depois.
- Recurso que pode virar Premium nasce atrás de feature flag (`packages/shared/src/flags.ts`).
- Login: Google em iOS e Android; Apple só no iOS; "Continuar sem login" cria usuário anônimo na API.
- Sem serviço pago: só planos gratuitos. Não adicione dependência de serviço pago sem perguntar.
- Nunca commite segredos. `.env.example` é versionado, `.env` não.

## Fluxo de trabalho

- Branch a partir da `main`: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`, `ci/`. PR pequeno, CI verde, squash merge.
- Commits no padrão Conventional Commits com escopo: `mobile`, `api`, `shared`, `sync`, `ci`, `docs`, `deps` (o commitlint rejeita outros). Ex.: `feat(mobile): formulário de abastecimento`.
- Antes de abrir PR, rode `pnpm turbo run lint typecheck test build`.
- Ao terminar uma feature, registre em `docs/07-validacao-e-decisoes.md`, no mesmo PR, tudo que ficou sem validação no aparelho (checklist `[ ]` na seção 2, com o PR) e toda escolha que cabe ao dono do projeto (seção 3, com as opções e a sua recomendação): texto escrito por você, tela sem frame no Figma, desvio do Figma, comportamento assumido, dependência nativa evitada. Se não houver nada, não acrescente nada. Atualize o item se uma decisão já foi tomada.
- Deploy da API e releases do app são por workflow do GitHub (ver `docs/03-arquitetura.md`); não faça deploy manual.
