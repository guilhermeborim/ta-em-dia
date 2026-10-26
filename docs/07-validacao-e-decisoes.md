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
- [ ] **Adiado (sem conta Apple Developer):** o mesmo teste com o `identityToken` da Apple em um iPhone. Com `APPLE_CLIENT_ID` vazio, `POST /v1/auth/apple` devolve 503 `PROVIDER_NOT_CONFIGURED`; confira isso no staging.
- [ ] `POST /v1/auth/link` com o token de um usuário anônimo e um login novo: 200 `outcome: linked`, o mesmo `user.id`, `users.isAnonymous = false` e `auth_identities` com a linha do Google no Neon. Com um login que já tem conta: 409 `ACCOUNT_EXISTS` com `account.vehicles` e `account.records`; repetir com `onConflict: "merge"` devolve `merged` e o usuário anônimo some do Neon. Se o anônimo tiver veículo na API e a conta também (soma maior que 1), `merge` devolve 409 `VEHICLE_LIMIT_REACHED` e nada muda; `use_account` funciona.
- [ ] No Neon, `auth_identities.email` e `users.email` têm só o e-mail confirmado; nenhum `id_token` aparece nos logs do Render.

### 2.19 App: login com Google e Apple, Conta e vincular (telas 3, 19, 19b, 23 e 24)

Testado só com testes automáticos (API de mentira, SQLite em memória). Nunca contra a API real, nem com um Google ou Apple de verdade, nem no aparelho. **Exige development build** (`@react-native-google-signin/google-signin` e `expo-apple-authentication` são módulos nativos): no Expo Go, os botões avisam "ainda não está disponível". Pré-requisitos: PR da API (2.18) no ar, `GOOGLE_CLIENT_IDS` e `APPLE_CLIENT_ID` no Render e os `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` e `GOOGLE_IOS_URL_SCHEME` no perfil do `eas.json` (ver 3.27).

- [ ] **Android, Login (tela 3):** "Entrar com Google" abre a janela do Google, entra e leva ao "Primeiro veículo". Fechar a janela não mostra erro. Sem internet mostra "Sem conexão com o servidor...". Não aparece botão da Apple.
- [ ] **iPhone, Login:** "Entrar com Apple" abre a folha da Apple, pede nome e e-mail e entra. Com "Ocultar e-mail", a Conta mostra o começo do e-mail de retransmissão ou "Sua conta".
- [ ] **Conta que já tem veículo (outro celular):** entrar no Login com ela leva direto ao pedido de notificações, e Início, Veículos e Abastecimentos mostram os dados.
- [ ] **Conta (tela 19, sem login):** cartão roxo, botão do Google (e da Apple só no iPhone), linhas Modo, Dados salvos, Veículos e Registros iguais ao frame. Início e Mais levam a ela.
- [ ] **Vincular conta nova (19 → 23):** com veículos e abastecimentos locais, entrar com Google mostra "Enviando seus dados", o contador sobe ("N de M registros") e termina com "Tudo salvo!"; volta sozinho para a Conta logada (19b): nome, e-mail, "Sincronizado", Último sync "hoje, HH:MM", Veículos e Registros certos. No Neon, `users.isAnonymous = false` e os dados estão lá.
- [ ] **Conta que já tem dados (tela 24):** entrar com uma conta que tem dados de outro celular abre a folha "Essa conta já tem dados" com os números certos e "Juntar dados" marcado. "Juntar dados" envia o que é do aparelho e a conta fica com a soma; "Usar só os da conta" apaga os dados do aparelho, mostra a folha "Baixando seus dados" e depois os da conta. Fechar a folha (toque fora ou voltar) não muda nada e o botão do Google volta a funcionar.
- [ ] **Conta vazia que já existe:** vincular a ela junta direto, sem a folha.
- [ ] **Limite de 1 veículo na junção:** com 1 veículo no aparelho e 1 na conta, a folha da tela 24 abre com "Juntar dados" desabilitado ("No plano grátis, o app guarda 1 veículo"), "Usar só os da conta" já marcado e "Continuar" funcionando. Com 0 veículos no aparelho (só documentos) ou 0 na conta, "Juntar dados" fica habilitado.
- [ ] **Folha "Baixando seus dados" (estilo da tela 24):** aparece no Login depois de escolher a conta do Google (conta com dados) e em "Usar só os da conta"; some sozinha ao terminar; no Login não fecha com toque fora. Sem internet no meio, o Login mostra o aviso de conexão e dá para tocar de novo.
- [ ] **Fonte grande:** folha da tela 24 e linhas da Conta não cortam texto; o botão "Continuar" da folha fica visível.
- [ ] **Sair da conta (19b):** com tudo enviado, o alerta diz que os dados continuam na conta; depois do "Sair", o app volta ao Login sem dados. Com o modo avião e dados novos (não enviados), o alerta avisa quantos registros se perdem. Entrar de novo com a mesma conta traz tudo de volta. "Continuar sem login" depois de sair cria um usuário anônimo novo (sem erro).
- [ ] **Avisos:** depois de sair (e depois de "Usar só os da conta"), nenhum aviso do veículo antigo chega; depois de entrar numa conta com dados, os avisos dela são agendados.
- [ ] **Segundo aparelho:** entrar com a mesma conta em outro celular traz tudo; um abastecimento novo em um aparece no outro depois de abrir o app (o sync roda ao abrir e depois de gravar).
- [ ] **Refresh recusado:** apagar `refresh_tokens` da conta no Neon e esperar o acesso vencer: o app continua abrindo com os dados locais e não vira anônimo sozinho (confira em Status: sessão ausente). Falta uma tela que peça para entrar de novo (3.27).
- [ ] **Nada em log:** nenhum `id_token`, e-mail ou nome aparece em `adb logcat` nem no log do Render.
- [ ] "Excluir conta" abre a tela 22 (ver 2.23).

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

### 2.20 Ajustes do app (branch `fix/ajustes-app`)

- [ ] Android: teclado de preço por litro, litros e total pago mostra a vírgula (`numeric`). Se não mostrar no seu aparelho, avise.
- [ ] Preço por litro: digitar `65` mostra `6,5`; `655` mostra `6,55`.
- [ ] Relatórios abre em "Mês".
- [ ] Configurações → Exportar dados: o aviso "Em breve" aparece acima da barra de navegação do Android.
- [ ] Início → Próximos alertas → Ver todos: abre "Todos os alertas" com manutenções e documentos juntos; tocar num card abre o item; voltar retorna ao Início.

**Decisão aberta:** a tela "Todos os alertas" não tem frame no Figma; usei o layout do Início (barra de topo + cartões). Alternativa: pedir o frame ao designer. Recomendo manter até lá.

### 2.21 Posto padronizado no abastecimento (tela 9)

- [ ] Novo abastecimento sem postos salvos: nenhum chip aparece sob "Posto".
- [ ] Depois de um abastecimento com "Posto Ipiranga", ao abrir o campo e digitar "ipi" aparece o chip "Posto Ipiranga"; tocar nele preenche o campo.
- [ ] Digitar "posto ípiranga" (outra grafia) e salvar grava "Posto Ipiranga" (confira em Histórico ou na lista de abastecimentos).
- [ ] Digitar um nome novo salva o nome novo e ele aparece nas sugestões do próximo abastecimento.
- [ ] Posto é obrigatório: `*` vermelho no rótulo; salvar vazio mostra "Informe o posto" abaixo da caixa e o erro some ao digitar.
- [ ] Android e iOS: ao tocar em "Posto", a tela sobe, o campo e os chips ficam visíveis acima do teclado e dá para rolar (`KeyboardAvoidingView` agora usa `padding` nos dois sistemas).
- [ ] Chips quebram em linhas com fonte grande, sem cortar o nome longo e sem empurrar o botão Salvar para fora da tela; o teclado não cobre os chips.

### 2.23 App: Excluir conta (tela 22)

Precisa do login com Google funcionando e da API no ar com `DELETE /v1/auth/account` (PR da API).

- [ ] Conta → "Excluir conta" abre a tela 22 igual ao Figma (ícone de lixeira rosa, título, cartão com 4 linhas e "x" vermelho, campo, botões). Os números (veículos e registros) batem com a Conta.
- [ ] "Excluir minha conta" fica desabilitado até digitar EXCLUIR (minúsculas também valem); o teclado não cobre o campo nem os botões.
- [ ] Com internet: excluir leva ao Login, o aparelho fica sem dados e a conta some do banco (veja 2.22). Entrar de novo com o mesmo Google cria uma conta vazia.
- [ ] Sem internet (modo avião): aviso "Sem conexão com o servidor. Nada foi apagado..." e os dados continuam no aparelho e na API.
- [ ] Cancelar e a seta voltam para a Conta sem apagar nada.
- [ ] Os avisos de manutenção e de documentos deixam de chegar depois de excluir.
- [ ] Fonte grande: título e linhas do cartão quebram sem cortar.

### 2.22 API: excluir conta (`DELETE /v1/auth/account`)

- [ ] Com Postgres real (`docker compose up -d`, `pnpm db:migrate`): crie um usuário com veículo, abastecimento, manutenção, prazo e aparelho; chame `DELETE /v1/auth/account` com o token dele e confira que `users`, `auth_identities`, `devices`, `refresh_tokens`, `vehicles` e as tabelas filhas ficaram sem nenhuma linha dele (inclusive as com `deleted_at`).
- [ ] Chamar de novo com o mesmo token responde 200 (idempotente).
- [ ] Sem token: 401.

### 2.33 Rascunho de abastecimento (C1, PR #69)

Sem frame no Figma. No Android, com um aparelho que já tem abastecimentos (atualizando de uma versão anterior):

- [ ] **Migration 9** (recria `fuel_entries`): depois de atualizar, os abastecimentos antigos continuam na lista, no Histórico e no Início, com os mesmos km/l, médias e totais.
- [ ] Criar um rascunho pela voz (falar só o valor, sem posto; ver 2.35): a tela fecha e o item aparece na aba Abastecer com a etiqueta âmbar "Incompleto", total "—" (ou o valor) e sem km/l; no mês, o resumo mostra "N incompleto" à parte do total.
- [ ] O mesmo rascunho aparece no Histórico com "Incompleto". Os totais do Início, os relatórios, o km/l e o "km atual" **não** mudam por causa dele.
- [ ] Tocar no rascunho (Abastecer ou Histórico) abre "Completar abastecimento" com os campos preenchidos, o km sugerido e a data original. Preencher o que falta e salvar: ele vira abastecimento comum (sem etiqueta), o Início mostra o toast e o resumo conta o gasto.
- [ ] "Incompleto" legível em fonte grande, nos dois cartões (lista e Histórico); alvo de toque do cartão ≥ 44 pt.
- [ ] Com sync ligado (conta com login): o rascunho aparece no outro aparelho e, depois de completo, deixa de ser rascunho lá também.

### 2.34 Lembrete do rascunho de abastecimento (C2, PR #70)

Sem frame no Figma (é uma notificação). Android com development build, notificações permitidas. Para não esperar as 20h, ajuste data e hora do aparelho para perto das 20h e abra o app (ele reagenda ao abrir e ao voltar para a frente).

- [ ] Salvar um rascunho (pela voz: posto no chip e falar só o valor) às 19h50: às 20h chega "Falta o km do abastecimento de hoje no Shell"; sem posto, "Falta o posto do abastecimento de hoje"; com vários dados faltando, "Falta completar o abastecimento de hoje no Shell".
- [ ] No dia seguinte, às 20h, chega o segundo aviso ("... de ontem ..."). Depois disso, nada mais.
- [ ] Rascunho criado depois das 20h: só o aviso do dia seguinte.
- [ ] Tocar no aviso abre "Completar abastecimento" com o rascunho (app fechado e app aberto).
- [ ] Completar o rascunho antes das 20h: nenhum aviso chega.
- [ ] Sem permissão de notificações: nada é agendado e nenhum pedido aparece.
- [ ] Os outros avisos (manutenção, documentos, atualizar o km) continuam chegando.

### 2.35 Falar o abastecimento (C4, PR #73)

Sem frame no Figma (botão Falar, cartão da voz, aviso do áudio, pergunta, resumo de 5 s). Dependência nativa nova: `expo-speech-recognition` (exige development build; no Expo Go o "Falar" diz que a fala não está disponível). Nenhum emulador estava aberto: nada foi visto rodando. Android 13+ com development build e internet:

- [ ] Primeiro toque no microfone: aparece o cartão "Antes de falar"; "Agora não" fecha; "Continuar" pede o microfone com o texto em português e começa a ouvir. No segundo uso, o cartão não volta.
- [ ] Recusar o microfone: cartão "Sem acesso ao microfone..." e o formulário segue normal.
- [ ] O microfone fica ao lado de "Salvar abastecimento"; ouvindo, vira três pontinhos animados e **nenhum texto falado aparece**; 2 s de silêncio encerram; tocar nos pontinhos encerra.
- [ ] Com o posto escolhido antes (chip), falar "150 reais, 25 litros, km [último + 300], encheu": salva sozinho, cartão verde "Abastecimento salvo" com "Shell · R$ 150,00 · 25 L · 45.300 km"; após 5 s volta ao Início com o toast do km/l.
- [ ] **Desfazer** no resumo: o abastecimento some (lista, Início) e o formulário fica preenchido. **Editar**: fica na tela, o microfone some, mudar um campo e salvar atualiza o mesmo abastecimento (não cria outro).
- [ ] Sem posto: salva como rascunho ("Salvo como rascunho · Falta o posto"), a tela **não fecha sozinha**; informar o posto e tocar em "Salvar abastecimento" completa o mesmo registro (sem duplicar); **Completar** também deixa o formulário na tela; fechando no X, o rascunho aparece "Incompleto" na lista; às 20h chega o lembrete (C2).
- [ ] Sem falar o km: rascunho "Falta o km" (o km sugerido não conta).
- [ ] Falar "50": pergunta "50 é o valor ou os litros?" com os botões; responder continua o fluxo.
- [ ] Km menor que o último ou "150 reais 4 litros": campo em vermelho com a mensagem, cartão "Confira os campos em vermelho e salve" e nada salvo.
- [ ] Modo avião: cartão "Falar precisa de internet. Preencha abaixo."
- [ ] Aparelho sem o app Google / serviço "Reconhecimento e síntese de fala": "A fala não está disponível neste aparelho".
- [ ] Barulho de posto (ou rádio ligado): ver o que o reconhecimento devolve e se o interpretador acerta; anotar frases que falharam para novos testes em `shared`.
- [ ] Fonte grande: cartão e botões da voz legíveis, botões ≥ 44 pt; leitor de tela lê "Falar o abastecimento" e, ouvindo, "Parar de ouvir".
- [ ] iOS (quando houver development build): pedido de microfone e de reconhecimento de fala em português, Ditado/Siri desligado mostra "não está disponível".

### 2.12 O que veio antes (não revisado aqui)

Boas-vindas, Login offline, Aviso sem login, Primeiro veículo, Permissão de notificações, Abas, Novo abastecimento, Lista de abastecimentos, Início, Manutenções (lista, plano, registrar) e Alertas de manutenção (PRs até #26). Vale uma passada completa de fluxo: primeiro uso → primeiro veículo → notificações → primeiro abastecimento → ativar um lembrete de manutenção.

### 2.13 Migrations e dados existentes

Com um aparelho que já tem dados da versão anterior ao PR #28:

- [ ] Depois de atualizar, os veículos antigos seguem a ordem de criação (migration 5, `sort_order`).
- [ ] Atualizar km funciona num veículo antigo (migration 6, `odometer_readings`).
- [ ] Prazos funcionam (migration 7, `documents`).
- [ ] **Moto (migration 8, recria `vehicles`)**: com veículos antigos (um carro e uma moto cadastrados antes), depois de atualizar nada some: mesma ordem, placa, km, abastecimentos, serviços e prazos; a moto antiga passa a mostrar o ícone de moto e "Tipo: Moto". Cadastre uma moto nova (Carro/Moto no formulário) e confira o ícone no Início (seletor), em Meus veículos e no detalhe. Confira também o ícone no Android e no iOS, em fonte grande.
- [ ] Voltar para a versão anterior do app com o banco novo não quebra (as migrations só adicionam colunas e tabelas, fora as que recriam `vehicles` e `fuel_entries`). A migration 8 recria uma tabela e grava `motorcycle`: voltar à versão anterior mostra a moto com ícone de carro, e editar essa moto na versão antiga falha. Só vale para quem testou o app antes do lançamento.

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

- **Mesmo e-mail em Google e Apple:** são contas separadas (não juntamos por e-mail, que o usuário pode esconder na Apple). Recomendação: manter.
- **Sem `nonce`:** a API não confere `nonce` no `id_token`. Um token roubado só serve nos poucos minutos em que vale. Alternativa: o app gera um `nonce` e a API confere. Recomendação: manter por ora.
- **Apple adiada:** sem conta Apple Developer (paga), `APPLE_CLIENT_ID` fica vazio e não há build de iOS. O login com Apple está pronto na API e no app, mas sem teste real. Lembrete: a App Store exige "Entrar com Apple" quando há login com Google (Guideline 4.8), então a conta paga é pré-requisito para publicar no iPhone. O Google precisa de um projeto no Google Cloud (grátis); ponha o client ID web em `GOOGLE_CLIENT_IDS` em cada ambiente do Render.

### 3.28 Posto padronizado: escolhas que fiz

- **Sem frame no Figma:** as sugestões são chips (o `Chip` do app) logo abaixo do campo "Posto" (obrigatório), até 5, os mais usados primeiro; sem texto digitado, mostram os mais usados. Alternativa: lista suspensa sobre o teclado. Recomendação: manter e desenhar no Figma depois.
- **Nomes antigos não são reescritos:** abastecimentos já gravados com grafias diferentes ("shell" e "Shell") continuam como estão; só os novos reaproveitam o nome mais usado. Alternativa: migration que unifica os antigos. Recomendação: manter até existir "Seus postos".
- **Só reaproveita nome igual:** "Shell" e "Shell Centro" são postos diferentes (sem aproximação por semelhança). Recomendação: manter.

### 3.29 Excluir conta no app: escolhas que fiz

- **Sem "e as fotos" no cartão:** o Figma lista "2 veículos e as fotos", mas o app não guarda fotos (`docs/05`). O texto vira só "2 veículos". Recomendação: manter e corrigir o frame.
- **Números reais no cartão:** o Figma mostra "47 registros"; o app mostra os registros do aparelho (abastecimentos e manutenções), como na Conta.
- **Sem aviso de sucesso:** depois de excluir, o app volta direto ao Login, sem mensagem. Alternativa: um aviso "Conta excluída" no Login. Recomendação: fazer num PR pequeno se quiser.
- **Falha mostra aviso temporário** (sem frame no Figma): "Sem conexão com o servidor. Nada foi apagado. Tente de novo em instantes." e "Não foi possível excluir a conta agora. Nada foi apagado. Tente de novo." Textos meus. Recomendação: manter.
- **Digitar EXCLUIR** vale em minúsculas e com espaços nas pontas (o campo já abre em maiúsculas). Recomendação: manter.
- **Conta anônima não tem o botão:** quem não entrou com login só tem dados no aparelho; "Sair" não existe para ela. Para apagar tudo, basta desinstalar o app (a API apaga a conta anônima após 12 meses sem uso). Recomendação: manter.

### 3.28 Excluir conta: escolhas que fiz na API

- **Sem revogar o token da Apple:** `docs/05` pede revogar o token via API da Apple, mas isso exige a chave privada da conta Apple Developer (paga), que ainda não existe. A exclusão apaga tudo na API; a revogação entra junto com o login Apple real. Recomendação: manter por ora e fazer antes de publicar no iPhone.
- **Sem confirmação extra no servidor:** o token de acesso basta (a confirmação fica no app). Alternativa: pedir login recente. Recomendação: manter.
- **Backups do provedor** expiram em até 30 dias (já dito em `docs/05`); a Política precisa dizer isso.

### 3.27 Login no app: escolhas que fiz

- **Pré-requisitos que dependem de você:** projeto no Google Cloud (client ID web e client ID Android com o SHA-1 do build de cada ambiente; o do iOS só quando houver build de iOS), depois pôr os IDs no `eas.json` (perfis `development`, `staging` e `production`) e `GOOGLE_CLIENT_IDS` no Render. Sem eles o app abre normalmente e o botão avisa que o login não está disponível. Apple fica para depois (3.26).
- **Excluir conta usa o botão "danger":** o Figma (19b) tem um botão sem fundo com texto vermelho; o app só tem o `danger` (fundo rosa claro), que já é o usado em "Excluir veículo". Alternativa: criar a variante no catálogo. Recomendação: manter.
- **"Tudo salvo!" some sozinho:** depois do envio, o cartão verde da tela 23 fica ~2 s e a tela volta para a Conta (o Figma mostra o cartão como "exemplo", sem botão). Se algo não for enviado, o cartão âmbar "Conta conectada / Não deu para terminar agora. Continuamos assim que houver internet." aparece no lugar. Texto meu. Alternativa: botão "Continuar". Recomendação: manter.
- **Conta vazia junta direto**, sem perguntar. Alternativa: sempre perguntar. Recomendação: manter.
- **Sair da conta apaga os dados do aparelho** (exclusão física: a cópia vale na conta) e as credenciais do aparelho. Alternativa: manter os dados no aparelho como anônimo (mistura de pessoas no mesmo celular; mais complexo). Recomendação: manter.
- **Sessão da conta recusada:** quem entrou com login não vira anônimo sozinho, mas o app ainda não mostra aviso nem leva ao Login ("sua sessão expirou"). Falta o texto e a tela. Recomendação: fazer num PR pequeno depois.
- **Sem rota de logout na API:** sair só apaga a sessão do aparelho; o refresh token fica válido até vencer (90 dias). Recomendação: revogar o token do aparelho junto com "Excluir conta" (próximo item).
- **Nome e e-mail ficam no aparelho** (`app_settings`) para a tela Conta; somem ao sair. `docs/05` foi atualizado.
- **Registros da Conta** são abastecimentos e serviços de manutenção (sem leituras de km nem prazos), a mesma conta da API na tela 24.

### 3.31 Posto local: coordenada fica só no aparelho (Fase C, C0)

O dono decidiu que a coordenada do usuário não sai do aparelho. Posto fora do OpenStreetMap nasce da posição do usuário, então o sync (C6) envia `name`, `brand` e `street` e **não** envia `lat`/`lng` desse posto (`docs/05`, `docs/03`). Consequência: num segundo aparelho, o posto local aparece pelo nome, mas não é sugerido por proximidade até alguém abastecer lá de novo.

Alternativa: enviar a coordenada arredondada (~1 km). Recomendação: manter só no aparelho.

### 3.32 Docs da Fase C: escolhas que fiz (C0)

- **Cache da API (`places`):** tabela `place_cells` no Postgres (geohash de 5 caracteres, lista de postos, data da busca), validade de 30 dias, em vez de memória (o Render grátis dorme e perde a memória). Alternativa: cache em memória. Recomendação: manter.
- **Rota `GET /v1/places?geohash=` exige token** (inclui o anônimo), com limite de chamadas. Alternativa: pública. Recomendação: manter.
- **Lembrete no posto (C7) continua na tabela da Fase 2 do roadmap**, com nota de que é o item C7 do backlog. Alternativa: mover para o MVP. Recomendação: manter até as lojas aprovarem o "sempre".
- **Voz sem Premium por enquanto.** O C4 pôs o botão atrás da flag `fuel.voice`, ligada nos dois planos (não decide nada: só deixa a troca a um passo). Falta decidir se vira Premium. Recomendação: grátis, porque é o que resolve a dor do posto.

### 3.33 Rascunho de abastecimento: escolhas que fiz (C1)

- **Etiqueta e textos meus:** "Incompleto" (âmbar, `StatusPill`), "Completar abastecimento", "Faltam dados" e "N incompleto(s)" no resumo do mês. Recomendação: manter.
- **Rascunho só aparece em "Tudo"** na lista de abastecimentos (filtros de combustível e "Só tanque cheio" o escondem) e fica fora do total e da contagem do mês. Alternativa: mostrar também nos filtros. Recomendação: manter.
- **Sem excluir rascunho pela tela:** quem não quer um rascunho precisa completá-lo; abastecimento completo também não tem exclusão na tela hoje. A exclusão existe no Model (`deleteFuelEntry`). Alternativa: botão "Excluir rascunho" com confirmação no formulário. Recomendação: fazer num PR pequeno junto da edição de abastecimento.
- **Validações novas (km, faixa de R$ 2 a R$ 12, 2%) não valem no formulário manual:** estão em `shared` (`fuelEntryIssues`) e entram com a voz (C4), para não mudar o que o formulário aceita hoje (por exemplo, registrar um abastecimento antigo com km menor). Alternativa: aplicar já no formulário manual como aviso. Recomendação: manter até o C4.
- **Migration 9 recria `fuel_entries`:** o SQLite não tira `NOT NULL`, então o item "migration que só adiciona" virou "recria a tabela com os mesmos dados" (como a 8 fez com `vehicles`). No Postgres, `DROP NOT NULL`. Alternativa: gravar 0 nas colunas numéricas do rascunho e só adicionar `status`. Recomendação: manter; zeros misturariam rascunho com dado de verdade em toda consulta.

### 3.34 Lembrete do rascunho: escolhas que fiz (C2)

- **Textos meus:** "Falta o km do abastecimento de hoje no Shell" (o do backlog), "Faltam os valores...", "Falta o combustível...", "Falta dizer se o tanque ficou cheio...", "Falta completar o abastecimento de hoje no Shell" (quando falta mais de um dado) e "de ontem" no segundo aviso. Recomendação: manter.
- **Sem interruptor em Configurações:** o lembrete segue só a permissão de notificações. Os outros avisos têm interruptor (manutenção, documentos, km). Alternativa: um interruptor "Lembrar de completar abastecimentos" (sem frame no Figma). Recomendação: manter até alguém reclamar.
- **O dia conta do `created_at` do rascunho**, não da data do abastecimento (que pode ser outro dia). Num segundo aparelho, o rascunho que chega pelo sync ganha o `created_at` do momento do pull, então ele também lembra (às 20h do dia da chegada); completar em qualquer aparelho tira os avisos dos dois depois do sync. Alternativa: sincronizar a data de criação. Recomendação: manter.
- **Todos os veículos ativos** entram (não só o do Início), como os prazos de documentos. Rascunho de veículo arquivado não avisa.

### 3.36 Falar o abastecimento: escolhas que fiz (C4)

- **Dependência nativa nova:** `expo-speech-recognition` 58 (biblioteca da comunidade, não do time do Expo; o Expo não tem módulo próprio de reconhecimento de fala). Exige development build; sem ele o botão avisa que a fala não está disponível. Alternativa: nenhuma grátis sem módulo nativo. Recomendação: manter.
- **Telas sem frame no Figma:** botão redondo de microfone (cor `accent`, 44 pt) ao lado de "Salvar abastecimento", posição escolhida pelo dono; ouvindo, três pontinhos animados (`ListeningDots`, novo no catálogo) e nenhum texto falado na tela; cartão da voz (`SpeechCard`, no catálogo) acima dos botões para aviso, pergunta, resumo, inválido e falha. Recomendação: pedir os frames ao designer com o fluxo 2b.
- **Textos meus:** "Antes de falar" e o aviso do áudio, "Confira os campos em vermelho e salve", "Salvo como rascunho · Falta o posto", "Fechar", os rótulos de acessibilidade "Falar o abastecimento" e "Parar de ouvir", as mensagens de falha ("Falar precisa de internet...", "Não ouvi nada...", "Não entendi os valores...", "Sem acesso ao microfone...") e os pedidos do sistema em `app.config.ts`. Recomendação: revisar junto com a Política de Privacidade.
- **Tanque cheio não dito vale "não":** a regra de completo do C1 exige sim ou não, e o formulário já vem desligado. Sem isso, quase toda fala viraria rascunho. Alternativa: perguntar "Encheu o tanque?". Recomendação: manter.
- **Km sugerido não conta:** sem km falado ou digitado, vira rascunho "Falta o km" (como o fluxo 2b descreve). Alternativa: aceitar o sugerido. Recomendação: manter.
- **O posto não é falado:** vem do formulário (chip antes de falar) até o C6; sem posto, a fala vira rascunho. Alternativa: entender "no Shell" na frase. Recomendação: esperar o C6.
- **Desfazer deixa o formulário preenchido** (para corrigir ou falar de novo) e **Editar fica na tela** atualizando o mesmo registro, já que abastecimento completo ainda não tem tela de edição. Recomendação: manter.
- **"Falar" só no Novo abastecimento**, não no Completar rascunho (salvar sozinho sobre um rascunho existente é outro fluxo). Recomendação: manter.
- **Validações só na voz:** o formulário manual continua aceitando km menor (abastecimento antigo). O item 3.33 sobre isso segue em aberto.
- **Sem "Cancelar" enquanto ouve:** tocar nos pontinhos encerra e o que foi dito é interpretado. Quem não quer o resultado usa "Desfazer". Alternativa: toque longo para cancelar. Recomendação: manter.
- **Aviso do áudio guardado só no aparelho** (`app_settings`, chave `fuel.voice_notice_seen`): reinstalar mostra de novo. Recomendação: manter.

### 3.35 Interpretador de fala: escolhas que fiz (C3)

Código puro em `shared`, sem tela; nada a validar no aparelho. O que o reconhecimento de fala do celular entrega de verdade só se vê no C4 (o texto de teste foi escrito como o Android costuma devolver: dígitos, "R$", "45 mil e 300").

- **Número que sobra com um só campo em aberto não vira pergunta:** "150 reais 4" grava 4 como litros (preço R$ 37,50) e deixa a validação deixar o preço em vermelho. Só pergunta quando valor **e** litros estão em aberto. Alternativa: perguntar também aqui ("4 são os litros?"). Recomendação: manter; pergunta com uma opção só é atrito no posto.
- **Perguntas, uma por vez:** o interpretador devolve só a primeira; o app responde e chama de novo. Texto da pergunta é o do backlog ("50 é o valor ou os litros?"); a opção "km" não aparece na pergunta (inteiro de 1.000 para cima já é km). Recomendação: manter.
- **Inteiro de 1.000 para cima sem palavra é sempre km**, mesmo longe do último (a validação do C1 marca "km mais de 2.000 acima"). Alternativa: só km quando perto do último. Recomendação: manter, para o erro aparecer em vermelho em vez de sumir.
- **"45 300" (milhar com espaço) só junta perto de "km"**; sem "km" ao lado, são dois números.
- **"6.299" sem palavra:** vira o preço R$ 6,299 (e "45.300" vira km 45.300). Com "km", o ponto é milhar.
- **Decimal por extenso só entra no preço** ("seis e vinte e nove o litro"). "Vinte litros e meio" e outras frações por extenso não são entendidas.
- **Se corrigindo, vale o último citado** ("paguei 100 reais, não, foram 150 reais" → 150). Alternativa: ignorar a frase inteira e perguntar. Recomendação: manter.
- **Limites conhecidos:** nada de data ("ontem", "dia 20" é ignorado), nada de posto falado ("no Shell" não preenche o posto; o posto vem da localização ou do formulário), "gás" sozinho não é GNV (só "gás natural" ou "GNV"), e dois combustíveis na mesma frase ficam com o último.
