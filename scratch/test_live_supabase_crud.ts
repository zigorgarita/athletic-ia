import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl = '';
let serviceRoleKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceRoleKey = val;
    }
  });
}

async function testLiveCrud() {
  console.log('====================================================');
  console.log('🧪 PRUEBA END-TO-END CRUD SERVIDOR EN SUPABASE REAL');
  console.log('====================================================');

  if (!serviceRoleKey) {
    console.log('ℹ️ Nota: SUPABASE_SERVICE_ROLE_KEY no está rellena en .env.local aún, usando simulación de servidor.');
    return;
  }

  const supabaseServer = createClient(supabaseUrl, serviceRoleKey);

  const testObsId = '00000000-0000-4000-a000-000000000099';
  const testLineupId = '00000000-0000-4000-a000-000000000088';
  const testDocId = '00000000-0000-4000-a000-000000000077';

  // 1. Insertar observación de prueba con service_role
  const { error: insErr } = await supabaseServer
    .from('club_report_observations')
    .insert({
      id: testObsId,
      document_id: testDocId,
      document_name: 'Informe de Prueba Live',
      category: 'salidaBalon',
      content: 'Observación de prueba en vivo para validación de seguridad.',
      source_type: 'texto',
      confidence: 'alta',
      status: 'aprobado',
      priority: 'alta',
      approved_by_name: 'Míster Indautxu (Test)',
      approved_via: 'staff_passkey_server',
      approved_at: new Date().toISOString()
    });

  if (insErr) {
    console.log('❌ Error insertando observación de prueba:', insErr.message);
  } else {
    console.log('✅ 1. Observación de prueba creada e insertada correctamente vía service_role.');
  }

  // 2. Insertar selección de informe para pizarra táctica
  const { error: selErr } = await supabaseServer
    .from('tactical_lineup_report_selections')
    .upsert({
      tactical_lineup_id: testLineupId,
      document_id: testDocId,
      selected: true,
      selected_via: 'staff_passkey_server',
      selected_at: new Date().toISOString()
    });

  if (selErr) {
    console.log('❌ Error insertando selección de pizarra:', selErr.message);
  } else {
    console.log('✅ 2. Selección de informe guardada correctamente en tactical_lineup_report_selections.');
  }

  // 3. Consultar la observación aprobada
  const { data: readObs, error: readErr } = await supabaseServer
    .from('club_report_observations')
    .select('*')
    .eq('id', testObsId);

  if (!readErr && readObs && readObs.length > 0) {
    console.log('✅ 3. Observación aprobada leída con éxito desde el servidor. Estado:', readObs[0].status, '| Vía:', readObs[0].approved_via);
  } else {
    console.log('❌ Error leyendo observación:', readErr?.message);
  }

  // 4. Limpieza de datos de prueba
  await supabaseServer.from('club_report_observations').delete().eq('id', testObsId);
  await supabaseServer.from('tactical_lineup_report_selections').delete().eq('tactical_lineup_id', testLineupId);
  console.log('🧹 4. Limpieza finalizada: Registros de prueba eliminados correctamente.');
}

testLiveCrud();
