const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if(key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const clubsData = {
  "ATHLETIC CLUB": {
    nombre_corto: "Athletic",
    ciudad: "Bilbao", provincia: "Bizkaia", ano_fundacion: 1898,
    colores: "Rojiblanco", equipacion_local: "Camiseta rojiblanca, pantalón negro",
    campo_nombre: "Instalaciones de Lezama",
    escudo_url: "https://upload.wikimedia.org/wikipedia/en/thumb/9/98/Club_Athletic_Bilbao_logo.svg/1200px-Club_Athletic_Bilbao_logo.svg.png",
    imagen_fondo_url: "https://www.athletic-club.eus/uploads/images/2021/01/21/lezama-01.jpg",
    coordenadas_gps: "43.266, -2.833", tiempo_viaje: "15 min"
  },
  "DANOK BAT": {
    nombre_corto: "Danok",
    ciudad: "Bilbao", provincia: "Bizkaia", ano_fundacion: 1972,
    colores: "Rojo y verde", equipacion_local: "Camiseta roja, pantalón verde",
    campo_nombre: "Mallona",
    escudo_url: "https://www.danokbat.eus/wp-content/uploads/2019/09/Logo-Danok-Bat.png",
    imagen_fondo_url: "https://cadenaser.com/resizer/v2/L4L4PXXB3BIHVN7OONPWWQBWCE.jpg?auth=d78c3c7db1d39b36d07e2a9b6c498305f8841a1eb3d5c5a04bc6bb7a47b4d1b8&width=736&height=414&quality=70&smart=true",
    coordenadas_gps: "43.260, -2.915", tiempo_viaje: "10 min"
  },
  "SANTUTXU FC": {
    nombre_corto: "Santutxu",
    ciudad: "Bilbao", provincia: "Bizkaia", ano_fundacion: 1918,
    colores: "Rojo y azul", equipacion_local: "Camiseta roja, pantalón azul",
    campo_nombre: "Mallona",
    escudo_url: "https://upload.wikimedia.org/wikipedia/en/2/25/SantutxuFC.png",
    imagen_fondo_url: "https://cadenaser.com/resizer/v2/L4L4PXXB3BIHVN7OONPWWQBWCE.jpg?auth=d78c3c7db1d39b36d07e2a9b6c498305f8841a1eb3d5c5a04bc6bb7a47b4d1b8&width=736&height=414&quality=70&smart=true",
    coordenadas_gps: "43.260, -2.915", tiempo_viaje: "10 min"
  },
  "SD EIBAR": {
    nombre_corto: "Eibar",
    ciudad: "Eibar", provincia: "Gipuzkoa", ano_fundacion: 1940,
    colores: "Azulgrana", equipacion_local: "Camiseta azulgrana, pantalón azul",
    campo_nombre: "Instalaciones de Unbe",
    escudo_url: "https://upload.wikimedia.org/wikipedia/en/thumb/3/3b/SD_Eibar_logo_2016.svg/1200px-SD_Eibar_logo_2016.svg.png",
    imagen_fondo_url: "https://www.sdeibar.com/images/unbe_2.jpg",
    coordenadas_gps: "43.184, -2.473", tiempo_viaje: "45 min"
  },
  "REAL SOCIEDAD": {
    nombre_corto: "Real Sociedad",
    ciudad: "San Sebastián", provincia: "Gipuzkoa", ano_fundacion: 1909,
    colores: "Txuri-urdin", equipacion_local: "Camiseta blanquiazul, pantalón blanco",
    campo_nombre: "Instalaciones de Zubieta",
    escudo_url: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f1/Real_Sociedad_logo.svg/1200px-Real_Sociedad_logo.svg.png",
    imagen_fondo_url: "https://cdn.realsociedad.eus/upload/images/realsociedad/zubieta/zubieta-1.jpg",
    coordenadas_gps: "43.260, -2.015", tiempo_viaje: "1h 10 min"
  },
  "SD LEIOA": {
    nombre_corto: "Leioa",
    ciudad: "Leioa", provincia: "Bizkaia", ano_fundacion: 1925,
    colores: "Azulgrana", equipacion_local: "Camiseta azulgrana, pantalón azul",
    campo_nombre: "Sarriena",
    escudo_url: "https://upload.wikimedia.org/wikipedia/en/0/05/Sociedad_Deportiva_Leioa_logo.png",
    imagen_fondo_url: "https://www.sdleioa.com/wp-content/uploads/2019/08/Sarriena-1.jpg",
    coordenadas_gps: "43.327, -2.990", tiempo_viaje: "20 min"
  },
  "DEPORTIVO ALAVES": {
    nombre_corto: "Alavés",
    ciudad: "Vitoria-Gasteiz", provincia: "Álava", ano_fundacion: 1921,
    colores: "Albiazul", equipacion_local: "Camiseta blanquiazul, pantalón azul",
    campo_nombre: "Ciudad Deportiva José Luis Compañón (Ibaia)",
    escudo_url: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f8/Deportivo_Alaves_logo.svg/1200px-Deportivo_Alaves_logo.svg.png",
    imagen_fondo_url: "https://www.deportivoalaves.com/images/ibaia.jpg",
    coordenadas_gps: "42.846, -2.673", tiempo_viaje: "45 min"
  }
};

async function run() {
  const { data: clubs, error } = await supabase.from('clubs').select('id, nombre');
  if (error) {
    console.error('Error fetching clubs:', error);
    return;
  }

  for (const club of clubs) {
    const updateData = clubsData[club.nombre];
    if (updateData) {
      console.log(`Updating ${club.nombre}...`);
      const { error: updateError } = await supabase
        .from('clubs')
        .update(updateData)
        .eq('id', club.id);
      
      if (updateError) {
        console.error(`Error updating ${club.nombre}:`, updateError);
      } else {
        console.log(`Successfully updated ${club.nombre}`);
      }
    } else {
      // Set generic fake data for the rest
      const genericData = {
        nombre_corto: club.nombre,
        colores: "Desconocido",
        campo_nombre: "Campo Municipal",
        tiempo_viaje: "Pendiente",
      };
      await supabase.from('clubs').update(genericData).eq('id', club.id);
      console.log(`Updated ${club.nombre} with generic data.`);
    }
  }
  console.log('Finished updating clubs!');
}

run();
