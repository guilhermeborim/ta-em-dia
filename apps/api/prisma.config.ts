import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// `prisma generate` roda no `postinstall` (CI, deploy) sem banco e não conecta: uma URL de
// mentira basta. Só `migrate deploy` conecta, e ele recebe a DATABASE_URL de verdade.
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://sem-url:sem-url@localhost:5432/sem_url';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: DATABASE_URL },
});
