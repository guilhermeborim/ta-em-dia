# @ta-em-dia/shared

Código usado pelo app e pela API. Veja também o `CLAUDE.md` da raiz.

- Só funções puras, tipos, schemas Zod e constantes. Sem acesso a banco, rede, React ou NestJS.
- Toda regra de cálculo tem teste em `src/__tests__` (Vitest). Mudou uma fórmula, mude o teste e o `docs/03-arquitetura.md`.
- `src/flags.ts` é a fonte dos padrões de feature flags por plano; a API pode sobrescrever.
- Compila para CommonJS em `dist/` (`pnpm --filter @ta-em-dia/shared build`); o app e a API dependem do build.
