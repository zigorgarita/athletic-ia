-- Actualización de la tabla tactical_lineups para soportar pizarra táctica avanzada
ALTER TABLE tactical_lineups ADD COLUMN IF NOT EXISTS nombre_pizarra TEXT;
ALTER TABLE tactical_lineups ADD COLUMN IF NOT EXISTS sistema_propio TEXT;
ALTER TABLE tactical_lineups ADD COLUMN IF NOT EXISTS sistema_rival TEXT;
ALTER TABLE tactical_lineups ADD COLUMN IF NOT EXISTS ventajas TEXT;
ALTER TABLE tactical_lineups ADD COLUMN IF NOT EXISTS desventajas TEXT;
ALTER TABLE tactical_lineups ADD COLUMN IF NOT EXISTS zona_conflicto TEXT;
ALTER TABLE tactical_lineups ADD COLUMN IF NOT EXISTS duelo_clave TEXT;
ALTER TABLE tactical_lineups ADD COLUMN IF NOT EXISTS orientaciones_individuales TEXT;

-- Migrar datos antiguos a las nuevas columnas
UPDATE tactical_lineups SET nombre_pizarra = nombre_sistema WHERE nombre_pizarra IS NULL;
UPDATE tactical_lineups SET sistema_propio = nombre_sistema WHERE sistema_propio IS NULL;
