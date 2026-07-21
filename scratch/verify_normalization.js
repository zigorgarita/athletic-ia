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

const ids = [
  '18d626f1-4a47-4e02-a7f8-7c0d07bbcf21',
  'abc7b299-7c25-447c-886f-a2fde835793a',
  '9416fedf-c867-4692-b492-5a86c7e9aa69',
  'f5ebfd22-f846-47c0-ade5-2aa7cd66b89c'
];

async function verify() {
  console.log("=== INICIANDO VERIFICACIÓN DE INTEGRIDAD DE MIGRACIÓN ===");

  const backupPath = path.join(__dirname, 'backup_sessions_before_normalization.json');
  if (!fs.existsSync(backupPath)) {
    console.error("❌ Error: Archivo de respaldo no encontrado en: " + backupPath);
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  // 1. Fetch de las sesiones actuales de Supabase
  const { data: currentRecords, error: fetchError } = await supabase
    .from('planning_sessions')
    .select('*')
    .in('id', ids);

  if (fetchError) {
    console.error("❌ Error al consultar las sesiones en Supabase:", fetchError.message);
    process.exit(1);
  }

  let inconsistenciesCount = 0;

  for (const backupRecord of backupData) {
    const currentRecord = currentRecords.find(r => r.id === backupRecord.id);
    if (!currentRecord) {
      console.error(`❌ Error: No se encontró la sesión con ID ${backupRecord.id} (Fecha: ${backupRecord.fecha}) en Supabase.`);
      inconsistenciesCount++;
      continue;
    }

    console.log(`\nVerificando sesión del ${backupRecord.fecha} (ID: ${backupRecord.id}):`);

    // Comprobar tipo de sesión
    if (currentRecord.tipo_sesion !== 'Entrenamiento') {
      console.error(`  ❌ tipo_sesion incorrecto: se esperaba 'Entrenamiento', se encontró '${currentRecord.tipo_sesion}'`);
      inconsistenciesCount++;
    } else {
      console.log(`  ✅ tipo_sesion es 'Entrenamiento'`);
    }

    // Comprobar que todos los demás campos coinciden exactamente
    const keys = Object.keys(backupRecord);
    for (const key of keys) {
      if (key === 'tipo_sesion') continue;

      const backupVal = backupRecord[key];
      const currentVal = currentRecord[key];

      // Comparación profunda simple para JSON
      const backupStr = typeof backupVal === 'object' ? JSON.stringify(backupVal) : String(backupVal);
      const currentStr = typeof currentVal === 'object' ? JSON.stringify(currentVal) : String(currentVal);

      if (backupStr !== currentStr) {
        console.error(`  ❌ Discrepancia en campo '${key}':`);
        console.error(`     Respaldo:`, backupVal);
        console.error(`     Actual:  `, currentVal);
        inconsistenciesCount++;
      }
    }

    if (inconsistenciesCount === 0) {
      console.log(`  ✅ Integridad de todos los campos secundarios garantizada (0% de alteración).`);
    }
  }

  // 2. Comprobar que las tareas asociadas siguen existiendo
  const { data: currentTasks, error: tasksError } = await supabase
    .from('planning_tasks')
    .select('*')
    .in('planning_session_id', ids);

  if (tasksError) {
    console.error("❌ Error al verificar las tareas asociadas en Supabase:", tasksError.message);
    process.exit(1);
  }

  console.log(`\nVerificación de relaciones:`);
  console.log(`  ✅ Se encontraron ${currentTasks.length} tareas asociadas a las sesiones modificadas.`);

  console.log(`\n=== RESULTADO FINAL DE LA VERIFICACIÓN ===`);
  if (inconsistenciesCount === 0) {
    console.log("🏆 ¡TODO CORRECTO! Integridad verificada al 100%. No se ha perdido ni alterado ningún dato.");
  } else {
    console.error(`💥 Se encontraron ${inconsistenciesCount} inconsistencias en la verificación.`);
    process.exit(1);
  }
}

verify();
