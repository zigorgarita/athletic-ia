const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if(key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const updates = {
  'ARRATIA': '/logos/arratia.svg',
  'SANTUTXU FC': '/logos/santutxu.svg',
  'UNIONISTAS SALAMANCA': '/logos/unionistas.svg'
};

async function run() {
  const passkey = env.NEXT_PUBLIC_COACH_PASSKEY ? env.NEXT_PUBLIC_COACH_PASSKEY.replace(/['"]+/g, '') : 'indautxu2026';
  const { data: clubs } = await supabase.from('clubs').select('*');
  
  for (const [nombre, url] of Object.entries(updates)) {
    const club = clubs.find(c => c.nombre === nombre);
    if (club) {
      console.log(`Updating ${nombre} to local SVG ${url}`);
      await supabase.rpc('exec_secure_upsert', {
        target_table: 'clubs',
        payload: { ...club, escudo_url: url },
        conflict_columns: '{id}',
        staff_passkey: passkey
      });
    }
  }
  console.log('Local logos set in DB!');
}
run();
