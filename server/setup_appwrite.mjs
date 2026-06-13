import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

const client = new Client()
  .setEndpoint('https://api.eagletechsolutions.tech/v1')
  .setProject('6a2c8f4b002377b3b176')
  .setKey('standard_00f007bd22e53b06f01be2491ab60f9851cc564d331ecbfbbec8dc52b55a895445dede07aa71aa3e42a6e979cbbaf24929c4819bdb0fa46562675b94c7f8feca89b0b519ee8eab2ad9827b14d296ae87affe813de8e96672fb2d656893012c8cc6e1b11f6d0f943554d2692ad36ed161bcbfb01a279109624c7e6038b9165e79');

const db = new Databases(client);
const DATABASE_ID = 'egesa_health';

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', B = '\x1b[1m', X = '\x1b[0m';
const ok  = (m) => console.log(`${G}✅ ${m}${X}`);
const err = (m) => console.log(`${R}❌ ${m}${X}`);
const inf = (m) => console.log(`${C}   ↳ ${m}${X}`);
const sec = (m) => console.log(`\n${B}${Y}═══ ${m} ═══${X}`);

async function safeCreate(fn, label) {
  try {
    const result = await fn();
    ok(label);
    return result;
  } catch (e) {
    if (e.code === 409 || e.message?.includes('already exists') || e.message?.includes('duplicate')) {
      console.log(`${Y}⚠️  Already exists — skipping: ${label}${X}`);
    } else {
      err(`${label}: ${e.message}`);
    }
    return null;
  }
}

async function ensureCollection(collectionId, name, attrs) {
  sec(`Collection: ${name} (${collectionId})`);

  // Create collection
  await safeCreate(() => db.createCollection(
    DATABASE_ID,
    collectionId,
    name,
    [
      Permission.read(Role.any()),
      Permission.create(Role.any()),
      Permission.update(Role.any()),
      Permission.delete(Role.any()),
    ]
  ), `Created collection "${name}"`);

  // Create attributes
  for (const attr of attrs) {
    if (attr.type === 'string') {
      await safeCreate(() =>
        db.createStringAttribute(DATABASE_ID, collectionId, attr.key, attr.size || 255, attr.required || false, attr.default || null),
        `  Attribute: ${attr.key} (string)`
      );
    } else if (attr.type === 'boolean') {
      await safeCreate(() =>
        db.createBooleanAttribute(DATABASE_ID, collectionId, attr.key, attr.required || false, attr.default || false),
        `  Attribute: ${attr.key} (boolean)`
      );
    } else if (attr.type === 'datetime') {
      await safeCreate(() =>
        db.createDatetimeAttribute(DATABASE_ID, collectionId, attr.key, attr.required || false, null),
        `  Attribute: ${attr.key} (datetime)`
      );
    }
    // Small delay to avoid race conditions in Appwrite attribute creation
    await new Promise(r => setTimeout(r, 600));
  }
}

async function listExistingCollections() {
  sec('Existing Collections in egesa_health');
  try {
    const result = await db.listCollections(DATABASE_ID);
    if (result.collections.length === 0) {
      inf('No collections found.');
    } else {
      result.collections.forEach(c => inf(`${c.$id} — "${c.name}"`));
    }
    return result.collections.map(c => c.$id);
  } catch (e) {
    err(`Could not list collections: ${e.message}`);
    return [];
  }
}

async function main() {
  console.log(`\n${B}Eagle Tech HMIS — Appwrite Direct Configuration${X}`);
  console.log(`Project: 6a2c8f4b002377b3b176`);
  console.log(`Database: ${DATABASE_ID}\n`);

  // 1. List what exists first
  const existing = await listExistingCollections();

  // 2. Create role_requests collection if missing
  if (!existing.includes('role_requests')) {
    await ensureCollection('role_requests', 'Role Requests', [
      { key: 'user_id',        type: 'string',   size: 100,  required: true  },
      { key: 'full_name',      type: 'string',   size: 255,  required: true  },
      { key: 'email',          type: 'string',   size: 255,  required: true  },
      { key: 'facility_id',   type: 'string',   size: 100,  required: true  },
      { key: 'requested_role', type: 'string',   size: 100,  required: true  },
      { key: 'status',         type: 'string',   size: 50,   required: false, default: 'pending' },
    ]);
  } else {
    inf('role_requests already exists — skipping');
  }

  // 3. Create audit_logs collection if missing
  if (!existing.includes('audit_logs')) {
    await ensureCollection('audit_logs', 'Audit Logs', [
      { key: 'facility_id', type: 'string',   size: 100, required: false },
      { key: 'user_id',     type: 'string',   size: 100, required: false },
      { key: 'action',      type: 'string',   size: 255, required: true  },
      { key: 'details',     type: 'string',   size: 2000, required: false },
    ]);
  } else {
    inf('audit_logs already exists — skipping');
  }

  // 4. Verify facilities and profiles exist
  sec('Verification Check');
  const missing = [];
  for (const cid of ['facilities', 'profiles', 'role_requests', 'audit_logs']) {
    try {
      const c = await db.getCollection(DATABASE_ID, cid);
      ok(`Collection "${cid}" verified`);
      const attrs = await db.listAttributes(DATABASE_ID, cid);
      inf(`${attrs.attributes.length} attribute(s)`);
    } catch (e) {
      err(`Collection "${cid}" NOT FOUND: ${e.message}`);
      missing.push(cid);
    }
  }

  // 5. Summary
  sec('RESULT');
  if (missing.length === 0) {
    ok('All required Appwrite collections are present and verified!');
    console.log(`\n${G}The following are now ready:${X}`);
    console.log('  • role_requests — staff can now submit role requests');
    console.log('  • audit_logs    — system activity will be tracked');
    console.log('  • facilities    — existing');
    console.log('  • profiles      — existing\n');
  } else {
    err(`Still missing: ${missing.join(', ')}`);
  }
}

main().catch(e => {
  console.error('Script crashed:', e);
  process.exit(1);
});
