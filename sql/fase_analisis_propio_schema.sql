-- =================================================================
-- MIGRACIÓN ADITIVA: Tabla de vídeos para ANÁLISIS PROPIO en partidos
-- =================================================================

CREATE TABLE IF NOT EXISTS public.match_own_analysis_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL,
    titulo TEXT,
    video_url TEXT,
    drive_file_id TEXT,
    tipo_origen TEXT DEFAULT 'Enlace',
    tamano_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_video_or_drive CHECK (video_url IS NOT NULL OR drive_file_id IS NOT NULL)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.match_own_analysis_videos ENABLE ROW LEVEL SECURITY;

-- ÚNICA política RLS pública: SELECT para lectura en la aplicación.
-- Las operaciones de alta (INSERT), modificación (UPDATE) y borrado (DELETE) se realizan
-- exclusivamente mediante los RPC seguros 'exec_secure_upsert' y 'exec_secure_delete'
-- validados por la clave de staff del servidor.
DROP POLICY IF EXISTS "Permitir SELECT a todos los usuarios" ON public.match_own_analysis_videos;
CREATE POLICY "Permitir SELECT a todos los usuarios" ON public.match_own_analysis_videos FOR SELECT TO public USING (true);

-- Índice compuesto para consultas ultra-rápidas por partido y categoría
CREATE INDEX IF NOT EXISTS idx_own_analysis_videos_match_cat 
ON public.match_own_analysis_videos(match_id, categoria);
