# Backlog de features

O próximo item é o primeiro sem `[x]`. Cada item é um PR. Itens concluídos saem daqui; o histórico (inclusive os links dos frames do Figma de cada tela) fica no git: `git log -p docs/06-backlog.md`.
Para pedir ao Claude Code, use `/proxima-feature` (ver `.claude/commands/proxima-feature.md`).

Figma: arquivo `ESJceLVFjGNDdSSAvoguPo`, página "Telas — Claro". Telas de referência: `docs/02-telas-e-fluxos.md`. Regras: `CLAUDE.md`.

## Fase C — Registro rápido de abastecimento

Dor: no posto o usuário tem uns 10 segundos e o formulário pede tudo digitado. Decidido pelo dono em 26/10/2026: nenhum dado do formulário sai; no posto o usuário **fala** em vez de digitar; se a fala não trouxer tudo, nada é salvo: o app mostra o que falta e leva o cursor ao campo (não existe rascunho, decidido em 26/10/2026); o posto é identificado pela localização com um **ID único** (OpenStreetMap). A voz **substitui** a foto da bomba (OCR). **Não existe capacidade do tanque** (nem campo nem limite): as regras usam a conta valor ÷ litros entre R$ 2 e R$ 12. Sem serviço pago: voz e localização rodam no aparelho.

Plano completo: doc "Abastecimento por voz e posto único" (Claude Docs do projeto). Essas fases puxam para o MVP o que o roadmap deixava na Fase 2; os docs já refletem isso (`docs/01`, `02`, `03` e `05`).

## Fase B — Com API

- [ ] **Exportar meus dados** (LGPD, ver `docs/05-privacidade-lgpd.md`).

## Decisões do dono (23/10/2026)

Escolhas tomadas sobre os itens 3.9 a 3.23 de `docs/07-validacao-e-decisoes.md`. Cada item é um PR.

### Para implementar

- [ ] **Ajuda e contato, Termos e Privacidade**: trocar o "Em breve" por telas ou links. Depende do dono: e-mail ou página de suporte e as URLs públicas (`docs/05-privacidade-lgpd.md`, checklist antes de publicar).

### Decididas, sem trabalho

- **Relatórios (3.9)**: "Ano" são os últimos 12 meses; em "Mês" o gráfico mostra também o mês anterior; Documentos não guarda valor (sem a categoria do Figma); o custo por km não inclui manutenção.
- **Configurações (3.10)**: o app é só tema claro e o Figma não precisa mudar; as unidades são só km e litros e a seta do Figma fica; antecedência padrão vale só para prazos novos; o pedido de permissão do sistema fica como está; "Exportar dados" fica para a Fase B.
- **Telas sem frame no Figma (3.11)**: aprovadas como estão (Atualizar km, Editar veículo, prazo, Antecedência, confirmações de exclusão, seletor de data).
- **Textos (3.12)**: aprovados como estão.
- **Detalhes visuais (3.16)**: as cores da placa Mercosul ficam; o restante (Bricolage ExtraBold no Premium, cores dos gráficos) fica como está.
- **Rate limit (3.23)**: manter os limites; olhar os 429 nos logs depois do lançamento.

## Como manter

- Ao terminar um item, apague-o daqui no mesmo PR da feature (o histórico fica no git).
- Item novo ou fora de ordem: o dono do projeto decide. Não implemente Fase 2 ou Futuro (`docs/01-roadmap.md`) sem pedido.
