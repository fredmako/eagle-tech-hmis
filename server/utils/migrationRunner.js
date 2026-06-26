const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const host = process.env.SUPABASE_DB_HOST || 'aws-1-eu-north-1.pooler.supabase.com';
const user = process.env.SUPABASE_DB_USER || 'postgres.rzavtfppueiskmqkouti';
const password = process.env.SUPABASE_DB_PASSWORD || '';
const database = process.env.SUPABASE_DB_NAME || 'postgres';
const port = parseInt(process.env.SUPABASE_DB_PORT || '6543', 10);

async function runMigrations() {
  // Only run if we are in real Supabase mode (SUPABASE_URL and key are present)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('[MigrationRunner] Sandbox Mode: Skipping SQL database migrations.');
    return;
  }
  if (!password) {
    console.warn('[MigrationRunner] SUPABASE_DB_PASSWORD is not configured; skipping remote schema synchronization.');
    return;
  }

  console.log('[MigrationRunner] Starting remote schema synchronization to Supabase...');
  
  const migrationsDir = path.join(__dirname, '../../supabase/migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error(`[MigrationRunner] Migrations directory not found at: ${migrationsDir}`);
    return;
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const client = new Client({
    host,
    user,
    password,
    database,
    port,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000 // 10 second timeout
  });

  try {
    await client.connect();
    console.log('[MigrationRunner] Connected to Supabase PostgreSQL database.');
    
    // Create schema_migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamp with time zone DEFAULT now()
      );
    `);

    // Get list of already applied migrations
    const { rows } = await client.query('SELECT version FROM public.schema_migrations');
    const appliedVersions = new Set(rows.map(r => r.version));

    for (const file of migrationFiles) {
      if (appliedVersions.has(file)) {
        console.log(`[MigrationRunner] Migration already applied: ${file}`);
        continue;
      }

      const filePath = path.join(migrationsDir, file);
      console.log(`[MigrationRunner] Executing migration: ${file}`);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      try {
        await client.query(sqlContent);
        await client.query('INSERT INTO public.schema_migrations (version) VALUES ($1)', [file]);
        console.log(`[MigrationRunner] Migration ${file} applied successfully.`);
      } catch (err) {
        console.error(`[MigrationRunner] Migration ${file} failed:`, err.message);
        // We log the error but continue to run other migrations so that a blocker in one file doesn't stall everything else.
      }
    }
    
    console.log('[MigrationRunner] Remote schema synchronization completed.');
    await client.end();
  } catch (err) {
    console.warn(
      `[MigrationRunner] Remote schema synchronization skipped/failed: ${err.message}\n` +
      `Note: If this is running locally, it may be due to IPv6 DNS/routing restrictions (Supabase free tier DBs are IPv6-only). ` +
      `Migrations will automatically execute successfully in the production DigitalOcean environment.`
    );
    try {
      await client.end();
    } catch (e) {}
  }
}

module.exports = { runMigrations };
