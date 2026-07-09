-- ============================================================
-- MÓDULO CLUBES — ACTUALIZACIÓN FASES 3 Y 4
-- Ejecutar en Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Añadir nuevos campos a la tabla clubs
ALTER TABLE clubs 
ADD COLUMN IF NOT EXISTS colores TEXT,
ADD COLUMN IF NOT EXISTS equipacion_local TEXT,
ADD COLUMN IF NOT EXISTS equipacion_visitante TEXT,
ADD COLUMN IF NOT EXISTS coordenadas_gps TEXT,
ADD COLUMN IF NOT EXISTS tiempo_viaje TEXT,
ADD COLUMN IF NOT EXISTS observaciones_generales TEXT,
ADD COLUMN IF NOT EXISTS imagen_fondo_url TEXT;

-- 2. Añadir nuevo campo a la tabla club_seasons
ALTER TABLE club_seasons
ADD COLUMN IF NOT EXISTS nivel_dificultad INTEGER DEFAULT 0 CHECK (nivel_dificultad >= 0 AND nivel_dificultad <= 5);

-- 3. Crear bucket para las fotos de instalaciones si no existe
-- (Se usará el bucket existente club-images para esto, clasificándolo por categoría en club_images)
