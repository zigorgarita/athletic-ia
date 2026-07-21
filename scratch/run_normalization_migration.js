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
const PASSKEY = 'indautxu2026';

const SESSIONS_TO_NORMALIZE = [
  { id: '18d626f1-4a47-4e02-a7f8-7c0d07bbcf21', fecha: '2026-07-28', original_tipo: 'Test' },
  { id: 'abc7b299-7c25-447c-886f-a2fde835793a', fecha: '2026-07-30', original_tipo: 'Playa' },
  { id: '9416fedf-c867-4692-b492-5a86c7e9aa69', fecha: '2026-07-31', original_tipo: 'Playa' },
  { id: 'f5ebfd22-f846-47c0-ade5-2aa7cd66b89c', fecha: '2026-08-01', original_tipo: 'Playa' }
];

async function run() {
  console.log("=== INICIANDO PROCESO DE MIGRACIÓN Y RESPALDO ===");

  // 1. Obtener datos actuales de Supabase para respaldo completo
  const ids = SESSIONS_TO_NORMALIZE.map(s => s.id);
  const { data: currentRecords, error: fetchError } = await supabase
    .from('planning_sessions')
    .select('*')
    .in('id', ids);

  if (fetchError) {
    console.error("❌ Error al obtener los registros para el backup:", fetchError.message);
    process.exit(1);
  }

  if (!currentRecords || currentRecords.length !== 4) {
    console.warn(`⚠️ Se esperaban 4 registros pero se obtuvieron ${currentRecords?.length || 0}. Prosiguiendo con respaldo de los que existan.`);
  }

  // Guardar copia de seguridad en JSON
  const backupPath = path.join(__dirname, 'backup_sessions_before_normalization.json');
  fs.writeFileSync(backupPath, JSON.stringify(currentRecords, null, 2), 'utf8');
  console.log(`✅ Respaldo completo guardado con éxito en: ${backupPath}`);

  // 2. Ejecutar la migración de forma secuencial y selectiva
  console.log("\nNormalizando columna tipo_sesion a 'Entrenamiento'...");
  for (const session of SESSIONS_TO_NORMALIZE) {
    console.log(`- Modificando sesión del ${session.fecha} (${session.original_tipo} -> Entrenamiento)`);
    const { data: upsertResult, error: upsertError } = await supabase.rpc('exec_secure_upsert', {
      target_table: 'planning_sessions',
      payload: {
        id: session.id,
        fecha: session.fecha,
        tipo_sesion: 'Entrenamiento'
      },
      conflict_columns: ['id'],
      staff_passkey: PASSKEY
    });

    if (upsertError) {
      console.error(`❌ Error al actualizar sesión del ${session.fecha}:`, upsertError.message);
      process.exit(1);
    }
    console.log(`  ✅ Éxito.`);
  }

  // 3. Crear script de Rollback dinámico
  const rollbackScriptContent = `const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const PASSKEY = 'indautxu2026';

async function rollback() {
  console.log("=== INICIANDO ROLLBACK DE NORMALIZACIÓN ===");
  const backupPath = path.join(__dirname, 'backup_sessions_before_normalization.json');
  
  if (!fs.existsSync(backupPath)) {
    console.error("❌ Archivo de respaldo no encontrado en " + backupPath);
    return;
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  for (const record of backupData) {
    console.log(\`- Restaurando tipo_sesion original de la sesión del \${record.fecha} (\${record.tipo_sesion})\`);
    const { error } = await supabase.rpc('exec_secure_upsert', {
      target_table: 'planning_sessions',
      payload: {
        id: record.id,
        fecha: record.fecha,
        tipo_sesion: record.tipo_sesion
      },
      conflict_columns: ['id'],
      staff_passkey: PASSKEY
    });

    if (error) {
      console.error(\`❌ Error al restaurar sesión del \${record.fecha}:\`, error.message);
    } else {
      console.log(\`  ✅ Restauración exitosa.\`);
    }
  }
  console.log("=== ROLLBACK COMPLETADO ===");
}

rollback();
`;

  const rollbackPath = path.join(__dirname, 'rollback_normalization.js');
  fs.writeFileSync(rollbackPath, rollbackScriptContent, 'utf8');
  console.log(`\n✅ Script de rollback generado en: ${rollbackPath}`);
  console.log("=== MIGRACIÓN COMPLETADA CON ÉXITO ===");
}

run();
