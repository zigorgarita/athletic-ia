-- =========================================================================
-- FASE 2: ESQUEMA OFICIAL DE DATOS DEL PREPARADOR FÍSICO (DATOS PF)
-- =========================================================================

-- 1. TABLA: TESTS FÍSICOS (Histórico fila a fila por test individual)
CREATE TABLE IF NOT EXISTS public.player_physical_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    test_type TEXT NOT NULL CHECK (
        test_type IN (
            'yoyo',
            'sprint_curvo_derecho',
            'sprint_curvo_izquierdo',
            'sprint_lineal',
            'illinois',
            'saltabilidad'
        )
    ),
    valor NUMERIC(12,4) NOT NULL,           -- Capacidad amplia para cualquier protocolo y precisión
    valor_origen TEXT NOT NULL,             -- Texto exacto de la celda del Excel
    fecha_test DATE NULL,                   -- NULL si día exacto desconocido
    periodo TEXT NOT NULL,                  -- 'Pretemporada 2026'
    lote TEXT NOT NULL,                     -- 'pf_tests_pretemporada_2026_v1'
    unidad TEXT NULL,                       -- NULL (no confirmada)
    protocolo TEXT NULL,                    -- NULL (no confirmado)
    origen_datos TEXT NULL DEFAULT 'Plantilla_Test_Fisicos_Jugadores.xlsx',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Restricción de Idempotencia por jugador, tipo de test y lote
    CONSTRAINT unique_player_physical_test UNIQUE (player_id, test_type, lote)
);

-- 2. TABLA: MEDICIONES CORPORALES (Una fila por toma de medición y jugador)
CREATE TABLE IF NOT EXISTS public.player_body_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    fecha_medicion DATE NULL,               -- NULL si día exacto desconocido
    periodo TEXT NOT NULL,                  -- 'Julio 2026'
    lote TEXT NOT NULL,                     -- 'pf_mediciones_julio_2026_v1'
    
    -- Valores generales (peso histórico de la toma + composición)
    peso NUMERIC(6,2) NULL,                 -- Histórico en esta toma (ej: 72.75)
    imc NUMERIC(6,2) NULL,                  -- Número puro (ej: 25.20)
    grasa_corporal NUMERIC(6,2) NULL,       -- Número puro sin unidad (ej: 21.40)
    
    -- Pliegues corporales (valores reales del PF)
    triceps NUMERIC(6,2) NULL,              -- Ej: 46.20
    subescapular NUMERIC(6,2) NULL,         -- Ej: 45.20
    suprailiaco NUMERIC(6,2) NULL,          -- Ej: 45.10 (mapeado de SUPARAILIACO)
    abdominal NUMERIC(6,2) NULL,            -- Ej: 45.40
    cuadriceps NUMERIC(6,2) NULL,           -- Ej: 44.20
    biceps NUMERIC(6,2) NULL,               -- Ej: 48.00
    gemelo NUMERIC(6,2) NULL,               -- Ej: 39.60
    
    observaciones TEXT NULL,
    origen_datos TEXT NULL DEFAULT 'MEDICIONES.xlsx',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Restricción de Idempotencia por jugador y lote
    CONSTRAINT unique_player_body_measurement UNIQUE (player_id, lote)
);

-- 3. Índices de optimización de consulta
CREATE INDEX IF NOT EXISTS idx_player_physical_tests_player ON public.player_physical_tests(player_id);
CREATE INDEX IF NOT EXISTS idx_player_physical_tests_lookup ON public.player_physical_tests(player_id, test_type, lote);
CREATE INDEX IF NOT EXISTS idx_player_body_measurements_player ON public.player_body_measurements(player_id);
CREATE INDEX IF NOT EXISTS idx_player_body_measurements_lookup ON public.player_body_measurements(player_id, lote);

-- 4. Seguridad: RLS Habilitado SIN Public SELECT (Solo accesible desde servidor / backend)
ALTER TABLE public.player_physical_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_body_measurements ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas públicas previas si existieran
DROP POLICY IF EXISTS "Public SELECT player_physical_tests" ON public.player_physical_tests;
DROP POLICY IF EXISTS "Public SELECT player_body_measurements" ON public.player_body_measurements;
DROP POLICY IF EXISTS "Public Read Tests" ON public.player_physical_tests;
DROP POLICY IF EXISTS "Public Read Measurements" ON public.player_body_measurements;
