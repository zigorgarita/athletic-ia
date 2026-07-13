const supabaseUrl = "https://jdkshextphguyyiwwtyt.supabase.co";
const supabaseKey = "sb_publishable_jAe-8URgFBKWfhp6bfkeNg_ToOiMaRn";

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/knowledge_entries?creado_por=eq.Asistente%20IA&select=*`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const entries = await res.json();
  console.log(`Found ${entries.length} entries created by Asistente IA:`);
  entries.forEach(e => {
    console.log(`- Title: "${e.titulo}" | Category: "${e.categoria}" | Created At: ${e.created_at}`);
  });
}

run().catch(console.error);
