const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log("=== SUPABASE DB STATE ===");
  
  // Query sessions for the week of June 22 to June 28, 2026
  const { data: sessions, error: sErr } = await supabase
    .from('planning_sessions')
    .select('*')
    .gte('fecha', '2026-06-22')
    .lte('fecha', '2026-06-28')
    .order('fecha', { ascending: true });

  if (sErr) {
    console.error("Error reading sessions:", sErr);
    return;
  }

  console.log(`Found ${sessions.length} sessions:`);
  for (const s of sessions) {
    console.log(`- [${s.fecha}] ID: ${s.id} | Tipo: ${s.tipo_sesion} | Carga: ${s.carga} | Objetivo: ${s.objetivo_principal}`);
    
    // Get tasks
    const { data: tasks, error: tErr } = await supabase
      .from('planning_tasks')
      .select('*')
      .eq('planning_session_id', s.id)
      .order('orden', { ascending: true });

    if (tErr) {
      console.error(`  Error reading tasks for ${s.id}:`, tErr);
    } else if (tasks && tasks.length > 0) {
      console.log("  Tareas:");
      tasks.forEach((t, idx) => {
        console.log(`    ${idx + 1}. [${t.tipo_tarea}] ${t.nombre_tarea} (${t.minutos} min)`);
      });
    }

    // Get summoned count
    const { data: players, error: pErr } = await supabase
      .from('planning_session_players')
      .select('*')
      .eq('session_id', s.id)
      .eq('convocado', true);

    if (pErr) {
      console.error(`  Error reading players for ${s.id}:`, pErr);
    } else if (players && players.length > 0) {
      console.log(`  Convocados: ${players.length} jugadores`);
    }
  }
}

main().catch(console.error);
