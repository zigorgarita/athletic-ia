const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if(key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const updates = {
  'DANOK BAT': { escudo_url: null },
  'SANTUTXU FC': { escudo_url: null },
  'SD LEIOA': { escudo_url: null }
};

async function run() {
  const passkey = env.NEXT_PUBLIC_COACH_PASSKEY ? env.NEXT_PUBLIC_COACH_PASSKEY.replace(/['"]+/g, '') : 'indautxu2026';
  
  const { data: clubs } = await supabase.from('clubs').select('*');
  
  for (const club of clubs) {
    const updateData = updates[club.nombre];
    if (updateData) {
      console.log(`Fixing logo for ${club.nombre}...`);
      await supabase.rpc('exec_secure_upsert', {
        target_table: 'clubs',
        payload: {
          ...club,
          ...updateData
        },
        conflict_columns: '{id}',
        staff_passkey: passkey
      });
    }
  }
  console.log('Finished fixing broken logos');
}
run();
