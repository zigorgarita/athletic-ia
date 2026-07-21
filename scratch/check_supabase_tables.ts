import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseAnonKey = '';
let serviceRoleKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = val;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceRoleKey = val;
    }
  });
}

const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  console.log('====================================================');
  console.log('🔍 VERIFICACIÓN DE SEGURIDAD Y MIGRACIÓN EN SUPABASE');
  console.log('====================================================');
  console.log('URL de Supabase:', supabaseUrl);

  // 1. Probar que el acceso directo por Anon Key está BLOQUEADO (Seguridad Privada)
  const { error: anonObsErr } = await anonClient
    .from('club_report_observations')
    .select('id')
    .limit(1);

  if (anonObsErr) {
    console.log('🔒 [OK - PRIVADO] Anon REST API bloqueado correctamente en club_report_observations:', anonObsErr.message);
  } else {
    console.log('⚠️ [ADVERTENCIA] club_report_observations aún permite lectura directa por anon.');
  }

  const { error: anonSelErr } = await anonClient
    .from('tactical_lineup_report_selections')
    .select('id')
    .limit(1);

  if (anonSelErr) {
    console.log('🔒 [OK - PRIVADO] Anon REST API bloqueado correctamente en tactical_lineup_report_selections:', anonSelErr.message);
  } else {
    console.log('⚠️ [ADVERTENCIA] tactical_lineup_report_selections aún permite lectura directa por anon.');
  }

  // 2. Si existe service_role_key en servidor, verificar que las tablas existen físicamente
  if (serviceRoleKey) {
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: sObs, error: sObsErr } = await serviceClient.from('club_report_observations').select('id').limit(1);
    const { data: sSel, error: sSelErr } = await serviceClient.from('tactical_lineup_report_selections').select('id').limit(1);

    if (!sObsErr) console.log('✅ [OK - MIGRADO] La tabla club_report_observations existe y es accesible por el servidor.');
    else console.log('❌ La tabla club_report_observations aún no ha sido creada en Supabase:', sObsErr.message);

    if (!sSelErr) console.log('✅ [OK - MIGRADO] La tabla tactical_lineup_report_selections existe y es accesible por el servidor.');
    else console.log('❌ La tabla tactical_lineup_report_selections aún no ha sido creada en Supabase:', sSelErr.message);
  }
}

checkTables();
