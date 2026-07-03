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
  const { data: players } = await supabase.from('players').select('id').limit(1);
  if (!players || players.length === 0) {
    console.error('No players found');
    return;
  }
  const playerId = players[0].id;
  const payload = {
    player_id: playerId,
    fecha_evaluacion: new Date().toISOString().split('T')[0],
    metricas: { 'Test Metric': 4 }
  };
  const { data, error } = await supabase.from('detailed_evaluations').insert([payload]);
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
