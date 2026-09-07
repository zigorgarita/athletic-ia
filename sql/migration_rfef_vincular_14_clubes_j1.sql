-- ============================================================================
-- RFEF · J1-C · VINCULACIÓN DEFENSIVA DE LOS 14 CLUBES FEDERATIVOS
-- 
-- OBJETIVO:
-- 1. Crear identidad federativa técnica de SD INDAUTXU en clubs (tipo = 'PROPIO', rfef_club_id = 33836524).
-- 2. Vincular exclusivamente rfef_club_id a los 13 rivales existentes de División de Honor Juvenil G2.
-- 3. Respetar estrictamente a ATHLETIC CLUB (205514) y UD LOGROÑES (205744) ya vinculados.
-- 4. NO crear club_seasons para Indautxu.
-- 5. NO crear jugadores en club_players.
-- 6. ANÁLISIS PROPIO: NI TOCAR (players, matches, evaluaciones, etc. 100% aislados).
--
-- CARACTERÍSTICAS:
-- - Transaccional y atómico (DO block en PostgreSQL).
-- - Prechecks exhaustivos (valida UUIDs, estados previos, conflictos de IDs).
-- - Postchecks obligatorios (16 clubes, 15 LIGA, 1 PROPIO, 16 RFEF IDs únicos).
-- - Rollback automático ante cualquier discrepancia.
--
-- ESTADO: PREPARADO · NO EJECUTADO
-- ============================================================================

DO $$
DECLARE
    v_total_previo INTEGER;
    v_ath_rfef INTEGER;
    v_log_rfef INTEGER;
    v_rivales_encontrados INTEGER;
    v_conflicto_rfef INTEGER;
    v_indautxu_previo INTEGER;
    
    -- Variables para Postchecks
    v_total_post INTEGER;
    v_total_liga INTEGER;
    v_total_propio INTEGER;
    v_total_con_rfef INTEGER;
    v_rfef_unicos INTEGER;
    v_indautxu_post_tipo TEXT;
    v_indautxu_post_rfef INTEGER;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE '   RFEF · J1-C · INICIANDO TRANSACCIÓN DEFENSIVA DE CLUBES   ';
    RAISE NOTICE '============================================================';

    -- ------------------------------------------------------------------------
    -- 1. PRECHECKS OBLIGATORIOS (READ-ONLY PREVIOS)
    -- ------------------------------------------------------------------------

    -- A. Verificar total previo de clubes (debe ser exactamente 15)
    SELECT COUNT(*) INTO v_total_previo FROM public.clubs;
    IF v_total_previo <> 15 THEN
        RAISE EXCEPTION '[PRECHECK FALLIDO] Se esperaban exactamente 15 clubes en la tabla clubs, pero hay %', v_total_previo;
    END IF;

    -- B. Verificar que Athletic Club y UD Logroñés están correctamente vinculados
    SELECT rfef_club_id INTO v_ath_rfef FROM public.clubs WHERE id = 'f14fbbca-81f4-4ee3-b818-e1e41827454b' AND nombre = 'ATHLETIC CLUB';
    IF v_ath_rfef IS DISTINCT FROM 205514 THEN
        RAISE EXCEPTION '[PRECHECK FALLIDO] Athletic Club no tiene rfef_club_id = 205514 (actual: %)', v_ath_rfef;
    END IF;

    SELECT rfef_club_id INTO v_log_rfef FROM public.clubs WHERE id = '89203a30-4e2d-4cd4-83d5-a0a745140609' AND nombre = 'UD LOGROÑES';
    IF v_log_rfef IS DISTINCT FROM 205744 THEN
        RAISE EXCEPTION '[PRECHECK FALLIDO] UD Logroñés no tiene rfef_club_id = 205744 (actual: %)', v_log_rfef;
    END IF;

    -- C. Verificar que existen exactamente los 13 UUIDs de rivales esperados
    SELECT COUNT(*) INTO v_rivales_encontrados
    FROM public.clubs
    WHERE id IN (
        '9a76a56a-3195-4b4b-9ff0-054731d6dda8', -- SD LEIOA
        'cb701fe7-be63-4540-85b6-9296a165a424', -- CULTURAL LEONESA
        '5ed38a15-75db-4752-8706-634b92d898b5', -- DEPORTIVO ALAVES
        'c4e8af5c-bc98-4c5d-9751-c6c54b502422', -- ARRATIA
        'de9fd8d8-04fa-4c19-ac29-c2e41352b375', -- SANTUTXU FC
        'a764b115-09dd-4fbd-be05-c7d8f36a54bc', -- DANOK BAT
        'aa8de564-c6cb-4689-9416-dbffb9c5bf56', -- EF MAREO
        'e686b482-b4c2-4ed0-acf2-3bded5585c4c', -- REAL VALLADOLID
        'b66776ce-a334-4d59-998d-f8726fea9dce', -- BETOÑO
        '9b131d39-b143-488b-851d-a55c140c1396', -- SD EIBAR
        '8af137d7-ed20-4a9e-aebc-3a515b093d26', -- UNIONISTAS SALAMANCA
        '7534c39f-8b17-47e2-8dd8-b3f238ed9ace', -- ANTIGUOKO KE
        'a823e75c-2246-4b19-9dd1-89ab199ebe38'  -- REAL SOCIEDAD
    ) AND tipo = 'LIGA';

    IF v_rivales_encontrados <> 13 THEN
        RAISE EXCEPTION '[PRECHECK FALLIDO] Se esperaban 13 rivales específicos con tipo LIGA, pero se encontraron %', v_rivales_encontrados;
    END IF;

    -- D. Verificar que ninguno de los 13 rivales tiene un rfef_club_id contradictorio
    SELECT COUNT(*) INTO v_conflicto_rfef
    FROM public.clubs
    WHERE id IN (
        '9a76a56a-3195-4b4b-9ff0-054731d6dda8',
        'cb701fe7-be63-4540-85b6-9296a165a424',
        '5ed38a15-75db-4752-8706-634b92d898b5',
        'c4e8af5c-bc98-4c5d-9751-c6c54b502422',
        'de9fd8d8-04fa-4c19-ac29-c2e41352b375',
        'a764b115-09dd-4fbd-be05-c7d8f36a54bc',
        'aa8de564-c6cb-4689-9416-dbffb9c5bf56',
        'e686b482-b4c2-4ed0-acf2-3bded5585c4c',
        'b66776ce-a334-4d59-998d-f8726fea9dce',
        '9b131d39-b143-488b-851d-a55c140c1396',
        '8af137d7-ed20-4a9e-aebc-3a515b093d26',
        '7534c39f-8b17-47e2-8dd8-b3f238ed9ace',
        'a823e75c-2246-4b19-9dd1-89ab199ebe38'
    ) AND rfef_club_id IS NOT NULL;

    IF v_conflicto_rfef > 0 THEN
        RAISE EXCEPTION '[PRECHECK FALLIDO] Hay % rival(es) de los 13 que ya tienen asignado un rfef_club_id no nulo', v_conflicto_rfef;
    END IF;

    -- E. Verificar que ninguno de los 14 IDs RFEF está ya asignado a otro club
    SELECT COUNT(*) INTO v_conflicto_rfef
    FROM public.clubs
    WHERE rfef_club_id IN (
        23289700, 33836521, 205484, 33836523, 205567,
        900361152, 33836522, 205459, 23289793, 205540,
        207449, 205603, 205597, 33836524
    );

    IF v_conflicto_rfef > 0 THEN
        RAISE EXCEPTION '[PRECHECK FALLIDO] Uno o más de los 14 rfef_club_id a asignar ya están ocupados en la tabla clubs';
    END IF;

    -- F. Verificar que NO existe previa identidad PROPIO ni SD Indautxu
    SELECT COUNT(*) INTO v_indautxu_previo
    FROM public.clubs
    WHERE tipo = 'PROPIO' OR UPPER(nombre) LIKE '%INDAUTXU%';

    IF v_indautxu_previo > 0 THEN
        RAISE EXCEPTION '[PRECHECK FALLIDO] Ya existe un registro con tipo PROPIO o nombre INDAUTXU en clubs';
    END IF;

    RAISE NOTICE '[PRECHECKS OK] Todos los prechecks han sido validados exitosamente.';

    -- ------------------------------------------------------------------------
    -- 2. OPERACIÓN A: CREAR IDENTIDAD FEDERATIVA TÉCNICA DE SD INDAUTXU
    -- ------------------------------------------------------------------------
    RAISE NOTICE 'Creando identidad técnica de SD INDAUTXU en clubs (tipo = PROPIO)...';
    
    INSERT INTO public.clubs (
        id,
        nombre,
        nombre_corto,
        tipo,
        rfef_club_id,
        escudo_url,
        ciudad,
        provincia,
        comunidad_autonoma
    ) VALUES (
        '10000000-0000-0000-0000-000000000001'::uuid, -- UUID determinista reservado para club propio federativo
        'SD INDAUTXU',
        'INDAUTXU',
        'PROPIO',
        33836524,
        '/escudo.jpg',
        'Bilbao',
        'Bizkaia',
        'País Vasco'
    );

    -- ------------------------------------------------------------------------
    -- 3. OPERACIÓN B: VINCULAR RFEF_CLUB_ID A LOS 13 RIVALES EXISTENTES
    -- ------------------------------------------------------------------------
    RAISE NOTICE 'Vinculando rfef_club_id a los 13 rivales existentes...';

    -- 1. SD Leioa
    UPDATE public.clubs
    SET rfef_club_id = 23289700
    WHERE id = '9a76a56a-3195-4b4b-9ff0-054731d6dda8' AND nombre = 'SD LEIOA';

    -- 2. Cultural Leonesa
    UPDATE public.clubs
    SET rfef_club_id = 33836521
    WHERE id = 'cb701fe7-be63-4540-85b6-9296a165a424' AND nombre = 'CULTURAL LEONESA';

    -- 3. Deportivo Alavés
    UPDATE public.clubs
    SET rfef_club_id = 205484
    WHERE id = '5ed38a15-75db-4752-8706-634b92d898b5' AND nombre = 'DEPORTIVO ALAVES';

    -- 4. Arratia
    UPDATE public.clubs
    SET rfef_club_id = 33836523
    WHERE id = 'c4e8af5c-bc98-4c5d-9751-c6c54b502422' AND nombre = 'ARRATIA';

    -- 5. Santutxu FC
    UPDATE public.clubs
    SET rfef_club_id = 205567
    WHERE id = 'de9fd8d8-04fa-4c19-ac29-c2e41352b375' AND nombre = 'SANTUTXU FC';

    -- 6. Danok Bat
    UPDATE public.clubs
    SET rfef_club_id = 900361152
    WHERE id = 'a764b115-09dd-4fbd-be05-c7d8f36a54bc' AND nombre = 'DANOK BAT';

    -- 7. EF Mareo
    UPDATE public.clubs
    SET rfef_club_id = 33836522
    WHERE id = 'aa8de564-c6cb-4689-9416-dbffb9c5bf56' AND nombre = 'EF MAREO';

    -- 8. Real Valladolid
    UPDATE public.clubs
    SET rfef_club_id = 205459
    WHERE id = 'e686b482-b4c2-4ed0-acf2-3bded5585c4c' AND nombre = 'REAL VALLADOLID';

    -- 9. Betoño
    UPDATE public.clubs
    SET rfef_club_id = 23289793
    WHERE id = 'b66776ce-a334-4d59-998d-f8726fea9dce' AND nombre = 'BETOÑO';

    -- 10. SD Eibar
    UPDATE public.clubs
    SET rfef_club_id = 205540
    WHERE id = '9b131d39-b143-488b-851d-a55c140c1396' AND nombre = 'SD EIBAR';

    -- 11. Unionistas Salamanca
    UPDATE public.clubs
    SET rfef_club_id = 207449
    WHERE id = '8af137d7-ed20-4a9e-aebc-3a515b093d26' AND nombre = 'UNIONISTAS SALAMANCA';

    -- 12. Antiguoko KE
    UPDATE public.clubs
    SET rfef_club_id = 205603
    WHERE id = '7534c39f-8b17-47e2-8dd8-b3f238ed9ace' AND nombre = 'ANTIGUOKO KE';

    -- 13. Real Sociedad
    UPDATE public.clubs
    SET rfef_club_id = 205597
    WHERE id = 'a823e75c-2246-4b19-9dd1-89ab199ebe38' AND nombre = 'REAL SOCIEDAD';

    -- ------------------------------------------------------------------------
    -- 4. POSTCHECKS OBLIGATORIOS (VERIFICACIÓN DE INTEGRIDAD TRAS ESCRITURA)
    -- ------------------------------------------------------------------------
    RAISE NOTICE 'Ejecutando postchecks de integridad...';

    -- A. Total de clubes debe ser exactamente 16
    SELECT COUNT(*) INTO v_total_post FROM public.clubs;
    IF v_total_post <> 16 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Total de clubes tras operación = % (esperado: 16)', v_total_post;
    END IF;

    -- B. Exactamente 15 de tipo LIGA
    SELECT COUNT(*) INTO v_total_liga FROM public.clubs WHERE tipo = 'LIGA';
    IF v_total_liga <> 15 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Clubes con tipo LIGA = % (esperado: 15)', v_total_liga;
    END IF;

    -- C. Exactamente 1 de tipo PROPIO
    SELECT COUNT(*) INTO v_total_propio FROM public.clubs WHERE tipo = 'PROPIO';
    IF v_total_propio <> 1 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Clubes con tipo PROPIO = % (esperado: 1)', v_total_propio;
    END IF;

    -- D. Todos los 16 clubes deben tener rfef_club_id asignado y único
    SELECT COUNT(*) INTO v_total_con_rfef FROM public.clubs WHERE rfef_club_id IS NOT NULL;
    IF v_total_con_rfef <> 16 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Clubes con rfef_club_id no nulo = % (esperado: 16)', v_total_con_rfef;
    END IF;

    SELECT COUNT(DISTINCT rfef_club_id) INTO v_rfef_unicos FROM public.clubs WHERE rfef_club_id IS NOT NULL;
    IF v_rfef_unicos <> 16 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] IDs RFEF únicos = % (esperado: 16)', v_rfef_unicos;
    END IF;

    -- E. Comprobar que SD INDAUTXU tiene los valores esperados
    SELECT tipo, rfef_club_id INTO v_indautxu_post_tipo, v_indautxu_post_rfef
    FROM public.clubs
    WHERE id = '10000000-0000-0000-0000-000000000001'::uuid AND nombre = 'SD INDAUTXU';

    IF v_indautxu_post_tipo <> 'PROPIO' OR v_indautxu_post_rfef <> 33836524 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Registro de Indautxu corrupto (tipo: %, rfef_club_id: %)', v_indautxu_post_tipo, v_indautxu_post_rfef;
    END IF;

    -- F. Athletic y Logroñés intactos
    SELECT rfef_club_id INTO v_ath_rfef FROM public.clubs WHERE id = 'f14fbbca-81f4-4ee3-b818-e1e41827454b' AND nombre = 'ATHLETIC CLUB' AND tipo = 'LIGA';
    SELECT rfef_club_id INTO v_log_rfef FROM public.clubs WHERE id = '89203a30-4e2d-4cd4-83d5-a0a745140609' AND nombre = 'UD LOGROÑES' AND tipo = 'LIGA';
    IF v_ath_rfef <> 205514 OR v_log_rfef <> 205744 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Athletic o Logroñés fueron alterados indebidamente';
    END IF;

    RAISE NOTICE '============================================================';
    RAISE NOTICE '   RFEF · J1-C · TRANSACCIÓN VALIDADA EXITOSAMENTE (PASS)   ';
    RAISE NOTICE '   - 16 Clubes configurados (15 LIGA + 1 PROPIO)            ';
    RAISE NOTICE '   - 16 rfef_club_id únicos asignados                       ';
    RAISE NOTICE '   - SD Indautxu (33836524 / PROPIO) registrado             ';
    RAISE NOTICE '   - 13 Rivales vinculados sin alterar otros campos         ';
    RAISE NOTICE '   - Athletic y Logroñés intactos                           ';
    RAISE NOTICE '============================================================';
END $$;
