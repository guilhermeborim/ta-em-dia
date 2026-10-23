# Mapa colaborativo de postos (Futuro)

Ideia: um mapa que lista os postos num raio do usuário. Os próprios usuários anotam preço, qualidade e comodidades, e quem passa por ali depois vê e corrige. Funciona como um guia para o motorista, principalmente em viagem.

**Status:** Futuro. Não implemente sem pedido (ver `docs/01-roadmap.md`). Antes de implementar, atualizar `docs/05-privacidade-lgpd.md` (localização e conteúdo de usuário) e `docs/03-arquitetura.md`.

## Como funciona, de ponta a ponta

### 1. Ver o mapa

1. O usuário abre **Postos** e dá permissão de localização "enquanto usa o app" (consentimento, pedido só aqui).
2. O app mostra o mapa e os postos num raio (padrão 10 km, ajustável até 50 km). Sem permissão, o usuário busca por cidade.
3. Cada pino mostra o menor preço de gasolina e etanol, e a idade da informação ("há 2 dias").
4. Filtros: combustível, preço, aberto agora, banheiro, conveniência.
5. A lista dos postos vem do OpenStreetMap. Postos sem nenhuma informação aparecem em cinza.

### 2. Ver um posto

- Nome, bandeira, endereço, distância.
- Preços por combustível (gasolina comum, aditivada, etanol, diesel, GNV) com data e autor anônimo ("um usuário confiável").
- Avaliações em etiquetas, não em texto livre: combustível bom, combustível suspeito, banheiro limpo, tem conveniência, tem loja 24h, fila grande, atendimento bom.
- Nota geral (média das avaliações das etiquetas) e quantas pessoas confirmaram.
- Botão **Atualizar** e botão **Denunciar**.

### 3. Contribuir

- Só com **conta logada** (Google/Apple). Conta anônima vê, mas não publica.
- Preço: escolhe combustível, digita o valor. O app recusa valor fora de uma faixa plausível (ex.: R$ 2 a R$ 12).
- O usuário precisa estar a até ~300 m do posto ao publicar o preço (a localização é conferida no aparelho e só a distância vai para a API; não guardamos o trajeto).
- Etiquetas: liga ou desliga cada uma.
- Editar: ao ver uma informação desatualizada, o usuário envia a nova. Cada preço novo fica no histórico; o mapa mostra o mais recente.
- **Confirmar** ("ainda é esse preço") é um toque e renova a data da informação.
- Atalho: ao registrar um abastecimento no app, o app oferece "Compartilhar o preço deste posto?" (opt-in, desligado por padrão).

### 4. Denúncia

- Denunciar posto: não existe mais, endereço errado, duplicado.
- Denunciar informação: preço absurdo, avaliação falsa, spam, ofensa (as etiquetas fixas reduzem isso, mas nomes de posto e de lugar podem ser digitados).
- A denúncia pede um motivo da lista e, opcionalmente, uma frase.
- Com **3 denúncias de contas diferentes**, a informação some do mapa até a revisão.
- Revisão pelo dono do app num painel simples (lista de denúncias com ação: manter, remover, banir autor).
- Quem denuncia de má-fé (denúncias recusadas várias vezes) perde peso nas próximas.
- Obrigatório pelas lojas: denúncia de conteúdo de usuário e bloqueio de quem abusa (App Store 1.2, Google Play UGC).

### 5. Reputação

Cada usuário tem uma pontuação interna, nunca pública com nome:

| Evento                                           | Efeito          |
| ------------------------------------------------ | --------------- |
| Preço confirmado por outro usuário em até 7 dias | + pontos        |
| Preço dentro de 10% da mediana da região         | + pontos        |
| Informação removida depois de denúncia           | − muitos pontos |
| Preço muito fora da mediana, repetido            | − pontos        |
| Conta nova (menos de 7 dias)                     | peso baixo      |

- O **peso** da pontuação decide quanto o preço do usuário vale: contas de alta reputação sobrescrevem na hora; contas novas precisam de uma confirmação para aparecer em destaque.
- Faixas visíveis ao próprio usuário: Iniciante, Colaborador, Confiável. Sem ranking público e sem recompensa em dinheiro (evita fraude).
- Abaixo de um limite: o usuário perde a permissão de publicar. Banimento manual no painel.

### 6. Regras de dados

- O que é publicado é o **posto, o preço, as etiquetas e a data**. Nada de nome, foto ou e-mail do autor para outros usuários.
- O app guarda o autor internamente (para reputação e moderação). Excluir conta anonimiza as contribuições (mantém o preço, remove o vínculo).
- Sem fotos e sem texto livre no início (menos moderação, menos LGPD).
- Preço é informação do posto, não dado pessoal. A localização do usuário nunca é publicada.

## Tecnologias

| Parte                    | Opção principal                                                                  | Alternativas                                        |
| ------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------- |
| Mapa no app              | `@maplibre/maplibre-react-native` (precisa de development build, já temos)       | `react-native-maps` (Apple Maps / Google Maps)      |
| Mapas (tiles)            | Protomaps (PMTiles) hospedado num bucket Cloudflare R2                           | MapTiler (plano grátis com limite)                  |
| Postos (cadastro base)   | OpenStreetMap (`amenity=fuel`), carga periódica por Overpass para a nossa tabela | Google Places (pago por uso)                        |
| Busca por raio           | PostgreSQL + PostGIS no Neon (índice espacial)                                   | Cálculo por caixa de coordenadas sem PostGIS        |
| Localização              | `expo-location` (só enquanto usa o app)                                          | —                                                   |
| API                      | A mesma NestJS (módulo `stations`) e Prisma                                      | —                                                   |
| Moderação                | Tabelas `reports` e `user_reputation` + painel web mínimo (rota protegida)       | Ferramenta pronta paga                              |
| Antiabuso                | Rate limit (já existe), faixa de preço, distância ao posto, mediana por região   | Play Integrity / App Attest (grátis, mais trabalho) |
| Notificação de resultado | Expo Push (grátis)                                                               | —                                                   |
| Cache de leitura         | Cache em memória na API; Redis só se for preciso                                 | Upstash Redis (plano grátis)                        |

Regras do projeto que continuam valendo: offline-first (o app guarda os postos vistos e as contribuições na fila `outbox`), UUID v7 no app, exclusão lógica, `userId` sempre do token, recurso atrás de feature flag (`stations.map`, `stations.contribute`).

## Custo (valores de referência, conferir antes de decidir)

| Item                        | Começo (fases 1 e 2)                     | Com crescimento                                                  |
| --------------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| Mapa e tiles (R2 + PMTiles) | R$ 0 (10 GB grátis, sem tarifa de saída) | Poucos reais por mês acima do grátis                             |
| Postos (OSM / Overpass)     | R$ 0 (uso moderado, carga offline)       | R$ 0; evitar chamar o Overpass a cada usuário                    |
| Banco (Neon + PostGIS)      | R$ 0 (0,5 GB)                            | Plano pago do Neon (ordem de US$ 19/mês) quando passar do grátis |
| API (Render)                | R$ 0, mas dorme após inatividade         | Plano pago de entrada (ordem de US$ 7/mês) para não dormir       |
| Moderação                   | Seu tempo                                | Tempo cresce com os usuários; é o custo real                     |
| Push                        | R$ 0                                     | R$ 0                                                             |
| Google Places (se usar)     | Não usar                                 | Cobrado por consulta; fugir                                      |

O maior custo não é dinheiro: é **moderar** e **conseguir usuários suficientes** para o mapa não ficar vazio.

## Caminho mais barato, em fases

Cada fase entrega valor sozinha e custa R$ 0.

**Fase A, só o seu histórico (sem comunidade)**

- Seus abastecimentos já guardam posto e preço. O app mostra "seus postos": mais barato que você achou, última vez, média.
- Sem mapa, sem API nova. Aproveita o que já existe.

**Fase B, postos próximos (OpenStreetMap)**

- `expo-location` e `maplibre`, tiles Protomaps no R2.
- Carga dos postos do Brasil do OSM na tabela `stations` (uma vez por mês), consulta por raio com PostGIS.
- Só leitura: o mapa lista postos, endereço e distância. Sem preço de terceiros.
- Seu preço aparece no pino quando você já abasteceu ali.

**Fase C, compartilhar preço (anônimo, só preço e data)**

- Opt-in ao salvar um abastecimento: "compartilhar o preço deste posto".
- Só logado. Faixa de preço, distância ao posto, rate limit.
- Mapa mostra o preço mais recente, a data e quantas confirmações.
- Denunciar posto e preço. Painel mínimo de revisão.
- Flag `stations.contribute` ligada para um grupo pequeno primeiro.

**Fase D, etiquetas e reputação**

- Etiquetas fixas (banheiro, conveniência, combustível bom ou suspeito).
- Pontuação, confirmações, faixas, perda de permissão.
- Banimento e apelo.

**Fase E, só com usuários de sobra**

- Fotos, comentários e ranking regional. Aqui a moderação cresce e pode haver custo. Decidir com dados de uso.

## Decisões em aberto (dono do projeto)

- O app permite editar o nome ou o endereço do posto, ou só o preço e as etiquetas? Recomendação: só preço e etiquetas no início; endereço vem do OSM e é corrigido lá.
- Mostrar autores como "usuário confiável" ou esconder totalmente? Recomendação: esconder; mostrar só a data e as confirmações.
- Dar benefício Premium a quem contribui (ex.: sem anúncios)? Recomendação: não no começo, para evitar fraude.
- Quando abrir a Fase C: depois de quantos usuários ativos? Recomendação: decidir com dados de uso, a partir de algumas centenas de usuários ativos por mês numa mesma cidade.
