const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if(key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const updateData = {
  nombre_corto: "Antiguoko",
  ciudad: "San Sebastián", provincia: "Gipuzkoa", ano_fundacion: 1982,
  colores: "Celeste y Blanco", equipacion_local: "Camiseta celeste, pantalón blanco",
  campo_nombre: "Campo Municipal de Berio",
  escudo_url: "https://www.antiguoko.eus/wp-content/uploads/2021/07/logo_icon-1.png",
  imagen_fondo_url: "https://www.antiguoko.eus/wp-content/uploads/2016/09/berio-01.jpg",
  coordenadas_gps: "43.303352, -2.008453", tiempo_viaje: "1h 15 min"
};

async function run() {
  const { error } = await supabase
    .from('clubs')
    .update(updateData)
    .ilike('nombre', '%ANTIGUOKO%');
  
  if (error) {
    console.error('Error updating Antiguoko:', error);
  } else {
    console.log('Successfully updated ANTIGUOKO KE');
  }
}

run();
