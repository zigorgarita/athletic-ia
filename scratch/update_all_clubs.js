const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if(key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const updates = {
  'DEPORTIVO ALAVES': { ano_fundacion: 1921, web: 'https://www.deportivoalaves.com', campo_nombre: 'Ciudad Deportiva José Luis Compañón (Ibaia)', escudo_url: 'https://upload.wikimedia.org/wikipedia/en/f/f8/Deportivo_Alaves_logo.svg' },
  'DANOK BAT': { ano_fundacion: 1932, web: 'https://www.danokbat.eus', campo_nombre: 'Mallona', escudo_url: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Danok_Bat_Club_logo.svg' },
  'SD LEIOA': { ano_fundacion: 1925, web: 'https://sdleioa.com', campo_nombre: 'Instalaciones de Sarriena', escudo_url: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Escudo_SD_Leioa.png' },
  'UD LOGROÑES': { ano_fundacion: 2009, web: 'https://udlogrones.com', campo_nombre: 'Ciudad Deportiva UD Logroñés', escudo_url: 'https://upload.wikimedia.org/wikipedia/en/b/b2/UD_Logro%C3%B1%C3%A9s_logo.svg' },
  'SD EIBAR': { ano_fundacion: 1940, web: 'https://www.sdeibar.com', campo_nombre: 'Complejo Deportivo de Unbe', escudo_url: 'https://upload.wikimedia.org/wikipedia/en/3/3b/SD_Eibar_logo_2016.svg' },
  'ARRATIA': { ano_fundacion: 1923, web: 'https://arratiaclub.eus', campo_nombre: 'Urbieta' },
  'BETOÑO': { ano_fundacion: 1989, web: 'https://cdbetono.com', campo_nombre: 'Instalaciones de Betoño' },
  'SANTUTXU FC': { ano_fundacion: 1918, web: 'https://www.santutxufc.com', campo_nombre: 'Mallona' },
  'REAL VALLADOLID': { ano_fundacion: 1928, web: 'https://www.realvalladolid.es', campo_nombre: 'Anexos al Estadio José Zorrilla', escudo_url: 'https://upload.wikimedia.org/wikipedia/en/9/9a/Real_Valladolid_Logo.svg' },
  'EF MAREO': { ano_fundacion: 1978, web: 'https://www.realsporting.com', campo_nombre: 'Escuela de Fútbol de Mareo', escudo_url: 'https://upload.wikimedia.org/wikipedia/en/e/e0/Real_Sporting_de_Gij%C3%B3n_logo.svg' },
  'CULTURAL LEONESA': { ano_fundacion: 1923, web: 'https://cydleonesa.com', campo_nombre: 'Área Deportiva de Puente Castro', escudo_url: 'https://upload.wikimedia.org/wikipedia/en/7/7b/Cultural_Leonesa_logo.svg' },
  'UNIONISTAS SALAMANCA': { ano_fundacion: 2013, web: 'https://unionistascf.com', campo_nombre: 'Anexos Reina Sofía', escudo_url: 'https://upload.wikimedia.org/wikipedia/en/0/07/Unionistas_de_Salamanca_CF_logo.svg' }
};

async function run() {
  const passkey = env.NEXT_PUBLIC_COACH_PASSKEY ? env.NEXT_PUBLIC_COACH_PASSKEY.replace(/['"]+/g, '') : 'indautxu2026';
  
  const { data: clubs } = await supabase.from('clubs').select('*');
  if (!clubs) { console.log('No clubs found'); return; }
  
  for (const club of clubs) {
    const updateData = updates[club.nombre];
    if (updateData) {
      console.log(`Updating ${club.nombre}...`);
      const { error } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'clubs',
        payload: {
          ...club,
          ...updateData
        },
        conflict_columns: '{id}',
        staff_passkey: passkey
      });
      if (error) {
        console.error(`Error updating ${club.nombre}:`, error);
      } else {
        console.log(`${club.nombre} updated!`);
      }
    }
  }
  console.log('Bulk update finished!');
}
run();
