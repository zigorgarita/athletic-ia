-- Script para crear la sección de Rivales (Scouting)

CREATE TABLE IF NOT EXISTS rivals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    escudo_url TEXT,
    campo_nombre TEXT,
    campo_dimensiones TEXT,
    campo_superficie TEXT,
    info_general TEXT,
    estadisticas JSONB DEFAULT '{}'::jsonb,
    notas_entrenador TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS rival_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rival_id UUID NOT NULL REFERENCES rivals(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('COMPLETO', 'CORTE')),
    titulo TEXT NOT NULL,
    url TEXT NOT NULL,
    comentarios TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE rivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rival_videos ENABLE ROW LEVEL SECURITY;

-- Crear políticas (Públicas para este proyecto local/cerrado)
CREATE POLICY "Public Access Rivals" ON rivals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Rival Videos" ON rival_videos FOR ALL USING (true) WITH CHECK (true);
