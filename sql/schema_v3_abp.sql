-- Esquema v3: Plan ABP del Partido

-- 0. Actualización de la tabla matches para incluir "competicion"
ALTER TABLE matches ADD COLUMN IF NOT EXISTS competicion TEXT DEFAULT 'Liga';

-- 1. Tabla para agrupar las instancias de ABP seleccionadas en un partido o en un borrador (Plan sin partido)
CREATE TABLE match_abp_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE, -- NULL significa "Plan sin partido" o borrador
    abp_play_id UUID NOT NULL REFERENCES abp_plays(id) ON DELETE RESTRICT,
    orden INTEGER NOT NULL DEFAULT 0,
    observaciones TEXT,
    
    -- Campos preparados para futuras ampliaciones
    video_asociado TEXT,
    imagenes JSONB,
    exito_porcentaje NUMERIC(5,2),
    rival TEXT,
    categoria TEXT,
    etiquetas JSONB,
    observaciones_cuerpo_tecnico TEXT,
    recomendaciones_ia TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla para asignar jugadores específicos a los roles de la jugada base para ese partido
CREATE TABLE match_abp_player_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_abp_plan_id UUID NOT NULL REFERENCES match_abp_plans(id) ON DELETE CASCADE,
    abp_player_role_id UUID NOT NULL REFERENCES abp_player_roles(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    notas_especificas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_match_plan_role UNIQUE (match_abp_plan_id, abp_player_role_id)
);

-- Habilitar RLS (Row Level Security) y Políticas Públicas
ALTER TABLE match_abp_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_abp_player_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read" ON match_abp_plans FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON match_abp_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON match_abp_plans FOR UPDATE USING (true);
CREATE POLICY "Public Delete" ON match_abp_plans FOR DELETE USING (true);

CREATE POLICY "Public Read" ON match_abp_player_assignments FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON match_abp_player_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON match_abp_player_assignments FOR UPDATE USING (true);
CREATE POLICY "Public Delete" ON match_abp_player_assignments FOR DELETE USING (true);
