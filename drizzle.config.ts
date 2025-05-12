import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

// Parse the DATABASE_URL to get individual components
const dbUrl = new URL(process.env.DATABASE_URL);

export default {
  schema: './shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: dbUrl.hostname,
    port: parseInt(dbUrl.port || '5432'),
    user: dbUrl.username,
    password: dbUrl.password,
    database: dbUrl.pathname.slice(1),
    ssl: dbUrl.searchParams.get('sslmode') === 'require' ? 'require' : true,
  },
} satisfies Config;
