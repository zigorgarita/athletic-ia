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
  console.log('Checking absence_reason constraint in training_attendance...');

  // Try to insert with each valid absence reason to check which ones work
  const validReasons = ['Lesión', 'Enfermedad', 'Estudios', 'Trabajo', 'Viaje', 'Decisión técnica', 'Motivo personal', 'Sin justificar', 'Otro'];
  
  // Check existing records
  const { data: samples, error: samplesErr } = await supabase
    .from('training_attendance')
    .select('absence_reason')
    .not('absence_reason', 'is', null)
    .limit(10);

  if (samplesErr) {
    console.error('Error querying attendance:', samplesErr.message);
  } else {
    console.log('Sample absence reasons in DB:', samples);
  }

  // Check row count
  const { count, error: countErr } = await supabase
    .from('training_attendance')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total attendance records: ${count}`);

  // Check columns
  const { data: cols, error: colsErr } = await supabase
    .from('training_attendance')
    .select('*')
    .limit(1);
  
  if (cols && cols.length > 0) {
    console.log('Column names:', Object.keys(cols[0]));
  } else {
    console.log('Table is empty (no records yet)');
  }
}
run();
