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
  const { count: detCount, error: detErr } = await supabase.from('detailed_evaluations').select('*', { count: 'exact', head: true });
  const { count: evalCount, error: evalErr } = await supabase.from('evaluations').select('*', { count: 'exact', head: true });
  console.log('detailed_evaluations count:', detCount, 'error:', detErr);
  console.log('evaluations count:', evalCount, 'error:', evalErr);
}
run();
