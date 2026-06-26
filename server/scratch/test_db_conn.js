const { Client } = require('pg');
const dns = require('dns').promises;

const projectRef = 'rzavtfppueiskmqkouti';
const password = process.env.SUPABASE_DB_PASSWORD || '';
const user = `postgres.${projectRef}`;
const database = 'postgres';

// List of possible AWS regions where Supabase projects are commonly hosted
const regions = [
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-north-1',
  'eu-central-2',
  'eu-south-1',
  'eu-south-2',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-northeast-3',
  'ap-south-1',
  'ap-south-2',
  'sa-east-1',
  'ca-central-1',
  'me-central-1',
  'me-south-1',
  'af-south-1'
];

async function testRegions() {
  console.log('Testing connection pooler hosts...');
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    try {
      // First check if DNS resolves
      await dns.lookup(host);
      console.log(`DNS resolved for: ${host}`);
      
      // Attempt connection on port 6543 (transaction pooling)
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
      console.log(`✅ SUCCESS: Connected to pooler at ${host}`);
      
      // Run test query
      const res = await client.query('SELECT version();');
      console.log('Version:', res.rows[0].version);
      
      await client.end();
      return host; // Found it!
    } catch (err) {
      console.log(`Failed for ${host}: ${err.message}`);
    }
  }
  console.log('❌ Could not connect to any pooler host.');
  return null;
}

testRegions().catch(console.error);
