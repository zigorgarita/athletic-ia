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
  
  const { data: club } = await supabase.from('clubs').select('*').eq('id', 'f14fbbca-81f4-4ee3-b818-e1e41827454b').single();
  
  const payload = { ...club, zona_grabacion: 'mala iluminacion' };
  const { data, error } = await supabase.rpc('exec_secure_upsert', {
    target_table: 'clubs',
    payload: payload,
    conflict_columns: '{id}',
    staff_passkey: passkey
  });
  console.log('Update:', error);
  const { data: c } = await supabase.from('clubs').select('zona_grabacion').eq('id', 'f14fbbca-81f4-4ee3-b818-e1e41827454b').single();
  console.log('Result:', c);
}
run();
