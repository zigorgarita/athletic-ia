BEGIN;

-- 1. Eliminar Políticas RLS y Tablas Nuevas (Rollback seguro)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS planning_session_versions CASCADE;
DROP TABLE IF EXISTS ia_library CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;
DROP TABLE IF EXISTS teams CASCADE;

-- 2. Quitar columnas añadidas a planning_sessions
ALTER TABLE planning_sessions 
DROP COLUMN IF EXISTS team_id,
DROP COLUMN IF EXISTS season_id,
DROP COLUMN IF EXISTS valoracion_entrenador,
DROP COLUMN IF EXISTS valoracion_media_jugadores;

-- 3. Eliminar Tipos ENUM creados
DROP TYPE IF EXISTS library_type;
DROP TYPE IF EXISTS user_role;

COMMIT;
