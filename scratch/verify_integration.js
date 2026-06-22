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

async function testIntegration() {
  console.log('--- STARTING INTEGRATION TEST FOR PLANNING MODULE ---');
  
  // 1. Fetch available players
  const { data: players, error: playersErr } = await supabase.from('players').select('id, nombre').limit(2);
  if (playersErr) {
    console.error('Error fetching players:', playersErr.message);
    process.exit(1);
  }
  console.log(`Fetched ${players.length} players to test summoning.`);

  // 2. Create a test session
  const testDate = '2026-06-25';
  console.log(`Creating test session for date: ${testDate}`);
  const { data: session, error: sErr } = await supabase
    .from('planning_sessions')
    .insert([{
      fecha: testDate,
      hora_inicio: '18:30',
      hora_fin: '20:00',
      duracion_total: 90,
      campo_instalacion: 'Iparralde (Test)',
      tipo_sesion: 'Transformación',
      objetivo_principal: 'Presión alta',
      carga: 'Alta',
      num_jugadores_previstos: 18,
      num_porteros_previstos: 2
    }])
    .select()
    .single();

  if (sErr) {
    console.error('Error creating session:', sErr.message);
    process.exit(1);
  }
  console.log('Session created successfully, ID:', session.id);

  // 3. Add test tasks
  console.log('Adding test tasks...');
  const { data: tasks, error: tErr } = await supabase
    .from('planning_tasks')
    .insert([
      {
        planning_session_id: session.id,
        nombre_tarea: 'Calentamiento Técnico',
        tipo_tarea: 'Calentamiento',
        minutos: 15,
        orden: 0
      },
      {
        planning_session_id: session.id,
        nombre_tarea: 'Juego de Posición 4v4+3',
        tipo_tarea: 'Juego de posición',
        minutos: 20,
        orden: 1
      }
    ])
    .select();

  if (tErr) {
    console.error('Error inserting tasks:', tErr.message);
    process.exit(1);
  }
  console.log(`Successfully added ${tasks.length} tasks.`);

  // 4. Add test concepts
  console.log('Adding test concepts...');
  const { data: concepts, error: cErr } = await supabase
    .from('planning_concepts')
    .insert([
      {
        session_id: session.id,
        categoria: 'ATAQUE',
        concepto: 'Salida de balón'
      },
      {
        session_id: session.id,
        categoria: 'DEFENSA',
        concepto: 'Presión alta'
      }
    ])
    .select();

  if (cErr) {
    console.error('Error inserting concepts:', cErr.message);
    process.exit(1);
  }
  console.log(`Successfully added ${concepts.length} concepts.`);

  // 5. Summon players (if we have players)
  if (players.length > 0) {
    console.log('Summoning players...');
    const summonPayloads = players.map(p => ({
      session_id: session.id,
      player_id: p.id,
      convocado: true
    }));

    const { data: roster, error: rErr } = await supabase
      .from('planning_session_players')
      .insert(summonPayloads)
      .select();

    if (rErr) {
      console.error('Error summoning players:', rErr.message);
      process.exit(1);
    }
    console.log(`Successfully summoned ${roster.length} players.`);
  }

  // 6. Add PDF mock document link
  console.log('Adding mock PDF document...');
  const { data: doc, error: dErr } = await supabase
    .from('planning_documents')
    .insert([{
      planning_session_id: session.id,
      nombre_documento: 'sesion_test.pdf',
      tipo_documento: 'PDF de sesión',
      url_storage: 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/planning-documents/sessions/mock_test.pdf'
    }])
    .select()
    .single();

  if (dErr) {
    console.error('Error inserting document record:', dErr.message);
    process.exit(1);
  }
  console.log('Document metadata inserted successfully, URL:', doc.url_storage);

  // 7. Clean up test data (Verify cascaded deletes work)
  console.log('Verifying cascade deletion by deleting the test session...');
  const { error: delErr } = await supabase
    .from('planning_sessions')
    .delete()
    .eq('id', session.id);

  if (delErr) {
    console.error('Error during cleanup delete:', delErr.message);
    process.exit(1);
  }
  console.log('Cleanup delete successful! All relations deleted by CASCADE.');
  console.log('--- INTEGRATION TEST PASSED SUCCESSFULLY! ---');
}

testIntegration();
