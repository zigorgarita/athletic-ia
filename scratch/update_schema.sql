-- 1. Eliminar el trigger y la función que limitaban la tabla a 20 jugadores
DROP TRIGGER IF EXISTS enforce_players_limit ON players;
DROP FUNCTION IF EXISTS check_players_limit();

-- 2. Añadir la columna 'equipo' como opcional inicialmente para no fallar con los datos existentes
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipo TEXT CHECK (equipo IN ('DH', 'B'));

-- 3. Establecer 'DH' por defecto para todos los jugadores actuales
UPDATE players SET equipo = 'DH' WHERE equipo IS NULL;

-- 4. Hacer que la columna 'equipo' sea obligatoria (NOT NULL)
ALTER TABLE players ALTER COLUMN equipo SET NOT NULL;
ALTER TABLE players ALTER COLUMN equipo SET DEFAULT 'DH';
