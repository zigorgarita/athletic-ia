-- =============================================================================
-- MIGRACIÓN ADITIVA: ARCHIVADO FUENTE GPS EN GOOGLE DRIVE (V1 PARTIDOS)
-- Athletic IA · Temporada 2026/27
--
-- REGLAS ESTRICTAS DE SEGURIDAD:
-- 1. SOLO ADD COLUMN IF NOT EXISTS y CREATE INDEX IF NOT EXISTS.
-- 2. CERO UPDATE, CERO DELETE, CERO MODIFICACIÓN de funciones RPC o datos existentes.
-- 3. Todas las columnas son NULLABLE (las sesiones históricas permanecen intactas).
-- 4. Idempotente: seguro para ejecutar múltiples veces sin error.
-- =============================================================================

-- 1. Añadir 4 columnas de trazabilidad documental a public.gps_sessions
ALTER TABLE public.gps_sessions
    ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
    ADD COLUMN IF NOT EXISTS drive_file_url TEXT,
    ADD COLUMN IF NOT EXISTS file_name TEXT,
    ADD COLUMN IF NOT EXISTS file_hash TEXT;

-- 2. Comentarios documentales en catálogo
COMMENT ON COLUMN public.gps_sessions.drive_file_id IS 'ID del archivo original (.xlsx / .csv) almacenado en Google Drive bajo 01_PARTIDOS/<Partido>/GPS.';
COMMENT ON COLUMN public.gps_sessions.drive_file_url IS 'URL pública/visor de Google Drive para consultar el archivo original.';
COMMENT ON COLUMN public.gps_sessions.file_name IS 'Nombre original del archivo suministrado por el preparador físico.';
COMMENT ON COLUMN public.gps_sessions.file_hash IS 'Hash SHA-256 del contenido del archivo para prevención de duplicados.';

-- 3. Índice parcial para comprobación ultra-rápida de duplicados por hash
CREATE INDEX IF NOT EXISTS idx_gps_sessions_file_hash 
    ON public.gps_sessions(file_hash) 
    WHERE file_hash IS NOT NULL;
