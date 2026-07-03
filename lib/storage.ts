import { supabase } from './supabase';

export const STORAGE_BUCKET = 'indautxu-assets';

export const STORAGE_PATHS = {
  players: {
    photos: 'players/photos',
    documents: 'players/documents',
  },
  tactics: {
    abpVideos: 'tactics/abp-videos',
    abpMatchVideos: 'tactics/abp-match-videos',
    diagrams: 'tactics/tactical-diagrams',
    scoutingReports: 'tactics/scouting/reports',
    scoutingVideos: 'tactics/scouting/videos',
  },
  sessions: {
    pdfs: 'sessions/pdfs',
    documents: 'sessions/documents',
  },
  matches: {
    fullVideos: 'matches/full-videos',
    clips: 'matches/clips',
    customVideos: 'matches/custom-videos',
    strategicActions: 'matches/strategic-actions',
    documents: 'matches/documents',
  },
  knowledge: {
    videos: 'knowledge/videos',
    pdfs: 'knowledge/pdfs',
    images: 'knowledge/images',
    exports: 'knowledge/exports',
  },
  exercises: {
    diagrams: 'exercises/diagrams',
    videos: 'exercises/videos',
  },
  gps: {
    exports: 'gps/exports',
  },
  media: {
    presentations: 'media/presentations',
    temp: 'media/temp',
  },
} as const;

/**
 * Sube un archivo a una ruta específica dentro del bucket 'indautxu-assets'
 * @param path Ruta de carpeta (ej: STORAGE_PATHS.knowledge.pdfs)
 * @param file Objeto File del navegador
 * @returns La URL pública del archivo subido
 */
export async function uploadToStorage(path: string, file: File): Promise<string> {
  // Generar un nombre único limpio
  const fileExt = file.name.split('.').pop() || '';
  const cleanBaseName = file.name
    .replace(`.${fileExt}`, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  const uniqueName = `${cleanBaseName}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = `${path}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Obtiene la URL pública para un objeto en el bucket 'indautxu-assets'
 * @param filePath Ruta completa del archivo dentro del bucket
 */
export function getPublicUrl(filePath: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
