-- =================================================================
-- MIGRACIÓN ADITIVA: Extensión de la tabla match_videos para Google Drive
-- No borra ni altera ningún registro o columna previa.
-- =================================================================

ALTER TABLE match_videos
ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
ADD COLUMN IF NOT EXISTS tamano_bytes BIGINT,
ADD COLUMN IF NOT EXISTS tipo_origen TEXT DEFAULT 'Enlace',
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'completado';
