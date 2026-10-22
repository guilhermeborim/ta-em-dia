import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Segundos de vida do access token (15 min) e dias do refresh token (90). */
export const ACCESS_TOKEN_SECONDS = 15 * 60;
export const REFRESH_TOKEN_DAYS = 90;

/** SHA-256 em hex. Serve para segredos e tokens aleatórios longos (não para senhas). */
export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** Compara dois hashes em hex sem vazar onde diferem. */
export function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Refresh token opaco (256 bits). Só o hash é guardado. */
export function newRefreshToken(now: Date): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenHash: sha256(token), expiresAt };
}
