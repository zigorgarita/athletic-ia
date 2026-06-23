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

async function runTests() {
  console.log('=== STARTING AUTOMATED TESTS FOR TRAINING & ATTENDANCE ===\n');

  let testPlayer = null;
  let testSession = null;

  try {
    // 1. Verify tables
    console.log('1. Verifying tables existence...');
    const { data: attCols, error: attColsErr } = await supabase.from('training_attendance').select('*').limit(0);
    if (attColsErr) throw new Error('training_attendance table error: ' + attColsErr.message);
    console.log('✅ Tablas training_attendance exists.');

    const { data: evalCols, error: evalColsErr } = await supabase.from('training_evaluations').select('*').limit(0);
    if (evalColsErr) throw new Error('training_evaluations table error: ' + evalColsErr.message);
    console.log('✅ Tablas training_evaluations exists.');

    // 2. Create a temporary player and planning session for isolation
    console.log('\n2. Creating temporary testing player...');
    const { data: pData, error: pErr } = await supabase
      .from('players')
      .insert({
        nombre: 'TestAttendance',
        apellidos: 'Player',
        dorsal: 99,
        demarcacion: 'Delantero',
        pierna_dominante: 'Diestro',
        fecha_nacimiento: '2009-01-01',
        estado: 'Disponible',
        equipo: 'DH'
      })
      .select()
      .single();
    
    if (pErr) throw pErr;
    testPlayer = pData;
    console.log(`✅ Temporary player created: ${testPlayer.nombre} ${testPlayer.apellidos} (ID: ${testPlayer.id})`);

    console.log('Creating temporary planning session...');
    const { data: sData, error: sErr } = await supabase
      .from('planning_sessions')
      .insert({
        fecha: '2026-06-25',
        hora_inicio: '10:00',
        hora_fin: '11:30',
        duracion_total: 90,
        campo_instalacion: 'Test Pitch',
        tipo_sesion: 'Adquisición',
        objetivo_principal: 'Organización ofensiva',
        carga: 'Media'
      })
      .select()
      .single();

    if (sErr) throw sErr;
    testSession = sData;
    console.log(`✅ Temporary planning session created: ${testSession.fecha} (ID: ${testSession.id})`);

    // 3. Verify relationships
    console.log('\n3. Verifying relationship constraints...');
    // Try inserting attendance with invalid player ID to test foreign key constraints
    const { error: invalidFkErr } = await supabase
      .from('training_attendance')
      .insert({
        session_id: testSession.id,
        player_id: '00000000-0000-0000-0000-000000000000',
        attendance_status: 'Asiste'
      });
    if (invalidFkErr) {
      console.log('✅ Foreign key constraint blocks invalid player ID as expected.');
    } else {
      throw new Error('Foreign key constraint failed to block invalid player ID.');
    }

    // 4. Verify UPSERT of attendance
    console.log('\n4. Verifying UPSERT of training attendance...');
    // First insert
    const { data: att1, error: att1Err } = await supabase
      .from('training_attendance')
      .upsert({
        session_id: testSession.id,
        player_id: testPlayer.id,
        player_full_name_backup: `${testPlayer.nombre} ${testPlayer.apellidos}`,
        player_dorsal_backup: testPlayer.dorsal,
        attendance_status: 'Asiste',
        recorded_by: 'Test Runner'
      }, { onConflict: 'session_id,player_id' })
      .select();

    if (att1Err) throw att1Err;
    console.log('✅ Initial attendance insertion successful.');

    // Second upsert to update status
    const { data: att2, error: att2Err } = await supabase
      .from('training_attendance')
      .upsert({
        session_id: testSession.id,
        player_id: testPlayer.id,
        player_full_name_backup: `${testPlayer.nombre} ${testPlayer.apellidos}`,
        player_dorsal_backup: testPlayer.dorsal,
        attendance_status: 'No asiste',
        absence_reason: 'Estudios',
        recorded_by: 'Test Runner'
      }, { onConflict: 'session_id,player_id' })
      .select();

    if (att2Err) throw att2Err;
    console.log(`✅ Upsert attendance update successful. Status changed to: ${att2[0].attendance_status}`);

    // Check count (should be 1 row, not 2)
    const { data: attCount, error: countErr } = await supabase
      .from('training_attendance')
      .select('*')
      .eq('session_id', testSession.id)
      .eq('player_id', testPlayer.id);
    
    if (countErr) throw countErr;
    if (attCount.length === 1) {
      console.log('✅ No duplicates created. UPSERT constraint (session_id, player_id) working.');
    } else {
      throw new Error(`Duplicates found! Count is: ${attCount.length}`);
    }

    // 5. Verify evaluations nullable at start
    console.log('\n5. Verifying valuations can be empty/null initially...');
    const { data: evalNull, error: evalNullErr } = await supabase
      .from('training_evaluations')
      .upsert({
        session_id: testSession.id,
        player_id: testPlayer.id,
        player_full_name_backup: `${testPlayer.nombre} ${testPlayer.apellidos}`,
        player_dorsal_backup: testPlayer.dorsal,
        actitud: null,
        intensidad: null,
        comprension_tactica: null,
        ejecucion_tecnica: null,
        compromiso_defensivo: null,
        compromiso_ofensivo: null,
        valoracion_global: null,
        evaluated_by: 'Test Runner'
      }, { onConflict: 'session_id,player_id' })
      .select();

    if (evalNullErr) throw evalNullErr;
    console.log('✅ Null evaluation row inserted successfully.');

    // 6. Verify UPSERT of evaluation
    console.log('\n6. Verifying UPSERT of evaluations...');
    const { data: evalFull, error: evalFullErr } = await supabase
      .from('training_evaluations')
      .upsert({
        session_id: testSession.id,
        player_id: testPlayer.id,
        player_full_name_backup: `${testPlayer.nombre} ${testPlayer.apellidos}`,
        player_dorsal_backup: testPlayer.dorsal,
        actitud: 4,
        intensidad: 5,
        comprension_tactica: 4,
        ejecucion_tecnica: 3,
        compromiso_defensivo: 4,
        compromiso_ofensivo: 4,
        valoracion_global: 4.2,
        evaluated_by: 'Test Runner'
      }, { onConflict: 'session_id,player_id' })
      .select();

    if (evalFullErr) throw evalFullErr;
    console.log(`✅ Valuation updated successfully. Global Rating: ${evalFull[0].valoracion_global} ★`);

    // Check count for evaluations
    const { data: evalCount, error: evalCountErr } = await supabase
      .from('training_evaluations')
      .select('*')
      .eq('session_id', testSession.id)
      .eq('player_id', testPlayer.id);

    if (evalCountErr) throw evalCountErr;
    if (evalCount.length === 1) {
      console.log('✅ No duplicates created for evaluations. UPSERT constraint working.');
    } else {
      throw new Error(`Duplicates found in evaluations! Count is: ${evalCount.length}`);
    }

    // 7. Verify player history query
    console.log('\n7. Verifying player history retrieval...');
    const { data: history, error: historyErr } = await supabase
      .from('training_attendance')
      .select(`
        *,
        planning_sessions (
          id,
          fecha,
          tipo_sesion,
          objetivo_principal
        )
      `)
      .eq('player_id', testPlayer.id);
    
    if (historyErr) throw historyErr;
    console.log(`✅ History queried successfully. Records found: ${history.length}`);
    console.log(`   Session date: ${history[0].planning_sessions.fecha}, Type: ${history[0].planning_sessions.tipo_sesion}`);

    // 8. Verify name and dorsal preservation on player deletion
    console.log('\n8. Verifying history preservation when player is deleted...');
    const { error: delErr } = await supabase
      .from('players')
      .delete()
      .eq('id', testPlayer.id);
    
    if (delErr) throw delErr;
    console.log('✅ Test player deleted successfully.');

    // Fetch the attendance record again to ensure it remains
    const { data: preservedAtt, error: fetchPreservedErr } = await supabase
      .from('training_attendance')
      .select('*')
      .eq('session_id', testSession.id);
    
    if (fetchPreservedErr) throw fetchPreservedErr;
    if (preservedAtt.length > 0) {
      const record = preservedAtt[0];
      console.log(`✅ Attendance record preserved. player_id is: ${record.player_id} (expected null/deleted)`);
      console.log(`   Backup name: ${record.player_full_name_backup}`);
      console.log(`   Backup dorsal: ${record.player_dorsal_backup}`);
      if (record.player_full_name_backup === 'TestAttendance Player' && record.player_id === null) {
        console.log('🎉 SUCCESS: Attendance record safely preserved without player reference!');
      } else {
        throw new Error('Attendance record did not match backup requirements.');
      }
    } else {
      throw new Error('Attendance record was deleted when the player was deleted! ON DELETE cascade occurred instead of SET NULL.');
    }

    console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY ===\n');

  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:', err.message);
  } finally {
    // Clean up planning session
    if (testSession) {
      console.log('Cleaning up temporary planning session...');
      await supabase.from('planning_sessions').delete().eq('id', testSession.id);
    }
    // Clean up player in case delete failed
    if (testPlayer) {
      await supabase.from('players').delete().eq('id', testPlayer.id);
    }
    console.log('Clean up done.');
  }
}

runTests();
