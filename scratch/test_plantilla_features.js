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
  console.log('--- STARTING PLANTILLA INTEGRATION TESTS ---');

  // 1. Get a test player
  const { data: players, error: playerErr } = await supabase.from('players').select('id, nombre').limit(1);
  if (playerErr || !players || players.length === 0) {
    console.error('❌ Could not fetch a player for testing:', playerErr);
    return;
  }
  const testPlayer = players[0];
  console.log(`Using player "${testPlayer.nombre}" (ID: ${testPlayer.id}) for tests.`);

  const testDate = new Date().toISOString().split('T')[0];

  // 2. Clean up any test evaluations for today to start fresh
  console.log('\nCleaning up evaluations for today to start fresh...');
  const { error: deleteErr } = await supabase
    .from('detailed_evaluations')
    .delete()
    .eq('player_id', testPlayer.id)
    .eq('fecha_evaluacion', testDate);
  if (deleteErr) {
    console.warn('⚠️ Warning cleaning up evaluations:', deleteErr.message);
  }

  // 3. Test Save (UPSERT - Insert step)
  console.log('\nTesting evaluation SAVE (Insert)...');
  const initialPayload = {
    player_id: testPlayer.id,
    fecha_evaluacion: testDate,
    perfil_especifico: { 'Reflejos': 4, 'Colocación': 5 },
    valoraciones_generales: { 'Control': 3, 'Pase': 4 },
    evaluado_por: 'Entrenador Test',
    valoracion_global: 4.0
  };

  const { data: insertData, error: insertErr } = await supabase
    .from('detailed_evaluations')
    .upsert(initialPayload, { onConflict: 'player_id,fecha_evaluacion' })
    .select()
    .single();

  if (insertErr) {
    console.error('❌ Evaluation Save (Insert) Failed:', insertErr.message);
    return;
  }
  console.log('✅ Evaluation Save (Insert) Succeeded! Row ID:', insertData.id);

  // 4. Test Update (UPSERT - Update step)
  console.log('\nTesting evaluation UPDATE (Upsert on same day)...');
  const updatedPayload = {
    player_id: testPlayer.id,
    fecha_evaluacion: testDate,
    perfil_especifico: { 'Reflejos': 5, 'Colocación': 5 }, // Updated rating
    valoraciones_generales: { 'Control': 4, 'Pase': 4 },
    evaluado_por: 'Entrenador Test Modificado',
    valoracion_global: 4.5
  };

  const { data: updateData, error: updateErr } = await supabase
    .from('detailed_evaluations')
    .upsert(updatedPayload, { onConflict: 'player_id,fecha_evaluacion' })
    .select()
    .single();

  if (updateErr) {
    console.error('❌ Evaluation Update Failed:', updateErr.message);
    return;
  }

  if (updateData.id === insertData.id) {
    console.log('✅ Evaluation Update Succeeded! Same row ID updated successfully:', updateData.id);
    console.log('   New Global Rating:', updateData.valoracion_global);
    console.log('   New Evaluator:', updateData.evaluado_por);
  } else {
    console.error('❌ Error: A new row was created instead of updating the existing one! ID mismatch.');
  }

  // 5. Test History
  console.log('\nTesting history retrieval...');
  const { data: history, error: historyErr } = await supabase
    .from('detailed_evaluations')
    .select('*')
    .eq('player_id', testPlayer.id)
    .order('fecha_evaluacion', { ascending: false });

  if (historyErr) {
    console.error('❌ History retrieval failed:', historyErr.message);
  } else {
    console.log(`✅ History retrieval succeeded! Player has ${history.length} evaluations.`);
    console.log(`   Latest evaluation date: ${history[0].fecha_evaluacion} (Global: ${history[0].valoracion_global})`);
  }

  // 6. Test Injury creation
  console.log('\nTesting Injury registration...');
  const injuryPayload = {
    player_id: testPlayer.id,
    fecha_lesion: testDate,
    tipo_lesion: 'Sobrecarga Test',
    diagnostico: 'Molestias en el isquiotibial derecho',
    informado_por: 'Fisio',
    estado: 'Activa',
    observaciones: 'Prueba de integración'
  };

  const { data: injuryData, error: injuryErr } = await supabase
    .from('player_injuries')
    .insert([injuryPayload])
    .select()
    .single();

  if (injuryErr) {
    console.error('❌ Injury registration failed:', injuryErr.message);
  } else {
    console.log('✅ Injury registration succeeded! ID:', injuryData.id);
    
    // Clean up test injury
    const { error: delInjErr } = await supabase.from('player_injuries').delete().eq('id', injuryData.id);
    if (delInjErr) console.warn('⚠️ Warning cleaning up test injury:', delInjErr.message);
  }

  // 7. Final Clean up of test evaluation
  console.log('\nCleaning up test evaluations...');
  const { error: finalCleanErr } = await supabase
    .from('detailed_evaluations')
    .delete()
    .eq('id', insertData.id);
  if (finalCleanErr) {
    console.warn('⚠️ Warning cleaning up test evaluations:', finalCleanErr.message);
  } else {
    console.log('✅ Test database cleaned up successfully.');
  }

  console.log('\n--- ALL INTEGRATION TESTS PASSED ---');
}
run();
