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
  const passkey = env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
  
  // Get a player
  const { data: players, error: pError } = await supabase.from('players').select('id, nombre').limit(1);
  if (pError || !players || players.length === 0) {
    console.error('Error fetching player or no players found:', pError);
    process.exit(1);
  }
  const playerId = players[0].id;
  console.log(`Using player: ${players[0].nombre} (${playerId})`);

  console.log('\n--- 1. TESTING MEETINGS FLOW ---');
  
  // A. Create meeting
  console.log('A. Creating meeting...');
  const initialMeetingPayload = {
    player_id: playerId,
    fecha: '2026-07-10',
    solicitada_por: 'Staff',
    motivo: 'Reunión de prueba inicial',
    desarrollo: 'Desarrollo de prueba',
    resolucion: 'Resolución de prueba',
    estado: 'Pendiente',
    participantes: ['Entrenador'],
    seguimiento_notas: 'Revisar pronto',
    recordatorio_fecha: '2026-07-15'
  };
  
  const { data: createdMeeting, error: cMError } = await supabase.rpc('exec_secure_upsert', {
    target_table: 'player_meetings',
    payload: initialMeetingPayload,
    conflict_columns: null,
    staff_passkey: passkey
  });
  
  if (cMError || !createdMeeting) {
    console.error('Failed to create meeting:', cMError);
    process.exit(1);
  }
  console.log('Meeting created successfully. ID:', createdMeeting.id);

  // B. Update meeting
  console.log('B. Editing meeting...');
  const meetingUpdates = {
    player_id: playerId,
    fecha: '2026-07-10',
    solicitada_por: 'Staff',
    motivo: 'Reunión de prueba modificada',
    desarrollo: 'Desarrollo de prueba modificado',
    resolucion: 'Resolución de prueba modificada',
    estado: 'En seguimiento',
    participantes: ['Entrenador'],
    seguimiento_notas: 'Revisar pronto modificado',
    recordatorio_fecha: '2026-07-15'
  };
  
  const { data: updatedMeeting, error: uMError } = await supabase.rpc('exec_secure_upsert', {
    target_table: 'player_meetings',
    payload: { ...meetingUpdates, id: createdMeeting.id },
    conflict_columns: ['id'],
    staff_passkey: passkey
  });
  
  if (uMError) {
    console.error('Failed to update meeting:', uMError);
    process.exit(1);
  }
  console.log('Meeting updated successfully.');

  // C. Verify meeting persistence
  console.log('C. Checking persistence...');
  const { data: fetchMeeting, error: fMError } = await supabase
    .from('player_meetings')
    .select('*')
    .eq('id', createdMeeting.id)
    .single();
    
  if (fMError || !fetchMeeting) {
    console.error('Failed to fetch meeting:', fMError);
    process.exit(1);
  }
  
  console.log('Persisted Motivo:', fetchMeeting.motivo);
  console.log('Persisted Estado:', fetchMeeting.estado);
  if (fetchMeeting.motivo === 'Reunión de prueba modificada' && fetchMeeting.estado === 'En seguimiento') {
    console.log('✔ Meeting changes verified successfully!');
  } else {
    console.error('✘ Meeting changes mismatch!');
    process.exit(1);
  }

  // D. Delete meeting
  console.log('D. Deleting meeting...');
  const { data: delMResult, error: delMError } = await supabase.rpc('exec_secure_delete', {
    target_table: 'player_meetings',
    record_id: createdMeeting.id,
    staff_passkey: passkey
  });
  
  if (delMError) {
    console.error('Failed to delete meeting:', delMError);
    process.exit(1);
  }
  console.log('✔ Meeting deleted successfully!');

  console.log('\n--- 2. TESTING INJURIES FLOW ---');

  // A. Create injury
  console.log('A. Creating injury...');
  const initialInjuryPayload = {
    player_id: playerId,
    fecha_lesion: '2026-07-10',
    tipo_lesion: 'Muscular',
    diagnostico: 'Esguince de tobillo inicial',
    informado_por: 'Fisio',
    estado: 'Activa',
    fecha_prevista_recuperacion: '2026-07-20',
    observaciones: 'Reposo absoluto'
  };
  
  const { data: createdInjury, error: cIError } = await supabase.rpc('exec_secure_upsert', {
    target_table: 'player_injuries',
    payload: initialInjuryPayload,
    conflict_columns: null,
    staff_passkey: passkey
  });
  
  if (cIError || !createdInjury) {
    console.error('Failed to create injury:', cIError);
    process.exit(1);
  }
  console.log('Injury created successfully. ID:', createdInjury.id);

  // B. Update injury
  console.log('B. Editing injury...');
  const injuryUpdates = {
    player_id: playerId,
    fecha_lesion: '2026-07-10',
    tipo_lesion: 'Articular',
    diagnostico: 'Esguince de tobillo modificado',
    informado_por: 'Fisio',
    estado: 'En recuperación',
    fecha_prevista_recuperacion: '2026-07-20',
    observaciones: 'Fisioterapia activa'
  };
  
  const { data: updatedInjury, error: uIError } = await supabase.rpc('exec_secure_upsert', {
    target_table: 'player_injuries',
    payload: { ...injuryUpdates, id: createdInjury.id },
    conflict_columns: ['id'],
    staff_passkey: passkey
  });
  
  if (uIError) {
    console.error('Failed to update injury:', uIError);
    process.exit(1);
  }
  console.log('Injury updated successfully.');

  // C. Verify injury persistence
  console.log('C. Checking persistence...');
  const { data: fetchInjury, error: fIError } = await supabase
    .from('player_injuries')
    .select('*')
    .eq('id', createdInjury.id)
    .single();
    
  if (fIError || !fetchInjury) {
    console.error('Failed to fetch injury:', fIError);
    process.exit(1);
  }
  
  console.log('Persisted Diagnóstico:', fetchInjury.diagnostico);
  console.log('Persisted Estado:', fetchInjury.estado);
  if (fetchInjury.diagnostico === 'Esguince de tobillo modificado' && fetchInjury.estado === 'En recuperación') {
    console.log('✔ Injury changes verified successfully!');
  } else {
    console.error('✘ Injury changes mismatch!');
    process.exit(1);
  }

  // D. Delete injury
  console.log('D. Deleting injury...');
  const { data: delIResult, error: delIError } = await supabase.rpc('exec_secure_delete', {
    target_table: 'player_injuries',
    record_id: createdInjury.id,
    staff_passkey: passkey
  });
  
  if (delIError) {
    console.error('Failed to delete injury:', delIError);
    process.exit(1);
  }
  console.log('✔ Injury deleted successfully!');
  
  console.log('\n--- ALL TEST PASSED SUCCESSFULLY ---');
}
run();
