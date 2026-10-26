# Backlog de features

O próximo item é o primeiro sem `[x]`. Cada item é um PR. Itens concluídos saem daqui; o histórico (inclusive os links dos frames do Figma de cada tela) fica no git: `git log -p docs/06-backlog.md`.
Para pedir ao Claude Code, use `/proxima-feature` (ver `.claude/commands/proxima-feature.md`).

Figma: arquivo `ESJceLVFjGNDdSSAvoguPo`, página "Telas — Claro". Telas de referência: `docs/02-telas-e-fluxos.md`. Regras: `CLAUDE.md`.

## Fase C — Registro rápido de abastecimento

Dor: no posto o usuário tem uns 10 segundos e o formulário pede tudo digitado. Decidido pelo dono em 26/10/2026: nenhum dado do formulário sai; no posto o usuário **fala** em vez de digitar; o que faltar vira **rascunho** e o app lembra de completar; o posto é identificado pela localização com um **ID único** (OpenStreetMap). A voz **substitui** a foto da bomba (OCR). **Não existe capacidade do tanque** (nem campo nem limite): as regras usam a conta valor ÷ litros entre R$ 2 e R$ 12. Sem serviço pago: voz e localização rodam no aparelho.

Plano completo: doc "Abastecimento por voz e posto único" (Claude Docs do projeto). Essas fases puxam para o MVP o que o roadmap deixava na Fase 2; os docs já refletem isso (`docs/01`, `02`, `03` e `05`).

- [ ] **C4. Falar o abastecimento**: `expo-speech-recognition` (reconhecimento de voz do sistema, grátis; no aparelho quando houver o pacote de idioma, senão o servidor da Apple ou do Google: fechar a decisão 3.30 de `docs/07-validacao-e-decisoes.md` antes de começar; development build). Botão "Falar" na tela Abastecer, texto aparece enquanto fala, preenche e salva sozinho com resumo de 5 s e "Desfazer" e "Editar"; pergunta quando for ambíguo; faltou dado vira rascunho (C1); falha de validação deixa o campo em vermelho e não salva sozinho. Sem microfone, sem permissão ou com barulho, o formulário atual continua na mesma tela. Textos de permissão do sistema em português. Registrar em `docs/07-validacao-e-decisoes.md` a dependência nativa nova.
- [ ] **C5. API: postos** (módulo `places`): lista de postos do OpenStreetMap (Overpass, `amenity=fuel`) por geohash de 5 caracteres, com cache; sem serviço pago.
- [ ] **C6. App: posto único pela localização**: `expo-location` ("durante o uso", pedida só na tela Abastecer), tabela `stations` (`id` UUID v7, `osm_id` opcional, `name`, `brand`, `street`, `lat`, `lng`, `deleted_at`) e `station_id` opcional em `fuel_entries` (`station_name` continua para os registros antigos). Sugere o posto mais perto num raio de ~150 m, com chip "Trocar" (e o segundo mais perto em outro chip); aparece "Shell · Av. da Pista", nunca o ID. Posto fora do OpenStreetMap vira posto local com coordenada e UUID. Postos da região ficam guardados no aparelho para uso sem internet. Sem permissão: sugere os postos já usados, como hoje. Média de preço por posto no app.
- [ ] **C7. Aviso ao chegar no posto** (opcional, desligado por padrão, "sempre"): geofence nos 20 postos mais usados ou próximos, notificação depois de ~2 min parado ("Abastecendo no Shell · Av. da Pista? Registre agora."), no máximo 1 por posto a cada 12 h e nenhuma se já houve abastecimento hoje; tocar abre Abastecer. Segue `docs/03-arquitetura.md` ("Localização em segundo plano"). Declarações e vídeos para Apple e Google; plano B se recusarem o "sempre": sem esse aviso, o resto do fluxo funciona igual.

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
