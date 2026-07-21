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
  const passkey = env.NEXT_PUBLIC_COACH_PASSKEY ? env.NEXT_PUBLIC_COACH_PASSKEY.replace(/['"]+/g, '') : 'indautxu2026';
  
  const logoUrl = 'https://upload.wikimedia.org/wikipedia/en/7/75/Cultural_Leonesa_logo.svg';

  console.log('Updating Cultural Leonesa in clubs table...');
  const { data: clubs } = await supabase.from('clubs').select('*').eq('nombre', 'CULTURAL LEONESA');
  if (clubs && clubs.length > 0) {
    const club = clubs[0];
    await supabase.rpc('exec_secure_upsert', {
      target_table: 'clubs',
      payload: { ...club, escudo_url: logoUrl },
      conflict_columns: '{id}',
      staff_passkey: passkey
    });
    console.log('Updated clubs table successfully!');
  } else {
    console.log('CULTURAL LEONESA not found in clubs table.');
  }

  console.log('Updating Cultural Leonesa in rivals table...');
  const { data: rivals } = await supabase.from('rivals').select('*').eq('nombre', 'CULTURAL LEONESA');
  if (rivals && rivals.length > 0) {
    const rival = rivals[0];
    await supabase.rpc('exec_secure_upsert', {
      target_table: 'rivals',
      payload: { ...rival, escudo_url: logoUrl },
      conflict_columns: '{id}',
      staff_passkey: passkey
    });
    console.log('Updated rivals table successfully!');
  } else {
    console.log('CULTURAL LEONESA not found in rivals table.');
  }
}

run();
