/**
 * RUTA TEMPORAL — Carga masiva de alias de jugadores
 * Uso único: cargar los 33 alias del listado definitivo.
 * Protegida con x-editor-user + x-editor-pass (Zigor).
 * MODIFICAR ÚNICAMENTE la columna players.alias.
 * Eliminar después de la carga y verificación.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const ALIAS_MAP: Array<{ nombre: string; apellidos: string; alias: string }> = [
  { nombre: 'Markel',       apellidos: 'Arroyo',       alias: 'Markel'      },
  { nombre: 'Aritz',        apellidos: 'del Pico',     alias: 'Aritz'       },
  { nombre: 'Geovanni',     apellidos: 'Raigosa',      alias: 'Geovanni'    },
  { nombre: 'Unax',         apellidos: 'Gil',          alias: 'Unax'        },
  { nombre: 'Kevin',        apellidos: 'Loaiza',       alias: 'Kevin'       },
  { nombre: 'Jean Carlo',   apellidos: 'González',     alias: 'Jean'        },
  { nombre: 'Diego',        apellidos: 'Tubia',        alias: 'Tubia'       },
  { nombre: 'Xabier',       apellidos: 'Davalillo',    alias: 'Davalillo'   },
  { nombre: 'Neev',         apellidos: 'Mogre',        alias: 'Neev'        },
  { nombre: 'Joel',         apellidos: 'Chacón',       alias: 'Joel'        },
  { nombre: 'Iker',         apellidos: 'Eskubi',       alias: 'Eskubi'      },
  { nombre: 'Erlantz',      apellidos: 'Barreiro',     alias: 'Erlantz'     },
  { nombre: 'Juan',         apellidos: 'Solaeta',      alias: 'Juan'        },
  { nombre: 'Urko',         apellidos: 'Chocarro',     alias: 'Chocarro'    },
  { nombre: 'Ibon',         apellidos: 'Robles',       alias: 'Robles'      },
  { nombre: 'Xabier',       apellidos: 'Puig',         alias: 'Puig'        },
  { nombre: 'Danel',        apellidos: 'López',        alias: 'Danel'       },
  { nombre: 'David',        apellidos: 'Castaños',     alias: 'Castaños'    },
  { nombre: 'Aingeru',      apellidos: 'Nietzcho',     alias: 'Aingeru'     },
  { nombre: 'David',        apellidos: 'Mousolin',     alias: 'David'       },
  { nombre: 'Enaitz',       apellidos: 'Cortes',       alias: 'Enaitz'      },
  { nombre: 'Andoni',       apellidos: 'Bernalte',     alias: 'Andoni'      },
  { nombre: 'Iker',         apellidos: 'Anglada',      alias: 'Anglada'     },
  { nombre: 'Gorka',        apellidos: 'Aranda',       alias: 'Gorka'       },
  { nombre: 'Aratz',        apellidos: 'Dionisio',     alias: 'Aratz'       },
  { nombre: 'Marcos',       apellidos: 'Cruz',         alias: 'Marcos'      },
  { nombre: 'Aritz',        apellidos: 'Fonseca',      alias: 'Aritz'       },
  { nombre: 'Aimar',        apellidos: 'Salan',        alias: 'Aimar'       },
  { nombre: 'Jon',          apellidos: 'Sánchez',      alias: 'Jon'         },
  { nombre: 'Ivan',         apellidos: 'Herrero',      alias: 'Ivan'        },
  { nombre: 'Jon',          apellidos: 'Bermejo',      alias: 'Bermejo'     },
  { nombre: 'Miguel Ángel', apellidos: 'Cardoso',      alias: 'Miguel Ángel'},
  { nombre: 'Unax',         apellidos: 'Albillo',      alias: 'Albillo'     },
];

export async function POST(req: NextRequest) {
  // Verificar credenciales
  const editorUser = req.headers.get('x-editor-user')?.trim().toLowerCase();
  const editorPass = req.headers.get('x-editor-pass')?.trim();

  const validPasswords: Record<string, string> = {
    zigor: process.env.EDIT_PASSWORD_ZIGOR || 'indautxuzigor2026',
    aitor: process.env.EDIT_PASSWORD_AITOR || 'indautxuaitor2026',
    nacho: process.env.EDIT_PASSWORD_NACHO || 'indautxunacho2026',
  };

  if (!editorUser || !editorPass || validPasswords[editorUser] !== editorPass) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  // 1. Leer TODOS los jugadores actuales (solo columnas necesarias)
  const { data: allPlayers, error: fetchError } = await supabase
    .from('players')
    .select('id, nombre, apellidos, alias')
    .order('dorsal', { ascending: true });

  if (fetchError || !allPlayers) {
    return NextResponse.json(
      { error: 'Error al leer jugadores', details: fetchError?.message },
      { status: 500 }
    );
  }

  const totalJugadores = allPlayers.length;
  const resultados: Array<{
    nombre: string; apellidos: string; alias: string;
    status: 'ok' | 'not_found' | 'error'; message?: string;
  }> = [];

  const noEncontrados: string[] = [];

  // 2. Para cada entrada del listado, buscar por nombre + apellidos exacto
  for (const entry of ALIAS_MAP) {
    const match = allPlayers.find(
      p =>
        p.nombre.trim() === entry.nombre.trim() &&
        p.apellidos.trim() === entry.apellidos.trim()
    );

    if (!match) {
      noEncontrados.push(`${entry.nombre} ${entry.apellidos}`);
      resultados.push({
        nombre: entry.nombre,
        apellidos: entry.apellidos,
        alias: entry.alias,
        status: 'not_found',
        message: 'No encontrado por nombre+apellidos exacto en la BD',
      });
      continue;
    }

    // 3. Actualizar ÚNICAMENTE la columna alias
    const { error: updateError } = await supabase
      .from('players')
      .update({ alias: entry.alias })
      .eq('id', match.id);

    if (updateError) {
      resultados.push({
        nombre: entry.nombre,
        apellidos: entry.apellidos,
        alias: entry.alias,
        status: 'error',
        message: updateError.message,
      });
    } else {
      resultados.push({
        nombre: entry.nombre,
        apellidos: entry.apellidos,
        alias: entry.alias,
        status: 'ok',
      });
    }
  }

  // 4. Verificación post-carga: releer todos los jugadores
  const { data: verification, error: verifyError } = await supabase
    .from('players')
    .select('nombre, apellidos, dorsal, alias')
    .order('dorsal', { ascending: true });

  const conAlias = verification?.filter(p => p.alias !== null && p.alias !== '') ?? [];

  return NextResponse.json({
    resumen: {
      total_jugadores: totalJugadores,
      alias_procesados: ALIAS_MAP.length,
      alias_ok: resultados.filter(r => r.status === 'ok').length,
      alias_no_encontrado: resultados.filter(r => r.status === 'not_found').length,
      alias_error: resultados.filter(r => r.status === 'error').length,
      total_con_alias_en_bd: conAlias.length,
    },
    no_encontrados: noEncontrados,
    resultados_por_jugador: resultados,
    verificacion_bd: verification ?? [],
    verificacion_error: verifyError?.message ?? null,
  });
}
