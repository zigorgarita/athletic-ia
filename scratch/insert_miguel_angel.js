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

const imagePath = 'C:\\Users\\zigor\\.gemini\\antigravity-ide\\brain\\79c724d1-c816-49c6-8849-46fdbf91a5e1\\media__1784574066425.png';
const passkey = 'indautxu2026';

async function main() {
  try {
    console.log('1. Leyendo imagen local...');
    if (!fs.existsSync(imagePath)) {
      throw new Error(`No se encuentra la imagen en la ruta: ${imagePath}`);
    }
    const fileBuffer = fs.readFileSync(imagePath);
    
    console.log('2. Subiendo foto al bucket player-photos...');
    const uniqueFilename = `miguel-angel-cardoso-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('player-photos')
      .upload(uniqueFilename, fileBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }
    console.log('   Foto subida con éxito:', uploadData.path);

    console.log('3. Obteniendo URL pública de la foto...');
    const { data: publicUrlData } = supabase.storage
      .from('player-photos')
      .getPublicUrl(uniqueFilename);

    const fotoUrl = publicUrlData.publicUrl;
    console.log('   URL pública:', fotoUrl);

    console.log('4. Registrando jugador en la tabla players con dorsal 31 vía RPC seguro...');
    const newPlayerPayload = {
      nombre: 'Miguel Ángel',
      apellidos: 'Cardoso',
      dorsal: 31,
      demarcacion: 'Delantero',
      posicion_secundaria: 'Mediapunta',
      fecha_nacimiento: '2010-04-16',
      pierna_dominante: 'Diestro',
      estado: 'Disponible',
      foto_url: fotoUrl,
      equipo: 'DH'
    };

    const { data: player, error: rpcError } = await supabase
      .rpc('exec_secure_upsert', {
        target_table: 'players',
        payload: newPlayerPayload,
        conflict_columns: null,
        staff_passkey: passkey
      });

    if (rpcError) {
      throw rpcError;
    }

    console.log('==================================================');
    console.log('¡JUGADOR REGISTRADO CON ÉXITO EN SUPABASE VÍA RPC!');
    console.log('ID:', player.id);
    console.log('Nombre:', player.nombre);
    console.log('Apellidos:', player.apellidos);
    console.log('Dorsal:', player.dorsal);
    console.log('Demarcación:', player.demarcacion);
    console.log('Posición Secundaria:', player.posicion_secundaria);
    console.log('Fecha Nacimiento:', player.fecha_nacimiento);
    console.log('Foto URL:', player.foto_url);
    console.log('Equipo:', player.equipo);
    console.log('==================================================');

  } catch (err) {
    console.error('Error durante el proceso:', err.message || err);
    process.exit(1);
  }
}

main();
