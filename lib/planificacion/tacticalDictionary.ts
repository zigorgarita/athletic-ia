/**
 * Diccionario Táctico v2 & Motor de Conceptos Canónicos
 * Athletic IA - Indautxu 26/27
 * 
 * Reglas:
 * - 11 familias taxonómicas validadas.
 * - Mapeo de términos originales a conceptos canónicos aprobados.
 * - Extensibilidad para futuras sesiones (términos no reconocidos se marcan
 *   como pendientes de contexto/revisión sin bloquear tareas ni inventar equivalencias).
 */

import { PlanningTaskLibrary } from '@/types';

export type TacticalFamilyId =
  | 'ofensivo'
  | 'defensivo'
  | 'transicion_ofensiva'
  | 'transicion_defensiva'
  | 'finalizacion'
  | 'juego_aereo'
  | 'duelos'
  | 'posesion'
  | 'estructuras'
  | 'formatos_metodologicos'
  | 'factores_complementarios';

export interface TacticalFamily {
  id: TacticalFamilyId;
  label: string;
  category: string;
  badgeColor: string;
  concepts: string[];
}

export interface TaskTacticalProfile {
  conceptos_originales: string[];
  conceptos_canonicos: string[];
  pendiente_contexto: string[];
  familias: TacticalFamily[];
  is_pending_review: boolean;
}

export const TACTICAL_FAMILIES: TacticalFamily[] = [
  {
    "id": "ofensivo",
    "label": "Ofensivo",
    "category": "FASE OFENSIVA (ATAQUE ORGANIZADO)",
    "badgeColor": "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    "concepts": [
      "Ataque Posicional",
      "Amplitud",
      "Profundidad",
      "Desmarques de Ruptura",
      "Desmarques de Apoyo",
      "Juego Interior",
      "Cambio de Orientación",
      "Salida de Balón",
      "Desdoblamiento",
      "Combinación Rápida",
      "Progresión",
      "Movilidad",
      "Atracción por Posesión",
      "Juego Directo",
      "Ocupación de Espacios",
      "Líneas de Pase"
    ]
  },
  {
    "id": "defensivo",
    "label": "Defensivo",
    "category": "FASE DEFENSIVA (DEFENSA ORGANIZADA)",
    "badgeColor": "bg-blue-500/15 text-blue-400 border-blue-500/30",
    "concepts": [
      "Bloque Defensivo",
      "Bloque Medio",
      "Bloque Bajo",
      "Basculación",
      "Achicar Espacios",
      "Reducción de Intervalos",
      "Cierre de Líneas de Pase",
      "Acoso",
      "Interceptación",
      "Temporización Defensiva",
      "Perfilación Defensiva",
      "Defensa de Centros",
      "Presión",
      "Presión Alta",
      "Presión Colectiva"
    ]
  },
  {
    "id": "transicion_ofensiva",
    "label": "Transición ofensiva",
    "category": "TRANSICIÓN OFENSIVA (DEFENSA → ATAQUE)",
    "badgeColor": "bg-teal-500/15 text-teal-400 border-teal-500/30",
    "concepts": [
      "Transición Ofensiva",
      "Contraataque",
      "Pase a Jugador Profundo"
    ]
  },
  {
    "id": "transicion_defensiva",
    "label": "Transición defensiva",
    "category": "TRANSICIÓN DEFENSIVA (ATAQUE → DEFENSA)",
    "badgeColor": "bg-orange-500/15 text-orange-400 border-orange-500/30",
    "concepts": [
      "Presión Tras Pérdida (PTP)",
      "Repliegue",
      "Transición Defensiva"
    ]
  },
  {
    "id": "finalizacion",
    "label": "Finalización",
    "category": "FINALIZACIÓN Y REMATE",
    "badgeColor": "bg-red-500/15 text-red-400 border-red-500/30",
    "concepts": [
      "Finalización",
      "Tiro a Puerta",
      "Centros al Área",
      "Ocupación de Zonas de Remate",
      "Llegada de Segunda Línea",
      "Remate de Cabeza (Ofensivo)"
    ]
  },
  {
    "id": "juego_aereo",
    "label": "Juego aéreo",
    "category": "JUEGO AÉREO Y CAÍDAS",
    "badgeColor": "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    "concepts": [
      "Juego Aéreo",
      "Duelo Aéreo",
      "Segunda Jugada",
      "Despeje Aéreo (Defensivo)"
    ]
  },
  {
    "id": "duelos",
    "label": "Duelos",
    "category": "DUELOS Y CONFRONTACIÓN 1V1",
    "badgeColor": "bg-purple-500/15 text-purple-400 border-purple-500/30",
    "concepts": [
      "Duelo 1v1"
    ]
  },
  {
    "id": "posesion",
    "label": "Posesión",
    "category": "POSESIÓN, CIRCULACIÓN Y VENTAJAS",
    "badgeColor": "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    "concepts": [
      "Tercer Hombre",
      "Conservación de Balón",
      "Superioridad Numérica",
      "Superioridad Ofensiva"
    ]
  },
  {
    "id": "estructuras",
    "label": "Estructuras",
    "category": "ESTRUCTURAS, SISTEMAS Y RELACIONES",
    "badgeColor": "bg-amber-500/15 text-amber-400 border-amber-500/30",
    "concepts": [
      "Estructura 1-4-2-3-1",
      "Estructura Posicional",
      "Estructura de Juego",
      "Relaciones entre Líneas"
    ]
  },
  {
    "id": "formatos_metodologicos",
    "label": "Formatos metodológicos",
    "category": "FORMATOS METODOLÓGICOS Y TIPOS DE TAREA",
    "badgeColor": "bg-violet-500/15 text-violet-400 border-violet-500/30",
    "concepts": [
      "Partido Real",
      "Juego Reducido"
    ]
  },
  {
    "id": "factores_complementarios",
    "label": "Factores complementarios",
    "category": "FACTORES CONDICIONALES, COGNITIVOS Y PSICOLÓGICOS",
    "badgeColor": "bg-rose-500/15 text-rose-400 border-rose-500/30",
    "concepts": [
      "Toma de Decisiones",
      "Velocidad de Reacción",
      "Cohesión Grupal",
      "Coordinación",
      "Competición"
    ]
  }
];

export const CANONICAL_TO_FAMILY_MAP: Record<string, TacticalFamilyId> = {
  "Ataque Posicional": "ofensivo",
  "Amplitud": "ofensivo",
  "Profundidad": "ofensivo",
  "Desmarques de Ruptura": "ofensivo",
  "Desmarques de Apoyo": "ofensivo",
  "Juego Interior": "ofensivo",
  "Cambio de Orientación": "ofensivo",
  "Salida de Balón": "ofensivo",
  "Desdoblamiento": "ofensivo",
  "Combinación Rápida": "ofensivo",
  "Progresión": "ofensivo",
  "Movilidad": "ofensivo",
  "Atracción por Posesión": "ofensivo",
  "Juego Directo": "ofensivo",
  "Ocupación de Espacios": "ofensivo",
  "Líneas de Pase": "ofensivo",
  "Bloque Defensivo": "defensivo",
  "Bloque Medio": "defensivo",
  "Bloque Bajo": "defensivo",
  "Basculación": "defensivo",
  "Achicar Espacios": "defensivo",
  "Reducción de Intervalos": "defensivo",
  "Cierre de Líneas de Pase": "defensivo",
  "Acoso": "defensivo",
  "Interceptación": "defensivo",
  "Temporización Defensiva": "defensivo",
  "Perfilación Defensiva": "defensivo",
  "Defensa de Centros": "defensivo",
  "Presión": "defensivo",
  "Presión Alta": "defensivo",
  "Presión Colectiva": "defensivo",
  "Transición Ofensiva": "transicion_ofensiva",
  "Contraataque": "transicion_ofensiva",
  "Pase a Jugador Profundo": "transicion_ofensiva",
  "Presión Tras Pérdida (PTP)": "transicion_defensiva",
  "Repliegue": "transicion_defensiva",
  "Transición Defensiva": "transicion_defensiva",
  "Finalización": "finalizacion",
  "Tiro a Puerta": "finalizacion",
  "Centros al Área": "finalizacion",
  "Ocupación de Zonas de Remate": "finalizacion",
  "Llegada de Segunda Línea": "finalizacion",
  "Remate de Cabeza (Ofensivo)": "finalizacion",
  "Juego Aéreo": "juego_aereo",
  "Duelo Aéreo": "juego_aereo",
  "Segunda Jugada": "juego_aereo",
  "Despeje Aéreo (Defensivo)": "juego_aereo",
  "Duelo 1v1": "duelos",
  "Tercer Hombre": "posesion",
  "Conservación de Balón": "posesion",
  "Superioridad Numérica": "posesion",
  "Superioridad Ofensiva": "posesion",
  "Estructura 1-4-2-3-1": "estructuras",
  "Estructura Posicional": "estructuras",
  "Estructura de Juego": "estructuras",
  "Relaciones entre Líneas": "estructuras",
  "Partido Real": "formatos_metodologicos",
  "Juego Reducido": "formatos_metodologicos",
  "Toma de Decisiones": "factores_complementarios",
  "Velocidad de Reacción": "factores_complementarios",
  "Cohesión Grupal": "factores_complementarios",
  "Coordinación": "factores_complementarios",
  "Competición": "factores_complementarios"
};

export const V2_MAPPING_DICTIONARY: Record<
  string,
  {
    term_orig: string;
    canonical_targets: string[];
    is_pending: boolean;
    note: string;
  }
> = {
  "presión tras pérdida": {
    "term_orig": "Presión tras pérdida",
    "canonical_targets": [
      "Presión Tras Pérdida (PTP)"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "transición ofensiva": {
    "term_orig": "Transición ofensiva",
    "canonical_targets": [
      "Transición Ofensiva"
    ],
    "is_pending": false,
    "note": "Normalizado *(Separado de Contraataque)*"
  },
  "amplitud": {
    "term_orig": "Amplitud",
    "canonical_targets": [
      "Amplitud"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "basculación": {
    "term_orig": "Basculación",
    "canonical_targets": [
      "Basculación"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "tercer hombre": {
    "term_orig": "Tercer hombre",
    "canonical_targets": [
      "Tercer Hombre"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "repliegue": {
    "term_orig": "Repliegue",
    "canonical_targets": [
      "Repliegue"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "transición defensiva": {
    "term_orig": "Transición defensiva",
    "canonical_targets": [
      "Transición Defensiva"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "superioridad numérica": {
    "term_orig": "Superioridad numérica",
    "canonical_targets": [
      "Superioridad Numérica"
    ],
    "is_pending": false,
    "note": "Normalizado *(Separado de Superioridad general)*"
  },
  "centros al área": {
    "term_orig": "Centros al área",
    "canonical_targets": [
      "Centros al Área"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "finalización": {
    "term_orig": "Finalización",
    "canonical_targets": [
      "Finalización"
    ],
    "is_pending": false,
    "note": "Normalizado *(Separado de Tiro a puerta)*"
  },
  "ataque posicional": {
    "term_orig": "Ataque posicional",
    "canonical_targets": [
      "Ataque Posicional"
    ],
    "is_pending": false,
    "note": "Normalizado *(Separado de Atracción)*"
  },
  "duelos": {
    "term_orig": "Duelos",
    "canonical_targets": [
      "Duelo 1v1"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "cambio de orientación": {
    "term_orig": "Cambio de orientación",
    "canonical_targets": [
      "Cambio de Orientación"
    ],
    "is_pending": false,
    "note": "Normalizado *(Separado de Orientación)*"
  },
  "toma de decisiones": {
    "term_orig": "Toma de decisiones",
    "canonical_targets": [
      "Toma de Decisiones"
    ],
    "is_pending": false,
    "note": "Normalizado *(Familia Cognitiva)*"
  },
  "tiro a puerta": {
    "term_orig": "Tiro a puerta",
    "canonical_targets": [
      "Tiro a Puerta"
    ],
    "is_pending": false,
    "note": "Normalizado *(Separado de Finalización)*"
  },
  "desmarque de ruptura": {
    "term_orig": "Desmarque de ruptura",
    "canonical_targets": [
      "Desmarques de Ruptura"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "segunda jugada": {
    "term_orig": "Segunda jugada",
    "canonical_targets": [
      "Segunda Jugada"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "profundidad": {
    "term_orig": "Profundidad",
    "canonical_targets": [
      "Profundidad"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "conservación de balón": {
    "term_orig": "Conservación de balón",
    "canonical_targets": [
      "Conservación de Balón"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "bloque defensivo": {
    "term_orig": "Bloque defensivo",
    "canonical_targets": [
      "Bloque Defensivo"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "juego aéreo": {
    "term_orig": "Juego aéreo",
    "canonical_targets": [
      "Juego Aéreo"
    ],
    "is_pending": false,
    "note": "Normalizado *(Separado de Duelo aéreo)*"
  },
  "remate de cabeza": {
    "term_orig": "Remate de cabeza",
    "canonical_targets": [
      "Remate de Cabeza (Ofensivo)",
      "Despeje Aéreo (Defensivo)"
    ],
    "is_pending": false,
    "note": "Resuelto por Tarea *(2026-08-07 T2 / 2026-09-24 T2)*"
  },
  "presión alta": {
    "term_orig": "Presión alta",
    "canonical_targets": [
      "Presión Alta"
    ],
    "is_pending": false,
    "note": "Normalizado *(Separado de PTP)*"
  },
  "salida de balón": {
    "term_orig": "Salida de balón",
    "canonical_targets": [
      "Salida de Balón"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "desmarques de apoyo": {
    "term_orig": "Desmarques de apoyo",
    "canonical_targets": [
      "Desmarques de Apoyo"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "ocupación de zonas de remate": {
    "term_orig": "Ocupación de zonas de remate",
    "canonical_targets": [
      "Ocupación de Zonas de Remate"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "presión": {
    "term_orig": "Presión",
    "canonical_targets": [
      "Presión"
    ],
    "is_pending": false,
    "note": "Normalizado *(Separado de Presión Alta y PTP)*"
  },
  "transición": {
    "term_orig": "Transición",
    "canonical_targets": [],
    "is_pending": true,
    "note": "Pendiente de Revisión por Tarea"
  },
  "defensa": {
    "term_orig": "defensa",
    "canonical_targets": [],
    "is_pending": true,
    "note": "Pendiente de Revisión por Tarea"
  },
  "ocupación de espacios": {
    "term_orig": "Ocupación de espacios",
    "canonical_targets": [
      "Ocupación de Espacios"
    ],
    "is_pending": false,
    "note": "Normalizado *(Separado de Zonas de remate)*"
  },
  "apoyo": {
    "term_orig": "Apoyo",
    "canonical_targets": [
      "Desmarques de Apoyo"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "acoso": {
    "term_orig": "Acoso",
    "canonical_targets": [
      "Acoso"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "achicar espacios": {
    "term_orig": "Achicar espacios",
    "canonical_targets": [
      "Achicar Espacios"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "cierre de líneas de pase": {
    "term_orig": "Cierre de líneas de pase",
    "canonical_targets": [
      "Cierre de Líneas de Pase"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "interceptación": {
    "term_orig": "Interceptación",
    "canonical_targets": [
      "Interceptación"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "defensa organizada": {
    "term_orig": "Defensa organizada",
    "canonical_targets": [
      "Bloque Defensivo"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "bloque bajo": {
    "term_orig": "Bloque bajo",
    "canonical_targets": [
      "Bloque Bajo"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "contraataque": {
    "term_orig": "Contraataque",
    "canonical_targets": [
      "Contraataque"
    ],
    "is_pending": false,
    "note": "Normalizado *(Separado de Transición ofensiva)*"
  },
  "juego interior": {
    "term_orig": "Juego interior",
    "canonical_targets": [
      "Juego Interior"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "despeje": {
    "term_orig": "Despeje",
    "canonical_targets": [
      "Despeje Aéreo (Defensivo)"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "superioridad ofensiva": {
    "term_orig": "Superioridad ofensiva",
    "canonical_targets": [
      "Superioridad Ofensiva"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "apoyo entre líneas": {
    "term_orig": "Apoyo entre líneas",
    "canonical_targets": [
      "Desmarques de Apoyo",
      "Juego Interior"
    ],
    "is_pending": false,
    "note": "Mapeo Compuesto"
  },
  "velocidad de reacción": {
    "term_orig": "Velocidad de reacción",
    "canonical_targets": [
      "Velocidad de Reacción"
    ],
    "is_pending": false,
    "note": "Normalizado *(Familia Condicional)*"
  },
  "cohesión grupal": {
    "term_orig": "Cohesión grupal",
    "canonical_targets": [
      "Cohesión Grupal"
    ],
    "is_pending": false,
    "note": "Normalizado *(Familia Psicológica)*"
  },
  "coordinación": {
    "term_orig": "Coordinación",
    "canonical_targets": [
      "Coordinación"
    ],
    "is_pending": false,
    "note": "Normalizado *(Familia Condicional)*"
  },
  "centros laterales": {
    "term_orig": "Centros laterales",
    "canonical_targets": [
      "Centros al Área"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "llegada desde segunda línea": {
    "term_orig": "Llegada desde segunda línea",
    "canonical_targets": [
      "Llegada de Segunda Línea"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "ocupación de espacios de remate": {
    "term_orig": "Ocupación de espacios de remate",
    "canonical_targets": [
      "Ocupación de Zonas de Remate"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "posesión": {
    "term_orig": "Posesión",
    "canonical_targets": [],
    "is_pending": true,
    "note": "Pendiente de Revisión por Tarea"
  },
  "superioridad": {
    "term_orig": "Superioridad",
    "canonical_targets": [],
    "is_pending": true,
    "note": "Pendiente de Revisión por Tarea"
  },
  "partido": {
    "term_orig": "Partido",
    "canonical_targets": [],
    "is_pending": true,
    "note": "Pendiente de Revisión por Tarea"
  },
  "táctica": {
    "term_orig": "Táctica",
    "canonical_targets": [],
    "is_pending": true,
    "note": "Pendiente de Revisión por Tarea *(No forzar a 1-4-2-3-1)*"
  },
  "bloque medio": {
    "term_orig": "Bloque medio",
    "canonical_targets": [
      "Bloque Medio"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "intervalos": {
    "term_orig": "Intervalos",
    "canonical_targets": [
      "Reducción de Intervalos"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "juego directo": {
    "term_orig": "Juego directo",
    "canonical_targets": [
      "Juego Directo"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "estructura posicional": {
    "term_orig": "Estructura posicional",
    "canonical_targets": [
      "Estructura Posicional"
    ],
    "is_pending": false,
    "note": "Normalizado *(No forzar a 1-4-2-3-1)*"
  },
  "duelo": {
    "term_orig": "Duelo",
    "canonical_targets": [
      "Duelo 1v1"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "duelo 1v1": {
    "term_orig": "Duelo 1v1",
    "canonical_targets": [
      "Duelo 1v1"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "líneas de pase": {
    "term_orig": "Líneas de pase",
    "canonical_targets": [
      "Líneas de Pase"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "combinación rápida": {
    "term_orig": "Combinación rápida",
    "canonical_targets": [
      "Combinación Rápida"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "llegadas de segunda línea": {
    "term_orig": "Llegadas de segunda línea",
    "canonical_targets": [
      "Llegada de Segunda Línea"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "orientación": {
    "term_orig": "Orientación",
    "canonical_targets": [],
    "is_pending": true,
    "note": "Pendiente *(Perfilación vs Cambio juego)*"
  },
  "transición ataque": {
    "term_orig": "Transición ataque",
    "canonical_targets": [
      "Transición Ofensiva"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "ataque": {
    "term_orig": "Ataque",
    "canonical_targets": [],
    "is_pending": true,
    "note": "Pendiente de Revisión por Tarea"
  },
  "progresión": {
    "term_orig": "Progresión",
    "canonical_targets": [
      "Progresión"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "mantenimiento de la posesión": {
    "term_orig": "Mantenimiento de la posesión",
    "canonical_targets": [
      "Conservación de Balón"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "desdoblamiento": {
    "term_orig": "Desdoblamiento",
    "canonical_targets": [
      "Desdoblamiento"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "centros y remates": {
    "term_orig": "Centros y remates",
    "canonical_targets": [
      "Centros al Área",
      "Tiro a Puerta"
    ],
    "is_pending": false,
    "note": "Mapeo Compuesto"
  },
  "llegada de segunda línea": {
    "term_orig": "Llegada de segunda línea",
    "canonical_targets": [
      "Llegada de Segunda Línea"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "remate": {
    "term_orig": "Remate",
    "canonical_targets": [
      "Tiro a Puerta"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "movilidad": {
    "term_orig": "Movilidad",
    "canonical_targets": [
      "Movilidad"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "velocidad en ataque": {
    "term_orig": "Velocidad en ataque",
    "canonical_targets": [
      "Transición Ofensiva"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "estructura de juego": {
    "term_orig": "Estructura de juego",
    "canonical_targets": [
      "Estructura de Juego"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "relaciones entre líneas": {
    "term_orig": "Relaciones entre líneas",
    "canonical_targets": [
      "Relaciones entre Líneas"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "atracción por posesión": {
    "term_orig": "Atracción por posesión",
    "canonical_targets": [
      "Atracción por Posesión"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "transición rápida": {
    "term_orig": "Transición rápida",
    "canonical_targets": [
      "Transición Ofensiva"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "duelo aéreo": {
    "term_orig": "Duelo aéreo",
    "canonical_targets": [
      "Duelo Aéreo"
    ],
    "is_pending": false,
    "note": "Normalizado *(Separado de Juego aéreo)*"
  },
  "defensa de centros": {
    "term_orig": "Defensa de centros",
    "canonical_targets": [
      "Defensa de Centros"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "temporización defensiva": {
    "term_orig": "Temporización defensiva",
    "canonical_targets": [
      "Temporización Defensiva"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "bloque bajo/medio": {
    "term_orig": "Bloque bajo/medio",
    "canonical_targets": [
      "Bloque Bajo",
      "Bloque Medio"
    ],
    "is_pending": false,
    "note": "Mapeo Compuesto"
  },
  "amplitud y profundidad": {
    "term_orig": "Amplitud y profundidad",
    "canonical_targets": [
      "Amplitud",
      "Profundidad"
    ],
    "is_pending": false,
    "note": "Mapeo Compuesto"
  },
  "desmarques de ruptura": {
    "term_orig": "Desmarques de ruptura",
    "canonical_targets": [
      "Desmarques de Ruptura"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "competición": {
    "term_orig": "Competición",
    "canonical_targets": [
      "Competición"
    ],
    "is_pending": false,
    "note": "Normalizado *(Familia Psicológica)*"
  },
  "transiciones rápidas": {
    "term_orig": "Transiciones rápidas",
    "canonical_targets": [
      "Transición Ofensiva"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "juego reducido": {
    "term_orig": "Juego reducido",
    "canonical_targets": [
      "Juego Reducido"
    ],
    "is_pending": false,
    "note": "Normalizado *(Formato Metodológico)*"
  },
  "duelos 1v1": {
    "term_orig": "Duelos 1v1",
    "canonical_targets": [
      "Duelo 1v1"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "perfilación": {
    "term_orig": "Perfilación",
    "canonical_targets": [
      "Perfilación Defensiva"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "ataque rápido": {
    "term_orig": "Ataque rápido",
    "canonical_targets": [
      "Contraataque"
    ],
    "is_pending": false,
    "note": "Normalizado"
  },
  "partido real": {
    "term_orig": "Partido real",
    "canonical_targets": [
      "Partido Real"
    ],
    "is_pending": false,
    "note": "Normalizado *(Separado de P. Condicionado)*"
  },
  "comportamientos tácticos": {
    "term_orig": "Comportamientos tácticos",
    "canonical_targets": [],
    "is_pending": true,
    "note": "Pendiente de Revisión por Tarea"
  },
  "presión colectiva": {
    "term_orig": "Presión colectiva",
    "canonical_targets": [
      "Presión Colectiva"
    ],
    "is_pending": false,
    "note": "Normalizado *(Separado de PTP)*"
  }
};

export const AUDITED_51_TASK_CONCEPTS: Record<
  string,
  {
    fecha: string;
    numero: number;
    nombre: string;
    conceptos_originales: string[];
    conceptos_canonicos: string[];
    pendiente_contexto: string[];
  }
> = {
  "2026-08-03_T1": {
    "fecha": "2026-08-03",
    "numero": 1,
    "nombre": "PRESIÓN TRAS PÉRDIDA",
    "conceptos_originales": [
      "Presión tras pérdida",
      "Transición defensiva",
      "Acoso"
    ],
    "conceptos_canonicos": [
      "Presión Tras Pérdida (PTP)",
      "Transición Defensiva",
      "Acoso"
    ],
    "pendiente_contexto": []
  },
  "2026-08-03_T2": {
    "fecha": "2026-08-03",
    "numero": 2,
    "nombre": "ATAQUES POSICIONALES EN TRANSICIÓN",
    "conceptos_originales": [
      "Ataque posicional",
      "Transición ofensiva",
      "Amplitud",
      "Profundidad"
    ],
    "conceptos_canonicos": [
      "Ataque Posicional",
      "Transición Ofensiva",
      "Amplitud",
      "Profundidad"
    ],
    "pendiente_contexto": []
  },
  "2026-08-03_T3": {
    "fecha": "2026-08-03",
    "numero": 3,
    "nombre": "ATAQUES POSICIONALES 6 VS 4",
    "conceptos_originales": [
      "Ataque posicional",
      "Basculación",
      "Repliegue",
      "Transición ofensiva",
      "Achicar espacios"
    ],
    "conceptos_canonicos": [
      "Ataque Posicional",
      "Basculación",
      "Repliegue",
      "Transición Ofensiva",
      "Achicar Espacios"
    ],
    "pendiente_contexto": []
  },
  "2026-08-04_T1": {
    "fecha": "2026-08-04",
    "numero": 1,
    "nombre": "POSESIÓN DUELOS",
    "conceptos_originales": [
      "Duelos",
      "Conservación de balón",
      "Presión tras pérdida"
    ],
    "conceptos_canonicos": [
      "Duelo 1v1",
      "Conservación de Balón",
      "Presión Tras Pérdida (PTP)"
    ],
    "pendiente_contexto": []
  },
  "2026-08-04_T2": {
    "fecha": "2026-08-04",
    "numero": 2,
    "nombre": "CIERRE DE LÍNEAS",
    "conceptos_originales": [
      "Cierre de líneas de pase",
      "Basculación",
      "Bloque defensivo",
      "Interceptación"
    ],
    "conceptos_canonicos": [
      "Cierre de Líneas de Pase",
      "Basculación",
      "Bloque Defensivo",
      "Interceptación"
    ],
    "pendiente_contexto": []
  },
  "2026-08-04_T3": {
    "fecha": "2026-08-04",
    "numero": 3,
    "nombre": "DEFENSA ORGANIZADA",
    "conceptos_originales": [
      "Defensa organizada",
      "Repliegue",
      "Basculación",
      "Bloque bajo"
    ],
    "conceptos_canonicos": [
      "Bloque Defensivo",
      "Repliegue",
      "Basculación",
      "Bloque Bajo"
    ],
    "pendiente_contexto": []
  },
  "2026-08-05_T1": {
    "fecha": "2026-08-05",
    "numero": 1,
    "nombre": "PRESIÓN TRAS PÉRDIDA",
    "conceptos_originales": [
      "Presión tras pérdida",
      "Transición defensiva"
    ],
    "conceptos_canonicos": [
      "Presión Tras Pérdida (PTP)",
      "Transición Defensiva"
    ],
    "pendiente_contexto": []
  },
  "2026-08-05_T2": {
    "fecha": "2026-08-05",
    "numero": 2,
    "nombre": "TRANSICIONES 3 VS 2",
    "conceptos_originales": [
      "Transición ofensiva",
      "Superioridad numérica",
      "Contraataque",
      "Repliegue"
    ],
    "conceptos_canonicos": [
      "Transición Ofensiva",
      "Superioridad Numérica",
      "Contraataque",
      "Repliegue"
    ],
    "pendiente_contexto": []
  },
  "2026-08-06_T1": {
    "fecha": "2026-08-06",
    "numero": 1,
    "nombre": "BASCULACIONES Y JUEGO INTERIOR",
    "conceptos_originales": [
      "Basculación",
      "Juego interior"
    ],
    "conceptos_canonicos": [
      "Basculación",
      "Juego Interior"
    ],
    "pendiente_contexto": []
  },
  "2026-08-06_T2": {
    "fecha": "2026-08-06",
    "numero": 2,
    "nombre": "DESPEJES + 3VS2",
    "conceptos_originales": [
      "Despeje",
      "Superioridad numérica",
      "Transición ofensiva",
      "Transición defensiva"
    ],
    "conceptos_canonicos": [
      "Despeje Aéreo (Defensivo)",
      "Superioridad Numérica",
      "Transición Ofensiva",
      "Transición Defensiva"
    ],
    "pendiente_contexto": []
  },
  "2026-08-06_T3": {
    "fecha": "2026-08-06",
    "numero": 3,
    "nombre": "PARTIDO 7V7 A DOS PORTERÍAS CON 7 COMODINES",
    "conceptos_originales": [
      "Amplitud",
      "Superioridad ofensiva",
      "Cambio de orientación",
      "Apoyo entre líneas"
    ],
    "conceptos_canonicos": [
      "Amplitud",
      "Superioridad Ofensiva",
      "Cambio de Orientación",
      "Desmarques de Apoyo",
      "Juego Interior"
    ],
    "pendiente_contexto": []
  },
  "2026-08-07_T1": {
    "fecha": "2026-08-07",
    "numero": 1,
    "nombre": "JUEGOS 3 EN RAYA Y RUBIK",
    "conceptos_originales": [
      "Velocidad de reacción",
      "Toma de decisiones",
      "Cohesión grupal"
    ],
    "conceptos_canonicos": [
      "Velocidad de Reacción",
      "Toma de Decisiones",
      "Cohesión Grupal"
    ],
    "pendiente_contexto": []
  },
  "2026-08-07_T2": {
    "fecha": "2026-08-07",
    "numero": 2,
    "nombre": "JUEGO DE CABEZAS",
    "conceptos_originales": [
      "Juego aéreo",
      "Remate de cabeza",
      "Coordinación"
    ],
    "conceptos_canonicos": [
      "Juego Aéreo",
      "Remate de Cabeza (Ofensivo)",
      "Despeje Aéreo (Defensivo)",
      "Coordinación"
    ],
    "pendiente_contexto": []
  },
  "2026-08-07_T3": {
    "fecha": "2026-08-07",
    "numero": 3,
    "nombre": "FINALIZACIONES",
    "conceptos_originales": [
      "Tiro a puerta",
      "Desmarque de ruptura",
      "Centros laterales"
    ],
    "conceptos_canonicos": [
      "Tiro a Puerta",
      "Desmarques de Ruptura",
      "Centros al Área"
    ],
    "pendiente_contexto": []
  },
  "2026-08-07_T4": {
    "fecha": "2026-08-07",
    "numero": 4,
    "nombre": "LLEGADAS",
    "conceptos_originales": [
      "Llegada desde segunda línea",
      "Ocupación de espacios de remate",
      "Centros al área"
    ],
    "conceptos_canonicos": [
      "Llegada de Segunda Línea",
      "Ocupación de Zonas de Remate",
      "Centros al Área"
    ],
    "pendiente_contexto": []
  },
  "2026-08-07_T5": {
    "fecha": "2026-08-07",
    "numero": 5,
    "nombre": "POSICIONAMIENTO DE PRESIÓN + ABP",
    "conceptos_originales": [
      "Presión alta"
    ],
    "conceptos_canonicos": [
      "Presión Alta"
    ],
    "pendiente_contexto": []
  },
  "2026-09-03_T1": {
    "fecha": "2026-09-03",
    "numero": 1,
    "nombre": "2 EQUIPOS DE 8 + NARANJA DE 6",
    "conceptos_originales": [
      "Posesión",
      "Superioridad",
      "Tercer hombre"
    ],
    "conceptos_canonicos": [
      "Tercer Hombre"
    ],
    "pendiente_contexto": [
      "Posesión",
      "Superioridad"
    ]
  },
  "2026-09-03_T2": {
    "fecha": "2026-09-03",
    "numero": 2,
    "nombre": "11 VS 11",
    "conceptos_originales": [
      "Partido",
      "Táctica"
    ],
    "conceptos_canonicos": [],
    "pendiente_contexto": [
      "Partido",
      "Táctica"
    ]
  },
  "2026-09-03_T3": {
    "fecha": "2026-09-03",
    "numero": 3,
    "nombre": "11 VS 11",
    "conceptos_originales": [
      "Amplitud",
      "Profundidad",
      "Presión tras pérdida",
      "Bloque medio",
      "Salida de balón"
    ],
    "conceptos_canonicos": [
      "Amplitud",
      "Profundidad",
      "Presión Tras Pérdida (PTP)",
      "Bloque Medio",
      "Salida de Balón"
    ],
    "pendiente_contexto": []
  },
  "2026-09-08_T1": {
    "fecha": "2026-09-08",
    "numero": 1,
    "nombre": "POSESIÓN 3 ZONAS",
    "conceptos_originales": [
      "Tercer hombre",
      "Cambio de orientación",
      "Intervalos",
      "Presión tras pérdida"
    ],
    "conceptos_canonicos": [
      "Tercer Hombre",
      "Cambio de Orientación",
      "Reducción de Intervalos",
      "Presión Tras Pérdida (PTP)"
    ],
    "pendiente_contexto": []
  },
  "2026-09-08_T2": {
    "fecha": "2026-09-08",
    "numero": 2,
    "nombre": "POSESIÓN EN CAMPO REAL",
    "conceptos_originales": [
      "Amplitud",
      "Basculación",
      "Superioridad numérica",
      "Transición ofensiva"
    ],
    "conceptos_canonicos": [
      "Amplitud",
      "Basculación",
      "Superioridad Numérica",
      "Transición Ofensiva"
    ],
    "pendiente_contexto": []
  },
  "2026-09-08_T3": {
    "fecha": "2026-09-08",
    "numero": 3,
    "nombre": "PARTIDO 11 VS 11",
    "conceptos_originales": [
      "Segunda jugada",
      "Juego directo",
      "Presión tras pérdida",
      "Repliegue"
    ],
    "conceptos_canonicos": [
      "Segunda Jugada",
      "Juego Directo",
      "Presión Tras Pérdida (PTP)",
      "Repliegue"
    ],
    "pendiente_contexto": []
  },
  "2026-09-10_T1": {
    "fecha": "2026-09-10",
    "numero": 1,
    "nombre": "TAREA 1 - POSESIÓN 7 X 4 ESTRUCTURA 2-3-2",
    "conceptos_originales": [
      "Presión tras pérdida",
      "Amplitud",
      "Estructura posicional",
      "Basculación"
    ],
    "conceptos_canonicos": [
      "Presión Tras Pérdida (PTP)",
      "Amplitud",
      "Estructura Posicional",
      "Basculación"
    ],
    "pendiente_contexto": []
  },
  "2026-09-10_T2": {
    "fecha": "2026-09-10",
    "numero": 2,
    "nombre": "TAREA 2 - TRANSICIONES - PREVIA DISPUTA",
    "conceptos_originales": [
      "Transición ofensiva",
      "Transición defensiva",
      "Presión tras pérdida",
      "Duelo"
    ],
    "conceptos_canonicos": [
      "Transición Ofensiva",
      "Transición Defensiva",
      "Presión Tras Pérdida (PTP)",
      "Duelo 1v1"
    ],
    "pendiente_contexto": []
  },
  "2026-09-10_T3": {
    "fecha": "2026-09-10",
    "numero": 3,
    "nombre": "TAREA 3 - GOLPEO DE PORTERO + DUELO + TRANSICIÓN",
    "conceptos_originales": [
      "Juego aéreo",
      "Segunda jugada",
      "Repliegue",
      "Duelo 1v1"
    ],
    "conceptos_canonicos": [
      "Juego Aéreo",
      "Segunda Jugada",
      "Repliegue",
      "Duelo 1v1"
    ],
    "pendiente_contexto": []
  },
  "2026-09-10_T4": {
    "fecha": "2026-09-10",
    "numero": 4,
    "nombre": "POSESIÓN EN 3 ZONAS",
    "conceptos_originales": [
      "Tercer hombre",
      "Basculación",
      "Presión tras pérdida",
      "Líneas de pase"
    ],
    "conceptos_canonicos": [
      "Tercer Hombre",
      "Basculación",
      "Presión Tras Pérdida (PTP)",
      "Líneas de Pase"
    ],
    "pendiente_contexto": []
  },
  "2026-09-11_T1": {
    "fecha": "2026-09-11",
    "numero": 1,
    "nombre": "FINALIZACIONES (3 POSTAS)",
    "conceptos_originales": [
      "Tiro a puerta",
      "Combinación rápida",
      "Desmarques de apoyo"
    ],
    "conceptos_canonicos": [
      "Tiro a Puerta",
      "Combinación Rápida",
      "Desmarques de Apoyo"
    ],
    "pendiente_contexto": []
  },
  "2026-09-11_T2": {
    "fecha": "2026-09-11",
    "numero": 2,
    "nombre": "LLEGADAS 4-2-3-1",
    "conceptos_originales": [
      "Llegadas de segunda línea",
      "Centros al área",
      "Ocupación de zonas de remate"
    ],
    "conceptos_canonicos": [
      "Llegada de Segunda Línea",
      "Centros al Área",
      "Ocupación de Zonas de Remate"
    ],
    "pendiente_contexto": []
  },
  "2026-09-15_T1": {
    "fecha": "2026-09-15",
    "numero": 1,
    "nombre": "DUELOS POR TRÍOS",
    "conceptos_originales": [
      "Duelos",
      "Orientación",
      "Toma de decisiones"
    ],
    "conceptos_canonicos": [
      "Duelo 1v1",
      "Toma de Decisiones"
    ],
    "pendiente_contexto": [
      "Orientación"
    ]
  },
  "2026-09-15_T2": {
    "fecha": "2026-09-15",
    "numero": 2,
    "nombre": "POSESIÓN 4VS4 + 3",
    "conceptos_originales": [
      "Presión",
      "Conservación de balón",
      "Transición"
    ],
    "conceptos_canonicos": [
      "Presión",
      "Conservación de Balón"
    ],
    "pendiente_contexto": [
      "Transición"
    ]
  },
  "2026-09-15_T3": {
    "fecha": "2026-09-15",
    "numero": 3,
    "nombre": "POSESIÓN 12 + 2 PORTEROS VS 10",
    "conceptos_originales": [
      "Presión",
      "Transición ataque",
      "defensa",
      "Finalización"
    ],
    "conceptos_canonicos": [
      "Presión",
      "Transición Ofensiva",
      "Finalización"
    ],
    "pendiente_contexto": [
      "defensa"
    ]
  },
  "2026-09-15_T4": {
    "fecha": "2026-09-15",
    "numero": 4,
    "nombre": "8VS8 ATAQUE-DEFENSA",
    "conceptos_originales": [
      "Ataque",
      "defensa",
      "Transición",
      "Finalización",
      "Progresión"
    ],
    "conceptos_canonicos": [
      "Finalización",
      "Progresión"
    ],
    "pendiente_contexto": [
      "Ataque",
      "defensa",
      "Transición"
    ]
  },
  "2026-09-17_T1": {
    "fecha": "2026-09-17",
    "numero": 1,
    "nombre": "POSESIÓN 8V8 + 4 COMODINES",
    "conceptos_originales": [
      "Mantenimiento de la posesión",
      "Tercer hombre",
      "Amplitud",
      "Desmarques de apoyo"
    ],
    "conceptos_canonicos": [
      "Conservación de Balón",
      "Tercer Hombre",
      "Amplitud",
      "Desmarques de Apoyo"
    ],
    "pendiente_contexto": []
  },
  "2026-09-17_T2": {
    "fecha": "2026-09-17",
    "numero": 2,
    "nombre": "8V8 POSICIONAL ATAQUE-DEFENSA",
    "conceptos_originales": [
      "Ataque posicional"
    ],
    "conceptos_canonicos": [
      "Ataque Posicional"
    ],
    "pendiente_contexto": []
  },
  "2026-09-17_T3": {
    "fecha": "2026-09-17",
    "numero": 3,
    "nombre": "SECUENCIA DE 4 ACCIONES",
    "conceptos_originales": [
      "Desdoblamiento",
      "Finalización",
      "Centros y remates",
      "Superioridad numérica"
    ],
    "conceptos_canonicos": [
      "Desdoblamiento",
      "Finalización",
      "Centros al Área",
      "Tiro a Puerta",
      "Superioridad Numérica"
    ],
    "pendiente_contexto": []
  },
  "2026-09-17_T4": {
    "fecha": "2026-09-17",
    "numero": 4,
    "nombre": "PARTIDO 11V11",
    "conceptos_originales": [
      "Presión tras pérdida",
      "Transición ofensiva",
      "Duelos",
      "Bloque defensivo"
    ],
    "conceptos_canonicos": [
      "Presión Tras Pérdida (PTP)",
      "Transición Ofensiva",
      "Duelo 1v1",
      "Bloque Defensivo"
    ],
    "pendiente_contexto": []
  },
  "2026-09-18_T1": {
    "fecha": "2026-09-18",
    "numero": 1,
    "nombre": "TAREA FINALIZACIONES.",
    "conceptos_originales": [
      "Tiro a puerta",
      "Finalización",
      "Desmarque de ruptura"
    ],
    "conceptos_canonicos": [
      "Tiro a Puerta",
      "Finalización",
      "Desmarques de Ruptura"
    ],
    "pendiente_contexto": []
  },
  "2026-09-18_T2": {
    "fecha": "2026-09-18",
    "numero": 2,
    "nombre": "TAREA LLEGADAS.",
    "conceptos_originales": [
      "Centros al área",
      "Llegada de segunda línea",
      "Remate"
    ],
    "conceptos_canonicos": [
      "Centros al Área",
      "Llegada de Segunda Línea",
      "Tiro a Puerta"
    ],
    "pendiente_contexto": []
  },
  "2026-09-22_T1": {
    "fecha": "2026-09-22",
    "numero": 1,
    "nombre": "POSESIÓN + DUELOS - 4VS4 + 4",
    "conceptos_originales": [
      "Ocupación de espacios",
      "Tercer hombre",
      "Apoyo"
    ],
    "conceptos_canonicos": [
      "Ocupación de Espacios",
      "Tercer Hombre",
      "Desmarques de Apoyo"
    ],
    "pendiente_contexto": []
  },
  "2026-09-22_T2": {
    "fecha": "2026-09-22",
    "numero": 2,
    "nombre": "8VS8 + 4",
    "conceptos_originales": [
      "Apoyo",
      "Amplitud",
      "Movilidad"
    ],
    "conceptos_canonicos": [
      "Desmarques de Apoyo",
      "Amplitud",
      "Movilidad"
    ],
    "pendiente_contexto": []
  },
  "2026-09-22_T3": {
    "fecha": "2026-09-22",
    "numero": 3,
    "nombre": "TRANSICIONES - 2VS2 + PASE A JUGADOR PROFUNDO",
    "conceptos_originales": [
      "Transición ofensiva",
      "Desmarque de ruptura",
      "Velocidad en ataque"
    ],
    "conceptos_canonicos": [
      "Transición Ofensiva",
      "Desmarques de Ruptura"
    ],
    "pendiente_contexto": []
  },
  "2026-09-22_T4": {
    "fecha": "2026-09-22",
    "numero": 4,
    "nombre": "PARTIDO - ESTRUCTURA 1-4-2-3-1",
    "conceptos_originales": [
      "Estructura de juego",
      "Ocupación de espacios",
      "Relaciones entre líneas"
    ],
    "conceptos_canonicos": [
      "Estructura de Juego",
      "Ocupación de Espacios",
      "Relaciones entre Líneas"
    ],
    "pendiente_contexto": []
  },
  "2026-09-24_T1": {
    "fecha": "2026-09-24",
    "numero": 1,
    "nombre": "POSESIÓN 11V11 + 2 COMODINES",
    "conceptos_originales": [
      "Tercer hombre",
      "Atracción por posesión",
      "Transición rápida",
      "Presión tras pérdida"
    ],
    "conceptos_canonicos": [
      "Tercer Hombre",
      "Atracción por Posesión",
      "Transición Ofensiva",
      "Presión Tras Pérdida (PTP)"
    ],
    "pendiente_contexto": []
  },
  "2026-09-24_T2": {
    "fecha": "2026-09-24",
    "numero": 2,
    "nombre": "1V1 AÉREO -> 3V2 -> CENTROS 3V2",
    "conceptos_originales": [
      "Duelo aéreo",
      "Defensa de centros",
      "Segunda jugada",
      "Temporización defensiva"
    ],
    "conceptos_canonicos": [
      "Duelo Aéreo",
      "Defensa de Centros",
      "Segunda Jugada",
      "Temporización Defensiva"
    ],
    "pendiente_contexto": []
  },
  "2026-09-24_T3": {
    "fecha": "2026-09-24",
    "numero": 3,
    "nombre": "PARTIDO 11V11 - ESTRUCTURA 1-4-2-3-1",
    "conceptos_originales": [
      "Salida de balón",
      "Bloque bajo/medio",
      "Presión alta",
      "Amplitud y profundidad"
    ],
    "conceptos_canonicos": [
      "Salida de Balón",
      "Bloque Bajo",
      "Bloque Medio",
      "Presión Alta",
      "Amplitud",
      "Profundidad"
    ],
    "pendiente_contexto": []
  },
  "2026-09-25_T1": {
    "fecha": "2026-09-25",
    "numero": 1,
    "nombre": "TAREA LLEGADAS.",
    "conceptos_originales": [
      "Centros al área",
      "Remate de cabeza",
      "Desmarques de ruptura",
      "Ocupación de zonas de remate"
    ],
    "conceptos_canonicos": [
      "Centros al Área",
      "Remate de Cabeza (Ofensivo)",
      "Despeje Aéreo (Defensivo)",
      "Desmarques de Ruptura",
      "Ocupación de Zonas de Remate"
    ],
    "pendiente_contexto": []
  },
  "2026-09-25_T2": {
    "fecha": "2026-09-25",
    "numero": 2,
    "nombre": "TORNEO FÚTBOL 5.",
    "conceptos_originales": [
      "Competición",
      "Toma de decisiones",
      "Transiciones rápidas",
      "Juego reducido"
    ],
    "conceptos_canonicos": [
      "Competición",
      "Toma de Decisiones",
      "Transición Ofensiva",
      "Juego Reducido"
    ],
    "pendiente_contexto": []
  },
  "2026-09-29_T1": {
    "fecha": "2026-09-29",
    "numero": 1,
    "nombre": "POSESIÓN 4VS4 + 4",
    "conceptos_originales": [
      "Duelos 1v1"
    ],
    "conceptos_canonicos": [
      "Duelo 1v1"
    ],
    "pendiente_contexto": []
  },
  "2026-09-29_T2": {
    "fecha": "2026-09-29",
    "numero": 2,
    "nombre": "POSESIÓN 3 ZONAS",
    "conceptos_originales": [
      "Tercer hombre",
      "Cambio de orientación",
      "Presión tras pérdida",
      "Perfilación"
    ],
    "conceptos_canonicos": [
      "Tercer Hombre",
      "Cambio de Orientación",
      "Presión Tras Pérdida (PTP)",
      "Perfilación Defensiva"
    ],
    "pendiente_contexto": []
  },
  "2026-09-29_T3": {
    "fecha": "2026-09-29",
    "numero": 3,
    "nombre": "8 VS 5 + 3 DESCOLGADOS",
    "conceptos_originales": [
      "Transición ofensiva",
      "Transición defensiva",
      "Repliegue",
      "Ataque rápido"
    ],
    "conceptos_canonicos": [
      "Transición Ofensiva",
      "Transición Defensiva",
      "Repliegue",
      "Contraataque"
    ],
    "pendiente_contexto": []
  },
  "2026-09-29_T4": {
    "fecha": "2026-09-29",
    "numero": 4,
    "nombre": "PARTIDO 11V11",
    "conceptos_originales": [
      "Partido real",
      "Comportamientos tácticos",
      "Presión colectiva"
    ],
    "conceptos_canonicos": [
      "Partido Real",
      "Presión Colectiva"
    ],
    "pendiente_contexto": [
      "Comportamientos tácticos"
    ]
  }
};

/**
 * Obtener familia táctica por ID
 */
export function getFamilyById(id: string): TacticalFamily | undefined {
  return TACTICAL_FAMILIES.find(f => f.id === id);
}

/**
 * Obtener familia táctica de un concepto canónico
 */
export function getFamilyForConcept(canonicalConcept: string): TacticalFamily | undefined {
  const familyId = CANONICAL_TO_FAMILY_MAP[canonicalConcept];
  if (!familyId) return undefined;
  return getFamilyById(familyId);
}

/**
 * Obtener conceptos canónicos pertenecientes a una familia
 */
export function getConceptsForFamily(familyId?: string): string[] {
  if (!familyId || familyId === 'todas') {
    return TACTICAL_FAMILIES.flatMap(f => f.concepts);
  }
  const fam = getFamilyById(familyId);
  return fam ? fam.concepts : [];
}

/**
 * Normalizar texto para búsqueda
 */
function normalizeKey(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Resuelve el perfil táctico completo de una tarea:
 * 1. Cruza contra las 51 tareas auditadas de Drive.
 * 2. Si es una tarea nueva (futura sesión o editor):
 *    - Conserva términos originales intactos.
 *    - Resuelve canónicos según el Diccionario v2.
 *    - Si no existe en el catálogo, se conserva en original y se marca como PENDIENTE DE REVISIÓN.
 *    - No inventa equivalencias ni bloquea la tarea.
 */
export function resolveTaskTacticalProfile(
  task: PlanningTaskLibrary,
  sessionDate?: string | null
): TaskTacticalProfile {
  // Intentar matching por clave compuesta (fecha + numero)
  const effectiveDate = sessionDate || (task as unknown as { planning_sessions?: { fecha: string } })?.planning_sessions?.fecha;
  const taskNum = task.numero_tarea_pdf;

  if (effectiveDate && taskNum) {
    const key = `${effectiveDate}_T${taskNum}`;
    const audited = AUDITED_51_TASK_CONCEPTS[key];
    if (audited) {
      const familiasSet = new Set<TacticalFamilyId>();
      audited.conceptos_canonicos.forEach(c => {
        const famId = CANONICAL_TO_FAMILY_MAP[c];
        if (famId) familiasSet.add(famId);
      });
      const familias = Array.from(familiasSet)
        .map(fId => getFamilyById(fId))
        .filter((f): f is TacticalFamily => Boolean(f));

      return {
        conceptos_originales: audited.conceptos_originales,
        conceptos_canonicos: audited.conceptos_canonicos,
        pendiente_contexto: audited.pendiente_contexto,
        familias,
        is_pending_review: audited.pendiente_contexto.length > 0
      };
    }
  }

  // Tarea futura o manual: resolver dinámicamente desde texto o consignas
  const rawTerms: string[] = [];
  if (task.objetivo) {
    const lines = task.objetivo.split(/\r?\n|;/);
    lines.forEach(l => {
      const trimmed = l.trim().replace(/^[-•*\d.)\s]+/, '');
      if (trimmed.length > 2 && trimmed.length < 50) rawTerms.push(trimmed);
    });
  }

  const canonSet = new Set<string>();
  const pendingSet = new Set<string>();
  const origSet = new Set<string>(rawTerms);

  rawTerms.forEach(term => {
    const norm = normalizeKey(term);
    let matched = false;
    for (const [dictKey, entry] of Object.entries(V2_MAPPING_DICTIONARY)) {
      if (normalizeKey(dictKey) === norm) {
        matched = true;
        if (entry.is_pending) {
          pendingSet.add(term);
        }
        if (entry.canonical_targets && entry.canonical_targets.length > 0) {
          entry.canonical_targets.forEach(t => canonSet.add(t));
        }
        break;
      }
    }
    if (!matched) {
      // Término nuevo futuro: marcar pendiente sin inventar ni bloquear
      pendingSet.add(term);
    }
  });

  const canonArr = Array.from(canonSet);
  const familiasSet = new Set<TacticalFamilyId>();
  canonArr.forEach(c => {
    const famId = CANONICAL_TO_FAMILY_MAP[c];
    if (famId) familiasSet.add(famId);
  });
  const familias = Array.from(familiasSet)
    .map(fId => getFamilyById(fId))
    .filter((f): f is TacticalFamily => Boolean(f));

  return {
    conceptos_originales: Array.from(origSet),
    conceptos_canonicos: canonArr,
    pendiente_contexto: Array.from(pendingSet),
    familias,
    is_pending_review: pendingSet.size > 0
  };
}
