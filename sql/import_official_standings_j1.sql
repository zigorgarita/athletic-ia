-- ============================================================================
-- PASO 7B: IMPORTACIÓN OFICIAL RFEF J1 Y TABLA official_standings (ROBUSTO)
-- ============================================================================
-- Competición: Juvenil División de Honor - Grupo 2 (Temporada 2026-27)
-- Parámetros RFEF Oficiales:
--   CodCompeticion = 33836116
--   CodGrupo       = 33836118
--   CodTemporada   = 22
--   CodJornada     = 1
--
-- Procedimiento acordado:
-- 1. Este script NO se ejecuta automáticamente por la IA.
-- 2. Zigor lo revisa y lo ejecuta manualmente en el SQL Editor de Supabase.
-- 3. Posteriormente, la IA realiza la verificación READ-ONLY.
--
-- Arquitectura de Máxima Robustez:
-- - CERO TEMP TABLES: El snapshot oficial está 100% autocontenido en el bloque PL/pgSQL.
-- - Inmune a cortes de sesión, desconexiones o transaction pooling de Supabase/PgBouncer.
-- - Idempotencia defensiva estricta:
--     * Si J1 no existe -> Inserta las 16 filas.
--     * Si J1 ya existe y las 16 filas coinciden exactamente -> PASS sin escrituras.
--     * Si J1 existe parcialmente o difiere en alguna métrica -> ABORTA.
-- - Restricción formal de jornada: CHECK (jornada >= 1 AND jornada <= 30).
-- - Balance oficial: 45 GF = 45 GC, G=6, P=6, E=4.
-- - ANÁLISIS PROPIO: NI TOCAR (100% aislado).
-- ============================================================================

BEGIN;

-- ============================================================================
-- PARTE 1: CREACIÓN / AJUSTE DE TABLA official_standings (DDL IDEMPOTENTE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.official_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    temporada VARCHAR(10) NOT NULL DEFAULT '2026-27',
    jornada INTEGER NOT NULL,
    posicion INTEGER NOT NULL CHECK (posicion >= 1 AND posicion <= 16),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE RESTRICT,
    pj INTEGER NOT NULL CHECK (pj >= 0),
    g INTEGER NOT NULL CHECK (g >= 0),
    e INTEGER NOT NULL CHECK (e >= 0),
    p INTEGER NOT NULL CHECK (p >= 0),
    gf INTEGER NOT NULL CHECK (gf >= 0),
    gc INTEGER NOT NULL CHECK (gc >= 0),
    dg INTEGER NOT NULL,
    puntos INTEGER NOT NULL CHECK (puntos >= 0),
    source VARCHAR(50) NOT NULL DEFAULT 'RFEF_OFFICIAL_WEB',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    
    -- Restricciones de integridad unívoca
    CONSTRAINT uq_official_standings_temp_jornada_pos UNIQUE (temporada, jornada, posicion),
    CONSTRAINT uq_official_standings_temp_jornada_club UNIQUE (temporada, jornada, club_id),
    
    -- Coherencia matemática básica a nivel de fila
    CONSTRAINT chk_pj_breakdown CHECK (pj = (g + e + p)),
    CONSTRAINT chk_dg_calc CHECK (dg = (gf - gc))
);

-- Asegurar explícitamente el límite formal de 30 jornadas (idempotente)
ALTER TABLE public.official_standings 
    DROP CONSTRAINT IF EXISTS official_standings_jornada_check,
    DROP CONSTRAINT IF EXISTS chk_official_standings_jornada;

ALTER TABLE public.official_standings 
    ADD CONSTRAINT chk_official_standings_jornada 
    CHECK (jornada >= 1 AND jornada <= 30);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_official_standings_lookup 
    ON public.official_standings (temporada, jornada, posicion);

CREATE INDEX IF NOT EXISTS idx_official_standings_club 
    ON public.official_standings (club_id);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.update_official_standings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_official_standings_updated_at ON public.official_standings;
CREATE TRIGGER trg_official_standings_updated_at
    BEFORE UPDATE ON public.official_standings
    FOR EACH ROW EXECUTE FUNCTION public.update_official_standings_updated_at();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.official_standings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read official_standings" ON public.official_standings;
CREATE POLICY "Public Read official_standings" 
    ON public.official_standings 
    FOR SELECT 
    TO anon, authenticated 
    USING (true);

DROP POLICY IF EXISTS "Service Role Manage official_standings" ON public.official_standings;
CREATE POLICY "Service Role Manage official_standings" 
    ON public.official_standings 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Documentación en catálogo
COMMENT ON TABLE public.official_standings IS 'Instantáneas históricas inmutables de la clasificación oficial publicada por RFEF por jornada.';
COMMENT ON COLUMN public.official_standings.posicion IS 'Posición federativa oficial con criterios de desempate federativos resueltos por RFEF.';
COMMENT ON COLUMN public.official_standings.source IS 'Fuente oficial acreditada (ej. RFEF_OFFICIAL_WEB).';


-- ============================================================================
-- PARTE 2: INGESTA DEFENSIVA Y VALIDACIÓN (PL/pgSQL AUTOCONTENIDO)
-- ============================================================================
DO $$
DECLARE
    -- Snapshot oficial de J1 encapsulado como constante JSONB dentro del propio bloque
    -- (Elimina por completo la necesidad de TEMP TABLES y problemas de scope en Supabase)
    v_expected JSONB := '[
      {"pos": 1,  "rfef_id": 205459,    "pj": 1, "g": 1, "e": 0, "p": 0, "gf": 11, "gc": 2,  "dg": 9,  "pts": 3},
      {"pos": 2,  "rfef_id": 205514,    "pj": 1, "g": 1, "e": 0, "p": 0, "gf": 6,  "gc": 0,  "dg": 6,  "pts": 3},
      {"pos": 3,  "rfef_id": 205484,    "pj": 1, "g": 1, "e": 0, "p": 0, "gf": 5,  "gc": 0,  "dg": 5,  "pts": 3},
      {"pos": 4,  "rfef_id": 205597,    "pj": 1, "g": 1, "e": 0, "p": 0, "gf": 5,  "gc": 1,  "dg": 4,  "pts": 3},
      {"pos": 5,  "rfef_id": 23289700,  "pj": 1, "g": 1, "e": 0, "p": 0, "gf": 4,  "gc": 2,  "dg": 2,  "pts": 3},
      {"pos": 6,  "rfef_id": 205540,    "pj": 1, "g": 1, "e": 0, "p": 0, "gf": 2,  "gc": 1,  "dg": 1,  "pts": 3},
      {"pos": 7,  "rfef_id": 205603,    "pj": 1, "g": 0, "e": 1, "p": 0, "gf": 2,  "gc": 2,  "dg": 0,  "pts": 1},
      {"pos": 8,  "rfef_id": 207449,    "pj": 1, "g": 0, "e": 1, "p": 0, "gf": 2,  "gc": 2,  "dg": 0,  "pts": 1},
      {"pos": 9,  "rfef_id": 900361152, "pj": 1, "g": 0, "e": 1, "p": 0, "gf": 1,  "gc": 1,  "dg": 0,  "pts": 1},
      {"pos": 10, "rfef_id": 205567,    "pj": 1, "g": 0, "e": 1, "p": 0, "gf": 1,  "gc": 1,  "dg": 0,  "pts": 1},
      {"pos": 11, "rfef_id": 23289793,  "pj": 1, "g": 0, "e": 0, "p": 1, "gf": 1,  "gc": 2,  "dg": -1, "pts": 0},
      {"pos": 12, "rfef_id": 33836521,  "pj": 1, "g": 0, "e": 0, "p": 1, "gf": 2,  "gc": 4,  "dg": -2, "pts": 0},
      {"pos": 13, "rfef_id": 33836524,  "pj": 1, "g": 0, "e": 0, "p": 1, "gf": 1,  "gc": 5,  "dg": -4, "pts": 0},
      {"pos": 14, "rfef_id": 33836523,  "pj": 1, "g": 0, "e": 0, "p": 1, "gf": 0,  "gc": 5,  "dg": -5, "pts": 0},
      {"pos": 15, "rfef_id": 205744,    "pj": 1, "g": 0, "e": 0, "p": 1, "gf": 0,  "gc": 6,  "dg": -6, "pts": 0},
      {"pos": 16, "rfef_id": 33836522,  "pj": 1, "g": 0, "e": 0, "p": 1, "gf": 2,  "gc": 11, "dg": -9, "pts": 0}
    ]'::jsonb;

    v_mapped_count INTEGER;
    v_existing_count INTEGER;
    v_extra_count INTEGER;
    v_inserted_count INTEGER;
    v_diff_record RECORD;
    
    -- Variables para postchecks de balance global
    v_distinct_pos INTEGER;
    v_total_gf INTEGER;
    v_total_gc INTEGER;
    v_total_g INTEGER;
    v_total_e INTEGER;
    v_total_p INTEGER;
BEGIN
    -- --------------------------------------------------------------------------
    -- PRECHECK 1: Verificar que los 16 clubes existen en public.clubs
    -- --------------------------------------------------------------------------
    SELECT COUNT(DISTINCT c.id) INTO v_mapped_count
    FROM jsonb_to_recordset(v_expected) AS exp(
        pos INTEGER, rfef_id INTEGER, pj INTEGER, g INTEGER, e INTEGER, p INTEGER,
        gf INTEGER, gc INTEGER, dg INTEGER, pts INTEGER
    )
    JOIN public.clubs c ON c.rfef_club_id = exp.rfef_id;

    IF v_mapped_count != 16 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Solo se encontraron % de los 16 clubes mapeados en public.clubs.', v_mapped_count;
    END IF;

    -- --------------------------------------------------------------------------
    -- EVALUACIÓN DE ESTADO EXISTENTE EN public.official_standings (J1)
    -- --------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_existing_count
    FROM public.official_standings
    WHERE temporada = '2026-27' AND jornada = 1;

    -- --------------------------------------------------------------------------
    -- CASO 1: YA EXISTEN REGISTROS DE J1 (IDEMPOTENCIA DEFENSIVA)
    -- --------------------------------------------------------------------------
    IF v_existing_count > 0 THEN
        -- A) Si tiene más o menos de 16 filas -> ABORTAR
        IF v_existing_count != 16 THEN
            RAISE EXCEPTION 'IDEMPOTENCIA ABORTADA: J1 existe parcialmente con % filas (esperadas 16). No se borra ni sobrescribe.', v_existing_count;
        END IF;

        -- B) Comprobar si existen clubes no reconocidos en la BD
        SELECT COUNT(*) INTO v_extra_count
        FROM public.official_standings o
        WHERE o.temporada = '2026-27' 
          AND o.jornada = 1
          AND NOT EXISTS (
              SELECT 1 
              FROM jsonb_to_recordset(v_expected) AS exp(
                  pos INTEGER, rfef_id INTEGER, pj INTEGER, g INTEGER, e INTEGER, p INTEGER,
                  gf INTEGER, gc INTEGER, dg INTEGER, pts INTEGER
              )
              JOIN public.clubs c ON c.rfef_club_id = exp.rfef_id
              WHERE c.id = o.club_id
          );

        IF v_extra_count > 0 THEN
            RAISE EXCEPTION 'IDEMPOTENCIA ABORTADA: J1 contiene % clubes no reconocidos en el snapshot oficial. No se borra ni sobrescribe.', v_extra_count;
        END IF;

        -- C) Comparar métrica a métrica por club:
        --    posicion, pj, g, e, p, gf, gc, dg, puntos
        SELECT 
            c.nombre,
            exp.pos AS exp_pos, o.posicion AS act_pos,
            exp.pj AS exp_pj, o.pj AS act_pj,
            exp.g AS exp_g, o.g AS act_g,
            exp.e AS exp_e, o.e AS act_e,
            exp.p AS exp_p, o.p AS act_p,
            exp.gf AS exp_gf, o.gf AS act_gf,
            exp.gc AS exp_gc, o.gc AS act_gc,
            exp.dg AS exp_dg, o.dg AS act_dg,
            exp.pts AS exp_pts, o.puntos AS act_pts
        INTO v_diff_record
        FROM jsonb_to_recordset(v_expected) AS exp(
            pos INTEGER, rfef_id INTEGER, pj INTEGER, g INTEGER, e INTEGER, p INTEGER,
            gf INTEGER, gc INTEGER, dg INTEGER, pts INTEGER
        )
        JOIN public.clubs c ON c.rfef_club_id = exp.rfef_id
        JOIN public.official_standings o 
          ON o.temporada = '2026-27' 
         AND o.jornada = 1 
         AND o.club_id = c.id
        WHERE o.posicion != exp.pos
           OR o.pj != exp.pj
           OR o.g != exp.g
           OR o.e != exp.e
           OR o.p != exp.p
           OR o.gf != exp.gf
           OR o.gc != exp.gc
           OR o.dg != exp.dg
           OR o.puntos != exp.pts
        LIMIT 1;

        IF v_diff_record.nombre IS NOT NULL THEN
            RAISE EXCEPTION 'IDEMPOTENCIA ABORTADA: Discrepancia en % (Esperado: pos=%, pj=%, g=%, e=%, p=%, gf=%, gc=%, dg=%, pts=% | Actual: pos=%, pj=%, g=%, e=%, p=%, gf=%, gc=%, dg=%, pts=%). No se borra ni sobrescribe.',
                v_diff_record.nombre,
                v_diff_record.exp_pos, v_diff_record.act_pos,
                v_diff_record.exp_pj, v_diff_record.act_pj,
                v_diff_record.exp_g, v_diff_record.act_g,
                v_diff_record.exp_e, v_diff_record.act_e,
                v_diff_record.exp_p, v_diff_record.act_p,
                v_diff_record.exp_gf, v_diff_record.act_gf,
                v_diff_record.exp_gc, v_diff_record.act_gc,
                v_diff_record.exp_dg, v_diff_record.act_dg,
                v_diff_record.exp_pts, v_diff_record.act_pts;
        END IF;

        -- Coincidencia 100% verificada
        RAISE NOTICE 'IDEMPOTENCIA PASS: J1 ya existe y las 16 filas coinciden al 100%% con el snapshot oficial RFEF. No se realizó ninguna modificación.';
        RETURN;
    END IF;

    -- --------------------------------------------------------------------------
    -- CASO 2: J1 NO EXISTE (v_existing_count = 0) -> INSERCIÓN ESTRICTA
    -- --------------------------------------------------------------------------
    INSERT INTO public.official_standings (
        temporada,
        jornada,
        posicion,
        club_id,
        pj,
        g,
        e,
        p,
        gf,
        gc,
        dg,
        puntos,
        source
    )
    SELECT 
        '2026-27' AS temporada,
        1 AS jornada,
        exp.pos,
        c.id AS club_id,
        exp.pj,
        exp.g,
        exp.e,
        exp.p,
        exp.gf,
        exp.gc,
        exp.dg,
        exp.pts,
        'RFEF_OFFICIAL_WEB' AS source
    FROM jsonb_to_recordset(v_expected) AS exp(
        pos INTEGER, rfef_id INTEGER, pj INTEGER, g INTEGER, e INTEGER, p INTEGER,
        gf INTEGER, gc INTEGER, dg INTEGER, pts INTEGER
    )
    JOIN public.clubs c ON c.rfef_club_id = exp.rfef_id
    ORDER BY exp.pos ASC;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

    -- --------------------------------------------------------------------------
    -- POSTCHECKS MATEMÁTICOS TRAS INSERCIÓN
    -- --------------------------------------------------------------------------
    IF v_inserted_count != 16 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Se insertaron % filas en lugar de 16.', v_inserted_count;
    END IF;

    SELECT 
        COUNT(DISTINCT posicion),
        SUM(gf),
        SUM(gc),
        SUM(g),
        SUM(e),
        SUM(p)
    INTO 
        v_distinct_pos,
        v_total_gf,
        v_total_gc,
        v_total_g,
        v_total_e,
        v_total_p
    FROM public.official_standings
    WHERE temporada = '2026-27' AND jornada = 1;

    IF v_distinct_pos != 16 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Las posiciones no son únicas o completas (encontradas % distintas).', v_distinct_pos;
    END IF;

    -- Balance global de goles en los 8 partidos de J1 (Total goles = 45)
    IF v_total_gf != 45 OR v_total_gc != 45 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Goles totales esperados 45 (GF: %, GC: %).', v_total_gf, v_total_gc;
    END IF;

    IF v_total_gf != v_total_gc THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: GF total (%) != GC total (%).', v_total_gf, v_total_gc;
    END IF;

    -- 6 victorias, 6 derrotas, 4 empates (2 partidos empatados)
    IF v_total_g != 6 OR v_total_p != 6 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Victorias totales (%) o Derrotas totales (%) difieren de 6.', v_total_g, v_total_p;
    END IF;

    IF v_total_e != 4 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Empates totales esperados 4 (encontrados %).', v_total_e;
    END IF;

    RAISE NOTICE 'ÉXITO: Snapshot oficial RFEF J1 insertado y verificado (16/16 clubes Grupo 2, balances matemáticos exactos).';
END $$;

COMMIT;

-- ============================================================================
-- CONSULTA DE VERIFICACIÓN POST-EJECUCIÓN (READ-ONLY)
-- ============================================================================
-- SELECT 
--     s.posicion,
--     c.nombre AS club,
--     s.pj, s.g, s.e, s.p, s.gf, s.gc, s.dg, s.puntos,
--     s.source,
--     s.created_at
-- FROM public.official_standings s
-- JOIN public.clubs c ON c.id = s.club_id
-- WHERE s.temporada = '2026-27' AND s.jornada = 1
-- ORDER BY s.posicion ASC;
