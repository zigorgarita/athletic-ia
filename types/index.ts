export type Demarcacion = 'Portero' | 'Defensa' | 'Centrocampista' | 'Delantero';
export type EstadoJugador = 'Disponible' | 'Lesionado' | 'Duda' | 'Sancionado';
export type Pierna = 'Diestro' | 'Zurdo' | 'Ambidiestro';
export type ABPType = 'Córner Ofensivo' | 'Córner Defensivo' | 'Falta Ofensiva' | 'Falta Defensiva' | 'Penalti' | 'Saque de Banda' | 'Jugada Ensayada';

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
  velocidad: number;
  aceleracion: number;
  fuerza: number;
  resistencia: number;
  juego_aereo: number;
  
  // Defensivas
  marcaje: number;
  entrada_defensiva: number;
  posicionamiento_defensivo: number;
  trabajo_defensivo: number;
  
  // Técnicas / Ofensivas
  pase_corto: number;
  pase_largo: number;
  control_orientado: number;
  regate: number;
  centros: number;
  finalizacion: number;
  disparo_lejano: number;
  trabajo_ofensivo: number;
  
  // Tácticas / Cognitivas
  vision_juego: number;
  inteligencia_tactica: number;
  liderazgo: number;
  
  created_at: string;
}

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
  created_at: string;
}

export interface ABPPlayerRole {
  id: string;
  abp_play_id: string;
  player_id: string;
  rol_asignado: string;
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
