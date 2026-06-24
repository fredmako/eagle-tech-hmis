const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/egesa web/server/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'fredrickmakori102@gmail.com');
  
  if (error) {
    console.error('Error fetching Fredrick profile:', error);
  } else {
    console.log('Fredrick profiles found:', data);
  }
}

check();
