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

async function main() {
  const { data, error } = await supabase.from('players').select('nombre, apellidos, dorsal').order('dorsal', { ascending: true });
  if (error) {
    console.error(error);
  } else {
    console.log('Listado de dorsales de los jugadores actuales:');
    data.forEach(p => {
      console.log(`Dorsal #${p.dorsal}: ${p.nombre} ${p.apellidos}`);
    });
  }
}
main();
