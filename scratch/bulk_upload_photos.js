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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const PHOTOS_DIR = path.join(__dirname, '..', 'photos_to_upload');

function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, '') // remove punctuation
    .trim();
}

async function run() {
  console.log(`Checking if directory exists: ${PHOTOS_DIR}`);
  if (!fs.existsSync(PHOTOS_DIR)) {
    console.error(`Error: El directorio "${PHOTOS_DIR}" no existe. Crea esta carpeta y coloca las fotos dentro.`);
    return;
  }

  const files = fs.readdirSync(PHOTOS_DIR).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp'].includes(ext);
  });

  if (files.length === 0) {
    console.log('No se encontraron imágenes en la carpeta "photos_to_upload".');
    return;
  }

  console.log(`Se encontraron ${files.length} imágenes para procesar.`);

  console.log('Obteniendo lista de jugadores desde Supabase...');
  const { data: players, error: playersErr } = await supabase
    .from('players')
    .select('id, nombre, apellidos, dorsal');

  if (playersErr) {
    console.error('Error al obtener jugadores:', playersErr.message);
    return;
  }

  console.log(`Obtenidos ${players.length} jugadores.`);

  let matchedCount = 0;

  for (const file of files) {
    const filePath = path.join(PHOTOS_DIR, file);
    const ext = path.extname(file);
    const baseName = path.basename(file, ext);
    const normFile = normalizeText(baseName);

    console.log(`\nProcesando archivo: "${file}" (normalizado: "${normFile}")`);

    // Intentar asociar con un jugador
    let bestMatch = null;
    let bestScore = 0;

    for (const player of players) {
      const normNombre = normalizeText(player.nombre);
      const normApellidos = normalizeText(player.apellidos);
      const normFull = normalizeText(`${player.nombre} ${player.apellidos}`);

      // 1. Coincidencia exacta del nombre completo
      if (normFile === normFull) {
        bestMatch = player;
        bestScore = 100;
        break;
      }

      // 2. Coincidencia del nombre de pila si es único en el archivo
      if (normFile === normNombre) {
        // Verificar si hay más de un jugador con este primer nombre
        const sameFirstNames = players.filter(p => normalizeText(p.nombre) === normNombre);
        if (sameFirstNames.length === 1) {
          bestMatch = player;
          bestScore = 90;
        } else {
          console.log(`  Advertencia: Nombre de pila "${player.nombre}" no es único. Se requiere apellido en el archivo.`);
        }
      }

      // 3. Coincidencia parcial (el nombre del archivo contiene nombre y primer apellido)
      if (normFile.includes(normNombre) && normApellidos && normFile.includes(normApellidos.split(' ')[0])) {
        bestMatch = player;
        bestScore = 80;
      }
    }

    if (bestMatch && bestScore >= 80) {
      console.log(`  ¡Coincidencia encontrada! -> ${bestMatch.nombre} ${bestMatch.apellidos} (#${bestMatch.dorsal}) (Puntaje: ${bestScore})`);
      
      // Subir imagen a Supabase Storage
      const fileBuffer = fs.readFileSync(filePath);
      const storagePath = `photo_${bestMatch.id}${ext.toLowerCase()}`;
      
      console.log(`  Subiendo imagen al bucket 'player-photos' como '${storagePath}'...`);
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('player-photos')
        .upload(storagePath, fileBuffer, {
          contentType: `image/${ext.substring(1).replace('jpg', 'jpeg')}`,
          upsert: true
        });

      if (uploadErr) {
        console.error(`  Error al subir imagen:`, uploadErr.message);
        continue;
      }

      // Construir URL pública
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/player-photos/${storagePath}`;
      console.log(`  Imagen subida con éxito. URL: ${publicUrl}`);

      // Actualizar el jugador en la base de datos
      const { error: dbErr } = await supabase
        .from('players')
        .update({ foto_url: publicUrl })
        .eq('id', bestMatch.id);

      if (dbErr) {
        console.error(`  Error al actualizar foto_url del jugador en la DB:`, dbErr.message);
      } else {
        console.log(`  ¡Jugador actualizado en la DB con su nueva foto!`);
        matchedCount++;
      }
    } else {
      console.log(`  No se pudo encontrar coincidencia para: "${file}"`);
    }
  }

  console.log(`\nProceso completado. Se asociaron y subieron ${matchedCount} de ${files.length} fotos.`);
}

run();
