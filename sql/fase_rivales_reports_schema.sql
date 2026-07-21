-- ============================================================
-- MÓDULO RIVALES & PIZARRA TÁCTICA — FASE INFORMES DE SCOUTING
-- ARQUITECTURA DEFINITIVA DE SEGURIDAD SERVIDOR (TABLAS 100% PRIVADAS)
-- Ejecutar en Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. TABLA DE OBSERVACIONES INDIVIDUALES POR INFORME
CREATE TABLE IF NOT EXISTS club_report_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES club_documents(id) ON DELETE SET NULL,
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  club_season_id UUID REFERENCES club_seasons(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL DEFAULT 'Documento de Scouting',
  document_date DATE,
  rival_name TEXT,
  season TEXT,
  category TEXT NOT NULL, -- 'salidaBalon', 'transicionDefensiva', 'balonParadoOfensivo', 'jugadorRival', etc.
  content TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('texto', 'imagen', 'tabla', 'nota')),
  page INTEGER,
  original_evidence TEXT,
  confidence TEXT NOT NULL CHECK (confidence IN ('alta', 'media', 'baja')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('baja', 'normal', 'alta', 'clave')),
  is_analyst_proposal BOOLEAN DEFAULT false,
  -- Datos específicos para amenazas de jugadores rivales
  rival_player_name TEXT,
  rival_player_dorsal TEXT,
  rival_player_position TEXT,
  rival_player_threat_level TEXT CHECK (rival_player_threat_level IN ('bajo', 'medio', 'alto', 'critico')),
  observed_match_id UUID, -- Guardado como UUID genérico para compatibilidad con club_scouting_matches / matches
  observation_date DATE,
  -- Trazabilidad y Aprobación Segura
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by_name TEXT DEFAULT 'Cuerpo Técnico',
  approved_via TEXT DEFAULT 'staff_passkey_server',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Trigger para updated_at en club_report_observations
CREATE OR REPLACE FUNCTION update_club_report_observations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_club_report_observations_updated_at ON club_report_observations;
CREATE TRIGGER trigger_club_report_observations_updated_at
BEFORE UPDATE ON club_report_observations
FOR EACH ROW EXECUTE FUNCTION update_club_report_observations_updated_at();


-- 2. TABLA RELACIONAL DE SELECCIÓN DE INFORMES POR PIZARRA
CREATE TABLE IF NOT EXISTS tactical_lineup_report_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tactical_lineup_id UUID NOT NULL REFERENCES tactical_lineups(id) ON DELETE CASCADE,
  report_id UUID REFERENCES club_reports(id) ON DELETE CASCADE,
  document_id UUID REFERENCES club_documents(id) ON DELETE CASCADE,
  selected BOOLEAN NOT NULL DEFAULT true,
  selected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  selected_via TEXT DEFAULT 'staff_passkey_server',
  selected_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  CONSTRAINT chk_single_report_source CHECK (num_nonnulls(report_id, document_id) = 1)
);

-- Índices únicos parciales (permiten NULL en la columna no utilizada)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tactical_lineup_report_sel_report
ON tactical_lineup_report_selections (tactical_lineup_id, report_id)
WHERE report_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tactical_lineup_report_sel_doc
ON tactical_lineup_report_selections (tactical_lineup_id, document_id)
WHERE document_id IS NOT NULL;

-- Índices de búsqueda para optimizar consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_club_report_obs_doc_id ON club_report_observations(document_id);
CREATE INDEX IF NOT EXISTS idx_club_report_obs_club_id ON club_report_observations(club_id);
CREATE INDEX IF NOT EXISTS idx_club_report_obs_season_id ON club_report_observations(club_season_id);
CREATE INDEX IF NOT EXISTS idx_club_report_obs_status ON club_report_observations(status);

CREATE INDEX IF NOT EXISTS idx_tactical_lineup_rep_sel_lineup_id ON tactical_lineup_report_selections(tactical_lineup_id);
CREATE INDEX IF NOT EXISTS idx_tactical_lineup_rep_sel_report_id ON tactical_lineup_report_selections(report_id);


-- 3. ACTIVACIÓN DE RLS Y DENEGACIÓN DE PERMISOS DIRECTOS
ALTER TABLE club_report_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tactical_lineup_report_selections ENABLE ROW LEVEL SECURITY;

-- Limpiar cualquier política directa previa de forma idempotente
DROP POLICY IF EXISTS "Permitir lectura publica de observaciones" ON club_report_observations;
DROP POLICY IF EXISTS "Permitir escritura autenticada de observaciones" ON club_report_observations;
DROP POLICY IF EXISTS "Allow authenticated read club_report_observations" ON club_report_observations;
DROP POLICY IF EXISTS "Allow authenticated insert club_report_observations" ON club_report_observations;
DROP POLICY IF EXISTS "Allow authenticated update club_report_observations" ON club_report_observations;
DROP POLICY IF EXISTS "Allow authenticated delete club_report_observations" ON club_report_observations;
DROP POLICY IF EXISTS "Allow public select on club_report_observations" ON club_report_observations;
DROP POLICY IF EXISTS "Allow select on club_report_observations" ON club_report_observations;

DROP POLICY IF EXISTS "Permitir lectura publica de selecciones de informes" ON tactical_lineup_report_selections;
DROP POLICY IF EXISTS "Permitir escritura autenticada de selecciones" ON tactical_lineup_report_selections;
DROP POLICY IF EXISTS "Allow authenticated read tactical_lineup_report_selections" ON tactical_lineup_report_selections;
DROP POLICY IF EXISTS "Allow authenticated insert tactical_lineup_report_selections" ON tactical_lineup_report_selections;
DROP POLICY IF EXISTS "Allow authenticated update tactical_lineup_report_selections" ON tactical_lineup_report_selections;
DROP POLICY IF EXISTS "Allow authenticated delete tactical_lineup_report_selections" ON tactical_lineup_report_selections;
DROP POLICY IF EXISTS "Allow public select on tactical_lineup_report_selections" ON tactical_lineup_report_selections;
DROP POLICY IF EXISTS "Allow select on tactical_lineup_report_selections" ON tactical_lineup_report_selections;

-- REVOKE EXPLICITO DE ACCESO DIRECTO DESDE CLIENTE (ANON / AUTHENTICATED / PUBLIC)
REVOKE ALL ON TABLE club_report_observations FROM anon, authenticated, public;
REVOKE ALL ON TABLE tactical_lineup_report_selections FROM anon, authenticated, public;

-- CONCESIÓN DE ACCESO EXCLUSIVO A SERVICE_ROLE (PARA LAS RUTAS API DEL SERVIDOR NEXT.JS)
GRANT ALL ON TABLE club_report_observations TO service_role;
GRANT ALL ON TABLE tactical_lineup_report_selections TO service_role;

-- NOTA IMPORTANTE DE ARQUITECTURA DE SEGURIDAD:
-- RLS activo sin políticas + REVOKE ALL garantizan que ningún usuario o script con la clave pública (NEXT_PUBLIC_SUPABASE_ANON_KEY)
-- pueda leer, insertar, modificar o eliminar datos de estas dos tablas mediante REST API.
-- Todo el acceso se gestiona mediante el cliente de servidor seguro con service_role en los endpoints de Next.js.
