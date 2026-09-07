-- ============================================================================
-- SCRIPT DE CORRECCIÓN CONTROLADA DEL AUTOGOL: EF MAREO vs REAL VALLADOLID (J1)
-- Acta Oficial RFEF: 70692428
--
-- MOTIVACIÓN TÉCNICA:
-- El acta RFEF contiene 13 goles:
--   - 10 goles nominales anotados por jugadores de Real Valladolid CF
--   - 2 goles nominales anotados por jugadores de EF Mareo
--   - 1 gol en propia puerta (autogol) de Izan Pinilla Ciaurri (EF Mareo, min 64')
-- En la importación original, un fallo case-sensitive ('Propia' vs 'propia puerta')
-- sumó erróneamente el autogol al tanteo local (3-10) y asignó 1 gol a Pinilla.
--
-- CORRECCIÓN OFICIAL:
-- 1. official_matches (acta 70692428): goles_local = 2, goles_visitante = 11
-- 2. club_match_player_stats (Pinilla, rfef_player_id 1363891): goles = 0
--
-- TOTAL FILAS MODIFICADAS: exactamente 1 en official_matches + 1 en club_match_player_stats
-- TRANSACCIONAL, IDEMPOTENTE Y 100% DEFENSIVO
-- ============================================================================

DO $$
DECLARE
    -- Variables para official_matches
    v_match_id UUID;
    v_goles_local INTEGER;
    v_goles_visitante INTEGER;
    v_actual_local_club_id UUID;
    v_actual_visitor_club_id UUID;
    v_local_club_id UUID := 'aa8de564-c6cb-4689-9416-dbffb9c5bf56'; -- EF MAREO
    v_visitor_club_id UUID := 'e686b482-b4c2-4ed0-acf2-3bded5585c4c'; -- REAL VALLADOLID

    -- Variables para jugador Izan Pinilla
    v_player_id UUID;
    v_stat_id UUID;
    v_pinilla_goles INTEGER;

    -- Variables de validación postcheck
    v_sum_goles_mareo INTEGER;
    v_sum_goles_valladolid INTEGER;
    v_count_stats_match INTEGER;
    v_sum_minutos_match INTEGER;
    v_count_indautxu_stats INTEGER;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'INICIANDO VALIDACIONES PREVIAS (PRECHECKS)...';
    RAISE NOTICE '=======================================================';

    -- ----------------------------------------------------------------
    -- PRECHECK 1: EXISTENCIA Y ESTADO DEL PARTIDO EN official_matches
    -- ----------------------------------------------------------------
    SELECT id, goles_local, goles_visitante, local_club_id, visitor_club_id
    INTO v_match_id, v_goles_local, v_goles_visitante, v_actual_local_club_id, v_actual_visitor_club_id
    FROM public.official_matches
    WHERE rfef_cod_acta = 70692428;

    IF v_match_id IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: No se encontró el partido con acta 70692428 en official_matches.';
    END IF;

    IF v_match_id <> '93a89c9a-9a21-49e9-bd98-db2ff37cacd6'::uuid THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: El UUID del partido no coincide con el esperado (encontrado: %).', v_match_id;
    END IF;

    -- Acreditar explícitamente los clubes del partido
    IF v_actual_local_club_id <> v_local_club_id THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club local inesperado (encontrado: %, esperado EF Mareo: %).', v_actual_local_club_id, v_local_club_id;
    END IF;

    IF v_actual_visitor_club_id <> v_visitor_club_id THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club visitante inesperado (encontrado: %, esperado Real Valladolid: %).', v_actual_visitor_club_id, v_visitor_club_id;
    END IF;

    -- Validar idempotencia: debe estar en estado pre-corrección (3-10) o post-corrección (2-11)
    IF NOT ((v_goles_local = 3 AND v_goles_visitante = 10) OR (v_goles_local = 2 AND v_goles_visitante = 11)) THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Marcador incompatible en official_matches (encontrado: % - %). Se esperaba 3-10 o 2-11.', v_goles_local, v_goles_visitante;
    END IF;

    RAISE NOTICE '-> PRECHECK 1 OK: Partido 70692428 acreditado (EF Mareo vs Real Valladolid, Estado actual: % - %).', v_goles_local, v_goles_visitante;

    -- ----------------------------------------------------------------
    -- PRECHECK 2: IDENTIDAD DE IZAN PINILLA CIAURRI EN club_players
    -- ----------------------------------------------------------------
    SELECT id INTO v_player_id
    FROM public.club_players
    WHERE rfef_player_id = 1363891 AND nombre = 'PINILLA CIAURRI, IZAN';

    IF v_player_id IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: No se encontró a Izan Pinilla Ciaurri (rfef_player_id = 1363891) en club_players.';
    END IF;

    IF v_player_id <> '88f2b820-85a8-4d45-b4e7-26aab767efae'::uuid THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: UUID de Izan Pinilla inesperado (encontrado: %).', v_player_id;
    END IF;

    RAISE NOTICE '-> PRECHECK 2 OK: Jugador Izan Pinilla acreditado (UUID: %).', v_player_id;

    -- ----------------------------------------------------------------
    -- PRECHECK 3: ESTADÍSTICA DE IZAN PINILLA EN club_match_player_stats
    -- ----------------------------------------------------------------
    SELECT id, goles INTO v_stat_id, v_pinilla_goles
    FROM public.club_match_player_stats
    WHERE official_match_id = v_match_id AND club_player_id = v_player_id;

    IF v_stat_id IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: No se encontró la fila estadística de Izan Pinilla en el partido 70692428.';
    END IF;

    IF v_stat_id <> '72bb3167-d7bb-4e29-bb91-5a38ec68c4d9'::uuid THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: UUID de estadística inesperado (encontrado: %).', v_stat_id;
    END IF;

    -- Validar idempotencia: goles debe ser 1 (pre) o 0 (post)
    IF v_pinilla_goles NOT IN (0, 1) THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Goles de Izan Pinilla fuera del rango esperado (encontrado: %). Se esperaba 1 o 0.', v_pinilla_goles;
    END IF;

    RAISE NOTICE '-> PRECHECK 3 OK: Estadística de Izan Pinilla acreditada (goles actuales: %).', v_pinilla_goles;

    -- ================================================================
    -- ACCIONES DE CORRECCIÓN
    -- ================================================================
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'EJECUTANDO ACTUALIZACIONES CONTROLADAS...';
    RAISE NOTICE '=======================================================';

    -- 1. Actualizar resultado oficial del partido
    UPDATE public.official_matches
    SET goles_local = 2,
        goles_visitante = 11,
        updated_at = NOW()
    WHERE id = v_match_id;

    -- 2. Corregir autogol de Izan Pinilla (goles nominales a favor = 0)
    UPDATE public.club_match_player_stats
    SET goles = 0
    WHERE id = v_stat_id;

    RAISE NOTICE '-> Actualizaciones ejecutadas correctamente.';

    -- ================================================================
    -- VERIFICACIONES POSTERIORES (POSTCHECKS)
    -- ================================================================
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'EJECUTANDO COMPROBACIONES POSTERIORES (POSTCHECKS)...';
    RAISE NOTICE '=======================================================';

    -- POSTCHECK 1: Marcador oficial exacto 2-11 en official_matches
    SELECT goles_local, goles_visitante
    INTO v_goles_local, v_goles_visitante
    FROM public.official_matches
    WHERE id = v_match_id;

    IF v_goles_local <> 2 OR v_goles_visitante <> 11 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO 1] official_matches no quedó en 2-11 (encontrado: % - %).', v_goles_local, v_goles_visitante;
    END IF;
    RAISE NOTICE '-> POSTCHECK 1 OK: official_matches 70692428 refleja exactamente EF Mareo 2 - 11 Real Valladolid.';

    -- POSTCHECK 2: Goles a favor de jugadores de EF Mareo = exactamente 2
    SELECT COALESCE(SUM(goles), 0)
    INTO v_sum_goles_mareo
    FROM public.club_match_player_stats
    WHERE official_match_id = v_match_id AND club_id = v_local_club_id;

    IF v_sum_goles_mareo <> 2 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO 2] Suma de goles de jugadores de Mareo debe ser 2 (encontrado: %).', v_sum_goles_mareo;
    END IF;
    RAISE NOTICE '-> POSTCHECK 2 OK: Suma de goles de jugadores de EF Mareo = 2 (García Castillo 1 + Arriaga Ruiz 1).';

    -- POSTCHECK 3: Goles nominales de jugadores de Real Valladolid = exactamente 10
    SELECT COALESCE(SUM(goles), 0)
    INTO v_sum_goles_valladolid
    FROM public.club_match_player_stats
    WHERE official_match_id = v_match_id AND club_id = v_visitor_club_id;

    IF v_sum_goles_valladolid <> 10 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO 3] Suma de goles nominales de Valladolid debe ser 10 (encontrado: %).', v_sum_goles_valladolid;
    END IF;
    RAISE NOTICE '-> POSTCHECK 3 OK: Suma de goles nominales de Real Valladolid = 10 (Iguaz 3, Merino 3, Martín Serna 2, Fdez Cruz 1, Kanta 1). El gol 11 procede del autogol rival.';

    -- POSTCHECK 4: Izan Pinilla Ciaurri tiene exactamente 0 goles
    SELECT goles INTO v_pinilla_goles
    FROM public.club_match_player_stats
    WHERE id = v_stat_id;

    IF v_pinilla_goles <> 0 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO 4] Izan Pinilla debe tener 0 goles (encontrado: %).', v_pinilla_goles;
    END IF;
    RAISE NOTICE '-> POSTCHECK 4 OK: Izan Pinilla tiene exactamente goles = 0.';

    -- POSTCHECK 5: Integridad de filas estadísticas del partido (36 jugadores)
    SELECT COUNT(*) INTO v_count_stats_match
    FROM public.club_match_player_stats
    WHERE official_match_id = v_match_id;

    IF v_count_stats_match <> 36 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO 5] Total de estadísticas del partido alterado (esperado 36, encontrado: %).', v_count_stats_match;
    END IF;
    RAISE NOTICE '-> POSTCHECK 5 OK: Total de estadísticas del partido intacto (36 filas: 18 Mareo + 18 Valladolid).';

    -- POSTCHECK 6: Suma de minutos del partido intacta (1980 minutos)
    SELECT COALESCE(SUM(minutos), 0) INTO v_sum_minutos_match
    FROM public.club_match_player_stats
    WHERE official_match_id = v_match_id;

    IF v_sum_minutos_match <> 1980 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO 6] Suma de minutos del partido alterada (esperado 1980, encontrado: %).', v_sum_minutos_match;
    END IF;
    RAISE NOTICE '-> POSTCHECK 6 OK: Suma de minutos del partido intacta (1980 minutos: 990 + 990).';

    -- POSTCHECK 7: SD Indautxu totalmente protegido e inalterado
    SELECT COUNT(*) INTO v_count_indautxu_stats
    FROM public.match_player_stats
    WHERE rfef_acta_id = 70692427;

    IF v_count_indautxu_stats <> 18 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO 7] Estadísticas del SD Indautxu alteradas (esperado 18, encontrado: %).', v_count_indautxu_stats;
    END IF;
    RAISE NOTICE '-> POSTCHECK 7 OK: SD Indautxu 100%% intacto (18 estadísticas J1 en match_player_stats).';

    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'CORRECCIÓN DEL AUTOGOL COMPLETADA Y VERIFICADA CON ÉXITO';
    RAISE NOTICE '=======================================================';
END $$;
