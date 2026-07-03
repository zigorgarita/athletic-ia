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
  console.log('Verifying Supabase Schema Migration...');
  
  // 1. Check player_injuries table
  const { data: injuries, error: injErr } = await supabase.from('player_injuries').select('*').limit(1);
  if (injErr) {
    console.log('❌ player_injuries table: NOT READY (Error:', injErr.message, ')');
  } else {
    console.log('✅ player_injuries table: READY');
  }

  // 2. Check detailed_evaluations new columns
  const { data: evals, error: evalErr } = await supabase.from('detailed_evaluations').select('*').limit(1);
  if (evalErr) {
    console.log('❌ detailed_evaluations table: ERROR FETCHING (Error:', evalErr.message, ')');
  } else if (evals.length > 0) {
    const keys = Object.keys(evals[0]);
    const required = ['valoraciones_generales', 'perfil_especifico', 'evaluado_por', 'valoracion_global'];
    const missing = required.filter(k => !keys.includes(k));
    if (missing.length > 0) {
      console.log('❌ detailed_evaluations columns missing:', missing.join(', '));
    } else {
      console.log('✅ detailed_evaluations columns: READY');
    }
  } else {
    // If no rows, check if we can select them explicitly
    const { data: testCols, error: testErr } = await supabase.from('detailed_evaluations').select('valoraciones_generales, perfil_especifico, evaluado_por, valoracion_global').limit(1);
    if (testErr) {
      console.log('❌ detailed_evaluations new columns: NOT READY (Error:', testErr.message, ')');
    } else {
      console.log('✅ detailed_evaluations columns: READY');
    }
  }
}
run();
