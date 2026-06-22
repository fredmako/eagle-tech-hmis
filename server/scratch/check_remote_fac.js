const { Client } = require('pg');

const host = 'aws-1-eu-north-1.pooler.supabase.com';
const user = 'postgres.rzavtfppueiskmqkouti';
const password = '_GiR4SKRhdTfcs_';
const database = 'postgres';
const port = 6543;

async function checkFacilities() {
  const client = new Client({
    host,
    user,
    password,
    database,
    port,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB.');
    const res = await client.query('SELECT id, name FROM public.facilities;');
    console.log('Facilities in remote DB:', res.rows);
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkFacilities().catch(console.error);
