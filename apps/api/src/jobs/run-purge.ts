import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { purgeInactive } from './purge-inactive.js';

/**
 * Roda a limpeza contra o banco de `DATABASE_URL`: `node dist/jobs/run-purge.js [--dry-run]`.
 * É chamado pelo workflow `api-cleanup.yml`; só imprime contagens.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL não definida');
  const dryRun = process.argv.includes('--dry-run');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const result = await purgeInactive(prisma, new Date(), { dryRun });
    console.log(
      `${dryRun ? 'Simulação: ' : ''}contas anônimas sem uso: ${result.anonymousUsers}; ` +
        `refresh tokens vencidos: ${result.refreshTokens}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Falha na limpeza');
  process.exit(1);
});
