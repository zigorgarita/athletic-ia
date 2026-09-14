-- ============================================================================
-- J-2 · PASO 1 · MIGRACIÓN DEFENSIVA DE IDENTIDADES Y PLANTILLAS J-2
-- 
-- OBJETIVO:
-- 1. Vincular rfef_player_id a los 2 debutantes de SD INDAUTXU en public.players:
--    * Aingeru Nietcho Sandonis (UUID: '250219e4-d31f-4385-a1e9-7f9cff685988' -> 33959531)
--    * Kevin Loaiza Riascos (UUID: '114822ae-2dd6-40e4-a261-4cef39a623a3' -> 778874)
-- 2. Vincular rfef_player_id a los 2 debutantes de ATHLETIC CLUB en public.club_players:
--    * Alexander Conde Prieto (UUID: 'd74d2adf-e14f-4fef-ac01-8af99644a63a' -> 1478418)
--    * Paul Pumarejo Gutiérrez (UUID: '969615d0-cd46-4f52-86ec-8f2890675879' -> 1536063)
-- 3. Insertar las 29 nuevas altas de futbolistas rivales en public.club_players.
-- 4. Blindaje: Cero escrituras en fotos de Indautxu ni Athletic (se conservan al 100%).
--
-- ESTADO: PREPARADO · NO EJECUTADO AUTOMÁTICAMENTE
-- ============================================================================

DO $$
DECLARE
    v_conflicto_previo   INTEGER;
    v_indautxu_pre_count INTEGER;
    v_athletic_pre_count INTEGER;
    v_total_insertados   INTEGER;
    -- Postchecks individuales por jugador (evita el bug de ROW_COUNT = solo último UPDATE)
    v_check_nietcho      INTEGER;
    v_check_loaiza       INTEGER;
    v_check_conde        INTEGER;
    v_check_pumarejo     INTEGER;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE '   INICIANDO J2-01: IDENTIDADES Y PLANTILLAS JORNADA 2      ';
    RAISE NOTICE '============================================================';

    -- ------------------------------------------------------------------------
    -- 1. PRECHECKS DEFENSIVOS OBLIGATORIOS (READ-ONLY)
    -- ------------------------------------------------------------------------

    -- A. Ninguno de los 29 nuevos rfef_player_id debe existir en club_players
    SELECT COUNT(*) INTO v_conflicto_previo
    FROM public.club_players
    WHERE rfef_player_id IN (
        1525522, 900640864, 900443375, 1536366, 811414, 828669, 530745, 1539851, 1540919, 1491020, 1508934, 1515473, 1508936, 829455, 825614, 1514870, 847648, 1527555, 1511831, 1495316, 665289, 1531473, 1363982, 1364465, 1361512, 1527282, 1480414, 23364912, 1486176
    );

    IF v_conflicto_previo > 0 THEN
        RAISE EXCEPTION 'PRECHECK 1 FALLIDO: Se detectaron % colisiones previas en club_players.', v_conflicto_previo;
    END IF;
    RAISE NOTICE '-> PRECHECK 1 OK: Cero colisiones de los 29 rfef_player_id en club_players.';

    -- B. Nietcho y Loaiza deben existir en public.players con rfef_player_id NULL
    SELECT COUNT(*) INTO v_indautxu_pre_count
    FROM public.players
    WHERE id IN ('250219e4-d31f-4385-a1e9-7f9cff685988'::uuid, '114822ae-2dd6-40e4-a261-4cef39a623a3'::uuid)
      AND rfef_player_id IS NULL;

    IF v_indautxu_pre_count <> 2 THEN
        RAISE EXCEPTION 'PRECHECK 2 FALLIDO: Aingeru Nietcho o Kevin Loaiza no están en estado NULL previo en players (encontrados: %).', v_indautxu_pre_count;
    END IF;
    RAISE NOTICE '-> PRECHECK 2 OK: Nietcho y Loaiza listos en players para vinculación.';

    -- C. Alexander Conde y Paul Pumarejo deben existir en club_players con rfef_player_id NULL
    SELECT COUNT(*) INTO v_athletic_pre_count
    FROM public.club_players
    WHERE id IN ('d74d2adf-e14f-4fef-ac01-8af99644a63a'::uuid, '969615d0-cd46-4f52-86ec-8f2890675879'::uuid)
      AND rfef_player_id IS NULL;

    IF v_athletic_pre_count <> 2 THEN
        RAISE EXCEPTION 'PRECHECK 3 FALLIDO: Conde o Pumarejo no están en estado NULL previo en club_players (encontrados: %).', v_athletic_pre_count;
    END IF;
    RAISE NOTICE '-> PRECHECK 3 OK: Conde y Pumarejo listos en club_players para vinculación.';

    -- ------------------------------------------------------------------------
    -- 2. VINCULACIONES DE IDENTIDADES EXISTENTES
    -- ------------------------------------------------------------------------

    -- A. SD Indautxu (public.players)
    UPDATE public.players
    SET rfef_player_id = 33959531
    WHERE id = '250219e4-d31f-4385-a1e9-7f9cff685988'::uuid AND rfef_player_id IS NULL;

    UPDATE public.players
    SET rfef_player_id = 778874
    WHERE id = '114822ae-2dd6-40e4-a261-4cef39a623a3'::uuid AND rfef_player_id IS NULL;

    -- B. Athletic Club (public.club_players)
    UPDATE public.club_players
    SET rfef_player_id = 1478418
    WHERE id = 'd74d2adf-e14f-4fef-ac01-8af99644a63a'::uuid AND rfef_player_id IS NULL;

    UPDATE public.club_players
    SET rfef_player_id = 1536063
    WHERE id = '969615d0-cd46-4f52-86ec-8f2890675879'::uuid AND rfef_player_id IS NULL;

    RAISE NOTICE '-> Vinculaciones de identidades completadas. Verificando estado real en BD...';

    -- ------------------------------------------------------------------------
    -- 3. INSERCIÓN DE LAS 29 NUEVAS ALTAS RIVALES
    -- ------------------------------------------------------------------------
    INSERT INTO public.club_players (
        club_season_id, nombre, dorsal, rfef_player_id, origen, foto_url
    ) VALUES
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'DIEZ URUTXURTU, MARKEL', NULL, 1525522, 'rfef', NULL),
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'URUTXURTU JORDAN, UNAX', NULL, 900640864, 'rfef', NULL),
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'INCERTIS MARTINEZ, BEÑAT', NULL, 900443375, 'rfef', NULL),
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'NAOUSSI SANCHEZ, ALEJANDRO TAMO', NULL, 1536366, 'rfef', NULL),
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'Fontanillo Sahagun, Mauro', NULL, 811414, 'rfef', NULL),
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'ALÁEZ DE LA MORAL, OLIVER', NULL, 828669, 'rfef', NULL),
        ('5545c49b-0756-4408-9412-e19ce28b75d1'::uuid, 'VELILLES MAGHOUZA, LUIS', NULL, 530745, 'rfef', NULL),
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'IGLESIAS ELORDI, AIMAR', NULL, 1539851, 'rfef', NULL),
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'MARTINEZ GALAN, ANTXON', NULL, 1540919, 'rfef', NULL),
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'MIMENZA SUAREZ, AXULAR', NULL, 1491020, 'rfef', NULL),
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'QUIROGA FERNANDEZ, AIMAR', NULL, 1508934, 'rfef', NULL),
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'CONTRERAS MUÑOZ, LUKEN', NULL, 1515473, 'rfef', NULL),
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'SIMON PAREDES, IGNACIO', NULL, 1508936, 'rfef', NULL),
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'PEREZ ALMARAZ, JORGE', NULL, 829455, 'rfef', NULL),
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'REDONDO VELASCO, MIGUEL', NULL, 825614, 'rfef', NULL),
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'DIEZ JORNA, HUGO', NULL, 1514870, 'rfef', NULL),
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'GARCIA DE LA CRUZ, RODRIGO', NULL, 847648, 'rfef', NULL),
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'MICHELENA ZUBIETA, KEMEN', NULL, 1527555, 'rfef', NULL),
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'GALPARSORO BARANDIARAN, IBAI', NULL, 1511831, 'rfef', NULL),
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'ROMERA NUÑEZ, IAN', NULL, 1495316, 'rfef', NULL),
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'MARGOLLES ARIAS, PELAYO', NULL, 665289, 'rfef', NULL),
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'ZUBIAGA ILARDUIA, OIHAN', NULL, 1531473, 'rfef', NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0'::uuid, 'MARTINEZ SANZ, IKER', NULL, 1363982, 'rfef', NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0'::uuid, 'CARBONERAS ROYO, DANIEL', NULL, 1364465, 'rfef', NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0'::uuid, 'LOPEZ PEREZ, OIER', NULL, 1361512, 'rfef', NULL),
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'RUIZ DE EGUINO MONTERO, MIKEL', NULL, 1527282, 'rfef', NULL),
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'CASADO LOPEZ, UNAI', NULL, 1480414, 'rfef', NULL),
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'ENPARANTZA ALUSTIZA, HAIZE', NULL, 23364912, 'rfef', NULL),
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'GARMENDIA LOPEZ, ARATZ', NULL, 1486176, 'rfef', NULL);

    GET DIAGNOSTICS v_total_insertados = ROW_COUNT;
    RAISE NOTICE '-> Inserciones: % nuevas altas rivales creadas en club_players.', v_total_insertados;

    -- ------------------------------------------------------------------------
    -- 4. POSTCHECKS DE INTEGRIDAD
    -- ------------------------------------------------------------------------

    -- POSTCHECK 1: exactamente 29 inserciones rivales
    IF v_total_insertados <> 29 THEN
        RAISE EXCEPTION 'POSTCHECK 1 FALLIDO: Se esperaban 29 inserciones, se registraron: %', v_total_insertados;
    END IF;
    RAISE NOTICE '-> POSTCHECK 1 OK: 29 altas rivales insertadas correctamente.';

    -- POSTCHECK 2: Aingeru Nietcho tiene rfef_player_id=33959531
    SELECT COUNT(*) INTO v_check_nietcho
    FROM public.players
    WHERE id = '250219e4-d31f-4385-a1e9-7f9cff685988'::uuid
      AND rfef_player_id = 33959531;
    IF v_check_nietcho <> 1 THEN
        RAISE EXCEPTION 'POSTCHECK 2 FALLIDO: Aingeru Nietcho no tiene rfef_player_id=33959531 en players (filas halladas: %).', v_check_nietcho;
    END IF;
    RAISE NOTICE '-> POSTCHECK 2 OK: Aingeru Nietcho vinculado correctamente (rfef_player_id=33959531).';

    -- POSTCHECK 3: Kevin Loaiza tiene rfef_player_id=778874
    SELECT COUNT(*) INTO v_check_loaiza
    FROM public.players
    WHERE id = '114822ae-2dd6-40e4-a261-4cef39a623a3'::uuid
      AND rfef_player_id = 778874;
    IF v_check_loaiza <> 1 THEN
        RAISE EXCEPTION 'POSTCHECK 3 FALLIDO: Kevin Loaiza no tiene rfef_player_id=778874 en players (filas halladas: %).', v_check_loaiza;
    END IF;
    RAISE NOTICE '-> POSTCHECK 3 OK: Kevin Loaiza vinculado correctamente (rfef_player_id=778874).';

    -- POSTCHECK 4: Alexander Conde tiene rfef_player_id=1478418
    SELECT COUNT(*) INTO v_check_conde
    FROM public.club_players
    WHERE id = 'd74d2adf-e14f-4fef-ac01-8af99644a63a'::uuid
      AND rfef_player_id = 1478418;
    IF v_check_conde <> 1 THEN
        RAISE EXCEPTION 'POSTCHECK 4 FALLIDO: Alexander Conde no tiene rfef_player_id=1478418 en club_players (filas halladas: %).', v_check_conde;
    END IF;
    RAISE NOTICE '-> POSTCHECK 4 OK: Alexander Conde vinculado correctamente (rfef_player_id=1478418).';

    -- POSTCHECK 5: Paul Pumarejo tiene rfef_player_id=1536063
    SELECT COUNT(*) INTO v_check_pumarejo
    FROM public.club_players
    WHERE id = '969615d0-cd46-4f52-86ec-8f2890675879'::uuid
      AND rfef_player_id = 1536063;
    IF v_check_pumarejo <> 1 THEN
        RAISE EXCEPTION 'POSTCHECK 5 FALLIDO: Paul Pumarejo no tiene rfef_player_id=1536063 en club_players (filas halladas: %).', v_check_pumarejo;
    END IF;
    RAISE NOTICE '-> POSTCHECK 5 OK: Paul Pumarejo vinculado correctamente (rfef_player_id=1536063).';

    RAISE NOTICE '============================================================';
    RAISE NOTICE '   J2-01 COMPLETADO EXITOSAMENTE (TRANSACCIÓN VÁLIDA)      ';
    RAISE NOTICE '============================================================';
END $$;
