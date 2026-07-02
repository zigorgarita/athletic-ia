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

async function testUpsert() {
  console.log('Testing RPC upsert on training_attendance & training_evaluations...');
  
  // 1. Get a session ID and player ID
  const { data: session } = await supabase.from('planning_sessions').select('id').limit(1).single();
  const { data: player } = await supabase.from('players').select('id, nombre, apellidos, dorsal').limit(1).single();
  
  if (!session || !player) {
    console.error('No session or player found to test with.');
    return;
  }
  
  console.log(`Using Session ID: ${session.id}, Player ID: ${player.id}`);
  
  const evaluationPayload = [{
    session_id: session.id,
    player_id: player.id,
    player_full_name_backup: `${player.nombre} ${player.apellidos}`,
    player_dorsal_backup: player.dorsal,
    actitud: 4,
    intensidad: 4,
    comprension_tactica: 4,
    ejecucion_tecnica: 4,
    compromiso_defensivo: 4,
    compromiso_ofensivo: 4,
    valoracion_global: 4,
    observaciones: 'Test evaluation',
    fecha_evaluacion: '2026-07-01',
    evaluated_by: 'Cuerpo Técnico'
  }];
  
  const passkey = 'indautxu2026';
  
  const { data, error } = await supabase.rpc('exec_secure_bulk_upsert', {
    target_table: 'training_evaluations',
    payloads: evaluationPayload,
    conflict_columns: ['session_id', 'player_id'],
    staff_passkey: passkey
  });
  
  if (error) {
    console.error('RPC Error (evaluations):', error);
  } else {
    console.log('RPC Success (evaluations):', data);
  }
}

testUpsert();
