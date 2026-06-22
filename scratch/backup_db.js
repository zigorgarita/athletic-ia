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

const TABLES = [
  'players',
  'detailed_evaluations',
  'observaciones',
  'matches',
  'match_player_stats',
  'gps_sessions',
  'gps_data',
  'abp_plays',
  'abp_player_roles',
  'tactical_lineups'
];

async function backup() {
  console.log('Starting backup of Supabase database...');
  const backupData = {};
  
  for (const table of TABLES) {
    console.log(`Backing up table: ${table}...`);
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error backing up table ${table}:`, error.message);
      backupData[table] = { error: error.message };
    } else {
      console.log(`Backed up ${data.length} rows from ${table}`);
      backupData[table] = data;
    }
  }

  const backupFilePath = path.join(__dirname, 'db_backup_20260619.json');
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf8');
  console.log(`Backup completed successfully! Saved to: ${backupFilePath}`);
}

backup();
