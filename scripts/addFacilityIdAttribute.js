import { Client, Databases } from 'node-appwrite';
import fs from 'fs';
import path from 'path';

const loadEnv = () => {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        value = value.trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[key] = value;
      }
    });
  }
};

loadEnv();

const endpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
const apiKey = process.env.VITE_APPWRITE_API_KEY;
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || 'egesa_health';

if (!projectId || !apiKey) {
  console.error('ERROR: Appwrite Project ID and API Key are required in .env');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

// Collections that need facility_id attribute added
const targetCollections = ['triages', 'consultations', 'orders', 'invoices'];

const run = async () => {
  console.log('Running migration to add facility_id to all clinical collections...');
  for (const col of targetCollections) {
    try {
      console.log(`Adding facility_id to collection: ${col}...`);
      await databases.createStringAttribute(databaseId, col, 'facility_id', 100, false);
      console.log(` - Success: facility_id attribute created for ${col}`);
      await new Promise(r => setTimeout(r, 1000)); // Small delay between operations
    } catch (err) {
      if (err.code === 409) {
        console.log(` - Skip: facility_id already exists in ${col}`);
      } else {
        console.error(` - Error in ${col}:`, err.message);
      }
    }
  }
  console.log('\nMigration complete.');
};

run().catch(err => {
  console.error('Migration failed:', err.message);
});
