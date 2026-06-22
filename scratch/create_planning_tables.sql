-- Script para la creación de las tablas de Planificación

-- 1. Crear planning_periods
CREATE TABLE IF NOT EXISTS planning_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE, -- Pretemporada, Septiembre, Octubre, etc.
    orden INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Poblar periodos iniciales
INSERT INTO planning_periods (nombre, orden) VALUES
('Pretemporada', 1),
('Septiembre', 2),
('Octubre', 3),
('Noviembre', 4),
('Diciembre', 5),
('Enero', 6),
('Febrero', 7),
('Marzo', 8),
('Abril', 9),
('Mayo', 10),
('Fase final / Copa', 11)
ON CONFLICT (nombre) DO NOTHING;

-- 2. Crear planning_sessions
CREATE TABLE IF NOT EXISTS planning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL UNIQUE,
    hora_inicio TEXT,
    hora_fin TEXT,
    duracion_total INTEGER DEFAULT 0, -- en minutos
    campo_instalacion TEXT,
    tipo_sesion TEXT, -- Recuperación postpartido, Adquisición, etc.
    objetivo_principal TEXT, -- Organización ofensiva, etc.
    carga TEXT, -- Recuperación, Baja, Media, Alta, Muy alta
    num_jugadores_previstos INTEGER DEFAULT 0,
    num_porteros_previstos INTEGER DEFAULT 0,
    jornada_id UUID REFERENCES matches(id) ON DELETE SET NULL, -- Conexión a partidos de Liga
    objetivo_semanal TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Crear planning_concepts
CREATE TABLE IF NOT EXISTS planning_concepts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL, -- ATAQUE, DEFENSA, TRANSICIONES, ABP, CONDICIONAL, MENTAL
    concepto TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_session_concept UNIQUE (session_id, categoria, concepto)
);

-- 4. Crear planning_tasks
CREATE TABLE IF NOT EXISTS planning_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
    nombre_tarea TEXT NOT NULL,
    tipo_tarea TEXT NOT NULL, -- Calentamiento, Rondo, etc.
    minutos INTEGER NOT NULL DEFAULT 0, -- en minutos
    jugadores INTEGER,
    espacio TEXT,
    objetivo TEXT,
    descripcion TEXT,
    observaciones TEXT,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Crear planning_session_players
CREATE TABLE IF NOT EXISTS planning_session_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    convocado BOOLEAN DEFAULT true,
    estado_sesion TEXT, -- Disponible, Lesionado, Duda, Sancionado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_session_player UNIQUE (session_id, player_id)
);

-- 6. Crear planning_documents
CREATE TABLE IF NOT EXISTS planning_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    planning_session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
    nombre_documento TEXT NOT NULL,
    tipo_documento TEXT NOT NULL,
    url_storage TEXT NOT NULL,
    fecha_subida TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE planning_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_documents ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (Lectura/Escritura para desarrollo)
CREATE POLICY "Public Read" ON planning_periods FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON planning_periods FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON planning_periods FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON planning_periods FOR DELETE USING (true);

CREATE POLICY "Public Read" ON planning_sessions FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON planning_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON planning_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON planning_sessions FOR DELETE USING (true);

CREATE POLICY "Public Read" ON planning_concepts FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON planning_concepts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON planning_concepts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON planning_concepts FOR DELETE USING (true);

CREATE POLICY "Public Read" ON planning_tasks FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON planning_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON planning_tasks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON planning_tasks FOR DELETE USING (true);

CREATE POLICY "Public Read" ON planning_session_players FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON planning_session_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON planning_session_players FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON planning_session_players FOR DELETE USING (true);

CREATE POLICY "Public Read" ON planning_documents FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON planning_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON planning_documents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON planning_documents FOR DELETE USING (true);
