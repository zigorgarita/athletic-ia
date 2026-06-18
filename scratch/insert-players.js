const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local
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

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY faltantes.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const playersToInsert = [
  { nombre: 'Markel', apellidos: 'Arroyo', dorsal: 1, demarcacion: 'Portero', posicion_secundaria: null, fecha_nacimiento: '2009-01-01', pierna_dominante: 'Diestro', estado: 'Disponible' },
  { nombre: 'Aritz', apellidos: 'Del Pico', dorsal: 2, demarcacion: 'Portero', posicion_secundaria: null, fecha_nacimiento: '2009-01-01', pierna_dominante: 'Diestro', estado: 'Disponible' },
  { nombre: 'Victor', apellidos: 'Alonso', dorsal: 3, demarcacion: 'Portero', posicion_secundaria: null, fecha_nacimiento: '2009-01-01', pierna_dominante: 'Diestro', estado: 'Disponible' },
  { nombre: 'Unax', apellidos: 'Gil', dorsal: 4, demarcacion: 'Defensa', posicion_secundaria: 'Lateral Derecho', fecha_nacimiento: '2009-01-01', pierna_dominante: 'Diestro', estado: 'Disponible' },
  { nombre: 'Kevin', apellidos: 'Loizan', dorsal: 5, demarcacion: 'Defensa', posicion_secundaria: 'Lateral Derecho', fecha_nacimiento: '2009-01-01', pierna_dominante: 'Diestro', estado: 'Disponible' },
  { nombre: 'Joel', apellidos: 'Chacón', dorsal: 6, demarcacion: 'Defensa', posicion_secundaria: 'Defensa Central', fecha_nacimiento: '2009-01-01', pierna_dominante: 'Diestro', estado: 'Disponible' },
  { nombre: 'Iker', apellidos: 'Escubi', dorsal: 7, demarcacion: 'Defensa', posicion_secundaria: 'Defensa Central', fecha_nacimiento: '2009-01-01', pierna_dominante: 'Diestro', estado: 'Disponible' },
  { nombre: 'Enaitz', apellidos: 'Barreiro', dorsal: 8, demarcacion: 'Defensa', posicion_secundaria: 'Defensa Central', fecha_nacimiento: '2009-01-01', pierna_dominante: 'Diestro', estado: 'Disponible' }
];

async function insert() {
  console.log('Insertando jugadores de AI Studio...');
  for (const player of playersToInsert) {
    // Check if player already exists by dorsal
    const { data: existing, error: checkErr } = await supabase
      .from('players')
      .select('id, nombre')
      .eq('dorsal', player.dorsal)
      .maybeSingle();

    if (existing) {
      console.log(`El dorsal ${player.dorsal} (${existing.nombre}) ya existe. Saltando...`);
      continue;
    }

    const { data, error } = await supabase
      .from('players')
      .insert(player)
      .select();

    if (error) {
      console.error(`Error insertando dorsal ${player.dorsal}:`, error.message);
    } else {
      console.log(`Insertado con éxito: ${player.nombre} ${player.apellidos} (#${player.dorsal})`);
    }
  }
}

insert();
