import * as path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function reset() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Cannot reset production database!');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    console.log('Dropping schemas...');
    await client.query(`
      DROP SCHEMA IF EXISTS ops CASCADE;
      DROP SCHEMA IF EXISTS app CASCADE;
      DROP SCHEMA IF EXISTS auth CASCADE;
      DROP SCHEMA IF EXISTS ref CASCADE;
      DROP TABLE IF EXISTS public.migrations;
    `);
    console.log('Reset complete. Run pnpm db:migrate to recreate.');
  } finally {
    client.release();
    await pool.end();
  }
}

reset();
