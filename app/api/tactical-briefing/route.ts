import { NextResponse } from 'next/server';
import { createProvider, AIMessage } from '@/lib/ai/provider';

// Simple rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 15;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitData = rateLimitMap.get(ip);

  if (!limitData || now > limitData.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + LIMIT_WINDOW_MS });
    return true;
  }

  if (limitData.count >= MAX_REQUESTS) {
    return false;
  }

  limitData.count += 1;
  return true;
}

export async function POST(request: Request) {
  // 1. Rate limiting
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Límite de peticiones excedido (máximo 15 por minuto). Por favor, espera.' },
      { status: 429 }
    );
  }

  // 2. Validate passkey
  const staffPasskey = request.headers.get('x-staff-passkey');
  const expectedPasskey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
  
  if (staffPasskey !== expectedPasskey) {
    return NextResponse.json(
      { error: 'No autorizado. Contraseña de staff incorrecta.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { 
      actionType,
      rivalName,
      sistemaPropio,
      sistemaRival,
      ventajas,
      desventajas,
      zonaConflicto,
      dueloClave,
      tareasLineas,
      onceInicial,
      roleCards
    } = body as {
      actionType: 'synthesize_lines' | 'synthesize_players';
      rivalName: string;
      sistemaPropio: string;
      sistemaRival: string;
      ventajas: string;
      desventajas: string;
      zonaConflicto: string;
      dueloClave: string;
      tareasLineas: string;
      onceInicial?: Array<{
        id: string;
        nombre: string;
        apellidos: string;
        dorsal: number;
        demarcacion: string;
        label_posicion: string;
        x: number;
        y: number;
      }>;
      roleCards?: Array<{
        posicion_label: string;
        linea: string;
        fase_ofensiva: string | null;
        fase_defensiva: string | null;
        transiciones: string | null;
        instrucciones_especificas: string | null;
      }>;
    };

    if (actionType !== 'synthesize_lines' && actionType !== 'synthesize_players') {
      return NextResponse.json(
        { error: 'Acción de briefing no soportada.' },
        { status: 400 }
      );
    }

    const provider = createProvider();
    const systemInstruction = `Eres el Preparador del Briefing Táctico del S.D. Indautxu Juvenil A (División de Honor Nacional 2026-27).
Tu misión es destilar, secuenciar y sintetizar la complejidad táctica del plan de partido en consignas directas, pedagógicas y de altísima asimilación cognitiva para los jugadores juveniles.
CRÍTICO: Cada consigna o pauta individual que generes debe tener un MÁXIMO DE 10 PALABRAS. Evita explicaciones largas, tecnicismos vacíos y pautas genéricas. Deben ser indicaciones prácticas y directas para el partido.`;

    let compiledPrompt = '';

    if (actionType === 'synthesize_lines') {
      compiledPrompt = `
TAREA: Genera las consignas de briefing para las 4 líneas principales del equipo (Portería, Defensa, Mediocampo, Delantera).
Debes basarte en el enfrentamiento estructural y el análisis táctico de la Página 3.

DATOS DEL MATCHUP DEL PARTIDO:
- Rival: vs ${rivalName || 'Rival'}
- Sistemas: Nuestro ${sistemaPropio} contra su ${sistemaRival}
- Ventajas detectadas: ${ventajas || 'Sin ventajas definidas'}
- Riesgos/Desventajas: ${desventajas || 'Sin riesgos definidos'}
- Zona de conflicto clave: ${zonaConflicto || 'Sin zona de conflicto definida'}
- Duelo táctico principal: ${dueloClave || 'Sin duelo clave definido'}
- Notas previas del entrenador por líneas:
${tareasLineas || 'No hay notas previas.'}

INSTRUCCIONES DE FORMATO:
- Genera EXACTAMENTE 3 consignas clave para cada una de las 4 líneas (Portería, Defensa, Mediocampo, Delantera).
- Cada consigna debe ser una frase ultra-corta e imperativa de un MÁXIMO DE 10 PALABRAS (ej. "Vigila basculación al intervalo lateral", "Inicia en corto con apoyos escalonados").
- Responde estrictamente con un objeto JSON, sin triple backticks de markdown ni texto externo.

ESTRUCTURA DE RETORNO JSON:
{
  "porteria": ["Pauta 1 (max 10 pal)", "Pauta 2 (max 10 pal)", "Pauta 3 (max 10 pal)"],
  "defensa": ["Pauta 1", "Pauta 2", "Pauta 3"],
  "mediocampo": ["Pauta 1", "Pauta 2", "Pauta 3"],
  "delantera": ["Pauta 1", "Pauta 2", "Pauta 3"]
}
`;
    } else {
      // synthesize_players
      if (!onceInicial || onceInicial.length === 0) {
        return NextResponse.json(
          { error: 'Se requiere el once inicial para generar las instrucciones individuales.' },
          { status: 400 }
        );
      }

      const onceTitularList = onceInicial
        .map(p => {
          const matchingRole = roleCards?.find(rc => rc.posicion_label === p.label_posicion);
          return `- Jugador: ${p.nombre} ${p.apellidos} (Dorsal ${p.dorsal}) asignado al rol [${p.label_posicion}]. 
  * Notas de rol genéricas en Fase Ofensiva: ${matchingRole?.fase_ofensiva || 'Sin definir'}
  * Notas de rol genéricas en Fase Defensiva: ${matchingRole?.fase_defensiva || 'Sin definir'}
  * Notas de rol genéricas en Transición: ${matchingRole?.transiciones || 'Sin definir'}
  * Nota de rol genérica Específica: ${matchingRole?.instrucciones_especificas || 'Sin definir'}`;
        })
        .join('\n\n');

      compiledPrompt = `
TAREA: Genera las fichas de instrucciones tácticas individuales sintetizadas para los 11 jugadores del once inicial de este partido.
Debes cruzar el perfil de cada jugador y su rol táctico con el contexto estratégico del partido (Rival, sistemas, ventajas, riesgos, duelo clave, zona conflicto).

DATOS ESTRATÉGICOS DEL PARTIDO:
- Rival: vs ${rivalName || 'Rival'}
- Choque de sistemas: Nuestro ${sistemaPropio} contra su ${sistemaRival}
- Ventajas generales a explotar: ${ventajas || 'Sin ventajas definidas'}
- Desventajas / Riesgos generales: ${desventajas || 'Sin riesgos definidos'}
- Zona de conflicto del partido: ${zonaConflicto || 'Sin zona de conflicto definida'}
- Duelo clave principal del partido: ${dueloClave || 'Sin duelo clave definido'}

NUESTRO ONCE TITULAR E INSTRUCCIONES DE ROL ACTUALES:
${onceTitularList}

INSTRUCCIONES DE GENERACIÓN:
1. Para CADA uno de los 11 jugadores asignados, genera 4 consignas específicas adaptadas a ESTE PARTIDO (fase_ofensiva, fase_defensiva, transiciones, instrucciones_especificas).
2. NADA DE PAUTAS GENÉRICAS. Adapta cada pauta al rival y matchup (ej. si su 10 es peligroso y el jugador es MCD, dile en defensa: "Marca asfixiante al 10 en carril central").
3. CADA PAUTA DEBE SER DE UN MÁXIMO DE 10 PALABRAS. Pautas cortas, directas y motivadoras.
4. Responde estrictamente con un objeto JSON, sin triple backticks de markdown ni texto externo.

ESTRUCTURA DE RETORNO JSON:
{
  "players": [
    {
      "playerId": "id-del-jugador-titular",
      "posicion_label": "POR",
      "fase_ofensiva": "Pauta ofensiva (max 10 pal)",
      "fase_defensiva": "Pauta defensiva (max 10 pal)",
      "transiciones": "Pauta transiciones (max 10 pal)",
      "instrucciones_especificas": "Instrucción específica del partido (max 10 pal)"
    },
    ... (debe incluir exactamente los 11 jugadores del once titular)
  ]
}
`;
    }

    const messagesForAI: AIMessage[] = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: compiledPrompt }
    ];

    const aiResponse = await provider.chat(messagesForAI, {
      temperature: 0.2
    });

    let rawContent = aiResponse.content.trim();

    // Sanitize markdown block
    if (rawContent.startsWith('```')) {
      rawContent = rawContent.replace(/^```json\s*/i, '');
      rawContent = rawContent.replace(/^```\s*/, '');
      rawContent = rawContent.replace(/```$/, '');
      rawContent = rawContent.trim();
    }

    let parsedData;
    try {
      parsedData = JSON.parse(rawContent);
    } catch {
      console.error('Error parsing Briefing Gemini output as JSON:', rawContent);
      return NextResponse.json(
        { error: 'La IA no devolvió un formato de briefing válido. Reinténtalo.' },
        { status: 500 }
      );
    }

    // Validation
    if (actionType === 'synthesize_lines') {
      const { porteria, defensa, mediocampo, delantera } = parsedData;
      if (!porteria || !defensa || !mediocampo || !delantera) {
        return NextResponse.json(
          { error: 'El briefing por líneas retornado está incompleto.' },
          { status: 500 }
        );
      }
    } else {
      const { players } = parsedData;
      if (!players || !Array.isArray(players) || (onceInicial && players.length !== onceInicial.length)) {
        console.warn('Briefing de jugadores retornado incompleto:', players?.length, 'de', onceInicial?.length);
      }
    }

    return NextResponse.json(parsedData);

  } catch (error: unknown) {
    console.error('Error in tactical briefing API route:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: errorMessage || 'Error al procesar la sintetización del briefing.' },
      { status: 500 }
    );
  }
}
