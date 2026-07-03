const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2].trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = val;
      }
    }
  }
} catch (err) {}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function cleanUp() {
  console.log("=== Cleaning up verification players ===");
  
  // Find test players
  const { data: players, error } = await supabase
    .from('players')
    .select('id, nombre, dorsal')
    .in('dorsal', [97, 98]);

  if (error) {
    console.error("Error fetching test players:", error.message);
    return;
  }

  console.log(`Found ${players.length} test players to delete.`);
  for (const player of players) {
    console.log(`Deleting player ${player.nombre} (Dorsal: ${player.dorsal})...`);
    const { data, error: delError } = await supabase.rpc('exec_secure_delete', {
      target_table: 'players',
      record_id: player.id,
      staff_passkey: 'indautxu2026'
    });
    if (delError) {
      console.error(`Failed to delete player ${player.nombre}:`, delError.message);
    } else {
      console.log(`Deleted player ${player.nombre} successfully.`);
    }
  }
}

cleanUp();
