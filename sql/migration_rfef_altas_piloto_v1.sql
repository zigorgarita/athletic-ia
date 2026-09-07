-- ====================================================================
-- PASO 5A · ALTA DEFENSIVA Y TRANSACCIONAL DE 22 JUGADORES NUEVOS RFEF
-- Versión corregida (Paso 5A.1): Verificación y SELECT aislados a los 22 IDs exactos
-- Partido Piloto: CodActa = 70692430 (Athletic Club vs UD Logroñés)
-- Proyecto: Athletic IA / Indautxu 26/27
-- ====================================================================

BEGIN;

DO $$
DECLARE
    v_check_count INTEGER;
BEGIN
    -- -------------------------------------------------------------
    -- 1. VALIDACIONES PREVIAS · TEMPORADAS DE ATHLETIC Y LOGROÑÉS
    -- -------------------------------------------------------------
    -- Verificar correspondencia exacta de club_season_id para Athletic Club
    SELECT COUNT(*) INTO v_check_count
    FROM club_seasons
    WHERE id = '909c2b31-d634-4f42-9c4c-5971c168e645'
      AND club_id = 'f14fbbca-81f4-4ee3-b818-e1e41827454b'
      AND temporada = '2026-27';

    IF v_check_count <> 1 THEN
        RAISE EXCEPTION 'Abortado: club_season_id de Athletic Club no coincide con el club y temporada esperados';
    END IF;

    -- Verificar correspondencia exacta de club_season_id para UD Logroñés
    SELECT COUNT(*) INTO v_check_count
    FROM club_seasons
    WHERE id = '8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0'
      AND club_id = '89203a30-4e2d-4cd4-83d5-a0a745140609'
      AND temporada = '2026-27';

    IF v_check_count <> 1 THEN
        RAISE EXCEPTION 'Abortado: club_season_id de UD Logroñés no coincide con el club y temporada esperados';
    END IF;

    -- -------------------------------------------------------------
    -- 2. VALIDACIONES PREVIAS · ESTADO ACTUAL DE PLANTILLAS
    -- -------------------------------------------------------------
    -- Athletic debe tener exactamente 20 jugadores (14 vinculados RFEF + 6 sin vincular)
    SELECT COUNT(*) INTO v_check_count
    FROM club_players
    WHERE club_season_id = '909c2b31-d634-4f42-9c4c-5971c168e645';

    IF v_check_count <> 20 THEN
        RAISE EXCEPTION 'Abortado: Athletic Club no tiene los 20 jugadores previstos (actual: %)', v_check_count;
    END IF;

    -- UD Logroñés debe tener exactamente 0 jugadores en club_players
    SELECT COUNT(*) INTO v_check_count
    FROM club_players
    WHERE club_season_id = '8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0';

    IF v_check_count <> 0 THEN
        RAISE EXCEPTION 'Abortado: UD Logroñés ya tiene jugadores registrados (actual: %)', v_check_count;
    END IF;

    -- -------------------------------------------------------------
    -- 3. VALIDACIONES PREVIAS · INEXISTENCIA DE LOS 22 IDs RFEF
    -- -------------------------------------------------------------
    SELECT COUNT(*) INTO v_check_count
    FROM club_players
    WHERE rfef_player_id IN (
        -- 4 Athletic
        1486871, 25439141, 33129429, 25241054,
        -- 18 UD Logroñés
        489124, 25177199, 23445453, 1346342, 1365893, 1511829, 
        1108391, 1361353, 1368621, 885652, 1346348, 1368755, 
        863015, 1362005, 1369428, 1295765, 1361938, 1362760
    );

    IF v_check_count > 0 THEN
        RAISE EXCEPTION 'Abortado: Al menos uno de los 22 rfef_player_id ya existe en club_players (encontrados: %)', v_check_count;
    END IF;

    -- -------------------------------------------------------------
    -- 4. INSERCIÓN DE 4 JUGADORES NUEVOS DE ATHLETIC CLUB
    -- -------------------------------------------------------------
    INSERT INTO club_players (club_season_id, nombre, rfef_player_id, origen, dorsal, foto_url, posicion)
    VALUES 
        ('909c2b31-d634-4f42-9c4c-5971c168e645', 'SAINZ CUEVAS, URKO', 1486871, 'rfef', NULL, NULL, NULL),
        ('909c2b31-d634-4f42-9c4c-5971c168e645', 'AGUIRRE GIES, OSCAR', 25439141, 'rfef', NULL, NULL, NULL),
        ('909c2b31-d634-4f42-9c4c-5971c168e645', 'CISSE, YANN ISMAEL', 33129429, 'rfef', NULL, NULL, NULL),
        ('909c2b31-d634-4f42-9c4c-5971c168e645', 'SARR FAYE, CHEIKH OUMAR', 25241054, 'rfef', NULL, NULL, NULL);

    -- -------------------------------------------------------------
    -- 5. INSERCIÓN DE 18 JUGADORES NUEVOS DE UD LOGROÑÉS
    -- -------------------------------------------------------------
    INSERT INTO club_players (club_season_id, nombre, rfef_player_id, origen, dorsal, foto_url, posicion)
    VALUES 
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'BENITEZ AVILES, DAVID', 489124, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'PEREZ FERNANDEZ, JOSEBA', 25177199, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'RODRIGO LARRAÑAGA, JON', 23445453, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'GARCIA CARRANZA SANZ, LUIS', 1346342, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'LAFONT ALONSO, MATIAS', 1365893, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'BERASATEGI HERNANDEZ, JULEN', 1511829, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'PASTORIZA DALMAU, MATEO', 1108391, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'LATORRE IBARROLA, MARTIN', 1361353, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'RECIO ALCALDE, DAVID', 1368621, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'ANTICH SERRANO, CHRISTIAN', 885652, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'MENDINUETA PEREZ DE VILLARREAL, ADEI', 1346348, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'GIL ESCUDERO, OLIVER', 1368755, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'GALBARRO CASTILLO, JUAN PABLO', 863015, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'LLORENTE LOPEZ, RAUL', 1362005, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'LABEAGA GARCIA, DIEGO', 1369428, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'MAGAN PUÑAL, DANIEL', 1295765, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'ALCALDE ALESANCO, ALEJANDRO', 1361938, 'rfef', NULL, NULL, NULL),
        ('8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0', 'GONZALEZ ZAIDI L, ISMAEL', 1362760, 'rfef', NULL, NULL, NULL);

    -- -------------------------------------------------------------
    -- 6. VERIFICACIONES POST-INSERCIÓN DENTRO DE LA TRANSACCIÓN
    -- -------------------------------------------------------------
    -- 1. Athletic pasa de 20 a exactamente 24 jugadores
    SELECT COUNT(*) INTO v_check_count
    FROM club_players
    WHERE club_season_id = '909c2b31-d634-4f42-9c4c-5971c168e645';

    IF v_check_count <> 24 THEN
        RAISE EXCEPTION 'Abortado: Athletic Club no tiene 24 jugadores tras inserción (tiene: %)', v_check_count;
    END IF;

    -- 2. UD Logroñés pasa de 0 a exactamente 18 jugadores
    SELECT COUNT(*) INTO v_check_count
    FROM club_players
    WHERE club_season_id = '8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0';

    IF v_check_count <> 18 THEN
        RAISE EXCEPTION 'Abortado: UD Logroñés no tiene 18 jugadores tras inserción (tiene: %)', v_check_count;
    END IF;

    -- 3. Verificación aislada de los 4 jugadores nuevos de Athletic Club
    SELECT COUNT(*) INTO v_check_count
    FROM club_players
    WHERE club_season_id = '909c2b31-d634-4f42-9c4c-5971c168e645'
      AND rfef_player_id IN (1486871, 25439141, 33129429, 25241054)
      AND origen = 'rfef'
      AND dorsal IS NULL
      AND foto_url IS NULL
      AND posicion IS NULL;

    IF v_check_count <> 4 THEN
        RAISE EXCEPTION 'Abortado: Verificación de los 4 nuevos de Athletic fallida (encontrados: % de 4)', v_check_count;
    END IF;

    -- 4. Verificación aislada de los 18 jugadores nuevos de UD Logroñés
    SELECT COUNT(*) INTO v_check_count
    FROM club_players
    WHERE club_season_id = '8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0'
      AND rfef_player_id IN (
          489124, 25177199, 23445453, 1346342, 1365893, 1511829, 
          1108391, 1361353, 1368621, 885652, 1346348, 1368755, 
          863015, 1362005, 1369428, 1295765, 1361938, 1362760
      )
      AND origen = 'rfef'
      AND dorsal IS NULL
      AND foto_url IS NULL
      AND posicion IS NULL;

    IF v_check_count <> 18 THEN
        RAISE EXCEPTION 'Abortado: Verificación de los 18 nuevos de UD Logroñés fallida (encontrados: % de 18)', v_check_count;
    END IF;

    -- 5. Los 14 Athletic previamente vinculados conservan origen = 'documento'
    SELECT COUNT(*) INTO v_check_count
    FROM club_players
    WHERE club_season_id = '909c2b31-d634-4f42-9c4c-5971c168e645'
      AND origen = 'documento'
      AND rfef_player_id IS NOT NULL;

    IF v_check_count <> 14 THEN
        RAISE EXCEPTION 'Abortado: Los 14 jugadores vinculados de Athletic no conservan origen = ''documento'' (coincidencias: %)', v_check_count;
    END IF;

    -- 6. No existen duplicados de rfef_player_id
    SELECT (COUNT(rfef_player_id) - COUNT(DISTINCT rfef_player_id)) INTO v_check_count
    FROM club_players
    WHERE rfef_player_id IS NOT NULL;

    IF v_check_count <> 0 THEN
        RAISE EXCEPTION 'Abortado: Se detectaron duplicados en rfef_player_id (exceso: %)', v_check_count;
    END IF;

    -- 7. official_matches continúa con 0 filas
    SELECT COUNT(*) INTO v_check_count FROM official_matches;
    IF v_check_count <> 0 THEN
        RAISE EXCEPTION 'Abortado: official_matches contiene filas no autorizadas (total: %)', v_check_count;
    END IF;

    -- 8. club_match_player_stats continúa con 0 filas
    SELECT COUNT(*) INTO v_check_count FROM club_match_player_stats;
    IF v_check_count <> 0 THEN
        RAISE EXCEPTION 'Abortado: club_match_player_stats contiene filas no autorizadas (total: %)', v_check_count;
    END IF;

    RAISE NOTICE 'Verificación superada con éxito: 22 jugadores creados correctamente (4 Athletic + 18 UD Logroñés).';
END $$;

COMMIT;

-- ====================================================================
-- CONSULTAS READ-ONLY DE COMPROBACIÓN POST-EJECUCIÓN
-- ====================================================================

-- 1. Resumen de plantillas por club y origen
SELECT 
    c.nombre AS club,
    cs.temporada,
    COUNT(cp.id) AS total_jugadores,
    COUNT(CASE WHEN cp.origen = 'documento' THEN 1 END) AS origen_documento,
    COUNT(CASE WHEN cp.origen = 'rfef' THEN 1 END) AS origen_rfef,
    COUNT(CASE WHEN cp.rfef_player_id IS NOT NULL THEN 1 END) AS con_rfef_id
FROM club_seasons cs
JOIN clubs c ON c.id = cs.club_id
LEFT JOIN club_players cp ON cp.club_season_id = cs.id
WHERE cs.id IN (
    '909c2b31-d634-4f42-9c4c-5971c168e645', -- Athletic
    '8acd9a00-d764-4dc6-95fd-8fa3f17c0ab0'  -- UD Logroñés
)
GROUP BY c.nombre, cs.temporada
ORDER BY c.nombre;

-- 2. Listado de los 22 jugadores nuevos (aislado exclusivamente a sus 22 rfef_player_id concretos)
SELECT 
    c.nombre AS club,
    cp.nombre AS jugador_rfef,
    cp.rfef_player_id,
    cp.origen,
    cp.dorsal AS dorsal_maestro_null,
    cp.foto_url AS foto_url_null,
    cp.posicion AS posicion_null
FROM club_players cp
JOIN club_seasons cs ON cs.id = cp.club_season_id
JOIN clubs c ON c.id = cs.club_id
WHERE cp.rfef_player_id IN (
    -- 4 Athletic
    1486871, 25439141, 33129429, 25241054,
    -- 18 UD Logroñés
    489124, 25177199, 23445453, 1346342, 1365893, 1511829, 
    1108391, 1361353, 1368621, 885652, 1346348, 1368755, 
    863015, 1362005, 1369428, 1295765, 1361938, 1362760
)
ORDER BY c.nombre, cp.nombre;

-- 3. Verificación de tablas de partidos y estadísticas oficiales (deben ser 0)
SELECT 
    (SELECT COUNT(*) FROM official_matches) AS official_matches_count,
    (SELECT COUNT(*) FROM club_match_player_stats) AS club_match_player_stats_count;
