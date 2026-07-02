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
  console.log('=== Test de guardado de asistencia via RPC (como hace la app real) ===\n');

  const { data: session } = await supabase.from('planning_sessions').select('id').limit(1).single();
  const { data: player } = await supabase.from('players').select('id, nombre, apellidos, dorsal').limit(1).single();

  if (!session || !player) {
    console.error('No session or player found.');
    return;
  }

  const passkey = 'indautxu2026';
  
  // Test with all 11 absence reasons via RPC
  const validReasons = [
    'Lesión', 'Enfermedad', 'Estudios', 'Trabajo', 
    'Permiso', 'Selección', 'Viaje', 'Decisión técnica', 
    'Motivo personal', 'Sin justificar', 'Otro'
  ];

  console.log('Probando cada motivo de ausencia via exec_secure_bulk_upsert RPC...\n');
  
  let allOk = true;
  
  for (const reason of validReasons) {
    const payload = [{
      session_id: session.id,
      player_id: player.id,
      player_full_name_backup: `${player.nombre} ${player.apellidos}`,
      player_dorsal_backup: player.dorsal,
      attendance_status: 'No asiste',
      absence_reason: reason,
      recorded_by: 'Test Bloque 3'
    }];

    const { data, error } = await supabase.rpc('exec_secure_bulk_upsert', {
      target_table: 'training_attendance',
      payloads: payload,
      conflict_columns: ['session_id', 'player_id'],
      staff_passkey: passkey
    });

    if (error) {
      console.log(`❌ "${reason}": ${error.message}`);
      allOk = false;
    } else {
      console.log(`✅ "${reason}": OK (RPC resultado: ${data})`);
    }
  }

  // Reset to Asiste
  await supabase.rpc('exec_secure_bulk_upsert', {
    target_table: 'training_attendance',
    payloads: [{
      session_id: session.id,
      player_id: player.id,
      player_full_name_backup: `${player.nombre} ${player.apellidos}`,
      player_dorsal_backup: player.dorsal,
      attendance_status: 'Asiste',
      absence_reason: null,
      recorded_by: 'Cuerpo Técnico'
    }],
    conflict_columns: ['session_id', 'player_id'],
    staff_passkey: passkey
  });

  console.log('\n--- Resultado ---');
  if (allOk) {
    console.log('✅ TODOS los 11 motivos de ausencia funcionan correctamente via RPC.');
    console.log('✅ El constraint de la BD ya contempla todos los motivos necesarios.');
  } else {
    console.log('⚠️  Hay motivos que requieren actualizar el constraint en Supabase.');
  }
  console.log('\n(Registro de test reseteado a "Asiste")');
}

run().catch(console.error);
