import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createProvider, AIMessage } from '@/lib/ai/provider';
import { SYSTEM_PROMPT_BASE, PROMPTS, PromptContext } from '@/lib/ai/prompts';
import { TacticalAIContext, AIAction, TacticalRoleCard } from '@/types';

// Rate limiting simple en memoria
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 15; // Max 15 peticiones por minuto

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
  // 1. Obtener IP para rate limiting
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Límite de peticiones excedido (máximo 15 por minuto). Por favor, espera un momento.' },
      { status: 429 }
    );
  }

  // 2. Validar passkey del staff
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
    const { message, actionType, context, conversationHistory } = body as {
      message: string;
      actionType?: string;
      context: TacticalAIContext;
      conversationHistory: AIMessage[];
    };

    if (!context || !context.systemOwn || !context.systemRival) {
      return NextResponse.json(
        { error: 'Contexto táctico incompleto (se requieren sistema propio y rival).' },
        { status: 400 }
      );
    }

    // 3. Enriquecimiento del Contexto desde Supabase (RAG)
    const promptCtx: PromptContext = {
      systemOwn: context.systemOwn,
      systemRival: context.systemRival,
      matchRival: context.matchRival || null,
      systemNodes: context.systemNodes
    };

    // A) Cargar datos de jugadores asignados
    if (context.assignedPlayerIds && context.assignedPlayerIds.length > 0) {
      const { data: players } = await supabase
        .from('players')
        .select('id, nombre, apellidos, dorsal, demarcacion, estado')
        .in('id', context.assignedPlayerIds);

      if (players && players.length > 0) {
        promptCtx.assignedPlayersList = players
          .map(p => `- Dorsal ${p.dorsal}: ${p.nombre} ${p.apellidos} (${p.demarcacion}) - Estado: ${p.estado}`)
          .join('\n');
      }
    }

    // B) Cargar fichas de rol existentes
    if (context.roleCards && context.roleCards.length > 0) {
      promptCtx.roleCardsList = context.roleCards
        .map(rc => `[${rc.posicion_label}] Línea: ${rc.linea}\n- Fase Ofensiva: ${rc.fase_ofensiva || 'Sin definir'}\n- Fase Defensiva: ${rc.fase_defensiva || 'Sin definir'}\n- Transiciones: ${rc.transiciones || 'Sin definir'}\n- Específico: ${rc.instrucciones_especificas || 'Sin definir'}`)
        .join('\n\n');
    }

    // C) Cargar datos teóricos del matchup
    if (context.matchupId) {
      const { data: matchup } = await supabase
        .from('tactical_matchups')
        .select('*')
        .eq('id', context.matchupId)
        .single();
      
      if (matchup) {
        promptCtx.matchupData = `- Ventajas teóricas: ${matchup.ventajas || 'Sin datos'}\n- Desventajas teóricas: ${matchup.desventajas || 'Sin datos'}\n- Zona conflicto: ${matchup.zona_conflicto || 'Sin datos'}\n- Duelo clave: ${matchup.duelo_clave || 'Sin datos'}\n- Tareas por línea: ${matchup.tareas_lineas || 'Sin datos'}`;
      }
    }

    // D) Cargar conocimiento táctico de la biblioteca
    try {
      const { data: knowledge } = await supabase
        .from('knowledge_entries')
        .select('titulo, categoria, principio_clave, descripcion, consignas')
        .eq('activo', true)
        .or(`sistema_asociado.eq.${context.systemOwn},sistema_asociado.eq.${context.systemRival},sistema_asociado.is.null`)
        .limit(10);

      if (knowledge && knowledge.length > 0) {
        promptCtx.relevantKnowledge = knowledge
          .map(k => `[${k.categoria}] Título: ${k.titulo}\n- Resumen: ${k.principio_clave}\n- Consignas: ${k.consignas?.join(', ') || 'N/A'}`)
          .join('\n\n');
      }
    } catch (kErr) {
      console.warn('Error al leer biblioteca de conocimiento en API Route:', kErr);
    }

    // E) Cargar evaluaciones de los jugadores asignados
    if (context.assignedPlayerIds && context.assignedPlayerIds.length > 0) {
      const { data: evals } = await supabase
        .from('detailed_evaluations')
        .select('player_id, fecha_evaluacion, valoracion_global, posicionamiento_defensivo, inteligencia_tactica, vision_juego')
        .in('player_id', context.assignedPlayerIds)
        .order('fecha_evaluacion', { ascending: false });

      if (evals && evals.length > 0) {
        // Agrupar por jugador y tomar la más reciente
        const latestEvals = new Map<string, {
          player_id: string;
          fecha_evaluacion: string;
          valoracion_global: number | null;
          posicionamiento_defensivo: number | null;
          inteligencia_tactica: number | null;
          vision_juego: number | null;
        }>();
        evals.forEach(e => {
          if (!latestEvals.has(e.player_id)) latestEvals.set(e.player_id, e);
        });

        const evalsSummary: string[] = [];
        latestEvals.forEach((ev, pId) => {
          evalsSummary.push(`- Jugador ID ${pId}: Global: ${ev.valoracion_global || 'N/A'}, Inteligencia Táctica: ${ev.inteligencia_tactica || 'N/A'}, Visión: ${ev.vision_juego || 'N/A'}`);
        });
        promptCtx.recentEvaluations = evalsSummary.join('\n');
      }
    }

    // 4. Compilar el Prompt enriquecido
    let compiledPrompt = '';
    const actionKey = actionType as keyof typeof PROMPTS;

    if (actionType && PROMPTS[actionKey]) {
      compiledPrompt = PROMPTS[actionKey](promptCtx, message);
    } else {
      compiledPrompt = PROMPTS.freeChat(promptCtx, message);
    }

    // 5. Mapear historial de la conversación
    const messagesForAI: AIMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT_BASE }
    ];

    // Mapear historial omitiendo el último mensaje que se reemplaza por el enriquecido
    const historyToInclude = conversationHistory || [];
    const priorHistory = historyToInclude.slice(0, -1);
    
    priorHistory.forEach((m: AIMessage) => {
      if (m.role === 'user' || m.role === 'assistant' || m.role === 'system') {
        messagesForAI.push({ role: m.role, content: m.content });
      }
    });

    // Agregar el mensaje enriquecido final
    messagesForAI.push({ role: 'user', content: compiledPrompt });

    // 6. Consultar al proveedor de IA
    const provider = createProvider();
    const response = await provider.chat(messagesForAI);

    // 7. Parsear acciones sugeridas automáticamente
    const suggestedActions = parseSuggestedActions(response.content, context);

    return NextResponse.json({
      content: response.content,
      model: response.model,
      suggestedActions
    });
  } catch (err: unknown) {
    console.error('Error en API Route de Tactical AI:', err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}

/**
 * Parsea el texto generado por la IA en busca de directrices estructuradas
 * para sugerir botones de acción rápida en el cliente.
 */
function parseSuggestedActions(content: string, context: TacticalAIContext): AIAction[] {
  const actions: AIAction[] = [];

  // 1. Detectar si la respuesta sugiere fichas de rol (role cards)
  if (content.includes('Ficha de Rol') || content.includes('Rol por posición') || content.includes('[POR]') || content.includes('[LD]')) {
    actions.push({
      type: 'apply_to_role_card',
      label: '📋 Aplicar Fichas de Rol Sugeridas',
      data: {
        systemOwn: context.systemOwn,
        roleCards: extractRoleCardsFromText(content, context)
      }
    });
  }

  // 2. Detectar si la respuesta sugiere análisis del matchup
  if (content.includes('Ventajas') || content.includes('Desventajas') || content.includes('Zona de Conflicto') || content.includes('Duelo Clave')) {
    actions.push({
      type: 'apply_to_matchup',
      label: '⚔️ Aplicar Análisis al Comparador',
      data: {
        ventajas: extractSection(content, 'Ventajas'),
        desventajas: extractSection(content, 'Desventajas'),
        zona_conflicto: extractSection(content, 'Zona de Conflicto'),
        duelo_clave: extractSection(content, 'Duelo Clave'),
        tareas_lineas: extractSection(content, 'Tareas')
      }
    });
  }

  // 3. Detectar si sugiere crear una sesión
  if (content.includes('Sesión de entrenamiento') || content.includes('Parte Principal') || content.includes('Rondo de activación')) {
    actions.push({
      type: 'create_session',
      label: '📅 Programar esta Sesión',
      data: {
        objetivo_principal: extractSection(content, 'Objetivo') || 'Sesión sugerida por IA',
        carga: content.includes('Alta') ? 'Alta' : content.includes('Baja') ? 'Baja' : 'Media',
        tareas: extractTasksFromText(content)
      }
    });
  }

  // 4. Guardar en biblioteca siempre está disponible
  actions.push({
    type: 'save_to_library',
    label: '📚 Guardar en Biblioteca',
    data: {
      titulo: `Sugerencia IA: ${context.systemOwn} vs ${context.systemRival}`,
      descripcion: content,
      categoria: 'Principios generales'
    }
  });

  // 5. Copiar al portapapeles siempre disponible
  actions.push({
    type: 'copy',
    label: '📋 Copiar al Portapapeles',
    data: { text: content }
  });

  return actions;
}

function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`(?:###|\\*\\*)\\s*${sectionName}\\s*(?:\\*\\*)?:?\\s*([\\s\\S]*?)(?=(?:###|\\*\\*|\\n\\n[A-Z]))`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function extractRoleCardsFromText(text: string, context: TacticalAIContext): Partial<TacticalRoleCard>[] {
  const cards: Partial<TacticalRoleCard>[] = [];
  
  // Buscar cualquier etiqueta que contenga de 2 a 4 letras mayúsculas, e.g., [POR], [LD], [MCD], [CAD], etc.
  const regex = /\[([A-Z]{2,4})\]\s*(?:Línea|Posición)?.*?:?\s*([\s\S]*?)(?=(?:\[[A-Z]{2,4}\]|\n\n[A-Z]|$))/gi;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const pos = match[1].toUpperCase();
    const content = match[2].trim();
      
    // Intentar dividir en secciones ofensivas, defensivas, etc. si el texto está estructurado
    const faseOfensiva = extractSubSection(content, 'ofensiva') || content.substring(0, 150);
    const faseDefensiva = extractSubSection(content, 'defensiva') || content.substring(150, 300);
    const transiciones = extractSubSection(content, 'transici') || '';
    const instrucc = extractSubSection(content, 'especifica') || '';

    let linea: 'Portería' | 'Defensa' | 'Mediocampo' | 'Delantera' = 'Mediocampo';
    if (pos === 'POR') linea = 'Portería';
    else if (['LD', 'LI', 'DFC', 'CT', 'DCD', 'DCI', 'CAD', 'CAI'].includes(pos)) linea = 'Defensa';
    else if (['ED', 'EI', 'DC', 'SD', 'EXD', 'EXI'].includes(pos)) linea = 'Delantera';

    cards.push({
      matchup_id: context.matchupId || undefined,
      match_plan_id: context.matchId || undefined,
      linea,
      posicion_label: pos,
      fase_ofensiva: faseOfensiva,
      fase_defensiva: faseDefensiva,
      transiciones,
      instrucciones_especificas: instrucc
    });
  }

  return cards;
}

function extractSubSection(text: string, key: string): string {
  const regex = new RegExp(`(?:-|\\*\\*)\\s*Fase\\s+${key}\\s*(?:\\*\\*)?:?\\s*([\\s\\S]*?)(?=(?:-|\\*\\*|\\n|$))`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

interface SuggestedTask {
  nombre_tarea: string;
  tipo_tarea: string;
  minutos: number;
  descripcion: string;
  orden: number;
}

function extractTasksFromText(text: string): SuggestedTask[] {
  const tasks: SuggestedTask[] = [];
  const regex = /(?:-|\\d+\\.)\\s+\\*\\*(Calentamiento|Rondo|Ejercicio|Partido|Vuelta a la calma)\\*\\*:?\\s*([\\s\\S]*?)(?=(?:-|\\d+\\.\\s+\\*\\*|$))/gi;
  let match;
  let orden = 0;

  while ((match = regex.exec(text)) !== null) {
    tasks.push({
      nombre_tarea: match[1],
      tipo_tarea: match[1],
      minutos: 15,
      descripcion: match[2].trim(),
      orden: orden++
    });
  }

  return tasks;
}
