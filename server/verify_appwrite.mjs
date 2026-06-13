const API = 'https://api.eagletechsolutions.tech/v1';
const PROJECT = '6a2c8f4b002377b3b176';
const KEY = 'standard_00f007bd22e53b06f01be2491ab60f9851cc564d331ecbfbbec8dc52b55a895445dede07aa71aa3e42a6e979cbbaf24929c4819bdb0fa46562675b94c7f8feca89b0b519ee8eab2ad9827b14d296ae87affe813de8e96672fb2d656893012c8cc6e1b11f6d0f943554d2692ad36ed161bcbfb01a279109624c7e6038b9165e79';
const DB = 'egesa_health';

const headers = {
  'x-appwrite-project': PROJECT,
  'x-appwrite-key': KEY
};

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m', B = '\x1b[1m', X = '\x1b[0m';

async function listCollections() {
  const res = await fetch(`${API}/databases/${DB}/collections`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

async function listAttributes(collId) {
  const res = await fetch(`${API}/databases/${DB}/collections/${collId}/attributes`, { headers });
  const data = await res.json();
  if (!res.ok) return { attributes: [] };
  return data;
}

async function listIndexes(collId) {
  const res = await fetch(`${API}/databases/${DB}/collections/${collId}/indexes`, { headers });
  const data = await res.json();
  if (!res.ok) return { indexes: [] };
  return data;
}

async function createIndex(collId, key, type, attrs) {
  const res = await fetch(`${API}/databases/${DB}/collections/${collId}/indexes`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, type, attributes: attrs })
  });
  const data = await res.json();
  if (!res.ok && !data.message?.includes('already exists')) {
    console.log(`  ${Y}⚠  Index ${key}: ${data.message}${X}`);
  } else if (res.ok) {
    console.log(`  ${G}✅ Index created: ${key}${X}`);
  } else {
    console.log(`  ${Y}⚠  Index already exists: ${key}${X}`);
  }
}

async function main() {
  console.log(`\n${B}Eagle Tech HMIS — Appwrite Database Verification${X}`);
  console.log(`Project: ${PROJECT} | DB: ${DB}\n`);

  const colData = await listCollections();
  console.log(`${B}${G}Collections found: ${colData.total}${X}\n`);

  const found = [];
  for (const col of colData.collections) {
    found.push(col.$id);
    const attrs = await listAttributes(col.$id);
    console.log(`${G}✅ ${col.name}${X} (${col.$id})`);
    attrs.attributes.forEach(a => {
      const status = a.status === 'available' ? `${G}available${X}` : `${Y}${a.status}${X}`;
      console.log(`   • ${a.key} [${a.type}] — ${status}`);
    });
    console.log('');
  }

  // Check all required collections
  console.log(`${B}Required Collections Status:${X}`);
  const required = ['facilities', 'profiles', 'role_requests', 'audit_logs'];
  for (const r of required) {
    if (found.includes(r)) {
      console.log(`${G}✅ ${r}${X}`);
    } else {
      console.log(`${R}❌ ${r} — MISSING${X}`);
    }
  }

  // Add useful indexes if role_requests exists
  if (found.includes('role_requests')) {
    console.log(`\n${B}Creating indexes on role_requests...${X}`);
    await createIndex('role_requests', 'idx_email', 'key', ['email']);
    await new Promise(r => setTimeout(r, 500));
    await createIndex('role_requests', 'idx_facility', 'key', ['facility_id']);
    await new Promise(r => setTimeout(r, 500));
    await createIndex('role_requests', 'idx_status', 'key', ['status']);
  }

  console.log(`\n${G}${B}Verification complete!${X}\n`);
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
