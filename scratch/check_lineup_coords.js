const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://jdkshextphguyyiwwtyt.supabase.co';
const supabaseAnonKey = 'sb_publishable_jAe-8URgFBKWfhp6bfkeNg_ToOiMaRn';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  // Let's get the latest lineup nodes
  const { data: lineups, error } = await supabase
    .from('tactical_lineups')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching lineups:', error);
    return;
  }

  console.log('Latest Lineup:', JSON.stringify(lineups[0], null, 2));
}

run();
