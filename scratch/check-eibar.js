const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jdkshextphguyyiwwtyt.supabase.co';
const supabaseAnonKey = 'sb_publishable_jAe-8URgFBKWfhp6bfkeNg_ToOiMaRn';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkEibar() {
  console.log('Querying abp_plays for title containing "eibar"...');
  const { data: plays, error: playsError } = await supabase
    .from('abp_plays')
    .select('*')
    .ilike('titulo', '%eibar%');

  if (playsError) {
    console.error('Error fetching plays:', playsError);
    return;
  }

  console.log('Found plays count:', plays.length);
  for (const play of plays) {
    console.log(`- Play ID: ${play.id}, Title: "${play.titulo}", Type: "${play.tipo}", Created At: ${play.created_at}`);
    
    // Fetch associated player roles/positions
    const { data: roles, error: rolesError } = await supabase
      .from('abp_player_roles')
      .select('*')
      .eq('abp_play_id', play.id);

    if (rolesError) {
      console.error(`Error fetching roles for play ${play.id}:`, rolesError);
    } else {
      console.log(`  Associated Roles/Positions (${roles.length}):`);
      roles.forEach(r => {
        console.log(`    - Role: ${r.rol_asignado}, Position: (${r.posicion_x}, ${r.posicion_y}), Player ID: ${r.player_id}`);
      });
    }
  }
}

checkEibar();
