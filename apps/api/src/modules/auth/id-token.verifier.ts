import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SocialProvider } from '@ta-em-dia/shared';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

/** O que a API guarda de um `id_token` válido: quem é (`sub`) e o e-mail, se o provedor o confirmou. */
export interface IdTokenClaims {
  subject: string;
  email: string | null;
  /** Só o Google traz o nome no token; a Apple entrega pelo app. */
  name: string | null;
}

export interface VerifyOptions {
  keys: JWTVerifyGetKey;
  issuers: string[];
  audiences: string[];
}

const invalidIdToken = () =>
  new UnauthorizedException({
    code: 'INVALID_ID_TOKEN',
    message: 'Não foi possível entrar com essa conta.',
  });

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

/**
 * Confere assinatura (RS256), emissor e público (`aud`) do `id_token` e tira dele o `sub`. Qualquer
 * falha vira 401 `INVALID_ID_TOKEN` sem dizer o motivo nem devolver o token.
 */
export async function verifyIdToken(
  idToken: string,
  options: VerifyOptions,
): Promise<IdTokenClaims> {
  try {
    const { payload } = await jwtVerify(idToken, options.keys, {
      algorithms: ['RS256'],
      issuer: options.issuers,
      audience: options.audiences,
      clockTolerance: 60,
    });
    const subject = text(payload.sub);
    if (!subject) throw new Error('sem sub');
    // `email_verified` vem como boolean (Google) ou como "true" (Apple).
    const verified = payload.email_verified === true || payload.email_verified === 'true';
    return {
      subject,
      email: verified ? text(payload.email) : null,
      name: text(payload.name),
    };
  } catch {
    throw invalidIdToken();
  }
}

/** Valida o `id_token` de um provedor. Abstrata para os testes trocarem pelo provedor de mentira. */
export abstract class IdTokenVerifier {
  abstract verify(provider: SocialProvider, idToken: string): Promise<IdTokenClaims>;
}

const GOOGLE = {
  jwks: 'https://www.googleapis.com/oauth2/v3/certs',
  issuers: ['https://accounts.google.com', 'accounts.google.com'],
};
const APPLE = {
  jwks: 'https://appleid.apple.com/auth/keys',
  issuers: ['https://appleid.apple.com'],
};

@Injectable()
export class RemoteIdTokenVerifier extends IdTokenVerifier {
  private readonly keys: Partial<Record<SocialProvider, JWTVerifyGetKey>> = {};

  constructor(private readonly config: ConfigService) {
    super();
  }

  async verify(provider: SocialProvider, idToken: string): Promise<IdTokenClaims> {
    const audiences =
      provider === 'google'
        ? this.config
            .get<string>('GOOGLE_CLIENT_IDS', '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
        : [this.config.get<string>('APPLE_CLIENT_ID', '').trim()].filter(Boolean);
    if (audiences.length === 0) {
      throw new ServiceUnavailableException({
        code: 'PROVIDER_NOT_CONFIGURED',
        message: 'Esse login ainda não está disponível.',
      });
    }
    const source = provider === 'google' ? GOOGLE : APPLE;
    // O `jose` guarda as chaves em cache e busca de novo quando aparece uma chave desconhecida.
    const keys = (this.keys[provider] ??= createRemoteJWKSet(new URL(source.jwks)));
    return verifyIdToken(idToken, { keys, issuers: source.issuers, audiences });
  }
}
