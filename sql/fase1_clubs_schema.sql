-- ============================================================
-- MÓDULO CLUBES — FASE 1: BASE DE DATOS COMPLETA
-- Ejecutar en Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- ============================================================
-- 1. TABLA PRINCIPAL: clubs
-- Identidad permanente. Se crea UNA VEZ y nunca se duplica.
-- ============================================================
CREATE TABLE IF NOT EXISTS clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    nombre_corto TEXT,
    escudo_url TEXT,
    tipo TEXT NOT NULL DEFAULT 'LIGA' CHECK (tipo IN ('LIGA', 'AMISTOSO', 'COPA', 'TORNEO', 'PROPIO')),
    -- Ubicación
    ciudad TEXT,
    provincia TEXT,
    comunidad_autonoma TEXT,
    -- Directiva / Club
    ano_fundacion INTEGER,
    presidente TEXT,
    director_deportivo TEXT,
    web TEXT,
    redes_sociales JSONB DEFAULT '{}',
    cantera TEXT,
    -- Instalaciones / Campo
    campo_nombre TEXT,
    campo_direccion TEXT,
    campo_google_maps TEXT,
    campo_cesped TEXT,
    campo_dimensiones TEXT,
    campo_capacidad TEXT,
    vestuarios TEXT,
    banquillos TEXT,
    zona_grabacion TEXT,
    observaciones_campo TEXT,
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_clubs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc', now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clubs_updated_at ON clubs;
CREATE TRIGGER trg_clubs_updated_at
    BEFORE UPDATE ON clubs
    FOR EACH ROW EXECUTE FUNCTION update_clubs_updated_at();


-- ============================================================
-- 2. CLUB_SEASONS: Pivote temporada ↔ club
-- Toda la información volátil cuelga de aquí.
-- ============================================================
CREATE TABLE IF NOT EXISTS club_seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    temporada TEXT NOT NULL,
    grupo TEXT,
    categoria TEXT,
    estado_scouting TEXT NOT NULL DEFAULT 'Sin analizar'
        CHECK (estado_scouting IN ('Sin analizar', 'Parcial', 'Completo')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT uq_club_season UNIQUE (club_id, temporada)
);

DROP TRIGGER IF EXISTS trg_club_seasons_updated_at ON club_seasons;
CREATE TRIGGER trg_club_seasons_updated_at
    BEFORE UPDATE ON club_seasons
    FOR EACH ROW EXECUTE FUNCTION update_clubs_updated_at();


-- ============================================================
-- 3. CLUB_STAFF: Cuerpo técnico por temporada
-- ============================================================
CREATE TABLE IF NOT EXISTS club_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_season_id UUID NOT NULL REFERENCES club_seasons(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN (
        'Entrenador', 'Segundo entrenador', 'Preparador físico',
        'Entrenador de porteros', 'Analista', 'Delegado', 'Otro'
    )),
    foto_url TEXT,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);


-- ============================================================
-- 4. CLUB_PLAYERS: Plantilla rival por temporada
-- ============================================================
CREATE TABLE IF NOT EXISTS club_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_season_id UUID NOT NULL REFERENCES club_seasons(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    foto_url TEXT,
    fecha_nacimiento DATE,
    altura NUMERIC(3,2),
    peso NUMERIC(4,1),
    pierna_dominante TEXT CHECK (pierna_dominante IN ('Diestro', 'Zurdo', 'Ambidiestro')),
    posicion TEXT,
    dorsal INTEGER,
    minutos_jugados INTEGER DEFAULT 0,
    caracteristicas TEXT,
    fortalezas TEXT,
    debilidades TEXT,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);


-- ============================================================
-- 5. CLUB_PLAY_MODELS: Modelo de juego por temporada
-- ============================================================
CREATE TABLE IF NOT EXISTS club_play_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_season_id UUID NOT NULL REFERENCES club_seasons(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    fecha DATE DEFAULT CURRENT_DATE,
    sistema_principal TEXT,
    sistemas_alternativos TEXT,
    salida_balon TEXT,
    construccion TEXT,
    ataque_organizado TEXT,
    ataque_bandas TEXT,
    ataque_interior TEXT,
    transicion_ofensiva TEXT,
    transicion_defensiva TEXT,
    presion TEXT,
    bloque_defensivo TEXT,
    defensa_area TEXT,
    abp_ofensiva TEXT,
    abp_defensiva TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);


-- ============================================================
-- 6. CLUB_SCOUTING_MATCHES: Cada partido = carpeta de scouting
-- ============================================================
CREATE TABLE IF NOT EXISTS club_scouting_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_season_id UUID NOT NULL REFERENCES club_seasons(id) ON DELETE CASCADE,
    our_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    fecha DATE,
    hora TIME,
    competicion TEXT,
    jornada TEXT,
    rival_en_ese_partido TEXT,
    local_visitante TEXT CHECK (local_visitante IN ('Local', 'Visitante')),
    campo TEXT,
    arbitro TEXT,
    resultado TEXT,
    goles_favor INTEGER,
    goles_contra INTEGER,
    sistema_rival TEXT,
    sistema_nuestro TEXT,
    alineacion_rival JSONB,
    estadisticas JSONB DEFAULT '{}',
    informe_analista TEXT,
    informe_ia TEXT,
    observaciones_mister TEXT,
    valoracion INTEGER CHECK (valoracion BETWEEN 1 AND 10),
    distancia_km NUMERIC,
    tiempo_viaje_min INTEGER,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);


-- ============================================================
-- 7. CLUB_REPORTS: Informes del míster (cronológicos)
-- ============================================================
CREATE TABLE IF NOT EXISTS club_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_season_id UUID NOT NULL REFERENCES club_seasons(id) ON DELETE CASCADE,
    scouting_match_id UUID REFERENCES club_scouting_matches(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN (
        'Pretemporada', 'Jornada', 'Segunda vuelta', 'Playoff', 'Libre'
    )),
    titulo TEXT,
    fecha DATE DEFAULT CURRENT_DATE,
    plan_partido TEXT,
    objetivos TEXT,
    que_atacar TEXT,
    que_proteger TEXT,
    consignas TEXT,
    mensaje_equipo TEXT,
    contenido_libre TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);


-- ============================================================
-- 8. CLUB_AI_REPORTS: Informes generados por IA
-- ============================================================
CREATE TABLE IF NOT EXISTS club_ai_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_season_id UUID NOT NULL REFERENCES club_seasons(id) ON DELETE CASCADE,
    scouting_match_id UUID REFERENCES club_scouting_matches(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN (
        'Informe inicial', 'Actualización', 'Comparativa', 'Evolución temporada'
    )),
    fecha DATE DEFAULT CURRENT_DATE,
    informe_completo TEXT,
    fortalezas TEXT,
    debilidades TEXT,
    jugadores_clave TEXT,
    como_atacarles TEXT,
    como_defenderles TEXT,
    riesgos TEXT,
    plan_recomendado TEXT,
    alertas TEXT,
    editado_por_mister BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);


-- ============================================================
-- 9. CLUB_VIDEOS: Taxonomía rica
-- ============================================================
CREATE TABLE IF NOT EXISTS club_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    club_season_id UUID REFERENCES club_seasons(id) ON DELETE SET NULL,
    scouting_match_id UUID REFERENCES club_scouting_matches(id) ON DELETE SET NULL,
    club_player_id UUID REFERENCES club_players(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    url TEXT NOT NULL,
    tipo_origen TEXT DEFAULT 'Enlace' CHECK (tipo_origen IN ('Enlace', 'Archivo')),
    tipo TEXT CHECK (tipo IN ('Partido completo', 'Corte')),
    categoria TEXT CHECK (categoria IN (
        'Salida de balón', 'Presión', 'Ataque organizado', 'Defensa organizada',
        'Transición ofensiva', 'Transición defensiva', 'ABP', 'Finalización', 'Jugadores'
    )),
    etiquetas TEXT[] DEFAULT '{}',
    fecha DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);


-- ============================================================
-- 10. CLUB_IMAGES: Fotografías categorizadas
-- ============================================================
CREATE TABLE IF NOT EXISTS club_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    club_season_id UUID REFERENCES club_seasons(id) ON DELETE SET NULL,
    scouting_match_id UUID REFERENCES club_scouting_matches(id) ON DELETE SET NULL,
    titulo TEXT,
    url TEXT NOT NULL,
    categoria TEXT CHECK (categoria IN (
        'Escudo', 'Campo', 'Instalaciones', 'Banquillos', 'Vestuarios',
        'Jugadores', 'Captura táctica'
    )),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);


-- ============================================================
-- 11. CLUB_DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS club_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    club_season_id UUID REFERENCES club_seasons(id) ON DELETE SET NULL,
    scouting_match_id UUID REFERENCES club_scouting_matches(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    tipo TEXT CHECK (tipo IN ('PDF', 'Informe', 'PowerPoint', 'Word', 'Excel', 'Imagen', 'Enlace')),
    url TEXT NOT NULL,
    comentario TEXT,
    fecha DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);


-- ============================================================
-- 12. TAGS: Etiquetas inteligentes
-- ============================================================
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    categoria TEXT CHECK (categoria IN ('Táctica', 'Posición', 'Fase', 'ABP', 'Libre')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);


-- ============================================================
-- 13. TAGGABLES: Relación polimórfica
-- ============================================================
CREATE TABLE IF NOT EXISTS taggables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN (
        'club', 'club_player', 'club_video', 'club_report',
        'club_ai_report', 'club_scouting_match', 'club_play_model',
        'club_image', 'club_document'
    )),
    entity_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
    CONSTRAINT uq_taggable UNIQUE (tag_id, entity_type, entity_id)
);


-- ============================================================
-- 14. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_club_seasons_club ON club_seasons(club_id);
CREATE INDEX IF NOT EXISTS idx_club_seasons_temporada ON club_seasons(temporada);
CREATE INDEX IF NOT EXISTS idx_club_players_season ON club_players(club_season_id);
CREATE INDEX IF NOT EXISTS idx_club_staff_season ON club_staff(club_season_id);
CREATE INDEX IF NOT EXISTS idx_club_play_models_season ON club_play_models(club_season_id);
CREATE INDEX IF NOT EXISTS idx_club_scouting_season ON club_scouting_matches(club_season_id);
CREATE INDEX IF NOT EXISTS idx_club_scouting_our_match ON club_scouting_matches(our_match_id);
CREATE INDEX IF NOT EXISTS idx_club_reports_season ON club_reports(club_season_id);
CREATE INDEX IF NOT EXISTS idx_club_reports_match ON club_reports(scouting_match_id);
CREATE INDEX IF NOT EXISTS idx_club_ai_reports_season ON club_ai_reports(club_season_id);
CREATE INDEX IF NOT EXISTS idx_club_videos_club ON club_videos(club_id);
CREATE INDEX IF NOT EXISTS idx_club_videos_season ON club_videos(club_season_id);
CREATE INDEX IF NOT EXISTS idx_club_videos_match ON club_videos(scouting_match_id);
CREATE INDEX IF NOT EXISTS idx_club_videos_player ON club_videos(club_player_id);
CREATE INDEX IF NOT EXISTS idx_club_images_club ON club_images(club_id);
CREATE INDEX IF NOT EXISTS idx_club_documents_club ON club_documents(club_id);
CREATE INDEX IF NOT EXISTS idx_taggables_entity ON taggables(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_taggables_tag ON taggables(tag_id);
CREATE INDEX IF NOT EXISTS idx_clubs_tipo ON clubs(tipo);


-- ============================================================
-- 15. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read clubs" ON clubs FOR SELECT USING (true);
CREATE POLICY "Public Insert clubs" ON clubs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update clubs" ON clubs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete clubs" ON clubs FOR DELETE USING (true);

ALTER TABLE club_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read club_seasons" ON club_seasons FOR SELECT USING (true);
CREATE POLICY "Public Insert club_seasons" ON club_seasons FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update club_seasons" ON club_seasons FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete club_seasons" ON club_seasons FOR DELETE USING (true);

ALTER TABLE club_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read club_staff" ON club_staff FOR SELECT USING (true);
CREATE POLICY "Public Insert club_staff" ON club_staff FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update club_staff" ON club_staff FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete club_staff" ON club_staff FOR DELETE USING (true);

ALTER TABLE club_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read club_players" ON club_players FOR SELECT USING (true);
CREATE POLICY "Public Insert club_players" ON club_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update club_players" ON club_players FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete club_players" ON club_players FOR DELETE USING (true);

ALTER TABLE club_play_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read club_play_models" ON club_play_models FOR SELECT USING (true);
CREATE POLICY "Public Insert club_play_models" ON club_play_models FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update club_play_models" ON club_play_models FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete club_play_models" ON club_play_models FOR DELETE USING (true);

ALTER TABLE club_scouting_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read club_scouting_matches" ON club_scouting_matches FOR SELECT USING (true);
CREATE POLICY "Public Insert club_scouting_matches" ON club_scouting_matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update club_scouting_matches" ON club_scouting_matches FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete club_scouting_matches" ON club_scouting_matches FOR DELETE USING (true);

ALTER TABLE club_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read club_reports" ON club_reports FOR SELECT USING (true);
CREATE POLICY "Public Insert club_reports" ON club_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update club_reports" ON club_reports FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete club_reports" ON club_reports FOR DELETE USING (true);

ALTER TABLE club_ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read club_ai_reports" ON club_ai_reports FOR SELECT USING (true);
CREATE POLICY "Public Insert club_ai_reports" ON club_ai_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update club_ai_reports" ON club_ai_reports FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete club_ai_reports" ON club_ai_reports FOR DELETE USING (true);

ALTER TABLE club_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read club_videos" ON club_videos FOR SELECT USING (true);
CREATE POLICY "Public Insert club_videos" ON club_videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update club_videos" ON club_videos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete club_videos" ON club_videos FOR DELETE USING (true);

ALTER TABLE club_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read club_images" ON club_images FOR SELECT USING (true);
CREATE POLICY "Public Insert club_images" ON club_images FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update club_images" ON club_images FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete club_images" ON club_images FOR DELETE USING (true);

ALTER TABLE club_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read club_documents" ON club_documents FOR SELECT USING (true);
CREATE POLICY "Public Insert club_documents" ON club_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update club_documents" ON club_documents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete club_documents" ON club_documents FOR DELETE USING (true);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read tags" ON tags FOR SELECT USING (true);
CREATE POLICY "Public Insert tags" ON tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update tags" ON tags FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete tags" ON tags FOR DELETE USING (true);

ALTER TABLE taggables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read taggables" ON taggables FOR SELECT USING (true);
CREATE POLICY "Public Insert taggables" ON taggables FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update taggables" ON taggables FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete taggables" ON taggables FOR DELETE USING (true);


-- ============================================================
-- 16. STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('club-images', 'club-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('club-videos', 'club-videos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('club-documents', 'club-documents', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read club-logos" ON storage.objects FOR SELECT USING (bucket_id = 'club-logos');
CREATE POLICY "Public upload club-logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'club-logos');
CREATE POLICY "Public manage club-logos" ON storage.objects FOR ALL USING (bucket_id = 'club-logos');

CREATE POLICY "Public read club-images" ON storage.objects FOR SELECT USING (bucket_id = 'club-images');
CREATE POLICY "Public upload club-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'club-images');
CREATE POLICY "Public manage club-images" ON storage.objects FOR ALL USING (bucket_id = 'club-images');

CREATE POLICY "Public read club-videos" ON storage.objects FOR SELECT USING (bucket_id = 'club-videos');
CREATE POLICY "Public upload club-videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'club-videos');
CREATE POLICY "Public manage club-videos" ON storage.objects FOR ALL USING (bucket_id = 'club-videos');

CREATE POLICY "Public read club-documents" ON storage.objects FOR SELECT USING (bucket_id = 'club-documents');
CREATE POLICY "Public upload club-documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'club-documents');
CREATE POLICY "Public manage club-documents" ON storage.objects FOR ALL USING (bucket_id = 'club-documents');


-- ============================================================
-- 17. MIGRACIÓN: rivals → clubs + club_seasons
-- ============================================================
INSERT INTO clubs (id, nombre, tipo, campo_nombre, created_at)
SELECT id, nombre, 'LIGA', campo_nombre, created_at
FROM rivals
ON CONFLICT (id) DO NOTHING;

INSERT INTO club_seasons (club_id, temporada, grupo, estado_scouting)
SELECT id, '2026-27', 'Liga Nacional Juvenil G2', 'Sin analizar'
FROM clubs
WHERE tipo = 'LIGA'
ON CONFLICT ON CONSTRAINT uq_club_season DO NOTHING;


-- ============================================================
-- 18. ETIQUETAS INICIALES
-- ============================================================
INSERT INTO tags (nombre, categoria) VALUES
    ('Presión Alta', 'Táctica'),
    ('Presión Media', 'Táctica'),
    ('Bloque Bajo', 'Táctica'),
    ('Bloque Medio', 'Táctica'),
    ('Bloque Alto', 'Táctica'),
    ('Salida 3+1', 'Táctica'),
    ('Salida 2+1', 'Táctica'),
    ('Salida larga', 'Táctica'),
    ('Transición rápida', 'Fase'),
    ('Transición posicional', 'Fase'),
    ('Ataque combinativo', 'Fase'),
    ('Ataque directo', 'Fase'),
    ('ABP ofensiva', 'ABP'),
    ('ABP defensiva', 'ABP'),
    ('Córner', 'ABP'),
    ('Falta lateral', 'ABP'),
    ('Falta frontal', 'ABP'),
    ('Saque de banda', 'ABP'),
    ('Portero', 'Posición'),
    ('Central', 'Posición'),
    ('Lateral', 'Posición'),
    ('Pivote', 'Posición'),
    ('Interior', 'Posición'),
    ('Mediapunta', 'Posición'),
    ('Extremo', 'Posición'),
    ('Delantero', 'Posición'),
    ('Carrilero', 'Posición'),
    ('1-4-3-3', 'Táctica'),
    ('1-4-4-2', 'Táctica'),
    ('1-3-5-2', 'Táctica'),
    ('1-4-2-3-1', 'Táctica'),
    ('1-5-3-2', 'Táctica'),
    ('Hombre a hombre', 'Táctica'),
    ('Zonal', 'Táctica'),
    ('Mixta', 'Táctica')
ON CONFLICT (nombre) DO NOTHING;
