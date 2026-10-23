# Roadmap: MVP, Fase 2 e Futuro

O MVP entrega o essencial para controlar um carro: veículos, abastecimentos, manutenções com alerta e documentos com lembrete, tudo funcionando offline. A Fase 2 adiciona o que depende de APIs externas, localização e monetização. O Futuro guarda as ideias maiores.

## Premissas

- **Stack:** Expo (React Native) no app, API própria em NestJS + PostgreSQL, monorepo no GitHub.
- **Offline-first:** dados ficam no SQLite do celular e sincronizam com a API quando há internet.
- **Login:** Google (iOS e Android), Apple (só iOS) ou "Continuar sem login" (conta anônima por instalação, vinculada depois).
- **Custo zero agora:** só planos gratuitos. As contas das lojas são o primeiro gasto inevitável (Apple US$ 99/ano, Google US$ 25 uma vez).
- **Time:** um desenvolvedor.
- **Monetização:** app grátis no lançamento, Premium já preparado por feature flags.

**Critério para algo entrar no MVP:** funciona sem serviço pago, sem permissão sensível e sem API de terceiros instável.

## MVP

| Área                  | O que entra                                                                                                                                                                   | Observação                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Conta                 | Login Google (iOS e Android), Sign in with Apple (só iOS), "Continuar sem login", vincular conta anônima depois, sair, excluir conta                                          | No iOS, a Apple exige Sign in with Apple quando há login com Google; no Android não há botão da Apple. Exclusão de conta no app é obrigatória |
| Onboarding            | Cadastro do primeiro veículo, permissão de notificações                                                                                                                       | Localização não é pedida no MVP                                                                                                               |
| Veículos              | Múltiplos veículos (carro e moto; combustão/flex), marca, modelo, ano, placa, apelido, hodômetro inicial                                                                      | Grátis: 1 veículo, aplicado já no lançamento pela flag `vehicles.max`. Sem foto do veículo (ver Futuro)                                       |
| Hodômetro             | Atualização manual e automática a cada abastecimento; média diária de km calculada                                                                                            | Base para prever manutenções                                                                                                                  |
| Abastecimentos        | Cadastro manual: data, km, litros, preço/litro, total, combustível, tanque cheio (opcional), posto padronizado (sugere os postos que você já usou e reaproveita o mesmo nome) | Foto da bomba/OCR fica para a Fase 2. O posto padronizado prepara o "mapa de postos" (ver `docs/08-mapa-de-postos.md`)                        |
| Resumo de consumo     | Média do período (km/l), média exata quando há dois tanques cheios, custo por km, gasto do mês, projeção do mês, comparação com mês anterior                                  | A média do período funciona com abastecimento parcial; a exata só entre dois tanques cheios                                                   |
| Manutenções           | Cadastro de serviço feito (tipo, data, km, custo, oficina, nota) e plano com intervalo por km e/ou tempo                                                                      | Itens prontos: óleo, filtros, pneus, freios, correia, alinhamento, revisão e "Outro" (nome digitado pelo usuário, salvo como atalho)          |
| Alertas de manutenção | Notificação local quando faltar X km ou X dias, o que vier primeiro                                                                                                           | km previsto = km atual + média diária × dias                                                                                                  |
| Documentos            | Lembretes de IPVA, licenciamento e seguro; validade da CNH com alerta                                                                                                         | Datas digitadas pelo usuário                                                                                                                  |
| Histórico             | Linha do tempo por veículo com abastecimentos, manutenções e gastos, com filtros                                                                                              |                                                                                                                                               |
| Gráficos básicos      | Gasto mensal (últimos 6 a 12 meses) e consumo km/l ao longo do tempo                                                                                                          |                                                                                                                                               |
| Sync e backup         | SQLite local + sync com a API para usuários logados e anônimos                                                                                                                | Backup na nuvem pode virar Premium depois                                                                                                     |
| Configurações         | Unidades, moeda (R$), notificações, privacidade, termos                                                                                                                       |                                                                                                                                               |
| Base Premium          | Feature flags e tela "Premium em breve", sem cobrança                                                                                                                         | Ver última seção                                                                                                                              |

Fora do MVP de propósito: localização, widget, FIPE, multas, OCR, pagamentos.

## Fase 2

Começa depois do MVP estável nas lojas e traz integrações, localização e o Premium cobrado.

| Funcionalidade       | O que é                                                                                                                                  | Dependência                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Lembrete no posto    | Ao chegar num posto, notificação "Abasteceu? Registre agora"                                                                             | Localização em segundo plano com geofence, opt-in, OpenStreetMap para postos      |
| Foto da bomba (OCR)  | Tirar foto do visor e preencher litros, preço e total                                                                                    | OCR no aparelho (ML Kit / Vision), sem custo por uso                              |
| Widget               | Widget iOS/Android com próximo alerta, km/l e gasto do mês                                                                               | Expo config plugin + código nativo do widget                                      |
| Tabela FIPE          | Valor de mercado do veículo e histórico do valor                                                                                         | API pública da FIPE, com cache na nossa API                                       |
| Multas               | Consulta ou registro de multas por placa/RENAVAM                                                                                         | Fontes oficiais variam por estado; começar com cadastro manual                    |
| Relatórios avançados | Comparação entre veículos e entre anos, categorias de gasto                                                                              |                                                                                   |
| Exportar PDF/CSV     | Relatório do veículo para venda ou prestação de contas                                                                                   | Candidato a Premium                                                               |
| Premium cobrado      | Assinatura via App Store e Google Play                                                                                                   | RevenueCat (grátis até certo faturamento) ou compras nativas                      |
| Outros gastos        | Estacionamento, pedágio, lavagem, seguro como lançamentos                                                                                |                                                                                   |
| Compartilhar veículo | Duas pessoas no mesmo carro (família)                                                                                                    | Exige permissões na API                                                           |
| Custo total do carro | Custo por mês e por km somando combustível, manutenção, IPVA, seguro e outros gastos                                                     | Usa os dados que já existem; depende de "Outros gastos" para ficar completo       |
| Etanol x gasolina    | Compara os dois combustíveis com o seu consumo real (km/l de cada um) e diz qual compensa                                                | Precisa de abastecimentos de cada combustível; sem API externa                    |
| Check-up pré-viagem  | Lista de itens antes de viajar (pneus, óleo, freios, luzes, palhetas, estepe, documentos); os itens que o app já conhece vêm preenchidos | Sem localização e sem API externa; reaproveita alertas de manutenção e documentos |

## Futuro

Ideias sem data, avaliadas depois de medir o uso real.

| Ideia                         | O que é                                                                                                                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Carro elétrico e híbrido      | Recargas em kWh, custo por km elétrico, autonomia, eletropostos                                                                                          |
| Adesivo do vidro              | Etiqueta/QR no para-brisa com a próxima troca de óleo, ou leitura do adesivo da oficina por foto                                                         |
| NFC-e / nota fiscal           | Ler QR da nota do posto e importar o abastecimento                                                                                                       |
| Integração OBD-II             | Ler hodômetro e alertas do carro por Bluetooth                                                                                                           |
| Oficinas parceiras            | Agendamento e orçamento de manutenção                                                                                                                    |
| Comparar preço de combustível | Preços reportados pela comunidade perto do usuário                                                                                                       |
| Versão web                    | Painel para ver relatórios no computador                                                                                                                 |
| Frotas                        | Plano para pequenas empresas com vários motoristas                                                                                                       |
| Fotos do veículo e da nota    | Foto no cartão do veículo e anexo de foto da nota (limite `attachments.max`, bucket privado)                                                             |
| Mapa colaborativo de postos   | Mapa de postos num raio, com preço e avaliações dos usuários, denúncia e reputação. Detalhes, tecnologias, custos e fases em `docs/08-mapa-de-postos.md` |

## Premium por feature flags

Tudo é grátis no lançamento; cada recurso candidato a Premium já nasce atrás de uma flag, então cobrar depois é mudar configuração, não código.

| Recurso                            | Grátis (sugestão)          | Premium (sugestão)             | Flag               |
| ---------------------------------- | -------------------------- | ------------------------------ | ------------------ |
| Veículos                           | 1 veículo                  | Mais veículos                  | `vehicles.max`     |
| Backup na nuvem e troca de celular | Só local, ou sync limitado | Sync completo                  | `sync.cloud`       |
| Relatórios avançados               | Mês atual e anterior       | Todo o histórico, comparativos | `reports.advanced` |
| Exportar PDF/CSV                   | —                          | Sim                            | `export.pdf`       |
| Lembrete no posto                  | —                          | Sim                            | `geo.fuelReminder` |
| Widget                             | 1 widget simples           | Widgets extras                 | `widget.extra`     |
| FIPE                               | Valor atual                | Histórico do valor             | `fipe.history`     |
| Anexos (Futuro)                    | 5 fotos de nota            | Ilimitado                      | `attachments.max`  |
| Anúncios                           | —                          | Sem anúncios (se houver)       | `ads.off`          |

As flags vêm da API (`GET /v1/config`) por plano, com valores padrão embutidos no app (`packages/shared/src/flags.ts`) para funcionar offline.

O limite de veículos do plano grátis já vale no lançamento (1). **Decisão em aberto:** os demais limites do plano grátis e o preço (definir na Fase 2, com dados de uso).
