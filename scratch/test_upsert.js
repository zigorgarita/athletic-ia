const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("Deleting test session...");
  const { data, error } = await supabase.rpc('exec_secure_delete', {
    target_table: 'planning_sessions',
    record_id: 'd822ca01-c254-4463-8f28-f4fff9995e80',
    staff_passkey: 'indautxu2026'
  });

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Session deleted successfully.");
  }
}

main().catch(console.error);
