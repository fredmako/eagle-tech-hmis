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

const run = async () => {
  console.log('Adding address attribute to facilities collection...');
  try {
    await databases.createStringAttribute(databaseId, 'facilities', 'address', 500, false);
    console.log('Attribute [address] successfully created in collection [facilities].');
  } catch (err) {
    if (err.code === 409) {
      console.log('Attribute [address] already exists.');
    } else {
      console.error('Failed to create attribute:', err.message);
    }
  }
};

run().catch(err => {
  console.error('Migration error:', err.message);
});
