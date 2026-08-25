-- ====================================================================
-- MIGRACION: TORNEO MULTI-PARTIDO - GPS OPCION C
-- Ejecutar en Supabase SQL Editor ANTES del deploy de Preview
-- NO modifica matches, gps_sessions existentes ni ningun dato historico
-- ====================================================================

-- 1. Tabla de sub-partidos de torneo
CREATE TABLE IF NOT EXISTS tournament_matches (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    rival       TEXT NOT NULL,
    orden       INTEGER NOT NULL DEFAULT 1,
    fecha       DATE NOT NULL,
    resultado   TEXT,
    descripcion TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read tournament_matches"
    ON tournament_matches FOR SELECT USING (true);

CREATE POLICY "Public Insert tournament_matches"
    ON tournament_matches FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Update tournament_matches"
    ON tournament_matches FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Public Delete tournament_matches"
    ON tournament_matches FOR DELETE USING (true);

-- 2. Columna FK opcional en gps_sessions
--    Para partidos normales queda NULL -> flujo GPS sin cambios
ALTER TABLE gps_sessions
    ADD COLUMN IF NOT EXISTS tournament_match_id UUID
    REFERENCES tournament_matches(id) ON DELETE SET NULL;

-- 3. Constraint UNIQUE para upsert de sesiones de torneo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_tournament_match_gps_session'
    ) THEN
        ALTER TABLE gps_sessions
            ADD CONSTRAINT unique_tournament_match_gps_session
            UNIQUE (tournament_match_id);
    END IF;
END $$;

-- ====================================================================
-- DATOS INICIALES: Torneo Iparralde - 22/08/2026
-- 1. Obtener el match_id real:
--    SELECT id, fecha, rival FROM matches WHERE fecha = '2026-08-22';
-- 2. Sustituir UUID_DEL_MATCH_IPARRALDE y descomentar:
-- ====================================================================
-- INSERT INTO tournament_matches (match_id, rival, orden, fecha, descripcion) VALUES
--   ('UUID_DEL_MATCH_IPARRALDE', 'Gimn?stica', 1, '2026-08-22', 'Partido 1 - Torneo Iparralde'),
--   ('UUID_DEL_MATCH_IPARRALDE', 'Oviedo',     2, '2026-08-22', 'Partido 2 - Torneo Iparralde'),
--   ('UUID_DEL_MATCH_IPARRALDE', 'Osasuna',    3, '2026-08-22', 'Partido 3 - Torneo Iparralde');
