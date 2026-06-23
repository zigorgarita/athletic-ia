-- SCRIPT DE ROLLBACK/REVERSIÓN: CENTRO DE PARTIDO (LIGA V2)
-- Ubicación: scratch/rollback_match_center_tables.sql

-- 1. ELIMINAR TABLAS NUEVAS
DROP TABLE IF EXISTS match_documents CASCADE;
DROP TABLE IF EXISTS match_custom_videos CASCADE;
DROP TABLE IF EXISTS match_strategic_actions CASCADE;
DROP TABLE IF EXISTS match_video_clips CASCADE;
DROP TABLE IF EXISTS match_full_videos CASCADE;
DROP TABLE IF EXISTS match_abp_player_roles CASCADE;
DROP TABLE IF EXISTS match_abp_plays CASCADE;

-- 2. ELIMINAR COLUMNAS DE matches
ALTER TABLE matches DROP COLUMN IF EXISTS hora;
ALTER TABLE matches DROP COLUMN IF EXISTS campo;
ALTER TABLE matches DROP COLUMN IF EXISTS clasificacion_nota;
ALTER TABLE matches DROP COLUMN IF EXISTS analisis_resumen;
ALTER TABLE matches DROP COLUMN IF EXISTS analisis_positivos;
ALTER TABLE matches DROP COLUMN IF EXISTS analisis_mejorar;
ALTER TABLE matches DROP COLUMN IF EXISTS analisis_claves;
ALTER TABLE matches DROP COLUMN IF EXISTS analisis_conclusiones;
