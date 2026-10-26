# Funcionalidades, telas e fluxos (briefing de design)

App gratuito para iOS e Android que ajuda o motorista a saber quanto gasta com o carro e quando fazer cada manutenção. Público: donos de carro no Brasil, de quem anota tudo a quem nunca anotou nada.

## Diretrizes

- **Plataformas:** iPhone e Android, telas de 360 a 430 pt de largura; tablet não é prioridade.
- **Tema:** só claro. Não há tema escuro.
- **Idioma:** português (BR); valores em R$, distâncias em km, volumes em litros.
- **Uso rápido:** registrar um abastecimento deve levar menos de 20 segundos, muitas vezes em pé no posto, com uma mão.
- **Offline:** tudo funciona sem internet; um indicador discreto mostra o estado do sync.
- **Acessibilidade:** contraste AA, alvos de toque ≥ 44 pt, suporte a fonte grande do sistema.
- **Campos obrigatórios:** todo campo obrigatório leva um `*` vermelho depois do rótulo; sem `*`, é opcional. Erro aparece em texto vermelho abaixo do campo. Nas tabelas abaixo, `*` também marca o obrigatório.
- **Premium:** recursos Premium aparecem com um selo e, no lançamento, levam a uma tela "Em breve".
- **Entregáveis esperados do design:** identidade (nome, ícone, cores, tipografia), design system básico, telas do MVP em tema claro, screenshots das lojas.

## Mapa de navegação

```mermaid
flowchart TD
  Splash --> Boas[Boas-vindas] --> Login
  Login -->|ou sem login| Aviso[Aviso sem login]
  Login --> Veiculo[1º veículo]
  Aviso --> Veiculo
  Veiculo --> Notif[Notificações] --> Tabs
  subgraph Tabs[Tab bar: 5 abas + botão + Abastecer]
    Inicio[Início: painel do mês, alertas, trocar veículo]
    Abastecer[Abastecer: lista, novo/editar, resumo km/l]
    Manut[Manutenções: próximas, feitas, plano, registrar]
    Hist[Relatórios: totais, gráficos]
    Mais[Mais: veículos, documentos, histórico, conta, configurações, Premium]
  end
```

O fluxo de entrada aparece só no primeiro uso; depois o app abre direto no Início, e "+ Abastecer" fica acessível de qualquer aba.

## Telas do MVP

São 22 telas, agrupadas por área.

### Entrada

| #   | Tela                       | Conteúdo                                                                                                                                                                                                    | Ações                    |
| --- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Splash                     | Logo, carregamento do banco local                                                                                                                                                                           | —                        |
| 2   | Boas-vindas (2 a 3 slides) | Benefícios: controle de gastos, alertas de manutenção, documentos em dia                                                                                                                                    | Pular, avançar           |
| 3   | Login                      | Logo, frase curta, botão "Entrar com Google", botão "Entrar com Apple" (só no iPhone; no Android só Google, sem botão da Apple), link/botão secundário "Continuar sem login", links de Termos e Privacidade | Entrar ou seguir anônimo |
| 4   | Aviso de modo sem login    | Explica que os dados ficam no aparelho e podem ser salvos numa conta depois                                                                                                                                 | Continuar, voltar        |
| 5   | Primeiro veículo           | Formulário curto: tipo, marca*, modelo*, ano*, apelido (opcional), km atual*                                                                                                                                | Salvar, pular            |
| 6   | Permissão de notificações  | Tela prévia explicando os alertas antes do pedido do sistema                                                                                                                                                | Permitir, agora não      |

### Abas principais

| #   | Tela                       | Conteúdo                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Ações                                                    |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| 7   | Início (painel)            | Seletor de veículo no topo; cartão do mês (gasto, projeção, % vs mês anterior); média do período (km/l, número principal), média exata em número menor com selo "tanque cheio" só quando houver dois tanques cheios seguidos, e custo por km; próximos alertas (manutenção, IPVA, CNH); último abastecimento                                                                                                                                                 | Trocar veículo, abrir alerta, botão grande "+ Abastecer" |
| 8   | Abastecimentos (lista)     | Lista por mês com data, litros, total, km/l do trecho (só quando der para calcular); tocar no registro abre a edição e arrastá-lo para a esquerda mostra **Excluir** (com confirmação)                                                                                                                                                                                                                                                                       | Filtrar, editar, excluir, adicionar                      |
| 9   | Novo/editar abastecimento  | Data, km (sugerido), combustível, preço/litro, litros, total (dois preenchem o terceiro), tanque cheio (opcional, vem desligado, com texto de ajuda: "Marque quando encher até o fim. Isso deixa a média mais exata."), posto (obrigatório; sugere o posto mais perto pela localização, com "Trocar"; sem permissão, os postos já usados; digitar um novo cria o posto), nota; botão de falar (microfone) ao lado de **Salvar abastecimento** (ver fluxo 2b) | Falar (só no novo), salvar                               |
| 10  | Manutenções (lista)        | Duas seções: "Próximas" com barra de progresso por km/tempo e "Feitas"                                                                                                                                                                                                                                                                                                                                                                                       | Abrir, adicionar, marcar como feita                      |
| 11  | Plano de manutenção (item) | Tipo, intervalo em km e/ou meses, última vez feita, previsão da próxima (data e km); sem intervalo, o item só guarda histórico e não gera alerta                                                                                                                                                                                                                                                                                                             | Editar intervalo, desativar                              |
| 12  | Registrar manutenção       | Tipo (lista pronta + "Outro", que abre campo de texto para digitar o nome; tipos criados ficam salvos como atalho, com selo "Seu"), data, km, custo, oficina, nota, foto da nota                                                                                                                                                                                                                                                                             | Salvar                                                   |
| 13  | Histórico                  | Linha do tempo de tudo do veículo, com filtros por tipo e período                                                                                                                                                                                                                                                                                                                                                                                            | Abrir item                                               |
| 14  | Relatórios                 | Gráfico de gasto mensal (barras por categoria), km/l ao longo do tempo, totais do período                                                                                                                                                                                                                                                                                                                                                                    | Trocar período                                           |
| 15  | Mais                       | Veículos, Documentos, Conta, Configurações, Premium, Ajuda                                                                                                                                                                                                                                                                                                                                                                                                   | Navegar                                                  |

### Veículos, documentos e conta

| #   | Tela                   | Conteúdo                                                                                                                                                             | Ações                                    |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 16  | Meus veículos          | Cartões com ícone (carro ou moto), apelido, modelo, km atual                                                                                                         | Adicionar, abrir, reordenar (arrastar)   |
| 17  | Detalhe/editar veículo | Dados completos, placa, km atual, média diária de km calculada                                                                                                       | Atualizar km, editar, arquivar, excluir  |
| 18  | Documentos e prazos    | IPVA, licenciamento, seguro (por veículo) e CNH (por pessoa), com data e status (em dia / vence em X dias / vencido)                                                 | Adicionar data, editar lembrete, renovar |
| 19  | Conta                  | Modo anônimo: chamada "Salve seus dados" com Google (e Apple, no iPhone). Logado: nome, e-mail, último sync                                                          | Vincular conta, sair, excluir conta      |
| 20  | Configurações          | Notificações por tipo, antecedência dos alertas, "Salvar pela fala" e "Aviso ao chegar no posto" (abastecimento), unidades (só km e litros), exportar dados (Fase B) | Alterar                                  |
| 21  | Premium (em breve)     | Lista de recursos Premium com selo, sem preço                                                                                                                        | Tenho interesse                          |
| 22  | Excluir conta          | Aviso claro do que será apagado, confirmação                                                                                                                         | Confirmar exclusão                       |

## Fluxos principais

**1. Primeiro uso**

1. Splash → Boas-vindas → Login.
2. Usuário escolhe Google (ou Apple, no iPhone), ou "Continuar sem login" (vê o aviso da tela 4). Com a conta já cheia de dados (outro celular), o app traz tudo e pula o passo 3.
3. Cadastra o primeiro veículo (pode pular).
4. Tela prévia de notificações → pedido do sistema.
5. Cai no Início com estado vazio orientando "Registre seu primeiro abastecimento".

**2. Registrar abastecimento (o fluxo mais usado)**

1. Botão "+ Abastecer" no Início (ou na aba).
2. Formulário já vem com data de hoje, último combustível e km sugerido.
3. Usuário digita dois de três valores (preço/litro, litros, total); o terceiro é calculado.
4. Salvar → volta ao Início com o cartão do mês atualizado e um toast com o km/l do trecho, quando der para calcular.

**2b. Registrar abastecimento por voz (Fase C; voz feita no C4, posto pela localização no C6)**

1. Na tela Novo abastecimento, toque no **microfone** ao lado de Salvar abastecimento. Na primeira vez, o toque já abre o pedido de permissão do microfone do sistema (sem aviso antes; a localização entra no C6). Recusar não bloqueia: o formulário continua na mesma tela. O posto pode ser dito ("no posto Ipiranga", "na Shell", ou o nome de um posto já usado); se não for, vem do formulário (chip ou digitado antes de falar) e, no C6, da localização.
2. O usuário fala do jeito que quiser: "abasteci 150 reais, 25 litros, 45 mil e 300, encheu". Enquanto ouve, a **tela inteira escurece** com três pontinhos animados no centro; o texto falado não aparece. Tocar em qualquer lugar para de ouvir; 2 s de silêncio também encerram.
3. Ao terminar de falar, o app **preenche os campos** (sem cartão de sucesso). O que acontece depois depende de **Configurações → Abastecimento → Salvar pela fala** (padrão: desligado): desligado, a pessoa confere e toca em **Salvar abastecimento**; ligado, se estiver completo e válido o app **salva sozinho** e volta ao Início com o toast de sempre (sem desfazer).
4. Se algo for ambíguo, o app pergunta ("50 é o valor ou os litros?") com botões de resposta.
5. Se faltar dado (o posto ou os valores; com "Salvar pela fala" ligado, também o km, que precisa ser falado ou digitado, não vale o sugerido), o app **não salva**: a tela continua aberta com o que foi entendido preenchido, um cartão avisa o que falta ("Falta informar o km") e o cursor vai para o campo que falta, que fica com a mensagem de erro. A pessoa preenche (ou toca no microfone de novo para falar só o que faltou) e toca em **Salvar abastecimento**.
6. Se um valor não passar na validação (preço do litro fora de R$ 2 a R$ 12, km menor que o último), o campo fica em vermelho, recebe o cursor e o app **não salva sozinho**.
7. Sem microfone, com barulho ou sem entender, a pessoa preenche o formulário atual na mesma tela.

**2c. Aviso ao chegar no posto (C7, Premium, opcional, desligado por padrão)**

1. Em **Configurações → Abastecimento**, a pessoa liga **Aviso ao chegar no posto** ("Lembra de registrar quando você para num posto").
2. Sem a localização "sempre", abre uma tela que explica: o que é (parou uns 2 minutos num posto, o app lembra de registrar), bateria, privacidade (a localização não sai do celular) e as regras (um aviso por posto a cada 12 horas, nenhum se já registrou hoje), com **Continuar** e **Agora não**. Continuar pede o "durante o uso"; a tela seguinte explica o "sempre" ("Permitir o tempo todo" no Android, "Mudar para Sempre Permitir" no iPhone) e pede. Recusado de vez: "Abrir ajustes". Depois, se as notificações estão desligadas, uma tela pede para ativar nos ajustes.
3. Parado ~2 min num dos postos vigiados, chega o aviso "Abastecendo no Shell · Av. da Pista? Registre agora."; tocar abre o **Novo abastecimento** com o posto sugerido pela localização.
4. Desligar o interruptor para tudo na hora. Se as lojas recusarem o "sempre", o interruptor some e o resto do fluxo funciona igual.

Telas novas sem frame no Figma: botão de falar, tela de "ouvindo" com os pontinhos, cartão da voz (pergunta, o que falta, campo em vermelho), o interruptor "Salvar pela fala" e textos das permissões. Do C6 (posto pela localização): o cartão "Achar o posto pela localização" (antes do pedido do sistema), os chips do posto perto e "Trocar", o chip "Usar localização" e a linha "Média neste posto" sob o Posto. Do C7: o interruptor "Aviso ao chegar no posto" e as telas que explicam o "durante o uso", o "sempre", a recusa e as notificações. Cada item do backlog (C4, C6, C7) registra o que ficou sem frame em `docs/07-validacao-e-decisoes.md`.

**2c. Editar e excluir um abastecimento**

1. Na aba Abastecer, toque no registro: abre "Editar abastecimento", o mesmo formulário do novo, já preenchido (sem o botão de falar). Litros e total são os valores de entrada e o preço por litro aparece calculado deles.
2. Mude o que precisar (a data e a hora originais ficam, a menos que escolha outro dia) e toque em **Salvar alterações**: volta para a lista, sem toast. Posto e km continuam obrigatórios; um abastecimento antigo sem posto pede o posto ao salvar.
3. Para excluir, arraste o registro para a **esquerda** até aparecer **Excluir** em vermelho. Um aviso pergunta "Excluir abastecimento?"; **Excluir** apaga (o gasto, o km/l e as médias se refazem sem ele) e **Cancelar** (ou tocar fora) fecha o registro de volta. Quem usa leitor de tela encontra "Excluir" nas ações do registro.

Telas sem frame no Figma: edição de abastecimento, ação de arrastar "Excluir" e o aviso de exclusão.

**3. Manutenção com alerta**

1. Na aba Manutenções, o usuário ativa um item do plano (ex.: troca de óleo a cada 10.000 km ou 12 meses) ou cria um com "Outro".
2. Informa quando foi a última troca.
3. O app calcula a previsão pela média diária de km e mostra a barra de progresso.
4. Perto do limite, chega a notificação; tocar abre o item com "Marcar como feita".
5. Marcar como feita abre o Registrar manutenção já preenchido e reinicia o ciclo.

**4. Documentos (IPVA, licenciamento, CNH)**

1. Mais → Documentos e prazos.
2. Usuário adiciona a data de vencimento e escolhe a antecedência (ex.: 30 e 7 dias antes).
3. Status aparece no Início quando estiver perto de vencer.
4. Ao renovar (IPVA 2026 → IPVA 2027), o prazo novo vira o atual e o antigo vai para o "Histórico" no pé da tela.

**5. Sair do modo anônimo**

1. Banner no Início ou Mais → Conta (tela 19): "Salve seus dados na nuvem".
2. Entrar com Google (ou Apple, no iPhone).
3. Se já existe conta com dados (outro celular), a folha da tela 24 pergunta "Juntar dados" ou "Usar só os da conta". Conta vazia junta direto.
4. Tela de progresso "Enviando seus dados" (tela 23) e confirmação "Tudo salvo!"; depois volta à Conta já logada (tela 19b). "Usar só os da conta" mostra a folha "Baixando seus dados" (no estilo da tela 24), a mesma que aparece no Login quando a conta já tem dados. No plano grátis, "Juntar dados" fica bloqueado se a soma passar de 1 veículo ("No plano grátis, o app guarda 1 veículo").
5. Logado, a Conta tem "Sair da conta" (apaga os dados do aparelho; avisa se algo não foi enviado) e "Excluir conta", que abre a tela 22: lista o que será apagado e só libera "Excluir minha conta" depois de digitar EXCLUIR. Sem internet, nada é apagado e um aviso pede para tentar de novo; dando certo, o app volta ao Login.

**6. Trocar de celular**

1. Instala o app → Login com a mesma conta.
2. Folha "Baixando seus dados" → Início com tudo restaurado.

## Estados, notificações e componentes

**Estados de cada tela**

- Vazio (sem veículo, sem abastecimento, sem manutenção), sempre com uma ação clara.
- Carregando (skeleton), erro, sem internet (só aviso discreto: o app segue funcionando).
- Sync: "salvo no aparelho", "sincronizando", "sincronizado", "falha, tentaremos de novo".
- Alerta em três níveis: em dia, perto de vencer, vencido/atrasado.

**Consumo sem dados suficientes:** mostrar "Registre mais um abastecimento para ver sua média", nunca número em branco ou zero. Abastecimento parcial (sem tanque cheio) é uso normal e não deve parecer erro. Custo por km e gasto do mês aparecem sempre.

**Notificações (texto e ícone)**

| Tipo                 | Exemplo de texto                                       |
| -------------------- | ------------------------------------------------------ |
| Manutenção por km    | "Troca de óleo do Gol em ~500 km"                      |
| Manutenção por tempo | "Alinhamento do Gol vence em 7 dias"                   |
| IPVA / licenciamento | "IPVA do Gol vence em 10 dias"                         |
| CNH                  | "Sua CNH vence em 30 dias"                             |
| Atualizar km         | "Faz 7 dias sem atualizar o km do Gol"                 |
| Chegada ao posto     | "Abastecendo no Shell · Av. da Pista? Registre agora." |

**Componentes**

- Seletor de veículo (topo do Início), cartão de resumo com número grande e variação %.
- Cartão de alerta com barra de progresso (km e tempo), selo Premium.
- Campo numérico grande para valores em R$, litros e km (teclado numérico).
- Botões de login social seguindo as regras visuais de Google e Apple (o botão da Apple só existe no iPhone).
- Gráfico de barras mensal e gráfico de linha de consumo.
- Tab bar com 5 itens e botão de ação principal "+ Abastecer".

## Telas da Fase 2 e Futuro

Não precisam de design final agora, mas o layout do MVP deve deixar espaço para elas.

| Tela / recurso   | Fase   | Nota para o design                                                                         |
| ---------------- | ------ | ------------------------------------------------------------------------------------------ |
| Widgets          | Fase 2 | Tamanhos pequeno e médio: próximo alerta, gasto do mês, km/l                               |
| FIPE             | Fase 2 | Cartão no detalhe do veículo com valor e variação (no MVP, só o cartão "Em breve" Premium) |
| Multas           | Fase 2 | Lista por veículo com status e vencimento                                                  |
| Exportar PDF     | Fase 2 | Prévia do relatório                                                                        |
| Paywall Premium  | Fase 2 | Comparação grátis × Premium, preço mensal/anual, restaurar compra                          |
| Carro elétrico   | Futuro | Recarga (kWh) no lugar de litros, autonomia                                                |
| Adesivo do vidro | Futuro | Leitura por foto ou QR                                                                     |
