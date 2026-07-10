const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if(key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const clubsToUpdate = [
  { nombre: 'ANTIGUOKO KE', domain: 'antiguoko.eus' },
  { nombre: 'ARRATIA', domain: 'arratiaclub.eus' },
  { nombre: 'BETOÑO', domain: 'cdbetono.com' },
  { nombre: 'DANOK BAT', domain: 'danokbat.eus' },
  { nombre: 'DEPORTIVO ALAVES', domain: 'deportivoalaves.com' },
  { nombre: 'EF MAREO', domain: 'realsporting.com' },
  { nombre: 'CULTURAL LEONESA', domain: 'cydleonesa.com' },
  { nombre: 'SD LEIOA', domain: 'sdleioa.com' },
  { nombre: 'SANTUTXU FC', domain: 'santutxufc.com' },
  { nombre: 'UNIONISTAS SALAMANCA', domain: 'unionistascf.com' }
];

async function run() {
  const passkey = env.NEXT_PUBLIC_COACH_PASSKEY ? env.NEXT_PUBLIC_COACH_PASSKEY.replace(/['"]+/g, '') : 'indautxu2026';
  const { data: clubs } = await supabase.from('clubs').select('*');
  
  for (const info of clubsToUpdate) {
    const club = clubs.find(c => c.nombre === info.nombre);
    if (club) {
      const url = `https://www.google.com/s2/favicons?domain=${info.domain}&sz=128`;
      console.log(`Updating ${club.nombre} -> ${url}`);
      await supabase.rpc('exec_secure_upsert', {
        target_table: 'clubs',
        payload: { ...club, escudo_url: url },
        conflict_columns: '{id}',
        staff_passkey: passkey
      });
    }
  }
  console.log('All missing logos updated to favicons!');
}
run();
