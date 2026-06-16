-- Esquema de Base de Datos para Web App de Fútbol

-- 1. Crear el enum para demarcaciones
CREATE TYPE demarcacion_type AS ENUM ('Portero', 'Defensa', 'Centrocampista', 'Delantero');

-- 2. Crear la tabla de jugadores (players)
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    dorsal INTEGER NOT NULL CHECK (dorsal >= 1 AND dorsal <= 99),
    demarcacion demarcacion_type NOT NULL,
    fecha_nacimiento DATE NOT NULL,
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

-- 3. Crear la tabla de evaluaciones (evaluations)
CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    tecnica INTEGER NOT NULL CHECK (tecnica >= 1 AND tecnica <= 5),
    tactica INTEGER NOT NULL CHECK (tactica >= 1 AND tactica <= 5),
    condicional INTEGER NOT NULL CHECK (condicional >= 1 AND condicional <= 5),
    fecha_evaluacion DATE NOT NULL DEFAULT CURRENT_DATE,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Crear la tabla de videos de partidos (match_videos)
CREATE TABLE match_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descripcion TEXT,
    video_url TEXT NOT NULL,
    fecha_partido DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Configurar Row Level Security (RLS)
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_videos ENABLE ROW LEVEL SECURITY;

-- Políticas básicas públicas (Lectura y Escritura total para desarrollo)
CREATE POLICY "Acceso público de lectura para jugadores" ON players FOR SELECT USING (true);
CREATE POLICY "Permitir inserción de jugadores" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de jugadores" ON players FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir eliminación de jugadores" ON players FOR DELETE USING (true);

CREATE POLICY "Acceso público de lectura para evaluaciones" ON evaluations FOR SELECT USING (true);
CREATE POLICY "Permitir inserción de evaluaciones" ON evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de evaluaciones" ON evaluations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir eliminación de evaluaciones" ON evaluations FOR DELETE USING (true);

CREATE POLICY "Acceso público de lectura para videos" ON match_videos FOR SELECT USING (true);
CREATE POLICY "Permitir inserción de videos" ON match_videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de videos" ON match_videos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir eliminación de videos" ON match_videos FOR DELETE USING (true);

-- 6. Configurar el bucket de storage 'player-photos'
-- Nota: La inserción en storage.buckets requiere permisos que usualmente se ejecutan en la consola de Supabase
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas del Storage Bucket 'player-photos'
CREATE POLICY "Acceso de lectura pública para fotos de jugadores"
ON storage.objects FOR SELECT
USING (bucket_id = 'player-photos');

CREATE POLICY "Permitir subida de fotos de jugadores"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'player-photos');

CREATE POLICY "Permitir actualización y borrado de fotos de jugadores"
ON storage.objects FOR ALL
USING (bucket_id = 'player-photos');
