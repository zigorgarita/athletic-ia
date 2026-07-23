/**
 * SCRIPT DE GENERACIÓN DE ENTRENAMIENTOS POR DEFECTO 2026-27 (TAREA A)
 * 
 * Uso:
 *   - Modo simulación: node scripts/create_default_trainings_2026_27.js --dry-run
 *   - Modo ejecución real: node scripts/create_default_trainings_2026_27.js --apply
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

const TARGET_TEAM_ID = '27e65c59-e2d8-4846-bd42-e68562e4d3c2';
const TARGET_SEASON_ID = 'fe38630b-9c9a-4624-aed8-cb813c93e6df';

// Periodo oficial: Lunes 07/09/2026 a Viernes 30/04/2027
const START_DATE = new Date('2026-09-07T00:00:00Z');
const END_DATE   = new Date('2027-04-30T00:00:00Z');

// Configuración de horarios por día de la semana (1: Lunes, 2: Martes, 4: Jueves, 5: Viernes)
const SCHEDULE_CONFIG = {
  1: { hora_inicio: '17:00', hora_fin: '18:30' },
  2: { hora_inicio: '16:00', hora_fin: '17:30' },
  4: { hora_inicio: '16:00', hora_fin: '17:30' },
  5: { hora_inicio: '16:00', hora_fin: '17:30' }
};

function formatDate(dateObj) {
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function generateTrainings() {
  console.log(`================================================================`);
  console.log(`=== SCRIPT DE ENTRENAMIENTOS POR DEFECTO 2026-27 (TAREA A) ===`);
  console.log(`================================================================`);
  if (isApply) {
    console.log(`⚠️ MODO EJECUCIÓN REAL (--apply)\n`);
  } else {
    console.log(`🔍 MODO SIMULACIÓN (--dry-run)\n`);
  }

  // 1. Calcular todas las fechas posibles de L, M, J, V en el rango
  const expectedDates = [];
  const curr = new Date(START_DATE);

  while (curr <= END_DATE) {
    const dayOfWeek = curr.getUTCDay();
    if (SCHEDULE_CONFIG[dayOfWeek]) {
      expectedDates.push({
        fecha: formatDate(curr),
        dayOfWeek,
        config: SCHEDULE_CONFIG[dayOfWeek]
      });
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  console.log(`📊 Número total de fechas previstas (L, M, J, V): ${expectedDates.length}`);

  // 2. Consultar sesiones existentes en DB para team_id + season_id en ese rango
  const { data: existingSessions, error } = await supabase
    .from('planning_sessions')
    .select('id, fecha, team_id, season_id, tipo_sesion')
    .eq('team_id', TARGET_TEAM_ID)
    .eq('season_id', TARGET_SEASON_ID)
    .gte('fecha', formatDate(START_DATE))
    .lte('fecha', formatDate(END_DATE));

  if (error) {
    console.error('❌ Error consultando planning_sessions en Supabase:', error);
    process.exit(1);
  }

  const existingDatesSet = new Set(existingSessions?.map(s => s.fecha) || []);
  const datesCountMap = {};
  (existingSessions || []).forEach(s => {
    datesCountMap[s.fecha] = (datesCountMap[s.fecha] || 0) + 1;
  });

  const duplicateExisting = Object.keys(datesCountMap).filter(f => datesCountMap[f] > 1);
  if (duplicateExisting.length > 0) {
    console.error(`❌ Validación fallida: Se han detectado fechas con múltiples sesiones en DB:`, duplicateExisting);
    process.exit(1);
  }

  const toCreate = [];
  const skipped = [];

  for (const item of expectedDates) {
    if (existingDatesSet.has(item.fecha)) {
      const dbRow = existingSessions.find(s => s.fecha === item.fecha);
      skipped.push({ fecha: item.fecha, tipo_existente: dbRow?.tipo_sesion || 'Existente' });
    } else {
      toCreate.push({
        fecha: item.fecha,
        hora_inicio: item.config.hora_inicio,
        hora_fin: item.config.hora_fin,
        duracion_total: 90,
        campo_instalacion: 'Iparralde',
        tipo_sesion: 'Entrenamiento',
        objetivo_principal: 'Entrenamiento habitual',
        carga: 'Media',
        estado: 'Planificada',
        team_id: TARGET_TEAM_ID,
        season_id: TARGET_SEASON_ID,
        categoria_filtro: 'Liga',
        checklist_material: {
          balones: 15, conos: 10, chinos: 20, picas: 0, vallas: 0,
          estacas: 0, porterias_moviles: 0, escaleras_coordinacion: 0,
          petos: [], gps: false, cronometro: false, tablet: false,
          altavoz: false, agua: true, botiquin: true
        }
      });
    }
  }

  console.log(`\n📋 RESUMEN DE DIAGNÓSTICO:`);
  console.log(`- Fechas totales analizadas:         ${expectedDates.length}`);
  console.log(`- Fechas omitidas (ya tienen sesión): ${skipped.length}`);
  console.log(`- Fechas a CREAR automáticamente:    ${toCreate.length}`);
  console.log(`- Duplicados detectados o previstos: 0`);

  if (isApply) {
    if (toCreate.length === 0) {
      console.log(`\n✅ No hay sesiones nuevas que crear. La base de datos ya está al día.`);
      return;
    }

    console.log(`\n🚀 Insertando ${toCreate.length} entrenamientos en Supabase vía RPC exec_secure_bulk_upsert...`);
    const { data: result, error: insertErr } = await supabase.rpc('exec_secure_bulk_upsert', {
      target_table: 'planning_sessions',
      payloads: toCreate,
      conflict_columns: null, // INSERT simple sin alterar filas existentes
      staff_passkey: coachPasskey
    });

    if (insertErr) {
      console.error(`❌ Error en inserción atómica de entrenamientos:`, insertErr);
      process.exit(1);
    }

    console.log(`✅ ¡Inserción completada con éxito! Se han creado ${toCreate.length} entrenamientos.`);
  } else {
    console.log(`\nℹ️ Modo --dry-run finalizado. Ningún cambio aplicado a Supabase.`);
  }
}

generateTrainings();
