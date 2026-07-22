-- ============================================================
-- MÓDULO PIZARRA TÁCTICA — PERSISTENCIA DE ANÁLISIS DE MODELO DE JUEGO
-- ============================================================

-- 1. Añadir columna analisis_modelo_juego a la tabla tactical_lineups
ALTER TABLE tactical_lineups
ADD COLUMN IF NOT EXISTS analisis_modelo_juego JSONB DEFAULT NULL;

-- Comentario de documentación
COMMENT ON COLUMN tactical_lineups.analisis_modelo_juego IS 'Almacena la estructura JSON del Análisis de Modelo de Juego Indautxu generado por IA';
