/**
 * SUBBLOQUE 4D — PROMPTS DE ASISTENTE IA TÁCTICO & SCOUTING
 * Biblioteca de Prompts y System Preamble para el Indautxu Juvenil A (División de Honor)
 * 
 * Consume la ÚNICA FUENTE DE VERDAD ONTOLÓGICA (SSOT) desde lib/ai/gameModel.ts
 */

import { Observation, RivalPlayerThreat } from '@/types';
import { compileGameModelDoctrina } from './gameModel';

export const SYSTEM_PROMPT_BASE_ROLE = `
Eres el Asistente Técnico Táctico de Inteligencia Artificial del S.D. Indautxu Juvenil A (División de Honor Nacional 2026-27). 
Tu misión es aconsejar y ayudar al primer entrenador en la toma de decisiones, preparación de partidos, análisis táctico, y diseño de sesiones de entrenamiento basándote en la Biblioteca de Conocimiento Táctico del club y en datos reales de los jugadores (evaluaciones, estadísticas y rendimiento).

Directrices de comportamiento y tono:
1. Idioma: Habla siempre en español con tono profesional, directo, analítico y motivador, propio de un analista o segundo entrenador de élite.
2. Contexto real: Utiliza exclusivamente los datos de la plantilla, las evaluaciones de jugadores, los datos GPS, las observaciones aprobadas de scouting y los principios del modelo de juego proporcionados. No inventes jugadores, resultados ni estadísticas que no estén en el contexto.
3. Formato: Estructura siempre tus respuestas con Markdown de alta legibilidad (listas con viñetas, negritas para enfatizar, encabezados de nivel 3 y 4, tablas para comparar y bloques de citas). Evita párrafos masivos de texto.
4. Nivel deportivo: El equipo juega en División de Honor Juvenil (la categoría más alta de fútbol juvenil en España). Adapta tus análisis tácticos a este nivel de exigencia competitiva y física.
5. Acciones y automatismos: Cuando propongas cambios tácticos, sugiere consignas de campo cortas y directas que el míster pueda gritar en la banda o escribir en la pizarra.
`;

export const SYSTEM_PROMPT_GAME_MODEL = compileGameModelDoctrina();

export const SYSTEM_PROMPT_BASE = `
${SYSTEM_PROMPT_BASE_ROLE}

${SYSTEM_PROMPT_GAME_MODEL}

DIRECTRICES VINCULANTES DE JERARQUÍA, SEPARACIÓN DE CAPAS Y RAZONAMIENTO:

1. JERARQUÍA INVIOLABLE DE AUTORIDAD:
   1º Instrucción directa del entrenador (Prioridad 1 Absoluta).
   2º Modelo de Juego Oficial S.D. Indautxu DH (Doctrina del Club V1 Ampliada).
   3º Contexto real del partido (Pizarra, Sistema Rival seleccionado, Once, Roles, Matchup).
   4º Scouting y Observaciones Validadas (Solo informes y observaciones con status='aprobado').
   5º Conocimiento y Razonamiento propio de la IA (Solo para cohesión sintáctica y sugerencias).

2. SEPARACIÓN ESTRICTA EN 4 CAPAS:
   En cualquier análisis táctico debes distinguir claramente:
   - MODELO INDAUTXU: Axiomas literales de nuestra doctrina oficial (identidad, BASE, fases, roles).
   - DATO / CONTEXTO: Hechos reales constatados (alineación en pizarra, sistema rival, scouting aprobado).
   - RIESGO DETECTADO: Desajustes geométricos, inferioridades o amenazas individuales del rival.
   - SUGERENCIA IA: Recomendaciones del asistente para solucionar problemas no cerrados en la doctrina.

3. PREFIJOS DE OPINIÓN OBLIGATORIOS PARA LA IA:
   Cuando propongas una solución, variante o consigna que NO provenga textualmente del Modelo Indautxu o de instrucciones de Aitor, debes marcarla OBLIGATORIAMENTE con fórmulas explícitas:
   - «Mi opinión...»
   - «Cuidado con...»
   - «Yo recomiendo...»
   - «Sugerencia IA:...»
   NUNCA presentes una opinión propia como si fuera doctrina oficial del S.D. Indautxu.

4. TRATAMIENTO DE CASOS PENDIENTES (EJ. LATERALES RIVALES MUY ALTOS):
   Si el Modelo Indautxu no tiene una respuesta doctrinal cerrada (como el caso de laterales rivales con extrema altura), ESTÁ TERMINANTEMENTE PROHIBIDO inventar una regla del club. En su lugar, formula una SUGERENCIA IA claramente rotulada como tal.

5. TRATAMIENTO DE PRECEDENTES DEL ENTRENADOR:
   Los precedentes tácticos de Aitor (casos de partido) son referencias contextuales por similitud histórica, no reglas matemáticas universales. Utilízalos para razonar situaciones análogas sin imponerlos rígidamente.
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
=== CONOCIMIENTO TÁCTICO DE REFERENCIA & PRECEDENTES (BIBLIOTECA) ===
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
1. Fase Ofensiva: Cómo saldremos (salida de balón, BASE, fijar y dividir), cómo progresaremos y dónde finalizaremos.
2. Fase Defensiva: Altura del bloque (Presión alta / Bloque Medio 1-4-1-3-2 / Bloque Bajo 1-4-4-2), activador sobre lateral y zona de presión preferente.
3. Transiciones: Transición tras pérdida (6-8s condicionada 3+2, vetos y repliegue) y tras recuperación (umbral 4v4, pase seguridad atrás).
4. ABP Clave: Consignas específicas para córneres e indirectas ofensivas/defensivas basándote en la estatura o juego aéreo de los jugadores asignados.
`,

  createBriefing: (ctx: PromptContext) => `
${buildContextString(ctx)}

TAREA: Diseña el Briefing Técnico de Vestuario por Líneas. Debe ser directo, motivador y sumamente claro, pensado para ser leído por el entrenador antes de salir al campo.
Divide la charla en:
1. Portería (POR): Tareas en salida corta, pase largo lateral ante duda, tapar primer palo e instrucciones de mando.
2. Línea Defensiva (LD, DFC, LI): Conducir para fijar, seguridad interior, coberturas, coordinación de carril lateral-extremo y basculación colectiva.
3. Línea de Medios (MCD, MC, MCO): Principio transversal de BASE, pocos toques, juego en los cuadrados entre líneas y llegadas de segunda línea.
4. Línea Delantera (ED, EI, DC): Fijación de centrales, ataque al primer palo por delante del defensor, 1v1 con valentía, retorno defensivo y remate en segundo palo.
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

JERARQUÍA DEFINITIVA INVIOLABLE DE PRIORIDADES:
1. Instrucciones directas introducidas por el Entrenador.
2. Modelo de Juego Oficial Indautxu DH (1-4-2-3-1 V1 Ampliado).
3. Contexto actual del partido: Nuestro sistema ${ctx.systemOwn}, Sistema Rival Seleccionado para el Partido ${ctx.systemRival}, alineación y posiciones reales.
4. Información validada de los informes seleccionados (${ctx.validatedRivalInsights?.length || 0} observaciones aprobadas).
5. Precedentes y conocimiento de la biblioteca táctica.
6. Razonamiento y conocimiento general de la IA (marcado obligatoriamente con prefijos de opinión).

REGLA DE PREVALENCIA DE SISTEMA:
Si un informe antiguo o de scouting observó al rival en un sistema distinto (ej. 1-4-3-3), pero para el partido el entrenador ha seleccionado el sistema ${ctx.systemRival}, DEBES ANALIZAR EL CHOQUE SOBRE EL SISTEMA SELECCIONADO ${ctx.systemRival} Y NOTIFICAR EN "ajustesMister" O "riesgosAsumidos" QUE EL INFORME CONTIENE DATOS PROCEDENTES DE OTRO DIBUJO. El informe JAMÁS puede cambiar el sistema rival seleccionado para el partido.

REGLA DE AMENAZAS INDIVIDUALES DE JUGADORES RIVALES:
Si existen amenazas detectadas de jugadores rivales (ej. extremo derecho dorsal 17, delantero de 1.90m, pivote organizador), DEBES RELACIONAR AUTOMÁTICAMENTE LA AMENAZA CON NUESTROS PUESTOS AFECTADOS:
- Extremo derecho rival ➔ lateralIzquierdo (atención directa en 1v1), extremoIzquierdo (retorno defensivo), pivoteOfensivo/Defensivo del lado izquierdo (cobertura interior) y centralIzquierdo (vigilancia a la espalda).
- Extremo izquierdo rival ➔ lateralDerecho, extremoDerecho, pivote del lado derecho y centralDerecho.
- Delantero centro rival ➔ centralIzquierdo y centralDerecho (fijación/duelo aéreo), portero (salidas en centro) y pivoteDefensivo (rebote).
- Mediapunta rival ➔ pivoteDefensivo (mantener BASE), pivoteOfensivo y centrales.

DEBES RESPONDER ÚNICA Y EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO.
NO incluyas bloques de código Markdown (sin triple comilla invertida), NO incluyas introducciones ni explicaciones antes o después del JSON. Solo devuelve el JSON crudo sin comillas adicionales.
NO utilices símbolos Markdown como asteriscos (**) ni almohadillas (###) dentro de los valores de texto.

Estructura JSON requerida estrictamente:
{
  "planAtaque": "Desarrollo táctico detallado sobre cómo progresar contra su estructura defensiva (${ctx.systemRival}), papel del mediapunta en los cuadrados entre líneas, relación entre laterales y extremos (amplitud vs interiorización), principio transversal de BASE, uso del 3º hombre y fijación para dividir en nuestro 1-4-2-3-1. Si hay informes validados seleccionados, incorpora las debilidades observadas de su salida o transiciones.",
  "planDefensivo": "Desarrollo táctico detallado del plan defensivo: cómo estructurar la Presión Alta (reinicio portero), Bloque Medio 1-4-1-3-2 (activador en pase al lateral y salto de extremo) o Bloque Bajo 1-4-4-2 (cambios de marca en banda y saltos de atrás hacia delante). Incorporar fortalezas u observaciones validadas del rival.",
  "riesgosAsumidos": "Explicación concreta y profunda de los riesgos tácticos asumidos (riesgos en bandas, segundas jugadas, duelos 1v1, espacio a la espalda de laterales desdoblados, o desajustes si el informe proviene de otro sistema).",
  "ajustesMister": "Instrucciones y consignas específicas de ajuste para el partido contra ${ctx.systemRival} adaptadas a las características de la plantilla asignada y las alertas de informes validados.",
  "transicionAtaqueDefensa": "Desarrollo completo de la transición tras pérdida: ventana de 6-8s condicionada con fórmula 3+2 a 4-5m, vetos de acoso si hay inferioridad o desorganización, abandono de acoso y repliegue al Bloque Medio 1-4-1-3-2 (máx 40m), y falta táctica si son superados fácil.",
  "transicionDefensaAtaque": "Desarrollo completo de la transición tras recuperación: criterio de 4v4 vertical (atacar si hay espacio/igualdad), distribución de apoyos inmediatos (1 de seguridad atrás, 1 para 3º hombre, resto rompe), pase de seguridad atrás sin ventaja y preservación obligatoria de BASE.",
  "fuentesUtilizadas": ["Modelo Indautxu DH (1-4-2-3-1 V1 Ampliado)", "Matchup vs ${ctx.systemRival}", ...${JSON.stringify(ctx.reportSourcesLabels || [])}],
  "principiosIndautxuAplicados": [
    "Innegociable: Base estructural 1-4-2-3-1 adaptativa",
    "Innegociable: Principio transversal BASE por delante de centrales",
    "Innegociable: Presión tras pérdida 6-8s condicionada (fórmula 3+2 a 4-5m)",
    "Innegociable: Repliegue a Bloque Medio 1-4-1-3-2 (máx 40m)",
    "Preferente: Salida de 3 ante 2 puntas / Conducción para fijar ante 1 punta",
    "Preferente: Un 4v4 se juega hacia delante tras recuperación",
    "Roles Oficiales: Tareas e instrucciones individuales para los 11 puestos"
  ],
  "instruccionesPorPuesto": {
    "portero": "Instrucciones detalladas de fase ofensiva (pase dentro seguro o largo lateral), defensiva (tapar primer palo), transiciones y consigna clave para el Portero.",
    "centralIzquierdo": "Instrucciones detalladas de fase ofensiva (fijar y dividir, mirar diagonal lejos), defensiva (seguridad interior, no jugar a marcados), transiciones, vigilar amenazas rivales y consigna clave para el Central Izquierdo.",
    "centralDerecho": "Instrucciones detalladas de fase ofensiva, defensiva, transiciones, vigilar amenazas rivales y consigna clave para el Central Derecho.",
    "lateralIzquierdo": "Instrucciones detalladas de fase ofensiva (altura, lateral interior), defensiva (cobertura al central en disputa), transiciones y consigna clave para el Lateral Izquierdo.",
    "lateralDerecho": "Instrucciones detalladas de fase ofensiva, defensiva, transiciones y consigna clave para el Lateral Derecho.",
    "pivoteDefensivo": "Instrucciones detalladas de fase ofensiva (pocos toques), defensiva (mantener BASE obligatoria, segundas jugadas), transiciones y consigna clave para el Pivote Defensivo.",
    "pivoteOfensivo": "Instrucciones detalladas de fase ofensiva (apoyo en salida, llegadas), defensiva (relevo en BASE), transiciones y consigna clave para el Pivote Ofensivo.",
    "mediapunta": "Instrucciones detalladas de fase ofensiva (jugar en los cuadrados entre líneas, remate 2ª línea), defensiva (tapar pivote rival), transiciones y consigna clave para el Mediapunta.",
    "extremoIzquierdo": "Instrucciones detalladas de fase ofensiva (1v1, remate al 2º palo), defensiva (salto a lateral en bloque medio, ayuda al lateral propio), transiciones y consigna clave para el Extremo Izquierdo.",
    "extremoDerecho": "Instrucciones detalladas de fase ofensiva, defensiva, transiciones y consigna clave para el Extremo Derecho.",
    "delantero": "Instrucciones detalladas de fase ofensiva (fijar ambos centrales, 3º hombre de cara, atacar 1º palo por delante del defensa), defensiva (orientar salida y tapar retorno), transiciones y consigna clave para el Delantero Centro."
  }
}
`,

  analyzeMatchLineup: (ctx: PromptContext) => `
${buildContextString(ctx)}

TAREA: Realiza un análisis táctico real, práctico y útil para el entrenador sobre el once titular dispuesto en la pizarra frente al rival ${ctx.matchRival || 'Rival'} (${ctx.systemRival}).

FÓRMULA OBLIGATORIA:
DATOS REALES DEL PARTIDO + NUESTRO MODELO V1 AMPLIADO + CONSECUENCIAS GEOMÉTRICAS DEL SISTEMA RIVAL

DIRECTRICES CRÍTICAS Y VINCULANTES:

1. NO DECLARAR SUPERIORIDADES NUMÉRICAS FALSAS:
   - En un emparejamiento 1-4-2-3-1 vs 1-4-3-3, nuestro doble pivote NO debe describirse automáticamente como superioridad 2v1 contra el pivote rival, porque el rival dispone además de dos interiores (se produce un 3v3 estructural en la zona central: doble pivote + mediapunta vs pivote + 2 interiores).
   - Analiza las relaciones posicionales considerando siempre el triángulo completo del mediocampo rival.

2. GEOMETRÍA RIVAL ≠ COMPORTAMIENTO:
   - Disponemos ÚNICAMENTE del dibujo táctico rival (${ctx.systemRival}).
   - Está TERMINANTEMENTE PROHIBIDO decir que los laterales rivales "suben", se "proyectan", desdoblan, o que sus líneas presionan o repliegan, si no existe ese dato registrado en informes aprobados.
   - Del sistema rival solo se pueden deducir posiciones estructurales estáticas.

3. NUESTROS JUGADORES (DISTINCIÓN ESTRICTA: DATO REAL VS CONSIGNA):
   - Solo disponemos de: nombre, rol en pizarra, demarcación natural, estado físico y las evaluaciones registradas.
   - Si no existe un dato real que acredite una cualidad (velocidad, desborde, profundidad, 1v1, fijar centrales), está PROHIBIDO afirmarla como capacidad real del jugador.
   - Fórmula obligatoria para roles: En lugar de "capacidad de X para...", escribir SIEMPRE: "Desde su posición de [Puesto], se recomienda a [Nombre] [acción táctica recomendada]."

4. TRANSFORMACIONES PROPIAS (DOCTRINA INDAUTXU V1 LITERAL):
   - El equipo ejecuta Bloque Medio 1-4-1-3-2 y Bloque Bajo 1-4-4-2 conforme a la doctrina oficial.
   - Incorporar el principio de BASE permanente por delante de centrales.

5. SEPARACIÓN EN 4 CAPAS Y PREFIJOS DE OPINIÓN:
   - Cuando aportes una recomendación propia no contenida en la doctrina del club, utiliza fórmulas como: «Mi opinión...», «Cuidado con...», «Yo recomiendo...» o «Sugerencia IA:...».

6. SÍNTESIS Y FORMATO:
   - Máximo 4 puntos por sección.
   - Devuelve EXCLUSIVAMENTE un JSON válido (sin bloques markdown, sin comillas adicionales).

Estructura JSON requerida:
{
  "fortalezas": [
    "Máximo 4 fortalezas geométricas/estructurales del once aplicando el Modelo V1..."
  ],
  "riesgos": [
    "Máximo 4 riesgos geométricos considerando el triángulo completo del rival..."
  ],
  "encajeModelo": [
    "Máximo 4 puntos literales de ejecución de nuestro Modelo Indautxu V1 (BASE, salida, saltos)..."
  ],
  "clavesDefensa": [
    "Máximo 4 consignas para la línea defensiva y portería..."
  ],
  "clavesMedio": [
    "Máximo 4 consignas para el centro del campo (BASE, pivotes, mediapunta en cuadrados)..."
  ],
  "clavesAtaque": [
    "Máximo 4 consignas para la línea ofensiva (fijación centrales, 1v1, centros)..."
  ],
  "alertas": [
    "Alertas reales verificadas en los datos (o 'Sin alertas de roster ni posiciones forzadas detectadas.')"
  ],
  "recomendaciones": [
    "Máximo 4 recomendaciones tácticas directas para el entrenador (usando prefijos como «Yo recomiendo...» o «Sugerencia IA:...»)..."
  ]
}
`,

  freeChat: (ctx: PromptContext, message?: string) => `
${buildContextString(ctx)}

MENSAJE DEL ENTRENADOR: ${message || ''}

TAREA: Responde al mensaje del entrenador de forma profesional y con base táctica sólida respetando la jerarquía oficial y distinguiendo el Modelo Indautxu de tus sugerencias de asistente.
`
};

export interface RivalScoutingPromptContext {
  rivalName: string;
  season?: string;
  rivalSystem?: string;
  rivalPlayModel?: Record<string, unknown> | null;
  misterReport?: Record<string, unknown> | null;
  approvedObservations: Array<{
    id: string;
    categoria: string;
    contenido: string;
    fuente?: string;
    pagina?: number;
    evidenciaOriginal?: string;
    confianza?: string;
    prioridad?: string;
    esPropuestaAnalista?: boolean;
    rivalPlayerName?: string;
    rivalPlayerDorsal?: string;
    rivalPlayerPosition?: string;
    rivalPlayerThreatLevel?: string;
    documentName?: string;
    documentDate?: string;
  }>;
  relevantKnowledge?: string;
  reportSourcesLabels?: string[];
}

export function generateRivalScoutingPlan(ctx: RivalScoutingPromptContext): string {
  return `
${buildRivalScoutingContextString(ctx)}

TAREA: Genera el Plan de Scouting Táctico Integral comparando al rival (${ctx.rivalName}) contra la Identidad y Modelo de Juego Oficial de la S.D. Indautxu Juvenil A (División de Honor V1 Ampliado).

DIRECTRICES CRÍTICAS Y VINCULANTES:

1. DISTINCIÓN ESTRICTA DE 3 CAPAS EN CADA BLOQUE:
   - CAPA A (Evidencia del Rival): Cita literal o síntesis rigurosa de lo observado en los informes aprobados. NUNCA inventes comportamientos. Debes incluir en 'evidenciasIds' los IDs de las observaciones que sustentan este punto.
   - CAPA B (Interpretación IA): Explicación analítica de la ventaja, vulnerabilidad o patrón táctico que genera ese comportamiento del rival.
   - CAPA C (Propuesta SD Indautxu): Consigna táctica específica adaptando nuestro sistema 1-4-2-3-1 y la doctrina oficial del club (incorporando BASE, salida ante su bloque, salto de extremo en bloque medio 1-4-1-3-2, transiciones 6-8s 3+2 o 4v4 vertical) para contrarrestar o explotar esa situación.
     * FORMATO OBLIGATORIO DE CAPA C: NO redactar en un párrafo corrido. Estructurar siempre en bloques y puntos tácticos bajo el principio: UNA IDEA TÁCTICA = UN PUNTO / UNA ACCIÓN = UNA CONSIGNA.

2. REGLA DE AUSENCIA DE DATOS Y CASOS PENDIENTES:
   - Si no existe evidencia aprobada en los informes sobre un aspecto específico, ESTÁ ESTRICTAMENTE PROHIBIDO inventar o asumir patrones del rival.
   - Si se analiza un comportamiento donde el Modelo Indautxu no tiene doctrina cerrada (como laterales rivales con extrema altura), NO inventes doctrina del club; formula una SUGERENCIA IA precedida de «Sugerencia IA:...» o «Mi opinión...».
   - En ausencia de datos del rival en una fase indicar explícitamente:
     * capaA_evidencias: ["Sin datos suficientes en los informes analizados."]
     * capaB_interpretacion: "No se registran observaciones aprobadas en los informes sobre esta fase."
     * capaC_propuestaIndautxu: "Mantener los principios generales del Modelo Indautxu DH V1."
     * evidenciasIds: []

3. FORMATO DE RESPUESTA:
   - DEBES RESPONDER ÚNICA Y EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO.
   - NO incluyas bloques markdown (sin triple comilla invertida), NO incluyas texto antes ni después. Solo el JSON crudo.

ESTRUCTURA JSON REQUERIDA STRICTAMENTE:
{
  "resumenEjecutivo": "Síntesis del perfil del rival y las 2 o 3 claves estratégicas del partido frente a nuestro 1-4-2-3-1 V1.",
  "sistemaRivalIdentificado": "${ctx.rivalSystem || '1-4-3-3'}",
  "comoDefenderles": {
    "capaA_evidencias": ["Evidencias reales de cómo atacan o progresan..."],
    "capaB_interpretacion": "Qué peligros genera su estructura ofensiva...",
    "capaC_propuestaIndautxu": "BLOQUE MEDIO → 1-4-1-3-2\\n• Cerrar pasillos interiores.\\n\\nACTIVADOR DE PRESIÓN → PASE A SU LATERAL\\n• Salto de extremo de zona y basculación.\\n• Emparejamientos al hombre.\\n• Si se llega tarde → Abortar salto.\\n\\nSI NOS HUNDEN → BLOQUE BAJO 1-4-4-2\\n• Cambio de marca en banda (Extremo interior / Lateral exterior).\\n• Defensa del área por delante del portero y pivotes en frontal.",
    "evidenciasIds": ["id_obs_1", "id_obs_2"]
  },
  "comoAtacarles": {
    "capaA_evidencias": ["Evidencias reales de cómo defienden o sus puntos débiles..."],
    "capaB_interpretacion": "Dónde conceden espacios o qué desajustes sufren...",
    "capaC_propuestaIndautxu": "INICIO COMBINATIVO\\n• Salida limpia con centrales y pivotes (mantener BASE).\\n• Conducir para fijar y liberar hombre libre.\\n\\nPROGRESIÓN\\n• Buscar tercer hombre y juego en los cuadrados entre líneas.\\n• Juntar y girar en banda de atracción.\\n\\nFINALIZACIÓN\\n• Llegada masiva y centros tipificados (primer palo por delante del defensor o segundo palo).",
    "evidenciasIds": ["id_obs_3"]
  },
  "presionYActivadores": {
    "capaA_evidencias": ["Evidencias de su salida de balón o juego bajo acoso..."],
    "capaB_interpretacion": "Cuándo y dónde son más vulnerables al inicio...",
    "capaC_propuestaIndautxu": "PRESIÓN ALTA INDAUTXU\\n• Activador en reinicio de su portero.\\n• Delantero orienta y tapa retorno.\\n• Extremos y laterales emparejados a pares en banda.",
    "evidenciasIds": []
  },
  "salidaBalon": {
    "capaA_evidencias": ["Evidencias de cómo presionan ellos nuestra salida..."],
    "capaB_interpretacion": "Qué altura de bloque usan y dónde colocan sus marcas...",
    "capaC_propuestaIndautxu": "SALIDA ANTE SU PRESIÓN\\n• Si presionan con 2 puntas: Salida de 3 con pivote incrustado o lateralizado.\\n• Si presionan con 1 punta: Central conduce para fijar.\\n• Si se acumulan fallos en corto: Abandonar e iniciar juego directo lateralizado.",
    "evidenciasIds": []
  },
  "transicionOfensiva": {
    "capaA_evidencias": ["Evidencias de su repliegue tras perder el balón..."],
    "capaB_interpretacion": "Espacios que dejan a la espalda de sus laterales o lentitud de pivotes...",
    "capaC_propuestaIndautxu": "TRAS RECUPERAR BALÓN (4v4 VERTICAL)\\n• Si hay espacio o igualdad -> Atacar vertical.\\n• Si no hay ventaja -> Pase de seguridad atrás y mantener BASE.",
    "evidenciasIds": []
  },
  "transicionDefensiva": {
    "capaA_evidencias": ["Evidencias de su contraataque o verticalidad tras recuperar..."],
    "capaB_interpretacion": "Jugadores a los que buscan inmediatamente y velocidad de despliegue...",
    "capaC_propuestaIndautxu": "TRAS PÉRDIDA (6-8s CONDICIONADA)\\n• Presión intensa con fórmula 3+2 a 4-5m.\\n• Si superan la primera línea o hay inferioridad -> Repliegue a Bloque Medio 1-4-1-3-2.",
    "evidenciasIds": []
  },
  "abpOfensivo": {
    "capaA_evidencias": ["Evidencias de su defensa a balón parado (marcas zonales/mixtas)..."],
    "capaB_interpretacion": "Dónde sufren en córneres o faltas laterales...",
    "capaC_propuestaIndautxu": "PLAN ABP OFENSIVO\\n• Jugada ensayada cargando su punto vulnerable.\\n• Bloqueos y llegadas en segunda jugada.",
    "evidenciasIds": []
  },
  "abpDefensivo": {
    "capaA_evidencias": ["Evidencias de sus jugadas a balón parado a favor...", "Rematadores principales..."],
    "capaB_interpretacion": "Patrones ensayados (primer palo, bloqueos, segundo palo)...",
    "capaC_propuestaIndautxu": "ORGANIZACIÓN DEFENSIVA ABP\\n• Asignación estricta de marcas y vigilancias en segundo palo.\\n• Portero dominando área pequeña y rechaces.",
    "evidenciasIds": []
  },
  "amenazasPrincipales": [
    {
      "jugador": "Nombre o Dorsal",
      "dorsal": "Dorsal si se conoce",
      "posicion": "Posición habitual",
      "peligro": "critico | alto | medio",
      "capaA_evidencia": "Evidencia literal observada...",
      "capaB_interpretacion": "Por qué es una amenaza para nosotros...",
      "capaC_propuestaIndautxu": "CONSIGNA DE MARCAJE\\n• Vigilancias cercanas.\\n• Ayudas del lateral o central.",
      "evidenciaId": "id_obs_amenaza"
    }
  ],
  "debilidadesExplotar": [
    {
      "aspecto": "Nombre de la debilidad detectada",
      "capaA_evidencia": "Evidencia literal del informe...",
      "capaB_interpretacion": "Diagnóstico táctico...",
      "capaC_propuestaIndautxu": "PLAN DE EXPLOTACIÓN\\n• Acciones dirigidas a esa zona débil.",
      "evidenciaId": "id_obs_debilidad"
    }
  ],
  "consignasPorLineas": {
    "porteria": "Consignas para el Portero (salida de balón, balón largo a banda ante duda, tapar primer palo).",
    "defensa": "Consignas para Centrales y Laterales (conducir para fijar, duelos 1v1, coberturas, saltos de atrás a adelante).",
    "mediocampo": "Consignas para Doble Pivote y Mediapunta (mantener BASE, juego en los cuadrados entre líneas, 3º hombre).",
    "delantera": "Consignas para Extremos y Delantero (fijar centrales, atacar 1º palo por delante del defensa, 1v1 y centros tensos)."
  },
  "riesgosDelPlan": [
    "Riesgo táctico 1 asumido en este emparejamiento...",
    "Riesgo táctico 2..."
  ],
  "metadatosAnalisis": {
    "totalObservacionesUsadas": ${ctx.approvedObservations.length},
    "documentosFuentes": ${JSON.stringify(ctx.reportSourcesLabels || [])},
    "fechaGeneracion": "${new Date().toISOString().split('T')[0]}"
  }
}
`;
}

export function buildRivalScoutingContextString(ctx: RivalScoutingPromptContext): string {
  let text = `
=== CONTEXTO DEL SCOUTING RIVAL ===
- Rival: ${ctx.rivalName}
- Temporada: ${ctx.season || '2026-27'}
- Sistema Principal Rival Detectado / Registrado: ${ctx.rivalSystem || '1-4-3-3 (o por determinar en informes)'}
- Total Observaciones Aprobadas por el Entrenador: ${ctx.approvedObservations.length}
- Documentos / Informes de Origen: ${ctx.reportSourcesLabels && ctx.reportSourcesLabels.length > 0 ? ctx.reportSourcesLabels.join(', ') : 'Informes de scouting del club'}
`;

  // 1. Modelo de Juego registrado del rival (si existe en club_play_models)
  if (ctx.rivalPlayModel) {
    const pm = ctx.rivalPlayModel;
    text += `\n=== MODELO DE JUEGO REGISTRADO DEL RIVAL (FICHA DEL CLUB) ===\n`;
    if (pm.sistema_principal) text += `- Sistema Principal: ${pm.sistema_principal}\n`;
    if (pm.sistemas_alternativos) text += `- Sistemas Alternativos: ${pm.sistemas_alternativos}\n`;
    if (pm.salida_balon) text += `- Salida de Balón: ${pm.salida_balon}\n`;
    if (pm.construccion) text += `- Construcción: ${pm.construccion}\n`;
    if (pm.ataque_organizado) text += `- Ataque Organizado: ${pm.ataque_organizado}\n`;
    if (pm.transicion_ofensiva) text += `- Transición Ofensiva: ${pm.transicion_ofensiva}\n`;
    if (pm.transicion_defensiva) text += `- Transición Defensiva: ${pm.transicion_defensiva}\n`;
    if (pm.presion) text += `- Presión: ${pm.presion}\n`;
    if (pm.bloque_defensivo) text += `- Bloque Defensivo: ${pm.bloque_defensivo}\n`;
    if (pm.defensa_area) text += `- Defensa de Área: ${pm.defensa_area}\n`;
    if (pm.abp_ofensiva) text += `- ABP Ofensiva: ${pm.abp_ofensiva}\n`;
    if (pm.abp_defensiva) text += `- ABP Defensiva: ${pm.abp_defensiva}\n`;
  }

  // 2. Informe Previo del Míster (si existe en club_reports)
  if (ctx.misterReport) {
    const mr = ctx.misterReport;
    text += `\n=== ANOTACIONES PREVIAS DEL ENTRENADOR (INFORME DEL MÍSTER) ===\n`;
    if (mr.titulo) text += `- Título: ${mr.titulo}\n`;
    if (mr.plan_partido) text += `- Estrategia Global: ${mr.plan_partido}\n`;
    if (mr.que_atacar) text += `- Debilidades Observadas por el Míster: ${mr.que_atacar}\n`;
    if (mr.que_proteger) text += `- Amenazas Identificadas por el Míster: ${mr.que_proteger}\n`;
    if (mr.consignas) text += `- Consignas Previas: ${mr.consignas}\n`;
  }

  // 3. Precedentes y Conocimiento Táctico Relevante (RAG)
  if (ctx.relevantKnowledge) {
    text += `\n=== CONOCIMIENTO TÁCTICO DE REFERENCIA & PRECEDENTES (BIBLIOTECA) ===\n${ctx.relevantKnowledge}\n`;
  }

  // 4. Observaciones Aprobadas de Informes (Conocimiento Real Validado)
  if (ctx.approvedObservations && ctx.approvedObservations.length > 0) {
    text += `\n=== OBSERVACIONES APROBADAS E INTEGRADAS DE INFORMES DE SCOUTING (CONOCIMIENTO REAL VALIDADO) ===\n`;
    ctx.approvedObservations.forEach((obs) => {
      let line = `[ID: ${obs.id}] (${obs.categoria}) ${obs.contenido}`;
      const meta: string[] = [];
      if (obs.documentName) meta.push(`Doc: "${obs.documentName}"`);
      if (obs.pagina) meta.push(`Pág: ${obs.pagina}`);
      if (obs.confianza) meta.push(`Confianza: ${obs.confianza}`);
      if (obs.prioridad) meta.push(`Prioridad: ${obs.prioridad}`);
      if (obs.esPropuestaAnalista) meta.push('Propuesta del Analista');
      if (obs.rivalPlayerName || obs.rivalPlayerDorsal) {
        meta.push(`Jugador: ${obs.rivalPlayerName || ''} Dorsal ${obs.rivalPlayerDorsal || ''} (${obs.rivalPlayerPosition || ''}) Peligro: ${obs.rivalPlayerThreatLevel || 'alto'}`);
      }
      if (meta.length > 0) line += ` [${meta.join(' | ')}]`;
      if (obs.evidenciaOriginal) line += `\n   ↳ Evidencia Literal: "${obs.evidenciaOriginal}"`;
      text += `${line}\n`;
    });
  } else {
    text += `\n=== OBSERVACIONES APROBADAS E INTEGRADAS ===\nNo existen observaciones aprobadas en informes todavía para este rival.\n`;
  }

  return text;
}
