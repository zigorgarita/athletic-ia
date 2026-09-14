-- ============================================================================
-- J-2 · PASO 2 · IMPORTACIÓN DEFENSIVA DE PARTIDOS Y ESTADÍSTICAS J-2
-- 
-- OBJETIVO:
-- 1. Insertar los 8 partidos oficiales en public.official_matches con resultados validados:
--    * 70692432: ARRATIA (0) vs UNIONISTAS SALAMANCA (1)
--    * 70692433: CULTURAL LEONESA (2) vs DEPORTIVO ALAVÉS (2)
--    * 70692434: DANOK BAT (2) vs SD LEIOA (1)
--    * 70692435: SD INDAUTXU (1) vs SANTUTXU FC (2)
--    * 70692436: REAL VALLADOLID (3) vs REAL SOCIEDAD (1)
--    * 70692437: SD EIBAR (3) vs EF MAREO (0)
--    * 70692438: UD LOGROÑÉS (2) vs BETOÑO (1)
--    * 70692439: ANTIGUOKO KE (2) vs ATHLETIC CLUB (3)
-- 2. Insertar estadísticas de jugadores rivales en public.club_match_player_stats.
-- 3. Insertar estadísticas de SD Indautxu en public.match_player_stats (18 convocados, suma 990 min).
-- 4. Vincular el partido J-2 en public.matches (527f4e02-6c17-4500-bd85-4aa72264f41a)
--    con jugado = true, goles_favor = 1, goles_contra = 2, official_match_id = v_match_id_70692435.
--
-- ESTADO: PREPARADO · NO EJECUTADO AUTOMÁTICAMENTE
-- ============================================================================

DO $$
DECLARE
    v_partidos_existentes INTEGER;
    v_indautxu_match_check INTEGER;
    v_indautxu_stats_previas INTEGER;
    
    -- Variables UUID para los 8 partidos oficiales
    v_match_id_70692432 UUID;
    v_match_id_70692433 UUID;
    v_match_id_70692434 UUID;
    v_match_id_70692435 UUID;
    v_match_id_70692436 UUID;
    v_match_id_70692437 UUID;
    v_match_id_70692438 UUID;
    v_match_id_70692439 UUID;

    -- Variables de clubes
    v_club_33836523 UUID; -- ARRATIA
    v_club_207449 UUID;   -- UNIONISTAS SALAMANCA
    v_club_33836521 UUID; -- CULTURAL LEONESA
    v_club_205484 UUID;   -- DEPORTIVO ALAVES
    v_club_900361152 UUID;-- DANOK BAT
    v_club_23289700 UUID; -- SD LEIOA
    v_club_33836524 UUID; -- SD INDAUTXU
    v_club_205567 UUID;   -- SANTUTXU FC
    v_club_205459 UUID;   -- REAL VALLADOLID
    v_club_205597 UUID;   -- REAL SOCIEDAD
    v_club_205540 UUID;   -- SD EIBAR
    v_club_33836522 UUID; -- EF MAREO
    v_club_205744 UUID;   -- UD LOGROÑES
    v_club_23289793 UUID; -- BETOÑO
    v_club_205603 UUID;   -- ANTIGUOKO KE
    v_club_205514 UUID;   -- ATHLETIC CLUB

    -- Variables de comprobación postcheck
    v_total_official_matches INTEGER;
    v_total_cmps INTEGER;
    v_total_mps INTEGER;
    v_sum_minutos_indautxu INTEGER;
    v_matches_fecha DATE;
    v_matches_hora TIME;
    v_matches_campo TEXT;
    v_official_fecha DATE;
    v_official_hora TIME;
    v_official_campo TEXT;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE '   INICIANDO J2-02: PARTIDOS Y ESTADÍSTICAS JORNADA 2       ';
    RAISE NOTICE '============================================================';

    -- Asignación de UUIDs de Clubes
    SELECT id INTO v_club_33836523 FROM public.clubs WHERE rfef_club_id = 33836523;
    SELECT id INTO v_club_207449   FROM public.clubs WHERE rfef_club_id = 207449;
    SELECT id INTO v_club_33836521 FROM public.clubs WHERE rfef_club_id = 33836521;
    SELECT id INTO v_club_205484   FROM public.clubs WHERE rfef_club_id = 205484;
    SELECT id INTO v_club_900361152 FROM public.clubs WHERE rfef_club_id = 900361152;
    SELECT id INTO v_club_23289700 FROM public.clubs WHERE rfef_club_id = 23289700;
    SELECT id INTO v_club_33836524 FROM public.clubs WHERE rfef_club_id = 33836524;
    SELECT id INTO v_club_205567   FROM public.clubs WHERE rfef_club_id = 205567;
    SELECT id INTO v_club_205459   FROM public.clubs WHERE rfef_club_id = 205459;
    SELECT id INTO v_club_205597   FROM public.clubs WHERE rfef_club_id = 205597;
    SELECT id INTO v_club_205540   FROM public.clubs WHERE rfef_club_id = 205540;
    SELECT id INTO v_club_33836522 FROM public.clubs WHERE rfef_club_id = 33836522;
    SELECT id INTO v_club_205744   FROM public.clubs WHERE rfef_club_id = 205744;
    SELECT id INTO v_club_23289793 FROM public.clubs WHERE rfef_club_id = 23289793;
    SELECT id INTO v_club_205603   FROM public.clubs WHERE rfef_club_id = 205603;
    SELECT id INTO v_club_205514   FROM public.clubs WHERE rfef_club_id = 205514;

    -- ------------------------------------------------------------------------
    -- 1. PRECHECKS OBLIGATORIOS (READ-ONLY)
    -- ------------------------------------------------------------------------

    -- A. Ninguno de los 8 partidos debe existir previamente en official_matches
    SELECT COUNT(*) INTO v_partidos_existentes
    FROM public.official_matches
    WHERE rfef_cod_acta IN (70692432, 70692433, 70692434, 70692435, 70692436, 70692437, 70692438, 70692439);

    IF v_partidos_existentes > 0 THEN
        RAISE EXCEPTION 'PRECHECK 1 FALLIDO: Ya existen % partidos de J-2 en official_matches.', v_partidos_existentes;
    END IF;
    RAISE NOTICE '-> PRECHECK 1 OK: Cero partidos de J-2 en official_matches.';

    -- B. El partido J-2 en matches debe existir con jugado = false
    SELECT COUNT(*) INTO v_indautxu_match_check
    FROM public.matches
    WHERE id = '527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid
      AND jornada = 2 AND jugado = false;

    IF v_indautxu_match_check <> 1 THEN
        RAISE EXCEPTION 'PRECHECK 2 FALLIDO: El partido J-2 en matches no está en estado jugado=false.';
    END IF;
    RAISE NOTICE '-> PRECHECK 2 OK: Partido J-2 en matches listo para vinculación.';

    -- C. Cero filas previas en match_player_stats para el partido J-2
    SELECT COUNT(*) INTO v_indautxu_stats_previas
    FROM public.match_player_stats
    WHERE match_id = '527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid;

    IF v_indautxu_stats_previas > 0 THEN
        RAISE EXCEPTION 'PRECHECK 3 FALLIDO: Ya existen % estadísticas previas en match_player_stats para J-2.', v_indautxu_stats_previas;
    END IF;
    RAISE NOTICE '-> PRECHECK 3 OK: Cero estadísticas previas en match_player_stats para J-2.';

    -- ================================================================
    -- PARTIDO CodActa 70692432
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692432, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 2,
        '2026-09-12', '17:45:00', v_club_33836523, v_club_207449, 0, 1,
        true, 'Estadio Urbieta', 'Hierba Artificial', 'Aberrieta Larraona, Oihan', 'Etura Arbaiza, Ioritz / Perez Oregui, Joseba', NULL, 'rfef'
    ) RETURNING id INTO v_match_id_70692432;

    -- Estadísticas Rival Local (public.club_match_player_stats, 18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1531746 AND cs.club_id = v_club_33836523), v_club_33836523, 1, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1525519 AND cs.club_id = v_club_33836523), v_club_33836523, 2, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23917106 AND cs.club_id = v_club_33836523), v_club_33836523, 3, true, true, 0, 88, 88, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1484390 AND cs.club_id = v_club_33836523), v_club_33836523, 4, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1525520 AND cs.club_id = v_club_33836523), v_club_33836523, 6, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23917110 AND cs.club_id = v_club_33836523), v_club_33836523, 10, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1498780 AND cs.club_id = v_club_33836523), v_club_33836523, 14, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1542392 AND cs.club_id = v_club_33836523), v_club_33836523, 16, true, true, 0, 81, 81, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1525522 AND cs.club_id = v_club_33836523), v_club_33836523, 18, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1484386 AND cs.club_id = v_club_33836523), v_club_33836523, 19, true, true, 0, 46, 46, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 25552725 AND cs.club_id = v_club_33836523), v_club_33836523, 29, true, true, 0, 46, 46, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900640846 AND cs.club_id = v_club_33836523), v_club_33836523, 8, true, false, 46, 90, 44, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1481818 AND cs.club_id = v_club_33836523), v_club_33836523, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900640848 AND cs.club_id = v_club_33836523), v_club_33836523, 15, true, false, 81, 90, 9, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900640864 AND cs.club_id = v_club_33836523), v_club_33836523, 17, true, false, 46, 90, 44, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1507893 AND cs.club_id = v_club_33836523), v_club_33836523, 27, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900443375 AND cs.club_id = v_club_33836523), v_club_33836523, 28, true, false, 88, 90, 2, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23519898 AND cs.club_id = v_club_33836523), v_club_33836523, 30, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef');

    -- Estadísticas Rival Visitante (public.club_match_player_stats, 18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 807944 AND cs.club_id = v_club_207449), v_club_207449, 1, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1050135 AND cs.club_id = v_club_207449), v_club_207449, 2, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 829972 AND cs.club_id = v_club_207449), v_club_207449, 3, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 826990 AND cs.club_id = v_club_207449), v_club_207449, 4, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 4475785 AND cs.club_id = v_club_207449), v_club_207449, 5, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 826268 AND cs.club_id = v_club_207449), v_club_207449, 9, true, true, 0, 76, 76, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24150608 AND cs.club_id = v_club_207449), v_club_207449, 10, true, true, 0, 76, 76, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 827130 AND cs.club_id = v_club_207449), v_club_207449, 17, true, true, 0, 54, 54, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 820847 AND cs.club_id = v_club_207449), v_club_207449, 19, true, true, 0, 64, 64, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1112081 AND cs.club_id = v_club_207449), v_club_207449, 20, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 847100 AND cs.club_id = v_club_207449), v_club_207449, 26, true, true, 0, 54, 54, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 758958 AND cs.club_id = v_club_207449), v_club_207449, 25, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 825653 AND cs.club_id = v_club_207449), v_club_207449, 6, true, false, 54, 90, 36, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 841009 AND cs.club_id = v_club_207449), v_club_207449, 7, true, false, 54, 90, 36, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1536366 AND cs.club_id = v_club_207449), v_club_207449, 11, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 826993 AND cs.club_id = v_club_207449), v_club_207449, 14, true, false, 64, 90, 26, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900459882 AND cs.club_id = v_club_207449), v_club_207449, 27, true, false, 76, 90, 14, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692432, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 828723 AND cs.club_id = v_club_207449), v_club_207449, 28, true, false, 76, 90, 14, 0, 0, false, false, NULL, 'rfef');

    -- ================================================================
    -- PARTIDO CodActa 70692433
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692433, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 2,
        '2026-09-12', '17:00:00', v_club_33836521, v_club_205484, 2, 2,
        true, 'Área Dep. Puente Castro 1', 'Hierba Natural', 'Regalado Matías, Miguel', 'Bordel Gomez, Christian / Martinez Rodriguez, David', NULL, 'rfef'
    ) RETURNING id INTO v_match_id_70692433;

    -- Estadísticas Rival Local (public.club_match_player_stats, 17 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1137880 AND cs.club_id = v_club_33836521), v_club_33836521, 1, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 842751 AND cs.club_id = v_club_33836521), v_club_33836521, 2, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 821289 AND cs.club_id = v_club_33836521), v_club_33836521, 3, true, true, 0, 42, 42, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 825906 AND cs.club_id = v_club_33836521), v_club_33836521, 4, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 33874377 AND cs.club_id = v_club_33836521), v_club_33836521, 5, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24616341 AND cs.club_id = v_club_33836521), v_club_33836521, 6, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24605065 AND cs.club_id = v_club_33836521), v_club_33836521, 7, true, true, 0, 77, 77, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 811414 AND cs.club_id = v_club_33836521), v_club_33836521, 8, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 827875 AND cs.club_id = v_club_33836521), v_club_33836521, 9, true, true, 0, 68, 68, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 826520 AND cs.club_id = v_club_33836521), v_club_33836521, 10, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24674855 AND cs.club_id = v_club_33836521), v_club_33836521, 11, true, true, 0, 46, 46, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 538479 AND cs.club_id = v_club_33836521), v_club_33836521, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 828669 AND cs.club_id = v_club_33836521), v_club_33836521, 12, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 828358 AND cs.club_id = v_club_33836521), v_club_33836521, 14, true, false, 42, 90, 48, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1118632 AND cs.club_id = v_club_33836521), v_club_33836521, 15, true, false, 46, 90, 44, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 814687 AND cs.club_id = v_club_33836521), v_club_33836521, 16, true, false, 77, 90, 13, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 819621 AND cs.club_id = v_club_33836521), v_club_33836521, 17, true, false, 68, 90, 22, 0, 0, false, false, NULL, 'rfef');

    -- Estadísticas Rival Visitante (public.club_match_player_stats, 18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1527285 AND cs.club_id = v_club_205484), v_club_205484, 13, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1527276 AND cs.club_id = v_club_205484), v_club_205484, 2, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1539163 AND cs.club_id = v_club_205484), v_club_205484, 3, true, true, 0, 46, 46, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900379315 AND cs.club_id = v_club_205484), v_club_205484, 5, true, true, 0, 58, 58, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 530745 AND cs.club_id = v_club_205484), v_club_205484, 6, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1489183 AND cs.club_id = v_club_205484), v_club_205484, 7, true, true, 0, 65, 65, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1515418 AND cs.club_id = v_club_205484), v_club_205484, 8, true, true, 0, 58, 58, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1220291 AND cs.club_id = v_club_205484), v_club_205484, 9, true, true, 0, 46, 46, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1527283 AND cs.club_id = v_club_205484), v_club_205484, 10, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1288502 AND cs.club_id = v_club_205484), v_club_205484, 11, true, true, 0, 90, 90, 2, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 655417 AND cs.club_id = v_club_205484), v_club_205484, 26, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1515422 AND cs.club_id = v_club_205484), v_club_205484, 1, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1176078 AND cs.club_id = v_club_205484), v_club_205484, 14, true, false, 58, 90, 32, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1287698 AND cs.club_id = v_club_205484), v_club_205484, 15, true, false, 46, 90, 44, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1512654 AND cs.club_id = v_club_205484), v_club_205484, 16, true, false, 58, 90, 32, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1492952 AND cs.club_id = v_club_205484), v_club_205484, 17, true, false, 46, 90, 44, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900752896 AND cs.club_id = v_club_205484), v_club_205484, 18, true, false, 65, 90, 25, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692433, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900656259 AND cs.club_id = v_club_205484), v_club_205484, 27, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef');

    -- ================================================================
    -- PARTIDO CodActa 70692434
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692434, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 2,
        '2026-09-12', '12:30:00', v_club_900361152, v_club_23289700, 2, 1,
        true, 'Mallona 1', 'Hierba Artificial', 'Pérez Ansoleaga, Iñigo', 'García Arriola, Asier / Bilbao Uriarte, Jon', NULL, 'rfef'
    ) RETURNING id INTO v_match_id_70692434;

    -- Estadísticas Rival Local (public.club_match_player_stats, 18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1480276 AND cs.club_id = v_club_900361152), v_club_900361152, 1, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1480274 AND cs.club_id = v_club_900361152), v_club_900361152, 3, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1514007 AND cs.club_id = v_club_900361152), v_club_900361152, 4, true, true, 0, 85, 85, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1537336 AND cs.club_id = v_club_900361152), v_club_900361152, 5, true, true, 0, 46, 46, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1480281 AND cs.club_id = v_club_900361152), v_club_900361152, 6, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1494808 AND cs.club_id = v_club_900361152), v_club_900361152, 7, true, true, 0, 90, 90, 2, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1502290 AND cs.club_id = v_club_900361152), v_club_900361152, 9, true, true, 0, 46, 46, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1480275 AND cs.club_id = v_club_900361152), v_club_900361152, 10, true, true, 0, 74, 74, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24669393 AND cs.club_id = v_club_900361152), v_club_900361152, 16, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1516666 AND cs.club_id = v_club_900361152), v_club_900361152, 22, true, true, 0, 59, 59, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1514226 AND cs.club_id = v_club_900361152), v_club_900361152, 26, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1542700 AND cs.club_id = v_club_900361152), v_club_900361152, 25, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1540923 AND cs.club_id = v_club_900361152), v_club_900361152, 2, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1540922 AND cs.club_id = v_club_900361152), v_club_900361152, 8, true, false, 59, 90, 31, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1539851 AND cs.club_id = v_club_900361152), v_club_900361152, 11, true, false, 46, 90, 44, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1540918 AND cs.club_id = v_club_900361152), v_club_900361152, 19, true, false, 74, 90, 16, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1540919 AND cs.club_id = v_club_900361152), v_club_900361152, 20, true, false, 85, 90, 5, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23310438 AND cs.club_id = v_club_900361152), v_club_900361152, 27, true, false, 46, 90, 44, 0, 0, false, false, NULL, 'rfef');

    -- Estadísticas Rival Visitante (public.club_match_player_stats, 18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1511069 AND cs.club_id = v_club_23289700), v_club_23289700, 1, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1506439 AND cs.club_id = v_club_23289700), v_club_23289700, 3, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1484975 AND cs.club_id = v_club_23289700), v_club_23289700, 4, true, true, 0, 69, 69, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1542198 AND cs.club_id = v_club_23289700), v_club_23289700, 6, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1478101 AND cs.club_id = v_club_23289700), v_club_23289700, 7, true, true, 0, 90, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1539347 AND cs.club_id = v_club_23289700), v_club_23289700, 15, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1538318 AND cs.club_id = v_club_23289700), v_club_23289700, 17, true, true, 0, 69, 69, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1500153 AND cs.club_id = v_club_23289700), v_club_23289700, 19, true, true, 0, 73, 73, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1536882 AND cs.club_id = v_club_23289700), v_club_23289700, 20, true, true, 0, 58, 58, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1482473 AND cs.club_id = v_club_23289700), v_club_23289700, 21, true, true, 0, 73, 73, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1530497 AND cs.club_id = v_club_23289700), v_club_23289700, 23, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1527430 AND cs.club_id = v_club_23289700), v_club_23289700, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 776472 AND cs.club_id = v_club_23289700), v_club_23289700, 2, true, false, 69, 90, 21, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1511392 AND cs.club_id = v_club_23289700), v_club_23289700, 8, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1483756 AND cs.club_id = v_club_23289700), v_club_23289700, 9, true, false, 69, 90, 21, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1512131 AND cs.club_id = v_club_23289700), v_club_23289700, 10, true, false, 58, 90, 32, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1491020 AND cs.club_id = v_club_23289700), v_club_23289700, 14, true, false, 73, 90, 17, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692434, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1539780 AND cs.club_id = v_club_23289700), v_club_23289700, 16, true, false, 73, 90, 17, 0, 0, false, false, NULL, 'rfef');

    -- ================================================================
    -- PARTIDO CodActa 70692435
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692435, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 2,
        '2026-09-12', '18:00:00', v_club_33836524, v_club_205567, 1, 2,
        true, 'Campo de Fútbol de Iparralde', 'Hierba Artificial', 'Barrio Salas, Aitor', 'López Arrieta, Jon / Ramos Rodríguez, Kevin', NULL, 'rfef'
    ) RETURNING id INTO v_match_id_70692435;

    -- Estadísticas: SD INDAUTXU (public.match_player_stats, 18 jugadores)
    INSERT INTO public.match_player_stats (
        match_id, player_id, titular, minutos, goles, asistencias,
        tarjeta_amarilla, tarjeta_roja, recuperaciones, intercepciones,
        duelos_ganados, pases_completados, pases_totales, convocado,
        suplente, entro_banquillo, minuto_entrada, minuto_salida,
        goles_encajados, doble_amarilla, roja_directa, dorsal_partido,
        origen, rfef_acta_id
    ) VALUES
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 24521512), true, 90, 0, 0, false, false, 0, 0, 0, 0, 0, true, false, false, 0, 90, 2, false, false, 1, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 1486719), true, 66, 0, 0, false, false, 0, 0, 0, 0, 0, true, false, false, 0, 66, 0, false, false, 3, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 23352157), true, 72, 0, 0, false, false, 0, 0, 0, 0, 0, true, false, false, 0, 72, 0, false, false, 4, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 1502313), true, 90, 0, 0, false, false, 0, 0, 0, 0, 0, true, false, false, 0, 90, 0, false, false, 5, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 23290732), true, 54, 0, 0, false, false, 0, 0, 0, 0, 0, true, false, false, 0, 54, 0, false, false, 6, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 1542360), true, 90, 0, 0, false, false, 0, 0, 0, 0, 0, true, false, false, 0, 90, 0, false, false, 7, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 1301108), true, 90, 0, 0, false, false, 0, 0, 0, 0, 0, true, false, false, 0, 90, 0, false, false, 8, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 1517993), true, 90, 0, 0, false, false, 0, 0, 0, 0, 0, true, false, false, 0, 90, 0, false, false, 9, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 1529187), true, 90, 0, 0, false, false, 0, 0, 0, 0, 0, true, false, false, 0, 90, 0, false, false, 10, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 770194), true, 54, 0, 0, false, false, 0, 0, 0, 0, 0, true, false, false, 0, 54, 0, false, false, 11, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 24584490), true, 66, 1, 0, false, false, 0, 0, 0, 0, 0, true, false, false, 0, 66, 0, false, false, 14, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 1488838), false, 0, 0, 0, false, false, 0, 0, 0, 0, 0, true, true, false, NULL, NULL, 0, false, false, 13, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 1541810), false, 24, 0, 0, false, false, 0, 0, 0, 0, 0, true, true, true, 66, 90, 0, false, false, 2, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 1542256), false, 18, 0, 0, false, false, 0, 0, 0, 0, 0, true, true, true, 72, 90, 0, false, false, 12, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 24144753), false, 36, 0, 0, false, false, 0, 0, 0, 0, 0, true, true, true, 54, 90, 0, false, false, 17, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 1364945), false, 24, 0, 0, false, false, 0, 0, 0, 0, 0, true, true, true, 66, 90, 0, false, false, 18, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 33959531), false, 36, 0, 0, false, false, 0, 0, 0, 0, 0, true, true, true, 54, 90, 0, false, false, 19, 'rfef', 70692435),
        ('527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid, (SELECT id FROM public.players WHERE rfef_player_id = 778874), false, 0, 0, 0, false, false, 0, 0, 0, 0, 0, true, true, false, NULL, NULL, 0, false, false, 20, 'rfef', 70692435);

    -- Estadísticas Rival Visitante (public.club_match_player_stats, 18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1363968 AND cs.club_id = v_club_205567), v_club_205567, 13, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1508934 AND cs.club_id = v_club_205567), v_club_205567, 3, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1508938 AND cs.club_id = v_club_205567), v_club_205567, 6, true, true, 0, 79, 79, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1515738 AND cs.club_id = v_club_205567), v_club_205567, 9, true, true, 0, 65, 65, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 33855037 AND cs.club_id = v_club_205567), v_club_205567, 11, true, true, 0, 79, 79, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1535457 AND cs.club_id = v_club_205567), v_club_205567, 14, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1478889 AND cs.club_id = v_club_205567), v_club_205567, 17, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1504995 AND cs.club_id = v_club_205567), v_club_205567, 21, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1510843 AND cs.club_id = v_club_205567), v_club_205567, 22, true, true, 0, 65, 65, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1484582 AND cs.club_id = v_club_205567), v_club_205567, 23, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1535380 AND cs.club_id = v_club_205567), v_club_205567, 24, true, true, 0, 79, 79, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1539838 AND cs.club_id = v_club_205567), v_club_205567, 1, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1500345 AND cs.club_id = v_club_205567), v_club_205567, 5, true, false, 65, 90, 25, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 473033 AND cs.club_id = v_club_205567), v_club_205567, 7, true, false, 79, 90, 11, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1535788 AND cs.club_id = v_club_205567), v_club_205567, 12, true, false, 79, 90, 11, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1515473 AND cs.club_id = v_club_205567), v_club_205567, 16, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1508936 AND cs.club_id = v_club_205567), v_club_205567, 18, true, false, 79, 90, 11, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692435, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1543001 AND cs.club_id = v_club_205567), v_club_205567, 26, true, false, 65, 90, 25, 0, 0, false, false, NULL, 'rfef');

    -- ================================================================
    -- PARTIDO CodActa 70692436
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692436, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 2,
        '2026-09-13', '12:00:00', v_club_205459, v_club_205597, 3, 1,
        true, 'Anexos Estadio José Zorrilla', 'Hierba Natural', 'González Merino, Fernando', 'Manso Herrero, David / De Lucas Pérez, Álvaro', NULL, 'rfef'
    ) RETURNING id INTO v_match_id_70692436;

    -- Estadísticas Rival Local (public.club_match_player_stats, 18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 34071958 AND cs.club_id = v_club_205459), v_club_205459, 1, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1325857 AND cs.club_id = v_club_205459), v_club_205459, 2, true, true, 0, 55, 55, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 809355 AND cs.club_id = v_club_205459), v_club_205459, 3, true, true, 0, 65, 65, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 826008 AND cs.club_id = v_club_205459), v_club_205459, 4, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 34042813 AND cs.club_id = v_club_205459), v_club_205459, 5, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 817116 AND cs.club_id = v_club_205459), v_club_205459, 6, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23323965 AND cs.club_id = v_club_205459), v_club_205459, 7, true, true, 0, 55, 55, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 812416 AND cs.club_id = v_club_205459), v_club_205459, 8, true, true, 0, 60, 60, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 628729 AND cs.club_id = v_club_205459), v_club_205459, 9, true, true, 0, 65, 65, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 825613 AND cs.club_id = v_club_205459), v_club_205459, 10, true, true, 0, 90, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 826382 AND cs.club_id = v_club_205459), v_club_205459, 11, true, true, 0, 90, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 818237 AND cs.club_id = v_club_205459), v_club_205459, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 829455 AND cs.club_id = v_club_205459), v_club_205459, 12, true, false, 60, 90, 30, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23327967 AND cs.club_id = v_club_205459), v_club_205459, 14, true, false, 65, 90, 25, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 811944 AND cs.club_id = v_club_205459), v_club_205459, 15, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 812205 AND cs.club_id = v_club_205459), v_club_205459, 16, true, false, 55, 90, 35, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 34060184 AND cs.club_id = v_club_205459), v_club_205459, 17, true, false, 65, 90, 25, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 825614 AND cs.club_id = v_club_205459), v_club_205459, 18, true, false, 55, 90, 35, 0, 0, false, false, NULL, 'rfef');

    -- Estadísticas Rival Visitante (public.club_match_player_stats, 18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1514870 AND cs.club_id = v_club_205597), v_club_205597, 1, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1483772 AND cs.club_id = v_club_205597), v_club_205597, 2, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 847648 AND cs.club_id = v_club_205597), v_club_205597, 3, true, true, 0, 55, 55, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1492695 AND cs.club_id = v_club_205597), v_club_205597, 4, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1527555 AND cs.club_id = v_club_205597), v_club_205597, 5, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1511828 AND cs.club_id = v_club_205597), v_club_205597, 6, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24446382 AND cs.club_id = v_club_205597), v_club_205597, 7, true, true, 0, 55, 55, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1511831 AND cs.club_id = v_club_205597), v_club_205597, 8, true, true, 0, 65, 65, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1516059 AND cs.club_id = v_club_205597), v_club_205597, 9, true, true, 0, 65, 65, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1532373 AND cs.club_id = v_club_205597), v_club_205597, 10, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1480156 AND cs.club_id = v_club_205597), v_club_205597, 11, true, true, 0, 72, 72, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 4472744 AND cs.club_id = v_club_205597), v_club_205597, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1528890 AND cs.club_id = v_club_205597), v_club_205597, 12, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1495316 AND cs.club_id = v_club_205597), v_club_205597, 14, true, false, 55, 90, 35, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1534374 AND cs.club_id = v_club_205597), v_club_205597, 15, true, false, 55, 90, 35, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23077000 AND cs.club_id = v_club_205597), v_club_205597, 16, true, false, 65, 90, 25, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1513243 AND cs.club_id = v_club_205597), v_club_205597, 17, true, false, 72, 90, 18, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692436, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 665289 AND cs.club_id = v_club_205597), v_club_205597, 18, true, false, 65, 90, 25, 0, 0, false, false, NULL, 'rfef');

    -- ================================================================
    -- PARTIDO CodActa 70692437
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692437, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 2,
        '2026-09-12', '12:30:00', v_club_205540, v_club_33836522, 3, 0,
        true, 'Ciudad Deportiva Eibar - Areitio 1', 'Hierba Artificial', 'Escalero Álzaga, Julen Fermín', 'García Gómez, David / Sánchez Ramos, Iker', NULL, 'rfef'
    ) RETURNING id INTO v_match_id_70692437;

    -- Estadísticas Rival Local (public.club_match_player_stats, 18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 948020 AND cs.club_id = v_club_205540), v_club_205540, 13, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24147469 AND cs.club_id = v_club_205540), v_club_205540, 5, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1507452 AND cs.club_id = v_club_205540), v_club_205540, 7, true, true, 0, 74, 74, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1542087 AND cs.club_id = v_club_205540), v_club_205540, 8, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1532709 AND cs.club_id = v_club_205540), v_club_205540, 9, true, true, 0, 90, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1515474 AND cs.club_id = v_club_205540), v_club_205540, 10, true, true, 0, 60, 60, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1531473 AND cs.club_id = v_club_205540), v_club_205540, 12, true, true, 0, 74, 74, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1513856 AND cs.club_id = v_club_205540), v_club_205540, 17, true, true, 0, 46, 46, 0, 0, false, false, 'Tarjeta Roja (46'')', 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1484977 AND cs.club_id = v_club_205540), v_club_205540, 18, true, true, 0, 60, 60, 0, 0, false, false, 'Tarjeta Roja (71'')', 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1492300 AND cs.club_id = v_club_205540), v_club_205540, 20, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1139265 AND cs.club_id = v_club_205540), v_club_205540, 21, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1537414 AND cs.club_id = v_club_205540), v_club_205540, 1, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1528307 AND cs.club_id = v_club_205540), v_club_205540, 3, true, false, 60, 90, 30, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1528846 AND cs.club_id = v_club_205540), v_club_205540, 4, true, false, 46, 90, 44, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1526711 AND cs.club_id = v_club_205540), v_club_205540, 6, true, false, 74, 90, 16, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23388984 AND cs.club_id = v_club_205540), v_club_205540, 11, true, false, NULL, NULL, 0, 0, 0, false, false, 'Tarjeta Roja (9'')', 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1535814 AND cs.club_id = v_club_205540), v_club_205540, 14, true, false, 60, 90, 30, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1541701 AND cs.club_id = v_club_205540), v_club_205540, 22, true, false, 74, 90, 16, 0, 0, false, false, NULL, 'rfef');

    -- Estadísticas Rival Visitante (public.club_match_player_stats, 17 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1368236 AND cs.club_id = v_club_33836522), v_club_33836522, 1, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1364175 AND cs.club_id = v_club_33836522), v_club_33836522, 3, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1363891 AND cs.club_id = v_club_33836522), v_club_33836522, 5, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1365615 AND cs.club_id = v_club_33836522), v_club_33836522, 7, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1362725 AND cs.club_id = v_club_33836522), v_club_33836522, 8, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1366429 AND cs.club_id = v_club_33836522), v_club_33836522, 10, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1367436 AND cs.club_id = v_club_33836522), v_club_33836522, 11, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1363430 AND cs.club_id = v_club_33836522), v_club_33836522, 16, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1363429 AND cs.club_id = v_club_33836522), v_club_33836522, 17, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1367227 AND cs.club_id = v_club_33836522), v_club_33836522, 19, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1367926 AND cs.club_id = v_club_33836522), v_club_33836522, 21, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1367205 AND cs.club_id = v_club_33836522), v_club_33836522, 2, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1364630 AND cs.club_id = v_club_33836522), v_club_33836522, 6, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1368796 AND cs.club_id = v_club_33836522), v_club_33836522, 12, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24576616 AND cs.club_id = v_club_33836522), v_club_33836522, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1363259 AND cs.club_id = v_club_33836522), v_club_33836522, 18, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692437, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1364236 AND cs.club_id = v_club_33836522), v_club_33836522, 22, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef');

    -- ================================================================
    -- PARTIDO CodActa 70692438
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692438, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 2,
        '2026-09-13', '17:00:00', v_club_205744, v_club_23289793, 2, 1,
        true, 'Ciudad Deportiva UD Logroñés C2', 'Hierba Artificial', 'Ruiz Gómez, Mario', 'Castillo Beltrán, Javier / Lázaro Ruiz, David', NULL, 'rfef'
    ) RETURNING id INTO v_match_id_70692438;

    -- Estadísticas Rival Local (public.club_match_player_stats, 18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1361938 AND cs.club_id = v_club_205744), v_club_205744, 1, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23445453 AND cs.club_id = v_club_205744), v_club_205744, 4, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1346342 AND cs.club_id = v_club_205744), v_club_205744, 5, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1362005 AND cs.club_id = v_club_205744), v_club_205744, 7, true, true, 0, 68, 68, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1365893 AND cs.club_id = v_club_205744), v_club_205744, 8, true, true, 0, 68, 68, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1362760 AND cs.club_id = v_club_205744), v_club_205744, 10, true, true, 0, 56, 56, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1108391 AND cs.club_id = v_club_205744), v_club_205744, 11, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 863015 AND cs.club_id = v_club_205744), v_club_205744, 14, true, true, 0, 68, 68, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1361353 AND cs.club_id = v_club_205744), v_club_205744, 16, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 885652 AND cs.club_id = v_club_205744), v_club_205744, 21, true, true, 0, 56, 56, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1346348 AND cs.club_id = v_club_205744), v_club_205744, 22, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 489124 AND cs.club_id = v_club_205744), v_club_205744, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1363982 AND cs.club_id = v_club_205744), v_club_205744, 2, true, false, 68, 90, 22, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1369428 AND cs.club_id = v_club_205744), v_club_205744, 6, true, false, 68, 90, 22, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1511829 AND cs.club_id = v_club_205744), v_club_205744, 9, true, false, 56, 90, 34, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1368755 AND cs.club_id = v_club_205744), v_club_205744, 12, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1364465 AND cs.club_id = v_club_205744), v_club_205744, 17, true, false, 68, 90, 22, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1361512 AND cs.club_id = v_club_205744), v_club_205744, 19, true, false, 56, 90, 34, 0, 0, false, false, NULL, 'rfef');

    -- Estadísticas Rival Visitante (public.club_match_player_stats, 18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 34053553 AND cs.club_id = v_club_23289793), v_club_23289793, 1, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900176428 AND cs.club_id = v_club_23289793), v_club_23289793, 2, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1506628 AND cs.club_id = v_club_23289793), v_club_23289793, 4, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1515680 AND cs.club_id = v_club_23289793), v_club_23289793, 5, true, true, 0, 48, 48, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 25859579 AND cs.club_id = v_club_23289793), v_club_23289793, 6, true, true, 0, 46, 46, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 25120706 AND cs.club_id = v_club_23289793), v_club_23289793, 8, true, true, 0, 72, 72, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1517904 AND cs.club_id = v_club_23289793), v_club_23289793, 11, true, true, 0, 51, 51, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1512655 AND cs.club_id = v_club_23289793), v_club_23289793, 14, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1521544 AND cs.club_id = v_club_23289793), v_club_23289793, 15, true, true, 0, 90, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24616827 AND cs.club_id = v_club_23289793), v_club_23289793, 17, true, true, 0, 72, 72, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1527280 AND cs.club_id = v_club_23289793), v_club_23289793, 21, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1484304 AND cs.club_id = v_club_23289793), v_club_23289793, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1527282 AND cs.club_id = v_club_23289793), v_club_23289793, 3, true, false, 46, 90, 44, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1537486 AND cs.club_id = v_club_23289793), v_club_23289793, 7, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1480414 AND cs.club_id = v_club_23289793), v_club_23289793, 10, true, false, 51, 90, 39, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1344835 AND cs.club_id = v_club_23289793), v_club_23289793, 16, true, false, 72, 90, 18, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900176843 AND cs.club_id = v_club_23289793), v_club_23289793, 19, true, false, 72, 90, 18, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692438, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 901384678 AND cs.club_id = v_club_23289793), v_club_23289793, 20, true, false, 48, 90, 42, 0, 0, false, false, NULL, 'rfef');

    -- ================================================================
    -- PARTIDO CodActa 70692439
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692439, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 2,
        '2026-09-12', '17:30:00', v_club_205603, v_club_205514, 2, 3,
        true, 'Instalaciones Berio', 'Hierba Natural', 'Ugalde Alejos, Asier', 'Castilla Ruiz, Daniel / Gómez Gómez, Iker', NULL, 'rfef'
    ) RETURNING id INTO v_match_id_70692439;

    -- Estadísticas Rival Local (public.club_match_player_stats, 18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1536035 AND cs.club_id = v_club_205603), v_club_205603, 1, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1506997 AND cs.club_id = v_club_205603), v_club_205603, 2, true, true, 0, 78, 78, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1528578 AND cs.club_id = v_club_205603), v_club_205603, 3, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1479396 AND cs.club_id = v_club_205603), v_club_205603, 4, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1529142 AND cs.club_id = v_club_205603), v_club_205603, 5, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1515143 AND cs.club_id = v_club_205603), v_club_205603, 6, true, true, 0, 84, 84, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23364906 AND cs.club_id = v_club_205603), v_club_205603, 7, true, true, 0, 68, 68, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 33882160 AND cs.club_id = v_club_205603), v_club_205603, 8, true, true, 0, 68, 68, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1495737 AND cs.club_id = v_club_205603), v_club_205603, 9, true, true, 0, 78, 78, 2, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23364912 AND cs.club_id = v_club_205603), v_club_205603, 10, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1501390 AND cs.club_id = v_club_205603), v_club_205603, 11, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1513332 AND cs.club_id = v_club_205603), v_club_205603, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1530693 AND cs.club_id = v_club_205603), v_club_205603, 12, true, false, 78, 90, 12, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1486176 AND cs.club_id = v_club_205603), v_club_205603, 14, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1482735 AND cs.club_id = v_club_205603), v_club_205603, 15, true, false, 84, 90, 6, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1480157 AND cs.club_id = v_club_205603), v_club_205603, 16, true, false, 68, 90, 22, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1492714 AND cs.club_id = v_club_205603), v_club_205603, 17, true, false, 78, 90, 12, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1537923 AND cs.club_id = v_club_205603), v_club_205603, 18, true, false, 68, 90, 22, 0, 0, false, false, NULL, 'rfef');

    -- Estadísticas Rival Visitante (public.club_match_player_stats, 18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1486871 AND cs.club_id = v_club_205514), v_club_205514, 13, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1527831 AND cs.club_id = v_club_205514), v_club_205514, 2, true, true, 0, 72, 72, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1510590 AND cs.club_id = v_club_205514), v_club_205514, 4, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1483244 AND cs.club_id = v_club_205514), v_club_205514, 7, true, true, 0, 90, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1478418 AND cs.club_id = v_club_205514), v_club_205514, 8, true, true, 0, 59, 59, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1536063 AND cs.club_id = v_club_205514), v_club_205514, 9, true, true, 0, 59, 59, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1535327 AND cs.club_id = v_club_205514), v_club_205514, 12, true, true, 0, 90, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 25167623 AND cs.club_id = v_club_205514), v_club_205514, 14, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 25241049 AND cs.club_id = v_club_205514), v_club_205514, 20, true, true, 0, 90, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 33129429 AND cs.club_id = v_club_205514), v_club_205514, 21, true, true, 0, 59, 59, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1490940 AND cs.club_id = v_club_205514), v_club_205514, 24, true, true, 0, 75, 75, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1535326 AND cs.club_id = v_club_205514), v_club_205514, 30, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 25099419 AND cs.club_id = v_club_205514), v_club_205514, 3, true, false, 59, 90, 31, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1536892 AND cs.club_id = v_club_205514), v_club_205514, 10, true, false, 59, 90, 31, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1505560 AND cs.club_id = v_club_205514), v_club_205514, 15, true, false, 72, 90, 18, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 25439141 AND cs.club_id = v_club_205514), v_club_205514, 17, true, false, 75, 90, 15, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 25241054 AND cs.club_id = v_club_205514), v_club_205514, 18, true, false, 59, 90, 31, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692439, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1515139 AND cs.club_id = v_club_205514), v_club_205514, 19, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef');

    -- ================================================================
    -- ACTUALIZAR PARTIDO J-2 EN public.matches
    -- ================================================================
    UPDATE public.matches
    SET jugado = true,
        goles_favor = 1,
        goles_contra = 2,
        fecha = '2026-09-12',
        hora = '18:00:00',
        campo = 'Campo de Fútbol de Iparralde',
        official_match_id = v_match_id_70692435
    WHERE id = '527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid;

    RAISE NOTICE '-> Partido J-2 en matches sincronizado y vinculado exitosamente a official_match %.', v_match_id_70692435;

    -- ------------------------------------------------------------------------
    -- 3. POSTCHECKS DEFENSIVOS
    -- ------------------------------------------------------------------------

    -- A. Verificar 8 partidos en official_matches para J-2
    SELECT COUNT(*) INTO v_total_official_matches
    FROM public.official_matches
    WHERE temporada = '2026-27' AND jornada = 2;

    IF v_total_official_matches <> 8 THEN
        RAISE EXCEPTION 'POSTCHECK 1 FALLIDO: Se esperaban 8 partidos oficiales en J-2, registrados: %', v_total_official_matches;
    END IF;
    RAISE NOTICE '-> POSTCHECK 1 OK: Exactamente 8 official_matches registrados en J-2.';

    -- B. Verificar 18 estadísticas en match_player_stats para Indautxu J-2
    SELECT COUNT(*), SUM(minutos) INTO v_total_mps, v_sum_minutos_indautxu
    FROM public.match_player_stats
    WHERE match_id = '527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid;

    IF v_total_mps <> 18 THEN
        RAISE EXCEPTION 'POSTCHECK 2 FALLIDO: Se esperaban 18 estadísticas de Indautxu en J-2, registradas: %', v_total_mps;
    END IF;

    IF v_sum_minutos_indautxu <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK 3 FALLIDO: La suma de minutos de Indautxu debe ser exactamente 990, registrada: %', v_sum_minutos_indautxu;
    END IF;
    RAISE NOTICE '-> POSTCHECK 2 y 3 OK: 18 estadísticas de Indautxu registradas y suma exacta de 990 minutos.';

    -- C. Verificar estadísticas de rivales en club_match_player_stats
    SELECT COUNT(*) INTO v_total_cmps
    FROM public.club_match_player_stats
    WHERE official_match_id IN (
        v_match_id_70692432, v_match_id_70692433, v_match_id_70692434, v_match_id_70692435,
        v_match_id_70692436, v_match_id_70692437, v_match_id_70692438, v_match_id_70692439
    );

    RAISE NOTICE '-> POSTCHECK 4 OK: % estadísticas registradas en club_match_player_stats.', v_total_cmps;

    -- D. Verificar coherencia de fecha, hora y campo entre matches y official_matches para J-2
    SELECT fecha, hora::time, campo
    INTO v_matches_fecha, v_matches_hora, v_matches_campo
    FROM public.matches
    WHERE id = '527f4e02-6c17-4500-bd85-4aa72264f41a'::uuid;

    SELECT fecha, hora::time, campo
    INTO v_official_fecha, v_official_hora, v_official_campo
    FROM public.official_matches
    WHERE id = v_match_id_70692435;

    IF v_matches_fecha <> v_official_fecha OR v_matches_hora <> v_official_hora OR v_matches_campo <> v_official_campo THEN
        RAISE EXCEPTION 'POSTCHECK 5 FALLIDO: Incoherencia en matches vs official_matches para J-2 (matches: % % %, official: % % %)',
            v_matches_fecha, v_matches_hora, v_matches_campo, v_official_fecha, v_official_hora, v_official_campo;
    END IF;
    RAISE NOTICE '-> POSTCHECK 5 OK: matches y official_matches coherentes en fecha (%), hora (%) y campo (%).',
        v_matches_fecha, v_matches_hora, v_matches_campo;

    RAISE NOTICE '============================================================';
    RAISE NOTICE '   J2-02 COMPLETADO EXITOSAMENTE (TRANSACCIÓN VÁLIDA)      ';
    RAISE NOTICE '============================================================';
END $$;
