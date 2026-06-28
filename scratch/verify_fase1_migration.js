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

async function verify() {
  console.log("=== VERIFYING FASE 1 MIGRATION ===");
  
  const TABLES = [
    'teams',
    'seasons',
    'user_profiles',
    'ia_library',
    'planning_session_versions',
    'audit_logs'
  ];

  for (const table of TABLES) {
    console.log(`Checking table existence: ${table}...`);
    // Querying with limit 0 to verify table exists
    const { data, error } = await supabase.from(table).select('*').limit(0);
    if (error) {
      console.error(`❌ Table ${table} verification failed:`, error.message);
    } else {
      console.log(`✅ Table ${table} exists and is accessible.`);
    }
  }

  console.log("\nChecking altered planning_sessions columns...");
  const { data: cols, error: colError } = await supabase
    .from('planning_sessions')
    .select('id, team_id, season_id, valoracion_entrenador, valoracion_media_jugadores')
    .limit(1);

  if (colError) {
    console.error("❌ Failed to query new columns in planning_sessions:", colError.message);
  } else {
    console.log("✅ New columns (team_id, season_id, valoracion_entrenador, valoracion_media_jugadores) exist in planning_sessions.");
  }
}

verify();
