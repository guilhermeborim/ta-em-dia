import { uuidv7 } from '@ta-em-dia/shared';
import { getRandomBytes } from 'expo-crypto';

/** Novo id (UUID v7) para uma linha sincronizável. Gerado no app, nunca no servidor. */
export function newId(): string {
  return uuidv7(Date.now(), getRandomBytes(10));
}
