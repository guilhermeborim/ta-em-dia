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
- [ ] **Histórico** (tela 13): [13](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=10-1136).
- [ ] **Meus veículos e detalhe** (telas 16, 17): [16](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=12-1396), [17](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=12-1454). Respeitar `docs/05-privacidade-lgpd.md` (placa nunca em log).
- [ ] **Documentos e prazos** (tela 18): [18](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=12-1527). Só datas, sem número da CNH nem foto.
- [ ] **Relatórios** (tela 14): [14](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=12-1094).
- [ ] **Mais, Configurações e Premium em breve** (telas 15, 20, 21): [15](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=12-1236), [20](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=13-1446), [21](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=13-1521). Premium atrás de feature flag.

## Fase B — Com API

- [ ] **API: usuário anônimo** (`POST /v1/auth/anonymous`) e o app chamando quando houver internet.
- [ ] **API: sync** (`push` e `pull`) e o motor de sync no app. Telas: [23](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=13-1656), [24](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=13-1688).
- [ ] **Login com Google** (Android e iOS) e **Apple** (só iOS), e vincular conta. Telas: [19](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=13-1349), [19b](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=13-1399).
- [ ] **Excluir conta** (tela 22): [22](https://www.figma.com/design/ESJceLVFjGNDdSSAvoguPo/Ta-em-Dia?node-id=13-1598). App e API.
- [ ] **Exportar meus dados** (LGPD, ver `docs/05-privacidade-lgpd.md`).

## Como manter

- Ao terminar um item, marque `[x]` no mesmo PR da feature.
- Item novo ou fora de ordem: o dono do projeto decide. Não implemente Fase 2 ou Futuro (`docs/01-roadmap.md`).
