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

async function run() {
  const playId = 'eb3bd98d-98ff-4152-ba0c-50e242982caf'; // MANO CABEZA (CORTO)
  const passkey = 'indautxu2026';

  console.log("Checking current roles for play MANO CABEZA (CORTO)...");
  const { data: roles, error: rolesError } = await supabase
    .from('abp_player_roles')
    .select('*')
    .eq('abp_play_id', playId);

  if (rolesError) {
    console.error("Error reading roles:", rolesError);
    return;
  }

  console.log(`Currently has ${roles.length} roles.`);

  if (roles.length === 9) {
    console.log("Inserting the 10th role (Cierre) to complete the 10-player field requirement...");
    const payload = {
      abp_play_id: playId,
      player_id: null,
      rol_asignado: 'Cierre',
      posicion_x: 50.0,
      posicion_y: 78.0,
      etiqueta: 'CIER',
      orden: 10,
      comentario: null
    };

    const { data: insertData, error: insertError } = await supabase.rpc('exec_secure_upsert', {
      target_table: 'abp_player_roles',
      payload: payload,
      conflict_columns: null,
      staff_passkey: passkey
    });

    if (insertError) {
      console.error("Error inserting role:", insertError);
    } else {
      console.log("Success! Cierre role added successfully:", insertData);
    }
  } else {
    console.log("No action needed. Already has 10 or more roles.");
  }
}

run();
