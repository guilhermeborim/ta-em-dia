@AGENTS.md

# App (Expo) — regras do projeto

Veja também o `CLAUDE.md` da raiz. O `AGENTS.md` acima veio do template do Expo e vale como guia de comandos e docs do SDK; o que está abaixo é específico deste projeto.

## Arquitetura: features com MVVM

- `src/app/` tem só rotas (Expo Router); cada arquivo reexporta a View da feature.
- `src/features/<feature>/` com `views/`, `viewmodels/`, `models/`, `components/` e `__tests__/`.
- **View**: só JSX e eventos; importa apenas o próprio ViewModel e `src/ui`.
- **ViewModel**: hook `useXViewModel` com estado, validação e ações; devolve textos já formatados.
- **Model**: repositórios (SQLite) e services (regra); não importa React.
- `src/core/` (db, sync, api, auth, flags, notifications) e `src/ui/` (design system) são compartilhados. Features não importam umas das outras; se precisarem, suba para `core/` ou `ui/`.

## Regras

- A tela nunca chama a API nem o SQLite direto: View → ViewModel → Model. Gravação local vai para a `outbox` do sync.
- Cálculos vêm de `@ta-em-dia/shared`; não reimplemente km/l, projeção etc.
- Recurso Premium: `useFlag('<chave>')`, nunca `if (plan === 'premium')`.
- Botão "Entrar com Apple" só no iOS (`Platform.OS === 'ios'`).
- Textos de interface em português (BR); valores em R$ com `Intl.NumberFormat('pt-BR')`.
- Campo obrigatório sempre leva `*` vermelho depois do rótulo (`required` no `TextField`) e mostra a mensagem de erro abaixo da caixa (`error`). Sem `*`, o campo é opcional. A validação vive no Model.
- Só tema claro (sem tema escuro). Suporte à fonte grande do sistema. Alvos de toque ≥ 44 pt.
- Cores, tipografia, raios e sombras vêm de `src/ui` (tokens do Figma). Não escreva cor ou tamanho de fonte solto nas telas.
- Dependência nativa nova: `npx expo install <pacote>` (versão compatível com o SDK) e avise que exige development build.
- Segredos e tokens em `expo-secure-store`, nunca em AsyncStorage ou SQLite.

## Ambientes

`app.config.ts` lê `APP_ENV` (`development`, `staging`, `production`) e troca nome, bundle id e API. Builds: `eas.json` (perfis com o mesmo nome).

## Comandos

```bash
pnpm start          # Expo dev server
pnpm typecheck
pnpm lint
pnpm test           # Jest + jest-expo
```
