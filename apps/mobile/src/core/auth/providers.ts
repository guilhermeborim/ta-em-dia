import type { SocialProvider } from '@ta-em-dia/shared';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { googleIosClientId, googleWebClientId } from '../env/appEnv';
import type { SocialCredential } from './social';

export type SignInResult =
  | { kind: 'ok'; credential: SocialCredential }
  /** A pessoa fechou a janela do Google ou da Apple. Não é erro. */
  | { kind: 'cancelled' }
  /** Este build não tem o login configurado (sem client ID) ou o aparelho não suporta. */
  | { kind: 'unavailable' }
  | { kind: 'error' };

/** O login do Google ou da Apple precisa estar disponível neste aparelho e neste build. */
export function isProviderAvailable(provider: SocialProvider): boolean {
  if (provider === 'google') return googleWebClientId !== '' && Platform.OS !== 'web';
  return Platform.OS === 'ios';
}

let googleConfigured = false;

async function signInWithGoogle(): Promise<SignInResult> {
  if (!isProviderAvailable('google')) return { kind: 'unavailable' };
  // Carrega o módulo nativo só aqui: sem o development build, o resto do app abre normalmente.
  const { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } =
    await import('@react-native-google-signin/google-signin');
  try {
    if (!googleConfigured) {
      GoogleSignin.configure({
        // O `aud` do id_token é o client ID web: é ele que a API confere (`GOOGLE_CLIENT_IDS`).
        webClientId: googleWebClientId,
        ...(googleIosClientId ? { iosClientId: googleIosClientId } : {}),
      });
      googleConfigured = true;
    }
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return { kind: 'cancelled' };
    const { idToken, user } = response.data;
    if (!idToken) return { kind: 'error' };
    return {
      kind: 'ok',
      credential: { provider: 'google', idToken, name: user.name, email: user.email },
    };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { kind: 'cancelled' };
    }
    return { kind: 'error' };
  }
}

async function signInWithApple(): Promise<SignInResult> {
  if (!isProviderAvailable('apple') || !(await AppleAuthentication.isAvailableAsync())) {
    return { kind: 'unavailable' };
  }
  try {
    const apple = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!apple.identityToken) return { kind: 'error' };
    // A Apple só entrega nome e e-mail na primeira vez que a pessoa autoriza o app.
    const name = [apple.fullName?.givenName, apple.fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim();
    return {
      kind: 'ok',
      credential: {
        provider: 'apple',
        idToken: apple.identityToken,
        name: name || null,
        email: apple.email,
      },
    };
  } catch (error) {
    if ((error as { code?: string } | null)?.code === 'ERR_REQUEST_CANCELED') {
      return { kind: 'cancelled' };
    }
    return { kind: 'error' };
  }
}

/** Abre a janela do provedor e devolve o `id_token`. Nunca lança erro; nada vai para log. */
export function signInWithProvider(provider: SocialProvider): Promise<SignInResult> {
  return provider === 'google' ? signInWithGoogle() : signInWithApple();
}

/** Esquece a conta do Google neste aparelho (Sair da conta). A Apple não guarda sessão no app. */
export async function signOutOfProvider(provider: SocialProvider): Promise<void> {
  if (provider !== 'google' || !isProviderAvailable('google')) return;
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
    // Sair do Google é só para o próximo login pedir a conta de novo; não pode travar o "Sair".
  }
}
