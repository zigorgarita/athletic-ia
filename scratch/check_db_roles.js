const supabaseUrl = "https://jdkshextphguyyiwwtyt.supabase.co";
const supabaseKey = "sb_publishable_jAe-8URgFBKWfhp6bfkeNg_ToOiMaRn";

async function run() {
  const roleCardsRes = await fetch(`${supabaseUrl}/rest/v1/tactical_role_cards?select=*`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const roleCards = await roleCardsRes.json();
  
  console.log("=== ALL ROLE CARDS IN TABLE ===");
  roleCards.forEach(c => {
    console.log(`- Label: "${c.posicion_label}", matchup_id: ${c.matchup_id}, match_plan_id: ${c.match_plan_id}, Created At: ${c.created_at}`);
  });
}

run().catch(console.error);
