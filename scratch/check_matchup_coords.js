const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://jdkshextphguyyiwwtyt.supabase.co';
const supabaseAnonKey = 'sb_publishable_jAe-8URgFBKWfhp6bfkeNg_ToOiMaRn';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: matchups, error } = await supabase
    .from('tactical_matchups')
    .select('*, tactical_role_cards(*)')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Matchup:', JSON.stringify(matchups, null, 2));
}

run();
