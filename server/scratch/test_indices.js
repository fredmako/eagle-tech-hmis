const { Client } = require('pg');
const dns = require('dns').promises;

const projectRef = 'rzavtfppueiskmqkouti';
const password = process.env.SUPABASE_DB_PASSWORD || '';
const user = `postgres.${projectRef}`;
const database = 'postgres';

const hostTemplates = [
  'aws-0-eu-north-1.pooler.supabase.com',
  'aws-1-eu-north-1.pooler.supabase.com',
  'aws-2-eu-north-1.pooler.supabase.com',
  'aws-0-eu-west-1.pooler.supabase.com',
  'aws-1-eu-west-1.pooler.supabase.com',
  'aws-2-eu-west-1.pooler.supabase.com'
];

async function testPoolers() {
  for (const host of hostTemplates) {
    try {
      await dns.lookup(host);
      console.log(`Resolved DNS for ${host}`);
      const client = new Client({
        host,
        user,
        password,
        database,
        port: 6543,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      });
      await client.connect();
      console.log(`✅ CONNECTED to ${host}`);
      await client.end();
      return;
    } catch (err) {
      console.log(`Failed for ${host}: ${err.message}`);
    }
  }
}

testPoolers().catch(console.error);
