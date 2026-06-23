-- ========================================================
-- 1. TIPO ENUM PARA ESTADOS DE ASISTENCIA
-- ========================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_type') THEN
        CREATE TYPE attendance_status_type AS ENUM ('Asiste', 'No asiste', 'Lesionado', 'Duda', 'Sancionado', 'Baja temporal');
    END IF;
END $$;

-- ========================================================
-- 2. TABLA DE ASISTENCIA (training_attendance)
-- ========================================================
CREATE TABLE IF NOT EXISTS training_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL, -- No borra históricos si se elimina el jugador
    player_full_name_backup TEXT, -- Respaldo de nombre y apellidos para históricos
    player_dorsal_backup INTEGER, -- Respaldo de dorsal para históricos
    attendance_status attendance_status_type NOT NULL DEFAULT 'Asiste',
    absence_reason TEXT CHECK (absence_reason IN ('Lesión', 'Enfermedad', 'Estudios', 'Trabajo', 'Viaje', 'Decisión técnica', 'Motivo personal', 'Sin justificar', 'Otro')),
    attendance_notes TEXT,
    recorded_by TEXT DEFAULT 'Cuerpo Técnico',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Restricción UNIQUE para evitar duplicados por sesión
    CONSTRAINT unique_session_attendance UNIQUE (session_id, player_id)
);

-- ========================================================
-- 3. TABLA DE VALORACIONES DIARIAS (training_evaluations)
-- ========================================================
CREATE TABLE IF NOT EXISTS training_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL, -- No borra históricos si se elimina el jugador
    player_full_name_backup TEXT, -- Respaldo de nombre y apellidos para históricos
    player_dorsal_backup INTEGER, -- Respaldo de dorsal para históricos
    
    -- Bloques de valoración opcionales (NULLABLE) para completarse a posteriori
    actitud INTEGER CHECK (actitud BETWEEN 1 AND 5),
    intensidad INTEGER CHECK (intensidad BETWEEN 1 AND 5),
    comprension_tactica INTEGER CHECK (comprension_tactica BETWEEN 1 AND 5),
    ejecucion_tecnica INTEGER CHECK (ejecucion_tecnica BETWEEN 1 AND 5),
    compromiso_defensivo INTEGER CHECK (compromiso_defensivo BETWEEN 1 AND 5),
    compromiso_ofensivo INTEGER CHECK (compromiso_ofensivo BETWEEN 1 AND 5),
    
    -- Promedio calculado (NULLABLE)
    valoracion_global NUMERIC(2,1) CHECK (valoracion_global BETWEEN 1.0 AND 5.0),
    observaciones TEXT,
    fecha_evaluacion DATE NOT NULL DEFAULT CURRENT_DATE,
    evaluated_by TEXT DEFAULT 'Cuerpo Técnico',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Restricción UNIQUE para evitar duplicados por sesión
    CONSTRAINT unique_session_evaluation UNIQUE (session_id, player_id)
);

-- ========================================================
-- 4. ÍNDICES DE OPTIMIZACIÓN (Búsqueda Rápida e Históricos)
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_training_attendance_session ON training_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_training_attendance_player ON training_attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_training_evaluations_session ON training_evaluations(session_id);
CREATE INDEX IF NOT EXISTS idx_training_evaluations_player ON training_evaluations(player_id);

-- ========================================================
-- 5. HABILITAR ROW LEVEL SECURITY (RLS)
-- ========================================================
ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_evaluations ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- 6. POLÍTICAS DE RLS PÚBLICAS (SEGURO PARA REEJECUCIÓN)
-- ========================================================
DROP POLICY IF EXISTS "Public Read Attendance" ON training_attendance;
DROP POLICY IF EXISTS "Public Insert Attendance" ON training_attendance;
DROP POLICY IF EXISTS "Public Update Attendance" ON training_attendance;
DROP POLICY IF EXISTS "Public Delete Attendance" ON training_attendance;

CREATE POLICY "Public Read Attendance" ON training_attendance FOR SELECT USING (true);
CREATE POLICY "Public Insert Attendance" ON training_attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Attendance" ON training_attendance FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Attendance" ON training_attendance FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Read Training Evaluations" ON training_evaluations;
DROP POLICY IF EXISTS "Public Insert Training Evaluations" ON training_evaluations;
DROP POLICY IF EXISTS "Public Update Training Evaluations" ON training_evaluations;
DROP POLICY IF EXISTS "Public Delete Training Evaluations" ON training_evaluations;

CREATE POLICY "Public Read Training Evaluations" ON training_evaluations FOR SELECT USING (true);
CREATE POLICY "Public Insert Training Evaluations" ON training_evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Training Evaluations" ON training_evaluations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Training Evaluations" ON training_evaluations FOR DELETE USING (true);
