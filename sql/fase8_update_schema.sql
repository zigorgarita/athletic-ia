-- ============================================================
-- MÓDULO CLUBES — ACTUALIZACIÓN FASE 8 (Informes)
-- Ejecutar en Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Eliminar la restricción antigua del tipo de informe
ALTER TABLE club_reports DROP CONSTRAINT IF EXISTS club_reports_tipo_check;

-- 2. Añadir nuevos campos de estado y relaciones
ALTER TABLE club_reports 
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'Borrador' CHECK (estado IN ('Borrador', 'Definitivo', 'Cerrado')),
ADD COLUMN IF NOT EXISTS adjuntos JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS enlaces JSONB DEFAULT '{"jugadores": [], "videos": [], "partidos": []}';
