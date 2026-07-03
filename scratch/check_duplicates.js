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
  console.log('Checking for existing duplicate valuations by (player_id, fecha_evaluacion)...');
  
  const { data, error } = await supabase
    .from('detailed_evaluations')
    .select('id, player_id, fecha_evaluacion');
  
  if (error) {
    console.error('Error fetching evaluations:', error.message);
    return;
  }

  const occurrences = {};
  const duplicates = [];

  data.forEach(row => {
    const key = `${row.player_id}_${row.fecha_evaluacion}`;
    if (!occurrences[key]) {
      occurrences[key] = [];
    }
    occurrences[key].push(row.id);
  });

  Object.entries(occurrences).forEach(([key, ids]) => {
    if (ids.length > 1) {
      const [playerId, fecha] = key.split('_');
      duplicates.push({
        player_id: playerId,
        fecha_evaluacion: fecha,
        count: ids.length,
        ids: ids
      });
    }
  });

  console.log(`Found ${duplicates.length} duplicate combinations.`);
  if (duplicates.length > 0) {
    console.log('Duplicate details:', JSON.stringify(duplicates, null, 2));
  }
}
run();
