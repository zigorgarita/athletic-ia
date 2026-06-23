-- SCRIPT MIGRACIÓN IDEMPOTENTE: CENTRO DE PARTIDO (LIGA V2)
-- Ubicación: scratch/create_match_center_tables.sql

-- 1. Modificaciones en la tabla matches (Datos generales e informe del analista)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS hora TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS campo TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS clasificacion_nota TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS analisis_resumen TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS analisis_positivos TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS analisis_mejorar TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS analisis_claves TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS analisis_conclusiones TEXT;

-- 2. Tabla de Jugadas ABP Específicas del Partido (Clonación)
CREATE TABLE IF NOT EXISTS match_abp_plays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- Córner ofensivo, Falta lateral ofensiva, etc.
    titulo TEXT NOT NULL,
    descripcion TEXT,
    video_url TEXT,
    tipo_origen TEXT NOT NULL DEFAULT 'Enlace', -- 'Enlace' | 'Archivo'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Roles y Coordenadas ABP del Partido (Clonación)
CREATE TABLE IF NOT EXISTS match_abp_player_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_abp_play_id UUID NOT NULL REFERENCES match_abp_plays(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL, -- Nullable por historial
    player_full_name_backup TEXT, -- Historial backup
    player_dorsal_backup INTEGER, -- Historial backup
    rol_asignado TEXT NOT NULL,
    posicion_x NUMERIC(5,2), -- Coordenadas en campograma
    posicion_y NUMERIC(5,2), -- Coordenadas en campograma
    etiqueta TEXT,
    comentario TEXT,
    orden INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de Vídeos Completos/Partes del Partido (match_full_videos)
CREATE TABLE IF NOT EXISTS match_full_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    tipo_video TEXT NOT NULL, -- 'Completo' | 'Primera Parte' | 'Segunda Parte'
    tipo_origen TEXT NOT NULL, -- 'Enlace' | 'Archivo'
    video_url TEXT NOT NULL, -- URL externa o ruta pública
    nombre_descriptivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla de Clips Tácticos y Cortes de Vídeo (match_video_clips)
CREATE TABLE IF NOT EXISTS match_video_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    categoria TEXT NOT NULL, -- 'OFENSIVO' | 'DEFENSIVO'
    subcategoria TEXT NOT NULL, -- 'Ataque organizado', 'Transición ofensiva', etc.
    titulo TEXT NOT NULL,
    tipo_origen TEXT NOT NULL, -- 'Enlace' | 'Archivo'
    video_url TEXT NOT NULL,
    comentario_tecnico TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabla de Acciones Estratégicas a Vigilar / Recalcar (match_strategic_actions)
CREATE TABLE IF NOT EXISTS match_strategic_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'VIGILAR' | 'RECALCAR'
    aspecto TEXT NOT NULL, -- ej: 'Vigilancias defensivas', 'Buena presión tras pérdida'
    descripcion TEXT,
    tipo_origen TEXT NOT NULL, -- 'Enlace' | 'Archivo'
    video_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabla de Vídeos Personalizados del Staff (match_custom_videos)
CREATE TABLE IF NOT EXISTS match_custom_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    etiqueta TEXT NOT NULL, -- 'Delanteros', 'Centrales', 'Pivotes', 'Individual', 'Otros'
    titulo TEXT NOT NULL,
    tipo_origen TEXT NOT NULL, -- 'Enlace' | 'Archivo'
    video_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabla de Documentación del Partido (match_documents)
CREATE TABLE IF NOT EXISTS match_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    nombre_documento TEXT NOT NULL,
    tipo_documento TEXT NOT NULL, -- Convocatoria PDF, Informe previo rival, Plan de partido, etc.
    tipo_origen TEXT NOT NULL, -- 'Enlace' | 'Archivo'
    url_storage TEXT NOT NULL, -- Enlace externo o URL pública
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    comentario TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en las nuevas tablas
ALTER TABLE match_abp_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_abp_player_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_full_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_video_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_strategic_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_custom_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_documents ENABLE ROW LEVEL SECURITY;

-- Limpieza preventiva de políticas
DROP POLICY IF EXISTS "Public Read Match ABP" ON match_abp_plays;
DROP POLICY IF EXISTS "Public Write Match ABP" ON match_abp_plays;
DROP POLICY IF EXISTS "Public Update Match ABP" ON match_abp_plays;
DROP POLICY IF EXISTS "Public Delete Match ABP" ON match_abp_plays;

DROP POLICY IF EXISTS "Public Read Match ABP Roles" ON match_abp_player_roles;
DROP POLICY IF EXISTS "Public Write Match ABP Roles" ON match_abp_player_roles;
DROP POLICY IF EXISTS "Public Update Match ABP Roles" ON match_abp_player_roles;
DROP POLICY IF EXISTS "Public Delete Match ABP Roles" ON match_abp_player_roles;

DROP POLICY IF EXISTS "Public Read Match Full Videos" ON match_full_videos;
DROP POLICY IF EXISTS "Public Write Match Full Videos" ON match_full_videos;
DROP POLICY IF EXISTS "Public Update Match Full Videos" ON match_full_videos;
DROP POLICY IF EXISTS "Public Delete Match Full Videos" ON match_full_videos;

DROP POLICY IF EXISTS "Public Read Match Video Clips" ON match_video_clips;
DROP POLICY IF EXISTS "Public Write Match Video Clips" ON match_video_clips;
DROP POLICY IF EXISTS "Public Update Match Video Clips" ON match_video_clips;
DROP POLICY IF EXISTS "Public Delete Match Video Clips" ON match_video_clips;

DROP POLICY IF EXISTS "Public Read Match Strategic" ON match_strategic_actions;
DROP POLICY IF EXISTS "Public Write Match Strategic" ON match_strategic_actions;
DROP POLICY IF EXISTS "Public Update Match Strategic" ON match_strategic_actions;
DROP POLICY IF EXISTS "Public Delete Match Strategic" ON match_strategic_actions;

DROP POLICY IF EXISTS "Public Read Match Custom" ON match_custom_videos;
DROP POLICY IF EXISTS "Public Write Match Custom" ON match_custom_videos;
DROP POLICY IF EXISTS "Public Update Match Custom" ON match_custom_videos;
DROP POLICY IF EXISTS "Public Delete Match Custom" ON match_custom_videos;

DROP POLICY IF EXISTS "Public Read Match Documents" ON match_documents;
DROP POLICY IF EXISTS "Public Write Match Documents" ON match_documents;
DROP POLICY IF EXISTS "Public Update Match Documents" ON match_documents;
DROP POLICY IF EXISTS "Public Delete Match Documents" ON match_documents;

-- Políticas RLS Públicas
CREATE POLICY "Public Read Match ABP" ON match_abp_plays FOR SELECT USING (true);
CREATE POLICY "Public Write Match ABP" ON match_abp_plays FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Match ABP" ON match_abp_plays FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Match ABP" ON match_abp_plays FOR DELETE USING (true);

CREATE POLICY "Public Read Match ABP Roles" ON match_abp_player_roles FOR SELECT USING (true);
CREATE POLICY "Public Write Match ABP Roles" ON match_abp_player_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Match ABP Roles" ON match_abp_player_roles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Match ABP Roles" ON match_abp_player_roles FOR DELETE USING (true);

CREATE POLICY "Public Read Match Full Videos" ON match_full_videos FOR SELECT USING (true);
CREATE POLICY "Public Write Match Full Videos" ON match_full_videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Match Full Videos" ON match_full_videos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Match Full Videos" ON match_full_videos FOR DELETE USING (true);

CREATE POLICY "Public Read Match Video Clips" ON match_video_clips FOR SELECT USING (true);
CREATE POLICY "Public Write Match Video Clips" ON match_video_clips FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Match Video Clips" ON match_video_clips FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Match Video Clips" ON match_video_clips FOR DELETE USING (true);

CREATE POLICY "Public Read Match Strategic" ON match_strategic_actions FOR SELECT USING (true);
CREATE POLICY "Public Write Match Strategic" ON match_strategic_actions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Match Strategic" ON match_strategic_actions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Match Strategic" ON match_strategic_actions FOR DELETE USING (true);

CREATE POLICY "Public Read Match Custom" ON match_custom_videos FOR SELECT USING (true);
CREATE POLICY "Public Write Match Custom" ON match_custom_videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Match Custom" ON match_custom_videos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Match Custom" ON match_custom_videos FOR DELETE USING (true);

CREATE POLICY "Public Read Match Documents" ON match_documents FOR SELECT USING (true);
CREATE POLICY "Public Write Match Documents" ON match_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Match Documents" ON match_documents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Match Documents" ON match_documents FOR DELETE USING (true);
