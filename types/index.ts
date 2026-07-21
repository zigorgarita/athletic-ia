export type Demarcacion = 'Portero' | 'Defensa' | 'Centrocampista' | 'Delantero' | 'Lateral' | 'Central' | 'Pivote' | 'Interior' | 'Extremo';
export type EstadoJugador = 'Disponible' | 'Lesionado' | 'Duda' | 'Sancionado' | 'Baja temporal';
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
  nacionalidad?: string;
  equipo?: string;
  categoria?: string;
  temporada?: string;
  metadata_personal?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PlayerInjury {
  id: string;
  player_id: string;
  fecha_lesion: string;
  tipo_lesion: string;
  diagnostico: string;
  informado_por: 'Entrenador' | 'Segundo entrenador' | 'Preparador físico' | 'Fisio' | 'Jugador';
  estado: 'Activa' | 'En recuperación' | 'Alta médica' | 'Recaída';
  fecha_prevista_recuperacion: string | null;
  fecha_real_recuperacion: string | null;
  observaciones: string | null;
  zona_afectada?: string | null;
  tratamiento?: string | null;
  created_at?: string;
  updated_at?: string;
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
  
  // Nuevas columnas para valoraciones
  perfil_especifico?: Record<string, number> | null;
  valoraciones_generales?: Record<string, number> | null;
  evaluado_por?: string | null;
  valoracion_global?: number | null;
  
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
  tipo_partido?: 'LIGA' | 'AMISTOSO';
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
  /** Posición del rol respecto al círculo en la pizarra y PDF. Default: 'bottom' */
  label_position?: 'top' | 'bottom' | 'left' | 'right' | null;
  created_at: string;
}

export interface MatchABPPlan {
  id: string;
  match_id: string;
  abp_play_id: string;
  orden: number;
  observaciones: string | null;
  video_asociado?: string | null;
  imagenes?: any | null;
  exito_porcentaje?: number | null;
  rival?: string | null;
  categoria?: string | null;
  etiquetas?: any | null;
  observaciones_cuerpo_tecnico?: string | null;
  recomendaciones_ia?: string | null;
  created_at: string;
  
  // Virtual properties for joins
  abp_play?: ABPPlay;
  assignments?: MatchABPPlayerAssignment[];
}

export interface MatchABPPlayerAssignment {
  id: string;
  match_abp_plan_id: string;
  abp_player_role_id: string;
  player_id: string | null;
  notas_especificas: string | null;
  created_at: string;
  
  // Virtual properties for joins
  role?: ABPPlayerRole;
  player?: Player;
}

export interface GameModelRoleInstructions {
  portero: string;
  centralIzquierdo: string;
  centralDerecho: string;
  lateralIzquierdo: string;
  lateralDerecho: string;
  pivoteDefensivo: string;
  pivoteOfensivo: string;
  mediapunta: string;
  extremoIzquierdo: string;
  extremoDerecho: string;
  delantero: string;
}

export interface GameModelAnalysis {
  planAtaque?: string;
  planDefensivo?: string;
  riesgosAsumidos?: string;
  ajustesMister?: string;
  transicionAtaqueDefensa?: string;
  transicionDefensaAtaque?: string;
  instruccionesPorPuesto?: GameModelRoleInstructions;

  // Aliases de compatibilidad
  ataque_posicional?: string;
  defensa_posicional?: string;
  transicion_perdida?: string;
  transicion_recuperacion?: string;
  riesgos_asumidos?: string;
  ajustes_especificos?: string;
  tareas_roles_modelo?: string;
}

export interface TacticalLineup {
  id: string;
  nombre_sistema: string;
  nombre_pizarra: string | null;
  sistema_propio: string | null;
  sistema_rival: string | null;
  notas: string | null;
  posiciones: any; // Coordenadas y mapeo JSON
  match_id: string | null;
  ventajas: string | null;
  desventajas: string | null;
  zona_conflicto: string | null;
  duelo_clave: string | null;
  orientaciones_individuales: string | null;
  analisis_modelo_juego?: GameModelAnalysis | string | null;
  created_at: string;
}

export interface PositionNode {
  id: number;
  label: string;
  x: number;
  y: number;
  player_id: string | null;
  notas_entrenador?: string;
  customName?: string;
  customNumber?: string;
}

export interface TacticalSystem {
  id: string;
  nombre: string;
  descripcion: string | null;
  filosofia: string | null;
  coordenadas_base: PositionNode[];
  created_at: string;
}

export interface TacticalMatchup {
  id: string;
  system_own_id: string;
  system_rival_id: string;
  ventajas: string | null;
  desventajas: string | null;
  zona_conflicto: string | null;
  duelo_clave: string | null;
  tareas_lineas: string | null;
  ai_context: string | null;
  created_at: string;
}

export interface TacticalMatchPlan {
  id: string;
  match_id: string;
  system_own_id: string | null;
  system_rival_id: string | null;
  matchup_id: string | null;
  notas_entrenador: string | null;
  conclusiones_post: string | null;
  estado: 'borrador' | 'preparado' | 'cerrado';
  created_at: string;
  updated_at: string;
}

export interface TacticalRoleCard {
  id: string;
  matchup_id: string | null;
  match_plan_id: string | null;
  linea: 'Portería' | 'Defensa' | 'Mediocampo' | 'Delantera';
  posicion_label: string;
  fase_ofensiva: string | null;
  fase_defensiva: string | null;
  transiciones: string | null;
  instrucciones_especificas: string | null;
  referencia_visual: string | null;
  ai_context: string | null;
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

// --- NUEVOS TIPOS DE PLANIFICACIÓN ---

export interface PlanningPeriod {
  id: string;
  nombre: string;
  orden: number;
  created_at: string;
}

export interface PlanningSession {
  id: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  duracion_total: number;
  campo_instalacion: string | null;
  tipo_sesion: string | null;
  objetivo_principal: string | null;
  carga: string | null;
  num_jugadores_previstos: number;
  num_porteros_previstos: number;
  jornada_id: string | null;
  objetivo_semanal: string | null;
  created_at: string;
  // Planificación V2
  estado?: string | null;
  evaluacion_completada?: boolean;
  evaluacion_duracion_real?: number | null;
  evaluacion_observaciones?: string | null;
  categoria_filtro?: string | null;
  hora_convocatoria?: string | null;
  observaciones_convocatoria?: string | null;
  checklist_material?: any;
}

export interface PlanningConcept {
  id: string;
  session_id: string;
  categoria: string;
  concepto: string;
  created_at: string;
}

export interface PlanningTask {
  id: string;
  planning_session_id: string;
  nombre_tarea: string;
  tipo_tarea: string;
  minutos: number;
  jugadores: number | null;
  espacio: string | null;
  objetivo: string | null;
  descripcion: string | null;
  observaciones: string | null;
  orden: number;
  created_at: string;
  // Planificación V2
  responsable_staff?: string | null;
  responsable_staff_otro?: string | null;
}

export interface PlanningTaskLibrary {
  id: string;
  nombre: string;
  tipo_tarea: string;
  minutos_defecto: number;
  jugadores_defecto: number | null;
  espacio_defecto: string | null;
  objetivo: string | null;
  descripcion: string;
  observaciones: string | null;
  creado_por: string;
  created_at: string;
}

export interface PlanningSessionPlayer {
  id: string;
  session_id: string;
  player_id: string;
  convocado: boolean;
  estado_sesion: string | null;
  created_at: string;
}

export interface PlanningDocument {
  id: string;
  planning_session_id: string;
  nombre_documento: string;
  tipo_documento: string;
  url_storage: string;
  fecha_subida: string;
  created_at: string;
}

export type AttendanceStatus = 'Asiste' | 'No asiste' | 'Lesionado' | 'Duda' | 'Sancionado' | 'Baja temporal';

export interface TrainingAttendance {
  id?: string;
  session_id: string;
  player_id: string | null;
  player_full_name_backup?: string | null;
  player_dorsal_backup?: number | null;
  attendance_status: AttendanceStatus;
  absence_reason?: string | null;
  attendance_notes?: string | null;
  recorded_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TrainingEvaluation {
  id?: string;
  session_id: string;
  player_id: string | null;
  player_full_name_backup?: string | null;
  player_dorsal_backup?: number | null;
  actitud?: number | null;
  intensidad?: number | null;
  comprension_tactica?: number | null;
  ejecucion_tecnica?: number | null;
  compromiso_defensivo?: number | null;
  compromiso_ofensivo?: number | null;
  valoracion_global?: number | null;
  observaciones?: string | null;
  fecha_evaluacion?: string;
  evaluated_by?: string;
  created_at?: string;
  updated_at?: string;
}

// --- TIPOS DE CENTRO DE PARTIDO (LIGA V2) ---

export interface MatchABPPlay {
  id: string;
  match_id: string;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  video_url: string | null;
  tipo_origen: 'Enlace' | 'Archivo';
  created_at: string;
}

export interface MatchABPPlayerRole {
  id: string;
  match_abp_play_id: string;
  player_id: string | null;
  player_full_name_backup: string | null;
  player_dorsal_backup: number | null;
  rol_asignado: string;
  posicion_x: number | null;
  posicion_y: number | null;
  etiqueta?: string | null;
  comentario?: string | null;
  orden?: number | null;
  created_at: string;
}

export interface MatchFullVideo {
  id: string;
  match_id: string;
  tipo_video: 'Completo' | 'Primera Parte' | 'Segunda Parte';
  tipo_origen: 'Enlace' | 'Archivo';
  video_url: string;
  nombre_descriptivo: string | null;
  created_at: string;
}

export interface MatchVideoClip {
  id: string;
  match_id: string;
  categoria: 'OFENSIVO' | 'DEFENSIVO';
  subcategoria: string;
  titulo: string;
  tipo_origen: 'Enlace' | 'Archivo';
  video_url: string;
  comentario_tecnico: string | null;
  created_at: string;
}

export interface MatchStrategicAction {
  id: string;
  match_id: string;
  tipo: 'VIGILAR' | 'RECALCAR';
  aspecto: string;
  descripcion: string | null;
  tipo_origen: 'Enlace' | 'Archivo';
  video_url: string;
  created_at: string;
}

export interface Rival {
  id: string;
  nombre: string;
  escudo_url: string | null;
  campo_nombre: string | null;
  campo_dimensiones: string | null;
  campo_superficie: string | null;
  info_general: string | null;
  estadisticas: Record<string, any> | null;
  notas_entrenador: string | null;
  created_at: string;
}

export interface RivalVideo {
  id: string;
  rival_id: string;
  tipo: 'COMPLETO' | 'CORTE';
  titulo: string;
  url: string;
  comentarios: string | null;
  created_at: string;
}

export interface MatchCustomVideo {
  id: string;
  match_id: string;
  etiqueta: 'Delanteros' | 'Centrales' | 'Pivotes' | 'Individual' | 'Otros';
  titulo: string;
  tipo_origen: 'Enlace' | 'Archivo';
  video_url: string;
  created_at: string;
}

export interface MatchDocument {
  id: string;
  match_id: string;
  nombre_documento: string;
  tipo_documento: string;
  tipo_origen: 'Enlace' | 'Archivo';
  url_storage: string;
  fecha: string;
  comentario: string | null;
  created_at: string;
}

// --- BIBLIOTECA DE CONOCIMIENTO TÁCTICO ---

export const KNOWLEDGE_CATEGORIES = [
  'Sistema de juego',
  'Modelo de juego',
  'Principio ofensivo',
  'Principio defensivo',
  'ABP / Estrategia',
  'Transición ofensiva',
  'Transición defensiva',
  'Salida de balón',
  'Presión',
  'Rol por posición',
  'Ejercicio',
  'Sesión tipo',
  'Análisis rival',
  'Principios generales'
] as const;
export type KnowledgeCategory = typeof KNOWLEDGE_CATEGORIES[number];

export const KNOWLEDGE_PHASES = [
  'Ataque organizado',
  'Ataque rápido / Contraataque',
  'Defensa organizada',
  'Presión tras pérdida',
  'Transición O→D',
  'Transición D→O',
  'ABP ofensiva',
  'ABP defensiva',
  'Global'
] as const;
export type KnowledgePhase = typeof KNOWLEDGE_PHASES[number];

export const KNOWLEDGE_LINK_TYPES = [
  'planning_session',
  'planning_task',
  'planning_task_library',
  'tactical_system',
  'tactical_matchup',
  'tactical_match_plan',
  'tactical_role_card',
  'match',
  'abp_play',
  'player',
  'gps_session',
  'match_video_clip'
] as const;
export type KnowledgeLinkType = typeof KNOWLEDGE_LINK_TYPES[number];

export interface KnowledgeEntry {
  id: string;
  titulo: string;
  categoria: KnowledgeCategory;
  fase_juego: KnowledgePhase | null;
  sistema_asociado: string | null;
  posicion_asociada: string | null;
  principio_clave: string | null;
  descripcion: string;
  instrucciones_linea: Record<string, string> | null;
  variantes: string | null;
  consignas: string[] | null;
  metadata: Record<string, any>;
  creado_por: string;
  temporada: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones cargadas opcionalmente
  media?: KnowledgeMedia[];
  tags?: KnowledgeTag[];
  links?: KnowledgeLink[];
}

export interface KnowledgeMedia {
  id: string;
  knowledge_entry_id: string;
  tipo_media: 'video' | 'pdf' | 'imagen' | 'enlace';
  titulo: string | null;
  url: string;
  tipo_origen: 'Enlace' | 'Archivo';
  descripcion: string | null;
  orden: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface KnowledgeLink {
  id: string;
  knowledge_entry_id: string;
  linked_entity_type: KnowledgeLinkType;
  linked_entity_id: string;
  relacion: string;
  notas: string | null;
  created_at: string;
}

export interface KnowledgeTag {
  id: string;
  knowledge_entry_id: string;
  tag: string;
  created_at: string;
}

export interface KnowledgeQueryContext {
  sistema?: string;
  fase?: string;
  posicion?: string;
  categoria?: string;
  tags?: string[];
  matchId?: string;
  limit?: number;
}

// --- ASISTENTE IA ---

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actionType?: string; // 'analyze_matchup' | 'suggest_roles' | 'suggest_session' | etc.
  suggestedActions?: AIAction[];
}

export interface AIAction {
  type: 'apply_to_matchup' | 'apply_to_role_card' | 'save_to_library' | 'create_session' | 'copy';
  label: string;
  data: Record<string, any>;
}

export interface TacticalAIContext {
  systemOwn: string;
  systemRival: string;
  matchupId: string | null;
  matchId: string | null;
  matchRival?: string | null;
  assignedPlayerIds: string[];
  assignedPositions?: { label: string; playerId: string | null }[] | Record<string, string>;
  systemNodes?: string[];
  roleCards: TacticalRoleCard[];
  ventajas: string;
  desventajas: string;
  zonaConflicto: string;
  dueloClave: string;
  tareasLineas: string;
}

export interface PlayerFine {
  id: string;
  player_id: string;
  motivo: string;
  fecha: string;
  contexto: 'Entrenamiento' | 'Partido' | 'Otro';
  evento_id: string | null;
  evento_nombre: string | null;
  importe: number;
  cantidad: number;
  estado: 'Pendiente' | 'Pagado';
  observaciones: string | null;
  created_at?: string;
  updated_at?: string;
}



