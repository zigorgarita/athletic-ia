const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Leer variables de .env.local
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

async function verify() {
  console.log("=== VERIFICANDO ESQUEMA DEL SUBBLOQUE 4D (CONOCIMIENTO TÁCTICO) ===");
  
  const TABLES = [
    'knowledge_entries',
    'knowledge_media',
    'knowledge_links',
    'knowledge_tags'
  ];

  for (const table of TABLES) {
    console.log(`Verificando tabla: ${table}...`);
    const { error } = await supabase.from(table).select('*').limit(0);
    if (error) {
      console.error(`❌ Falló la verificación de la tabla ${table}:`, error.message);
    } else {
      console.log(`✅ La tabla ${table} existe y es accesible.`);
    }
  }

  // Verificar bucket 'indautxu-assets' si es posible
  console.log("\nVerificando bucket 'indautxu-assets'...");
  const { data: files, error: fErr } = await supabase.storage.from('indautxu-assets').list('', { limit: 1 });
  if (fErr) {
    console.error("❌ El bucket 'indautxu-assets' no es accesible o no existe:", fErr.message);
  } else {
    console.log("✅ El bucket 'indautxu-assets' existe y es accesible.");
  }
}

verify();
