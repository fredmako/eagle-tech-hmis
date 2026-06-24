const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/egesa web/server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('facilities').select('*');
  if (error) {
    console.error('Error fetching facilities:', error);
  } else {
    console.log('Facilities in database:', data);
  }
}

run();
