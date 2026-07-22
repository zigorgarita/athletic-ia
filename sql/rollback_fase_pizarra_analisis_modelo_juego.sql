-- ============================================================
-- ROLLBACK: MÓDULO PIZARRA TÁCTICA — PERSISTENCIA DE ANÁLISIS DE MODELO DE JUEGO
-- ============================================================

ALTER TABLE tactical_lineups
DROP COLUMN IF EXISTS analisis_modelo_juego;
