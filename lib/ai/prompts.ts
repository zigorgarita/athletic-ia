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
}

export function buildContextString(ctx: PromptContext): string {
  return `
=== CONTEXTO TÁCTICO ACTUAL ===
- Sistema Propio: ${ctx.systemOwn}
- Sistema Rival: ${ctx.systemRival}
${ctx.matchRival ? `- Rival del Partido: ${ctx.matchRival}` : ''}

=== PIZARRA Y ALINEACIÓN DE POSICIONES ===
${ctx.systemNodes && ctx.systemNodes.length > 0 ? `Posiciones que conforman nuestro sistema ${ctx.systemOwn}:\n${ctx.systemNodes.join(', ')}` : ''}

${ctx.assignedPlayersList || 'No hay jugadores asignados a la pizarra todavía.'}

=== FICHAS DE ROL DE POSICIÓN CONFIGURADAS ===
${ctx.roleCardsList || 'No hay fichas de rol guardadas para este matchup.'}

=== COMPARACIÓN TEÓRICA DEL MATCHUP ===
${ctx.matchupData || 'No hay datos de matchup teórico guardados entre estos dos sistemas.'}

=== CONOCIMIENTO TÁCTICO DE REFERENCIA (BIBLIOTECA) ===
${ctx.relevantKnowledge || 'No se ha encontrado conocimiento táctico específico en la biblioteca para este contexto.'}

=== EVALUACIONES Y ESTADO DE LA PLANTILLA ===
${ctx.recentEvaluations || 'No hay evaluaciones recientes cargadas para los jugadores seleccionados.'}
${ctx.recentTrainingAbsences ? `\n=== AUSENCIAS RECIENTES EN ENTRENAMIENTO ===\n${ctx.recentTrainingAbsences}` : ''}
${ctx.recentGPSData ? `\n=== DATOS GPS DE RENDIMIENTO ===\n${ctx.recentGPSData}` : ''}
================================
`;
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

TAREA: Genera las fichas de instrucciones tácticas individuales para TODOS los puestos del sistema ${ctx.systemOwn}.
El sistema actualmente desplegado en la pizarra contiene exactamente las siguientes posiciones: ${ctx.systemNodes ? ctx.systemNodes.join(', ') : 'No definidas'}.

INSTRUCCIONES CRÍTICAS:
1. GENERACIÓN COMPLETA: Debes generar obligatoriamente una sección para CADA UNA de las posiciones listadas arriba. Ninguna posición debe quedar sin instrucciones.
2. FORMATO EXACTO: Cada sección debe comenzar con la etiqueta de la posición entre corchetes, exactamente como aparece en la lista (ejemplo: [POR], [DCD], [MVI], [CAD]).
3. CONTEXTO TÁCTICO: Las instrucciones no deben ser genéricas. Deben estar altamente personalizadas basándose en:
   - El sistema de juego propio (${ctx.systemOwn}) y su encaje contra el sistema rival (${ctx.systemRival}).
   - La relación de la posición con sus compañeros de línea (ej. cómo escalona el MCD con los interiores o cómo saltan los centrales).
   - El modelo de juego y principios tácticos del equipo (consulta la sección de Conocimiento Táctico de Referencia).
   - Las características de los jugadores asignados a esa posición (consulta la sección de Alineación).
4. ESTRUCTURA DE LA FICHA: Para cada posición, divide las instrucciones en estas 4 sub-secciones explícitas:
   - **Fase Ofensiva**: Posicionamiento, alturas y roles con balón.
   - **Fase Defensiva**: Altura del bloque, saltos de presión, vigilancias y coberturas.
   - **Transiciones**: Qué hacer inmediatamente al robar o perder el balón.
   - **Instrucción Específica**: Un detalle clave para el partido o el jugador (ej. un duelo individual o precaución).

Genera únicamente las fichas de rol, asegurando que si hay 11 posiciones listadas, generes 11 fichas distintas y específicas.
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

  freeChat: (ctx: PromptContext, message?: string) => `
${buildContextString(ctx)}

MENSAJE DEL ENTRENADOR: ${message || ''}

TAREA: Responde al mensaje del entrenador de forma profesional y con base táctica sólida. Puedes sugerir cualquiera de las acciones rápidas si notas que el entrenador busca algo específico (analizar, planificar, programar ejercicios).
`
};
