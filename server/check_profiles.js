const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('profiles')
    .update({ autologin_token: 'tok_test_faith' })
    .eq('email', 'nyafaith95@gmail.com')
    .select();
  
  if (error) {
    console.error('Error updating token:', error);
  } else {
    console.log('Successfully updated autologin token for nyafaith95@gmail.com:', data);
  }
}

check();
