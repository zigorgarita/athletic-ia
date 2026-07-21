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
  console.log('--- RIVALS ---');
  const { data: rivals, error: rivalsErr } = await supabase.from('rivals').select('id, nombre, escudo_url');
  if (rivalsErr) console.error('Rivals error:', rivalsErr);
  else console.log(JSON.stringify(rivals, null, 2));

  console.log('\n--- CLUBS ---');
  const { data: clubs, error: clubsErr } = await supabase.from('clubs').select('id, nombre, escudo_url');
  if (clubsErr) console.error('Clubs error:', clubsErr);
  else console.log(JSON.stringify(clubs, null, 2));

  console.log('\n--- MATCHES ---');
  const { data: matches, error: matchesErr } = await supabase.from('matches').select('id, rival, local, local_goles, visitante_goles, fecha').limit(5);
  if (matchesErr) console.error('Matches error:', matchesErr);
  else console.log(JSON.stringify(matches, null, 2));
}

run();
