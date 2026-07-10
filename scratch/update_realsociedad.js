const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if(key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const passkey = env.NEXT_PUBLIC_COACH_PASSKEY ? env.NEXT_PUBLIC_COACH_PASSKEY.replace(/['"]+/g, '') : 'indautxu2026';
  const id = 'a823e75c-2246-4b19-9dd1-89ab199ebe38';
  
  const { data: existing, error: fetchErr } = await supabase.from('clubs').select('*').eq('id', id).single();
  
  const { data, error } = await supabase.rpc('exec_secure_upsert', {
    target_table: 'clubs',
    payload: {
      ...existing,
      id,
      nombre: 'REAL SOCIEDAD',
      nombre_corto: 'Real Sociedad',
      escudo_url: 'https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg',
      ano_fundacion: 1909,
      ciudad: 'San Sebastián',
      campo_nombre: 'Instalaciones de Zubieta',
      web: 'https://www.realsociedad.eus'
    },
    conflict_columns: '{id}',
    staff_passkey: passkey
  });
  console.log('Result:', data, error);
}
run();
