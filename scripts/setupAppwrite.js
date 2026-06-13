import { Client, Databases, Permission, Role } from 'node-appwrite';
import fs from 'fs';
import path from 'path';

// --- Manual env loader to avoid installing extra dependencies ---
const loadEnv = () => {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        value = value.trim();
        // Remove quotes if present
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

if (!projectId) {
  console.error('ERROR: VITE_APPWRITE_PROJECT_ID is not set in your .env file.');
  process.exit(1);
}

if (!apiKey) {
  console.error('ERROR: VITE_APPWRITE_API_KEY is not set in your .env file.');
  process.exit(1);
}

console.log('Connecting to Appwrite at:', endpoint);
console.log('Project ID:', projectId);
console.log('Database ID:', databaseId);

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const databases = new Databases(client);

// Helper to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to wait until collection attributes are ready
const waitCollectionReady = async (collectionId) => {
  console.log(`Waiting for collection [${collectionId}] to index...`);
  await sleep(1500);
};

const setup = async () => {
  const resetMode = process.argv.includes('--reset');

  if (resetMode) {
    try {
      console.log('Reset Mode: Deleting existing database...');
      await databases.delete(databaseId);
      console.log('Database deleted successfully. Waiting 3 seconds for index cleanup...');
      await sleep(3000);
    } catch (err) {
      if (err.code !== 404) {
        console.warn('Database reset warning:', err.message);
      }
    }
  }

  // 1. Create Database
  try {
    await databases.create(databaseId, 'Egesa Health System Database');
    console.log('Database created successfully.');
  } catch (err) {
    if (err.code === 409) {
      console.log('Database already exists.');
    } else {
      console.error('Failed to create database:', err.message);
      process.exit(1);
    }
  }

  // 2. Define collections and attributes
  const collections = [
    {
      id: 'facilities',
      name: 'Facilities',
      attributes: [
        { type: 'string', key: 'name', size: 255, required: true },
        { type: 'string', key: 'code', size: 50, required: true },
        { type: 'string', key: 'logo_url', size: 500, required: false }
      ]
    },
    {
      id: 'profiles',
      name: 'Profiles',
      attributes: [
        { type: 'string', key: 'full_name', size: 255, required: true },
        { type: 'string', key: 'role', size: 50, required: true },
        { type: 'string', key: 'facility_id', size: 100, required: true }
      ]
    },
    {
      id: 'patients',
      name: 'Patients',
      attributes: [
        { type: 'string', key: 'facility_id', size: 100, required: true },
        { type: 'string', key: 'name', size: 255, required: true },
        { type: 'string', key: 'dob', size: 50, required: true },
        { type: 'string', key: 'gender', size: 20, required: true },
        { type: 'string', key: 'national_id', size: 50, required: false },
        { type: 'string', key: 'facility_id_code', size: 50, required: true },
        { type: 'string', key: 'phone', size: 50, required: true },
        { type: 'string', key: 'next_of_kin_name', size: 255, required: false },
        { type: 'string', key: 'next_of_kin_phone', size: 50, required: false },
        { type: 'string', key: 'next_of_kin_relation', size: 50, required: false },
        { type: 'boolean', key: 'consent_given', required: false, default: false }
      ]
    },
    {
      id: 'visits',
      name: 'Visits',
      attributes: [
        { type: 'string', key: 'patient_id', size: 100, required: true },
        { type: 'string', key: 'facility_id', size: 100, required: true },
        { type: 'string', key: 'department', size: 50, required: true },
        { type: 'string', key: 'priority', size: 50, required: true },
        { type: 'string', key: 'status', size: 50, required: true }
      ]
    },
    {
      id: 'triages',
      name: 'Triages',
      attributes: [
        { type: 'string', key: 'facility_id', size: 100, required: false },
        { type: 'string', key: 'visit_id', size: 100, required: true },
        { type: 'integer', key: 'systolic', required: false },
        { type: 'integer', key: 'diastolic', required: false },
        { type: 'integer', key: 'heart_rate', required: false },
        { type: 'float', key: 'temperature', required: false },
        { type: 'integer', key: 'resp_rate', required: false },
        { type: 'integer', key: 'spo2', required: false },
        { type: 'float', key: 'weight', required: false },
        { type: 'float', key: 'height', required: false },
        { type: 'float', key: 'bmi', required: false },
        { type: 'string', key: 'chief_complaint', size: 1000, required: true },
        { type: 'string', key: 'priority_flag', size: 20, required: true },
        { type: 'string', key: 'risk_indicators', size: 255, required: false }
      ]
    },
    {
      id: 'consultations',
      name: 'Consultations',
      attributes: [
        { type: 'string', key: 'facility_id', size: 100, required: false },
        { type: 'string', key: 'visit_id', size: 100, required: true },
        { type: 'string', key: 'history', size: 2000, required: true },
        { type: 'string', key: 'examination', size: 2000, required: true },
        { type: 'string', key: 'diagnosis_icd10', size: 100, required: true },
        { type: 'string', key: 'treatment_plan', size: 2000, required: false }
      ]
    },
    {
      id: 'orders',
      name: 'Orders',
      attributes: [
        { type: 'string', key: 'facility_id', size: 100, required: false },
        { type: 'string', key: 'visit_id', size: 100, required: true },
        { type: 'string', key: 'type', size: 50, required: true },
        { type: 'string', key: 'item_name', size: 255, required: true },
        { type: 'string', key: 'instructions', size: 1000, required: false },
        { type: 'string', key: 'status', size: 50, required: true },
        { type: 'string', key: 'results', size: 1000, required: false },
        { type: 'float', key: 'price', required: false, default: 0.0 }
      ]
    },
    {
      id: 'invoices',
      name: 'Invoices',
      attributes: [
        { type: 'string', key: 'facility_id', size: 100, required: false },
        { type: 'string', key: 'visit_id', size: 100, required: true },
        { type: 'float', key: 'total_amount', required: false, default: 0.0 },
        { type: 'float', key: 'amount_paid', required: false, default: 0.0 },
        { type: 'string', key: 'status', size: 50, required: true },
        { type: 'string', key: 'payment_method', size: 50, required: false }
      ]
    },
    {
      id: 'audit_logs',
      name: 'Audit Logs',
      attributes: [
        { type: 'string', key: 'facility_id', size: 100, required: false },
        { type: 'string', key: 'user_id', size: 100, required: false },
        { type: 'string', key: 'action', size: 255, required: true },
        { type: 'string', key: 'details', size: 2000, required: false }
      ]
    }
  ];

  const permissions = [
    Permission.read(Role.any()),
    Permission.write(Role.any()),
    Permission.create(Role.any()),
    Permission.update(Role.any()),
    Permission.delete(Role.any())
  ];

  for (const col of collections) {
    try {
      console.log(`\nCreating Collection: ${col.name} (${col.id})...`);
      await databases.createCollection(databaseId, col.id, col.name, permissions);
      console.log(`Collection [${col.id}] created successfully.`);
    } catch (err) {
      if (err.code === 409) {
        console.log(`Collection [${col.id}] already exists.`);
      } else {
        console.error(`Error creating collection [${col.id}]:`, err.message);
        continue;
      }
    }

    // Wait a brief moment for the collection to index in Appwrite before posting attributes
    await waitCollectionReady(col.id);

    // Create attributes for this collection
    for (const attr of col.attributes) {
      try {
        console.log(` - Adding attribute: ${attr.key} (${attr.type})`);
        if (attr.type === 'string') {
          await databases.createStringAttribute(databaseId, col.id, attr.key, attr.size, attr.required, attr.default);
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(databaseId, col.id, attr.key, attr.required, null, null, attr.default);
        } else if (attr.type === 'float') {
          await databases.createFloatAttribute(databaseId, col.id, attr.key, attr.required, null, null, attr.default);
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(databaseId, col.id, attr.key, attr.required, attr.default);
        }
        await sleep(300); // Small delay to prevent hitting Appwrite rate limits or queue locks
      } catch (err) {
        if (err.code === 409) {
          console.log(`   Attribute [${attr.key}] already exists.`);
        } else {
          console.error(`   Error creating attribute [${attr.key}]:`, err.message);
        }
      }
    }
  }

  // 3. Seed initial facilities & profiles in Appwrite
  console.log('\nSeeding default clinic setup...');
  try {
    await databases.createDocument(databaseId, 'facilities', 'f1', {
      name: 'Eagle Tech Medical Clinic',
      code: 'EMC-001'
    });
    console.log('Seeded facility: Eagle Tech Medical Clinic');
  } catch (err) {
    if (err.code === 409) {
      await databases.updateDocument(databaseId, 'facilities', 'f1', {
        name: 'Eagle Tech Medical Clinic'
      });
      console.log('Updated facility f1 name to Eagle Tech Medical Clinic');
    } else {
      console.error('Error seeding facility:', err.message);
    }
  }

  try {
    await databases.createDocument(databaseId, 'profiles', 'u1', {
      full_name: 'Dr. Arthur Conan',
      role: 'clinician',
      facility_id: 'f1'
    });
    await databases.createDocument(databaseId, 'profiles', 'u2', {
      full_name: 'Nurse Jane Doe',
      role: 'nurse',
      facility_id: 'f1'
    });
    await databases.createDocument(databaseId, 'profiles', 'u3', {
      full_name: 'Alice Cooper',
      role: 'receptionist',
      facility_id: 'f1'
    });
    console.log('Seeded operational profiles (Clinician, Triage Nurse, Receptionist)');
  } catch (err) {
    if (err.code === 409) console.log('Profiles already seeded.');
    else console.error('Error seeding profiles:', err.message);
  }

  console.log('\n=== Appwrite Database Setup Completed Successfully! ===');
};

setup().catch(err => {
  console.error('Fatal setup error:', err.message);
});
