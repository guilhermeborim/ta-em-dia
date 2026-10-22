import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Libera a rota do guard JWT global (login, health, config). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
