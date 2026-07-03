-- ========================================================
-- 1. SOPORTE PARA ESTADO 'Baja temporal'
-- ========================================================
-- Añadir el estado 'Baja temporal' al enum si no existe.
ALTER TYPE estado_jugador_type ADD VALUE IF NOT EXISTS 'Baja temporal';

-- ========================================================
-- 2. TABLA DE LESIONES (HISTÓRICO)
-- ========================================================
CREATE TABLE IF NOT EXISTS player_injuries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    fecha_lesion DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo_lesion TEXT NOT NULL, -- Ej: Muscular, Articular, Ósea, etc.
    diagnostico TEXT NOT NULL,
    informado_por TEXT NOT NULL CHECK (informado_por IN ('Entrenador', 'Segundo entrenador', 'Preparador físico', 'Fisio', 'Jugador')),
    estado TEXT NOT NULL CHECK (estado IN ('Activa', 'En recuperación', 'Alta médica', 'Recaída')),
    fecha_prevista_recuperacion DATE,
    fecha_real_recuperacion DATE,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en player_injuries
ALTER TABLE player_injuries ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS públicas
DROP POLICY IF EXISTS "Public Read Injuries" ON player_injuries;
DROP POLICY IF EXISTS "Public Insert Injuries" ON player_injuries;
DROP POLICY IF EXISTS "Public Update Injuries" ON player_injuries;
DROP POLICY IF EXISTS "Public Delete Injuries" ON player_injuries;

CREATE POLICY "Public Read Injuries" ON player_injuries FOR SELECT USING (true);
CREATE POLICY "Public Insert Injuries" ON player_injuries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Injuries" ON player_injuries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Injuries" ON player_injuries FOR DELETE USING (true);

-- ========================================================
-- 3. LIMPIEZA DE DUPLICADOS HISTÓRICOS EN VALORACIONES
-- ========================================================
-- Para poder aplicar la restricción UNIQUE, eliminamos filas duplicadas para un mismo
-- jugador en un mismo día, conservando únicamente la evaluación más reciente (por created_at).
DELETE FROM detailed_evaluations a
USING detailed_evaluations b
WHERE a.player_id = b.player_id
  AND a.fecha_evaluacion = b.fecha_evaluacion
  AND a.created_at < b.created_at;

-- ========================================================
-- 4. ACTUALIZACIÓN DE TABLA DE VALORACIONES (detailed_evaluations)
-- ========================================================
-- Añadimos la columna para valoraciones generales (Técnica, Táctica, Condicional, Mental)
ALTER TABLE detailed_evaluations ADD COLUMN IF NOT EXISTS valoraciones_generales JSONB DEFAULT '{}'::jsonb;

-- Añadimos la columna para el perfil específico posicional (reemplazando/mapeando el antiguo 'metricas')
ALTER TABLE detailed_evaluations ADD COLUMN IF NOT EXISTS perfil_especifico JSONB DEFAULT '{}'::jsonb;

-- Añadimos la columna para registrar quién realizó la valoración
ALTER TABLE detailed_evaluations ADD COLUMN IF NOT EXISTS evaluado_por TEXT;

-- Añadimos la columna para guardar la valoración global calculada en el registro
ALTER TABLE detailed_evaluations ADD COLUMN IF NOT EXISTS valoracion_global NUMERIC(2,1);

-- Para evitar duplicados en la misma fecha para un mismo jugador, añadimos una restricción única de manera segura e idempotente.
ALTER TABLE detailed_evaluations DROP CONSTRAINT IF EXISTS unique_player_evaluation_date;
ALTER TABLE detailed_evaluations ADD CONSTRAINT unique_player_evaluation_date UNIQUE (player_id, fecha_evaluacion);
