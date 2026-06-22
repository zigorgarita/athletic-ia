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
  // 1. Get Kevin from DB
  const { data: dbPlayers, error: dbError } = await supabase
    .from('players')
    .select('id, nombre, apellidos, foto_url')
    .ilike('nombre', '%Kevin%');

  if (dbError) {
    console.error('Error fetching player:', dbError.message);
    return;
  }

  console.log('--- DATABASE CHECK ---');
  console.log('Player found in DB:', dbPlayers);

  // 2. Get list of files in Storage bucket
  const { data: files, error: filesError } = await supabase.storage
    .from('player-photos')
    .list();

  if (filesError) {
    console.error('Error listing files:', filesError.message);
    return;
  }

  console.log('\n--- STORAGE CHECK ---');
  console.log('Files in player-photos bucket:');
  console.log(files.map(f => f.name));
}

run();
