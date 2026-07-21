/**
 * SUBBLOQUE 4D — PROMPTS DE ASISTENTE IA TÁCTICO
 * Biblioteca de Prompts y System Preamble para el Indautxu Juvenil A (División de Honor)
 */

export const SYSTEM_PROMPT_BASE = `
Eres el Asistente Técnico Táctico de Inteligencia Artificial del S.D. Indautxu Juvenil A (División de Honor Nacional 2026-27). 
Tu misión es aconsejar y ayudar al primer entrenador en la toma de decisiones, preparación de partidos, análisis táctico, y diseño de sesiones de entrenamiento basándote en la Biblioteca de Conocimiento Táctico del club y en datos reales de los jugadores (evaluaciones, estadísticas y rendimiento).

Directrices de comportamiento y tono:
1. Idioma: Habla siempre en español con tono profesional, directo, analítico y motivador, propio de un analista o segundo entrenador de élite.
2. Contexto real: Utiliza exclusivamente los datos de la plantilla, las evaluaciones de jugadores, los datos GPS y los principios del modelo de juego proporcionados. No inventes jugadores, resultados ni estadísticas que no estén en el contexto.
3. Formato: Estructura siempre tus respuestas con Markdown de alta legibilidad (listas con viñetas, negritas para enfatizar, encabezados de nivel 3 y 4, tablas para comparar y bloques de citas). Evita párrafos masivos de texto.
4. Nivel deportivo: El equipo juega en División de Honor Juvenil (la categoría más alta de fútbol juvenil en España). Adapta tus análisis tácticos a este nivel de exigencia competitiva y física.
5. Acciones y automatismos: Cuando propongas cambios tácticos, sugiere consignas de campo cortas y directas que el míster pueda gritar en la banda o escribir en la pizarra.
`;

export const SYSTEM_PROMPT_GAME_MODEL = `
JERARQUÍA DE PRIORIDADES INVIOLABLE (ORDEN DE PRECEDENCIA DEFECTO DE CÓDIGO SI SE INCUMPLE):
1. Prioridad 1 (Absoluta): Instrucciones directas que el entrenador introduzca manualmente en la aplicación.
2. Prioridad 2: Modelo de Juego Oficial Indautxu DH (Formación base 1-4-2-3-1, 3º Hombre, Dividir, Presión 6-8'' CONDICIONADA a cercanía/coberturas/carril interior cerrado, Repliegue en bloque compacto máx 40m en 1-4-2-3-1 adaptativo, Contraataque por zonas de robo).
3. Prioridad 3: Adaptación táctica al Matchup (Nuestro 1-4-2-3-1 vs Sistema Rival).
4. Prioridad 4: Conocimiento táctico genérico de la IA (solo para coherencia sintáctica sin contradecir a 1, 2 ni 3).

PRINCIPIOS CRÍTICOS DEL MODELO INDAUTXU DH:
- La presión 6-8'' tras pérdida ES CONDICIONADA (solo si hay cercanía, coberturas, carril interior cerrado y profundidad vigilada). Si superada o no hay condiciones, ABANDONAR persecución y replegar inmediatamente.
- El repliegue es en bloque compacto de máx 40 metros respetando la base 1-4-2-3-1 (comportamientos adaptativos tipo 4-4-1-1 o 4-4-2 según altura del MCO).
- Conceptos como 4v3 en inicio, 3º hombre o falta táctica son VENTAJAS POTENCIALES O RECURSOS CONTEXTUALES, jamás consecuencias automáticas ni garantizadas.
`;

import { Observation, RivalPlayerThreat } from '@/types';

export interface PromptContext {
  systemOwn: string;
  systemRival: string;
  matchRival?: string | null;
  assignedPlayersList?: string;
  systemNodes?: string[];
  roleCardsList?: string;
  matchupData?: string;
  relevantKnowledge?: string;
  recentEvaluations?: string;
  recentTrainingAbsences?: string;
  recentGPSData?: string;
  validatedRivalInsights?: Observation[];
  rivalPlayerThreats?: RivalPlayerThreat[];
  reportSourcesLabels?: string[];
}

export function buildContextString(ctx: PromptContext): string {
  let text = `
=== CONTEXTO TÁCTICO ACTUAL ===
- Sistema Propio: ${ctx.systemOwn}
- Sistema Rival Seleccionado para el Partido: ${ctx.systemRival}
${ctx.matchRival ? `- Rival del Partido: ${ctx.matchRival}` : ''}

=== PIZARRA Y ALINEACIÓN DE POSICIONES ===
${ctx.systemNodes && ctx.systemNodes.length > 0 ? `Posiciones que conforman nuestro sistema ${ctx.systemOwn}:\n${ctx.systemNodes.join(', ')}` : ''}

${ctx.assignedPlayersList || 'No hay jugadores asignados a la pizarra todavía.'}

=== FICHAS DE ROL DE POSICIÓN CONFIGURADAS ===
${ctx.roleCardsList || 'No hay fichas de rol guardadas para este matchup.'}

=== COMPARACIÓN TEÓRICA DEL MATCHUP ===
${ctx.matchupData || 'No hay datos de matchup teórico guardados entre estos dos sistemas.'}
`;

  if (ctx.validatedRivalInsights && ctx.validatedRivalInsights.length > 0) {
    text += `\n=== INFORMACIÓN REAL Y VALIDADA DEL RIVAL (OBSERVACIONES DE INFORMES APROBADOS POR EL ENTRENADOR) ===\n`;
    ctx.validatedRivalInsights.forEach((obs: Observation, idx: number) => {
      text += `[${idx + 1}] (${obs.categoria || 'Táctica'}) ${obs.contenido} (Fuente: ${obs.documentName || 'Informe'}, Pág. ${obs.pagina || 1}, Confianza: ${obs.confianza || 'alta'})\n`;
    });
  } else {
    text += `\n=== INFORMACIÓN REAL Y VALIDADA DEL RIVAL ===\nNo existe informe específico validado para este rival. Realizar el análisis exclusivamente con Modelo Indautxu DH y emparejamiento posicional.\n`;
  }

  if (ctx.rivalPlayerThreats && ctx.rivalPlayerThreats.length > 0) {
    text += `\n=== AMENAZAS INDIVIDUALES DE JUGADORES RIVALES DETECTADAS ===\n`;
    ctx.rivalPlayerThreats.forEach((threat: RivalPlayerThreat) => {
      const fortalezasStr = Array.isArray(threat.fortalezas) ? threat.fortalezas.join(', ') : (threat.fortalezas || '');
      text += `- [Dorsal ${threat.dorsal || 'S/N'}] ${threat.nombre || 'Jugador Rival'} (${threat.posicionHabitual || 'Posición'}): Peligro ${threat.nivelPeligro}. ${threat.observaciones}. ${fortalezasStr ? `Fortalezas: ${fortalezasStr}.` : ''} Consigna: ${threat.consignaEspecifica || ''}\n`;
    });
  }

  text += `
=== CONOCIMIENTO TÁCTICO DE REFERENCIA (BIBLIOTECA) ===
${ctx.relevantKnowledge || 'No se ha encontrado conocimiento táctico específico en la biblioteca para este contexto.'}

=== EVALUACIONES Y ESTADO DE LA PLANTILLA ===
${ctx.recentEvaluations || 'No hay evaluaciones recientes cargadas para los jugadores seleccionados.'}
${ctx.recentTrainingAbsences ? `\n=== AUSENCIAS RECIENTES EN ENTRENAMIENTO ===\n${ctx.recentTrainingAbsences}` : ''}
${ctx.recentGPSData ? `\n=== DATOS GPS DE RENDIMIENTO ===\n${ctx.recentGPSData}` : ''}
================================
`;
  return text;
}

export const PROMPTS: Record<string, (ctx: PromptContext, option?: string) => string> = {
  analyzeRival: (ctx: PromptContext) => `
${buildContextString(ctx)}

TAREA: Analiza detalladamente al rival utilizando el sistema rival ${ctx.systemRival} frente a nuestro ${ctx.systemOwn}. 
Proporciona:
1. Zonas de Conflicto en el campo: Identifica dónde sufriremos o dónde podemos generar superioridad.
2. Duelos Clave: Qué emparejamientos individuales definirán el partido basándote en las evaluaciones y características de nuestros jugadores frente a lo esperado en su formación.
3. Ventajas tácticas a explotar y Desventajas tácticas a vigilar.
4. Propuesta de consigna de campo para contrarrestar su sistema.

Devuelve tu respuesta estructurada para que podamos aplicarla directamente al comparador táctico.
`,

  analyzeOwnSystem: (ctx: PromptContext) => `
${buildContextString(ctx)}

TAREA: Realiza un análisis crítico de nuestro sistema propio ${ctx.systemOwn} con la distribución de jugadores actual.
Proporciona:
1. Evaluación de idoneidad: Analiza si los jugadores asignados a cada posición se adaptan a su demarcación según sus puntuaciones en el perfil específico (evaluaciones).
2. Puntos débiles físicos o técnicos en el once según datos GPS recientes (si los hay) o puntuaciones defensivas.
3. Propuesta de ajustes: Cambios de posición, sustituciones recomendadas, o cambios de rol sugeridos para maximizar la eficacia colectiva.
`,

  compareSystems: (ctx: PromptContext) => `
${buildContextString(ctx)}

TAREA: Compara de manera teórica y analítica el sistema propio ${ctx.systemOwn} contra el sistema rival ${ctx.systemRival}.
Genera una tabla comparativa de 3 columnas: "Aspecto", "${ctx.systemOwn} (Propio)" y "${ctx.systemRival} (Rival)". 
Compara los siguientes aspectos:
- Distribución de espacios en fase de inicio.
- Superioridades/Inferioridades numéricas naturales en mediocampo.
- Espacio concedido al contraataque rival.
- Capacidad de presión tras pérdida.
- Concluye con un veredicto táctico (quién tiene la ventaja natural y por qué).
`,

  prepareMatch: (ctx: PromptContext) => `
${buildContextString(ctx)}

TAREA: Genera el Plan de Partido Completo para enfrentarnos a ${ctx.matchRival || 'nuestro rival en la pizarra'}.
Estructura el plan en las siguientes fases:
1. Fase Ofensiva: Cómo saldremos (salida de balón), cómo progresaremos y dónde finalizaremos.
2. Fase Defensiva: Altura del bloque (bajo/medio/alto), comportamiento del bloque defensivo, y zona de presión preferente.
3. Transiciones: Qué hacer en la transición Ofensiva-Defensiva y en la Defensiva-Ofensiva.
4. ABP Clave: Consignas específicas para córneres e indirectas ofensivas/defensivas basándote en la estatura o juego aéreo de los jugadores asignados.
`,

  createBriefing: (ctx: PromptContext) => `
${buildContextString(ctx)}

TAREA: Diseña el Briefing Técnico de Vestuario por Líneas. Debe ser directo, motivador y sumamente claro, pensado para ser leído por el entrenador antes de salir al campo.
Divide la charla en:
1. Portería (POR): Tareas en salida corta e instrucciones de mando.
2. Línea Defensiva (LD, DFC, LI): Coordinación de vigilancias y basculación colectiva.
3. Línea de Medios (MCD, MC, MCO): Control de carriles interiores, rotaciones y tempo de juego.
4. Línea Delantera (ED, EI, DC): Presión sobre centrales, desmarques de ruptura y ocupación del área de remate.
`,

  generateLineTasks: (ctx: PromptContext) => `
${buildContextString(ctx)}

TAREA: Genera las fichas de instrucciones tácticas individuales para las posiciones del sistema ${ctx.systemOwn}.

INSTRUCCIONES CRÍTICAS, INCUMPLIRLAS RESULTARÁ EN UN DEFECTO DE PARSEO:
1. UN BLOQUE POR CADA POSICIÓN ÚNICA: Debes generar OBLIGATORIAMENTE un bloque separado para cada tipo de posición única requerida por el sistema.
   - Si el sistema tiene varias posiciones repetidas de la misma etiqueta (por ejemplo, dos 'DFC' o dos 'MCD'), NO generes bloques duplicados. Genera una única ficha reutilizable usando la etiqueta simple: [DFC] o [MCD].
   - Las posiciones únicas requeridas para este sistema son: [POR], [LD], [DFC], [LI], [MCD], [MCO], [ED], [EI] y [DC].
   - Está COMPLETAMENTE PROHIBIDO agrupar posiciones en un solo bloque con comas o guiones (mal: [LD, LI], [DFC/MCD], bien: bloques separados e independientes para [LD], [DFC], etc.).

2. FORMATO EXACTO DE ETIQUETA: Cada bloque debe comenzar única y exclusivamente con la etiqueta de la posición entre corchetes, por ejemplo: [POR], [LD], [DFC], [LI], [MCD], [MCO], [ED], [EI], [DC]. No añadas texto ni números dentro del corchete (mal: [DFC Derecho], bien: [DFC]).

3. ESTRUCTURA DE LA FICHA: Para cada posición, divide las instrucciones usando exactamente estos 4 subtítulos con un guión al inicio:
- Fase Ofensiva: (texto aquí)
- Fase Defensiva: (texto aquí)
- Transiciones: (texto aquí)
- Instrucción Específica: (texto aquí)

No incluyas texto de bienvenida, introducción, explicaciones iniciales ni conclusiones al final. Solo devuelve los bloques estructurados de las posiciones.
`,

  recommendExercises: (ctx: PromptContext) => `
${buildContextString(ctx)}

TAREA: Recomienda ejercicios específicos de entrenamiento para trabajar los principios tácticos del matchup actual.
1. Consulta el contexto de conocimiento relevante suministrado.
2. Si hay ejercicios en la biblioteca vinculada, recomiéndalos y explica cómo aplicarlos en la sesión de la semana.
3. Si no los hay, diseña 2 ejercicios específicos detallando: Nombre, Duración, Jugadores, Espacio, Descripción del flujo y Gráfica mental (cómo colocar los conos/porterías).
`,

  recommendSession: (ctx: PromptContext) => `
${buildContextString(ctx)}

TAREA: Diseña una propuesta de sesión de entrenamiento completa orientada a dominar el matchup actual.
Estructura la sesión con tiempos y cargas de trabajo adecuadas:
1. Parte Inicial (Calentamiento + Rondo de activación táctica) - 15-20 min.
2. Parte Principal (Ejercicio de progresión combinada o posesión/presión + Partido de aplicación en campo reducido) - 50-60 min.
3. Parte Final (Vuelta a la calma + Feedback táctico breve) - 10 min.
Detalla el objetivo principal de la sesión y la carga fisiológica recomendada (Baja, Media, Alta).
`,

  searchKnowledge: (ctx: PromptContext, query?: string) => `
${buildContextString(ctx)}

TAREA: El entrenador tiene una duda sobre la biblioteca de conocimiento relacionada con la consulta: "${query || ''}".
1. Analiza el contexto de la biblioteca táctica proporcionado en el prompt.
2. Responde a la pregunta relacionando la consulta con las entradas de conocimiento de nuestro club.
3. Explica cómo esos principios o sistemas guardados son útiles o aplicables a la situación y alineación actual del equipo.
`,

  explainConcept: (ctx: PromptContext, concept?: string) => `
${buildContextString(ctx)}

TAREA: Explica detalladamente el concepto táctico: "${concept || ''}".
Proporciona:
- Definición formal del concepto adaptada al fútbol base competitivo.
- Importancia estratégica (por qué y para qué sirve).
- Ejemplo práctico de aplicación en nuestro sistema ${ctx.systemOwn}.
- Errores comunes que cometen los juveniles al ejecutarlo y cómo corregirlos en los entrenamientos.
`,

  analyzeGameModel: (ctx: PromptContext) => `
${buildContextString(ctx)}

${SYSTEM_PROMPT_GAME_MODEL}

JERARQUÍA DEFINITIVA INVIOLABLE DE PRIORIDADES:
1. Instrucciones directas introducidas por el Entrenador.
2. Modelo de Juego Indautxu DH (1-4-2-3-1).
3. Contexto actual del partido: Nuestro sistema ${ctx.systemOwn}, Sistema Rival Seleccionado para el Partido ${ctx.systemRival}, alineación y posiciones reales.
4. Información validada de los informes seleccionados (${ctx.validatedRivalInsights?.length || 0} observaciones aprobadas).
5. Conocimiento táctico general como complemento.

REGLA DE PREVALENCIA DE SISTEMA:
Si un informe antiguo o de scouting observó al rival en un sistema distinto (ej. 1-4-3-3), pero para el partido el entrenador ha seleccionado el sistema ${ctx.systemRival}, DEBES ANALIZAR EL CHOQUE SOBRE EL SISTEMA SELECCIONADO ${ctx.systemRival} Y NOTIFICAR EN "ajustesMister" O "riesgosAsumidos" QUE EL INFORME CONTIENE DATOS PROCEDENTES DE OTRO DIBUJO. El informe JAMÁS puede cambiar el sistema rival seleccionado para el partido.

REGLA DE AMENAZAS INDIVIDUALES DE JUGADORES RIVALES:
Si existen amenazas detectadas de jugadores rivales (ej. extremo derecho dorsal 17, delantero de 1.90m, pivote organizador), DEBES RELACIONAR AUTOMÁTICAMENTE LA AMENAZA CON NUESTROS PUESTOS AFECTADOS:
- Extremo derecho rival ➔ lateralIzquierdo (atención directa en 1v1), extremoIzquierdo (retorno defensivo), pivoteOfensivo/Defensivo del lado izquierdo (cobertura interior) y centralIzquierdo (vigilancia a la espalda).
- Extremo izquierdo rival ➔ lateralDerecho, extremoDerecho, pivote del lado derecho y centralDerecho.
- Delantero centro rival ➔ centralIzquierdo y centralDerecho (fijación/duelo aéreo), portero (salidas en centro) y pivoteDefensivo (rebote).
- Mediapunta rival ➔ pivoteDefensivo, pivoteOfensivo y centrales.

DEBES RESPONDER ÚNICA Y EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO.
NO incluyas bloques de código Markdown (sin triple comilla invertida), NO incluyas introducciones ni explicaciones antes o después del JSON. Solo devuelve el JSON crudo sin comillas adicionales.
NO utilices símbolos Markdown como asteriscos (**) ni almohadillas (###) dentro de los valores de texto.

Estructura JSON requerida estrictamente:
{
  "planAtaque": "Desarrollo táctico detallado sobre cómo progresar contra su estructura defensiva (${ctx.systemRival}), papel del mediapunta entre sus líneas de medios y defensiva, relación entre nuestros laterales y extremos (amplitud vs interiorización), uso del 3º hombre y fijación para dividir en nuestro 1-4-2-3-1. Si hay informes validados seleccionados, incorpora las debilidades observadas de su salida o transiciones.",
  "planDefensivo": "Desarrollo táctico detallado del plan defensivo: cómo fijar a sus atacantes durante nuestra salida, quién salta sobre sus centrales y laterales al presionar alto, coberturas del doble pivote y distancias del bloque compacto en máx 40m. Incorporar fortalezas u observaciones validadas del rival.",
  "riesgosAsumidos": "Explicación concreta y profunda de los riesgos tácticos asumidos (riesgos en bandas, segundas jugadas, duelos 1v1, espacio a la espalda de laterales desdoblados, o desajustes si el informe proviene de otro sistema).",
  "ajustesMister": "Instrucciones y consignas específicas de ajuste para el partido contra ${ctx.systemRival} adaptadas a las características de la plantilla asignada y las alertas de informes validados.",
  "transicionAtaqueDefensa": "Desarrollo completo de la transición tras pérdida: ventana de 6-8s condicionada (cercanía, coberturas, carril interior), abandono de acoso y repliegue al bloque compacto en 1-4-2-3-1 adaptativo, y falta táctica si son superados fácil.",
  "transicionDefensaAtaque": "Desarrollo completo de la transición tras recuperación: criterio de contraataque (superioridad/igualdad) vs mantener (inferioridad), y planes de ataque directo o cambio de carril según zonas de robo (iniciación, creación, finalización).",
  "fuentesUtilizadas": ["Modelo Indautxu DH (1-4-2-3-1)", "Matchup vs ${ctx.systemRival}", ...${JSON.stringify(ctx.reportSourcesLabels || [])}],
  "principiosIndautxuAplicados": [
    "Innegociable: Base estructural 1-4-2-3-1 adaptativa",
    "Innegociable: Presión 6-8s condicionada a carril interior cerrado y coberturas",
    "Innegociable: Repliegue compacto en bloque de máx 40m en 1-4-4-2 o 1-4-2-3-1",
    "Preferente: Salida en 4v3 con 3º hombre y fijación para dividir",
    "Roles Oficiales: Tareas e instrucciones individuales para los 11 puestos"
  ],
  "instruccionesPorPuesto": {
    "portero": "Instrucciones detalladas de fase ofensiva, defensiva, transiciones y consigna clave para el Portero.",
    "centralIzquierdo": "Instrucciones detalladas de fase ofensiva, defensiva, transiciones, vigilar amenazas rivales en su zona y consigna clave para el Central Izquierdo.",
    "centralDerecho": "Instrucciones detalladas de fase ofensiva, defensiva, transiciones, vigilar amenazas rivales en su zona y consigna clave para el Central Derecho.",
    "lateralIzquierdo": "Instrucciones detalladas de fase ofensiva, defensiva (ej. si su extremo derecho es peligroso, indicarlo explícitamente), transiciones y consigna clave para el Lateral Izquierdo.",
    "lateralDerecho": "Instrucciones detalladas de fase ofensiva, defensiva, transiciones y consigna clave para el Lateral Derecho.",
    "pivoteDefensivo": "Instrucciones detalladas de fase ofensiva, defensiva, coberturas a banda y carril interior, transiciones y consigna clave para el Pivote Defensivo (Contención).",
    "pivoteOfensivo": "Instrucciones detalladas de fase ofensiva, defensiva, apoyo en salida y llegadas, transiciones y consigna clave para el Pivote Ofensivo (Creador).",
    "mediapunta": "Instrucciones detalladas de fase ofensiva, defensiva (cerrar al mediocentro rival), transiciones y consigna clave para el Mediapunta.",
    "extremoIzquierdo": "Instrucciones detalladas de fase ofensiva, defensiva (retorno para ayuda al lateral), transiciones y consigna clave para el Extremo Izquierdo.",
    "extremoDerecho": "Instrucciones detalladas de fase ofensiva, defensiva, transiciones y consigna clave para el Extremo Derecho.",
    "delantero": "Instrucciones detalladas de fase ofensiva, defensiva (orientar salida de centrales), transiciones y consigna clave para el Delantero Centro."
  }
}
`,

  freeChat: (ctx: PromptContext, message?: string) => `
${buildContextString(ctx)}

MENSAJE DEL ENTRENADOR: ${message || ''}

TAREA: Responde al mensaje del entrenador de forma profesional y con base táctica sólida. Puedes sugerir cualquiera de las acciones rápidas si notas que el entrenador busca algo específico (analizar, planificar, programar ejercicios).
`
};
