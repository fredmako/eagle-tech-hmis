const { Client } = require('pg');

const host = '2a05:d016:dd0:9402:4161:2baf:5600:e340';
const user = 'postgres';
const password = '_GiR4SKRhdTfcs_';
const database = 'postgres';

async function testIPv6() {
  console.log(`Connecting to direct IPv6 address: [${host}]:5432...`);
  const client = new Client({
    host,
    user,
    password,
    database,
    port: 5432,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log('✅ SUCCESS: Connected directly via IPv6!');
    const res = await client.query('SELECT version();');
    console.log('Version:', res.rows[0].version);
    await client.end();
  } catch (err) {
    console.error('❌ Direct IPv6 Connection failed:', err.message);
  }
}

testIPv6().catch(console.error);
