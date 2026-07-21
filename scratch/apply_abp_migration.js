const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const sqlPath = path.join(__dirname, '..', 'sql', 'add_label_position_abp.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log("Applying migration SQL via exec_sql RPC...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('Error applying migration:', error);
  } else {
    console.log('Migration successfully applied! Result:', data);
  }
}
run();
