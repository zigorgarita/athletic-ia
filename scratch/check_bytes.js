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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  // 1. Get from DB
  const { data, error } = await supabase
    .from('abp_plays')
    .select('tipo')
    .eq('titulo', 'ijiojoujuo')
    .single();

  if (error) {
    console.error(error);
    return;
  }

  const dbTipo = data.tipo;
  const hardcodedTipo = 'Saque inicial';

  console.log('DB Tipo:', dbTipo);
  console.log('DB Tipo Length:', dbTipo.length);
  console.log('DB Tipo Bytes:', Buffer.from(dbTipo).toString('hex'));

  console.log('Hardcoded Tipo:', hardcodedTipo);
  console.log('Hardcoded Tipo Length:', hardcodedTipo.length);
  console.log('Hardcoded Tipo Bytes:', Buffer.from(hardcodedTipo).toString('hex'));

  console.log('Equal?:', dbTipo === hardcodedTipo);
}

check();
