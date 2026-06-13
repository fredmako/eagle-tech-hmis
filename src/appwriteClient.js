import { Client, Databases, ID, Query, Account, Functions } from 'appwrite';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'egesa_health';

const isRealAppwrite = projectId && projectId.trim() !== '';

// Initialize Appwrite Client if credentials exist
let client = null;
let databases = null;
let account = null;
let functions = null;

if (isRealAppwrite) {
  client = new Client();
  client.setEndpoint(endpoint).setProject(projectId);
  databases = new Databases(client);
  account = new Account(client);
  functions = new Functions(client);
}

// --- Local Storage Sandbox Database Engine (Fallback) ---
const MOCK_STORAGE_KEY = 'egesa_health_mock_db';

const getInitialMockData = () => {
  const defaultFacilities = [
    { id: 'f1', name: 'Eagle Tech Medical Clinic', code: 'EMC-001' },
    { id: 'f2', name: 'Meso Referral Hospital', code: 'MRH-002' }
  ];

  const defaultProfiles = [
    { id: 'u1', full_name: 'Dr. Arthur Conan', role: 'clinician', facility_id: 'f1' },
    { id: 'u2', full_name: 'Nurse Jane Doe', role: 'nurse', facility_id: 'f1' },
    { id: 'u3', full_name: 'Alice Cooper (Receptionist)', role: 'receptionist', facility_id: 'f1' },
    { id: 'u4', full_name: 'Dr. Lab Tech Terry', role: 'lab_tech', facility_id: 'f1' },
    { id: 'u5', full_name: 'Pharmacist Bob', role: 'pharmacist', facility_id: 'f1' },
    { id: 'u6', full_name: 'Cashier Mary', role: 'cashier', facility_id: 'f1' },
    { id: 'u7', full_name: 'Admin Grace', role: 'admin', facility_id: 'f1' }
  ];

  const defaultPatients = [
    {
      id: 'p1',
      facility_id: 'f1',
      name: 'John Mwangi',
      dob: '1988-05-14',
      gender: 'male',
      national_id: '29384758',
      facility_id_code: 'EMC-PT-001',
      phone: '0712345678',
      next_of_kin_name: 'Sarah Mwangi',
      next_of_kin_phone: '0787654321',
      next_of_kin_relation: 'spouse',
      consent_given: true,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString()
    },
    {
      id: 'p2',
      facility_id: 'f1',
      name: 'Mary Achieng',
      dob: '1995-11-23',
      gender: 'female',
      national_id: '30495867',
      facility_id_code: 'EMC-PT-002',
      phone: '0722334455',
      next_of_kin_name: 'Peter Omondi',
      next_of_kin_phone: '0799887766',
      next_of_kin_relation: 'brother',
      consent_given: true,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    }
  ];

  const defaultVisits = [
    {
      id: 'v1',
      patient_id: 'p1',
      facility_id: 'f1',
      department: 'triage',
      priority: 'routine',
      status: 'waiting',
      created_at: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: 'v2',
      patient_id: 'p2',
      facility_id: 'f1',
      department: 'consultation',
      priority: 'urgent',
      status: 'in_progress',
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  const defaultTriages = [
    {
      id: 't_v2',
      visit_id: 'v2',
      systolic: 135,
      diastolic: 85,
      heart_rate: 82,
      temperature: 38.5,
      resp_rate: 18,
      spo2: 97,
      weight: 68,
      height: 1.72,
      bmi: 23.0,
      chief_complaint: 'Severe headache and high fever for 3 days.',
      priority_flag: 'yellow',
      risk_indicators: 'Fever',
      created_at: new Date(Date.now() - 3000000).toISOString()
    }
  ];

  const defaultConsultations = [];
  const defaultOrders = [];
  const defaultInvoices = [];
  const defaultAuditLogs = [
    { id: 'log1', facility_id: 'f1', user_id: 'u3', action: 'Patient Registration', details: 'Registered new patient John Mwangi (EMC-PT-001)', created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
    { id: 'log2', facility_id: 'f1', user_id: 'u3', action: 'Queue Ticket', details: 'Opened Triage visit for patient John Mwangi', created_at: new Date(Date.now() - 1800000).toISOString() }
  ];

  return {
    facilities: defaultFacilities,
    profiles: defaultProfiles,
    patients: defaultPatients,
    visits: defaultVisits,
    triages: defaultTriages,
    consultations: defaultConsultations,
    orders: defaultOrders,
    invoices: defaultInvoices,
    audit_logs: defaultAuditLogs
  };
};

const loadMockDB = () => {
  const data = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!data) {
    const initial = getInitialMockData();
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(data);
};

const saveMockDB = (db) => {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
};

const getActiveFacilityId = () => {
  const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
  return activeUser?.facility_id || null;
};

// --- Mock Query Builder ---
class MockQueryBuilder {
  constructor(tableName, db) {
    this.tableName = tableName;
    this.db = db;
    this.filters = [];
    this.orderByField = null;
    this.orderByAsc = true;
  }

  select(columns = '*') {
    return this;
  }

  eq(column, value) {
    this.filters.push((item) => item[column] === value);
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.orderByField = column;
    this.orderByAsc = ascending;
    return this;
  }

  async then(resolve) {
    try {
      let data = [...(this.db[this.tableName] || [])];
      
      const globalTables = ['facilities', 'profiles'];
      const activeFacId = getActiveFacilityId();
      if (!globalTables.includes(this.tableName) && activeFacId) {
        data = data.filter((item) => item.facility_id === activeFacId);
      }

      for (const filter of this.filters) {
        data = data.filter(filter);
      }
      if (this.orderByField) {
        data.sort((a, b) => {
          let valA = a[this.orderByField];
          let valB = b[this.orderByField];
          if (typeof valA === 'string') {
            return this.orderByAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          if (valA < valB) return this.orderByAsc ? -1 : 1;
          if (valA > valB) return this.orderByAsc ? 1 : -1;
          return 0;
        });
      }
      resolve({ data, error: null });
    } catch (err) {
      resolve({ data: null, error: err.message });
    }
  }
}

// --- Appwrite Real Query Builder ---
class AppwriteQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.queries = [];
  }

  select(columns = '*') {
    return this;
  }

  eq(column, value) {
    const targetCol = column === 'id' ? '$id' : (column === 'created_at' ? '$createdAt' : column);
    this.queries.push(Query.equal(targetCol, value));
    return this;
  }

  order(column, { ascending = true } = {}) {
    const targetCol = column === 'id' ? '$id' : (column === 'created_at' ? '$createdAt' : column);
    this.queries.push(ascending ? Query.orderAsc(targetCol) : Query.orderDesc(targetCol));
    return this;
  }

  async then(resolve) {
    try {
      const globalTables = ['facilities', 'profiles'];
      const activeFacId = getActiveFacilityId();
      
      if (!globalTables.includes(this.tableName) && activeFacId) {
        // Appwrite query lists contain strings. We check if facility_id filter is already added
        const hasFacilityFilter = this.queries.some(q => q && q.includes && q.includes('facility_id'));
        if (!hasFacilityFilter) {
          this.queries.push(Query.equal('facility_id', activeFacId));
        }
      }

      const response = await databases.listDocuments(databaseId, this.tableName, this.queries);
      const data = response.documents.map(doc => ({
        id: doc.$id,
        created_at: doc.$createdAt,
        ...doc
      }));
      resolve({ data, error: null });
    } catch (err) {
      resolve({ data: null, error: err.message });
    }
  }
}

// --- Table / Collection Class ---
class QueryTable {
  constructor(tableName) {
    this.tableName = tableName;
  }

  select(columns = '*') {
    if (isRealAppwrite) {
      return new AppwriteQueryBuilder(this.tableName).select(columns);
    } else {
      const db = loadMockDB();
      return new MockQueryBuilder(this.tableName, db).select(columns);
    }
  }

  insert(rows) {
    if (isRealAppwrite) {
      const dataRows = Array.isArray(rows) ? rows : [rows];
      const activeFacId = getActiveFacilityId();

      const insertPromises = dataRows.map(async (row) => {
        // Remove system fields to prevent Appwrite attribute schema validation errors
        const { id, created_at, $id, $createdAt, ...cleanData } = row;
        
        // Auto-inject facility_id for tenant tables
        const globalTables = ['facilities', 'profiles'];
        if (!globalTables.includes(this.tableName) && activeFacId && !cleanData.facility_id) {
          cleanData.facility_id = activeFacId;
        }

        const docId = id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
        const response = await databases.createDocument(databaseId, this.tableName, docId, cleanData);
        return {
          id: response.$id,
          created_at: response.$createdAt,
          ...response
        };
      });

      const execute = async () => {
        try {
          const results = await Promise.all(insertPromises);
          
          // Audit Log Hook (for audit trail)
          if (this.tableName !== 'audit_logs') {
            const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
            await databases.createDocument(databaseId, 'audit_logs', ID.unique(), {
              facility_id: activeUser?.facility_id || 'f1',
              user_id: activeUser?.id || 'system',
              action: `Insert: ${this.tableName}`,
              details: `Inserted data into ${this.tableName}`
            });
          }

          return { data: Array.isArray(rows) ? results : results[0], error: null };
        } catch (err) {
          return { data: null, error: err.message };
        }
      };

      return {
        select: () => ({
          then: (resolve) => execute().then(resolve)
        }),
        then: (resolve) => execute().then(resolve)
      };
    } else {
      // Local Mock DB fallback
      const db = loadMockDB();
      const dataRows = Array.isArray(rows) ? rows : [rows];
      const activeFacId = getActiveFacilityId();

      const newItems = dataRows.map((row) => {
        const { id, created_at, ...cleanRow } = row;
        const globalTables = ['facilities', 'profiles'];
        if (!globalTables.includes(this.tableName) && activeFacId && !cleanRow.facility_id) {
          cleanRow.facility_id = activeFacId;
        }
        return {
          id: id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)),
          created_at: created_at || new Date().toISOString(),
          ...cleanRow
        };
      });

      db[this.tableName] = [...(db[this.tableName] || []), ...newItems];
      saveMockDB(db);

      if (this.tableName !== 'audit_logs') {
        const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
        const logEntry = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
          created_at: new Date().toISOString(),
          facility_id: activeUser?.facility_id || 'f1',
          user_id: activeUser?.id || 'system',
          action: `Insert: ${this.tableName}`,
          details: `Inserted data into ${this.tableName}`
        };
        db.audit_logs = [...(db.audit_logs || []), logEntry];
        saveMockDB(db);
      }

      return {
        select: () => ({
          then: (resolve) => resolve({ data: Array.isArray(rows) ? newItems : newItems[0], error: null })
        }),
        then: (resolve) => resolve({ data: Array.isArray(rows) ? newItems : newItems[0], error: null })
      };
    }
  }

  update(values) {
    if (isRealAppwrite) {
      return {
        eq: (column, value) => {
          const executeUpdate = async () => {
            try {
              const targetCol = column === 'id' ? '$id' : (column === 'created_at' ? '$createdAt' : column);
              const activeFacId = getActiveFacilityId();
              const globalTables = ['facilities', 'profiles'];

              const updateQueries = [Query.equal(targetCol, value)];
              if (!globalTables.includes(this.tableName) && activeFacId) {
                updateQueries.push(Query.equal('facility_id', activeFacId));
              }

              const response = await databases.listDocuments(databaseId, this.tableName, updateQueries);
              if (response.documents.length === 0) {
                return { data: [], error: 'Document not found or access denied' };
              }
              
              // Remove system fields to prevent Appwrite attribute validation errors during update
              const { id, created_at, $id, $createdAt, ...cleanValues } = values;
              
              const updatePromises = response.documents.map(async (doc) => {
                const updated = await databases.updateDocument(databaseId, this.tableName, doc.$id, cleanValues);
                return {
                  id: updated.$id,
                  created_at: updated.$createdAt,
                  ...updated
                };
              });

              const results = await Promise.all(updatePromises);

              // Log audit log
              const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
              await databases.createDocument(databaseId, 'audit_logs', ID.unique(), {
                facility_id: activeUser?.facility_id || 'f1',
                user_id: activeUser?.id || 'system',
                action: `Update: ${this.tableName}`,
                details: `Updated ${this.tableName} where ${column} = ${value}`
              });

              return { data: results, error: null };
            } catch (err) {
              return { data: null, error: err.message };
            }
          };

          return {
            then: (resolve) => executeUpdate().then(resolve)
          };
        }
      };
    } else {
      // Local Mock DB fallback
      return {
        eq: (column, value) => {
          const db = loadMockDB();
          const table = db[this.tableName] || [];
          let updatedItems = [];
          
          db[this.tableName] = table.map((item) => {
            if (item[column] === value) {
              const updated = { ...item, ...values };
              updatedItems.push(updated);
              return updated;
            }
            return item;
          });
          saveMockDB(db);

          if (this.tableName !== 'audit_logs' && updatedItems.length > 0) {
            const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
            const logEntry = {
              id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
              created_at: new Date().toISOString(),
              facility_id: activeUser?.facility_id || 'f1',
              user_id: activeUser?.id || 'system',
              action: `Update: ${this.tableName}`,
              details: `Updated ${this.tableName} where ${column} = ${value}`
            };
            db.audit_logs = [...(db.audit_logs || []), logEntry];
            saveMockDB(db);
          }

          return {
            then: (resolve) => resolve({ data: updatedItems, error: null })
          };
        }
      };
    }
  }

  delete() {
    if (isRealAppwrite) {
      return {
        eq: (column, value) => {
          const executeDelete = async () => {
            try {
              const targetCol = column === 'id' ? '$id' : (column === 'created_at' ? '$createdAt' : column);
              const activeFacId = getActiveFacilityId();
              const globalTables = ['facilities', 'profiles'];

              const deleteQueries = [Query.equal(targetCol, value)];
              if (!globalTables.includes(this.tableName) && activeFacId) {
                deleteQueries.push(Query.equal('facility_id', activeFacId));
              }

              const response = await databases.listDocuments(databaseId, this.tableName, deleteQueries);
              const deletePromises = response.documents.map(doc => 
                databases.deleteDocument(databaseId, this.tableName, doc.$id)
              );
              await Promise.all(deletePromises);

              const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
              await databases.createDocument(databaseId, 'audit_logs', ID.unique(), {
                facility_id: activeUser?.facility_id || 'f1',
                user_id: activeUser?.id || 'system',
                action: `Delete: ${this.tableName}`,
                details: `Deleted from ${this.tableName} where ${column} = ${value}`
              });

              return { data: null, error: null };
            } catch (err) {
              return { data: null, error: err.message };
            }
          };

          return {
            then: (resolve) => executeDelete().then(resolve)
          };
        }
      };
    } else {
      // Local Mock DB fallback
      return {
        eq: (column, value) => {
          const db = loadMockDB();
          const table = db[this.tableName] || [];
          db[this.tableName] = table.filter((item) => item[column] !== value);
          saveMockDB(db);

          if (this.tableName !== 'audit_logs') {
            const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
            const logEntry = {
              id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
              created_at: new Date().toISOString(),
              facility_id: activeUser?.facility_id || 'f1',
              user_id: activeUser?.id || 'system',
              action: `Delete: ${this.tableName}`,
              details: `Deleted from ${this.tableName} where ${column} = ${value}`
            };
            db.audit_logs = [...(db.audit_logs || []), logEntry];
            saveMockDB(db);
          }

          return {
            then: (resolve) => resolve({ data: null, error: null })
          };
        }
      };
    }
  }
}

// --- Appwrite Auth Wrapper ---
const appwriteAuth = {
  signInWithPassword: async ({ email, password }) => {
    if (isRealAppwrite) {
      try {
        // Appwrite creates a session for the user
        const session = await account.createEmailPasswordSession(email, password);
        const userDetails = await account.get();
        
        return {
          data: {
            user: {
              id: userDetails.$id,
              email: userDetails.email,
              user_metadata: userDetails.prefs || {} // Appwrite user preferences can store roles
            }
          },
          error: null
        };
      } catch (err) {
        return { data: null, error: err.message };
      }
    } else {
      // Mock Auth system
      const db = loadMockDB();
      const username = email.split('@')[0].toLowerCase();
      const user = db.profiles.find(u => u.role === username || u.full_name.toLowerCase().includes(username));
      
      if (user) {
        sessionStorage.setItem('egesa_health_active_user', JSON.stringify(user));
        const logEntry = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
          created_at: new Date().toISOString(),
          facility_id: user.facility_id,
          user_id: user.id,
          action: 'Authentication',
          details: `${user.full_name} logged in successfully as ${user.role.toUpperCase()}`
        };
        db.audit_logs = [...(db.audit_logs || []), logEntry];
        saveMockDB(db);

        return { data: { user: { id: user.id, email, user_metadata: { full_name: user.full_name, role: user.role } } }, error: null };
      }
      return { data: null, error: 'Invalid login credentials. Tip: Use role name as username (e.g. nurse@egesa.com) with any password.' };
    }
  },

  signOut: async () => {
    if (isRealAppwrite) {
      try {
        await account.deleteSession('current');
        return { error: null };
      } catch (err) {
        return { error: err.message };
      }
    } else {
      const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
      if (activeUser) {
        const db = loadMockDB();
        const logEntry = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
          created_at: new Date().toISOString(),
          facility_id: activeUser.facility_id,
          user_id: activeUser.id,
          action: 'Authentication',
          details: `${activeUser.full_name} logged out`
        };
        db.audit_logs = [...(db.audit_logs || []), logEntry];
        saveMockDB(db);
      }
      sessionStorage.removeItem('egesa_health_active_user');
      return { error: null };
    }
  },

  signInWithGoogle: async () => {
    if (isRealAppwrite) {
      try {
        const successUrl = window.location.origin;
        const failureUrl = window.location.origin;
        account.createOAuth2Session('google', successUrl, failureUrl);
        return { error: null };
      } catch (err) {
        return { error: err.message };
      }
    } else {
      // Mock Google Login in Sandbox Mode - logs in as Admin
      const db = loadMockDB();
      const user = db.profiles.find(u => u.role === 'admin');
      if (user) {
        sessionStorage.setItem('egesa_health_active_user', JSON.stringify(user));
        return { data: { user: { id: user.id, email: 'google.admin@egesa.com', user_metadata: { full_name: user.full_name, role: user.role } } }, error: null };
      }
      return { error: 'Sandbox Admin profile not found' };
    }
  },

  getUser: async () => {
    if (isRealAppwrite) {
      try {
        const userDetails = await account.get();
        return {
          data: {
            user: {
              id: userDetails.$id,
              email: userDetails.email,
              user_metadata: userDetails.prefs || {}
            }
          },
          error: null
        };
      } catch (err) {
        return { data: { user: null }, error: null };
      }
    } else {
      const activeUser = JSON.parse(sessionStorage.getItem('egesa_health_active_user') || 'null');
      if (activeUser) {
        return { data: { user: { id: activeUser.id, user_metadata: { full_name: activeUser.full_name, role: activeUser.role } } }, error: null };
      }
      return { data: { user: null }, error: null };
    }
  },

  signUp: async ({ email, password, name }) => {
    if (isRealAppwrite) {
      try {
        const response = await account.create(ID.unique(), email, password, name);
        return {
          data: {
            user: {
              id: response.$id,
              email: response.email,
              user_metadata: { full_name: name }
            }
          },
          error: null
        };
      } catch (err) {
        return { data: null, error: err.message };
      }
    } else {
      // Sandbox mode signup
      const mockUser = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
        email,
        user_metadata: { full_name: name }
      };
      return { data: { user: mockUser }, error: null };
    }
  }
};

// Export Client
export const supabase = {
  auth: appwriteAuth,
  from: (tableName) => new QueryTable(tableName),
  isSandbox: !isRealAppwrite,
  functions: {
    invoke: async (functionName, payload) => {
      if (isRealAppwrite) {
        try {
          const execution = await functions.createExecution(
            functionName,
            JSON.stringify(payload)
          );
          return {
            data: {
              responseBody: execution.responseBody,
              statusCode: execution.statusCode
            },
            error: null
          };
        } catch (err) {
          return { data: null, error: err.message };
        }
      } else {
        // High-fidelity sandbox simulation
        await new Promise((resolve) => setTimeout(resolve, 1500));

        if (functionName === 'google-oauth-exchange') {
          const db = loadMockDB();
          const facilityProfiles = db.profiles.filter(p => p.facility_id === payload.facilityId);

          if (facilityProfiles.length > 0) {
            const targetUser = facilityProfiles.find(p => p.role === 'admin') || facilityProfiles[0];
            const token = targetUser.autologin_token || `tok_google_${Math.random().toString(36).substring(2, 15)}`;

            db.profiles = db.profiles.map(p => {
              if (p.id === targetUser.id) {
                return { ...p, autologin_token: token };
              }
              return p;
            });
            saveMockDB(db);

            return {
              data: {
                responseBody: JSON.stringify({
                  success: true,
                  email: targetUser.email || `${targetUser.full_name.toLowerCase().replace(/ /g, '')}@egesa.com`,
                  autologin_token: token
                }),
                statusCode: 200
              },
              error: null
            };
          } else {
            return {
              data: null,
              error: 'No active profile found for the selected hospital facility.'
            };
          }
        }

        return {
          data: {
            responseBody: JSON.stringify({
              success: true,
              message: `Simulated report generated by Appwrite Function '${functionName}'`,
              timestamp: new Date().toISOString(),
              recordCount: payload.recordCount || 0
            }),
            statusCode: 200
          },
          error: null
        };
      }
    }
  }
};
