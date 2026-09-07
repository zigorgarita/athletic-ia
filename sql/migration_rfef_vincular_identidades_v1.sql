-- ====================================================================
-- PASO 4B · VINCULACIÓN TRANSACCIONAL Y DEFENSIVA DE IDENTIDADES RFEF
-- Versión corregida (Paso 4B.1): Transacción explícita + verificación aislada a los 14 UUIDs
-- Proyecto: Athletic IA / Indautxu 26/27
-- ====================================================================

BEGIN;

DO $$
DECLARE
    v_updated_rows INTEGER;
    v_check_count INTEGER;
BEGIN
    -- -------------------------------------------------------------
    -- 1. VALIDACIONES PREVIAS DEFENSIVAS · CLUBES
    -- -------------------------------------------------------------
    -- Comprobar que los 2 clubes existen por UUID exacto
    SELECT COUNT(*) INTO v_check_count
    FROM clubs
    WHERE id IN (
        'f14fbbca-81f4-4ee3-b818-e1e41827454b', -- ATHLETIC CLUB
        '89203a30-4e2d-4cd4-83d5-a0a745140609'  -- UD LOGROÑES
    );
    IF v_check_count <> 2 THEN
        RAISE EXCEPTION 'Abortado: No se han encontrado los 2 clubes por su UUID exacto (encontrados: %)', v_check_count;
    END IF;

    -- Comprobar que ningún otro club tiene asignado estos IDs RFEF
    SELECT COUNT(*) INTO v_check_count
    FROM clubs
    WHERE rfef_club_id IN (205514, 205744);
    IF v_check_count > 0 THEN
        RAISE EXCEPTION 'Abortado: Ya existe un club con rfef_club_id 205514 o 205744';
    END IF;

    -- -------------------------------------------------------------
    -- 2. VALIDACIONES PREVIAS DEFENSIVAS · 14 JUGADORES ATHLETIC
    -- -------------------------------------------------------------
    -- Comprobar que existen los 14 UUIDs exactos en club_players para la temporada correcta
    SELECT COUNT(*) INTO v_check_count
    FROM club_players
    WHERE id IN (
        '71f51b86-328b-4a2c-8cb3-d6a47f328e18', -- Axular Fuentes
        '91791b09-9363-4720-9b6e-47f20bb3bb65', -- Aimar Aspiunza
        'ee7941d4-18b9-4f6e-a7e2-bbac8920523d', -- Javier Zabala
        'c0ced88b-ea07-422c-8044-92965e7ed507', -- Javier Regúlez
        'b44938b9-0d27-4145-9f19-8911c97e0fb3', -- Rubén Marín
        'a351be4d-8c04-4d9a-887d-62d1e78a7fbf', -- Joannes Echeverría
        '99f15656-8f3b-4422-8e83-4e82f5363726', -- Mateo García
        '965d2b55-b36e-4601-8b77-d356b00406d8', -- Alex Esnaola
        'b54485d6-df06-4ce0-9ef8-4cbf0a0ccd78', -- Gaizka Otaegi
        '7dcdce76-007a-40cd-98fb-75d29ab9ad20', -- Oihan Zubiaga
        '1cb4314e-9f4f-45e8-b75c-d92d03adb0ee', -- Telmo Arriaga
        '31b7b4bc-0839-4087-8b73-cd2602c36ec1', -- Unax Villa
        'b4922751-98f8-41b6-b0c3-67cdb72297a9', -- Eneko Santamaría
        'aab6fe10-b797-454a-ab92-5b7b139f2e0b'  -- Beñat Aramburu
    ) AND club_season_id = '909c2b31-d634-4f42-9c4c-5971c168e645';

    IF v_check_count <> 14 THEN
        RAISE EXCEPTION 'Abortado: Se esperaban 14 jugadores en la temporada de Athletic, encontrados: %', v_check_count;
    END IF;

    -- Comprobar que ninguno de los 14 IDs RFEF está ocupado previamente
    SELECT COUNT(*) INTO v_check_count
    FROM club_players
    WHERE rfef_player_id IN (
        1527831, 1483391, 1536892, 1535327, 25167623, 1515139, 25241049,
        1490940, 1535326, 25099419, 1510590, 1483244, 1505560, 1501389
    );
    IF v_check_count > 0 THEN
        RAISE EXCEPTION 'Abortado: Ya existen jugadores con alguno de los 14 IDs RFEF en club_players';
    END IF;

    -- -------------------------------------------------------------
    -- 3. ACTUALIZACIÓN CONTROLADA DE CLUBES (EXCLUSIVAMENTE rfef_club_id)
    -- -------------------------------------------------------------
    UPDATE clubs
    SET rfef_club_id = 205514
    WHERE id = 'f14fbbca-81f4-4ee3-b818-e1e41827454b'
      AND rfef_club_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN
        RAISE EXCEPTION 'Fallo al actualizar rfef_club_id de Athletic Club (filas afectadas: %)', v_updated_rows;
    END IF;

    UPDATE clubs
    SET rfef_club_id = 205744
    WHERE id = '89203a30-4e2d-4cd4-83d5-a0a745140609'
      AND rfef_club_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN
        RAISE EXCEPTION 'Fallo al actualizar rfef_club_id de UD Logroñés (filas afectadas: %)', v_updated_rows;
    END IF;

    -- -------------------------------------------------------------
    -- 4. ACTUALIZACIÓN CONTROLADA DE LOS 14 JUGADORES (EXCLUSIVAMENTE rfef_player_id)
    -- -------------------------------------------------------------
    -- 1. Axular Fuentes Natxiondo
    UPDATE club_players SET rfef_player_id = 1527831
    WHERE id = '71f51b86-328b-4a2c-8cb3-d6a47f328e18' AND rfef_player_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN RAISE EXCEPTION 'Fallo al actualizar Axular Fuentes'; END IF;

    -- 2. Aimar Aspiunza Barrenetxea
    UPDATE club_players SET rfef_player_id = 1483391
    WHERE id = '91791b09-9363-4720-9b6e-47f20bb3bb65' AND rfef_player_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN RAISE EXCEPTION 'Fallo al actualizar Aimar Aspiunza'; END IF;

    -- 3. Javier Zabala Sarasola
    UPDATE club_players SET rfef_player_id = 1536892
    WHERE id = 'ee7941d4-18b9-4f6e-a7e2-bbac8920523d' AND rfef_player_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN RAISE EXCEPTION 'Fallo al actualizar Javier Zabala'; END IF;

    -- 4. Javier Regúlez Ventura
    UPDATE club_players SET rfef_player_id = 1535327
    WHERE id = 'c0ced88b-ea07-422c-8044-92965e7ed507' AND rfef_player_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN RAISE EXCEPTION 'Fallo al actualizar Javier Regúlez'; END IF;

    -- 5. Rubén Marín García
    UPDATE club_players SET rfef_player_id = 25167623
    WHERE id = 'b44938b9-0d27-4145-9f19-8911c97e0fb3' AND rfef_player_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN RAISE EXCEPTION 'Fallo al actualizar Rubén Marín'; END IF;

    -- 6. Joannes Echeverría Arquero
    UPDATE club_players SET rfef_player_id = 1515139
    WHERE id = 'a351be4d-8c04-4d9a-887d-62d1e78a7fbf' AND rfef_player_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN RAISE EXCEPTION 'Fallo al actualizar Joannes Echeverría'; END IF;

    -- 7. Mateo García Martín
    UPDATE club_players SET rfef_player_id = 25241049
    WHERE id = '99f15656-8f3b-4422-8e83-4e82f5363726' AND rfef_player_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN RAISE EXCEPTION 'Fallo al actualizar Mateo García'; END IF;

    -- 8. Alex Esnaola Agaen
    UPDATE club_players SET rfef_player_id = 1490940
    WHERE id = '965d2b55-b36e-4601-8b77-d356b00406d8' AND rfef_player_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN RAISE EXCEPTION 'Fallo al actualizar Alex Esnaola'; END IF;

    -- 9. Gaizka Otaegi Krutxaga
    UPDATE club_players SET rfef_player_id = 1535326
    WHERE id = 'b54485d6-df06-4ce0-9ef8-4cbf0a0ccd78' AND rfef_player_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN RAISE EXCEPTION 'Fallo al actualizar Gaizka Otaegi'; END IF;

    -- 10. Oihan Zubiaga Brigole
    UPDATE club_players SET rfef_player_id = 25099419
    WHERE id = '7dcdce76-007a-40cd-98fb-75d29ab9ad20' AND rfef_player_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN RAISE EXCEPTION 'Fallo al actualizar Oihan Zubiaga'; END IF;

    -- 11. Telmo Arriaga Moreno
    UPDATE club_players SET rfef_player_id = 1510590
    WHERE id = '1cb4314e-9f4f-45e8-b75c-d92d03adb0ee' AND rfef_player_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN RAISE EXCEPTION 'Fallo al actualizar Telmo Arriaga'; END IF;

    -- 12. Unax Villa López
    UPDATE club_players SET rfef_player_id = 1483244
    WHERE id = '31b7b4bc-0839-4087-8b73-cd2602c36ec1' AND rfef_player_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN RAISE EXCEPTION 'Fallo al actualizar Unax Villa'; END IF;

    -- 13. Eneko Santamaría
    UPDATE club_players SET rfef_player_id = 1505560
    WHERE id = 'b4922751-98f8-41b6-b0c3-67cdb72297a9' AND rfef_player_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN RAISE EXCEPTION 'Fallo al actualizar Eneko Santamaría'; END IF;

    -- 14. Beñat Aramburu Loyarte
    UPDATE club_players SET rfef_player_id = 1501389
    WHERE id = 'aab6fe10-b797-454a-ab92-5b7b139f2e0b' AND rfef_player_id IS NULL;
    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    IF v_updated_rows <> 1 THEN RAISE EXCEPTION 'Fallo al actualizar Beñat Aramburu'; END IF;

    -- -------------------------------------------------------------
    -- 5. VERIFICACIÓN POST-EJECUCIÓN AISLADA A LOS 14 UUIDs EXACTOS
    -- -------------------------------------------------------------
    -- Comprobar que cada uno de los 14 UUIDs tiene exactamente el rfef_player_id esperado
    -- y que conservan estrictamente su origen = 'documento'
    SELECT COUNT(*) INTO v_check_count
    FROM club_players
    WHERE (
        (id = '71f51b86-328b-4a2c-8cb3-d6a47f328e18' AND rfef_player_id = 1527831) OR
        (id = '91791b09-9363-4720-9b6e-47f20bb3bb65' AND rfef_player_id = 1483391) OR
        (id = 'ee7941d4-18b9-4f6e-a7e2-bbac8920523d' AND rfef_player_id = 1536892) OR
        (id = 'c0ced88b-ea07-422c-8044-92965e7ed507' AND rfef_player_id = 1535327) OR
        (id = 'b44938b9-0d27-4145-9f19-8911c97e0fb3' AND rfef_player_id = 25167623) OR
        (id = 'a351be4d-8c04-4d9a-887d-62d1e78a7fbf' AND rfef_player_id = 1515139) OR
        (id = '99f15656-8f3b-4422-8e83-4e82f5363726' AND rfef_player_id = 25241049) OR
        (id = '965d2b55-b36e-4601-8b77-d356b00406d8' AND rfef_player_id = 1490940) OR
        (id = 'b54485d6-df06-4ce0-9ef8-4cbf0a0ccd78' AND rfef_player_id = 1535326) OR
        (id = '7dcdce76-007a-40cd-98fb-75d29ab9ad20' AND rfef_player_id = 25099419) OR
        (id = '1cb4314e-9f4f-45e8-b75c-d92d03adb0ee' AND rfef_player_id = 1510590) OR
        (id = '31b7b4bc-0839-4087-8b73-cd2602c36ec1' AND rfef_player_id = 1483244) OR
        (id = 'b4922751-98f8-41b6-b0c3-67cdb72297a9' AND rfef_player_id = 1505560) OR
        (id = 'aab6fe10-b797-454a-ab92-5b7b139f2e0b' AND rfef_player_id = 1501389)
    )
    AND origen = 'documento';

    IF v_check_count <> 14 THEN
        RAISE EXCEPTION 'Abortado: Verificación fallida. No todos los 14 UUIDs tienen su rfef_player_id esperado o no conservan origen = ''documento'' (coincidencias: %)', v_check_count;
    END IF;

    RAISE NOTICE 'Verificación superada: 2 clubes y los 14 jugadores de Athletic Club vinculados correctamente.';
END $$;

COMMIT;

-- ====================================================================
-- CONSULTAS DE COMPROBACIÓN POST-EJECUCIÓN (RESULTADOS EN SQL EDITOR)
-- ====================================================================

-- 1. Comprobación de Clubes Vinculados
SELECT 
    id AS club_id,
    nombre,
    rfef_club_id,
    updated_at
FROM clubs
WHERE id IN (
    'f14fbbca-81f4-4ee3-b818-e1e41827454b',
    '89203a30-4e2d-4cd4-83d5-a0a745140609'
)
ORDER BY nombre;

-- 2. Comprobación de los 14 Jugadores Vinculados (Aislado a sus 14 UUIDs)
SELECT 
    id AS player_id,
    nombre,
    dorsal,
    posicion,
    origen,
    rfef_player_id,
    CASE 
        WHEN foto_url LIKE '%cdn.athletic-club.eus%' THEN 'CDN_ATHLETIC_OK'
        WHEN foto_url IS NULL THEN 'SIN_FOTO'
        ELSE 'OTRA'
    END AS foto_status,
    foto_url
FROM club_players
WHERE id IN (
    '71f51b86-328b-4a2c-8cb3-d6a47f328e18',
    '91791b09-9363-4720-9b6e-47f20bb3bb65',
    'ee7941d4-18b9-4f6e-a7e2-bbac8920523d',
    'c0ced88b-ea07-422c-8044-92965e7ed507',
    'b44938b9-0d27-4145-9f19-8911c97e0fb3',
    'a351be4d-8c04-4d9a-887d-62d1e78a7fbf',
    '99f15656-8f3b-4422-8e83-4e82f5363726',
    '965d2b55-b36e-4601-8b77-d356b00406d8',
    'b54485d6-df06-4ce0-9ef8-4cbf0a0ccd78',
    '7dcdce76-007a-40cd-98fb-75d29ab9ad20',
    '1cb4314e-9f4f-45e8-b75c-d92d03adb0ee',
    '31b7b4bc-0839-4087-8b73-cd2602c36ec1',
    'b4922751-98f8-41b6-b0c3-67cdb72297a9',
    'aab6fe10-b797-454a-ab92-5b7b139f2e0b'
)
ORDER BY dorsal ASC NULLS LAST;
