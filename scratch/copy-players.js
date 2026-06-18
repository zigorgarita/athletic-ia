const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
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
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY faltantes.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function mapPosition(pos) {
  if (!pos) return 'Defensa';
  const p = pos.toLowerCase();
  if (p.includes('portero')) return 'Portero';
  if (p.includes('defensa') || p.includes('lateral') || p.includes('central') || p.includes('zaguero')) return 'Defensa';
  if (p.includes('centrocampista') || p.includes('pivote') || p.includes('medio') || p.includes('mediocampista') || p.includes('interior')) return 'Centrocampista';
  if (p.includes('delantero') || p.includes('extremo') || p.includes('punta') || p.includes('atacante') || p.includes('mediapunta')) return 'Delantero';
  return 'Defensa'; // fallback
}

function mapPierna(pierna) {
  if (!pierna) return 'Diestro';
  const p = pierna.toLowerCase();
  if (p.includes('zurdo') || p.includes('izquierda')) return 'Zurdo';
  if (p.includes('ambidiestro') || p.includes('ambas')) return 'Ambidiestro';
  return 'Diestro';
}

function mapEstado(estado) {
  if (!estado) return 'Disponible';
  const e = estado.toLowerCase();
  if (e.includes('lesion') || e.includes('lesionado')) return 'Lesionado';
  if (e.includes('duda')) return 'Duda';
  if (e.includes('sancion') || e.includes('sancionado')) return 'Sancionado';
  return 'Disponible';
}

async function copy() {
  console.log('Obteniendo jugadores de la tabla "jugadores"...');
  
  const { data: sourcePlayers, error: fetchErr } = await supabase
    .from('jugadores')
    .select('*');

  if (fetchErr) {
    console.error('Error al leer de jugadores:', fetchErr.message);
    return;
  }

  console.log(`Encontrados ${sourcePlayers.length} jugadores en la tabla original.`);

  let insertedCount = 0;

  for (const sp of sourcePlayers) {
    // Check if dorsal is already in players
    const { data: existing, error: checkErr } = await supabase
      .from('players')
      .select('id, nombre')
      .eq('dorsal', sp.dorsal)
      .maybeSingle();

    if (existing) {
      console.log(`El dorsal #${sp.dorsal} (${existing.nombre}) ya está en players. Saltando...`);
      continue;
    }

    const payload = {
      nombre: sp.nombre,
      apellidos: sp.apellidos || '',
      dorsal: sp.dorsal,
      demarcacion: mapPosition(sp.posicion),
      posicion_secundaria: sp.posicion_secundaría || sp.posicion || null,
      fecha_nacimiento: sp.fecha_nacimiento || '2009-01-01',
      altura: sp.altura ? parseFloat(sp.altura) : null,
      peso: sp.peso ? parseFloat(sp.peso) : null,
      pierna_dominante: mapPierna(sp.pierna),
      estado: mapEstado(sp.estado),
      rol_abp: sp.rol_abp || null,
      foto_url: sp.foto_url || null
    };

    const { data, error } = await supabase
      .from('players')
      .insert(payload)
      .select();

    if (error) {
      console.error(`Error al insertar ${sp.nombre} (#${sp.dorsal}):`, error.message);
    } else {
      console.log(`Sincronizado: ${sp.nombre} ${sp.apellidos || ''} (#${sp.dorsal})`);
      insertedCount++;
    }
  }

  console.log(`Sincronización terminada. ${insertedCount} jugadores insertados en "players".`);
}

copy();
