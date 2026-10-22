# API (NestJS)

Veja também o `CLAUDE.md` da raiz.

## Estrutura

Um módulo por domínio em `src/modules/<nome>/`: `x.module.ts`, `x.controller.ts` (rotas REST, só valida e chama o service), `x.service.ts` (regra), `x.repository.ts` (único lugar que fala com o Prisma), `dto/` e `x.service.spec.ts`.

## Regras

- Rotas versionadas em `/v1/...`; `/health` fica sem prefixo.
- DTOs e validação com schemas Zod de `@ta-em-dia/shared` quando o dado também existe no app.
- Variáveis de ambiente novas entram em `src/config/env.ts` (validação Zod) e em `.env.example`.
- Datas em UTC. Tabelas sincronizáveis têm `id`, `createdAt`, `updatedAt`, `deletedAt` e `version`; o `version` é do servidor.
- Erros com código estável (ex.: `VEHICLE_LIMIT_REACHED`), não só mensagem.
- O cliente do Prisma é gerado em `src/generated/` (fora do git) no `pnpm install` (`postinstall`). Mudou o schema? Rode `pnpm exec prisma generate` (a pasta `src/generated` não é versionada).
- Rate limit global por IP (`AppThrottlerGuard`; limites em `src/common/throttle/throttle.ts`). Rota nova que não exige token precisa de `@Throttle` mais estrito. Jobs de manutenção ficam em `src/jobs` e rodam pelo GitHub Actions, não dentro da API.
- Rotas exigem token por padrão (guard global); marque `@Public()` só o que precisa ser aberto. O `userId` vem de `@CurrentUserId()`.
- Mudou `prisma/schema.prisma`? Crie a migration (`pnpm --filter @ta-em-dia/api db:migrate`) e mantenha compatível com o app anterior.

## Comandos

```bash
docker compose up -d          # Postgres local (nesta pasta)
pnpm dev                      # http://localhost:3000/health
pnpm test                     # unitários (Jest, precisa de Node 24)
pnpm test:e2e
pnpm db:validate
```
