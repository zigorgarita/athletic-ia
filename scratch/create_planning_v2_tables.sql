-- SCRIPT DE MIGRACIÓN IDEMPOTENTE: PLANIFICACIÓN V2
-- Ubicación: scratch/create_planning_v2_tables.sql

-- 1. CREACIÓN DE LA TABLA DE BIBLIOTECA TÁCTICA
CREATE TABLE IF NOT EXISTS planning_task_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    tipo_tarea TEXT NOT NULL, -- Rondo, Posesión, Finalización, ABP, Fuerza, Velocidad, Recuperación, Partido condicionado
    minutos_defecto INTEGER DEFAULT 15,
    jugadores_defecto INTEGER,
    espacio_defecto TEXT,
    objetivo TEXT,
    descripcion TEXT NOT NULL,
    observaciones TEXT,
    creado_por TEXT DEFAULT 'Cuerpo Técnico',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en la biblioteca táctica
ALTER TABLE planning_task_library ENABLE ROW LEVEL SECURITY;

-- Políticas RLS Idempotentes (Se limpia primero si existían)
DROP POLICY IF EXISTS "Public Read Task Library" ON planning_task_library;
DROP POLICY IF EXISTS "Public Insert Task Library" ON planning_task_library;
DROP POLICY IF EXISTS "Public Update Task Library" ON planning_task_library;
DROP POLICY IF EXISTS "Public Delete Task Library" ON planning_task_library;

CREATE POLICY "Public Read Task Library" ON planning_task_library FOR SELECT USING (true);
CREATE POLICY "Public Insert Task Library" ON planning_task_library FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Task Library" ON planning_task_library FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Task Library" ON planning_task_library FOR DELETE USING (true);

-- 2. MODIFICACIONES EN TABLAS EXISTENTES (planning_sessions)
-- Estado de la sesión (Borrador, Planificada, Realizada, Suspendida)
ALTER TABLE planning_sessions ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'Planificada';

-- Evaluación post-sesión
ALTER TABLE planning_sessions ADD COLUMN IF NOT EXISTS evaluacion_completada BOOLEAN DEFAULT false;
ALTER TABLE planning_sessions ADD COLUMN IF NOT EXISTS evaluacion_duracion_real INTEGER;
ALTER TABLE planning_sessions ADD COLUMN IF NOT EXISTS evaluacion_observaciones TEXT;

-- Tipo de filtro de entrenamiento (Pretemporada, Liga, Copa, Amistoso)
ALTER TABLE planning_sessions ADD COLUMN IF NOT EXISTS categoria_filtro TEXT DEFAULT 'Liga';

-- Horas y datos de WhatsApp
ALTER TABLE planning_sessions ADD COLUMN IF NOT EXISTS hora_convocatoria TEXT;
ALTER TABLE planning_sessions ADD COLUMN IF NOT EXISTS observaciones_convocatoria TEXT;

-- Checklist de material estructurado (JSONB)
ALTER TABLE planning_sessions ADD COLUMN IF NOT EXISTS checklist_material JSONB DEFAULT '{
  "balones": 15,
  "petos": [],
  "conos": 0,
  "chinos": 0,
  "picas": 0,
  "vallas": 0,
  "estacas": 0,
  "porterias_moviles": 0,
  "escaleras_coordinacion": 0,
  "gomas_elasticas": 0,
  "cronometro": false,
  "gps": false,
  "tablet": false,
  "altavoz": false,
  "agua": true,
  "botiquin": true,
  "personalizados": []
}'::jsonb;

-- 3. MODIFICACIONES EN TABLAS EXISTENTES (planning_tasks)
-- Staff a cargo de cada ejercicio
ALTER TABLE planning_tasks ADD COLUMN IF NOT EXISTS responsable_staff TEXT DEFAULT 'Primer Entrenador';
ALTER TABLE planning_tasks ADD COLUMN IF NOT EXISTS responsable_staff_otro TEXT;
