-- ========================================================
-- SUBBLOQUE 4D — BIBLIOTECA DE CONOCIMIENTO TÁCTICO
-- Script Idempotente: 4 tablas + RLS + Índices + Trigger
-- ========================================================

-- =============================================
-- 1. TABLA PRINCIPAL: knowledge_entries
-- =============================================
CREATE TABLE IF NOT EXISTS knowledge_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Clasificación
    titulo TEXT NOT NULL,
    categoria TEXT NOT NULL,
    fase_juego TEXT,
    sistema_asociado TEXT,
    posicion_asociada TEXT,

    -- Contenido estructurado
    principio_clave TEXT,
    descripcion TEXT NOT NULL,
    instrucciones_linea JSONB,
    variantes TEXT,
    consignas TEXT[],

    -- Extensibilidad JSONB para futuro sin migraciones
    metadata JSONB DEFAULT '{}',

    -- Autoría y temporalidad
    creado_por TEXT NOT NULL DEFAULT 'Staff',
    temporada TEXT DEFAULT '2026-27',
    activo BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Trigger para updated_at automático (reutiliza función existente)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_knowledge_entries_updated_at'
    ) THEN
        CREATE TRIGGER update_knowledge_entries_updated_at
            BEFORE UPDATE ON knowledge_entries
            FOR EACH ROW
            EXECUTE PROCEDURE update_updated_at_column();
    END IF;
END $$;

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_ke_categoria ON knowledge_entries(categoria);
CREATE INDEX IF NOT EXISTS idx_ke_fase ON knowledge_entries(fase_juego);
CREATE INDEX IF NOT EXISTS idx_ke_sistema ON knowledge_entries(sistema_asociado);
CREATE INDEX IF NOT EXISTS idx_ke_posicion ON knowledge_entries(posicion_asociada);
CREATE INDEX IF NOT EXISTS idx_ke_temporada ON knowledge_entries(temporada);
CREATE INDEX IF NOT EXISTS idx_ke_activo ON knowledge_entries(activo);

-- Full-text search en español
CREATE INDEX IF NOT EXISTS idx_ke_busqueda ON knowledge_entries
    USING gin(to_tsvector('spanish',
    coalesce(titulo, '') || ' ' || coalesce(descripcion, '') || ' ' || coalesce(principio_clave, '')));


-- =============================================
-- 2. TABLA DE MEDIOS ADJUNTOS: knowledge_media
-- =============================================
CREATE TABLE IF NOT EXISTS knowledge_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_entry_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,

    tipo_media TEXT NOT NULL CHECK (tipo_media IN ('video', 'pdf', 'imagen', 'enlace')),
    titulo TEXT,
    url TEXT NOT NULL,
    tipo_origen TEXT NOT NULL DEFAULT 'Enlace' CHECK (tipo_origen IN ('Enlace', 'Archivo')),
    descripcion TEXT,
    orden INTEGER DEFAULT 0,

    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_km_entry ON knowledge_media(knowledge_entry_id);
CREATE INDEX IF NOT EXISTS idx_km_tipo ON knowledge_media(tipo_media);


-- =============================================
-- 3. TABLA DE VINCULACIONES POLIMÓRFICAS: knowledge_links
-- =============================================
CREATE TABLE IF NOT EXISTS knowledge_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_entry_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,

    linked_entity_type TEXT NOT NULL CHECK (linked_entity_type IN (
        'planning_session', 'planning_task', 'planning_task_library',
        'tactical_system', 'tactical_matchup', 'tactical_match_plan',
        'tactical_role_card', 'match', 'abp_play', 'player',
        'gps_session', 'match_video_clip'
    )),
    linked_entity_id UUID NOT NULL,

    relacion TEXT DEFAULT 'relacionado',
    notas TEXT,

    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT unique_knowledge_link UNIQUE (knowledge_entry_id, linked_entity_type, linked_entity_id)
);

CREATE INDEX IF NOT EXISTS idx_kl_entry ON knowledge_links(knowledge_entry_id);
CREATE INDEX IF NOT EXISTS idx_kl_entity ON knowledge_links(linked_entity_type, linked_entity_id);


-- =============================================
-- 4. TABLA DE ETIQUETAS LIBRES: knowledge_tags
-- =============================================
CREATE TABLE IF NOT EXISTS knowledge_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_entry_id UUID NOT NULL REFERENCES knowledge_entries(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT unique_entry_tag UNIQUE (knowledge_entry_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_kt_tag ON knowledge_tags(tag);
CREATE INDEX IF NOT EXISTS idx_kt_entry ON knowledge_tags(knowledge_entry_id);


-- =============================================
-- 5. HABILITAR RLS EN TODAS LAS TABLAS
-- =============================================
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_tags ENABLE ROW LEVEL SECURITY;

-- Limpieza preventiva
DROP POLICY IF EXISTS "Public Read" ON knowledge_entries;
DROP POLICY IF EXISTS "Public Insert" ON knowledge_entries;
DROP POLICY IF EXISTS "Public Update" ON knowledge_entries;
DROP POLICY IF EXISTS "Public Delete" ON knowledge_entries;

DROP POLICY IF EXISTS "Public Read" ON knowledge_media;
DROP POLICY IF EXISTS "Public Insert" ON knowledge_media;
DROP POLICY IF EXISTS "Public Update" ON knowledge_media;
DROP POLICY IF EXISTS "Public Delete" ON knowledge_media;

DROP POLICY IF EXISTS "Public Read" ON knowledge_links;
DROP POLICY IF EXISTS "Public Insert" ON knowledge_links;
DROP POLICY IF EXISTS "Public Update" ON knowledge_links;
DROP POLICY IF EXISTS "Public Delete" ON knowledge_links;

DROP POLICY IF EXISTS "Public Read" ON knowledge_tags;
DROP POLICY IF EXISTS "Public Insert" ON knowledge_tags;
DROP POLICY IF EXISTS "Public Update" ON knowledge_tags;
DROP POLICY IF EXISTS "Public Delete" ON knowledge_tags;

-- Políticas RLS Públicas
CREATE POLICY "Public Read" ON knowledge_entries FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON knowledge_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON knowledge_entries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON knowledge_entries FOR DELETE USING (true);

CREATE POLICY "Public Read" ON knowledge_media FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON knowledge_media FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON knowledge_media FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON knowledge_media FOR DELETE USING (true);

CREATE POLICY "Public Read" ON knowledge_links FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON knowledge_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON knowledge_links FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON knowledge_links FOR DELETE USING (true);

CREATE POLICY "Public Read" ON knowledge_tags FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON knowledge_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON knowledge_tags FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON knowledge_tags FOR DELETE USING (true);
