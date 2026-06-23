-- SCRIPT DE ROLLBACK/REVERSIÓN: PLANIFICACIÓN V2
-- Ubicación: scratch/rollback_planning_v2_tables.sql

-- 1. ELIMINAR TABLA DE BIBLIOTECA TÁCTICA Y POLÍTICAS
DROP TABLE IF EXISTS planning_task_library CASCADE;

-- 2. ELIMINAR CAMPOS AÑADIDOS A planning_sessions
ALTER TABLE planning_sessions DROP COLUMN IF EXISTS estado;
ALTER TABLE planning_sessions DROP COLUMN IF EXISTS evaluacion_completada;
ALTER TABLE planning_sessions DROP COLUMN IF EXISTS evaluacion_duracion_real;
ALTER TABLE planning_sessions DROP COLUMN IF EXISTS evaluacion_observaciones;
ALTER TABLE planning_sessions DROP COLUMN IF EXISTS categoria_filtro;
ALTER TABLE planning_sessions DROP COLUMN IF EXISTS hora_convocatoria;
ALTER TABLE planning_sessions DROP COLUMN IF EXISTS observaciones_convocatoria;
ALTER TABLE planning_sessions DROP COLUMN IF EXISTS checklist_material;

-- 3. ELIMINAR CAMPOS AÑADIDOS A planning_tasks
ALTER TABLE planning_tasks DROP COLUMN IF EXISTS responsable_staff;
ALTER TABLE planning_tasks DROP COLUMN IF EXISTS responsable_staff_otro;
