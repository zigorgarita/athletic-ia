-- ============================================================================
-- PASO 3: SANEAMIENTO OFICIAL RFEF DE J1 EN public.match_player_stats (DEFINITIVO V2)
-- ============================================================================
-- Partido: Real Sociedad de Fútbol 5 – 1 SD Indautxu (Jornada 1)
-- CodActa RFEF: 70692427
-- match_id interno (public.matches): '0b77432e-aa46-446a-bc03-14924d37e662'
-- official_match_id (public.official_matches): '0958aaee-5654-4cb8-abea-82aac8bbc536'
--
-- Procedimiento acordado:
-- 1. Este script NO se ejecuta automáticamente por la IA.
-- 2. Zigor lo revisa y lo ejecuta manualmente en el SQL Editor de Supabase.
-- 3. Posteriormente, la IA realiza la verificación READ-ONLY.
--
-- Garantías de Seguridad e Idempotencia Real:
-- - Transacción global BEGIN ... COMMIT para atomicidad 100% pura (todo o nada).
-- - Añade matches.official_match_id como FK nullable con ON DELETE SET NULL.
-- - Índice único parcial sobre matches.official_match_id WHERE official_match_id IS NOT NULL.
-- - Precheck anticolisión en matches.official_match_id (debe ser NULL o el esperado).
-- - Precheck estructurado en official_matches: valida Real Sociedad vs Indautxu, J1, 5-1.
-- - Precheck estricto de identidades: valida 18/18 parejas exactas (UUID ↔ rfef_player_id).
-- - UPDATE in-situ de las 18 tuplas (match_id, player_id); CERO DELETE/INSERT.
-- - Preservación absoluta de campos técnicos independientes (asistencias, recuperaciones, etc.).
-- - Idempotencia pura con IS DISTINCT FROM (permite reejecutar sin fallar por ROW_COUNT).
-- - 13 Postchecks estrictos que auditan el estado resultante de la base de datos.
-- - ANÁLISIS PROPIO: NI TOCAR (100% aislado).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DDL ESTRUCTURAL: VÍNCULO FORMAL EN public.matches
-- ----------------------------------------------------------------------------
ALTER TABLE public.matches 
  ADD COLUMN IF NOT EXISTS official_match_id UUID REFERENCES public.official_matches(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_official_match_id 
  ON public.matches(official_match_id) 
  WHERE official_match_id IS NOT NULL;

COMMENT ON COLUMN public.matches.official_match_id IS 'Vínculo formal 1:1 con el acta oficial RFEF en official_matches. NULL para partidos no federativos.';

-- ----------------------------------------------------------------------------
-- 2. BLOQUE ANÓNIMO TRANSACCIONAL DE SANEAMIENTO Y VERIFICACIÓN
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    -- Claves y constantes verificadas
    v_match_id UUID := '0b77432e-aa46-446a-bc03-14924d37e662'::uuid;
    v_off_match_id UUID := '0958aaee-5654-4cb8-abea-82aac8bbc536'::uuid;
    v_acta_id INTEGER := 70692427;
    v_real_sociedad_club_id UUID := 'a823e75c-2246-4b19-9dd1-89ab199ebe38'::uuid;
    v_indautxu_club_id UUID := '13f4a8d6-a39c-4b39-a8dd-ca9c63c0c1ee'::uuid;

    -- Variables de control de precheck y ejecución
    v_precheck_match INTEGER;
    v_precheck_conflict_match INTEGER;
    v_precheck_off_match INTEGER;
    v_precheck_mps_count INTEGER;
    v_precheck_exact_rfef_matches INTEGER;
    v_updated_rows_matches INTEGER;
    v_updated_rows_mps INTEGER;

    -- Variables de postcheck
    v_post_match_link UUID;
    v_post_total_rows INTEGER;
    v_post_convocados INTEGER;
    v_post_titulares INTEGER;
    v_post_suplentes INTEGER;
    v_post_entraron INTEGER;
    v_post_cero_min INTEGER;
    v_post_sum_minutos INTEGER;
    v_post_goles_indautxu INTEGER;
    v_post_aratz_gol INTEGER;
    v_post_markel_min INTEGER;
    v_post_markel_goles INTEGER;
    v_post_markel_encajados INTEGER;
    v_post_aritz_min INTEGER;
    v_post_aritz_encajados INTEGER;
    v_post_aritz_amarilla BOOLEAN;
    v_post_total_amarillas INTEGER;
    v_post_total_rojas INTEGER;
    v_post_dorsales_ok INTEGER;
    v_post_rfef_count INTEGER;
    v_post_manual_count INTEGER;
    v_post_players_count INTEGER;
BEGIN
    RAISE NOTICE '=== INICIANDO PASO 3: SANEAMIENTO OFICIAL RFEF J1 ===';

    -- ------------------------------------------------------------------------
    -- PRECHECK 1: Confirmar existencia de J1 en public.matches y anticolisión
    -- ------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_precheck_match
    FROM public.matches
    WHERE id = v_match_id AND jornada = 1;

    IF v_precheck_match != 1 THEN
        RAISE EXCEPTION 'PRECHECK 1 FALLIDO: No se encontró el partido J1 en public.matches (id: %). Transacción abortada.', v_match_id;
    END IF;

    -- Comprobar que official_match_id sea NULL o exactamente el esperado
    SELECT COUNT(*) INTO v_precheck_conflict_match
    FROM public.matches
    WHERE id = v_match_id 
      AND official_match_id IS NOT NULL 
      AND official_match_id != v_off_match_id;

    IF v_precheck_conflict_match > 0 THEN
        RAISE EXCEPTION 'PRECHECK 1 FALLIDO: public.matches ya tiene asignado un official_match_id contradictorio. Transacción abortada para evitar sobreescritura accidental.';
    END IF;
    RAISE NOTICE '-> Precheck 1 OK: Partido J1 verificado sin colisiones en public.matches.';

    -- ------------------------------------------------------------------------
    -- PRECHECK 2: Confirmar acta oficial en public.official_matches con datos estructurados
    -- ------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_precheck_off_match
    FROM public.official_matches
    WHERE id = v_off_match_id
      AND rfef_cod_acta = v_acta_id
      AND jornada = 1
      AND local_club_id = v_real_sociedad_club_id
      AND visitor_club_id = v_indautxu_club_id
      AND goles_local = 5
      AND goles_visitante = 1
      AND jugado = true;

    IF v_precheck_off_match != 1 THEN
        RAISE EXCEPTION 'PRECHECK 2 FALLIDO: El acta official_matches no coincide exactamente con Real Sociedad 5-1 SD Indautxu, J1. Transacción abortada.';
    END IF;
    RAISE NOTICE '-> Precheck 2 OK: Acta oficial 70692427 validada estructuradamente (Real Sociedad 5-1 Indautxu, J1).';

    -- ------------------------------------------------------------------------
    -- PRECHECK 3: Confirmar exactamente 18 filas previas y sus identidades RFEF exactas (18/18)
    -- ------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_precheck_mps_count
    FROM public.match_player_stats
    WHERE match_id = v_match_id;

    IF v_precheck_mps_count != 18 THEN
        RAISE EXCEPTION 'PRECHECK 3 FALLIDO: Se esperaban 18 filas previas en match_player_stats para J1, encontradas: %. Transacción abortada.', v_precheck_mps_count;
    END IF;

    -- Validar que cada una de las 18 tuplas (UUID ↔ rfef_player_id) de J1 coincide 1:1 con lo aprobado en Paso 2
    SELECT COUNT(*) INTO v_precheck_exact_rfef_matches
    FROM public.match_player_stats m
    JOIN public.players p ON p.id = m.player_id
    JOIN (VALUES
        ('f4b19a54-2483-4469-a91d-e182353a4696'::uuid, 24521512), -- Markel Arroyo
        ('fce6e1eb-b43e-47f9-a169-f2e247602952'::uuid, 1541810),  -- Xabier Davalillo
        ('f62b76fd-9935-4cfd-8844-3ab1c552f75b'::uuid, 1486719),  -- Marcos Cruz
        ('ac998b90-c3db-4339-a72c-367625e4f744'::uuid, 23352157), -- Juan Solaeta
        ('e2085d0e-b789-450c-9f08-18a781007726'::uuid, 1502313),  -- Iker Eskubi
        ('dc7bd009-b340-4fd6-abda-d8b1202c4bbc'::uuid, 23290732), -- Xabier Puig
        ('1ea2f019-f18c-415d-abb0-932063067b75'::uuid, 1542360),  -- Unax Gil
        ('cf0a0604-5815-4b41-a1d0-dc661795bd59'::uuid, 1301108),  -- David Mosulen
        ('d902c8c5-7eae-44c4-9806-e8cbbd63242a'::uuid, 1517993),  -- Jon Sánchez
        ('ff305212-c3ac-45f0-8ced-f6ce38ee3a5a'::uuid, 1529187),  -- Aratz Dionisio
        ('da6e3da0-0781-4370-8647-7de8200d65da'::uuid, 770194),   -- Iker Anglada
        ('3bf71d54-aab8-499e-8ca9-2a2d594f9a33'::uuid, 1542256),  -- Joel Chacón
        ('6a9e2b4c-2de5-4b88-b72a-8e9e2e9bb0f6'::uuid, 1488838),  -- Aritz del Pico
        ('90b997ed-c48a-4011-8d00-68970c702ee4'::uuid, 24584490), -- Jon Bermejo
        ('5b9934fc-4944-4ce1-8116-ba12da1361ae'::uuid, 25742086), -- Danel López
        ('4de61d70-ab18-4332-b484-f113e4cb4378'::uuid, 1538372),  -- Jean Carlo González
        ('ffc0129c-b74f-4f31-a901-402591e88e22'::uuid, 24144753), -- David Castaños
        ('c7d74da3-f000-4303-98cb-d783c76a76ab'::uuid, 1364945)   -- Iván Herrero
    ) AS v(player_id, expected_rfef_id) ON p.id = v.player_id
    WHERE m.match_id = v_match_id AND p.rfef_player_id = v.expected_rfef_id;

    IF v_precheck_exact_rfef_matches != 18 THEN
        RAISE EXCEPTION 'PRECHECK 3 FALLIDO: Solo % de las 18 identidades de J1 coinciden exactamente con el mapeo UUID <-> rfef_player_id aprobado. Transacción abortada.', v_precheck_exact_rfef_matches;
    END IF;
    RAISE NOTICE '-> Precheck 3 OK: Las 18 identidades federativas coinciden 18/18 de forma exacta con lo aprobado.';

    -- ------------------------------------------------------------------------
    -- EJECUCIÓN A: Vinculación formal de public.matches a official_matches (Idempotente)
    -- ------------------------------------------------------------------------
    UPDATE public.matches
    SET official_match_id = v_off_match_id
    WHERE id = v_match_id 
      AND official_match_id IS DISTINCT FROM v_off_match_id;

    GET DIAGNOSTICS v_updated_rows_matches = ROW_COUNT;
    RAISE NOTICE '-> Matches actualizado: % filas modificadas con official_match_id.', v_updated_rows_matches;

    -- ------------------------------------------------------------------------
    -- EJECUCIÓN B: UPDATE in-situ con datos oficiales RFEF (Idempotente)
    -- Preserva intactos: asistencias, recuperaciones, intercepciones, duelos, pases.
    -- ------------------------------------------------------------------------
    UPDATE public.match_player_stats AS m
    SET 
        titular          = v.titular,
        convocado        = v.convocado,
        suplente         = v.suplente,
        entro_banquillo  = v.entro_banquillo,
        minuto_entrada   = v.minuto_entrada,
        minuto_salida    = v.minuto_salida,
        minutos          = v.minutos,
        goles            = v.goles,
        goles_encajados  = v.goles_encajados,
        tarjeta_amarilla = v.tarjeta_amarilla,
        doble_amarilla   = v.doble_amarilla,
        tarjeta_roja     = v.tarjeta_roja,
        roja_directa     = v.roja_directa,
        dorsal_partido   = v.dorsal_partido,
        origen           = 'rfef',
        rfef_acta_id     = v_acta_id
    FROM (VALUES
        -- TITULARES (11)
        ('f4b19a54-2483-4469-a91d-e182353a4696'::uuid, 1,  true,  true, false, false, 0,    90,   90, 0, 5, false, false, false, false), -- Markel Arroyo (POR)
        ('fce6e1eb-b43e-47f9-a169-f2e247602952'::uuid, 2,  true,  true, false, false, 0,    55,   55, 0, 0, false, false, false, false), -- Xabier Davalillo
        ('f62b76fd-9935-4cfd-8844-3ab1c552f75b'::uuid, 3,  true,  true, false, false, 0,    64,   64, 0, 0, false, false, false, false), -- Marcos Cruz
        ('ac998b90-c3db-4339-a72c-367625e4f744'::uuid, 4,  true,  true, false, false, 0,    64,   64, 0, 0, true,  false, false, false), -- Juan Solaeta (Amarilla 17')
        ('e2085d0e-b789-450c-9f08-18a781007726'::uuid, 5,  true,  true, false, false, 0,    90,   90, 0, 0, false, false, false, false), -- Iker Eskubi
        ('dc7bd009-b340-4fd6-abda-d8b1202c4bbc'::uuid, 6,  true,  true, false, false, 0,    55,   55, 0, 0, false, false, false, false), -- Xabier Puig
        ('1ea2f019-f18c-415d-abb0-932063067b75'::uuid, 7,  true,  true, false, false, 0,    90,   90, 0, 0, false, false, false, false), -- Unax Gil
        ('cf0a0604-5815-4b41-a1d0-dc661795bd59'::uuid, 8,  true,  true, false, false, 0,    90,   90, 0, 0, false, false, false, false), -- David Mosulen
        ('d902c8c5-7eae-44c4-9806-e8cbbd63242a'::uuid, 9,  true,  true, false, false, 0,    75,   75, 0, 0, false, false, false, false), -- Jon Sánchez
        ('ff305212-c3ac-45f0-8ced-f6ce38ee3a5a'::uuid, 10, true,  true, false, false, 0,    90,   90, 1, 0, false, false, false, false), -- Aratz Dionisio (1 gol)
        ('da6e3da0-0781-4370-8647-7de8200d65da'::uuid, 11, true,  true, false, false, 0,    90,   90, 0, 0, false, false, false, false), -- Iker Anglada
        -- SUPLENTES CONVOCADOS (7)
        ('3bf71d54-aab8-499e-8ca9-2a2d594f9a33'::uuid, 12, false, true, true,  true,  64,   90,   26, 0, 0, false, false, false, false), -- Joel Chacón (Entra 64')
        ('6a9e2b4c-2de5-4b88-b72a-8e9e2e9bb0f6'::uuid, 13, false, true, true,  false, NULL, NULL, 0,  0, 0, true,  false, false, false), -- Aritz del Pico (POR, Amarilla 70' banq, 0 encajados)
        ('90b997ed-c48a-4011-8d00-68970c702ee4'::uuid, 14, false, true, true,  true,  55,   90,   35, 0, 0, true,  false, false, false), -- Jon Bermejo (Entra 55', Amarilla 62')
        ('5b9934fc-4944-4ce1-8116-ba12da1361ae'::uuid, 15, false, true, true,  false, NULL, NULL, 0,  0, 0, false, false, false, false), -- Danel López (Sin minutos)
        ('4de61d70-ab18-4332-b484-f113e4cb4378'::uuid, 16, false, true, true,  true,  64,   90,   26, 0, 0, false, false, false, false), -- Jean Carlo González (Entra 64')
        ('ffc0129c-b74f-4f31-a901-402591e88e22'::uuid, 17, false, true, true,  true,  55,   90,   35, 0, 0, false, false, false, false), -- David Castaños (Entra 55')
        ('c7d74da3-f000-4303-98cb-d783c76a76ab'::uuid, 18, false, true, true,  true,  75,   90,   15, 0, 0, false, false, false, false)  -- Iván Herrero (Entra 75')
    ) AS v(player_id, dorsal_partido, titular, convocado, suplente, entro_banquillo, minuto_entrada, minuto_salida, minutos, goles, goles_encajados, tarjeta_amarilla, doble_amarilla, tarjeta_roja, roja_directa)
    WHERE m.match_id = v_match_id 
      AND m.player_id = v.player_id
      AND (
          m.titular IS DISTINCT FROM v.titular OR
          m.convocado IS DISTINCT FROM v.convocado OR
          m.suplente IS DISTINCT FROM v.suplente OR
          m.entro_banquillo IS DISTINCT FROM v.entro_banquillo OR
          m.minuto_entrada IS DISTINCT FROM v.minuto_entrada OR
          m.minuto_salida IS DISTINCT FROM v.minuto_salida OR
          m.minutos IS DISTINCT FROM v.minutos OR
          m.goles IS DISTINCT FROM v.goles OR
          m.goles_encajados IS DISTINCT FROM v.goles_encajados OR
          m.tarjeta_amarilla IS DISTINCT FROM v.tarjeta_amarilla OR
          m.doble_amarilla IS DISTINCT FROM v.doble_amarilla OR
          m.tarjeta_roja IS DISTINCT FROM v.tarjeta_roja OR
          m.roja_directa IS DISTINCT FROM v.roja_directa OR
          m.dorsal_partido IS DISTINCT FROM v.dorsal_partido OR
          m.origen IS DISTINCT FROM 'rfef' OR
          m.rfef_acta_id IS DISTINCT FROM v_acta_id
      );

    GET DIAGNOSTICS v_updated_rows_mps = ROW_COUNT;
    RAISE NOTICE '-> Match player stats actualizado: % filas modificadas en esta ejecución.', v_updated_rows_mps;

    -- ------------------------------------------------------------------------
    -- POSTCHECKS OBLIGATORIOS DE INTEGRIDAD RESULTANTE
    -- ------------------------------------------------------------------------
    -- Postcheck 1: Vínculo formal matches -> official_matches verificado
    SELECT official_match_id INTO v_post_match_link FROM public.matches WHERE id = v_match_id;
    IF v_post_match_link != v_off_match_id THEN
        RAISE EXCEPTION 'POSTCHECK 1 FALLIDO: matches.official_match_id no apunta al acta oficial esperada.';
    END IF;

    -- Postcheck 2: Exactamente 18 filas totales y 18 convocados para J1
    SELECT COUNT(*), COUNT(*) FILTER (WHERE convocado = true)
    INTO v_post_total_rows, v_post_convocados
    FROM public.match_player_stats 
    WHERE match_id = v_match_id;

    IF v_post_total_rows != 18 OR v_post_convocados != 18 THEN
        RAISE EXCEPTION 'POSTCHECK 2 FALLIDO: Filas J1 % (esperado 18), Convocados % (esperado 18).', v_post_total_rows, v_post_convocados;
    END IF;

    -- Postcheck 3: 11 titulares y 7 suplentes
    SELECT COUNT(*) FILTER (WHERE titular = true AND suplente = false),
           COUNT(*) FILTER (WHERE titular = false AND suplente = true)
    INTO v_post_titulares, v_post_suplentes
    FROM public.match_player_stats 
    WHERE match_id = v_match_id;

    IF v_post_titulares != 11 OR v_post_suplentes != 7 THEN
        RAISE EXCEPTION 'POSTCHECK 3 FALLIDO: Titulares % (esperado 11), Suplentes % (esperado 7).', v_post_titulares, v_post_suplentes;
    END IF;

    -- Postcheck 4: 5 entradas desde banquillo y 2 suplentes con 0 minutos
    SELECT COUNT(*) FILTER (WHERE suplente = true AND entro_banquillo = true),
           COUNT(*) FILTER (WHERE suplente = true AND minutos = 0)
    INTO v_post_entraron, v_post_cero_min
    FROM public.match_player_stats 
    WHERE match_id = v_match_id;

    IF v_post_entraron != 5 OR v_post_cero_min != 2 THEN
        RAISE EXCEPTION 'POSTCHECK 4 FALLIDO: Entradas desde banquillo % (esperado 5), Suplentes con 0m % (esperado 2).', v_post_entraron, v_post_cero_min;
    END IF;

    -- Postcheck 5: Suma exacta de minutos = 990
    SELECT SUM(minutos) INTO v_post_sum_minutos FROM public.match_player_stats WHERE match_id = v_match_id;
    IF v_post_sum_minutos != 990 THEN
        RAISE EXCEPTION 'POSTCHECK 5 FALLIDO: Suma de minutos es % (debe ser exactamente 990).', v_post_sum_minutos;
    END IF;

    -- Postcheck 6: Goles: Total 1 gol del Indautxu anotado por Aratz Dionisio
    SELECT SUM(goles) INTO v_post_goles_indautxu FROM public.match_player_stats WHERE match_id = v_match_id;
    SELECT goles INTO v_post_aratz_gol FROM public.match_player_stats WHERE match_id = v_match_id AND player_id = 'ff305212-c3ac-45f0-8ced-f6ce38ee3a5a'::uuid;
    IF v_post_goles_indautxu != 1 OR v_post_aratz_gol != 1 THEN
        RAISE EXCEPTION 'POSTCHECK 6 FALLIDO: Goles totales Indautxu % (esperado 1), Gol de Aratz % (esperado 1).', v_post_goles_indautxu, v_post_aratz_gol;
    END IF;

    -- Postcheck 7: Portero titular Markel Arroyo (90 min, 0 goles anotados, 5 encajados)
    SELECT minutos, goles, goles_encajados INTO v_post_markel_min, v_post_markel_goles, v_post_markel_encajados
    FROM public.match_player_stats 
    WHERE match_id = v_match_id AND player_id = 'f4b19a54-2483-4469-a91d-e182353a4696'::uuid;
    IF v_post_markel_min != 90 OR v_post_markel_goles != 0 OR v_post_markel_encajados != 5 THEN
        RAISE EXCEPTION 'POSTCHECK 7 FALLIDO: Markel Arroyo (min: %, goles: %, encajados: %). Esperado: 90, 0, 5.', v_post_markel_min, v_post_markel_goles, v_post_markel_encajados;
    END IF;

    -- Postcheck 8: Portero suplente Aritz del Pico (0 min, 0 encajados, tarjeta amarilla)
    SELECT minutos, goles_encajados, tarjeta_amarilla 
    INTO v_post_aritz_min, v_post_aritz_encajados, v_post_aritz_amarilla
    FROM public.match_player_stats 
    WHERE match_id = v_match_id AND player_id = '6a9e2b4c-2de5-4b88-b72a-8e9e2e9bb0f6'::uuid;
    IF v_post_aritz_min != 0 OR v_post_aritz_encajados != 0 OR v_post_aritz_amarilla != true THEN
        RAISE EXCEPTION 'POSTCHECK 8 FALLIDO: Aritz del Pico (min: %, encajados: %, amarilla: %). Esperado: 0, 0, true.', v_post_aritz_min, v_post_aritz_encajados, v_post_aritz_amarilla;
    END IF;

    -- Postcheck 9: Tarjetas: Exactamente 3 amarillas (Solaeta, Bermejo, Del Pico) y 0 rojas
    SELECT COUNT(*) FILTER (WHERE tarjeta_amarilla = true),
           COUNT(*) FILTER (WHERE tarjeta_roja = true OR roja_directa = true OR doble_amarilla = true)
    INTO v_post_total_amarillas, v_post_total_rojas
    FROM public.match_player_stats 
    WHERE match_id = v_match_id;

    IF v_post_total_amarillas != 3 OR v_post_total_rojas != 0 THEN
        RAISE EXCEPTION 'POSTCHECK 9 FALLIDO: Amarillas % (esperado 3), Rojas/Expulsiones % (esperado 0).', v_post_total_amarillas, v_post_total_rojas;
    END IF;

    -- Postcheck 10: Dorsales oficiales de partido del 1 al 18 correlativos y exactos
    SELECT COUNT(*) INTO v_post_dorsales_ok
    FROM public.match_player_stats m
    JOIN (VALUES
        ('f4b19a54-2483-4469-a91d-e182353a4696'::uuid, 1),
        ('fce6e1eb-b43e-47f9-a169-f2e247602952'::uuid, 2),
        ('f62b76fd-9935-4cfd-8844-3ab1c552f75b'::uuid, 3),
        ('ac998b90-c3db-4339-a72c-367625e4f744'::uuid, 4),
        ('e2085d0e-b789-450c-9f08-18a781007726'::uuid, 5),
        ('dc7bd009-b340-4fd6-abda-d8b1202c4bbc'::uuid, 6),
        ('1ea2f019-f18c-415d-abb0-932063067b75'::uuid, 7),
        ('cf0a0604-5815-4b41-a1d0-dc661795bd59'::uuid, 8),
        ('d902c8c5-7eae-44c4-9806-e8cbbd63242a'::uuid, 9),
        ('ff305212-c3ac-45f0-8ced-f6ce38ee3a5a'::uuid, 10),
        ('da6e3da0-0781-4370-8647-7de8200d65da'::uuid, 11),
        ('3bf71d54-aab8-499e-8ca9-2a2d594f9a33'::uuid, 12),
        ('6a9e2b4c-2de5-4b88-b72a-8e9e2e9bb0f6'::uuid, 13),
        ('90b997ed-c48a-4011-8d00-68970c702ee4'::uuid, 14),
        ('5b9934fc-4944-4ce1-8116-ba12da1361ae'::uuid, 15),
        ('4de61d70-ab18-4332-b484-f113e4cb4378'::uuid, 16),
        ('ffc0129c-b74f-4f31-a901-402591e88e22'::uuid, 17),
        ('c7d74da3-f000-4303-98cb-d783c76a76ab'::uuid, 18)
    ) AS v(player_id, dorsal_esperado) ON m.player_id = v.player_id
    WHERE m.match_id = v_match_id AND m.dorsal_partido = v.dorsal_esperado;

    IF v_post_dorsales_ok != 18 THEN
        RAISE EXCEPTION 'POSTCHECK 10 FALLIDO: Solo % de los 18 dorsales de partido coinciden con el acta oficial.', v_post_dorsales_ok;
    END IF;

    -- Postcheck 11: Origen 'rfef' y acta 70692427 en las 18 filas
    SELECT COUNT(*) INTO v_post_rfef_count 
    FROM public.match_player_stats 
    WHERE match_id = v_match_id AND origen = 'rfef' AND rfef_acta_id = v_acta_id;

    IF v_post_rfef_count != 18 THEN
        RAISE EXCEPTION 'POSTCHECK 11 FALLIDO: Filas con origen rfef y acta 70692427 son % (esperado 18).', v_post_rfef_count;
    END IF;

    -- Postcheck 12: Las 164 filas restantes de match_player_stats permanecen con origen = 'manual'
    SELECT COUNT(*) INTO v_post_manual_count 
    FROM public.match_player_stats 
    WHERE origen = 'manual';

    IF v_post_manual_count != 164 THEN
        RAISE EXCEPTION 'POSTCHECK 12 FALLIDO: Filas históricas manuales cambiaron a % (esperado 164).', v_post_manual_count;
    END IF;

    -- Postcheck 13: Plantilla de jugadores intacta (27 futbolistas)
    SELECT COUNT(*) INTO v_post_players_count FROM public.players;
    IF v_post_players_count != 27 THEN
        RAISE EXCEPTION 'POSTCHECK 13 FALLIDO: public.players cambió a % (debe ser 27).', v_post_players_count;
    END IF;

    RAISE NOTICE '=== PASO 3 COMPLETADO CON ÉXITO: J1 DEL SD INDAUTXU SANEADA AL 100%% CON ACTA RFEF 70692427 ===';
END $$;

COMMIT;
