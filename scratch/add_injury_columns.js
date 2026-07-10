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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const sql = `
    ALTER TABLE player_injuries ADD COLUMN IF NOT EXISTS zona_afectada TEXT;
    ALTER TABLE player_injuries ADD COLUMN IF NOT EXISTS tratamiento TEXT;
  `;
  console.log("Adding columns zona_afectada and tratamiento via exec_sql...");
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.error('Error executing migration:', error);
  } else {
    console.log('Successfully updated player_injuries table structure!', data);
  }
}
run();
