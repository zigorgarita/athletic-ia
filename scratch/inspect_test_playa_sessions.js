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

async function run() {
  console.log("Consultando sesiones con tipo 'Test' o 'Playa'...");
  const { data, error } = await supabase
    .from('planning_sessions')
    .select('*')
    .in('tipo_sesion', ['Test', 'Playa']);

  if (error) {
    console.error("Error al consultar:", error);
    return;
  }

  console.log("Registros encontrados:", JSON.stringify(data, null, 2));
}

run();
