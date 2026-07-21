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

async function verify() {
  console.log('--- VERIFICACIÓN DE COLUMNA label_position ---');

  // 1. Intentar hacer select de la columna label_position
  const { data: selectData, error: selectError } = await supabase
    .from('abp_player_roles')
    .select('id, label_position')
    .limit(5);

  if (selectError) {
    console.log('❌ Error al consultar la columna label_position:', selectError.message);
    console.log('Esto indica que la columna no existe en la base de datos o hay un problema de permisos.');
    return;
  }

  console.log('✅ La columna label_position existe en la tabla abp_player_roles.');

  // 2. Comprobar compatibilidad con jugadas antiguas
  console.log('✅ Las jugadas antiguas se leen correctamente. Registros de prueba recuperados:', selectData);

  // 3. Comprobar el valor por defecto insertando un rol temporal de prueba
  // Buscamos una jugada de ABP válida para asociar temporalmente el rol
  const { data: plays, error: playsError } = await supabase
    .from('abp_plays')
    .select('id')
    .limit(1);

  if (playsError || !plays || plays.length === 0) {
    console.log('⚠️ No se encontró ninguna jugada de ABP para probar la inserción por defecto.');
    return;
  }

  const playId = plays[0].id;
  const tempRoleId = '99999999-9999-9999-9999-999999999999'; // ID temporal que no colisione

  console.log('Insertando fila de prueba temporal para validar el valor por defecto...');

  // Intentamos insertar usando exec_secure_upsert si existe, o inserción directa si RLS lo permite
  // Nota: las políticas de RLS en abp_player_roles permiten SELECT, pero las escrituras van por exec_secure_upsert
  // Probamos a invocar exec_secure_upsert para insertar una fila temporal sin especificar label_position
  const { data: upsertData, error: upsertError } = await supabase.rpc('exec_secure_upsert', {
    target_table: 'abp_player_roles',
    payload: {
      id: tempRoleId,
      abp_play_id: playId,
      rol_asignado: 'TestTemp',
      posicion_x: 50.0,
      posicion_y: 50.0,
      etiqueta: 'TEST',
      orden: 99
    },
    conflict_columns: ['id'],
    staff_passkey: 'indautxu2026'
  });

  if (upsertError) {
    console.log('❌ Error al insertar fila temporal con exec_secure_upsert:', upsertError.message);
  } else {
    // Leer la fila temporal para verificar el valor de label_position
    const { data: readTemp, error: readTempError } = await supabase
      .from('abp_player_roles')
      .select('label_position')
      .eq('id', tempRoleId)
      .single();

    if (readTempError) {
      console.log('❌ Error al leer la fila temporal:', readTempError.message);
    } else {
      if (readTemp.label_position === 'bottom') {
        console.log('✅ El valor por defecto de label_position es correctamente "bottom".');
      } else {
        console.log('⚠️ La columna existe pero el valor obtenido es:', readTemp.label_position);
      }
    }

    // Limpiar fila temporal
    const { error: deleteError } = await supabase.rpc('exec_secure_delete', {
      target_table: 'abp_player_roles',
      row_id: tempRoleId,
      staff_passkey: 'indautxu2026'
    });
    if (deleteError) {
      console.log('⚠️ No se pudo eliminar la fila temporal de prueba:', deleteError.message);
    } else {
      console.log('✅ Fila de prueba eliminada correctamente.');
    }
  }
}

verify();
