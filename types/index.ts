export type Demarcacion = 'Portero' | 'Defensa' | 'Centrocampista' | 'Delantero';

export interface Player {
  id: string;
  nombre: string;
  dorsal: number;
  demarcacion: Demarcacion;
  fecha_nacimiento: string;
  foto_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Evaluation {
  id: string;
  player_id: string;
  tecnica: number; // 1-5
  tactica: number;  // 1-5
  condicional: number; // 1-5
  fecha_evaluacion: string;
  notas?: string;
  created_at: string;
}

export interface MatchVideo {
  id: string;
  titulo: string;
  descripcion: string;
  video_url: string;
  fecha_partido: string;
  created_at: string;
}
