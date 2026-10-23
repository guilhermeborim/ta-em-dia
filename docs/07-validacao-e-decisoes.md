# Validação no aparelho e decisões em aberto

Tudo o que foi implementado sem poder rodar no aparelho (nenhum PR foi testado em emulador nem comparado com o Figma) e tudo o que ainda precisa de uma decisão do dono do projeto. Marque `[x]` à medida que validar e apague as decisões já tomadas (registre o resultado no doc de referência, como `03-arquitetura.md`).

Cobre os PRs #27 a #37 (Histórico até App: usuário anônimo). O que veio antes (Boas-vindas até o alerta de manutenção) também não foi validado no aparelho por quem escreveu este documento; veja a seção 2.12.

## Como manter este arquivo

Regra do projeto (`CLAUDE.md`): ao terminar cada feature, no mesmo PR, quem implementou acrescenta aqui:

- **Seção 2 (validar):** uma subseção `### 2.N Nome da feature (tela, PR #N)` com checklist `[ ]` do que só dá para conferir no aparelho: telas contra o Figma, notificações, teclado, fonte grande, fluxos de ponta a ponta e migrations sobre dados antigos.
- **Seção 3 (decidir):** uma subseção `### 3.N Título` para cada escolha que cabe ao dono do projeto: o que o app faz hoje, as opções (tabela, se ajudar) e a recomendação. Entram aqui textos escritos pela IA, telas sem frame no Figma, desvios do Figma, comportamentos assumidos e dependências nativas evitadas.
- Nada a registrar? Não acrescente nada. Decisão tomada? Atualize o doc de referência (`03-arquitetura.md`, `02-telas-e-fluxos.md`...) e apague o item daqui. Item validado? Marque `[x]`; quando a subseção toda estiver marcada, pode apagá-la.

## 1. Preparação

- Node 24 (`.nvmrc`), `pnpm install`, `pnpm --filter @ta-em-dia/shared build` depois de mudar o `shared`.
- **Development build no Android** (`npx expo run:android` ou `eas build --profile development`). As notificações locais usam `expo-notifications`, que não existe no Expo Go.
- **iOS**: sem build, `scheduler.ios.ts` e `permission.ios.ts` não agendam nada. Nenhum aviso (manutenção ou documentos) chega no iPhone ainda.
- Teste **duas vezes**: com o app instalado do zero e **atualizando** uma versão antiga com dados (as migrations 5, 6 e 7 só adicionam e a 8 recria `vehicles`; todas precisam rodar sobre dados reais; ver 2.13).
- Tela grande de fonte do sistema (Configurações do Android, "Tamanho da fonte") ligada em pelo menos uma passada: nada pode cortar nem sobrepor.
- Para ver os avisos chegarem sem esperar dias: o aviso sai às 9h. No Android, ajuste a data e a hora do aparelho para perto das 9h do dia do aviso e abra o app (ele reagenda ao abrir e ao voltar para a frente).

## 2. O que validar

### 2.1 Histórico (tela 13, PR #27)

Abre por Mais → Histórico.

- [ ] Linha do tempo por mês (ex.: "Outubro 2026"), do mais recente ao mais antigo, com abastecimentos e manutenções misturados.
- [ ] Ícone redondo por tipo (combustível roxo, manutenção âmbar) e traço vertical ligando os cartões; o último cartão não tem traço.
- [ ] Chips Tudo / Abastecimentos / Manutenções filtram. O km/l de cada abastecimento não muda ao filtrar.
- [ ] Botão do calendário abre os períodos (Tudo, Mês, 3 meses, Ano) e fica roxo quando há período escolhido.
- [ ] Título longo ("Alinhamento e balanceamento") quebra em duas linhas sem estragar o cartão.
- [ ] Sem veículo e sem registros: estados vazios certos.
- [ ] No mesmo dia, o item de maior km vem primeiro.
- [ ] Os cartões **não** abrem nada (não existe tela de detalhe de abastecimento nem de serviço): confirme se isso incomoda.

### 2.2 Meus veículos (tela 16, PR #28)

Mais → Meus veículos.

- [ ] Cartões com faixa colorida alternando roxo e laranja, apelido, "VW Gol 1.0 · 2019 · 48.910 km" e selo (N vencidos, N perto de vencer, Tudo em dia ou nada).
- [ ] O selo soma manutenção **e** prazos de documentos do veículo (a CNH não entra).
- [ ] "Adicionar veículo" (botão do topo e cartão tracejado) abre o formulário em modal e volta ao salvar. Em modo adicionar não aparece "Passo 1 de 2" nem "Pular", e sim "Cancelar".
- [ ] **Segurar e arrastar** o cartão (com 2 ou mais veículos; hoje só com dados antigos ou depois do Premium, porque o grátis tem 1): os outros abrem espaço enquanto o dedo anda, o cartão levantado acompanha o dedo e, ao soltar, a ordem fica. Rolar a tela com o dedo (sem segurar) continua rolando, no Android e no iOS. O primeiro da lista vira o veículo ativo: confira Início, Abastecer, Manutenção, Histórico, Relatórios e Documentos mudando, e os avisos reagendados. Soltar no mesmo lugar não muda nada.
- [ ] Com um veículo só não há dica e segurar o cartão não faz nada.
- [ ] Lista de cartões que passa da tela: arrastar até a borda não rola sozinho (limitação conhecida); se incomodar, o auto-scroll entra depois.
- [ ] Leitor de tela (TalkBack): ações "Mover para cima/baixo" no cartão.
- [ ] Seção "Arquivados" no fim aparece só quando há arquivados e abre o detalhe deles.
- [ ] **Limite grátis de 1 veículo**: com um veículo, "Adicionar veículo" (botão do topo e cartão tracejado) mostra o alerta "No plano grátis, o app guarda 1 veículo..." com "Ver Premium" (abre a tela Premium) e "Ok"; nenhum formulário abre. Na primeira abertura do app (onboarding) o primeiro veículo ainda cabe. Excluir o veículo libera a vaga. Quem já tinha 2 ou mais veículos mantém todos, mas não adiciona outro (arquivados contam).

### 2.3 Detalhe do veículo e Atualizar km (tela 17, PR #29)

Toque num cartão de Meus veículos.

- [ ] Placa Mercosul (só se cadastrada), Km atual, Média/dia, Custo/km e as linhas Marca e modelo, Ano, Combustível, Km atualizado.
- [ ] Veículo sem placa, sem marca/modelo ou sem ano: as linhas somem sem deixar buraco.
- [ ] "Km atualizado" diz "há N dias" certo; sem nenhuma leitura diz "Só o km inicial".
- [ ] **Atualizar km** (botão do rodapé): km menor que o atual dá erro; igual vale; maior atualiza Km atual, "Km atualizado" e a média/dia.
- [ ] Depois de atualizar o km, os avisos de manutenção e os alertas do Início refletem o km novo.
- [ ] Média/dia mostra 30 km enquanto não há duas leituras (regra de `shared`): confirme se o texto não confunde.
- [ ] Custo/km "—" quando não há km rodado.
- [ ] **Cartão "Valor na FIPE"** (PR do cartão FIPE): abaixo dos dados, borda tracejada, quadrado lima com seta de alta, "Valor na FIPE" / "Em breve" e o selo PREMIUM à direita, igual ao frame 17. Em fonte grande o texto não corta o selo. O TalkBack lê "Valor na FIPE. Em breve". Tocar não faz nada.

### 2.4 Editar, arquivar e excluir veículo (PR #30)

Lápis no topo do detalhe.

- [ ] Editar marca, modelo, ano, apelido e placa. Placa inválida ("12") dá erro; "bra2e19" vira "BRA2E19"; vazia remove.
- [ ] **Arquivar**: o veículo some das listas e do Início; vira o ativo o próximo da ordem; aparece em "Arquivados". **Restaurar** devolve ao fim da ordem.
- [ ] Arquivar o **único** veículo ativo é bloqueado: aparece o alerta "Você precisa de outro veículo ativo para arquivar este." e nada muda. Com outro veículo ativo, arquiva normalmente (PR de regras de veículos e prazos).
- [ ] **Excluir**: alerta de confirmação; depois some tudo dele (abastecimentos, manutenções, prazos do veículo, leituras de km) e os avisos agendados dele. A CNH continua.
- [ ] Depois de arquivar ou excluir, o app volta direto para Meus veículos (não para um detalhe que não existe mais).
- [ ] Tocar numa notificação antiga de um veículo/plano excluído não trava o app.

### 2.5 Documentos e prazos (tela 18, PR #31) e alertas (PR #32)

Mais → Documentos e prazos.

- [ ] Lista do veículo ativo (título "NOME · PLACA") e "VOCÊ" com a CNH; ordem IPVA, Licenciamento, Seguro.
- [ ] Selo: **Vencido** (vermelho), **N dias** (âmbar, faltam até o primeiro aviso, 30 por padrão), **Hoje**, **Em dia** (verde). Subtítulo "Vence em / Venceu em / Renova em dd/mm/aaaa".
- [ ] "+ Adicionar prazo": só aparecem os tipos ainda sem prazo; o botão some quando todos estão cadastrados. Sem veículo, só a CNH.
- [ ] Data digitada com máscara: aceita passada e futura; recusa 30/02, incompleta e fora de 2000–2100.
- [ ] Tocar numa linha abre o modal de edição: troca a data, as antecedências e exclui.
- [ ] Chips "Avisar antes" (30, 15, 7, 3, 1 dia); sem nenhum, a tela mostra "Os prazos estão sem aviso".
- [ ] Banner de pé: "Avisamos 30 e 7 dias antes de cada vencimento." muda quando os prazos usam dias diferentes.
- [ ] **Notificações** (só Android com development build e permissão dada): cadastre um prazo para daqui a 8 dias e confirme o aviso "IPVA do Gol vence em 7 dias" às 9h do dia certo; "Sua CNH vence em 30 dias" para a CNH. Tocar no aviso abre Documentos e prazos.
- [ ] Prazo cadastrado já dentro da janela (ex.: faltam 10 dias, aviso de 30): chega **um** aviso no próximo 9h ("IPVA do Gol vence em 9 dias"), e o aviso de 7 dias continua agendado. Não repete no dia seguinte. Mudar a data ou os dias de aviso libera um novo aviso.
- [ ] Com dois veículos ativos (um deles só em Premium no futuro; hoje é possível com dados antigos), os dois avisam; tocar no aviso do segundo abre a lista dele. Arquivar um veículo cala os avisos dele.
- [ ] Prazo vencido não avisa mais.
- [ ] Início: prazo vencido ou perto de vencer aparece em "Próximos alertas" junto com a manutenção (máximo 2 no total, vencidos primeiro); tocar abre Documentos e prazos.
- [ ] Mais → "Documentos e prazos" mostra "1 vencido" em vermelho (ou "N perto de vencer" em âmbar).
- [ ] Trocar o veículo ativo (reordenar) troca os prazos da tela e os avisos agendados.
- [ ] **Prazos por ano** (PR de prazos por ano): cada linha mostra o ano ("IPVA 2026", "CNH 2026"). Abrir o prazo atual mostra "Renovar para 2027" (e a frase "Cria o prazo do ano seguinte e guarda este no histórico."); tocar volta à lista com "IPVA 2027" em Documentos e o "IPVA 2026" na seção HISTÓRICO, com selo cinza "Renovado".
- [ ] Depois de renovar, Início, Mais e o selo do cartão de Meus veículos usam o prazo novo (o antigo vencido não conta); o aviso do prazo antigo some e chegam os do novo (30 e 7 dias antes de 2027).
- [ ] Abrir um item do histórico: sem o botão "Renovar"; dá para editar a data e excluir. Mudar a data para um ano que já existe no tipo mostra "Já existe IPVA de 2027" sob o campo.
- [ ] Excluir o prazo atual faz o de ano anterior voltar para a lista (e para os avisos). Seção HISTÓRICO some quando não há anos anteriores.
- [ ] Quem já tinha prazos antes: nada muda na tela além do ano no título; nenhum aparece no histórico.

### 2.6 Relatórios (tela 14, PR #33)

Aba Relatórios.

- [ ] Segmentos Mês, 3 meses, 6 meses (padrão), Ano.
- [ ] Cartão de consumo, Custo por km, Rodou e Litros coerentes com os abastecimentos (confira uma conta à mão).
- [ ] Total em R$ com "−8% vs anterior" verde (gastou menos) ou "+N%" âmbar (gastou mais); some quando não há período anterior.
- [ ] **Gráfico de barras**: barras empilhadas combustível (roxo) e manutenção (laranja); mês atual com o rótulo em destaque; no período Ano, 12 barras estreitas cabem sem cortar; sem estourar a altura do cartão.
- [ ] **Linha de consumo por trecho**: pontos e rótulos dos meses alinhados; com menos de 2 trechos aparece a mensagem no lugar.
- [ ] Serviço de manutenção **sem custo** não entra no total.
- [ ] Sem veículo e sem dados: estados vazios.
- [ ] Os gráficos foram feitos sem ver a tela rodando: é o ponto de maior risco visual. Compare com o frame 14 do Figma.

### 2.7 Mais e Premium em breve (telas 15 e 21, PR #34)

- [ ] Cartão da conta "Sem login" com selo "Salvo no aparelho"; tocar mostra o aviso "Em breve".
- [ ] Grupos de itens iguais ao Figma; número de veículos ao lado de Meus veículos; selo PREMIUM em Premium.
- [ ] Conta e Ajuda e contato mostram "Em breve" (o aviso aparece **acima** do botão flutuante).
- [ ] Botão flutuante "Abastecer" abre o formulário e não cobre o último item da lista.
- [ ] Premium abre em modal: título, 5 recursos, "Tenho interesse". Depois de tocar, o botão some e aparece "Anotado! Obrigado pelo interesse." e isso continua ao reabrir o app.
- [ ] Em produção (`APP_ENV=production`) os atalhos "Status do app" e "Catálogo de componentes" não aparecem.

### 2.8 Configurações (tela 20, PR #35)

- [ ] Tela igual ao frame 20 (sem o bloco Aparência): grupos Notificações e Unidades e dados, interruptores, "30 e 7 dias" e "km"/"litros" à direita.
- [ ] Ligar um interruptor sem a permissão de notificações do sistema mostra "Notificações desativadas"; com a permissão, não mostra nada.
- [ ] **Manutenções** desligado: nenhum aviso de manutenção chega (os já agendados somem). Ligar de novo traz de volta.
- [ ] **Documentos** desligado: idem para os vencimentos.
- [ ] **Lembrar de atualizar o km** ligado: chega "Faz 7 dias sem atualizar o km do <veículo>" às 9h, 7 dias depois da última atualização (leitura, abastecimento ou serviço); tocar abre "Atualizar km" do veículo. Sem atualizar, repete a cada 7 dias ("Faz 14 dias..."). Para ver sem esperar, mude a data do aparelho. Em aparelho que já tinha o aviso de 15 dias agendado, abrir o app reagenda para 7.
- [ ] Atualizar o km (ou abastecer) empurra o próximo lembrete.
- [ ] **Antecedência** abre em modal, salva e a linha mostra o novo valor ao voltar. Prazo novo já vem com esses dias marcados; os prazos que já existem não mudam.
- [ ] Sem nenhum dia marcado, "Salvar" mostra "Marque ao menos um dia".
- [ ] Exportar dados mostra "Em breve" (o aviso aparece sem cobrir o conteúdo).
- [ ] Distância e Volume não têm seta nem abrem nada.
- [ ] No iOS nada é agendado até haver development build (como nos outros avisos).
- [ ] Fonte grande do sistema: nenhuma linha corta o valor à direita.

### 2.9 API: usuário anônimo (PR #36)

Testado só contra um Postgres local (Docker) e no CI sem banco; nunca no Render nem no Neon.

- [ ] Depois do merge, o workflow "Deploy da API" aplica a migration `init` (primeira do projeto: cria todas as tabelas) no staging e o `/health` responde. Se `db:deploy` falhar, veja `DATABASE_URL`.
- [ ] O build do Render roda `prisma generate` sozinho (`postinstall` da API). Confira o log do build; se falhar, a API não sobe.
- [ ] `curl -X POST <API_URL>/v1/auth/anonymous -H 'content-type: application/json' -d '{"installationId":"<uuid>","secret":"<64 letras>","platform":"android"}'` devolve 200 com `accessToken`, `refreshToken` e `user`. Repetir devolve o mesmo `user.id`; outro `secret` com o mesmo `installationId` devolve 401 `INVALID_CREDENTIALS`.
- [ ] No Neon, `auth_identities.secretHash` e `refresh_tokens.tokenHash` têm só hashes (nunca o segredo nem o token).
- [ ] `GET /health` e `GET /v1/config` seguem abertos (sem token).
- [ ] Primeira chamada com o serviço dormindo (plano grátis) demora cerca de 1 minuto: o app precisa de um timeout generoso (PR do app).

### 2.10 App: usuário anônimo (PR #37) e renovação pelo refresh

Precisa da API de staging no ar (PR #36 e o de segurança, 2.14, aplicados) e de um **development build novo**: `expo-network` é módulo nativo. O app deve apontar para a API (`EXPO_PUBLIC_API_URL`).

- [ ] Primeira abertura: boas-vindas → "Continuar sem login" → o app abre normalmente, sem esperar a API. Em Mais → Status do app, a linha "Usuário anônimo na API" passa a "criado, acesso válido" (toque em "Testar de novo" depois de alguns segundos).
- [ ] No Neon: um `users` com `isAnonymous = true`, um `devices` com a plataforma certa e um `refresh_tokens`.
- [ ] Reabrir o app (e voltar do segundo plano) com acesso ainda válido não cria nada novo no banco.
- [ ] Modo avião na primeira abertura: o app funciona normal e a Status mostra "ainda não criado". Desligue o modo avião com o app aberto: em poucos segundos (o app tenta quando a internet volta) vira "criado". Teste também ligando só o Wi-Fi e só o 4G.
- [ ] Com o serviço do Render dormindo, a primeira chamada demora cerca de 1 minuto e o app não trava nem mostra erro.
- [ ] Passados 15 minutos, ao voltar ao app a Status mostra "criado, acesso válido" de novo (o acesso foi renovado; o `users` continua um só). No banco, o refresh token antigo está com `revokedAt` e há um novo ativo (sem acumular: um ativo por aparelho).
- [ ] Renovação pelo refresh: depois dos 15 minutos o app chama `/auth/refresh` (não `/auth/anonymous`; veja nos logs do Render). Apague a linha do refresh token no banco e force a renovação: o app cai para o login pelo segredo e continua no mesmo usuário.
- [ ] Com o limite de chamadas estourado (429), o app não desiste: tenta de novo pelas esperas de 15 s a 5 min.
- [ ] "Reiniciar App" (Status) apaga a sessão e, ao refazer o login, cria um usuário novo.
- [ ] Nenhum token, segredo ou id de aparelho aparece em `adb logcat`.

### 2.16 API: sync (PR da API de sync)

Testado contra um Postgres local (Docker): push dos seis tipos de linha, pull com paginação, isolamento entre usuários, última escrita vence, exclusão e seis pushes ao mesmo tempo (versões 1 a 12, sem repetir). No CI só há testes com banco falso. Nunca no Render nem no Neon.

- [ ] Depois do merge, o workflow "Deploy da API" aplica a migration `user_sync_version` (só adiciona `users.syncVersion`) no staging e o `/health` responde.
- [ ] No staging, com o `accessToken` de `POST /v1/auth/anonymous`: `POST /v1/sync/push` com um veículo (`{"protocol":1,"changes":[{"table":"vehicles","id":"<uuid>","op":"upsert","updatedAt":"<agora ISO>","payload":{"id":"<uuid>","name":"Gol","type":"flex","initialKm":1000}}]}`) devolve `accepted`; `GET /v1/sync/pull?protocol=1&since=0` devolve o veículo com `version` "1" e `nextSince` "1".
- [ ] Repetir o push com `updatedAt` mais antigo devolve `rejected` com `STALE`; com o token de outro usuário (outro `installationId`), o mesmo id devolve `INVALID` e o pull dele vem vazio.
- [ ] No Neon: `users.syncVersion` do usuário bate com a última `version` e `devices.lastSyncAt` foi preenchido.
- [ ] `protocol` 2 devolve 400 `SYNC_PROTOCOL_UNSUPPORTED`; sem token, 401.

### 2.17 App: motor de sync (PR do motor de sync)

Testado só com testes automáticos (API de mentira com a mesma regra da real, dois "aparelhos" em SQLite). Nunca contra a API real nem no aparelho. Como `sync.anonymous` está desligada, nada disto roda no app de quem usa "Continuar sem login": para validar, ligue a flag no seu build (`'sync.anonymous': true` em `DEFAULT_FLAGS.free`, `packages/shared/src/flags.ts`) e aponte `EXPO_PUBLIC_API_URL` para o staging com o deploy do PR da API de sync (2.16).

- [ ] Com a flag ligada, abra o app, cadastre um veículo e um abastecimento: em até ~10 s a fila esvazia (`SELECT COUNT(*) FROM outbox` = 0) e o Neon tem as duas linhas, com `version` 1 e 2.
- [ ] Segundo aparelho (ou "Reiniciar App" no primeiro): "Continuar sem login" cria **outro** usuário anônimo (as credenciais são por instalação); então só dá para ver a troca entre aparelhos depois do login com Google (PR do login). Aqui, confira só o envio.
- [ ] Modo avião: grave 3 abastecimentos; desligue o modo avião com o app aberto: em poucos segundos eles vão para a API (a internet voltando dispara o sync).
- [ ] Gravar e fechar o app logo em seguida: ao sair da frente o app tenta enviar na hora.
- [ ] Com o serviço do Render dormindo (1 minuto para acordar): o app não trava nem mostra erro; o sync termina quando a API responde.
- [ ] Editar o mesmo veículo várias vezes seguidas manda um lote só (5 s depois da última gravação), não uma chamada por toque.
- [ ] Nenhum dado de veículo, placa ou token aparece em `adb logcat`.
- [ ] Bateria: com a flag ligada, deixar o app aberto 1 hora sem mexer não gera chamadas (o sync só roda ao abrir, voltar, rede voltar ou gravar).

### 2.18 API: login com Google e Apple (PR da API de login social)

Testado contra um Postgres local (Docker): criar conta social, vincular ao anônimo, junção (`merge`) com veículo, registro, prazo e linha excluída (versões novas no contador da conta, aparelho e dono trocados, anônimo apagado) e troca (`use_account`). O `id_token` foi testado só com chaves geradas no teste; nunca com um token real do Google ou da Apple, e nunca no Render nem no Neon.

- [ ] Depois do merge, o deploy sobe sem migration nova (nada mudou no schema) e o `/health` responde.
- [ ] No Render (staging), `GOOGLE_CLIENT_IDS` tem o client ID web do projeto do Google Cloud (e os client IDs de Android e iOS, se o `aud` do token vier deles) e `APPLE_CLIENT_ID` tem o bundle id (`com.guilhermeborim.taemdia.staging`). Sem eles, `POST /v1/auth/google` devolve 503 `PROVIDER_NOT_CONFIGURED`.
- [ ] Com um `id_token` real do Google (pelo app do PR seguinte, ou pelo OAuth Playground com o client ID certo): `POST /v1/auth/google` devolve 200 com `user.isAnonymous: false`; repetir devolve o mesmo `user.id`; `aud` de outro app devolve 401 `INVALID_ID_TOKEN`.
- [ ] Mesmo teste com o `identityToken` da Apple em um iPhone (precisa de conta Apple Developer paga e do bundle id com "Sign in with Apple").
- [ ] `POST /v1/auth/link` com o token de um usuário anônimo e um login novo: 200 `outcome: linked`, o mesmo `user.id`, `users.isAnonymous = false` e `auth_identities` com a linha do Google no Neon. Com um login que já tem conta: 409 `ACCOUNT_EXISTS` com `account.vehicles` e `account.records`; repetir com `onConflict: "merge"` devolve `merged` e o usuário anônimo some do Neon.
- [ ] No Neon, `auth_identities.email` e `users.email` têm só o e-mail confirmado; nenhum `id_token` aparece nos logs do Render.

### 2.19 App: login com Google e Apple, Conta e vincular (telas 3, 19, 19b, 23 e 24)

Testado só com testes automáticos (API de mentira, SQLite em memória). Nunca contra a API real, nem com um Google ou Apple de verdade, nem no aparelho. **Exige development build** (`@react-native-google-signin/google-signin` e `expo-apple-authentication` são módulos nativos): no Expo Go, os botões avisam "ainda não está disponível". Pré-requisitos: PR da API (2.18) no ar, `GOOGLE_CLIENT_IDS` e `APPLE_CLIENT_ID` no Render e os `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` e `GOOGLE_IOS_URL_SCHEME` no perfil do `eas.json` (ver 3.27).

- [ ] **Android, Login (tela 3):** "Entrar com Google" abre a janela do Google, entra e leva ao "Primeiro veículo". Fechar a janela não mostra erro. Sem internet mostra "Sem conexão com o servidor...". Não aparece botão da Apple.
- [ ] **iPhone, Login:** "Entrar com Apple" abre a folha da Apple, pede nome e e-mail e entra. Com "Ocultar e-mail", a Conta mostra o começo do e-mail de retransmissão ou "Sua conta".
- [ ] **Conta que já tem veículo (outro celular):** entrar no Login com ela leva direto ao pedido de notificações, e Início, Veículos e Abastecimentos mostram os dados.
- [ ] **Conta (tela 19, sem login):** cartão roxo, botão do Google (e da Apple só no iPhone), linhas Modo, Dados salvos, Veículos e Registros iguais ao frame. Início e Mais levam a ela.
- [ ] **Vincular conta nova (19 → 23):** com veículos e abastecimentos locais, entrar com Google mostra "Enviando seus dados", o contador sobe ("N de M registros") e termina com "Tudo salvo!"; volta sozinho para a Conta logada (19b): nome, e-mail, "Sincronizado", Último sync "hoje, HH:MM", Veículos e Registros certos. No Neon, `users.isAnonymous = false` e os dados estão lá.
- [ ] **Conta que já tem dados (tela 24):** entrar com uma conta que tem dados de outro celular abre a folha "Essa conta já tem dados" com os números certos e "Juntar dados" marcado. "Juntar dados" envia o que é do aparelho e a conta fica com a soma; "Usar só os da conta" apaga os dados do aparelho e mostra os da conta. Fechar a folha (toque fora ou voltar) não muda nada e o botão do Google volta a funcionar.
- [ ] **Conta vazia que já existe:** vincular a ela junta direto, sem a folha.
- [ ] **Fonte grande:** folha da tela 24 e linhas da Conta não cortam texto; o botão "Continuar" da folha fica visível.
- [ ] **Sair da conta (19b):** com tudo enviado, o alerta diz que os dados continuam na conta; depois do "Sair", o app volta ao Login sem dados. Com o modo avião e dados novos (não enviados), o alerta avisa quantos registros se perdem. Entrar de novo com a mesma conta traz tudo de volta. "Continuar sem login" depois de sair cria um usuário anônimo novo (sem erro).
- [ ] **Avisos:** depois de sair (e depois de "Usar só os da conta"), nenhum aviso do veículo antigo chega; depois de entrar numa conta com dados, os avisos dela são agendados.
- [ ] **Segundo aparelho:** entrar com a mesma conta em outro celular traz tudo; um abastecimento novo em um aparece no outro depois de abrir o app (o sync roda ao abrir e depois de gravar).
- [ ] **Refresh recusado:** apagar `refresh_tokens` da conta no Neon e esperar o acesso vencer: o app continua abrindo com os dados locais e não vira anônimo sozinho (confira em Status: sessão ausente). Falta uma tela que peça para entrar de novo (3.27).
- [ ] **Nada em log:** nenhum `id_token`, e-mail ou nome aparece em `adb logcat` nem no log do Render.
- [ ] "Excluir conta" mostra "Em breve" (a tela 22 é outro item).

### 2.15 Seletor de data

Exige um **development build novo** (`@react-native-community/datetimepicker` é módulo nativo). No iOS, só quando houver build.

- [ ] Novo abastecimento: o chip de data mostra "Hoje, 21 out"; tocar abre o calendário (diálogo no Android, folha no iOS) sem datas futuras; escolher outro dia troca o chip ("18 out", com o ano se for outro) e o abastecimento aparece nesse dia na lista e no Histórico. Escolher "hoje" de novo volta a "Hoje".
- [ ] Registrar manutenção (Data) e Documentos (Vencimento): o ícone de calendário no campo abre o seletor já no dia digitado (ou hoje); o dia escolhido preenche o campo e tira o erro. Digitar continua funcionando. O ícone tem toque confortável e o TalkBack lê "Abrir calendário".
- [ ] Manutenção não deixa escolher o futuro; o prazo deixa (até 2100).
- [ ] iOS: a folha abre por baixo, em português, com a cor do app; tocar fora fecha sem mudar nada.
- [ ] Fonte grande do sistema: o campo com ícone não corta o texto.

### 2.11 Transversal

- [ ] Todo formulário obrigatório mostra `*` vermelho e a mensagem de erro abaixo do campo (Veículo, Atualizar km, Prazo).
- [ ] Alvos de toque de 44 pt (botões redondos do topo, chips, linhas).
- [ ] Teclado não cobre campos nem botões "Salvar" nos modais (iOS e Android).
- [ ] Voltar (botão e gesto do Android) funciona em todos os modais e telas empilhadas.
- [ ] Offline total (modo avião): tudo funciona, nada tenta falar com a API.
- [ ] Nenhuma placa em log (`adb logcat`) nem em mensagem de erro.
- [ ] Catálogo de componentes (Mais → Catálogo, só fora de produção): `TimelineItem`, `StatTile`, `LicensePlate`, `TopBar`, `VehicleCard`, `DocumentItem`, gráficos, `AccountCard`, `ListGroup`, `FeatureItem` renderizam.

### 2.12 O que veio antes (não revisado aqui)

Boas-vindas, Login offline, Aviso sem login, Primeiro veículo, Permissão de notificações, Abas, Novo abastecimento, Lista de abastecimentos, Início, Manutenções (lista, plano, registrar) e Alertas de manutenção (PRs até #26). Vale uma passada completa de fluxo: primeiro uso → primeiro veículo → notificações → primeiro abastecimento → ativar um lembrete de manutenção.

### 2.13 Migrations e dados existentes

Com um aparelho que já tem dados da versão anterior ao PR #28:

- [ ] Depois de atualizar, os veículos antigos seguem a ordem de criação (migration 5, `sort_order`).
- [ ] Atualizar km funciona num veículo antigo (migration 6, `odometer_readings`).
- [ ] Prazos funcionam (migration 7, `documents`).
- [ ] **Moto (migration 8, recria `vehicles`)**: com veículos antigos (um carro e uma moto cadastrados antes), depois de atualizar nada some: mesma ordem, placa, km, abastecimentos, serviços e prazos; a moto antiga passa a mostrar o ícone de moto e "Tipo: Moto". Cadastre uma moto nova (Carro/Moto no formulário) e confira o ícone no Início (seletor), em Meus veículos e no detalhe. Confira também o ícone no Android e no iOS, em fonte grande.
- [ ] Voltar para a versão anterior do app com o banco novo não quebra (as migrations só adicionam colunas e tabelas). A migration 8 recria uma tabela e grava `motorcycle`: voltar à versão anterior mostra a moto com ícone de carro, e editar essa moto na versão antiga falha. Só vale para quem testou o app antes do lançamento.

### 2.14 API: segurança da conta anônima

Só dá para conferir com o staging no ar (merge na `main` dispara o deploy).

- [ ] O deploy aplica as duas migrations novas (`vehicle_type_motorcycle` e `device_last_seen`) sem erro; `GET /health` responde.
- [ ] **Rate limit pelo IP certo**: no Render, mande 25 chamadas seguidas a `POST /v1/auth/anonymous` com corpo vazio (`curl`) e veja o `429 RATE_LIMITED`. Depois peça de outro celular/rede: deve responder normal (se der 429 para todo mundo, o `TRUST_PROXY_HOPS` está errado; o Render pode ter mais de um proxy).
- [ ] `POST /v1/auth/refresh` com o `refreshToken` de uma resposta do `/auth/anonymous` devolve um par novo; repetir o token antigo dá `401 INVALID_REFRESH_TOKEN`.
- [ ] **Limpeza**: em Actions → "Limpeza da API" → Run workflow com "Só contar" ligado. O log mostra as contagens (0 e 0 no começo). Só desligue o "Só contar" quando tiver confiança. A execução agendada (segunda, 6h UTC) apaga de verdade.
- [ ] O `production` da limpeza espera a sua aprovação (environment `production`), como o deploy.

## 3. Decisões em aberto

Cada item traz minha recomendação. As decisões já tomadas saíram daqui e estão em `docs/01-roadmap.md`, `docs/03-arquitetura.md` e no backlog (`docs/06-backlog.md`, "Decisões do dono"). A numeração não é refeita: os números que faltam já foram decididos.

### 3.17 iOS

Sem development build para iOS, nenhum aviso agenda. Quando houver, apague `scheduler.ios.ts` e `permission.ios.ts` e repita as validações de notificação (2.5 e manutenção).

### 3.20 `GET /v1/config` continua público

Devolve sempre o plano `free`. Com o guard global agora existindo, ele ficou marcado `@Public()`. Quando o app mandar o token, a rota deve passar a ler o plano do usuário. Nada a decidir agora; só não esquecer no PR do app ou do sync.

### 3.24 Sync: regras que assumi na API

- **Relógio adiantado:** um `updatedAt` mais de 5 minutos à frente do servidor vale como a hora do servidor. Alternativa: rejeitar a mudança. Recomendação: manter.
- **Exclusão e edição:** uma edição mais nova que a exclusão recria a linha (a linha inteira vale); uma exclusão mais antiga que uma edição do servidor é ignorada (`STALE`). Alternativa: exclusão sempre vence. Recomendação: manter, é a mesma regra para tudo.
- **`sync.cloud` não é conferida:** todos os usuários, anônimos ou não, sincronizam (a flag é `true` em todos os planos). Se algum dia o sync virar Premium, a API passa a checar. Recomendação: manter até lá.
- **Limite de chamadas:** o sync usa o limite padrão (100 por minuto por IP). Com push depois de cada gravação (~5 s) e pull, um uso intenso chega perto de 25 chamadas por minuto por aparelho; atrás do CGNAT, vários aparelhos dividem o IP. Alternativa: limite próprio mais folgado para `/v1/sync/*`. Recomendação: manter e olhar os 429 depois do lançamento (como em 3.23).

### 3.25 Sincronizar quem usa "Continuar sem login"

O motor de sync está pronto, mas **só envia dados de quem tem login**. Para o usuário anônimo ele fica desligado pela flag `sync.anonymous` (padrão desligado), porque a tela 4 ("Aviso sem login") promete "Seus dados vão ficar só neste celular. Sem conta, tudo é salvo no aparelho." e a tela 23 ("Enviando seus dados") só aparece ao vincular a conta: ligar o envio sem login faria o app mandar veículos, placas e abastecimentos para o servidor contra o que a tela diz (e contra `docs/05-privacidade-lgpd.md`). Opções:

| Opção                        | O que muda                                                                                                                                           | Prós e contras                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Só quem fez login (atual) | Nada; a flag fica desligada. Ao vincular a conta (PR do login), o primeiro envio manda tudo (telas 23 e 24).                                         | Combina com a tela 4 e com o Figma. Quem usa sem login e perde o celular perde os dados (a tela 4 já avisa).                                                            |
| B. Todos, também anônimos    | Ligar `sync.anonymous`, trocar o texto da tela 4 (ex.: "Seus dados ficam salvos no aparelho e numa cópia protegida na nuvem") e atualizar `docs/05`. | Backup para todos e vincular sem migrar nada (como diz `docs/03`). Contra: dado pessoal (placa) na nuvem de quem não criou conta; texto e Política precisam dizer isso. |

Recomendação: **A** agora; revisar quando o login existir. Se escolher B, o texto da tela 4, a Política e o `docs/05` entram no mesmo PR que liga a flag.

### 3.26 Login social: regras que assumi na API

- **Junção passa do limite grátis:** `merge` leva todos os veículos do aparelho para a conta mesmo que a soma passe de 1 (`vehicles.max`). O app já aceita quem tem 2 ou mais veículos de antes do limite; a junção segue a mesma regra. Alternativa: recusar a junção quando passar. Recomendação: manter, perder veículo do usuário é pior.
- **Mesmo e-mail em Google e Apple:** são contas separadas (não juntamos por e-mail, que o usuário pode esconder na Apple). Recomendação: manter.
- **Sem `nonce`:** a API não confere `nonce` no `id_token`. Um token roubado só serve nos poucos minutos em que vale. Alternativa: o app gera um `nonce` e a API confere. Recomendação: manter por ora.
- **Contas e chaves de terceiros:** o login precisa de um projeto no Google Cloud (grátis) e de uma conta Apple Developer (paga, a exceção do projeto para as lojas). Dependem de você: criar os client IDs e pôr em `GOOGLE_CLIENT_IDS` e `APPLE_CLIENT_ID` em cada ambiente do Render.

### 3.27 Login no app: escolhas que fiz

- **Pré-requisitos que dependem de você:** projeto no Google Cloud (client IDs web, Android e iOS, com o SHA-1 do build de cada ambiente) e App ID com "Sign in with Apple" na conta Apple Developer; depois, pôr os IDs no `eas.json` (perfis `development`, `staging` e `production`) e `GOOGLE_CLIENT_IDS` e `APPLE_CLIENT_ID` no Render. Sem eles o app abre normalmente e o botão avisa que o login não está disponível.
- **Excluir conta usa o botão "danger":** o Figma (19b) tem um botão sem fundo com texto vermelho; o app só tem o `danger` (fundo rosa claro), que já é o usado em "Excluir veículo". Alternativa: criar a variante no catálogo. Recomendação: manter.
- **"Tudo salvo!" some sozinho:** depois do envio, o cartão verde da tela 23 fica ~2 s e a tela volta para a Conta (o Figma mostra o cartão como "exemplo", sem botão). Se algo não for enviado, o cartão âmbar "Conta conectada / Não deu para terminar agora. Continuamos assim que houver internet." aparece no lugar. Texto meu. Alternativa: botão "Continuar". Recomendação: manter.
- **"Usar só os da conta" reaproveita a tela 23** com o título "Buscando seus dados" e anel parado (o Figma só tem o envio, e o fluxo 6 cita uma tela "Baixando seus dados" sem frame). No Login, trazer os dados da conta só desabilita os botões enquanto espera. Recomendação: pedir esses dois frames ao designer.
- **Conta vazia junta direto**, sem perguntar. Alternativa: sempre perguntar. Recomendação: manter.
- **Sair da conta apaga os dados do aparelho** (exclusão física: a cópia vale na conta) e as credenciais do aparelho. Alternativa: manter os dados no aparelho como anônimo (mistura de pessoas no mesmo celular; mais complexo). Recomendação: manter. O texto do alerta é meu.
- **Sessão da conta recusada:** quem entrou com login não vira anônimo sozinho, mas o app ainda não mostra aviso nem leva ao Login ("sua sessão expirou"). Falta o texto e a tela. Recomendação: fazer num PR pequeno depois.
- **Sem rota de logout na API:** sair só apaga a sessão do aparelho; o refresh token fica válido até vencer (90 dias). Recomendação: revogar o token do aparelho junto com "Excluir conta" (próximo item).
- **Nome e e-mail ficam no aparelho** (`app_settings`) para a tela Conta; somem ao sair. `docs/05` foi atualizado.
- **Registros da Conta** são abastecimentos e serviços de manutenção (sem leituras de km nem prazos), a mesma conta da API na tela 24.
