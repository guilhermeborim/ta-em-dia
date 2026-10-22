# Backlog de features

Ordem de implementação do MVP. O próximo item é o primeiro sem `[x]`. Cada item é um PR.
Para pedir ao Claude Code, use `/proxima-feature` (ver `.claude/commands/proxima-feature.md`).

Figma: arquivo `ESJceLVFjGNDdSSAvoguPo`, página "Telas — Claro". Os links abrem o frame.
Telas de referência: `docs/02-telas-e-fluxos.md`. Regras: `CLAUDE.md`.

## Fase A — Só no app, offline (sem API)

- [x] **Boas-vindas** (tela 2): [02](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=7-205), [02b](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=32-1569), [02c](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=32-1667)
- [x] **Login offline** (tela 3, só "Continuar sem login") e **Aviso sem login** (tela 4): [03a iPhone](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=7-272), [03b Android](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=32-1502), [04](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=7-340)
- [x] **Primeiro veículo** (tela 5): [05](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=7-395). Formulário, grava em `vehicles` (já existe o repositório). Pode pular.
- [x] **Permissão de notificações** (tela 6): [06](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=7-449). Tela prévia e pedido do sistema (`expo-notifications`).
- [x] **Abas e Início vazio** (telas 7b e 15 só como aba): [07b](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=8-517). `TabBar`, `VehicleSelector`, botão "+ Abastecer". As abas ainda sem tela mostram um vazio simples.
- [x] **Novo abastecimento** (tela 9): [09](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=8-762), [09b](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=33-1607). Dois de três valores preenchem o terceiro. Regra de cálculo em `packages/shared`, com teste.
- [x] **Lista de abastecimentos** (tela 8): [08](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=8-617). km/l do trecho vem de `packages/shared`.
- [x] **Início com dados** (telas 7, 7c, 7d): [07](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=8-364), [07c](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=33-1808), [07d](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=33-1724). Gasto do mês, projeção, % vs mês anterior, média km/l, toast ao salvar.
- [x] **Manutenções: lista** (tela 10): [10](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=10-874). Próximas e Feitas, sugeridas com "Ativar". Tabela `maintenance_plans`; estado do item em `shared`.
- [x] **Manutenções: plano do item** (telas 11, 11b, 11c): [11](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=10-1012), [11b](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=34-1881), [11c](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=34-1955). Detalhe com anel de progresso e previsão (`nextMaintenance`, média diária), editar intervalo, desativar lembrete.
- [x] **Registrar manutenção** (tela 12): [12](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=10-1067), [12b](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=34-2024). Tipo "Outro" salvo como atalho "Seu".
- [x] **Alertas de manutenção** (notificações locais): reagendar a cada mudança de km ou data (ver `docs/03-arquitetura.md`).
- [x] **Histórico** (tela 13): [13](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=10-1136).
- [x] **Meus veículos** (tela 16): [16](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=12-1396). Lista, adicionar e reordenar. Respeitar `docs/05-privacidade-lgpd.md` (placa nunca em log).
- [x] **Detalhe do veículo** (tela 17): [17](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=12-1454). Placa, km atual, média diária, custo/km e dados; "Atualizar km" (leitura manual do hodômetro). Abre pelo cartão da tela 16. Placa nunca em log.
- [x] **Editar, arquivar e excluir veículo** (lápis da tela 17, sem frame no Figma ainda): editar marca, modelo, ano, apelido e placa (validar a placa); arquivar; excluir com confirmação, apagando de forma lógica o que depende do veículo e cancelando os avisos dele.
- [x] **Documentos e prazos** (tela 18): [18](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=12-1527). Só datas, sem número da CNH nem foto. Lista, adicionar, editar a data e excluir; sem avisos ainda (item abaixo).
- [x] **Alertas de documentos**: notificações locais 30 e 7 dias antes de cada vencimento (reagendar como nos avisos de manutenção), banner "Avisamos 30 e 7 dias antes" da tela 18, editar a antecedência ("editar lembrete"), documentos vencidos ou perto de vencer entrando em "Próximos alertas" do Início, no selo do cartão de Meus veículos e no valor "1 vencido" de Documentos e prazos na aba Mais.
- [x] **Relatórios** (tela 14): [14](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=12-1094).
- [x] **Mais e Premium em breve** (telas 15, 21): [15](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=12-1236), [21](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=13-1521). Premium atrás de feature flag. Conta, Configurações e Ajuda avisam "Em breve" até chegarem.
- [x] **Configurações** (tela 20): [20](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=13-1446). Interruptores de notificação (manutenções, documentos, lembrar de atualizar o km a cada 15 dias), antecedência padrão dos prazos, unidades (km e litros) e "Exportar dados" (Em breve). Sem o seletor de aparência: o app é só tema claro (`apps/mobile/CLAUDE.md`).

## Fase B — Com API

- [x] **API: usuário anônimo** (`POST /v1/auth/anonymous`): módulo `auth`, Prisma, migration `init`, guard JWT global.
- [x] **App: chamar o usuário anônimo** quando houver internet: `core/api`, tokens no SecureStore, refazer a chamada se falhar.
- [ ] **API: sync** (`push` e `pull`) e o motor de sync no app. Telas: [23](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=13-1656), [24](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=13-1688).
- [ ] **Login com Google** (Android e iOS) e **Apple** (só iOS), e vincular conta. Telas: [19](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=13-1349), [19b](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=13-1399).
- [ ] **Excluir conta** (tela 22): [22](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=13-1598). App e API.
- [ ] **Exportar meus dados** (LGPD, ver `docs/05-privacidade-lgpd.md`).

## Decisões do dono (22/10/2026)

Escolhas tomadas em `docs/07-validacao-e-decisoes.md`. Cada item é um PR e pode ser feito fora da ordem das fases.

- [x] **Regras de veículos e prazos**: o texto do "Avise-me quando lançar" não promete mais nada ("Anotado!" sem aviso futuro); prazo cadastrado já dentro da janela avisa uma vez no próximo 9h (igual à manutenção); avisos de documentos de **todos** os veículos ativos; arquivar o único veículo ativo é bloqueado ("Você precisa de outro veículo ativo").
- [ ] **Limite grátis de 1 veículo**: `vehicles.max` = 1 no plano grátis (`flags.ts`), aplicado em "Adicionar veículo" e no primeiro veículo.
- [ ] **Moto**: tipo `motorcycle` no `shared`, no SQLite (migration só adiciona) e no Prisma, com ícone próprio.
- [ ] **Prazos por ano**: guardar cada prazo de documento por ano (IPVA 2026, IPVA 2027...), com histórico.
- [ ] **Seletor de data**: chip "Hoje" e calendário nativo (`@react-native-community/datetimepicker`) nos formulários de abastecimento, manutenção e prazo.
- [ ] **Reordenar arrastando**: arrastar de verdade em Meus veículos (`react-native-gesture-handler` e `react-native-reanimated`).
- [ ] **API: segurança da conta anônima**: rate limit (`@nestjs/throttler`), `POST /v1/auth/refresh` com rotação do token, job que apaga contas anônimas sem uso por 12 meses; no app, usar o refresh e reagir à volta da internet (`expo-network`).

## Como manter

- Ao terminar um item, marque `[x]` no mesmo PR da feature.
- Item novo ou fora de ordem: o dono do projeto decide. Não implemente Fase 2 ou Futuro (`docs/01-roadmap.md`).
