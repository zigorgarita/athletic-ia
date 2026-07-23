/**
 * SCRIPT DE SINCRONIZACIÓN OFICIAL DE PARTIDOS DE LIGA 2026-27 (TAREA B)
 * 
 * Uso:
 *   - Modo simulación: node scripts/sync_official_matches_2026_27.js --dry-run
 *   - Modo ejecución real: node scripts/sync_official_matches_2026_27.js --apply
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (!process.env[key]) process.env[key] = value.trim();
      }
    });
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const coachPasskey = process.env.COACH_STAFF_PASSKEY;

if (!supabaseUrl || !supabaseKey || !coachPasskey) {
  throw new Error(
    'Faltan variables requeridas: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY o COACH_STAFF_PASSKEY.'
  );
}

const isApply = process.argv.includes('--apply');
const isDryRun = process.argv.includes('--dry-run') || !isApply;

const supabase = createClient(supabaseUrl, supabaseKey);

// Definición estricta de las 30 jornadas con los 30 UUIDs autorizados
const OFFICIAL_SCHEDULE = [
  { id: '0b77432e-aa46-446a-bc03-14924d37e662', jornada: 1,  fecha: '2026-09-06', rival: 'Real Sociedad de Fútbol', es_local: false },
  { id: '527f4e02-6c17-4500-bd85-4aa72264f41a', jornada: 2,  fecha: '2026-09-13', rival: 'Santutxu F.C.',           es_local: true },
  { id: 'c8a513f3-0829-4c20-8a92-32a6c8b0f64d', jornada: 3,  fecha: '2026-09-20', rival: 'SD Leioa',                es_local: true },
  { id: 'a04dd36b-44d0-4fe6-9d95-d1bfdcdd09d5', jornada: 4,  fecha: '2026-10-04', rival: 'Deportivo Alavés',        es_local: false },
  { id: '8683c454-05fb-43a3-9dbf-4a47dcdc5efa', jornada: 5,  fecha: '2026-10-11', rival: 'Arratia, C.D.',           es_local: false },
  { id: 'd5c53692-a044-4a3c-b3f4-8b553afaaa78', jornada: 6,  fecha: '2026-10-18', rival: 'Cultural Leonesa S.A.D.', es_local: true },
  { id: '179bc2b4-3cc3-4ab9-8cc3-c291c33b81c0', jornada: 7,  fecha: '2026-10-25', rival: 'Danok Bat Club',          es_local: false },
  { id: '979c0a27-4566-4af6-ab50-423a977aae9e', jornada: 8,  fecha: '2026-11-01', rival: 'Unionistas de Salamanca C.F.', es_local: true },
  { id: '87eb0159-659c-4543-9dac-d4472354ce76', jornada: 9,  fecha: '2026-11-08', rival: 'Real Valladolid C.F.',    es_local: true },
  { id: '72978247-53b1-4678-abd4-88ab754793e9', jornada: 10, fecha: '2026-11-22', rival: 'SD Eibar',                es_local: false },
  { id: '8e18ac6c-70ca-41c2-94cb-b98c7305b283', jornada: 11, fecha: '2026-11-29', rival: 'Unión Deportiva Logroñés', es_local: true },
  { id: '6330759c-9e69-4637-9722-88f111a8439b', jornada: 12, fecha: '2026-12-06', rival: 'Antiguoko Kirol Elkartea', es_local: false },
  { id: '4ed948d4-e63f-40e8-8466-53ba9ea696b2', jornada: 13, fecha: '2026-12-13', rival: 'Athletic Club',           es_local: false },
  { id: '911f86af-ebbb-4621-8718-d52f4bf7bf6f', jornada: 14, fecha: '2026-12-16', rival: 'CD Betoño',               es_local: true },
  { id: 'da39e5ee-e056-4e89-935d-44473e34d06b', jornada: 15, fecha: '2026-12-20', rival: 'EF Mareo',                es_local: true },
  { id: '2cbe6d8a-bfd8-4304-a76b-833678443d42', jornada: 16, fecha: '2027-01-10', rival: 'Real Sociedad de Fútbol', es_local: true },
  { id: '0c0556b0-f8c3-42a5-b168-a489c9b82ad2', jornada: 17, fecha: '2027-01-24', rival: 'Santutxu F.C.',           es_local: false },
  { id: '70559ec3-a6c3-4160-9b9d-2073a13c62d1', jornada: 18, fecha: '2027-01-31', rival: 'SD Leioa',                es_local: false },
  { id: 'ed7c4d70-77ce-4676-8f90-573536741f84', jornada: 19, fecha: '2027-02-07', rival: 'Deportivo Alavés',        es_local: true },
  { id: '40405e94-6bf5-49db-aa6d-9be568deee99', jornada: 20, fecha: '2027-02-14', rival: 'Arratia, C.D.',           es_local: true },
  { id: '0b245a5e-cb14-4bbf-9324-0c57c5cedc3a', jornada: 21, fecha: '2027-02-21', rival: 'Cultural Leonesa S.A.D.', es_local: false },
  { id: 'bb38457b-d244-410f-9d10-e23bb6818625', jornada: 22, fecha: '2027-02-28', rival: 'Danok Bat Club',          es_local: true },
  { id: '7dc5acef-c4c3-4b50-bc53-8bc5bd2b157a', jornada: 23, fecha: '2027-03-07', rival: 'Unionistas de Salamanca C.F.', es_local: false },
  { id: '1f0ef345-0167-42ea-a059-a5b3d794dc7e', jornada: 24, fecha: '2027-03-14', rival: 'Real Valladolid C.F.',    es_local: false },
  { id: 'da642a93-983e-4c30-9d41-3c37cb1ec34a', jornada: 25, fecha: '2027-03-21', rival: 'SD Eibar',                es_local: true },
  { id: 'eeef58b0-9086-4db1-a7c2-81c65fcb8a3a', jornada: 26, fecha: '2027-04-04', rival: 'Unión Deportiva Logroñés', es_local: false },
  { id: '19e2b21b-ec01-44ab-927f-869e41fecbad', jornada: 27, fecha: '2027-04-11', rival: 'Antiguoko Kirol Elkartea', es_local: true },
  { id: 'bb3e2f09-7d6b-4181-816f-7c669e798a1e', jornada: 28, fecha: '2027-04-18', rival: 'Athletic Club',           es_local: true },
  { id: 'a09e585c-bc94-4341-8de0-f1390ca2e54c', jornada: 29, fecha: '2027-04-25', rival: 'CD Betoño',               es_local: false },
  { id: 'd0054e95-9e59-401c-bb31-455fe709280a', jornada: 30, fecha: '2027-05-02', rival: 'EF Mareo',                es_local: false }
];

async function syncOfficialMatches() {
  console.log(`================================================================`);
  console.log(`=== SINCRONIZACIÓN DE PARTIDOS OFICIALES LIGA 2026-27 (TAREA B) ===`);
  console.log(`================================================================`);
  if (isApply) {
    console.log(`⚠️ MODO EJECUCIÓN REAL (--apply)\n`);
  } else {
    console.log(`🔍 MODO SIMULACIÓN (--dry-run)\n`);
  }

  // 1. Consulta por los 30 UUIDs explícitos
  const targetIds = OFFICIAL_SCHEDULE.map(o => o.id);
  const { data: dbMatches, error } = await supabase
    .from('matches')
    .select('*')
    .in('id', targetIds);

  if (error) {
    console.error('❌ Error al consultar la tabla matches por UUIDs:', error);
    process.exit(1);
  }

  // 2. Validación de presencia exacta de los 30 registros
  if (!dbMatches || dbMatches.length !== 30) {
    console.error(`❌ Validación fallida: Se esperaban los 30 UUIDs autorizados, se encontraron ${dbMatches?.length || 0}. Abortando por seguridad.`);
    process.exit(1);
  }

  console.log(`✅ Validación 1/3: Se han localizado exactamente los 30 UUIDs autorizados en Supabase.`);

  const updatePayloads = [];

  for (const officialMatch of OFFICIAL_SCHEDULE) {
    const existing = dbMatches.find(m => m.id === officialMatch.id);

    if (!existing) {
      console.error(`❌ Validación 2/3 fallida: El UUID ${officialMatch.id} no existe en DB. Abortando.`);
      process.exit(1);
    }
    if (existing.jornada !== officialMatch.jornada) {
      console.error(`❌ Validación 2/3 fallida: La Jornada en DB (${existing.jornada}) no coincide con la esperada (${officialMatch.jornada}) para UUID ${officialMatch.id}. Abortando.`);
      process.exit(1);
    }
    if (existing.tipo_partido !== 'LIGA') {
      console.error(`❌ Validación 2/3 fallida: El partido con UUID ${officialMatch.id} no es de tipo LIGA. Abortando.`);
      process.exit(1);
    }

    updatePayloads.push({
      id: officialMatch.id, // Conservación estricta del ID
      jornada: officialMatch.jornada,
      fecha: officialMatch.fecha,
      rival: officialMatch.rival,
      es_local: officialMatch.es_local,
      tipo_partido: 'LIGA',
      competicion: 'Liga'
    });
  }

  console.log(`✅ Validación 2/3: Confirmada correspondencia 1-a-1 de los 30 UUIDs con tipo_partido = 'LIGA'.`);
  console.log(`✅ Validación 3/3: Lista de payloads atómicos verificada.`);

  console.log(`\n📋 RESUMEN DE CAMBIOS POR ID:`);
  let changesCount = 0;
  for (const p of updatePayloads) {
    const orig = dbMatches.find(m => m.id === p.id);
    const dateChanged = orig.fecha !== p.fecha;
    const localChanged = orig.es_local !== p.es_local;
    const rivalChanged = orig.rival !== p.rival;

    if (dateChanged || localChanged || rivalChanged) {
      changesCount++;
      console.log(`  🔄 J${String(p.jornada).padEnd(2)} [ID: ${p.id}]:`);
      if (dateChanged)  console.log(`     - Fecha: ${orig.fecha} -> ${p.fecha}`);
      if (localChanged) console.log(`     - Local: ${orig.es_local ? 'Local' : 'Visitante'} -> ${p.es_local ? 'Local' : 'Visitante'}`);
      if (rivalChanged) console.log(`     - Rival: "${orig.rival}" -> "${p.rival}"`);
    } else {
      console.log(`  ✅ J${String(p.jornada).padEnd(2)} [ID: ${p.id}]: Sin cambios.`);
    }
  }

  console.log(`\n📊 Total jornadas que recibirán actualización de datos: ${changesCount} de 30.`);

  if (isApply) {
    console.log(`\n🚀 Ejecutando actualización ATÓMICA de los 30 partidos mediante exec_secure_bulk_upsert...`);
    const { error: bulkErr } = await supabase.rpc('exec_secure_bulk_upsert', {
      target_table: 'matches',
      payloads: updatePayloads,
      conflict_columns: ['id'],
      staff_passkey: coachPasskey
    });

    if (bulkErr) {
      console.error(`❌ Error en la transacción atómica (Revertido por Supabase):`, bulkErr);
      process.exit(1);
    }

    console.log(`✅ Transacción atómica completada con éxito. Los 30 partidos han sido actualizados manteniendo sus IDs.`);
  } else {
    console.log(`\nℹ️ Modo --dry-run finalizado. Ningún cambio aplicado a Supabase.`);
  }
}

syncOfficialMatches();
