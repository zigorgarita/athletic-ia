const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jdkshextphguyyiwwtyt.supabase.co',
  'sb_publishable_jAe-8URgFBKWfhp6bfkeNg_ToOiMaRn'
);

async function run() {
  // Check Cultural Leonesa in clubs table
  const { data: clubs, error: clubsErr } = await supabase
    .from('clubs')
    .select('id, nombre, escudo_url')
    .ilike('nombre', '%cultural%');
  
  console.log('=== CLUBS TABLE ===');
  console.log(JSON.stringify(clubs, null, 2));
  if (clubsErr) console.error('clubs error:', clubsErr);

  // Check Cultural Leonesa in matches table
  const { data: matches, error: matchesErr } = await supabase
    .from('matches')
    .select('id, rival, fecha')
    .ilike('rival', '%cultural%');
  
  console.log('\n=== MATCHES TABLE ===');
  console.log(JSON.stringify(matches, null, 2));
  if (matchesErr) console.error('matches error:', matchesErr);

  // Check ALL clubs with escudo_url
  const { data: allClubs } = await supabase
    .from('clubs')
    .select('nombre, escudo_url')
    .not('escudo_url', 'is', null)
    .limit(30);
  
  console.log('\n=== ALL CLUBS WITH ESCUDO ===');
  console.log(JSON.stringify(allClubs, null, 2));
}

run().catch(console.error);
