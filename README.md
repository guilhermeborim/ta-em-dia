# Tá em Dia

App para controlar gastos e manutenções do carro: abastecimentos, consumo, manutenções com alerta e documentos (IPVA, licenciamento, CNH).

Monorepo com o app (Expo / React Native) e a API (NestJS + PostgreSQL). Arquitetura e planejamento em [`docs/`](docs/README.md).

## Estrutura

```
apps/mobile      app Expo (Expo Router, features com MVVM, SQLite offline-first)
apps/api         API NestJS por módulos (Prisma + PostgreSQL)
packages/shared  tipos, schemas Zod, feature flags e cálculos (km/l, manutenção, projeção)
```

## Rodando local

Requisitos: Node 24 (`.nvmrc`), pnpm 10 (`corepack enable`), Docker.

```bash
pnpm install
pnpm --filter @ta-em-dia/shared build

# API
cp apps/api/.env.example apps/api/.env
docker compose -f apps/api/docker-compose.yml up -d
pnpm --filter @ta-em-dia/api dev          # http://localhost:3000/health

# App
pnpm --filter @ta-em-dia/mobile start
```

## Comandos

| Comando          | O que faz                                    |
| ---------------- | -------------------------------------------- |
| `pnpm lint`      | ESLint em todos os pacotes                   |
| `pnpm typecheck` | TypeScript sem emitir                        |
| `pnpm test`      | Testes (Vitest no shared, Jest no api e app) |
| `pnpm build`     | Build do shared e da API                     |

## Fluxo

- Branch a partir da `main` (`feat/...`, `fix/...`), PR com CI verde, squash merge.
- Commits no padrão Conventional Commits, com escopo: `mobile`, `api`, `shared`, `sync`, `ci`, `docs`, `deps`.
- API: merge na `main` → staging → aprovação → produção (`.github/workflows/api-deploy.yml`).
- App: tag `mobile-vX.Y.Z-rc.N` → teste; tag `mobile-vX.Y.Z` → lojas (`.github/workflows/mobile-release.yml`).
