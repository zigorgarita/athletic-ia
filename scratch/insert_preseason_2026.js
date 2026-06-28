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
const PASSKEY = 'indautxu2026';

const PRESEASON_SESSIONS = [
  { fecha: '2026-07-27', tipo: 'Entrenamiento', obj: '1º Entrenamiento de Campo', carga: 'Media', tasks: [] },
  { fecha: '2026-07-28', tipo: 'Test', obj: 'Test de campo físico', carga: 'Media', tasks: [] },
  { fecha: '2026-07-29', tipo: 'Entrenamiento', obj: 'Sesión 1 Turno Físico', carga: 'Media', tasks: [] },
  { fecha: '2026-07-30', tipo: 'Playa', obj: 'Sesión Física en Playa', carga: 'Alta', tasks: [] },
  { fecha: '2026-07-31', tipo: 'Playa', obj: 'Sesión Física en Playa', carga: 'Alta', tasks: [] },
  { fecha: '2026-08-01', tipo: 'Playa', obj: 'Sesión Física en Playa', carga: 'Alta', tasks: [] },
  { fecha: '2026-08-02', tipo: 'Libre', obj: 'Descanso programado', carga: 'Baja', tasks: [] },

  { fecha: '2026-08-03', tipo: 'Entrenamiento', obj: 'Entrenamiento ATAQUE', carga: 'Media', tasks: ['Presión tras pérdida', 'Cambios orientación', 'Ataque organizado'] },
  { fecha: '2026-08-04', tipo: 'Entrenamiento', obj: 'Entrenamiento DEFENSA', carga: 'Media', tasks: ['Duelos individuales', 'Basculaciones', 'Defensa organizada'] },
  { fecha: '2026-08-05', tipo: 'Entrenamiento', obj: 'Entrenamiento ATAQUE', carga: 'Media', tasks: ['Presión tras pérdida', 'Transición ofensiva', 'Ataque organizado'] },
  { fecha: '2026-08-06', tipo: 'Entrenamiento', obj: 'Entrenamiento DEFENSA', carga: 'Media', tasks: ['Juego aéreo', 'Transición defensiva', 'Defensa organizada'] },
  { fecha: '2026-08-07', tipo: 'Entrenamiento', obj: 'Entrenamiento ATAQUE', carga: 'Media', tasks: ['Ocupación área ofensiva', 'Contraataque', 'Gestión superioridad'] },
  { fecha: '2026-08-08', tipo: 'Partido Amistoso', obj: 'Partido amistoso vs SD Eibar', rival: 'SD Eibar', carga: 'Muy alta', tasks: [] },
  { fecha: '2026-08-09', tipo: 'Libre', obj: 'Descanso programado', carga: 'Baja', tasks: [] },

  { fecha: '2026-08-10', tipo: 'Entrenamiento', obj: 'Entrenamiento ATAQUE', carga: 'Media', tasks: ['Presión tras pérdida', 'Transición ofensiva', 'Ataque organizado'] },
  { fecha: '2026-08-11', tipo: 'Entrenamiento', obj: 'Entrenamiento DEFENSA', carga: 'Media', tasks: ['Duelos individuales', 'Transición defensiva', 'Defensa organizada'] },
  { fecha: '2026-08-12', tipo: 'Partido Amistoso', obj: 'Partido amistoso vs UD Logroñés', rival: 'UD Logroñés', carga: 'Muy alta', tasks: [] },
  { fecha: '2026-08-13', tipo: 'Entrenamiento', obj: 'Entrenamiento DEFENSA', carga: 'Media', tasks: ['Juego aéreo', 'Repliegue', 'Defensa organizada'] },
  { fecha: '2026-08-14', tipo: 'Entrenamiento', obj: 'Entrenamiento ATAQUE', carga: 'Media', tasks: ['Ocupación área defensiva', 'Cambios orientación', 'Basculaciones'] },
  { fecha: '2026-08-15', tipo: 'Partido Amistoso', obj: 'Torneo Leioa Cup', rival: 'Varios (Leioa Cup)', carga: 'Muy alta', tasks: [] },
  { fecha: '2026-08-16', tipo: 'Libre', obj: 'Descanso programado', carga: 'Baja', tasks: [] },

  { fecha: '2026-08-17', tipo: 'Entrenamiento', obj: 'Entrenamiento ATAQUE', carga: 'Media', tasks: ['Presión tras pérdida', 'Transición ofensiva', 'Ataque organizado'] },
  { fecha: '2026-08-18', tipo: 'Entrenamiento', obj: 'Entrenamiento DEFENSA', carga: 'Media', tasks: ['Duelos individuales', 'Transición defensiva', 'Defensa organizada'] },
  { fecha: '2026-08-19', tipo: 'Partido Amistoso', obj: 'Partido amistoso vs Santutxu', rival: 'Santutxu', carga: 'Muy alta', tasks: [] },
  { fecha: '2026-08-20', tipo: 'Entrenamiento', obj: 'Entrenamiento DEFENSA', carga: 'Media', tasks: ['Juego aéreo', 'Repliegue', 'ABP'] },
  { fecha: '2026-08-21', tipo: 'Entrenamiento', obj: 'Entrenamiento ATAQUE', carga: 'Media', tasks: ['Ocupación área', 'Contraataque', 'ABP'] },
  { fecha: '2026-08-22', tipo: 'Partido Amistoso', obj: 'Partido amistoso vs Iparralde', rival: 'Iparralde', carga: 'Muy alta', tasks: [] },
  { fecha: '2026-08-23', tipo: 'Libre', obj: 'Descanso programado', carga: 'Baja', tasks: [] },

  { fecha: '2026-08-24', tipo: 'Entrenamiento', obj: 'Entrenamiento ATAQUE', carga: 'Media', tasks: ['Presión tras pérdida', 'Ataque organizado'] },
  { fecha: '2026-08-25', tipo: 'Entrenamiento', obj: 'Entrenamiento DEFENSA', carga: 'Media', tasks: ['Juego aéreo', 'Ocupación área', 'Defensa organizada'] },
  { fecha: '2026-08-26', tipo: 'Partido Amistoso', obj: 'Partido amistoso vs Osasuna', rival: 'Osasuna', carga: 'Muy alta', tasks: [] },
  { fecha: '2026-08-27', tipo: 'Libre', obj: 'Descanso programado', carga: 'Baja', tasks: [] },
  { fecha: '2026-08-28', tipo: 'Partido Amistoso', obj: 'Partido amistoso vs Amistad', rival: 'Amistad', carga: 'Muy alta', tasks: [] },
  { fecha: '2026-08-29', tipo: 'Partido Amistoso', obj: 'Partido amistoso vs Valladolid', rival: 'Valladolid', carga: 'Muy alta', tasks: [] },
  { fecha: '2026-08-30', tipo: 'Libre', obj: 'Descanso programado', carga: 'Baja', tasks: [] },

  { fecha: '2026-08-31', tipo: 'Entrenamiento', obj: 'Entrenamiento DEFENSA', carga: 'Media', tasks: ['Presión tras pérdida', 'Cambios orientación', 'Ataque organizado'] },
  { fecha: '2026-09-01', tipo: 'Entrenamiento', obj: 'Entrenamiento ATAQUE', carga: 'Media', tasks: ['Duelos individuales', 'Basculaciones', 'Defensa organizada'] },
  { fecha: '2026-09-02', tipo: 'Entrenamiento', obj: 'Entrenamiento DEFENSA', carga: 'Media', tasks: ['Presión tras pérdida', 'Transición ofensiva', 'Ataque organizado'] },
  { fecha: '2026-09-03', tipo: 'Entrenamiento', obj: 'Entrenamiento ATAQUE', carga: 'Media', tasks: ['Juego aéreo', 'Transición defensiva', 'Defensa organizada'] },
  { fecha: '2026-09-04', tipo: 'Prepartido', obj: 'Preparación prepartido y ABP', carga: 'Baja', tasks: ['ABP'] },
  { fecha: '2026-09-05', tipo: 'Partido de Liga', obj: 'Jornada 1 de Liga', rival: 'Rival Jornada 1', carga: 'Muy alta', tasks: [] },
  { fecha: '2026-09-06', tipo: 'Partido de Liga', obj: 'Jornada 2 de Liga', rival: 'Rival Jornada 2', carga: 'Muy alta', tasks: [] }
];

async function insertPreseason() {
  console.log("=== STARTING SECURE PRESEASON 2026 DATA INSERTION ===");

  // 1. Get or Create Team via Secure RPC
  let teamId;
  const { data: teamData } = await supabase
    .from('teams')
    .select('id')
    .eq('nombre', 'S.D. Indautxu Juvenil A')
    .maybeSingle();

  if (!teamData) {
    console.log("Creating default Team via RPC...");
    const { data: newTeam, error: newTeamErr } = await supabase.rpc('exec_secure_upsert', {
      target_table: 'teams',
      payload: { nombre: 'S.D. Indautxu Juvenil A', categoria: 'División de Honor' },
      conflict_columns: null,
      staff_passkey: PASSKEY
    });
    if (newTeamErr) {
      console.error("Error creating team:", newTeamErr.message);
      return;
    }
    teamId = newTeam.id;
  } else {
    teamId = teamData.id;
  }
  console.log(`✅ Active Team ID: ${teamId}`);

  // 2. Get or Create Season via Secure RPC
  let seasonId;
  const { data: seasonData } = await supabase
    .from('seasons')
    .select('id')
    .eq('nombre', 'Pretemporada 2026')
    .maybeSingle();

  if (!seasonData) {
    console.log("Creating default Season via RPC...");
    const { data: newSeason, error: newSeasonErr } = await supabase.rpc('exec_secure_upsert', {
      target_table: 'seasons',
      payload: { nombre: 'Pretemporada 2026', fecha_inicio: '2026-07-27', fecha_fin: '2026-09-06' },
      conflict_columns: null,
      staff_passkey: PASSKEY
    });
    if (newSeasonErr) {
      console.error("Error creating season:", newSeasonErr.message);
      return;
    }
    seasonId = newSeason.id;
  } else {
    seasonId = seasonData.id;
  }
  console.log(`✅ Active Season ID: ${seasonId}`);

  // 3. Clear existing sessions in dates range
  // We can't delete directly if DELETE policy is blocked. Let's delete via custom RPC or if delete policy allows it.
  // Wait, direct DELETE on planning_sessions has:
  // "CREATE POLICY "Public Delete" ON planning_sessions FOR DELETE USING (true);" -> It is public! So DELETE will succeed.
  console.log("Cleaning up any existing planning data in date range...");
  const { error: deleteErr } = await supabase
    .from('planning_sessions')
    .delete()
    .gte('fecha', '2026-07-27')
    .lte('fecha', '2026-09-06');

  if (deleteErr) {
    console.error("Error cleaning up range:", deleteErr.message);
    return;
  }
  console.log("✅ Range cleaned successfully.");

  // Get list of all players to summon them automatically
  const { data: players } = await supabase.from('players').select('id, estado');

  // 4. Insert Sessions and their Tasks using Secure RPC
  for (const s of PRESEASON_SESSIONS) {
    console.log(`Inserting session [${s.fecha}] - ${s.obj} via RPC...`);
    const { data: sessionObj, error: sErr } = await supabase.rpc('exec_secure_upsert', {
      target_table: 'planning_sessions',
      payload: {
        fecha: s.fecha,
        tipo_sesion: s.tipo,
        objetivo_principal: s.obj,
        carga: s.carga,
        rival: s.rival || null,
        estado: 'Planificada',
        hora_inicio: s.tipo === 'Partido Amistoso' || s.tipo === 'Partido de Liga' ? '12:00' : '18:30',
        duracion_total: s.tipo === 'Libre' ? 0 : 90,
        team_id: teamId,
        season_id: seasonId
      },
      conflict_columns: null,
      staff_passkey: PASSKEY
    });

    if (sErr) {
      console.error(`❌ Failed to insert session on ${s.fecha}:`, sErr.message);
      continue;
    }

    const sessionId = sessionObj.id;

    // Auto summon players via RPC
    if (players && players.length > 0) {
      for (const p of players) {
        await supabase.rpc('exec_secure_upsert', {
          target_table: 'planning_session_players',
          payload: {
            session_id: sessionId,
            player_id: p.id,
            convocado: true,
            estado_sesion: p.estado || 'Disponible'
          },
          conflict_columns: null,
          staff_passkey: PASSKEY
        });
      }
    }

    // Insert tasks (contents) via RPC
    if (s.tasks && s.tasks.length > 0) {
      for (let idx = 0; idx < s.tasks.length; idx++) {
        const taskName = s.tasks[idx];
        const { error: tErr } = await supabase.rpc('exec_secure_upsert', {
          target_table: 'planning_tasks',
          payload: {
            planning_session_id: sessionId,
            nombre_tarea: taskName,
            tipo_tarea: 'Concepto Táctico',
            minutos: 30,
            orden: idx,
            objetivo: 'Concepto de pretemporada'
          },
          conflict_columns: null,
          staff_passkey: PASSKEY
        });
        if (tErr) {
          console.error(`❌ Failed to insert task ${taskName} for session ${sessionId}:`, tErr.message);
        }
      }
    }
  }

  console.log("✅ PRESEASON INSERTION COMPLETED SUCCESSFULLY!");
}

insertPreseason().catch(console.error);
