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
  
  // First, fetch the existing Athletic Club to not overwrite other fields with null
  const { data: existing, error: fetchErr } = await supabase.from('clubs').select('*').eq('id', 'f14fbbca-81f4-4ee3-b818-e1e41827454b').single();
  
  const { data, error } = await supabase.rpc('exec_secure_upsert', {
    target_table: 'clubs',
    payload: {
      ...existing,
      id: 'f14fbbca-81f4-4ee3-b818-e1e41827454b',
      nombre: 'ATHLETIC CLUB',
      nombre_corto: 'Athletic',
      escudo_url: 'https://upload.wikimedia.org/wikipedia/en/9/98/Club_Athletic_Bilbao_logo.svg',
      ano_fundacion: 1898,
      ciudad: 'Bilbao',
      campo_nombre: 'Instalaciones de Lezama',
      web: 'https://www.athletic-club.eus'
    },
    conflict_columns: '{id}',
    staff_passkey: passkey
  });
  console.log('Result:', data, error);
}
run();
