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

const tables = [
  'players', 'detailed_evaluations', 'observaciones', 'player_injuries',
  'training_attendance', 'training_evaluations', 'matches', 'match_player_stats',
  'gps_sessions', 'gps_data', 'abp_plays', 'abp_player_roles', 'tactical_lineups',
  'match_abp_plays', 'match_abp_player_roles', 'match_full_videos', 'match_video_clips',
  'match_strategic_actions', 'match_custom_videos', 'match_documents', 'planning_periods',
  'planning_sessions', 'planning_concepts', 'planning_tasks', 'planning_session_players',
  'planning_documents', 'planning_task_library', 'match_videos',
  'teams', 'seasons', 'user_profiles', 'ia_library', 'planning_session_versions', 'audit_logs'
];

async function checkRLS() {
  console.log('Checking RLS on tables...');
  for (const table of tables) {
    // Try a dummy insert
    const { data, error } = await supabase
      .from(table)
      .insert({ id: '00000000-0000-0000-0000-000000000000' });
    
    if (error) {
      if (error.message.includes('row-level security policy')) {
        console.log(`✅ [${table}] is SECURE (RLS is active and rejects direct insert). Error: ${error.message}`);
      } else if (error.message.includes('violates foreign key') || error.message.includes('violates unique') || error.message.includes('null value in column') || error.message.includes('duplicate key value')) {
        // This means it passed RLS checking and reached constraint checks, or RLS is active but permits it or RLS is disabled.
        // Wait, if RLS was disabled, it would pass RLS and hit database constraints.
        // If RLS was active but had "FOR INSERT WITH CHECK (true)", it would also hit constraints.
        console.log(`⚠️ [${table}] INSERT reached DB constraints (Error: ${error.message}). RLS might be disabled or has a wide-open policy!`);
      } else if (error.message.includes('does not exist')) {
        console.log(`❌ [${table}] DOES NOT EXIST in the database.`);
      } else {
        console.log(`❓ [${table}] Unknown result. Error: ${error.message}`);
      }
    } else {
      console.log(`🚨 [${table}] INSERT ALLOWED without error (Rls might be disabled or has open policy!). Data:`, data);
    }
  }
}

checkRLS();
