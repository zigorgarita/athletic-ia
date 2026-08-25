-- ====================================================================
-- MIGRACIÓN ADITIVA: ORIGEN DE DATOS EN PLANTILLA DE RIVALES
-- Añade columna `origen` a club_players para distinguir procedencia:
-- 'manual' (edición manual actual) | 'documento' (foto/alineación) | 'fvf' (futura federación)
-- ====================================================================

ALTER TABLE club_players 
  ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'manual' 
  CHECK (origen IN ('manual', 'documento', 'fvf'));

-- Índice para optimizar consultas por origen
CREATE INDEX IF NOT EXISTS idx_club_players_origen ON club_players(origen);
