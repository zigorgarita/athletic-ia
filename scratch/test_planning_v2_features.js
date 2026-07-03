const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const fileContent = fs.readFileSync(envPath, 'utf8');
  fileContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTests() {
  console.log('=== INICIANDO PRUEBAS DE PLANIFICACIÓN V2 ===');

  try {
    // 1. Verificar tabla planning_task_library
    console.log('\n1. Verificando tabla `planning_task_library`...');
    const { data: selectLib, error: errLib } = await supabase
      .from('planning_task_library')
      .select('*')
      .limit(1);

    if (errLib) {
      throw new Error(`Error al leer planning_task_library: ${errLib.message}`);
    }
    console.log('✅ Tabla `planning_task_library` disponible.');

    // 2. Probar inserción y lectura en biblioteca
    console.log('\n2. Probando inserción en biblioteca táctica...');
    const testTaskName = `Rondo de Prueba V2 - ${Date.now()}`;
    const { data: insertedTask, error: errInsert } = await supabase
      .from('planning_task_library')
      .insert([
        {
          nombre: testTaskName,
          tipo_tarea: 'Rondo',
          minutos_defecto: 20,
          jugadores_defecto: 8,
          espacio_defecto: '10x10m',
          objetivo: 'Presión tras pérdida y pase rápido',
          descripcion: 'Rondo clásico 4vs4 con apoyos laterales.',
          observaciones: 'Variante: 2 toques máximo.'
        }
      ])
      .select()
      .single();

    if (errInsert) {
      throw new Error(`Error al insertar tarea de prueba: ${errInsert.message}`);
    }
    console.log(`✅ Tarea de prueba "${insertedTask.nombre}" creada con ID: ${insertedTask.id}`);

    // 3. Verificar nuevos campos en planning_sessions
    console.log('\n3. Verificando campos V2 en `planning_sessions`...');
    const { data: sessionCols, error: errSessions } = await supabase
      .from('planning_sessions')
      .select('estado, evaluacion_completada, evaluacion_duracion_real, evaluacion_observaciones, categoria_filtro, hora_convocatoria, observaciones_convocatoria, checklist_material')
      .limit(1);

    if (errSessions) {
      throw new Error(`Error al verificar campos en planning_sessions: ${errSessions.message}`);
    }
    console.log('✅ Nuevos campos de sesión validados correctamente.');

    // 4. Verificar nuevos campos en planning_tasks
    console.log('\n4. Verificando campos V2 en `planning_tasks`...');
    const { data: taskCols, error: errTasks } = await supabase
      .from('planning_tasks')
      .select('responsable_staff, responsable_staff_otro')
      .limit(1);

    if (errTasks) {
      throw new Error(`Error al verificar campos en planning_tasks: ${errTasks.message}`);
    }
    console.log('✅ Nuevos campos de tareas validados correctamente.');

    // 5. Limpieza de prueba
    console.log('\n5. Limpiando registros de prueba...');
    const { error: errClean } = await supabase
      .from('planning_task_library')
      .delete()
      .eq('id', insertedTask.id);

    if (errClean) {
      throw new Error(`Error al limpiar tarea de prueba: ${errClean.message}`);
    }
    console.log('✅ Limpieza completada con éxito.');

    console.log('\n🎉 ¡TODAS LAS PRUEBAS DE PLANIFICACIÓN V2 PASARON CORRECTAMENTE!');
  } catch (err) {
    console.error('\n❌ ERROR DURANTE LAS PRUEBAS:', err.message);
    process.exit(1);
  }
}

runTests();
