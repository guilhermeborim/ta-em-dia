# Privacidade, segurança e LGPD

Decisões sobre dados pessoais do Tá em Dia. Não substitui revisão jurídica: antes de publicar nas lojas, um advogado deve revisar a Política de Privacidade e os Termos.

## Princípio: coletar o mínimo

O melhor jeito de proteger um dado é não ter o dado. O MVP **não guarda** número da CNH, foto de documento, CPF, endereço nem localização. Documentos são só lembretes com data (IPVA, licenciamento, seguro, validade da CNH), como em `docs/01-roadmap.md`.

## Mapa dos dados

| Dado                           | Onde fica                                                           | Sensibilidade | Tratamento                                                                   |
| ------------------------------ | ------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------- |
| E-mail e nome (Google/Apple)   | API (`users`) e aparelho (`app_settings`, só para mostrar na Conta) | Média         | Só o que o provedor entrega; nunca em log; some do aparelho ao sair da conta |
| Placa do veículo               | SQLite e API                                                        | Média         | Opcional; nunca em log, analytics ou mensagem de erro                        |
| Marca, modelo, ano, km         | SQLite e API                                                        | Baixa         | Texto simples                                                                |
| Abastecimentos e manutenções   | SQLite e API                                                        | Baixa         | Texto simples                                                                |
| Validade da CNH (só a data)    | SQLite e API                                                        | Média         | Sem número da CNH, sem foto                                                  |
| Tokens e segredo anônimo       | `expo-secure-store`                                                 | Alta          | Keychain (iOS) / Keystore (Android)                                          |
| Refresh token                  | API (`refresh_tokens`)                                              | Alta          | Só o hash; revogável                                                         |
| Push token                     | API (`devices`)                                                     | Média         | Apagado ao sair ou excluir a conta                                           |
| Fotos de nota (Premium futuro) | Armazenamento de arquivos                                           | Média         | Bucket privado, URL assinada e curta, nunca público                          |
| Foto de documento (CNH, CRLV)  | **não coletamos**                                                   | Alta          | Só entra com decisão nova (ver "Se um dia houver documentos")                |

## Segurança

**No aparelho**

- Segredos só no `expo-secure-store`. Nunca em SQLite, `AsyncStorage` ou código.
- O SQLite fica no sandbox do app, sem criptografia extra no MVP: os dados são de baixo risco e a CNH/placa não são identificadores fortes sozinhos. Se isso mudar, o `expo-sqlite` aceita SQLCipher (plugin gratuito), e a chave ficaria no SecureStore.
- Sem dado pessoal em log do app. `console.log` com objeto de veículo ou usuário é proibido.

**Na API**

- HTTPS sempre. `Authorization` do token, `userId` sempre do token (regra do projeto).
- Banco no Neon com criptografia em repouso do provedor. Sem criptografia por campo no MVP.
- Refresh token como hash. Segredos em variáveis de ambiente, nunca no repositório.
- Logs sem e-mail, placa, token ou corpo de requisição. Só ids.
- Backups do provedor seguem a retenção abaixo.

## LGPD

**Papéis.** O Tá em Dia é o controlador. Google, Apple, Neon, Render e Expo são operadores ou fornecedores; alguns ficam fora do Brasil (transferência internacional, art. 33), o que a Política deve informar.

**Base legal.**

| Tratamento                               | Base                                     |
| ---------------------------------------- | ---------------------------------------- |
| Conta, veículos, abastecimentos, alertas | Execução de contrato (art. 7º, V)        |
| Notificações push                        | Consentimento (permissão do sistema)     |
| Localização (Fase 2)                     | Consentimento, pedido só quando for usar |
| Análise de uso (se houver)               | Consentimento, desligado por padrão      |

**Direitos do titular (art. 18).** O app precisa permitir, sem pedir por e-mail:

| Direito                | Como atender                                            |
| ---------------------- | ------------------------------------------------------- |
| Acesso e portabilidade | Exportar meus dados (JSON/CSV) em Configurações         |
| Correção               | Editar nas telas                                        |
| Eliminação             | "Excluir conta" apaga tudo no app e na API (ver abaixo) |
| Informação             | Política de Privacidade clara, dentro do app e no site  |
| Revogar consentimento  | Desligar notificações; recusar análise de uso           |

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
- [ ] Telas de Termos e Privacidade ligadas às URLs.
- [ ] Excluir conta funcionando no app e na API (implementado; falta validar no aparelho e revogar o token da Apple, `docs/07` 2.23 e 3.28).
- [ ] Exportar meus dados funcionando.
- [ ] Nenhum dado pessoal em log (app e API).
- [ ] Segredos fora do repositório (`.env` ignorado).
- [ ] Formulários das lojas preenchidos.
- [ ] Contato do encarregado na Política.
