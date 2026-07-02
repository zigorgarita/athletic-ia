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
  console.log('=== Verifying Tactical V3 Schema in Supabase ===\n');

  // 1. Check tactical_systems
  const { data: systems, error: sysErr } = await supabase.from('tactical_systems').select('id, nombre, coordenadas_base');
  if (sysErr) {
    console.log('❌ tactical_systems error:', sysErr.message);
  } else {
    console.log(`✅ tactical_systems: READY (${systems.length} systems found)`);
    systems.forEach(s => {
      console.log(`   - ${s.nombre}: ${s.coordenadas_base.length} nodes configured`);
    });
  }

  // 2. Check tactical_matchups
  const { data: matchups, error: matchErr } = await supabase.from('tactical_matchups').select('id');
  if (matchErr) {
    console.log('❌ tactical_matchups error:', matchErr.message);
  } else {
    console.log(`✅ tactical_matchups: READY (${matchups.length} base matchups found)`);
  }

  // 3. Check tactical_match_plans
  const { data: plans, error: planErr } = await supabase.from('tactical_match_plans').select('id').limit(1);
  if (planErr) {
    console.log('❌ tactical_match_plans error:', planErr.message);
  } else {
    console.log('✅ tactical_match_plans: READY');
  }
}

run().catch(console.error);
