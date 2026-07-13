import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual parsing of .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    envVars[key] = value;
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan credenciales de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('Iniciando verificación del esquema de Base de Datos ABP...\n');
  let success = true;
  let testMatchId = null;
  let testPlayId = null;
  let testPlanId = null;
  let testRoleId = null;
  let createdMatch = false;

  try {
    // 1. Crear un partido de prueba para validar la relación (si no hay, creamos temporal)
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert([{ jornada: 9999, rival: 'Test_Verification_Team', fecha: '2026-01-01', competicion: 'Test' }])
      .select()
      .single();
      
    if (matchError) {
        const { data: existingMatch } = await supabase.from('matches').select('id').limit(1).single();
        if (existingMatch) testMatchId = existingMatch.id;
        else throw new Error('No se pudo crear ni obtener un partido: ' + matchError.message);
    } else {
        testMatchId = matchData.id;
        createdMatch = true;
        console.log('✅ Partido de prueba creado o recuperado (match_id OK).');
    }

    // 2. Usar una jugada ABP existente (plantilla)
    const { data: playData, error: playError } = await supabase
      .from('abp_plays')
      .select('id')
      .limit(1)
      .single();
      
    if (playError) throw new Error('No se pudo obtener una jugada ABP existente: ' + playError.message);
    testPlayId = playData.id;
    console.log('✅ Jugada ABP de plantilla recuperada (abp_play_id OK).');

    // 3. Usar un rol de plantilla existente (dibujo)
    const { data: roleData, error: roleError } = await supabase
      .from('abp_player_roles')
      .select('id')
      .eq('abp_play_id', testPlayId)
      .limit(1)
      .single();
      
    if (roleError) {
        console.warn('⚠️ No se encontró un rol existente, creando uno simulado (puede fallar por RLS)...');
        const { data: newRole, error: newRoleError } = await supabase
          .from('abp_player_roles')
          .insert([{ abp_play_id: testPlayId, rol_asignado: 'TestRole', posicion_x: 50, posicion_y: 50, orden: 1 }])
          .select()
          .single();
        if (newRoleError) throw newRoleError;
        testRoleId = newRole.id;
    } else {
        testRoleId = roleData.id;
        console.log('✅ Rol de plantilla recuperado (abp_player_role_id OK).');
    }

    // --- PRUEBAS DEL PLAN ABP ---
    
    // Prueba A: Plan con jornada (Relación directa)
    const { data: planA, error: planAError } = await supabase
      .from('match_abp_plans')
      .insert([{ match_id: testMatchId, abp_play_id: testPlayId, observaciones: 'Test con jornada', orden: 1 }])
      .select()
      .single();
      
    if (planAError) throw new Error('Error al crear plan asociado a jornada: ' + planAError.message);
    testPlanId = planA.id;
    console.log('✅ [Check] Crear plan asociado a una jornada: Funciona correctamente.');

    // Prueba B: Asignar un jugador sin clonar el dibujo (usando el abp_player_role_id)
    const { error: assignError } = await supabase
      .from('match_abp_player_assignments')
      .insert([{ match_abp_plan_id: testPlanId, abp_player_role_id: testRoleId, notas_especificas: 'Sube a rematar fuerte' }]);
      
    if (assignError) throw new Error('Error al asignar jugador al plan: ' + assignError.message);
    console.log('✅ [Check] Asignar jugador a la instancia del partido SIN duplicar dibujo: Funciona correctamente.');

    // Prueba C: Plan SIN jornada (Borrador - nullable match_id)
    const { data: planB, error: planBError } = await supabase
      .from('match_abp_plans')
      .insert([{ match_id: null, abp_play_id: testPlayId, observaciones: 'Borrador sin partido', orden: 2 }])
      .select();
      
    if (planBError) throw new Error('Error al crear plan sin partido (nullable falló): ' + planBError.message);
    console.log('✅ [Check] Crear borrador sin jornada (match_id es NULL): Funciona correctamente.');
    
    // Limpieza de Plan B (borrador)
    await supabase.from('match_abp_plans').delete().eq('id', planB[0].id);

    // 4. Verificación de RLS
    console.log('✅ [Check] Políticas RLS: Permitieron Lectura y Escritura en entorno de pruebas.');
    
    // 5. Verificación de Delete Cascade (Solo el plan)
    // Al borrar el plan, la asignación debe borrarse (CASCADE)
    await supabase.from('match_abp_plans').delete().eq('id', testPlanId);
    const { data: checkAssign } = await supabase.from('match_abp_player_assignments').select('*').eq('match_abp_plan_id', testPlanId);
    if (checkAssign && checkAssign.length === 0) {
        console.log('✅ [Check] Restricción ON DELETE CASCADE: Al borrar el plan, se limpian sus asignaciones.');
    } else {
        console.error('❌ Error de Cascade en asignaciones.');
        success = false;
    }

  } catch (error) {
    console.error('\n❌ Error durante la verificación:', error.message);
    success = false;
  } finally {
    // LIMPIEZA TOTAL
    console.log('\nLimpiando datos de prueba...');
    // if (testPlayId) await supabase.from('abp_plays').delete().eq('id', testPlayId); // NO BORRAR PORQUE AHORA USAMOS UNO EXISTENTE
    if (createdMatch) await supabase.from('matches').delete().eq('jornada', 9999);
    
    if (success) {
      console.log('\n==============================================');
      console.log('🎉 TODAS LAS PRUEBAS SUPERADAS CON ÉXITO 🎉');
      console.log('La base de datos está lista para la interfaz.');
      console.log('==============================================\n');
    } else {
      console.log('\n==============================================');
      console.log('⚠️ HUBO ERRORES EN LA VERIFICACIÓN ⚠️');
      console.log('==============================================\n');
    }
  }
}

verify();
