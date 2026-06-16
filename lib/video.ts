/**
 * Utilidades para procesar URLs de videos de partidos (YouTube, Vimeo y Directo)
 */

export type VideoType = 'youtube' | 'vimeo' | 'direct';

export interface VideoInfo {
  type: VideoType;
  id: string | null;
  embedUrl: string;
  thumbnailUrl: string | null;
}

/**
 * Analiza una URL de video y extrae el tipo, ID, URL de inserción y miniatura
 */
export function parseVideoUrl(url: string): VideoInfo {
  const cleanUrl = url.trim();

  // 1. YouTube Regexes
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const ytMatch = cleanUrl.match(ytRegex);

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: 'youtube',
      id: videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  // 2. Vimeo Regexes
  const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i;
  const vimeoMatch = cleanUrl.match(vimeoRegex);

  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      type: 'vimeo',
      id: videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1`,
      thumbnailUrl: null, // Vimeo requiere llamada API para miniaturas reales, usaremos placeholder en UI
    };
  }

  // 3. Direct Video fallback (ej: .mp4, .webm, .ogg o URL directa genérica)
  return {
    type: 'direct',
    id: null,
    embedUrl: cleanUrl,
    thumbnailUrl: null,
  };
}

/**
 * Valida si una URL es compatible (YouTube, Vimeo o URL de video directa)
 */
export function isValidVideoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Expresión regular para validar formato URL general básico
  try {
    new URL(url);
  } catch {
    return false;
  }

  const info = parseVideoUrl(url);
  if (info.type === 'youtube' || info.type === 'vimeo') {
    return true;
  }

  // Si es directo, validar extensiones comunes o simplemente permitir si es una URL bien formada
  const lowercaseUrl = url.toLowerCase();
  return (
    lowercaseUrl.endsWith('.mp4') ||
    lowercaseUrl.endsWith('.webm') ||
    lowercaseUrl.endsWith('.ogg') ||
    lowercaseUrl.includes('video') ||
    lowercaseUrl.includes('stream')
  );
}
