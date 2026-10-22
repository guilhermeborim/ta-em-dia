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

export interface AuthTokens {
  /** JWT de curta duração (`Authorization: Bearer`). */
  accessToken: string;
  /** Segundos até o `accessToken` expirar. */
  expiresIn: number;
  /** Token opaco de longa duração; a API guarda só o hash. */
  refreshToken: string;
  user: { id: string; isAnonymous: boolean; plan: 'free' | 'premium' };
}
