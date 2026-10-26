import { z } from 'zod';

/** Variáveis de ambiente validadas no boot: faltou uma, a API não sobe. */
export const envSchema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  GOOGLE_CLIENT_IDS: z.string().default(''),
  APPLE_CLIENT_ID: z.string().default(''),
  SENTRY_DSN: z.string().default(''),
  CORS_ORIGINS: z.string().default(''),
  // Quantos proxies ficam entre a internet e a API (o Render é 1). O rate limit usa o IP do cliente.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
  // Postos do OpenStreetMap (módulo places). Instância pública e gratuita do Overpass.
  OVERPASS_URL: z.url().default('https://overpass-api.de/api/interpreter'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Variáveis de ambiente inválidas: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}
