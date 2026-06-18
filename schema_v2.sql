-- Esquema de Base de Datos v2 para Web App de Fútbol (Indautxu Juvenil A)

-- 1. Crear los enums necesarios
CREATE TYPE demarcacion_type AS ENUM ('Portero', 'Defensa', 'Centrocampista', 'Delantero');
CREATE TYPE estado_jugador_type AS ENUM ('Disponible', 'Lesionado', 'Duda', 'Sancionado');
CREATE TYPE pierna_type AS ENUM ('Diestro', 'Zurdo', 'Ambidiestro');
CREATE TYPE abp_type AS ENUM ('Córner Ofensivo', 'Córner Defensivo', 'Falta Ofensiva', 'Falta Defensiva', 'Penalti', 'Saque de Banda', 'Jugada Ensayada');

-- 2. Crear la tabla de jugadores (players)
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    apellidos TEXT NOT NULL,
    dorsal INTEGER NOT NULL CHECK (dorsal >= 1 AND dorsal <= 99),
    demarcacion demarcacion_type NOT NULL,
    posicion_secundaria TEXT,
    fecha_nacimiento DATE NOT NULL,
    altura NUMERIC(3,2), -- Ej: 1.82
    peso NUMERIC(4,1), -- Ej: 75.4
    pierna_dominante pierna_type NOT NULL DEFAULT 'Diestro',
    estado estado_jugador_type NOT NULL DEFAULT 'Disponible',
    rol_abp TEXT,
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_dorsal UNIQUE (dorsal)
);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Trigger para limitar a 20 jugadores máximo
CREATE OR REPLACE FUNCTION check_players_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM players) >= 20 THEN
        RAISE EXCEPTION 'Límite alcanzado: No se pueden registrar más de 20 jugadores.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_players_limit
    BEFORE INSERT ON players
    FOR EACH ROW
    EXECUTE FUNCTION check_players_limit();

-- 3. Crear la tabla de valoraciones detalladas (detailed_evaluations)
CREATE TABLE detailed_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    fecha_evaluacion DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Físicas
    velocidad INTEGER NOT NULL CHECK (velocidad BETWEEN 1 AND 5),
    aceleracion INTEGER NOT NULL CHECK (aceleracion BETWEEN 1 AND 5),
    fuerza INTEGER NOT NULL CHECK (fuerza BETWEEN 1 AND 5),
    resistencia INTEGER NOT NULL CHECK (resistencia BETWEEN 1 AND 5),
    juego_aereo INTEGER NOT NULL CHECK (juego_aereo BETWEEN 1 AND 5),
    
    -- Defensivas
    marcaje INTEGER NOT NULL CHECK (marcaje BETWEEN 1 AND 5),
    entrada_defensiva INTEGER NOT NULL CHECK (entrada_defensiva BETWEEN 1 AND 5),
    posicionamiento_defensivo INTEGER NOT NULL CHECK (posicionamiento_defensivo BETWEEN 1 AND 5),
    trabajo_defensivo INTEGER NOT NULL CHECK (trabajo_defensivo BETWEEN 1 AND 5),
    
    -- Técnicas / Ofensivas
    pase_corto INTEGER NOT NULL CHECK (pase_corto BETWEEN 1 AND 5),
    pase_largo INTEGER NOT NULL CHECK (pase_largo BETWEEN 1 AND 5),
    control_orientado INTEGER NOT NULL CHECK (control_orientado BETWEEN 1 AND 5),
    regate INTEGER NOT NULL CHECK (regate BETWEEN 1 AND 5),
    centros INTEGER NOT NULL CHECK (centros BETWEEN 1 AND 5),
    finalizacion INTEGER NOT NULL CHECK (finalizacion BETWEEN 1 AND 5),
    disparo_lejano INTEGER NOT NULL CHECK (disparo_lejano BETWEEN 1 AND 5),
    trabajo_ofensivo INTEGER NOT NULL CHECK (trabajo_ofensivo BETWEEN 1 AND 5),
    
    -- Tácticas / Cognitivas
    vision_juego INTEGER NOT NULL CHECK (vision_juego BETWEEN 1 AND 5),
    inteligencia_tactica INTEGER NOT NULL CHECK (inteligencia_tactica BETWEEN 1 AND 5),
    liderazgo INTEGER NOT NULL CHECK (liderazgo BETWEEN 1 AND 5),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Crear la tabla de observaciones (observaciones)
CREATE TABLE observaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    rival TEXT NOT NULL,
    competicion TEXT NOT NULL,
    minutos_jugados INTEGER NOT NULL CHECK (minutos_jugados >= 0),
    observacion_tecnica TEXT,
    observacion_tactica TEXT,
    observacion_fisica TEXT,
    observacion_mental TEXT,
    valoracion_global NUMERIC(2,1) NOT NULL CHECK (valoracion_global BETWEEN 1.0 AND 5.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Crear la tabla de partidos de Liga (matches)
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jornada INTEGER NOT NULL UNIQUE CHECK (jornada > 0),
    rival TEXT NOT NULL,
    fecha DATE NOT NULL,
    es_local BOOLEAN NOT NULL DEFAULT true,
    goles_favor INTEGER,
    goles_contra INTEGER,
    jugado BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Crear la tabla de estadísticas de jugador por partido (match_player_stats)
CREATE TABLE match_player_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    titular BOOLEAN NOT NULL DEFAULT false,
    minutos INTEGER NOT NULL DEFAULT 0 CHECK (minutos >= 0 AND minutos <= 120),
    goles INTEGER NOT NULL DEFAULT 0 CHECK (goles >= 0),
    asistencias INTEGER NOT NULL DEFAULT 0 CHECK (asistencias >= 0),
    tarjeta_amarilla BOOLEAN NOT NULL DEFAULT false,
    tarjeta_roja BOOLEAN NOT NULL DEFAULT false,
    recuperaciones INTEGER DEFAULT 0,
    intercepciones INTEGER DEFAULT 0,
    duelos_ganados INTEGER DEFAULT 0,
    pases_completados INTEGER DEFAULT 0,
    pases_totales INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_player_match UNIQUE (match_id, player_id)
);

-- 7. Crear la tabla de sesiones GPS (gps_sessions)
CREATE TABLE gps_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Crear la tabla de datos GPS individuales (gps_data)
CREATE TABLE gps_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES gps_sessions(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    gps_id TEXT NOT NULL,
    minutos INTEGER NOT NULL,
    distancia_total NUMERIC(7,2) NOT NULL,
    hsr NUMERIC(6,2),
    sprint_distance NUMERIC(6,2),
    num_sprints INTEGER,
    velocidad_maxima NUMERIC(4,2),
    aceleraciones INTEGER,
    deceleraciones INTEGER,
    player_load NUMERIC(6,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Crear la tabla de jugadas ensayadas ABP (abp_plays)
CREATE TABLE abp_plays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    video_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Crear la tabla de roles de jugador en jugadas ABP (abp_player_roles)
CREATE TABLE abp_player_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    abp_play_id UUID NOT NULL REFERENCES abp_plays(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    rol_asignado TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_player_abp UNIQUE (abp_play_id, player_id)
);

-- 11. Crear la tabla de alineaciones de pizarra táctica (tactical_lineups)
CREATE TABLE tactical_lineups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_sistema TEXT NOT NULL DEFAULT '4-3-3',
    notas TEXT,
    posiciones JSONB NOT NULL,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. Configurar RLS para todas las tablas
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE observaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE abp_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE abp_player_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tactical_lineups ENABLE ROW LEVEL SECURITY;

-- Políticas de desarrollo (Lectura y escritura pública)
CREATE POLICY "Public Read" ON players FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON players FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON players FOR DELETE USING (true);

CREATE POLICY "Public Read" ON detailed_evaluations FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON detailed_evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON detailed_evaluations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON detailed_evaluations FOR DELETE USING (true);

CREATE POLICY "Public Read" ON observaciones FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON observaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON observaciones FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON observaciones FOR DELETE USING (true);

CREATE POLICY "Public Read" ON matches FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON matches FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON matches FOR DELETE USING (true);

CREATE POLICY "Public Read" ON match_player_stats FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON match_player_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON match_player_stats FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON match_player_stats FOR DELETE USING (true);

CREATE POLICY "Public Read" ON gps_sessions FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON gps_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON gps_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON gps_sessions FOR DELETE USING (true);

CREATE POLICY "Public Read" ON gps_data FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON gps_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON gps_data FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON gps_data FOR DELETE USING (true);

CREATE POLICY "Public Read" ON abp_plays FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON abp_plays FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON abp_plays FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON abp_plays FOR DELETE USING (true);

CREATE POLICY "Public Read" ON abp_player_roles FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON abp_player_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON abp_player_roles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON abp_player_roles FOR DELETE USING (true);

CREATE POLICY "Public Read" ON tactical_lineups FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON tactical_lineups FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON tactical_lineups FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON tactical_lineups FOR DELETE USING (true);

-- 13. Configurar buckets adicionales si es necesario (se asume que 'player-photos' ya existe)
-- Se creará 'match-videos' para los vídeos de partidos/ABP
INSERT INTO storage.buckets (id, name, public)
VALUES ('match-videos', 'match-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Lectura pública de videos" ON storage.objects FOR SELECT USING (bucket_id = 'match-videos');
CREATE POLICY "Subida de videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'match-videos');
CREATE POLICY "Edición y borrado de videos" ON storage.objects FOR ALL USING (bucket_id = 'match-videos');
