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
- Teste **duas vezes**: com o app instalado do zero e **atualizando** uma versão antiga com dados (as migrations 5, 6 e 7 só adicionam, mas precisam rodar sobre dados reais; ver 2.13).
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
- [ ] **Segurar** o cartão abre "Mover para cima / Mover para baixo". O primeiro da lista vira o veículo ativo: confira Início, Abastecer, Manutenção, Histórico, Relatórios e Documentos mudando.
- [ ] Com um veículo só não há dica nem menu de reordenar.
- [ ] Leitor de tela (TalkBack): ações "Mover para cima/baixo" no cartão.
- [ ] Seção "Arquivados" no fim aparece só quando há arquivados e abre o detalhe deles.

### 2.3 Detalhe do veículo e Atualizar km (tela 17, PR #29)

Toque num cartão de Meus veículos.

- [ ] Placa Mercosul (só se cadastrada), Km atual, Média/dia, Custo/km e as linhas Marca e modelo, Ano, Combustível, Km atualizado.
- [ ] Veículo sem placa, sem marca/modelo ou sem ano: as linhas somem sem deixar buraco.
- [ ] "Km atualizado" diz "há N dias" certo; sem nenhuma leitura diz "Só o km inicial".
- [ ] **Atualizar km** (botão do rodapé): km menor que o atual dá erro; igual vale; maior atualiza Km atual, "Km atualizado" e a média/dia.
- [ ] Depois de atualizar o km, os avisos de manutenção e os alertas do Início refletem o km novo.
- [ ] Média/dia mostra 30 km enquanto não há duas leituras (regra de `shared`): confirme se o texto não confunde.
- [ ] Custo/km "—" quando não há km rodado.

### 2.4 Editar, arquivar e excluir veículo (PR #30)

Lápis no topo do detalhe.

- [ ] Editar marca, modelo, ano, apelido e placa. Placa inválida ("12") dá erro; "bra2e19" vira "BRA2E19"; vazia remove.
- [ ] **Arquivar**: o veículo some das listas e do Início; vira o ativo o próximo da ordem; aparece em "Arquivados". **Restaurar** devolve ao fim da ordem.
- [ ] Arquivar o **único** veículo: o app fica sem veículo ativo (telas mostram "Cadastre seu veículo").
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
- [ ] Prazo cadastrado já dentro da janela (ex.: faltam 10 dias) **não** dispara o aviso de 30 dias de forma retroativa.
- [ ] Prazo vencido não avisa mais.
- [ ] Início: prazo vencido ou perto de vencer aparece em "Próximos alertas" junto com a manutenção (máximo 2 no total, vencidos primeiro); tocar abre Documentos e prazos.
- [ ] Mais → "Documentos e prazos" mostra "1 vencido" em vermelho (ou "N perto de vencer" em âmbar).
- [ ] Trocar o veículo ativo (reordenar) troca os prazos da tela e os avisos agendados.

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
- [ ] Premium abre em modal: título, 5 recursos, "Avise-me quando lançar". Depois de tocar, o botão some e aparece "Anotado! Avisamos você quando o Premium sair." e isso continua ao reabrir o app.
- [ ] Em produção (`APP_ENV=production`) os atalhos "Status do app" e "Catálogo de componentes" não aparecem.

### 2.8 Configurações (tela 20, PR #35)

- [ ] Tela igual ao frame 20 (sem o bloco Aparência): grupos Notificações e Unidades e dados, interruptores, "30 e 7 dias" e "km"/"litros" à direita.
- [ ] Ligar um interruptor sem a permissão de notificações do sistema mostra "Notificações desativadas"; com a permissão, não mostra nada.
- [ ] **Manutenções** desligado: nenhum aviso de manutenção chega (os já agendados somem). Ligar de novo traz de volta.
- [ ] **Documentos** desligado: idem para os vencimentos.
- [ ] **Lembrar de atualizar o km** ligado: chega "Faz 15 dias sem atualizar o km do <veículo>" às 9h, 15 dias depois da última atualização (leitura, abastecimento ou serviço); tocar abre "Atualizar km" do veículo. Sem atualizar, repete a cada 15 dias ("Faz 30 dias..."). Para ver sem esperar, mude a data do aparelho.
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

### 2.10 App: usuário anônimo (PR #37)

Precisa da API de staging no ar (PR #36 aplicado) e de um build novo do app apontando para ela (`EXPO_PUBLIC_API_URL`).

- [ ] Primeira abertura: boas-vindas → "Continuar sem login" → o app abre normalmente, sem esperar a API. Em Mais → Status do app, a linha "Usuário anônimo na API" passa a "criado, acesso válido" (toque em "Testar de novo" depois de alguns segundos).
- [ ] No Neon: um `users` com `isAnonymous = true`, um `devices` com a plataforma certa e um `refresh_tokens`.
- [ ] Reabrir o app (e voltar do segundo plano) com acesso ainda válido não cria nada novo no banco.
- [ ] Modo avião na primeira abertura: o app funciona normal e a Status mostra "ainda não criado". Desligue o modo avião com o app aberto: em até 5 minutos (ou ao sair e voltar ao app) vira "criado".
- [ ] Com o serviço do Render dormindo, a primeira chamada demora cerca de 1 minuto e o app não trava nem mostra erro.
- [ ] Passados 15 minutos, ao voltar ao app a Status mostra "criado, acesso válido" de novo (o acesso foi renovado; o `users` continua um só).
- [ ] "Reiniciar App" (Status) apaga a sessão e, ao refazer o login, cria um usuário novo.
- [ ] Nenhum token, segredo ou id de aparelho aparece em `adb logcat`.

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
- [ ] Voltar para a versão anterior do app com o banco novo não quebra (as migrations só adicionam colunas e tabelas).

## 3. Decisões em aberto

Cada item traz minha recomendação. As decisões já tomadas saíram daqui e estão em `docs/01-roadmap.md`, `docs/03-arquitetura.md` e no backlog (`docs/06-backlog.md`, "Decisões do dono"). A numeração não é refeita: os números que faltam já foram decididos.

### 3.9 Relatórios

- "Ano" são os **últimos 12 meses** (não o ano civil). Qual faz sentido?
- Em "Mês", o gráfico mostra também o mês anterior (uma barra só não compara nada).
- Sem a categoria "Documentos" do Figma: documentos guardam só datas, sem valor. Atualizar o Figma ou guardar um valor opcional (dado novo; passa por `05-privacidade-lgpd.md`).
- Custo por km = só abastecimentos ÷ km rodados. Incluir manutenção?

### 3.10 Configurações (PR #35)

- **Aparência (Automático/Claro/Escuro)** está no Figma, mas o app é só tema claro (`apps/mobile/CLAUDE.md`) e o bloco foi omitido. Decidir se o Figma será atualizado ou se o tema escuro entra no roadmap.
- **Unidades** (km/mi, litros/galões): só km e litros existem; Distância e Volume mostram o valor e **não** têm seta nem abrem nada (o Figma tem seta). Trocar de unidade mexe em quase todas as telas. **Decidir** se entra no MVP; senão, tirar a seta do Figma. Recomendação: Fase 2.
- **"Lembrar de atualizar o km"**: assumi que avisa 15 dias depois da última atualização do km (leitura manual, abastecimento ou serviço; sem nenhuma, a data do cadastro do veículo) e **repete a cada 15 dias** até a pessoa atualizar. Só o veículo ativo. Alternativa: avisar uma vez só. Recomendação: manter a repetição, que só dura até atualizar.
- **Antecedência padrão** dos prazos: vale só para prazos **novos**; os existentes mantêm os próprios dias (a pessoa já os escolheu no prazo). Exige ao menos um dia marcado. Alternativa: aplicar também aos existentes. Recomendação: manter.
- **Pedido de permissão**: ligar um interruptor pede a permissão do sistema se ela ainda não foi dada (no Android 13+ só aparece uma vez). Se negada, o app avisa e segue sem agendar.
- Exportar dados fica "Em breve" (item da Fase B, LGPD).

### 3.11 Telas sem frame no Figma

Pedir ao designer, ou aprovar o que foi feito seguindo os formulários do app: **Atualizar km**, **Editar veículo** (com Arquivar e Excluir), **Adicionar/editar prazo** (com antecedências), **Antecedência** (Configurações, modal) os textos de confirmação de exclusão e o **seletor de data** (ícone de calendário nos campos de data; no iOS, uma folha com o calendário; no Android, o diálogo do sistema).

### 3.12 Textos para revisar

Escritos por mim, sem revisão de redação: alerta "Excluir veículo?" e "Excluir prazo?", avisos de arquivar/restaurar, "Anotado! Avisamos você...", mensagens de erro ("O km não pode ser menor que o atual (N km)", "Placa inválida (ex.: ABC1D23)"), estados vazios, mensagens do banner de prazos, e em Configurações "Notificações desativadas / Ative nos ajustes do aparelho para receber os avisos.", "Marque ao menos um dia" e o texto "Às 9h do dia marcado. Vale para os prazos novos; os que já existem mantêm os próprios dias.".

### 3.15 Ajuda e contato, Termos e Privacidade

"Ajuda e contato" mostra "Em breve": falta um e-mail ou página de suporte. As telas de Termos e Privacidade dependem das URLs públicas (`05-privacidade-lgpd.md`, checklist antes de publicar).

### 3.16 Detalhes visuais

- Cartão "Valor na FIPE" da tela 17 é Fase 2: não foi feito. Confirmar que sai do desenho do MVP.
- Cores da placa Mercosul (`#1A1A1F`, `#003399`) estão fixas no componente: não são da paleta do app.
- Título do Premium usa Bricolage **ExtraBold** (a Bold do Figma não está carregada); vale carregar a Bold?
- Fontes e cores novas dos gráficos (`chartFuel`, `chartMaint`) copiam as variáveis do Figma.

### 3.17 iOS

Sem development build para iOS, nenhum aviso agenda. Quando houver, apague `scheduler.ios.ts` e `permission.ios.ts` e repita as validações de notificação (2.5 e manutenção).

### 3.20 `GET /v1/config` continua público

Devolve sempre o plano `free`. Com o guard global agora existindo, ele ficou marcado `@Public()`. Quando o app mandar o token, a rota deve passar a ler o plano do usuário. Nada a decidir agora; só não esquecer no PR do app ou do sync.
