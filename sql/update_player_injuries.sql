-- =========================================================================
-- MIGRACIÓN: AGREGAR COLUMNAS FALTANTES A LA TABLA DE LESIONES
-- Ejecutar este script en el editor SQL de Supabase para poder guardar
-- y editar los campos "zona_afectada" y "tratamiento".
-- =========================================================================

ALTER TABLE player_injuries ADD COLUMN IF NOT EXISTS zona_afectada TEXT;
ALTER TABLE player_injuries ADD COLUMN IF NOT EXISTS tratamiento TEXT;
