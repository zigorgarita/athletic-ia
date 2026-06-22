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

const UPDATES = [
  { matchName: 'Markel Arroyo', newNombre: 'Markel', newApellidos: 'Arroyo', birthdate: '2009-05-03', team: 'DH' },
  { matchName: 'Aritz Del Pico', newNombre: 'Aritz', newApellidos: 'del Pico', birthdate: '2008-05-16', team: 'DH' },
  { matchName: 'Unax Gil', newNombre: 'Unax', newApellidos: 'Gil', birthdate: '2008-04-13', team: 'DH' },
  { matchName: 'Kevin Loizan', newNombre: 'Kevin', newApellidos: 'Loaiza', birthdate: '2008-03-05', team: 'DH' },
  { matchName: 'Iker Escubi', newNombre: 'Iker', newApellidos: 'Eskubi', birthdate: '2008-03-15', team: 'DH' },
  { matchName: 'Enaitz Barreiro', newNombre: 'Erlantz', newApellidos: 'Barreiro', birthdate: '2010-05-04', team: 'DH' },
  { matchName: 'Juan Solaeta', newNombre: 'Juan', newApellidos: 'Solaeta', birthdate: '2008-03-16', team: 'DH' },
  { matchName: 'Jean Carlo', newNombre: 'Jean Carlo', newApellidos: 'González', birthdate: '2009-05-13', team: 'DH' },
  { matchName: 'Danel López', newNombre: 'Danel', newApellidos: 'López', birthdate: '2009-06-22', team: 'DH' },
  { matchName: 'David Castaños', newNombre: 'David', newApellidos: 'Castaños', birthdate: '2008-03-02', team: 'DH' },
  { matchName: 'Aingeru Teodoro', newNombre: 'Aingeru', newApellidos: 'Nietcho', birthdate: '2008-08-18', team: 'DH' },
  { matchName: 'Enaitz Cortés', newNombre: 'Enaitz', newApellidos: 'Cortes', birthdate: '2008-04-27', team: 'DH' },
  { matchName: 'Jon Sánchez', newNombre: 'Jon', newApellidos: 'Sánchez', birthdate: '2008-12-07', team: 'DH' },
  { matchName: 'Aratz Dionisio', newNombre: 'Aratz', newApellidos: 'Dionisio', birthdate: '2008-04-20', team: 'DH' },
  { matchName: 'Marcos Cruz', newNombre: 'Marcos', newApellidos: 'Cruz', birthdate: '2009-08-11', team: 'DH' }
];

const INSERTS = [
  { nombre: 'Ibón', apellidos: 'Robles', dorsal: 3, demarcacion: 'Defensa', fecha_nacimiento: '2008-09-28', equipo: 'DH', pierna_dominante: 'Diestro', estado: 'Disponible' },
  { nombre: 'Urko', apellidos: 'Chocarro', dorsal: 23, demarcacion: 'Defensa', fecha_nacimiento: '2008-10-15', equipo: 'DH', pierna_dominante: 'Diestro', estado: 'Disponible' },
  { nombre: 'Aritz', apellidos: 'Fonseca', dorsal: 24, demarcacion: 'Defensa', fecha_nacimiento: '2010-05-07', equipo: 'B', pierna_dominante: 'Diestro', estado: 'Disponible' },
  { nombre: 'Geovani', apellidos: 'Raigosa', dorsal: 25, demarcacion: 'Centrocampista', fecha_nacimiento: '2010-07-19', equipo: 'B', pierna_dominante: 'Diestro', estado: 'Disponible' },
  { nombre: 'Jon', apellidos: 'Bermejo', dorsal: 26, demarcacion: 'Centrocampista', fecha_nacimiento: '2010-07-08', equipo: 'B', pierna_dominante: 'Diestro', estado: 'Disponible' },
  { nombre: 'Diego', apellidos: 'Rubia', dorsal: 27, demarcacion: 'Delantero', fecha_nacimiento: '2010-09-24', equipo: 'B', pierna_dominante: 'Diestro', estado: 'Disponible' }
];

async function run() {
  console.log('1. Deleting Victor Alonso...');
  const { error: delError } = await supabase
    .from('players')
    .delete()
    .eq('nombre', 'Victor')
    .eq('apellidos', 'Alonso');
  
  if (delError) {
    console.error('Error deleting Victor Alonso:', delError.message);
  } else {
    console.log('Victor Alonso deleted successfully (or did not exist).');
  }

  console.log('\n2. Updating existing players with correct birthdate and team...');
  for (const update of UPDATES) {
    const [nombre, ...apellidosParts] = update.matchName.split(' ');
    const apellidos = apellidosParts.join(' ');

    // Try to find the player by matching first name and first few letters of apellidos
    let query = supabase.from('players').select('id, nombre, apellidos');
    if (apellidos) {
      query = query.eq('nombre', nombre).ilike('apellidos', `%${apellidos.substring(0, 4)}%`);
    } else {
      query = query.eq('nombre', nombre);
    }

    const { data: matched, error: matchError } = await query;
    if (matchError || !matched || matched.length === 0) {
      console.log(`Could not match player: ${update.matchName}`);
      continue;
    }

    const player = matched[0];
    const { error: updateError } = await supabase
      .from('players')
      .update({
        nombre: update.newNombre,
        apellidos: update.newApellidos,
        fecha_nacimiento: update.birthdate,
        equipo: update.team
      })
      .eq('id', player.id);

    if (updateError) {
      console.error(`Error updating player ${player.nombre} ${player.apellidos}:`, updateError.message);
    } else {
      console.log(`Updated player ${player.nombre} ${player.apellidos} -> ${update.newNombre} ${update.newApellidos} (DOB: ${update.birthdate}, Team: ${update.team})`);
    }
  }

  console.log('\n3. Inserting new players...');
  for (const ins of INSERTS) {
    // Check if dorsal is already occupied
    const { data: existing, error: checkErr } = await supabase
      .from('players')
      .select('id, nombre, apellidos')
      .eq('dorsal', ins.dorsal)
      .maybeSingle();

    if (existing) {
      console.log(`Dorsal #${ins.dorsal} already taken by ${existing.nombre} ${existing.apellidos}. Skipping insert for ${ins.nombre} ${ins.apellidos}.`);
      continue;
    }

    const { error: insErr } = await supabase
      .from('players')
      .insert([ins]);

    if (insErr) {
      console.error(`Error inserting ${ins.nombre} ${ins.apellidos}:`, insErr.message);
    } else {
      console.log(`Inserted new player: ${ins.nombre} ${ins.apellidos} (#${ins.dorsal}, Team: ${ins.equipo})`);
    }
  }

  console.log('\nData migration finished!');
}

run();
