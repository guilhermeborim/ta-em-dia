import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from 'jose';
import { verifyIdToken } from './id-token.verifier';

const ISSUER = 'https://accounts.google.com';
const AUDIENCE = 'client-id.apps.googleusercontent.com';

async function setup() {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  const keys = createLocalJWKSet({ keys: [jwk] });
  const sign = (
    claims: Record<string, unknown>,
    options: { iss?: string; aud?: string; exp?: string } = {},
  ) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(options.iss ?? ISSUER)
      .setAudience(options.aud ?? AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(options.exp ?? '5m')
      .sign(privateKey);
  const verify = (token: string) =>
    verifyIdToken(token, { keys, issuers: [ISSUER, 'accounts.google.com'], audiences: [AUDIENCE] });
  return { sign, verify };
}

describe('verifyIdToken', () => {
  it('aceita o token e devolve sub, e-mail confirmado e nome', async () => {
    const { sign, verify } = await setup();
    const token = await sign({
      sub: '1234',
      email: 'ana@example.com',
      email_verified: true,
      name: 'Ana',
    });
    expect(await verify(token)).toEqual({ subject: '1234', email: 'ana@example.com', name: 'Ana' });
  });

  it('e-mail não confirmado não é guardado; "true" em texto (Apple) vale', async () => {
    const { sign, verify } = await setup();
    const unverified = await sign({ sub: '1', email: 'a@example.com', email_verified: false });
    expect((await verify(unverified)).email).toBeNull();
    const apple = await sign({ sub: '2', email: 'b@example.com', email_verified: 'true' });
    expect((await verify(apple)).email).toBe('b@example.com');
  });

  it('recusa emissor errado, público errado e token vencido, sempre com o mesmo erro', async () => {
    const { sign, verify } = await setup();
    const bad = [
      await sign({ sub: '1' }, { iss: 'https://evil.example.com' }),
      await sign({ sub: '1' }, { aud: 'outro-app' }),
      await sign({ sub: '1' }, { exp: '-5m' }),
    ];
    for (const token of bad) {
      await expect(verify(token)).rejects.toMatchObject({ response: { code: 'INVALID_ID_TOKEN' } });
    }
  });

  it('recusa token sem sub, assinado por outra chave e lixo', async () => {
    const { sign, verify } = await setup();
    const other = await setup();
    await expect(verify(await sign({ email: 'a@example.com' }))).rejects.toMatchObject({
      response: { code: 'INVALID_ID_TOKEN' },
    });
    await expect(verify(await other.sign({ sub: '1' }))).rejects.toMatchObject({
      response: { code: 'INVALID_ID_TOKEN' },
    });
    await expect(verify('nao-e-um-jwt')).rejects.toMatchObject({
      response: { code: 'INVALID_ID_TOKEN' },
    });
  });
});
