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

async function rollback() {
  console.log("=== INICIANDO ROLLBACK DE NORMALIZACIÓN ===");
  const backupPath = path.join(__dirname, 'backup_sessions_before_normalization.json');
  
  if (!fs.existsSync(backupPath)) {
    console.error("❌ Archivo de respaldo no encontrado en " + backupPath);
    return;
  }

  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

  for (const record of backupData) {
    console.log(`- Restaurando tipo_sesion original de la sesión del ${record.fecha} (${record.tipo_sesion})`);
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
      console.error(`❌ Error al restaurar sesión del ${record.fecha}:`, error.message);
    } else {
      console.log(`  ✅ Restauración exitosa.`);
    }
  }
  console.log("=== ROLLBACK COMPLETADO ===");
}

rollback();
