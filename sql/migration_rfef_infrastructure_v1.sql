-- ====================================================================
-- MIGRACIÓN RFEF INFRAESTRUCTURA VACÍA (PASO 3B - PERMISOS BLINDADOS)
-- Proyecto: Athletic IA / Indautxu 26/27
-- ====================================================================

-- 1. TABLA DE PARTIDO OFICIAL ÚNICO
CREATE TABLE IF NOT EXISTS official_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfef_cod_acta INTEGER NOT NULL,
    temporada TEXT NOT NULL DEFAULT '2026-27',
    competicion TEXT NOT NULL DEFAULT 'División de Honor Juvenil',
    grupo TEXT NOT NULL DEFAULT 'Grupo 2',
    jornada INTEGER NOT NULL CHECK (jornada >= 1 AND jornada <= 30),
    fecha DATE,
    hora TIME,
    local_club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE RESTRICT,
    visitor_club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE RESTRICT,
    goles_local INTEGER,
    goles_visitante INTEGER,
    jugado BOOLEAN NOT NULL DEFAULT false,
    campo TEXT,
    superficie TEXT,
    arbitro TEXT,
    asistentes TEXT,
    oficiales JSONB DEFAULT '{}'::jsonb,
    source TEXT NOT NULL DEFAULT 'rfef',
    last_synced_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraints de Integridad (PostgreSQL crea automáticamente los índices para UNIQUE)
    CONSTRAINT uq_official_matches_acta UNIQUE (rfef_cod_acta),
    CONSTRAINT uq_official_matches_jornada_teams UNIQUE (temporada, jornada, local_club_id, visitor_club_id),
    CONSTRAINT chk_official_matches_distinct_clubs CHECK (local_club_id <> visitor_club_id)
);

-- Trigger updated_at para official_matches
CREATE OR REPLACE FUNCTION update_official_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_official_matches_updated_at ON official_matches;
CREATE TRIGGER trg_official_matches_updated_at
    BEFORE UPDATE ON official_matches
    FOR EACH ROW EXECUTE FUNCTION update_official_matches_updated_at();

-- 2. TABLA DE PARTICIPACIÓN RELACIONAL DE JUGADOR RIVAL
CREATE TABLE IF NOT EXISTS club_match_player_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    official_match_id UUID NOT NULL REFERENCES official_matches(id) ON DELETE CASCADE,
    club_player_id UUID NOT NULL REFERENCES club_players(id) ON DELETE RESTRICT, -- Protección histórico
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE RESTRICT,
    dorsal_partido INTEGER CHECK (dorsal_partido >= 1 AND dorsal_partido <= 99),
    convocado BOOLEAN NOT NULL DEFAULT true,
    titular BOOLEAN NOT NULL DEFAULT false,
    minuto_entrada INTEGER CHECK (minuto_entrada >= 0 AND minuto_entrada <= 120),
    minuto_salida INTEGER CHECK (minuto_salida >= 0 AND minuto_salida <= 120),
    minutos INTEGER NOT NULL DEFAULT 0 CHECK (minutos >= 0 AND minutos <= 120),
    goles INTEGER NOT NULL DEFAULT 0 CHECK (goles >= 0),
    amarillas INTEGER NOT NULL DEFAULT 0 CHECK (amarillas >= 0 AND amarillas <= 2),
    doble_amarilla BOOLEAN NOT NULL DEFAULT false,
    roja BOOLEAN NOT NULL DEFAULT false,
    motivo_sancion TEXT,
    source TEXT NOT NULL DEFAULT 'rfef',
    last_synced_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint de Unicidad (PostgreSQL crea automáticamente el índice compuesto)
    CONSTRAINT uq_club_match_player_unique UNIQUE (official_match_id, club_player_id)
);

-- 3. IDENTIFICADORES RFEF EN TABLAS EXISTENTES (NULLABLES Y SEGUROS)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS rfef_club_id INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clubs_rfef_club_id ON clubs(rfef_club_id) WHERE rfef_club_id IS NOT NULL;

ALTER TABLE club_players ADD COLUMN IF NOT EXISTS rfef_player_id INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS idx_club_players_season_rfef ON club_players(club_season_id, rfef_player_id) WHERE rfef_player_id IS NOT NULL;

-- 4. AMPLIACIÓN DEL CHECK DE club_players.origen PARA ADMITIR 'rfef'
ALTER TABLE club_players DROP CONSTRAINT IF EXISTS club_players_origen_check;
ALTER TABLE club_players ADD CONSTRAINT club_players_origen_check 
  CHECK (origen IN ('manual', 'documento', 'fvf', 'rfef'));

-- 5. ÍNDICES LIMPIOS (SOLO LOS ESTRICTAMENTE NECESARIOS, SIN REDUNDANCIAS)
-- Índices para claves foráneas de clubs (no cubiertas por constraints UNIQUE)
CREATE INDEX IF NOT EXISTS idx_official_matches_local ON official_matches(local_club_id);
CREATE INDEX IF NOT EXISTS idx_official_matches_visitor ON official_matches(visitor_club_id);

-- Índices para búsquedas inversas por jugador y por club
CREATE INDEX IF NOT EXISTS idx_cmps_player_id ON club_match_player_stats(club_player_id);
CREATE INDEX IF NOT EXISTS idx_cmps_club_id ON club_match_player_stats(club_id);

-- 6. SEGURIDAD Y PERMISOS (SOLO LECTURA PÚBLICA · CERO ESCRITURA PÚBLICA)
-- Activar Row Level Security
ALTER TABLE official_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_match_player_stats ENABLE ROW LEVEL SECURITY;

-- Denegar expresamente escrituras directas desde cliente (anon / authenticated / public)
REVOKE INSERT, UPDATE, DELETE ON TABLE official_matches FROM anon, authenticated, public;
REVOKE INSERT, UPDATE, DELETE ON TABLE club_match_player_stats FROM anon, authenticated, public;

-- Conceder explícitamente SELECT a anon y authenticated (imprescindible para que RLS permita lectura)
GRANT SELECT ON TABLE official_matches TO anon, authenticated;
GRANT SELECT ON TABLE club_match_player_stats TO anon, authenticated;

-- Políticas RLS: Permitir únicamente SELECT para lectura en la Web App
DROP POLICY IF EXISTS "Public Read official_matches" ON official_matches;
CREATE POLICY "Public Read official_matches" ON official_matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read club_match_player_stats" ON club_match_player_stats;
CREATE POLICY "Public Read club_match_player_stats" ON club_match_player_stats FOR SELECT USING (true);

-- Limpiar cualquier política residual de escritura que pudiera haber quedado
DROP POLICY IF EXISTS "Public Insert official_matches" ON official_matches;
DROP POLICY IF EXISTS "Public Update official_matches" ON official_matches;
DROP POLICY IF EXISTS "Public Delete official_matches" ON official_matches;

DROP POLICY IF EXISTS "Public Insert club_match_player_stats" ON club_match_player_stats;
DROP POLICY IF EXISTS "Public Update club_match_player_stats" ON club_match_player_stats;
DROP POLICY IF EXISTS "Public Delete club_match_player_stats" ON club_match_player_stats;

-- Concesión de acceso exclusivo a service_role (backend/rutas servidor)
GRANT ALL ON TABLE official_matches TO service_role;
GRANT ALL ON TABLE club_match_player_stats TO service_role;
