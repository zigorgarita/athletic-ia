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
  console.log('Verifying Supabase Attendance Tables...');

  // 1. Check training_attendance
  const { data: att, error: attErr } = await supabase.from('training_attendance').select('*').limit(1);
  if (attErr) {
    console.log('❌ training_attendance table: NOT READY (Error:', attErr.message, ')');
  } else {
    console.log('✅ training_attendance table: READY');
  }

  // 2. Check training_evaluations
  const { data: evals, error: evalErr } = await supabase.from('training_evaluations').select('*').limit(1);
  if (evalErr) {
    console.log('❌ training_evaluations table: NOT READY (Error:', evalErr.message, ')');
  } else {
    console.log('✅ training_evaluations table: READY');
  }
}
run();
