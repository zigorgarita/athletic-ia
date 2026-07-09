-- ============================================================
-- MÓDULO CLUBES — ACTUALIZACIÓN FASE 13 (Estadísticas)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

ALTER TABLE club_seasons 
ADD COLUMN IF NOT EXISTS estadisticas JSONB DEFAULT '{
  "partidos_jugados": 0, 
  "victorias": 0, 
  "empates": 0, 
  "derrotas": 0, 
  "goles_favor": 0, 
  "goles_contra": 0, 
  "posicion_liga": null, 
  "puntos": 0, 
  "posesion_media": null, 
  "xg_favor": null, 
  "xg_contra": null, 
  "porterias_cero": 0, 
  "tarjetas_amarillas": 0, 
  "tarjetas_rojas": 0
}';
