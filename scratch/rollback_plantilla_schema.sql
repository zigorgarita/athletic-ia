-- ========================================================
-- SCRIPT DE ROLLBACK PARA EL MÓDULO PLANTILLA
-- ========================================================

-- 1. Eliminar la tabla de lesiones y sus políticas
DROP TABLE IF EXISTS player_injuries CASCADE;

-- 2. Eliminar la restricción única de detailed_evaluations
ALTER TABLE detailed_evaluations DROP CONSTRAINT IF EXISTS unique_player_evaluation_date;

-- 3. Eliminar las columnas añadidas a detailed_evaluations
ALTER TABLE detailed_evaluations DROP COLUMN IF EXISTS valoraciones_generales;
ALTER TABLE detailed_evaluations DROP COLUMN IF EXISTS perfil_especifico;
ALTER TABLE detailed_evaluations DROP COLUMN IF EXISTS evaluado_por;
ALTER TABLE detailed_evaluations DROP COLUMN IF EXISTS valoracion_global;
