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
  const { data, error } = await supabase
    .from('tactical_lineups')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching lineups:', error);
    process.exit(1);
  }

  console.log(`Fetched ${data.length} lineups.`);
  data.forEach((l, index) => {
    console.log(`\n--- Lineup ${index + 1}: ${l.nombre_pizarra || l.nombre_sistema} (ID: ${l.id}) ---`);
    console.log('posiciones type:', typeof l.posiciones);
    console.log('posiciones JSON:', JSON.stringify(l.posiciones, null, 2));
  });
}

run();
