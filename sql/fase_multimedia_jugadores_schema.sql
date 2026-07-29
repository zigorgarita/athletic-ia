-- =================================================================
-- MIGRACIÓN ADITIVA: Vídeos de Partido (Tipo A) y Vídeos Individuales (Tipo B) para Plantilla
-- =================================================================

-- 1. Relación Muchos a Muchos para Vídeos de Partido (Tipo A) y Jugadores
CREATE TABLE IF NOT EXISTS public.match_own_analysis_video_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES public.match_own_analysis_videos(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_match_video_player UNIQUE (video_id, player_id)
);

-- 2. Tabla para Vídeos Individuales / Multisesión del Jugador (Tipo B)
CREATE TABLE IF NOT EXISTS public.player_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Seguimiento Individual',
    comentario_tecnico TEXT,
    video_url TEXT,
    drive_file_id TEXT,
    tipo_origen TEXT DEFAULT 'Enlace' CHECK (tipo_origen IN ('Enlace', 'Archivo')),
    tamano_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_player_video_content CHECK (video_url IS NOT NULL OR drive_file_id IS NOT NULL)
);

-- 3. Relación Muchos a Muchos para Vídeos Individuales (Tipo B) y Jugadores
CREATE TABLE IF NOT EXISTS public.player_video_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES public.player_videos(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_player_video_target UNIQUE (video_id, player_id)
);

-- Habilitar RLS en las 3 tablas
ALTER TABLE public.match_own_analysis_video_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_video_targets ENABLE ROW LEVEL SECURITY;

-- Políticas RLS Reejecutables: Lectura pública permitida (SELECT)
DROP POLICY IF EXISTS "Public SELECT match_own_analysis_video_players" ON public.match_own_analysis_video_players;
CREATE POLICY "Public SELECT match_own_analysis_video_players" ON public.match_own_analysis_video_players FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public SELECT player_videos" ON public.player_videos;
CREATE POLICY "Public SELECT player_videos" ON public.player_videos FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public SELECT player_video_targets" ON public.player_video_targets;
CREATE POLICY "Public SELECT player_video_targets" ON public.player_video_targets FOR SELECT TO public USING (true);

-- Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_match_video_players_player ON public.match_own_analysis_video_players(player_id);
CREATE INDEX IF NOT EXISTS idx_match_video_players_video ON public.match_own_analysis_video_players(video_id);
CREATE INDEX IF NOT EXISTS idx_player_video_targets_player ON public.player_video_targets(player_id);
CREATE INDEX IF NOT EXISTS idx_player_video_targets_video ON public.player_video_targets(video_id);

-- Restricción única para garantizar como máximo un is_primary = true por player_video
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_video_one_primary
ON public.player_video_targets(video_id)
WHERE is_primary = true;
