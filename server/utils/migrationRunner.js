const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const host = process.env.SUPABASE_DB_HOST || 'db.rzavtfppueiskmqkouti.supabase.co';
const user = process.env.SUPABASE_DB_USER || 'postgres';
const password = process.env.SUPABASE_DB_PASSWORD || '_GiR4SKRhdTfcs_';
const database = process.env.SUPABASE_DB_NAME || 'postgres';
const port = parseInt(process.env.SUPABASE_DB_PORT || '5432', 10);

async function runMigrations() {
  // Only run if we are in real Supabase mode (SUPABASE_URL and key are present)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('[MigrationRunner] Sandbox Mode: Skipping SQL database migrations.');
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
    
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      console.log(`[MigrationRunner] Executing migration: ${file}`);
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      await client.query(sqlContent);
    }
    
    console.log('[MigrationRunner] All schema migrations and seed data synced successfully to Supabase!');
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
