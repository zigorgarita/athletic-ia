-- Añadir nuevas columnas a la tabla de jugadores para el Perfil
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS nacionalidad TEXT,
ADD COLUMN IF NOT EXISTS equipo TEXT DEFAULT 'Indautxu Juvenil A',
ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Juvenil',
ADD COLUMN IF NOT EXISTS temporada TEXT DEFAULT '2026/2027',
ADD COLUMN IF NOT EXISTS metadata_personal JSONB DEFAULT '{}'::jsonb;
