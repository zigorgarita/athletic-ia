-- =================================================================
-- MIGRACIÓN ADITIVA: Extensión de metadatos de Google Drive para las 6 tablas restantes
-- No borra ni altera ningún registro ni columna existente.
-- =================================================================

-- 1. Tabla club_videos (Rivales y Escultismo)
ALTER TABLE club_videos
ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
ADD COLUMN IF NOT EXISTS tamano_bytes BIGINT,
ADD COLUMN IF NOT EXISTS tipo_origen TEXT DEFAULT 'Enlace',
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'completado';

-- 2. Tabla match_video_clips (Clips de Centro de Partido)
ALTER TABLE match_video_clips
ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
ADD COLUMN IF NOT EXISTS tamano_bytes BIGINT,
ADD COLUMN IF NOT EXISTS tipo_origen TEXT DEFAULT 'Enlace',
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'completado';

-- 3. Tabla abp_plays (Estrategia y Jugadas a Balón Parado)
ALTER TABLE abp_plays
ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
ADD COLUMN IF NOT EXISTS tamano_bytes BIGINT,
ADD COLUMN IF NOT EXISTS tipo_origen TEXT DEFAULT 'Enlace',
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'completado';

-- 4. Tabla planning_drills (Entrenamientos y Ejercicios)
ALTER TABLE planning_drills
ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
ADD COLUMN IF NOT EXISTS tamano_bytes BIGINT,
ADD COLUMN IF NOT EXISTS tipo_origen TEXT DEFAULT 'Enlace',
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'completado';

-- 5. Tabla scouting_reports (Informes de Jugadores / Scouting)
ALTER TABLE scouting_reports
ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
ADD COLUMN IF NOT EXISTS tamano_bytes BIGINT,
ADD COLUMN IF NOT EXISTS tipo_origen TEXT DEFAULT 'Enlace',
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'completado';

-- 6. Tabla knowledge_media (Biblioteca General de Medios y Formación)
ALTER TABLE knowledge_media
ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
ADD COLUMN IF NOT EXISTS tamano_bytes BIGINT,
ADD COLUMN IF NOT EXISTS tipo_origen TEXT DEFAULT 'Enlace',
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'completado';
