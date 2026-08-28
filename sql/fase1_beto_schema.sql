-- ====================================================================
-- MIGRACIÓN SCHEMA BETO V1 (IMPORTACIÓN Y RENDIMIENTO GPS OLIVER)
-- Modelo de Seguridad Estricto:
-- 1. Acceso Anónimo (anon / public) totalmente BLOQUEADO.
-- 2. Lectura (SELECT) restringida exclusivamente a usuarios autenticados (authenticated).
-- 3. Escrituras (INSERT / UPDATE / DELETE) restringidas al Backend (Service Role).
-- ====================================================================

-- 1. Añadir oliver_player_id a la tabla players si no existe
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS oliver_player_id TEXT;
CREATE INDEX IF NOT EXISTS idx_players_oliver_player_id ON public.players(oliver_player_id);

-- 2. Tabla de importaciones de archivos BETO
CREATE TABLE IF NOT EXISTS public.beto_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type TEXT,
    drive_file_id TEXT,
    drive_file_url TEXT,
    drive_folder_id TEXT,
    drive_path TEXT,
    oliver_session_id TEXT,
    session_name TEXT,
    session_date DATE,
    season TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de sesiones BETO
CREATE TABLE IF NOT EXISTS public.beto_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id UUID REFERENCES public.beto_imports(id) ON DELETE CASCADE,
    oliver_session_id TEXT,
    session_name TEXT NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME WITHOUT TIME ZONE,
    end_time TIME WITHOUT TIME ZONE,
    duration_minutes NUMERIC(6,2),
    session_type TEXT NOT NULL DEFAULT 'ENTRENAMIENTO',
    season TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    total_players INTEGER DEFAULT 0,
    raw_header_data JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de métricas por jugador en la sesión BETO
CREATE TABLE IF NOT EXISTS public.beto_player_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.beto_sessions(id) ON DELETE CASCADE,
    import_id UUID NOT NULL REFERENCES public.beto_imports(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
    oliver_player_id TEXT,
    source_player_name TEXT NOT NULL,
    dorsal INTEGER,
    posicion TEXT,
    minutos NUMERIC(6,2),
    distancia_metros NUMERIC(8,2),
    metros_minuto NUMERIC(6,2),
    velocidad_maxima NUMERIC(5,2),
    distancia_sprint NUMERIC(8,2),
    distancia_alta_intensidad NUMERIC(8,2),
    sprints_count INTEGER,
    aceleraciones_count INTEGER,
    deceleraciones_count INTEGER,
    aceleraciones_max NUMERIC(5,2),
    deceleraciones_max NUMERIC(5,2),
    impactos_count INTEGER,
    golpes_balon INTEGER,
    carga_total NUMERIC(8,2),
    raw_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_beto_imports_hash ON public.beto_imports(file_hash);
CREATE INDEX IF NOT EXISTS idx_beto_sessions_date ON public.beto_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_beto_sessions_season ON public.beto_sessions(season);
CREATE INDEX IF NOT EXISTS idx_beto_sessions_oliver_id ON public.beto_sessions(oliver_session_id);
CREATE INDEX IF NOT EXISTS idx_beto_player_sessions_session ON public.beto_player_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_beto_player_sessions_player ON public.beto_player_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_beto_player_sessions_oliver_player ON public.beto_player_sessions(oliver_player_id);

-- 6. Políticas de Seguridad RLS Estrictas
ALTER TABLE public.beto_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beto_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beto_player_sessions ENABLE ROW LEVEL SECURITY;

-- Revocar permisos directos a usuarios anónimos
REVOKE ALL ON TABLE public.beto_imports FROM anon;
REVOKE ALL ON TABLE public.beto_sessions FROM anon;
REVOKE ALL ON TABLE public.beto_player_sessions FROM anon;

-- Eliminar políticas públicas previas si existieran
DROP POLICY IF EXISTS "Public SELECT beto_imports" ON public.beto_imports;
DROP POLICY IF EXISTS "Public SELECT beto_sessions" ON public.beto_sessions;
DROP POLICY IF EXISTS "Public SELECT beto_player_sessions" ON public.beto_player_sessions;

-- Permitir lectura (SELECT) únicamente a usuarios autenticados
DROP POLICY IF EXISTS "Authenticated SELECT beto_imports" ON public.beto_imports;
CREATE POLICY "Authenticated SELECT beto_imports" ON public.beto_imports FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated SELECT beto_sessions" ON public.beto_sessions;
CREATE POLICY "Authenticated SELECT beto_sessions" ON public.beto_sessions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated SELECT beto_player_sessions" ON public.beto_player_sessions;
CREATE POLICY "Authenticated SELECT beto_player_sessions" ON public.beto_player_sessions FOR SELECT TO authenticated USING (true);
