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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Execute via Supabase REST API pg_meta or direct RPC
// We'll test inserting with each of the 11 reasons to verify the constraint works
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testAbsenceReasons() {
  console.log('=== Test de Motivos de Ausencia en training_attendance ===\n');

  const validReasons = [
    'Lesión', 'Enfermedad', 'Estudios', 'Trabajo', 
    'Permiso', 'Selección', 'Viaje', 'Decisión técnica', 
    'Motivo personal', 'Sin justificar', 'Otro'
  ];

  // Get a session ID and player ID to test with
  const { data: session } = await supabase.from('planning_sessions').select('id').limit(1).single();
  const { data: player } = await supabase.from('players').select('id, nombre, apellidos, dorsal').limit(1).single();
  
  if (!session || !player) {
    console.error('❌ No hay sesiones o jugadores para el test.');
    return;
  }

  console.log(`Usando sesión: ${session.id}`);
  console.log(`Usando jugador: ${player.nombre} ${player.apellidos}\n`);

  let allOk = true;

  for (const reason of validReasons) {
    const { error } = await supabase
      .from('training_attendance')
      .upsert({
        session_id: session.id,
        player_id: player.id,
        player_full_name_backup: `${player.nombre} ${player.apellidos}`,
        player_dorsal_backup: player.dorsal,
        attendance_status: 'No asiste',
        absence_reason: reason,
        recorded_by: 'Test Script'
      }, {
        onConflict: 'session_id,player_id'
      });
    
    if (error) {
      console.log(`❌ "${reason}": ${error.message}`);
      allOk = false;
    } else {
      console.log(`✅ "${reason}": OK`);
    }
  }

  console.log('\n');
  if (allOk) {
    console.log('✅ TODOS los motivos de ausencia funcionan correctamente.');
  } else {
    console.log('⚠️  Algunos motivos tienen problemas con el constraint de la BD.');
    console.log('   Ejecutar scratch/update_absence_reason_constraint.sql en el SQL Editor de Supabase.');
  }

  // Cleanup: reset to 'Asiste'
  await supabase
    .from('training_attendance')
    .upsert({
      session_id: session.id,
      player_id: player.id,
      player_full_name_backup: `${player.nombre} ${player.apellidos}`,
      player_dorsal_backup: player.dorsal,
      attendance_status: 'Asiste',
      absence_reason: null,
      recorded_by: 'Cuerpo Técnico'
    }, {
      onConflict: 'session_id,player_id'
    });
  console.log('\n(Registro de test reseteado a "Asiste")');
}

testAbsenceReasons().catch(console.error);
