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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkABP() {
  const { data: plays, error: playsError } = await supabase
    .from('abp_plays')
    .select('*');
  
  if (playsError) {
    console.error('Error fetching plays:', playsError);
    return;
  }

  console.log(`Found ${plays.length} plays:`);
  for (const play of plays) {
    console.log(`- Play ID: ${play.id}, Title: ${play.titulo}, Type: ${play.tipo}, Desc: ${play.descripcion}`);
    const { data: roles, error: rolesError } = await supabase
      .from('abp_player_roles')
      .select('*')
      .eq('abp_play_id', play.id);
    if (rolesError) {
      console.error(`  Error fetching roles for play ${play.id}:`, rolesError);
    } else {
      console.log(`  Roles (${roles.length}):`);
      roles.forEach(r => {
        console.log(`    - Role ID: ${r.id}, Player ID: ${r.player_id}, Role: ${r.rol_asignado}, Label: ${r.etiqueta}, Comment: ${r.comentario}`);
      });
    }
  }

  // Also query players to see if any player has name "Puesto Vacío"
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*');
  if (playersError) {
    console.error('Error fetching players:', playersError);
  } else {
    console.log(`\nFound ${players.length} players. Checking for "Puesto Vacío":`);
    players.forEach(p => {
      if (p.nombre.toLowerCase().includes('puesto') || p.nombre.toLowerCase().includes('vac')) {
        console.log(`  - Match: ID: ${p.id}, Nombre: ${p.nombre}`);
      }
    });
  }
}

checkABP();
