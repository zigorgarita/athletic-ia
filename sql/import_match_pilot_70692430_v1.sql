-- ====================================================================
-- RFEF · PASO 6E · IMPORTACIÓN DEL PARTIDO PILOTO
-- Partido: Athletic Club 6–0 UD Logroñés (Jornada 1 · 05/09/2026)
-- CodActa RFEF: 70692430
-- ====================================================================
-- TRANSACCIÓN SEGURA Y DEFENSIVA:
-- - Prechecks obligatorios de no existencia y preexistencia de entidades.
-- - Inserción de official_matches (1 fila).
-- - Inserción de club_match_player_stats (36 filas mapeadas por rfef_player_id).
-- - Postchecks matemáticos y deportivos obligatorios antes de COMMIT.
-- ====================================================================

BEGIN;

DO $$
DECLARE
    v_match_id UUID;
    v_athletic_club_id UUID := 'f14fbbca-81f4-4ee3-b818-e1e41827454b';
    v_logrones_club_id UUID := '89203a30-4e2d-4cd4-83d5-a0a745140609';
    v_count_check INTEGER;
    v_sum_min_ath INTEGER;
    v_sum_min_log INTEGER;
    v_sum_goles INTEGER;
    v_titulares_count INTEGER;
    v_suplentes_count INTEGER;
    v_bench_played_count INTEGER;
BEGIN
    -- ----------------------------------------------------------------
    -- 1. PRECHECKS DEFENSIVOS
    -- ----------------------------------------------------------------
    
    -- 1.1. Verificar que el partido no ha sido insertado previamente
    SELECT COUNT(*) INTO v_count_check FROM official_matches WHERE rfef_cod_acta = 70692430;
    IF v_count_check > 0 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: El partido con rfef_cod_acta 70692430 ya existe en official_matches';
    END IF;

    -- 1.2. Verificar que los clubes existen y coinciden con sus IDs RFEF
    SELECT COUNT(*) INTO v_count_check FROM clubs WHERE id = v_athletic_club_id AND rfef_club_id = 205514;
    IF v_count_check <> 1 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Athletic Club no existe o su rfef_club_id no es 205514';
    END IF;

    SELECT COUNT(*) INTO v_count_check FROM clubs WHERE id = v_logrones_club_id AND rfef_club_id = 205744;
    IF v_count_check <> 1 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: UD Logroñés no existe o su rfef_club_id no es 205744';
    END IF;

    -- 1.3. Verificar que los 36 rfef_player_id requeridos existen exactamente una vez en club_players
    SELECT COUNT(DISTINCT rfef_player_id) INTO v_count_check 
    FROM club_players 
    WHERE rfef_player_id IN (
        -- 18 Athletic Club
        1486871, 1527831, 1483391, 1536892, 1535327, 25167623, 25439141, 1515139, 25241049, 33129429, 1490940,
        1535326, 25099419, 1510590, 1483244, 1505560, 25241054, 1501389,
        -- 18 UD Logroñés
        489124, 25177199, 23445453, 1346342, 1365893, 1511829, 1108391, 1361353, 1368621, 885652, 1346348,
        1361938, 1369428, 1362005, 1362760, 1368755, 863015, 1295765
    );
    IF v_count_check <> 36 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: No se encontraron los 36 rfef_player_id únicos en club_players (encontrados: %)', v_count_check;
    END IF;

    -- ----------------------------------------------------------------
    -- 2. INSERCIÓN EN official_matches
    -- ----------------------------------------------------------------
    INSERT INTO official_matches (
        rfef_cod_acta,
        temporada,
        competicion,
        grupo,
        jornada,
        fecha,
        hora,
        local_club_id,
        visitor_club_id,
        goles_local,
        goles_visitante,
        jugado,
        campo,
        superficie,
        arbitro,
        asistentes,
        oficiales,
        source
    ) VALUES (
        70692430,
        '2026-27',
        'División de Honor Juvenil',
        'Grupo 2',
        1,
        '2026-09-05',
        '12:00:00',
        v_athletic_club_id,
        v_logrones_club_id,
        6,
        0,
        true,
        'Inst. Dep. de Lezama - Campo 3',
        'Hierba Natural',
        'Barrio Salas, Aitor',
        'Sedano Mijares, Ander / Soto Montejo, Asier',
        '{"incidencias": [{"club": "UD Logroñés", "tipo": "Amarilla", "cargo": "Entrenador", "minuto": 30, "motivo": "Por realizar observaciones de carácter técnico a una de mis decisiones.", "nombre": "SAENZ DE JUBERA MARTINEZ, JOSE ANTONIO"}]}'::jsonb,
        'rfef'
    ) RETURNING id INTO v_match_id;

    -- ----------------------------------------------------------------
    -- 3. INSERCIÓN DE club_match_player_stats (36 JUGADORES)
    -- ----------------------------------------------------------------
    INSERT INTO club_match_player_stats (
        official_match_id,
        club_player_id,
        club_id,
        dorsal_partido,
        convocado,
        titular,
        minuto_entrada,
        minuto_salida,
        minutos,
        goles,
        amarillas,
        doble_amarilla,
        roja,
        motivo_sancion,
        source
    ) VALUES
    -- 3.1. 18 Jugadores de Athletic Club,
        -- [1] SAINZ CUEVAS, URKO (Dorsal 13, RFEF ID 1486871)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1486871 LIMIT 1),
            v_athletic_club_id,
            13,
            true,
            true,
            NULL,
            NULL,
            90,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [2] Axular Fuentes Natxiondo (Dorsal 2, RFEF ID 1527831)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1527831 LIMIT 1),
            v_athletic_club_id,
            2,
            true,
            true,
            NULL,
            72,
            72,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [3] Aimar Aspiunza Barrenetxea (Dorsal 5, RFEF ID 1483391)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1483391 LIMIT 1),
            v_athletic_club_id,
            5,
            true,
            true,
            NULL,
            61,
            61,
            0,
            1,
            false,
            false,
            'Amarilla (61'')',
            'rfef'
        ),
        -- [4] Javier Zabala Sarasola (Dorsal 10, RFEF ID 1536892)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1536892 LIMIT 1),
            v_athletic_club_id,
            10,
            true,
            true,
            NULL,
            NULL,
            90,
            1,
            1,
            false,
            false,
            'Amarilla (69'')',
            'rfef'
        ),
        -- [5] Javier Regúlez Ventura (Dorsal 12, RFEF ID 1535327)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1535327 LIMIT 1),
            v_athletic_club_id,
            12,
            true,
            true,
            NULL,
            NULL,
            90,
            1,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [6] Rubén Marín García (Dorsal 14, RFEF ID 25167623)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 25167623 LIMIT 1),
            v_athletic_club_id,
            14,
            true,
            true,
            NULL,
            NULL,
            90,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [7] AGUIRRE GIES, OSCAR (Dorsal 17, RFEF ID 25439141)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 25439141 LIMIT 1),
            v_athletic_club_id,
            17,
            true,
            true,
            NULL,
            58,
            58,
            1,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [8] Joannes Echeverría Arquero (Dorsal 19, RFEF ID 1515139)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1515139 LIMIT 1),
            v_athletic_club_id,
            19,
            true,
            true,
            NULL,
            NULL,
            90,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [9] Mateo García Martín (Dorsal 20, RFEF ID 25241049)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 25241049 LIMIT 1),
            v_athletic_club_id,
            20,
            true,
            true,
            NULL,
            NULL,
            90,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [10] CISSE, YANN ISMAEL (Dorsal 21, RFEF ID 33129429)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 33129429 LIMIT 1),
            v_athletic_club_id,
            21,
            true,
            true,
            NULL,
            58,
            58,
            1,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [11] Alex Esnaola Agaen (Dorsal 24, RFEF ID 1490940)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1490940 LIMIT 1),
            v_athletic_club_id,
            24,
            true,
            true,
            NULL,
            58,
            58,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [12] Gaizka Otaegi Krutxaga (Dorsal 30, RFEF ID 1535326)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1535326 LIMIT 1),
            v_athletic_club_id,
            30,
            true,
            false,
            NULL,
            NULL,
            0,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [13] Oihan Zubiaga Brigole (Dorsal 3, RFEF ID 25099419)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 25099419 LIMIT 1),
            v_athletic_club_id,
            3,
            true,
            false,
            NULL,
            NULL,
            0,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [14] Telmo Arriaga Moreno (Dorsal 4, RFEF ID 1510590)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1510590 LIMIT 1),
            v_athletic_club_id,
            4,
            true,
            false,
            61,
            NULL,
            29,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [15] Unax Villa López (Dorsal 7, RFEF ID 1483244)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1483244 LIMIT 1),
            v_athletic_club_id,
            7,
            true,
            false,
            58,
            NULL,
            32,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [16] Eneko Santamaría (Dorsal 15, RFEF ID 1505560)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1505560 LIMIT 1),
            v_athletic_club_id,
            15,
            true,
            false,
            72,
            NULL,
            18,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [17] SARR FAYE, CHEIKH OUMAR (Dorsal 18, RFEF ID 25241054)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 25241054 LIMIT 1),
            v_athletic_club_id,
            18,
            true,
            false,
            58,
            NULL,
            32,
            1,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [18] Beñat Aramburu Loyarte (Dorsal 23, RFEF ID 1501389)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1501389 LIMIT 1),
            v_athletic_club_id,
            23,
            true,
            false,
            58,
            NULL,
            32,
            1,
            1,
            false,
            false,
            'Amarilla (81'')',
            'rfef'
        ),
    -- 3.2. 18 Jugadores de UD Logroñés,
        -- [1] BENITEZ AVILES, DAVID (Dorsal 13, RFEF ID 489124)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 489124 LIMIT 1),
            v_logrones_club_id,
            13,
            true,
            true,
            NULL,
            NULL,
            90,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [2] PEREZ FERNANDEZ, JOSEBA (Dorsal 3, RFEF ID 25177199)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 25177199 LIMIT 1),
            v_logrones_club_id,
            3,
            true,
            true,
            NULL,
            23,
            23,
            0,
            2,
            true,
            false,
            'Doble Amarilla (20'', 23'') -> Expulsión min 23',
            'rfef'
        ),
        -- [3] RODRIGO LARRAÑAGA, JON (Dorsal 4, RFEF ID 23445453)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 23445453 LIMIT 1),
            v_logrones_club_id,
            4,
            true,
            true,
            NULL,
            NULL,
            90,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [4] GARCIA CARRANZA SANZ, LUIS (Dorsal 5, RFEF ID 1346342)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1346342 LIMIT 1),
            v_logrones_club_id,
            5,
            true,
            true,
            NULL,
            NULL,
            90,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [5] LAFONT ALONSO, MATIAS (Dorsal 8, RFEF ID 1365893)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1365893 LIMIT 1),
            v_logrones_club_id,
            8,
            true,
            true,
            NULL,
            NULL,
            90,
            0,
            1,
            false,
            false,
            'Amarilla (44'')',
            'rfef'
        ),
        -- [6] BERASATEGI HERNANDEZ, JULEN (Dorsal 9, RFEF ID 1511829)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1511829 LIMIT 1),
            v_logrones_club_id,
            9,
            true,
            true,
            NULL,
            46,
            46,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [7] PASTORIZA DALMAU, MATEO (Dorsal 11, RFEF ID 1108391)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1108391 LIMIT 1),
            v_logrones_club_id,
            11,
            true,
            true,
            NULL,
            46,
            46,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [8] LATORRE IBARROLA, MARTIN (Dorsal 16, RFEF ID 1361353)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1361353 LIMIT 1),
            v_logrones_club_id,
            16,
            true,
            true,
            NULL,
            65,
            65,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [9] RECIO ALCALDE, DAVID (Dorsal 20, RFEF ID 1368621)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1368621 LIMIT 1),
            v_logrones_club_id,
            20,
            true,
            true,
            NULL,
            46,
            46,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [10] ANTICH SERRANO, CHRISTIAN (Dorsal 21, RFEF ID 885652)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 885652 LIMIT 1),
            v_logrones_club_id,
            21,
            true,
            true,
            NULL,
            72,
            72,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [11] MENDINUETA PEREZ DE VILLARREAL, ADEI (Dorsal 22, RFEF ID 1346348)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1346348 LIMIT 1),
            v_logrones_club_id,
            22,
            true,
            true,
            NULL,
            NULL,
            90,
            0,
            1,
            false,
            false,
            'Amarilla (38'')',
            'rfef'
        ),
        -- [12] ALCALDE ALESANCO, ALEJANDRO (Dorsal 1, RFEF ID 1361938)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1361938 LIMIT 1),
            v_logrones_club_id,
            1,
            true,
            false,
            NULL,
            NULL,
            0,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [13] LABEAGA GARCIA, DIEGO (Dorsal 6, RFEF ID 1369428)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1369428 LIMIT 1),
            v_logrones_club_id,
            6,
            true,
            false,
            65,
            NULL,
            25,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [14] LLORENTE LOPEZ, RAUL (Dorsal 7, RFEF ID 1362005)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1362005 LIMIT 1),
            v_logrones_club_id,
            7,
            true,
            false,
            46,
            NULL,
            44,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [15] GONZALEZ ZAIDI L, ISMAEL (Dorsal 10, RFEF ID 1362760)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1362760 LIMIT 1),
            v_logrones_club_id,
            10,
            true,
            false,
            NULL,
            NULL,
            0,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [16] GIL ESCUDERO, OLIVER (Dorsal 12, RFEF ID 1368755)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1368755 LIMIT 1),
            v_logrones_club_id,
            12,
            true,
            false,
            46,
            NULL,
            44,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [17] GALBARRO CASTILLO, JUAN PABLO (Dorsal 14, RFEF ID 863015)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 863015 LIMIT 1),
            v_logrones_club_id,
            14,
            true,
            false,
            46,
            NULL,
            44,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        ),
        -- [18] MAGAN PUÑAL, DANIEL (Dorsal 18, RFEF ID 1295765)
        (
            v_match_id,
            (SELECT id FROM club_players WHERE rfef_player_id = 1295765 LIMIT 1),
            v_logrones_club_id,
            18,
            true,
            false,
            72,
            NULL,
            18,
            0,
            0,
            false,
            false,
            NULL,
            'rfef'
        );

    -- ----------------------------------------------------------------
    -- 4. POSTCHECKS DEFENSIVOS ANTES DE CONFIRMAR
    -- ----------------------------------------------------------------

    -- 4.1. Exactamente 1 partido en official_matches con rfef_cod_acta = 70692430 y resultado 6-0
    SELECT COUNT(*) INTO v_count_check 
    FROM official_matches 
    WHERE id = v_match_id AND rfef_cod_acta = 70692430 AND goles_local = 6 AND goles_visitante = 0;
    IF v_count_check <> 1 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: official_matches no tiene exactamente 1 registro correcto con 6-0';
    END IF;

    -- 4.2. Exactamente 36 filas en club_match_player_stats
    SELECT COUNT(*) INTO v_count_check FROM club_match_player_stats WHERE official_match_id = v_match_id;
    IF v_count_check <> 36 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Total de filas en stats no es 36 (encontradas: %)', v_count_check;
    END IF;

    -- 4.3. 18 filas de Athletic Club y 18 de UD Logroñés
    SELECT COUNT(*) INTO v_count_check FROM club_match_player_stats WHERE official_match_id = v_match_id AND club_id = v_athletic_club_id;
    IF v_count_check <> 18 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Jugadores de Athletic Club no suman 18 (encontrados: %)', v_count_check;
    END IF;

    SELECT COUNT(*) INTO v_count_check FROM club_match_player_stats WHERE official_match_id = v_match_id AND club_id = v_logrones_club_id;
    IF v_count_check <> 18 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Jugadores de UD Logroñés no suman 18 (encontrados: %)', v_count_check;
    END IF;

    -- 4.4. 22 titulares y 14 suplentes
    SELECT COUNT(*) INTO v_titulares_count FROM club_match_player_stats WHERE official_match_id = v_match_id AND titular = true;
    SELECT COUNT(*) INTO v_suplentes_count FROM club_match_player_stats WHERE official_match_id = v_match_id AND titular = false;
    IF v_titulares_count <> 22 OR v_suplentes_count <> 14 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Conteo titulares/suplentes erróneo (titulares: %, suplentes: %)', v_titulares_count, v_suplentes_count;
    END IF;

    -- 4.5. 10 jugadores con participación desde el banquillo (minutos > 0 y titular = false)
    SELECT COUNT(*) INTO v_bench_played_count FROM club_match_player_stats WHERE official_match_id = v_match_id AND titular = false AND minutos > 0;
    IF v_bench_played_count <> 10 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Suplentes que jugaron no suman 10 (encontrados: %)', v_bench_played_count;
    END IF;

    -- 4.6. Exactamente 6 goles totales (todos correspondientes a jugadores de Athletic Club)
    SELECT SUM(goles) INTO v_sum_goles FROM club_match_player_stats WHERE official_match_id = v_match_id;
    IF v_sum_goles <> 6 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: La suma total de goles no es 6 (suma: %)', v_sum_goles;
    END IF;

    SELECT SUM(goles) INTO v_sum_goles FROM club_match_player_stats WHERE official_match_id = v_match_id AND club_id = v_athletic_club_id;
    IF v_sum_goles <> 6 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Los goles del Athletic Club no suman 6 (suma: %)', v_sum_goles;
    END IF;

    SELECT SUM(goles) INTO v_sum_goles FROM club_match_player_stats WHERE official_match_id = v_match_id AND club_id = v_logrones_club_id;
    IF v_sum_goles <> 0 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: UD Logroñés tiene goles asignados (suma: %)', v_sum_goles;
    END IF;

    -- 4.7. Suma matemática de minutos por equipo
    SELECT SUM(minutos) INTO v_sum_min_ath FROM club_match_player_stats WHERE official_match_id = v_match_id AND club_id = v_athletic_club_id;
    IF v_sum_min_ath <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos totales de Athletic Club no suman 990 (suma: %)', v_sum_min_ath;
    END IF;

    SELECT SUM(minutos) INTO v_sum_min_log FROM club_match_player_stats WHERE official_match_id = v_match_id AND club_id = v_logrones_club_id;
    IF v_sum_min_log <> 923 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos totales de UD Logroñés no suman 923 (suma: %)', v_sum_min_log;
    END IF;

    -- 4.8. Validación explícita de Joseba Pérez (RFEF ID 25177199)
    SELECT COUNT(*) INTO v_count_check 
    FROM club_match_player_stats 
    WHERE official_match_id = v_match_id 
      AND club_player_id = (SELECT id FROM club_players WHERE rfef_player_id = 25177199 LIMIT 1)
      AND amarillas = 2
      AND doble_amarilla = true
      AND roja = false
      AND minuto_salida = 23
      AND minutos = 23;
    IF v_count_check <> 1 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Los datos de sanción y minutos de Joseba Pérez no coinciden con la norma';
    END IF;

    -- 4.9. Cero duplicados de (official_match_id, club_player_id)
    SELECT COUNT(*) - COUNT(DISTINCT club_player_id) INTO v_count_check
    FROM club_match_player_stats
    WHERE official_match_id = v_match_id;
    IF v_count_check <> 0 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Existen duplicados de club_player_id en el partido';
    END IF;

    RAISE NOTICE 'VALIDACIÓN DE INTEGRIDAD SUPERADA: 1 partido y 36 estadísticas insertadas correctamente.';
END $$;

COMMIT;
