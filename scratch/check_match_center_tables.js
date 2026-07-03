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

async function check() {
  const tables = [
    'match_abp_plays',
    'match_abp_player_roles',
    'match_full_videos',
    'match_video_clips',
    'match_strategic_actions',
    'match_custom_videos',
    'match_documents'
  ];

  console.log('--- Verifying new tables ---');
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`❌ Table "${table}" error:`, error.message);
    } else {
      console.log(`✅ Table "${table}" verified (empty or has data).`);
    }
  }

  console.log('\n--- Verifying matches columns ---');
  const { data, error } = await supabase.from('matches').select('id, hora, campo, clasificacion_nota, analisis_resumen').limit(1);
  if (error) {
    console.error('❌ Columns in "matches" error:', error.message);
  } else {
    console.log('✅ Columns in "matches" verified successfully.');
  }
}

check();
