const supabaseUrl = "https://jdkshextphguyyiwwtyt.supabase.co";
const supabaseKey = "sb_publishable_jAe-8URgFBKWfhp6bfkeNg_ToOiMaRn";

async function run() {
  const roleCardsRes = await fetch(`${supabaseUrl}/rest/v1/tactical_role_cards?created_at=gte.2026-07-12T00:00:00Z&select=*`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const roleCards = await roleCardsRes.json();
  
  console.log(`Found ${roleCards.length} role cards created today (2026-07-12):`);
  roleCards.forEach(c => {
    console.log(`- ID: ${c.id}`);
    console.log(`  matchup_id: ${c.matchup_id}`);
    console.log(`  match_plan_id: ${c.match_plan_id}`);
    console.log(`  posicion_label: "${c.posicion_label}"`);
    console.log(`  fase_ofensiva: "${c.fase_ofensiva}"`);
  });
}

run().catch(console.error);
