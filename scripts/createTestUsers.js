import { Client, Databases, Users, ID, Query } from 'node-appwrite';
import fs from 'fs';
import path from 'path';

// Load env variables
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
const users = new Users(client);

// Define real test users we want to provision in Auth and profiles
const testUsers = [
  {
    email: 'receptionist@egesa.com',
    password: 'Password123!',
    fullName: 'Alice Receptionist',
    role: 'receptionist'
  },
  {
    email: 'nurse@egesa.com',
    password: 'Password123!',
    fullName: 'Nurse Jane Doe',
    role: 'nurse'
  },
  {
    email: 'clinician@egesa.com',
    password: 'Password123!',
    fullName: 'Dr. Arthur Conan',
    role: 'clinician'
  },
  {
    email: 'admin@egesa.com',
    password: 'Password123!',
    fullName: 'Admin Grace',
    role: 'admin'
  }
];

const cleanCollections = async () => {
  console.log('Cleaning existing clinical transaction data from live database...');
  const collectionsToClean = ['patients', 'visits', 'triages', 'consultations', 'orders', 'invoices', 'audit_logs'];
  
  for (const col of collectionsToClean) {
    try {
      console.log(`Clearing collection: ${col}...`);
      const response = await databases.listDocuments(databaseId, col, [Query.limit(100)]);
      for (const doc of response.documents) {
        await databases.deleteDocument(databaseId, col, doc.$id);
      }
      console.log(`Cleared documents from ${col}.`);
    } catch (err) {
      console.warn(`Could not clear collection ${col}: ${err.message}`);
    }
  }
};

const provisionAuthUsersAndProfiles = async () => {
  console.log('\nProvisioning Auth Users and Database Profiles...');
  
  // Make sure facility 'f1' exists
  try {
    await databases.createDocument(databaseId, 'facilities', 'f1', {
      name: 'Egesa Medical Clinic',
      code: 'EMC-001'
    });
    console.log('Verified Egesa Medical Clinic (f1) is provisioned.');
  } catch (err) {
    if (err.code === 409) {
      console.log('Facility f1 already exists.');
    } else {
      console.error('Facility verification failed:', err.message);
    }
  }

  for (const u of testUsers) {
    let authUser = null;
    
    // Check if user exists in Appwrite Auth
    try {
      const existing = await users.list([Query.equal('email', u.email)]);
      if (existing.total > 0) {
        authUser = existing.users[0];
        console.log(`Auth user [${u.email}] already exists in Appwrite Auth (ID: ${authUser.$id}).`);
      }
    } catch (err) {
      console.warn(`Error checking auth user: ${err.message}`);
    }

    // Create user in Auth if not exists
    if (!authUser) {
      try {
        authUser = await users.create(ID.unique(), u.email, undefined, u.password, u.fullName);
        console.log(`Created Auth user [${u.email}] successfully (ID: ${authUser.$id}).`);
      } catch (err) {
        console.error(`Failed to create Auth user [${u.email}]: ${err.message}`);
        continue;
      }
    }

    // Set user preferences with role & name (so it's available in user_metadata client-side)
    try {
      await users.updatePrefs(authUser.$id, {
        role: u.role,
        full_name: u.fullName
      });
      console.log(`Updated preferences/role metadata for [${u.email}]`);
    } catch (err) {
      console.warn(`Could not update preferences for user [${authUser.$id}]: ${err.message}`);
    }

    // Create or update Profile document in database
    // Profile Document ID must match the Auth User ID
    try {
      await databases.createDocument(databaseId, 'profiles', authUser.$id, {
        full_name: u.fullName,
        role: u.role,
        facility_id: 'f1'
      });
      console.log(`Created profile document in DB for [${u.email}] with ID [${authUser.$id}]`);
    } catch (err) {
      if (err.code === 409) {
        // Document already exists, let's update it
        try {
          await databases.updateDocument(databaseId, 'profiles', authUser.$id, {
            full_name: u.fullName,
            role: u.role,
            facility_id: 'f1'
          });
          console.log(`Updated existing profile document for [${u.email}]`);
        } catch (upErr) {
          console.error(`Failed to update profile document: ${upErr.message}`);
        }
      } else {
        console.error(`Failed to create profile document: ${err.message}`);
      }
    }
  }
};

const run = async () => {
  await cleanCollections();
  await provisionAuthUsersAndProfiles();
  console.log('\n=== Seeding and Auth Provisioning Complete! ===');
};

run().catch(err => {
  console.error('Provisioning error:', err.message);
});
