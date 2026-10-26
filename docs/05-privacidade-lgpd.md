# Privacidade, segurança e LGPD

Decisões sobre dados pessoais do Tá em Dia. Não substitui revisão jurídica: antes de publicar nas lojas, um advogado deve revisar a Política de Privacidade e os Termos.

## Princípio: coletar o mínimo

O melhor jeito de proteger um dado é não ter o dado. O MVP **não guarda** número da CNH, foto de documento, CPF nem endereço da pessoa. Microfone e localização são usados só na tela Abastecer (e a localização, no aviso ao chegar no posto, se a pessoa ligar), com consentimento, e nenhum dos dois é guardado como dado da pessoa (ver "Microfone e localização"). Documentos são só lembretes com data (IPVA, licenciamento, seguro, validade da CNH), como em `docs/01-roadmap.md`.

## Mapa dos dados

| Dado                             | Onde fica                                                           | Sensibilidade | Tratamento                                                                                       |
| -------------------------------- | ------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------ |
| E-mail e nome (Google/Apple)     | API (`users`) e aparelho (`app_settings`, só para mostrar na Conta) | Média         | Só o que o provedor entrega; nunca em log; some do aparelho ao sair da conta                     |
| Placa do veículo                 | SQLite e API                                                        | Média         | Opcional; nunca em log, analytics ou mensagem de erro                                            |
| Marca, modelo, ano, km           | SQLite e API                                                        | Baixa         | Texto simples                                                                                    |
| Abastecimentos e manutenções     | SQLite e API                                                        | Baixa         | Texto simples                                                                                    |
| Validade da CNH (só a data)      | SQLite e API                                                        | Média         | Sem número da CNH, sem foto                                                                      |
| Tokens e segredo anônimo         | `expo-secure-store`                                                 | Alta          | Keychain (iOS) / Keystore (Android)                                                              |
| Refresh token                    | API (`refresh_tokens`)                                              | Alta          | Só o hash; revogável                                                                             |
| Push token                       | API (`devices`)                                                     | Média         | Apagado ao sair ou excluir a conta                                                               |
| Fotos de nota (Premium futuro)   | Armazenamento de arquivos                                           | Média         | Bucket privado, URL assinada e curta, nunca público                                              |
| Fala do abastecimento (Fase C)   | Reconhecimento do sistema (Apple/Google), pela rede                 | Média         | O app descarta o áudio; só o texto interpretado vira dado do abastecimento                       |
| Localização do usuário (Fase C)  | Só na memória do aparelho, na tela Abastecer                        | Alta          | Não é guardada nem enviada; serve para achar o posto mais perto                                  |
| Aviso no posto (C7)              | Só no aparelho: geofences do sistema e `app_settings`               | Média         | Postos vigiados e centro da célula de ~5 km; hora do último aviso por posto, só das últimas 12 h |
| Geohash de 5 caracteres (Fase C) | API (`places`), só na consulta                                      | Média         | Célula de ~5 km, sem usuário ligado; nunca em log                                                |
| Postos (`stations`, Fase C)      | SQLite e API                                                        | Baixa         | Posto do OpenStreetMap: dado público. Posto local: `lat`/`lng` ficam só no aparelho (ver abaixo) |
| Foto de documento (CNH, CRLV)    | **não coletamos**                                                   | Alta          | Só entra com decisão nova (ver "Se um dia houver documentos")                                    |

## Microfone e localização (Fase C)

Decidido pelo dono em 26/10/2026. Vale para quem está logado e para o usuário anônimo.

**Microfone (registro por voz)**

- Pedido só quando o usuário toca em **Falar** na tela Abastecer. Recusar não bloqueia nada: o formulário continua na mesma tela.
- O app **não grava nem guarda áudio, e a nossa API nunca o recebe**. O reconhecimento é do sistema do celular (Android e iOS), que manda o áudio à Apple (iPhone) ou ao Google (Android) para transcrever; o app recebe só o texto, interpreta e guarda os campos do abastecimento (valor, litros, km, combustível, tanque cheio). A frase inteira não é guardada.
- **Decidido pelo dono em 26/10/2026:** o reconhecimento usa a rede do sistema (Apple ou Google), sem pacote de idioma para instalar e sem custo. "Falar" exige internet; sem internet, o formulário atual segue na tela. A Política de Privacidade e o texto do pedido de permissão do sistema (no iPhone, `NSSpeechRecognitionUsageDescription`) dizem que o áudio vai à Apple ou ao Google só para virar texto e que o Tá em Dia o descarta. O app **não mostra aviso próprio** antes do primeiro uso: o toque em Falar já abre o pedido do sistema (decidido pelo dono em 26/10/2026). No Android o pedido do microfone não aceita texto próprio, então a Política é o único lugar que diz isso. O que a Apple e o Google fazem com o áudio segue as políticas deles.
- Textos do pedido do sistema em português (`NSMicrophoneUsageDescription`, `NSSpeechRecognitionUsageDescription`, `RECORD_AUDIO`).

**Localização "durante o uso" (posto único)**

- Pedida só na tela Abastecer (Novo abastecimento), com um cartão explicando antes do pedido do sistema ("Achar o posto pela localização", com "Agora não" visível; C6). Depois do "Agora não", fica só um chip "Usar localização" sob o Posto. Sem permissão, o app sugere os postos já usados, como hoje.
- A coordenada do usuário **não sai do aparelho**: ela só serve para achar o posto mais perto (~150 m) entre os postos guardados. Não vai para a API, para log, para o Sentry nem para a `outbox`.
- A API recebe só o **geohash de 5 caracteres** (célula de ~5 km) para devolver os postos da região, inclusive de usuário sem login. O app pede a célula da posição e as 8 vizinhas (uma área de ~15 km), só as que ainda não tem guardadas (ou guardadas há mais de 30 dias), e guarda os postos no aparelho (`region_places`, dado público, não sincroniza). A rota não grava o geohash junto do usuário nem o registra em log.
- `stations` guarda `name`, `brand`, `street`, `lat`, `lng` e `osm_id` do **posto**. Para posto do OpenStreetMap, é dado público e sincroniza. Para posto local (fora do OpenStreetMap), `lat` e `lng` nascem da posição do usuário e por isso **ficam só no aparelho**: o sync envia o nome, a bandeira e a rua, sem coordenada (e a API descarta coordenada de posto sem `osm_id`, se vier). O app só grava a posição num posto local novo se o abastecimento é de hoje (registro de outro dia não foi feito no posto). O abastecimento guarda `station_id`, nunca a posição.
- Excluir conta apaga também os postos do usuário na API.

**Localização "sempre" (aviso ao chegar no posto, item C7)**

- Opcional, desligado por padrão, com opt-in em Configurações (**Aviso ao chegar no posto**) e duas telas explicativas antes dos pedidos do sistema: a primeira diz o que é, que gasta pouca bateria, que a localização não sai do celular e as regras do aviso, com "Agora não" visível, e pede o "durante o uso"; a segunda explica o "sempre" ("Permitir o tempo todo" no Android, "Sempre" no iPhone) e pede. Recusado, a tela leva aos ajustes do aparelho. Regras técnicas em `docs/03-arquitetura.md` ("Localização em segundo plano").
- **O que fica guardado (C7, só no aparelho):** as geofences registradas no sistema (coordenada pública dos postos vigiados e o **centro da célula de ~5 km**, nunca a posição da pessoa); a hora da última troca dos postos vigiados (sem lugar); e, por posto, a hora do último aviso, **só das últimas 12 h** (o que passa disso é apagado, então não forma um histórico de lugares). Nada disso sincroniza, vai para a API, para log ou para a `outbox`.
- **O que sai do aparelho:** só o geohash de 5 caracteres, para baixar os postos da região (o mesmo do C6), quando a região ainda não está guardada. A posição de agora só passa pela memória para escolher os postos e o centro da área.
- Desligar o aviso para as geofences, cancela o aviso pendente e apaga o registro dos avisos. Tirar o "sempre" nos ajustes do aparelho também para as geofences na próxima vez que o app abrir.
- Depende da aprovação da Apple e do Google. Se recusarem, o aviso sai (flag `geo.fuelReminder` desligada e, se for preciso, o "sempre" sai do `app.config.ts`) e o resto continua igual.

**Lojas:** Privacy Nutrition Label (Apple) e Data safety (Google) precisam declarar localização aproximada, "não vinculada à identidade, não usada para rastreamento", e uso do microfone para reconhecimento de fala, com o áudio enviado a terceiros (Apple e Google). Atualizar antes do envio.

## Segurança

**No aparelho**

- Segredos só no `expo-secure-store`. Nunca em SQLite, `AsyncStorage` ou código.
- O SQLite fica no sandbox do app, sem criptografia extra no MVP: os dados são de baixo risco e a CNH/placa não são identificadores fortes sozinhos. Se isso mudar, o `expo-sqlite` aceita SQLCipher (plugin gratuito), e a chave ficaria no SecureStore.
- Sem dado pessoal em log do app. `console.log` com objeto de veículo ou usuário é proibido.

**Na API**

- HTTPS sempre. `Authorization` do token, `userId` sempre do token (regra do projeto).
- Banco no Neon com criptografia em repouso do provedor. Sem criptografia por campo no MVP.
- Refresh token como hash. Segredos em variáveis de ambiente, nunca no repositório.
- Logs sem e-mail, placa, token, geohash, coordenada ou corpo de requisição. Só ids.
- Backups do provedor seguem a retenção abaixo.

## LGPD

**Papéis.** O Tá em Dia é o controlador. Google, Apple, Neon, Render e Expo são operadores ou fornecedores; alguns ficam fora do Brasil (transferência internacional, art. 33), o que a Política deve informar.

**Base legal.**

| Tratamento                               | Base                                       |
| ---------------------------------------- | ------------------------------------------ |
| Conta, veículos, abastecimentos, alertas | Execução de contrato (art. 7º, V)          |
| Notificações push                        | Consentimento (permissão do sistema)       |
| Localização "durante o uso" (Fase C)     | Consentimento, pedido só na tela Abastecer |
| Microfone (Fase C)                       | Consentimento, pedido só ao tocar em Falar |
| Localização "sempre" (aviso no posto)    | Consentimento, opt-in em Configurações     |
| Análise de uso (se houver)               | Consentimento, desligado por padrão        |

**Direitos do titular (art. 18).** O app precisa permitir, sem pedir por e-mail:

| Direito                | Como atender                                                     |
| ---------------------- | ---------------------------------------------------------------- |
| Acesso e portabilidade | Exportar meus dados (JSON/CSV) em Configurações                  |
| Correção               | Editar nas telas                                                 |
| Eliminação             | "Excluir conta" apaga tudo no app e na API (ver abaixo)          |
| Informação             | Política de Privacidade clara, dentro do app e no site           |
| Revogar consentimento  | Desligar notificações e o aviso no posto; recusar análise de uso |

**Exclusão de conta.** Apaga a conta e todos os dados do usuário na API (vale também para `deleted_at`: a exclusão lógica serve ao sync, não à LGPD). Remove push tokens e revoga o token da Apple. Backups do provedor expiram em até 30 dias, e a Política deve dizer isso.

**Retenção.**

- Conta anônima sem uso por 12 meses é apagada por job semanal (`api-cleanup.yml`; ver `docs/03-arquitetura.md`). "Uso" é o aparelho abrir ou renovar a sessão (ou sincronizar).
- Registros com `deleted_at` são removidos de vez do servidor depois de 30 dias.
- Logs da API: no máximo 30 dias.

**Incidente.** Se houver vazamento com risco ao titular, avisar a ANPD e os afetados em prazo curto (hoje 3 dias úteis). Manter um contato de encarregado (DPO) na Política; no começo, pode ser o e-mail do responsável pelo app.

**Crianças.** O app é para maiores de 18 anos (quem dirige). Declarar isso nos Termos e nas lojas.

## Lojas

- **App Store:** preencher "Privacidade do app" (e-mail, nome, ID de usuário, dados de uso se houver). Exclusão de conta no app é obrigatória (5.1.1(v)).
- **Google Play:** formulário "Segurança dos dados" com os mesmos itens, e a URL da Política de Privacidade.
- Os dois pedem uma URL pública da Política. Precisa existir antes do envio.

## Se um dia houver documentos (fotos de CNH, CRLV, apólice)

Essa decisão é separada, porque muda o risco. Antes de implementar:

1. Perguntar se a foto é mesmo necessária ou se a data basta.
2. Guardar só no aparelho, ou criptografar no app antes de enviar (chave no SecureStore, nunca na API).
3. Se for enviada: bucket privado, URL assinada de poucos minutos, apagar junto com a conta.
4. Atualizar este doc, a Política e as respostas das lojas no mesmo PR.

## Checklist antes de publicar

- [ ] Política de Privacidade e Termos revisados por advogado, em URL pública.
- [ ] URLs de Termos e Privacidade e o e-mail de ajuda em `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL` e `EXPO_PUBLIC_SUPPORT_EMAIL` no perfil `production` do `eas.json` (o app já abre os links; sem valor, mostra "Em breve").
- [ ] Excluir conta funcionando no app e na API (implementado; falta validar no aparelho e revogar o token da Apple, `docs/07` 2.23 e 3.28).
- [ ] Exportar meus dados funcionando.
- [ ] Nenhum dado pessoal em log (app e API), inclusive geohash e coordenada.
- [ ] Declarações de microfone e localização nas lojas (Nutrition Label e Data safety).
- [ ] Segredos fora do repositório (`.env` ignorado).
- [ ] Formulários das lojas preenchidos.
- [ ] Contato do encarregado na Política.
