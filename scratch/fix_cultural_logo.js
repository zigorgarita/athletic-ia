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
  const passkey = env.NEXT_PUBLIC_COACH_PASSKEY 
    ? env.NEXT_PUBLIC_COACH_PASSKEY.replace(/['\"]+/g, '') 
    : 'indautxu2026';
  
  // Use local path for Cultural Leonesa logo (Wikipedia URLs return 403)
  const localLogoUrl = '/logos/cultural_leonesa.png';

  console.log('Fetching CULTURAL LEONESA from clubs table...');
  const { data: clubs, error } = await supabase
    .from('clubs')
    .select('*')
    .eq('nombre', 'CULTURAL LEONESA');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (!clubs || clubs.length === 0) {
    console.log('CULTURAL LEONESA not found in clubs table.');
    return;
  }

  const club = clubs[0];
  console.log('Found club:', club.nombre, 'current escudo_url:', club.escudo_url);

  const { error: updateError } = await supabase.rpc('exec_secure_upsert', {
    target_table: 'clubs',
    payload: { ...club, escudo_url: localLogoUrl },
    conflict_columns: '{id}',
    staff_passkey: passkey
  });

  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log('Updated clubs table successfully! New escudo_url:', localLogoUrl);
  }

  // Verify
  const { data: updated } = await supabase
    .from('clubs')
    .select('nombre, escudo_url')
    .eq('nombre', 'CULTURAL LEONESA');
  console.log('Verified:', JSON.stringify(updated, null, 2));
}

run().catch(console.error);
