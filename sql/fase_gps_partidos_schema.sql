-- ====================================================================
-- MIGRACIÓN SCHEMA GPS CENTRADO EN PARTIDOS V3 (REVISIÓN DEFINITIVA ARCHIVO REAL PF)
-- ====================================================================

-- 1. Crear tabla de alias de nombres de jugadores (source_name_normalized -> player_id)
CREATE TABLE IF NOT EXISTS gps_player_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name TEXT NOT NULL,
    source_name_normalized TEXT NOT NULL UNIQUE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Modificar gps_sessions para asociarlo a un partido (matches.id) con ON DELETE SET NULL
ALTER TABLE gps_sessions ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES matches(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_match_gps_session'
    ) THEN
        ALTER TABLE gps_sessions ADD CONSTRAINT unique_match_gps_session UNIQUE (match_id);
    END IF;
END $$;

-- 3. Añadir nuevas columnas en gps_data (aceleraciones_max, deceleraciones_max, raw_data)
ALTER TABLE gps_data ADD COLUMN IF NOT EXISTS aceleraciones_max INTEGER;
ALTER TABLE gps_data ADD COLUMN IF NOT EXISTS deceleraciones_max INTEGER;
ALTER TABLE gps_data ADD COLUMN IF NOT EXISTS raw_data JSONB;

-- 4. Eliminar antigua constraint basada en dispositivo GPS físico si existiera
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_gps_id_per_session'
    ) THEN
        ALTER TABLE gps_data DROP CONSTRAINT unique_gps_id_per_session;
    END IF;
END $$;

-- 5. Añadir restricción de jugador único por partido en gps_data
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_player_per_gps_session'
    ) THEN
        ALTER TABLE gps_data ADD CONSTRAINT unique_player_per_gps_session UNIQUE (session_id, player_id);
    END IF;
END $$;

-- 6. Habilitar RLS estricto en gps_player_mappings (Lectura pública, escritura por RPC seguras)
ALTER TABLE gps_player_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read gps_player_mappings" ON gps_player_mappings;
CREATE POLICY "Public Read gps_player_mappings" ON gps_player_mappings FOR SELECT USING (true);
