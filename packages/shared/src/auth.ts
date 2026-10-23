import { z } from 'zod';

/** Contrato de `POST /v1/auth/anonymous` ("Continuar sem login"); ver docs/03-arquitetura.md. */

export const anonymousAuthSchema = z.object({
  /** UUID gerado no app na primeira abertura (SecureStore). */
  installationId: z.uuid(),
  /** Segredo aleatório do aparelho (SecureStore). A API guarda só o hash. */
  secret: z.string().min(32).max(128),
  platform: z.enum(['ios', 'android']),
});

export type AnonymousAuthRequest = z.infer<typeof anonymousAuthSchema>;

/** Contrato de `POST /v1/auth/refresh`: troca o refresh token por um par novo (o antigo deixa de valer). */
export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1).max(256),
});

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const authTokensSchema = z.object({
  /** JWT de curta duração (`Authorization: Bearer`). */
  accessToken: z.string().min(1),
  /** Segundos até o `accessToken` expirar. */
  expiresIn: z.number().int().positive(),
  /** Token opaco de longa duração; a API guarda só o hash. */
  refreshToken: z.string().min(1),
  user: z.object({
    id: z.string().min(1),
    isAnonymous: z.boolean(),
    plan: z.enum(['free', 'premium']),
  }),
});

export type AuthTokens = z.infer<typeof authTokensSchema>;

/** Provedores de login social. Apple só existe no iOS; o app não chama a rota da Apple no Android. */
export const SOCIAL_PROVIDERS = ['google', 'apple'] as const;
export const socialProviderSchema = z.enum(SOCIAL_PROVIDERS);
export type SocialProvider = z.infer<typeof socialProviderSchema>;

/**
 * Contrato de `POST /v1/auth/google` e `POST /v1/auth/apple`: o `id_token` nativo do provedor.
 * A API valida assinatura, `iss` e `aud`; o `installationId` diz em que aparelho abrir a sessão.
 */
export const socialAuthSchema = z.object({
  idToken: z.string().min(1).max(8192),
  installationId: z.uuid(),
  platform: z.enum(['ios', 'android']),
  /** A Apple só entrega o nome no app, na primeira vez; o Google traz no próprio token. */
  name: z.string().trim().min(1).max(100).optional(),
});

export type SocialAuthRequest = z.infer<typeof socialAuthSchema>;

/** O que fazer quando a conta já existe (tela 24): juntar os dados do aparelho ou usar só os da conta. */
export const linkConflictStrategySchema = z.enum(['merge', 'use_account']);
export type LinkConflictStrategy = z.infer<typeof linkConflictStrategySchema>;

/**
 * Contrato de `POST /v1/auth/link` (com o token do usuário anônimo): adiciona o login social ao
 * usuário atual. Se a conta social já existe, a API responde 409 `ACCOUNT_EXISTS` até o app mandar
 * `onConflict`.
 */
export const linkRequestSchema = socialAuthSchema.extend({
  provider: socialProviderSchema,
  onConflict: linkConflictStrategySchema.optional(),
});

export type LinkRequest = z.infer<typeof linkRequestSchema>;

/**
 * `linked`: o login foi adicionado ao mesmo usuário (nada muda nos dados).
 * `merged`: os dados do anônimo foram para a conta que já existia.
 * `switched`: o app passa a usar a conta que já existia; o anônimo foi apagado.
 */
export const linkOutcomeSchema = z.enum(['linked', 'merged', 'switched']);
export type LinkOutcome = z.infer<typeof linkOutcomeSchema>;

export const linkResultSchema = authTokensSchema.extend({ outcome: linkOutcomeSchema });
export type LinkResult = z.infer<typeof linkResultSchema>;

/**
 * Corpo do 409 `ACCOUNT_EXISTS`: o que a conta que já existe tem (para a tela 24). `records` são
 * abastecimentos e serviços de manutenção (os "registros" da tela); excluídos não contam.
 */
export const accountExistsSchema = z.object({
  code: z.literal('ACCOUNT_EXISTS'),
  account: z.object({
    vehicles: z.number().int().nonnegative(),
    records: z.number().int().nonnegative(),
  }),
});

export type AccountExists = z.infer<typeof accountExistsSchema>;
