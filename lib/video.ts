export type VideoType = 'youtube' | 'shorts' | 'vimeo' | 'gdrive' | 'direct';

export interface VideoInfo {
  type: VideoType;
  id: string | null;
  embedUrl: string;
  thumbnailUrl: string | null;
  isVertical?: boolean;
}

/**
 * Analiza una URL de video y extrae el tipo, ID, URL de inserción y miniatura (con soporte para YouTube Shorts y Drive)
 */
export function parseVideoUrl(url: string): VideoInfo {
  if (!url || typeof url !== 'string') {
    return { type: 'direct', id: null, embedUrl: '', thumbnailUrl: null };
  }

  const cleanUrl = url.trim();

  // 1. YouTube Shorts
  const shortsRegex = /(?:youtube\.com\/shorts\/)([^"&?\/\s]{11})/i;
  const shortsMatch = cleanUrl.match(shortsRegex);
  if (shortsMatch && shortsMatch[1]) {
    const videoId = shortsMatch[1];
    return {
      type: 'shorts',
      id: videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      isVertical: true
    };
  }

  // 2. YouTube Estándar (incluye parámetros como ?t=10s, &feature=shared)
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const ytMatch = cleanUrl.match(ytRegex);

  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    
    // Extraer parámetro de inicio de tiempo si existe (ej. ?t=10 o &t=10s)
    const timeMatch = cleanUrl.match(/[?&]t=(\d+)s?/i);
    const startParam = timeMatch && timeMatch[1] ? `&start=${timeMatch[1]}` : '';

    return {
      type: 'youtube',
      id: videoId,
      embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1${startParam}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      isVertical: false
    };
  }

  // 3. Google Drive
  if (cleanUrl.includes('drive.google.com')) {
    const gdMatch = cleanUrl.match(/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/i);
    if (gdMatch && gdMatch[1]) {
      const fileId = gdMatch[1];
      return {
        type: 'gdrive',
        id: fileId,
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        thumbnailUrl: null,
        isVertical: false
      };
    }
  }

  // 4. Vimeo Regexes
  const vimeoRegex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i;
  const vimeoMatch = cleanUrl.match(vimeoRegex);

  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      type: 'vimeo',
      id: videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1`,
      thumbnailUrl: null,
      isVertical: false
    };
  }

  // 5. Direct Video fallback (.mp4, .webm, .mov, etc. o Supabase storage)
  return {
    type: 'direct',
    id: null,
    embedUrl: cleanUrl,
    thumbnailUrl: null,
    isVertical: false
  };
}

/**
 * Valida si una URL es compatible (YouTube, Shorts, Drive, Vimeo o URL de video directa)
 */
export function isValidVideoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    new URL(url.trim());
  } catch {
    return false;
  }

  const info = parseVideoUrl(url);
  if (info.type === 'youtube' || info.type === 'shorts' || info.type === 'gdrive' || info.type === 'vimeo') {
    return true;
  }

  const lowercaseUrl = url.toLowerCase();
  return (
    lowercaseUrl.endsWith('.mp4') ||
    lowercaseUrl.endsWith('.webm') ||
    lowercaseUrl.endsWith('.mov') ||
    lowercaseUrl.endsWith('.m4v') ||
    lowercaseUrl.endsWith('.ogg') ||
    lowercaseUrl.includes('supabase.co/storage/') ||
    lowercaseUrl.includes('video') ||
    lowercaseUrl.includes('stream')
  );
}
