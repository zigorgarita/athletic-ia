export type Demarcacion = 'Portero' | 'Defensa' | 'Centrocampista' | 'Delantero' | 'Lateral' | 'Central' | 'Pivote' | 'Interior' | 'Extremo';
export type EstadoJugador = 'Disponible' | 'Lesionado' | 'Duda' | 'Sancionado';
export type Pierna = 'Diestro' | 'Zurdo' | 'Ambidiestro';
export type ABPType =
  | 'Córner ofensivo'
  | 'Falta frontal ofensiva'
  | 'Falta lateral ofensiva'
  | 'Saque de banda ofensivo'
  | 'Saque de medio ofensivo'
  | 'Penalti ofensivo'
  | 'Jugada especial ofensiva'
  | 'Córner defensivo'
  | 'Falta frontal defensiva'
  | 'Falta lateral defensiva'
  | 'Saque de banda defensivo'
  | 'Saque de medio defensivo'
  | 'Penalti defensivo'
  | 'Jugada especial defensiva'
  | 'Saque inicial';

export interface Player {
  id: string;
  nombre: string;
  apellidos: string;
  dorsal: number;
  demarcacion: Demarcacion;
  posicion_secundaria: string | null;
  fecha_nacimiento: string;
  altura: number | null;
  peso: number | null;
  pierna_dominante: Pierna;
  estado: EstadoJugador;
  rol_abp: string | null;
  foto_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DetailedEvaluation {
  id: string;
  player_id: string;
  fecha_evaluacion: string;
  
  // Físicas
  velocidad?: number;
  aceleracion?: number;
  fuerza?: number;
  resistencia?: number;
  juego_aereo?: number;
  
  // Defensivas
  marcaje?: number;
  entrada_defensiva?: number;
  posicionamiento_defensivo?: number;
  trabajo_defensivo?: number;
  
  // Técnicas / Ofensivas
  pase_corto?: number;
  pase_largo?: number;
  control_orientado?: number;
  regate?: number;
  centros?: number;
  finalizacion?: number;
  disparo_lejano?: number;
  trabajo_ofensivo?: number;
  
  // Tácticas / Cognitivas
  vision_juego?: number;
  inteligencia_tactica?: number;
  liderazgo?: number;
  
  // Métricas dinámicas por posición
  metricas?: Record<string, number> | null;
  
  created_at: string;
}

export const METRICAS_POR_POSICION: Record<string, string[]> = {
  Portero: [
    'Reflejos',
    'Juego aéreo',
    '1x1',
    'Blocaje',
    'Saque con mano',
    'Saque con pie',
    'Comunicación',
    'Colocación'
  ],
  Central: [
    'Marcaje',
    'Anticipación',
    'Juego aéreo',
    'Duelo defensivo',
    'Salida de balón',
    'Posicionamiento',
    'Velocidad',
    'Liderazgo'
  ],
  Defensa: [
    'Marcaje',
    'Anticipación',
    'Juego aéreo',
    'Duelo defensivo',
    'Salida de balón',
    'Posicionamiento',
    'Velocidad',
    'Liderazgo'
  ],
  Lateral: [
    'Velocidad',
    'Aceleración',
    'Centros',
    'Duelo defensivo',
    'Resistencia',
    'Pase',
    'Inteligencia táctica'
  ],
  Pivote: [
    'Pase corto',
    'Pase largo',
    'Visión de juego',
    'Posicionamiento',
    'Recuperación',
    'Inteligencia táctica',
    'Liderazgo'
  ],
  Mediapunta: [
    'Control orientado',
    'Visión de juego',
    'Último pase',
    'Regate',
    'Creatividad',
    'Finalización'
  ],
  Interior: [
    'Control orientado',
    'Visión de juego',
    'Último pase',
    'Regate',
    'Creatividad',
    'Finalización'
  ],
  Centrocampista: [
    'Control orientado',
    'Visión de juego',
    'Último pase',
    'Regate',
    'Creatividad',
    'Finalización'
  ],
  Extremo: [
    'Velocidad',
    'Aceleración',
    'Regate',
    'Centros',
    '1 contra 1',
    'Finalización'
  ],
  Delantero: [
    'Finalización',
    'Desmarque',
    'Juego aéreo',
    'Remate',
    'Fuerza',
    'Movilidad',
    'Trabajo ofensivo'
  ]
};

export interface Observacion {
  id: string;
  player_id: string;
  fecha: string;
  rival: string;
  competicion: string;
  minutos_jugados: number;
  observacion_tecnica: string | null;
  observacion_tactica: string | null;
  observacion_fisica: string | null;
  observacion_mental: string | null;
  valoracion_global: number;
  created_at: string;
}

export interface Match {
  id: string;
  jornada: number;
  rival: string;
  fecha: string;
  es_local: boolean;
  goles_favor: number | null;
  goles_contra: number | null;
  jugado: boolean;
  created_at: string;
}

export interface MatchPlayerStats {
  id: string;
  match_id: string;
  player_id: string;
  titular: boolean;
  minutos: number;
  goles: number;
  asistencias: number;
  tarjeta_amarilla: boolean;
  tarjeta_roja: boolean;
  recuperaciones: number;
  intercepciones: number;
  duelos_ganados: number;
  pases_completados: number;
  pases_totales: number;
  created_at: string;
}

export interface GPSSession {
  id: string;
  fecha: string;
  descripcion: string | null;
  created_at: string;
}

export interface GPSData {
  id: string;
  session_id: string;
  player_id: string | null;
  gps_id: string;
  minutos: number;
  distancia_total: number;
  hsr: number | null;
  sprint_distance: number | null;
  num_sprints: number | null;
  velocidad_maxima: number | null;
  aceleraciones: number | null;
  deceleraciones: number | null;
  player_load: number | null;
  created_at: string;
}

export interface ABPPlay {
  id: string;
  tipo: ABPType;
  titulo: string;
  descripcion: string | null;
  video_url: string | null;
  zona?: string | null;
  created_at: string;
}

export interface ABPPlayerRole {
  id: string;
  abp_play_id: string;
  player_id: string | null;
  rol_asignado: string;
  posicion_x: number | null;
  posicion_y: number | null;
  etiqueta?: string | null;
  comentario?: string | null;
  orden?: number | null;
  created_at: string;
}

export interface TacticalLineup {
  id: string;
  nombre_sistema: string;
  notas: string | null;
  posiciones: any; // Coordenadas y mapeo JSON
  match_id: string | null;
  created_at: string;
}

export interface MatchVideo {
  id: string;
  titulo: string;
  descripcion: string | null;
  video_url: string;
  fecha_partido: string;
  created_at: string;
}

export const POSICIONES_REALES = [
  'Portero',
  'Central derecho',
  'Central izquierdo',
  'Central central',
  'Lateral derecho',
  'Lateral izquierdo',
  'Pivote',
  'Pivote derecho',
  'Pivote izquierdo',
  'Interior derecho',
  'Interior izquierdo',
  'Media punta',
  'Extremo derecho',
  'Extremo izquierdo',
  'Delantero centro'
] as const;

export type PosicionReal = typeof POSICIONES_REALES[number];

export const FUNCIONES_TACTICAS = [
  'Sacador',
  'Apoyo',
  'Tercer hombre',
  'Receptor',
  'Profundidad',
  'Vigilancia',
  'Cobertura'
] as const;

export type FuncionTactica = typeof FUNCIONES_TACTICAS[number];

