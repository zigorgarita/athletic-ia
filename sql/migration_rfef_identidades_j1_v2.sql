-- ============================================================================
-- RFEF · J1-E.1 · IMPORTACIÓN DEFENSIVA DE IDENTIDADES DE JUGADORES (JORNADA 1) - V2
-- 
-- OBJETIVO:
-- 1. Vincular exclusivamente rfef_player_id a los 15 futbolistas documentales de DEPORTIVO ALAVÉS.
-- 2. Insertar 218 nuevos futbolistas rivales con origen='rfef' para los 13 rivales de J1.
-- 3. Cero jugadores de SD INDAUTXU en club_players (protección relacional clubs.rfef_club_id = 33836524).
-- 4. Preservar 100% intactos nombres, fotos, posiciones, lateralidades y dorsales documentales de Alavés.
-- 5. No convertir dorsal_partido en dorsal permanente (dorsal = NULL para las 218 altas).
--
-- MEJORAS V2:
-- - Protección de SD INDAUTXU mediante join relacional estricto (club_players -> club_seasons -> clubs).
-- - Actualización de Alavés endurecida con CTE/VALUES controlado y exigencia de exactamente 15 filas.
-- - Postcheck de distribución endurecido validando los rfef_player_id exactos del lote J1-E por club.
-- - Postchecks globales de unicidad, no convocados de Alavés y plantilla propia (players).
--
-- ESTADO: PREPARADO · NO EJECUTADO
-- ============================================================================

DO $$
DECLARE
    v_conflicto_previo INTEGER;
    v_alaves_doc_count INTEGER;
    v_total_insertados INTEGER;
    v_alaves_actualizados INTEGER;
    v_total_rfef_233 INTEGER;
    v_total_duplicados INTEGER;
    v_alaves_no_convocados_check INTEGER;
    v_indautxu_check INTEGER;
    v_piloto_match_check INTEGER;
    v_piloto_stats_check INTEGER;
    v_dist_check INTEGER;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE '   RFEF · J1-E.1 · INICIANDO TRANSACCIÓN DE IDENTIDADES J1  ';
    RAISE NOTICE '============================================================';

    -- ------------------------------------------------------------------------
    -- 1. PRECHECKS OBLIGATORIOS (READ-ONLY)
    -- ------------------------------------------------------------------------

    -- A. Ninguno de los 233 rfef_player_id puede existir previamente en club_players
    SELECT COUNT(*) INTO v_conflicto_previo
    FROM public.club_players
    WHERE rfef_player_id IN (
        1511069, 1506439, 1484975, 1478101, 1511392, 1483756, 1539347, 1539780, 1538318, 1482473,
        1530497, 1527430, 776472, 1542198, 1512131, 1511066, 1500153, 1536882, 1137880, 842751,
        821289, 825906, 33874377, 24616341, 24605065, 826520, 814687, 827875, 1118632, 538479,
        900310644, 828676, 828358, 24679388, 819621, 24674855, 1527276, 1515422, 772817, 1531746,
        1525519, 23917106, 1484390, 1525520, 1541884, 23917110, 1498780, 1542392, 1484386, 25552725,
        900640846, 1481818, 900640848, 1520266, 23519898, 1507893, 1363968, 1500345, 1508938, 1515738,
        1500350, 33855037, 1535788, 1535457, 1504995, 1510843, 1484582, 1539838, 473033, 1478889,
        1534746, 1535380, 1543001, 1480857, 1480276, 1480274, 1514007, 1480281, 1540922, 1502290,
        1480275, 24669393, 1478990, 1542337, 1514226, 1542700, 1540923, 1537336, 1494808, 1540918,
        1516666, 23310438, 1368236, 1367205, 1364175, 1363891, 1365615, 1362725, 1366429, 1363430,
        1363429, 1367227, 1364236, 1364630, 1368730, 1367436, 1368796, 24576616, 1363259, 1367926,
        34071958, 1325857, 809355, 826008, 34042813, 817116, 23323965, 812416, 628729, 825613,
        826382, 818237, 814927, 23327967, 811944, 812205, 34060184, 23492022, 34053553, 900176428,
        1506628, 1515680, 25859579, 1483827, 25120706, 1517904, 1512655, 1521544, 24616827, 1484304,
        1527280, 901384678, 1537486, 1500441, 900176843, 1344835, 948020, 1481562, 24147469, 1507452,
        1542087, 1532709, 23388984, 1535814, 1513856, 1484977, 1139265, 1537414, 1528307, 1528846,
        1526711, 1515474, 1492300, 1541701, 758958, 1050135, 829972, 826990, 4475785, 825653,
        826268, 24150608, 827130, 820847, 1112081, 807944, 841009, 813863, 826993, 847100,
        900459882, 828723, 1536035, 1506997, 1528578, 1479396, 1529142, 1515143, 1537923, 33882160,
        1495737, 23364906, 1501390, 1513332, 1530693, 1482735, 1364289, 1480157, 1492714, 723498,
        4472744, 1483772, 1528890, 1492695, 1514872, 1511828, 1480156, 24446382, 1516059, 1532373,
        1513243, 1534792, 1534376, 1483771, 24674595, 23077000, 1534374, 1364588, 1527285, 1539163,
        900379315, 1515418, 1489183, 1288502, 1492952, 1527283, 900752896, 655417, 1176078, 1287698,
        1512654, 1220291, 900656259
    );

    IF v_conflicto_previo > 0 THEN
        RAISE EXCEPTION '[PRECHECK FALLIDO] Uno o más de los 233 rfef_player_id a asignar ya existen en club_players (% colisiones)', v_conflicto_previo;
    END IF;

    -- B. Verificar los 15 UUIDs documentales de Alavés (deben existir, ser origen=documento y tener rfef_player_id IS NULL)
    SELECT COUNT(*) INTO v_alaves_doc_count
    FROM public.club_players
    WHERE id IN (
        '825c5e3a-4360-4a70-8d9b-a749725620d7'::uuid -- Jokin Fernandez de Zañartu,
        '0d3e16d1-b6d2-4b90-89dc-7779b09d69f8'::uuid -- Gabriel Vivian,
        'dfb54a40-fcac-496c-acd2-0c75ac769fca'::uuid -- Ede Promise Oghomwenotiti,
        'ae3da1c6-be38-4bb4-a9ba-db85614074b1'::uuid -- Alberto Saez,
        'faa630cb-b908-406d-bf01-31edcdfbfcaf'::uuid -- Imanol Zamora,
        '5553e4a1-6943-4083-9c6f-f45cbf62cd74'::uuid -- Jorge Esteban,
        '37772ba7-7f67-4594-ada0-4ff121789454'::uuid -- Sohaib Hassani,
        'a71a74ff-4dae-45cc-88e1-85b9a65536f1'::uuid -- Hugo Suberviola,
        'af567358-d3b7-468c-ba41-3f3de606d136'::uuid -- Bryan Scoott,
        '6b6d269c-fe49-480b-99b9-69cde109584a'::uuid -- Iker Domingo,
        '6b34cf42-0551-4a03-8631-9f1ee1141989'::uuid -- Javier Ramírez,
        'd91e478f-2470-4aaf-9835-5e48edb3c3b0'::uuid -- Nicolas San Pio,
        '7e930c32-1d0a-47e1-a820-8a66930bdaba'::uuid -- Oier Montero,
        'a7a1fb12-51c4-4225-9df2-458ccd8f4ee0'::uuid -- Ivan Okorie,
        'c57793a5-5f5c-40fd-9c6a-16f449a5d10d'::uuid -- Iker Lobato
    )
    AND origen = 'documento'
    AND rfef_player_id IS NULL;

    IF v_alaves_doc_count <> 15 THEN
        RAISE EXCEPTION '[PRECHECK FALLIDO] Se esperaban 15 jugadores documentales de Alavés con rfef_player_id NULL, pero se encontraron %', v_alaves_doc_count;
    END IF;

    -- C. Protección relacional SD Indautxu: exactamente 0 jugadores en club_players vinculados a clubs.rfef_club_id = 33836524
    SELECT COUNT(*) INTO v_indautxu_check
    FROM public.club_players cp
    JOIN public.club_seasons cs ON cp.club_season_id = cs.id
    JOIN public.clubs c ON cs.club_id = c.id
    WHERE c.rfef_club_id = 33836524;

    IF v_indautxu_check > 0 THEN
        RAISE EXCEPTION '[PRECHECK FALLIDO] Se detectaron % registros de Indautxu en club_players vinculados a clubs.rfef_club_id = 33836524', v_indautxu_check;
    END IF;

    RAISE NOTICE '[PRECHECKS OK] Todos los prechecks superados exitosamente.';

    -- ------------------------------------------------------------------------
    -- 2. OPERACIÓN A: ASIGNAR EXCLUSIVAMENTE RFEF_PLAYER_ID A LOS 15 DE ALAVÉS
    -- ------------------------------------------------------------------------
    RAISE NOTICE 'Ejecutando vinculación endurecida de los 15 futbolistas documentales de Alavés...';

    WITH alaves_mapping(player_id, target_rfef_id) AS (
        VALUES
            ('825c5e3a-4360-4a70-8d9b-a749725620d7'::uuid, 1527285), -- Jokin Fernandez de Zañartu (RFEF: FERNANDEZ DE ZAÑARTU ANSORREGUI, JOKIN)
            ('0d3e16d1-b6d2-4b90-89dc-7779b09d69f8'::uuid, 1539163), -- Gabriel Vivian (RFEF: VIVIAN SANCHEZ, GABRIEL)
            ('dfb54a40-fcac-496c-acd2-0c75ac769fca'::uuid, 900379315), -- Ede Promise Oghomwenotiti (RFEF: OGHOMWENOTITI IKPEKHIA, EDEOGHOGHO PROMISE)
            ('ae3da1c6-be38-4bb4-a9ba-db85614074b1'::uuid, 1515418), -- Alberto Saez (RFEF: SAEZ FERNANDEZ, ALBERTO)
            ('faa630cb-b908-406d-bf01-31edcdfbfcaf'::uuid, 1489183), -- Imanol Zamora (RFEF: ZAMORA SAEZ, IMANOL)
            ('5553e4a1-6943-4083-9c6f-f45cbf62cd74'::uuid, 1288502), -- Jorge Esteban (RFEF: ESTEBAN HERNANDEZ, JORGE)
            ('37772ba7-7f67-4594-ada0-4ff121789454'::uuid, 1492952), -- Sohaib Hassani (RFEF: HASSANI ZINEDINE, SOHAIB)
            ('a71a74ff-4dae-45cc-88e1-85b9a65536f1'::uuid, 1527283), -- Hugo Suberviola (RFEF: SUBERVIOLA CANTERA, HUGO)
            ('af567358-d3b7-468c-ba41-3f3de606d136'::uuid, 900752896), -- Bryan Scoott (RFEF: CIPRIAN GARABITO, BRYAN SCOOTT)
            ('6b6d269c-fe49-480b-99b9-69cde109584a'::uuid, 655417), -- Iker Domingo (RFEF: DOMINGO RUPEREZ, IKER)
            ('6b34cf42-0551-4a03-8631-9f1ee1141989'::uuid, 1176078), -- Javier Ramírez (RFEF: RAMIREZ GARCIA, JAVIER)
            ('d91e478f-2470-4aaf-9835-5e48edb3c3b0'::uuid, 1287698), -- Nicolas San Pio (RFEF: SAN PIO GALAN, NICOLAS)
            ('7e930c32-1d0a-47e1-a820-8a66930bdaba'::uuid, 1512654), -- Oier Montero (RFEF: MONTERO MARQUINEZ, OIER)
            ('a7a1fb12-51c4-4225-9df2-458ccd8f4ee0'::uuid, 1220291), -- Ivan Okorie (RFEF: OKORIE IGIDI, IVAN)
            ('c57793a5-5f5c-40fd-9c6a-16f449a5d10d'::uuid, 900656259) -- Iker Lobato (RFEF: LOBATO HERRERO, IKER)
    ),
    updated AS (
        UPDATE public.club_players cp
        SET rfef_player_id = m.target_rfef_id
        FROM alaves_mapping m
        WHERE cp.id = m.player_id
          AND cp.origen = 'documento'
          AND cp.rfef_player_id IS NULL
        RETURNING cp.id
    )
    SELECT COUNT(*) INTO v_alaves_actualizados FROM updated;

    IF v_alaves_actualizados <> 15 THEN
        RAISE EXCEPTION '[UPDATE ALAVÉS FALLIDO] Se esperaba actualizar exactamente 15 registros documentales con rfef_player_id NULL, pero se actualizaron %', v_alaves_actualizados;
    END IF;

    RAISE NOTICE '15 futbolistas documentales de Alavés vinculados correctamente.';

    -- ------------------------------------------------------------------------
    -- 3. OPERACIÓN B: INSERTAR LOS 218 NUEVOS JUGADORES RIVALES (ORIGEN='RFEF')
    -- ------------------------------------------------------------------------
    RAISE NOTICE 'Insertando 218 nuevos jugadores rivales con origen=rfef (sin dorsal permanente inventado)...';

    INSERT INTO public.club_players (
        club_season_id,
        nombre,
        origen,
        rfef_player_id
    ) VALUES
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'TORRONTEGUI DIAS, GAIZKA', 'rfef', 1511069), -- SD LEIOA (J1: #1)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'ZUAZO MUELA, MARTIN', 'rfef', 1506439), -- SD LEIOA (J1: #3)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'TORRES IBAÑEZ DE MAEZTU, ALEX', 'rfef', 1484975), -- SD LEIOA (J1: #4)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'BIDAURRAZAGA MORGADO, ASIER', 'rfef', 1478101), -- SD LEIOA (J1: #7)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'GALDEANO BARANDIKA, IKER', 'rfef', 1511392), -- SD LEIOA (J1: #8)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'DE ABAJO LOPEZ, BEÑAT', 'rfef', 1483756), -- SD LEIOA (J1: #9)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'PEREZ RODRIGUEZ, IÑIGO', 'rfef', 1539347), -- SD LEIOA (J1: #15)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'GUTIERREZ CASTAÑEIRA, PAUL', 'rfef', 1539780), -- SD LEIOA (J1: #16)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'SANTAMARIA MARTINEZ, KERMAN', 'rfef', 1538318), -- SD LEIOA (J1: #17)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'GOIKOETXEA OTAOLA, JULEN', 'rfef', 1482473), -- SD LEIOA (J1: #21)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'VIVANCO MIGUEL, DANEL', 'rfef', 1530497), -- SD LEIOA (J1: #23)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'GARCIA DELGADO, MARKEL', 'rfef', 1527430), -- SD LEIOA (J1: #13)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'MIQUELARENA VIZCAYA, ANDONI', 'rfef', 776472), -- SD LEIOA (J1: #2)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'ANTOLIN ARMENTEROS, MARKEL', 'rfef', 1542198), -- SD LEIOA (J1: #6)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'DEL RIO ESPARZA, EKAIN', 'rfef', 1512131), -- SD LEIOA (J1: #10)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'LOPEZ KORTA, GORKA', 'rfef', 1511066), -- SD LEIOA (J1: #11)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'RAMOS BERDOTE, MARKEL', 'rfef', 1500153), -- SD LEIOA (J1: #19)
        ('59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid, 'CARBAJO ANCHIA, GORKA', 'rfef', 1536882), -- SD LEIOA (J1: #20)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'EIRIZ GONZALEZ, LUCAS', 'rfef', 1137880), -- CULTURAL LEONESA (J1: #1)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'GONZALEZ CACHAN, SERGIO', 'rfef', 842751), -- CULTURAL LEONESA (J1: #2)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'LAFUENTE SARMIENTO, MARIO', 'rfef', 821289), -- CULTURAL LEONESA (J1: #3)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'IBAÑEZ POTES, MANUEL', 'rfef', 825906), -- CULTURAL LEONESA (J1: #4)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'PAPA FALEFE, SY', 'rfef', 33874377), -- CULTURAL LEONESA (J1: #5)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'ROJO BREA, PABLO', 'rfef', 24616341), -- CULTURAL LEONESA (J1: #6)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'GARCIA GUTIERREZ, HUGO', 'rfef', 24605065), -- CULTURAL LEONESA (J1: #7)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'RODRIGO CARO, MARCO', 'rfef', 826520), -- CULTURAL LEONESA (J1: #8)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'ALVAREZ MARTINEZ, DANIEL', 'rfef', 814687), -- CULTURAL LEONESA (J1: #9)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'LARRAURI GONÇALVES, GAIZKA', 'rfef', 827875), -- CULTURAL LEONESA (J1: #10)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'DIAZ ALEJO, BORJA', 'rfef', 1118632), -- CULTURAL LEONESA (J1: #11)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'FLORES OSORIO, HUGO', 'rfef', 538479), -- CULTURAL LEONESA (J1: #13)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'VELASCO RODRIGUEZ, DIEGO', 'rfef', 900310644), -- CULTURAL LEONESA (J1: #12)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'FERNANDEZ ALONSO, BELTRAN', 'rfef', 828676), -- CULTURAL LEONESA (J1: #14)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'MARTINEZ OCHOA, ANGEL', 'rfef', 828358), -- CULTURAL LEONESA (J1: #15)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'GARCIA SOTORRIO, JORGE', 'rfef', 24679388), -- CULTURAL LEONESA (J1: #16)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'SEOANE CASTRO, JUAN', 'rfef', 819621), -- CULTURAL LEONESA (J1: #17)
        ('48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid, 'IGLESIAS FERNANDEZ, IZAN', 'rfef', 24674855), -- CULTURAL LEONESA (J1: #18)
        ('5545c49b-0756-4408-9412-e19ce28b75d1'::uuid, 'BEOBIDE SAENZ DE PIPAON, MAREN AIMAR', 'rfef', 1527276), -- DEPORTIVO ALAVES (J1: #2)
        ('5545c49b-0756-4408-9412-e19ce28b75d1'::uuid, 'MUGICA VICARIO, OIER', 'rfef', 1515422), -- DEPORTIVO ALAVES (J1: #1)
        ('5545c49b-0756-4408-9412-e19ce28b75d1'::uuid, 'LOPEZ BERODIA, DARIO', 'rfef', 772817), -- DEPORTIVO ALAVES (J1: #12)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'EGILUZ DOMINGUEZ, MARKEL', 'rfef', 1531746), -- ARRATIA (J1: #1)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'OLABARRI ARANGUREN, EKI', 'rfef', 1525519), -- ARRATIA (J1: #2)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'ESKALZA URTIAGA, XUBAN', 'rfef', 23917106), -- ARRATIA (J1: #3)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'BARRENETXEA ZULOAGA, JULEN', 'rfef', 1484390), -- ARRATIA (J1: #4)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'ISPIZUA URRUTXUA, UNAI', 'rfef', 1525520), -- ARRATIA (J1: #6)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'GONZALEZ DE ETXABARRI ALONSO, IBON', 'rfef', 1541884), -- ARRATIA (J1: #7)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'ARTETXE BELAUSTEGI, IKER', 'rfef', 23917110), -- ARRATIA (J1: #10)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'GARCIA PARGA, JON', 'rfef', 1498780), -- ARRATIA (J1: #14)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'JUARROS MANTEROLA, OIER', 'rfef', 1542392), -- ARRATIA (J1: #16)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'LEGARRETA RIOS, LUKEN', 'rfef', 1484386), -- ARRATIA (J1: #19)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'INTXAURRAGA SERNA, ENAITZ', 'rfef', 25552725), -- ARRATIA (J1: #29)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'ZULUAGA ETXEBARRIA, IZORTZ', 'rfef', 900640846), -- ARRATIA (J1: #8)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'BRAVO MAGDALENO, ALFONSO', 'rfef', 1481818), -- ARRATIA (J1: #13)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'ZAUTUA BIZKARGUENAGA, AIMAR', 'rfef', 900640848), -- ARRATIA (J1: #15)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'ALCAIRE COSTA, IBAI', 'rfef', 1520266), -- ARRATIA (J1: #26)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'IZAGIRRE ZENIKAZELAIA, OIHAN', 'rfef', 23519898), -- ARRATIA (J1: #27)
        ('32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid, 'GOTI IZAGUIRRE, URKO', 'rfef', 1507893), -- ARRATIA (J1: #30)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'ALONSO TORRECILLA, VICTOR', 'rfef', 1363968), -- SANTUTXU FC (J1: #13)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'REGO MORA, DIEGO', 'rfef', 1500345), -- SANTUTXU FC (J1: #5)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'GARCIA FERNANDEZ, OIER', 'rfef', 1508938), -- SANTUTXU FC (J1: #6)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'URRESTI RECIO, ALEX JHOVANNY', 'rfef', 1515738), -- SANTUTXU FC (J1: #9)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'VEGA PRIETO, IKER', 'rfef', 1500350), -- SANTUTXU FC (J1: #10)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'GIRALDO AMAYA, SEBASTIAN', 'rfef', 33855037), -- SANTUTXU FC (J1: #11)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'MARTIN BARTOLOME, GORKA', 'rfef', 1535788), -- SANTUTXU FC (J1: #12)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'EGUIDAZU PINILLA, ASIER', 'rfef', 1535457), -- SANTUTXU FC (J1: #14)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'DUQUE MICOLTA, URTZI', 'rfef', 1504995), -- SANTUTXU FC (J1: #21)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'ORTEGA HENALES, IBAI', 'rfef', 1510843), -- SANTUTXU FC (J1: #22)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'ASUMU ANGONO, SERGIO NDONG', 'rfef', 1484582), -- SANTUTXU FC (J1: #23)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'ESTEBAN SAN ROMAN, ANGEL', 'rfef', 1539838), -- SANTUTXU FC (J1: #1)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'CABALLERO TENA, DIEGO', 'rfef', 473033), -- SANTUTXU FC (J1: #7)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'PORTILLO RUBIN, XABIER', 'rfef', 1478889), -- SANTUTXU FC (J1: #17)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'HERRERA NAVAS, ANDER', 'rfef', 1534746), -- SANTUTXU FC (J1: #19)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'LEON GARCIA, LUCAS', 'rfef', 1535380), -- SANTUTXU FC (J1: #24)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'IRAZABAL VADILLO, LINO', 'rfef', 1543001), -- SANTUTXU FC (J1: #26)
        ('eea969ce-45de-43ba-b013-c5bf379be93d'::uuid, 'RODRIGUEZ ALVAREZ, SENDOA', 'rfef', 1480857), -- SANTUTXU FC (J1: #27)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'EZKERRA HERRERO, XABIER', 'rfef', 1480276), -- DANOK BAT (J1: #1)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'FERNANDEZ AYALA, UNAI', 'rfef', 1480274), -- DANOK BAT (J1: #3)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'OSIPOV, SEBASTIAN', 'rfef', 1514007), -- DANOK BAT (J1: #4)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'SANTAMARIA FERRERO, ARITZ', 'rfef', 1480281), -- DANOK BAT (J1: #6)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'MARTELL SERRANO, AIMAR', 'rfef', 1540922), -- DANOK BAT (J1: #8)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'FELIZ FERNANDEZ, SAUL', 'rfef', 1502290), -- DANOK BAT (J1: #9)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'BAPTISTA BASTERRA, JAVIER', 'rfef', 1480275), -- DANOK BAT (J1: #10)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'LOPEZ SILVA, HUGO JOHAN', 'rfef', 24669393), -- DANOK BAT (J1: #16)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'ETXABE SAN JOSE, OIER', 'rfef', 1478990), -- DANOK BAT (J1: #18)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'DIAZ PEREZ, IBAI', 'rfef', 1542337), -- DANOK BAT (J1: #21)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'SERRANO ACERO, IKER', 'rfef', 1514226), -- DANOK BAT (J1: #26)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'ITURRALDE ALVAREZ, DANEL', 'rfef', 1542700), -- DANOK BAT (J1: #13)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'GARCIA SANTAMARIA, OIER', 'rfef', 1540923), -- DANOK BAT (J1: #2)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'ESCANCIANO MUGURUZA, TELMO', 'rfef', 1537336), -- DANOK BAT (J1: #5)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'MORENO IBARLOZA, DANEL', 'rfef', 1494808), -- DANOK BAT (J1: #7)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'GONZALEZ MORA, SERGIO', 'rfef', 1540918), -- DANOK BAT (J1: #19)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'VALDIVIELSO TRINCHE, ENEKO', 'rfef', 1516666), -- DANOK BAT (J1: #22)
        ('c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid, 'DE LECEA CIGARAN, FRANCISCO DE ASIS', 'rfef', 23310438), -- DANOK BAT (J1: #27)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'GUTIERREZ BLANCO, JOSE', 'rfef', 1368236), -- EF MAREO (J1: #1)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'FABIAN HERRAIZ, PABLO', 'rfef', 1367205), -- EF MAREO (J1: #2)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'HERNANDEZ BELLIDO, UNAX', 'rfef', 1364175), -- EF MAREO (J1: #3)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'PINILLA CIAURRI, IZAN', 'rfef', 1363891), -- EF MAREO (J1: #5)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'ARRIAGA RUIZ E, MIKEL', 'rfef', 1365615), -- EF MAREO (J1: #7)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'RUIZ NAVARRO PABLO, SIMON', 'rfef', 1362725), -- EF MAREO (J1: #8)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'RIERA MERINO, MATEO', 'rfef', 1366429), -- EF MAREO (J1: #10)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'GARCIA CASTILLO, DANIEL', 'rfef', 1363430), -- EF MAREO (J1: #16)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'DE MIGUEL LLORACH, ERIC', 'rfef', 1363429), -- EF MAREO (J1: #17)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'FERNANDEZ NESTARES, SAUL', 'rfef', 1367227), -- EF MAREO (J1: #19)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'GARCIA VILLAREAL, ADRIAN', 'rfef', 1364236), -- EF MAREO (J1: #22)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'GARRIDO OLIVAN, ISMAEL', 'rfef', 1364630), -- EF MAREO (J1: #6)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'FERNÁNDEZ SIERRA, LUCAS', 'rfef', 1368730), -- EF MAREO (J1: #9)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'MARIN NOGUERA, ALVARO', 'rfef', 1367436), -- EF MAREO (J1: #11)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'LEON MARZO, MATEO', 'rfef', 1368796), -- EF MAREO (J1: #12)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'RUIZ DA CRUZ, DAVID', 'rfef', 24576616), -- EF MAREO (J1: #13)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'VIZCAINO FERNANDEZ, FERRAN', 'rfef', 1363259), -- EF MAREO (J1: #18)
        ('1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid, 'SAENZ FERNANDEZ, ALVARO', 'rfef', 1367926), -- EF MAREO (J1: #21)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'MIHAYLOV, STEFAN STEFANOV', 'rfef', 34071958), -- REAL VALLADOLID (J1: #1)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'GARCÍA JIMÉNEZ, ÁLVARO', 'rfef', 1325857), -- REAL VALLADOLID (J1: #2)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'BENITEZ HUSILLOS, CARLOS', 'rfef', 809355), -- REAL VALLADOLID (J1: #3)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'MOLLEDA ALONSO, KILIAN', 'rfef', 826008), -- REAL VALLADOLID (J1: #4)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'SYLLA, VASSERI', 'rfef', 34042813), -- REAL VALLADOLID (J1: #5)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'MARTIN SERNA, MARIO', 'rfef', 817116), -- REAL VALLADOLID (J1: #6)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'FERNÁNDEZ CRUZ, MARCOS', 'rfef', 23323965), -- REAL VALLADOLID (J1: #7)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'ESTEBAN ALVAREZ, SERGIO', 'rfef', 812416), -- REAL VALLADOLID (J1: #8)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'IGUAZ OLMOS, ALEJANDRO', 'rfef', 628729), -- REAL VALLADOLID (J1: #9)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'MERINO CAPARROS, SERGIO', 'rfef', 825613), -- REAL VALLADOLID (J1: #10)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'OLANDIA SANCHEZ, JAVIER', 'rfef', 826382), -- REAL VALLADOLID (J1: #11)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'MARTÍNEZ BARRIO, JUAN', 'rfef', 818237), -- REAL VALLADOLID (J1: #13)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'FRAILE GONZÁLEZ, ALBERTO', 'rfef', 814927), -- REAL VALLADOLID (J1: #12)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'DE LUCAS GARCÍA, PABLO', 'rfef', 23327967), -- REAL VALLADOLID (J1: #14)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'ESCALADA MARTINEZ, ALEJANDRO', 'rfef', 811944), -- REAL VALLADOLID (J1: #15)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'ZAPATERO FERNANDEZ, ALEJANDRO', 'rfef', 812205), -- REAL VALLADOLID (J1: #16)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'KANTA, MOHAMED', 'rfef', 34060184), -- REAL VALLADOLID (J1: #17)
        ('6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid, 'DIAGNE SARR, MAMADOU LAMINE', 'rfef', 23492022), -- REAL VALLADOLID (J1: #18)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'MAYE EBO, LEUDIS', 'rfef', 34053553), -- BETOÑO (J1: #1)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'BOYANO DELGADO, ALAIN', 'rfef', 900176428), -- BETOÑO (J1: #2)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'ECHEVARRIA MENDOZA, ANTTON', 'rfef', 1506628), -- BETOÑO (J1: #4)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'ORAA ORTIZ DE MENDIBIL, MARKEL', 'rfef', 1515680), -- BETOÑO (J1: #5)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'GRAJALES BEIZTEGUI, OIER', 'rfef', 25859579), -- BETOÑO (J1: #6)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'BRAHIM BEZEID, MOHAMED', 'rfef', 1483827), -- BETOÑO (J1: #7)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'BENAISSA AGBALOU, HAYTAM', 'rfef', 25120706), -- BETOÑO (J1: #8)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'BARREÑA SAEZ DE CAMARA, ASIER', 'rfef', 1517904), -- BETOÑO (J1: #11)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'CASTAÑO ORTIZ DE URBINA, UNAX', 'rfef', 1512655), -- BETOÑO (J1: #14)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'FRANCES VAZQUEZ, ARGOITZ', 'rfef', 1521544), -- BETOÑO (J1: #15)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'MARTINEZ CALDERON, OSCAR', 'rfef', 24616827), -- BETOÑO (J1: #17)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'SANTIAGO SOLETO, MARKEL', 'rfef', 1484304), -- BETOÑO (J1: #13)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'DE SOUSA FERNANDEZ, JON', 'rfef', 1527280), -- BETOÑO (J1: #21)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'DIARRA SOUMANO, TIEMOKO', 'rfef', 901384678), -- BETOÑO (J1: #22)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'ARCHI BEZIOUI, RAYAN', 'rfef', 1537486), -- BETOÑO (J1: #24)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'SAEZ RUBINA, URKO', 'rfef', 1500441), -- BETOÑO (J1: #26)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'GARCIA CASTRO, HUGO', 'rfef', 900176843), -- BETOÑO (J1: #27)
        ('09ae366d-0822-4344-9b31-edfa833fc776'::uuid, 'GARBAYO MAULEON, HUGO', 'rfef', 1344835), -- BETOÑO (J1: #28)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'AGUILERA GARCÍA, NICO', 'rfef', 948020), -- SD EIBAR (J1: #13)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'IRISARRI ALAMINO, EKHI', 'rfef', 1481562), -- SD EIBAR (J1: #2)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'NAVARRO GUTIERREZ, MARCOS', 'rfef', 24147469), -- SD EIBAR (J1: #5)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'ITURRI BENGOECHEA, JON', 'rfef', 1507452), -- SD EIBAR (J1: #7)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'ABRALDES AZKORBEBEITIA, ANARTZ', 'rfef', 1542087), -- SD EIBAR (J1: #8)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'VILLENA ARANDIA, OROITZ', 'rfef', 1532709), -- SD EIBAR (J1: #9)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'ONDO ELA, DALMACIO', 'rfef', 23388984), -- SD EIBAR (J1: #11)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'SUKIA YABEN, ETXAHUN', 'rfef', 1535814), -- SD EIBAR (J1: #14)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'HIERRO ALDAZABAL, ANDER', 'rfef', 1513856), -- SD EIBAR (J1: #17)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'CRESPO SANCHEZ, HUGO', 'rfef', 1484977), -- SD EIBAR (J1: #18)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'PINTOS VAZQUEZ, JUAN', 'rfef', 1139265), -- SD EIBAR (J1: #21)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'PRADERA RODRIGUEZ, UNAX', 'rfef', 1537414), -- SD EIBAR (J1: #1)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'GOMEZ MURILLO, MIKEL', 'rfef', 1528307), -- SD EIBAR (J1: #3)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'GARMENDIA BERZAL, MARKEL', 'rfef', 1528846), -- SD EIBAR (J1: #4)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'IRIONDO LETURIA, EKHI', 'rfef', 1526711), -- SD EIBAR (J1: #6)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'VAZQUEZ LLONA, AIMAR', 'rfef', 1515474), -- SD EIBAR (J1: #10)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'LOPEZ LOPEZ, UNAI', 'rfef', 1492300), -- SD EIBAR (J1: #20)
        ('6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid, 'UNANUE ARMENDARIZ, ANER', 'rfef', 1541701), -- SD EIBAR (J1: #22)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'LAGO FERNANDEZ, MATIAS', 'rfef', 758958), -- UNIONISTAS SALAMANCA (J1: #25)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'RUIZ RANGEL, ALVARO', 'rfef', 1050135), -- UNIONISTAS SALAMANCA (J1: #2)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'SANCHEZ RUANO, NICOLAS', 'rfef', 829972), -- UNIONISTAS SALAMANCA (J1: #3)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'LOPEZ DE LA IGLESIA, PEDRO', 'rfef', 826990), -- UNIONISTAS SALAMANCA (J1: #4)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'MARTIN GARCIA, OSCAR', 'rfef', 4475785), -- UNIONISTAS SALAMANCA (J1: #5)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'CASADO SASTRE, IVÁN', 'rfef', 825653), -- UNIONISTAS SALAMANCA (J1: #6)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'GONZALEZ GOMEZ, MARIO', 'rfef', 826268), -- UNIONISTAS SALAMANCA (J1: #9)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'VIÑUELA SACRISTAN, AITOR', 'rfef', 24150608), -- UNIONISTAS SALAMANCA (J1: #10)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'SANCHEZ GALA, PABLO', 'rfef', 827130), -- UNIONISTAS SALAMANCA (J1: #17)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'MARTIN POBLACION, PABLO', 'rfef', 820847), -- UNIONISTAS SALAMANCA (J1: #19)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'RODRIGUEZ LOPEZ, XAVI', 'rfef', 1112081), -- UNIONISTAS SALAMANCA (J1: #20)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'BARRIO QUINTERO, VICTOR', 'rfef', 807944), -- UNIONISTAS SALAMANCA (J1: #1)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'FERNANDEZ CABANES, GINES JAVIER', 'rfef', 841009), -- UNIONISTAS SALAMANCA (J1: #7)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'CHOKRAFI ELAYAT, OUALID', 'rfef', 813863), -- UNIONISTAS SALAMANCA (J1: #8)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'SÁNCHEZ MARTÍN, ADRIÁN', 'rfef', 826993), -- UNIONISTAS SALAMANCA (J1: #14)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'RAMOS GOMEZ, HECTOR', 'rfef', 847100), -- UNIONISTAS SALAMANCA (J1: #26)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'GOMEZ MARTIN, PABLO', 'rfef', 900459882), -- UNIONISTAS SALAMANCA (J1: #27)
        ('65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid, 'CORRALES GUZMAN, ALEJANDRO', 'rfef', 828723), -- UNIONISTAS SALAMANCA (J1: #28)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'ALBISU JAUREGI, UHAITZ', 'rfef', 1536035), -- ANTIGUOKO KE (J1: #1)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'LOPETEGUI ZATARAIN, ANER', 'rfef', 1506997), -- ANTIGUOKO KE (J1: #2)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'VITORIA SAN SEBASTIAN, UNAX', 'rfef', 1528578), -- ANTIGUOKO KE (J1: #3)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'ENPARANTZA ALUSTIZA, AIMAR', 'rfef', 1479396), -- ANTIGUOKO KE (J1: #4)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'ASEGUINOLAZA MATEOS, ALVARO', 'rfef', 1529142), -- ANTIGUOKO KE (J1: #5)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'RUBIO ALONSO, OIHAN', 'rfef', 1515143), -- ANTIGUOKO KE (J1: #6)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'SAIZAR DIAZ, UNAX', 'rfef', 1537923), -- ANTIGUOKO KE (J1: #7)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'JUGLAR, FERDINAND ARTHUR MARIE', 'rfef', 33882160), -- ANTIGUOKO KE (J1: #8)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'CARCEDO URBIETA, MIKEL', 'rfef', 1495737), -- ANTIGUOKO KE (J1: #9)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'VIDAL ARRUTI, HARITZ', 'rfef', 23364906), -- ANTIGUOKO KE (J1: #10)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'EL FAKHKHAR FERNANDEZ, ANASS', 'rfef', 1501390), -- ANTIGUOKO KE (J1: #11)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'LIZARTZA GORROTXATEGI, URKO', 'rfef', 1513332), -- ANTIGUOKO KE (J1: #13)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'ITURRIZA LULUAGA, MARKEL', 'rfef', 1530693), -- ANTIGUOKO KE (J1: #12)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'GALARZA GARMENDIA, EÑAUT', 'rfef', 1482735), -- ANTIGUOKO KE (J1: #14)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'SALGUEIRO JALON, GONZALO', 'rfef', 1364289), -- ANTIGUOKO KE (J1: #15)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'FERNANDEZ DE LEZEA LATABURU, MARKEL', 'rfef', 1480157), -- ANTIGUOKO KE (J1: #16)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'ALBIZU ARAUCO, LANDER', 'rfef', 1492714), -- ANTIGUOKO KE (J1: #17)
        ('692b8b68-aa45-4e5e-9547-845eaef03452'::uuid, 'VIDORRETA CASTAÑEDA, JON SANTIAGO', 'rfef', 723498), -- ANTIGUOKO KE (J1: #18)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'AZKARRAGA ARROSPIDE, UNAX', 'rfef', 4472744), -- REAL SOCIEDAD (J1: #1)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'PEREZ ARANDIA, ALAR', 'rfef', 1483772), -- REAL SOCIEDAD (J1: #2)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'ORUEZABAL AMONDARAIN, OIER', 'rfef', 1528890), -- REAL SOCIEDAD (J1: #3)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'MARTIN ARTOLA, MANEX', 'rfef', 1492695), -- REAL SOCIEDAD (J1: #4)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'MUGICA TORRES, YERAY', 'rfef', 1514872), -- REAL SOCIEDAD (J1: #5)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'AYALA DE LOS MOZOS, ALEX', 'rfef', 1511828), -- REAL SOCIEDAD (J1: #6)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'ECHARRI JAREÑO, XABIER', 'rfef', 1480156), -- REAL SOCIEDAD (J1: #7)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'GOROSTIZAGA UBARRECHENA, TELMO', 'rfef', 24446382), -- REAL SOCIEDAD (J1: #8)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'SOLANA TOMAS, UNAI', 'rfef', 1516059), -- REAL SOCIEDAD (J1: #9)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'LOZANO ULECIA, IVAN', 'rfef', 1532373), -- REAL SOCIEDAD (J1: #10)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'SANTANA PIKABEA, JOEL', 'rfef', 1513243), -- REAL SOCIEDAD (J1: #11)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'BUSTAMANTE DAVILA, DANIEL', 'rfef', 1534792), -- REAL SOCIEDAD (J1: #13)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'ALDASORO SARRIEGI, BEÑAT', 'rfef', 1534376), -- REAL SOCIEDAD (J1: #12)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'FERNANDEZ BAYO, PABLO', 'rfef', 1483771), -- REAL SOCIEDAD (J1: #14)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'DE LUCAS GARCIA, XANET', 'rfef', 24674595), -- REAL SOCIEDAD (J1: #15)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'MEHMETI, DION', 'rfef', 23077000), -- REAL SOCIEDAD (J1: #16)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'ALBIZU AGUDO, IKER', 'rfef', 1534374), -- REAL SOCIEDAD (J1: #17)
        ('9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid, 'IBAÑEZ MINGUEZ, PEDRO', 'rfef', 1364588); -- REAL SOCIEDAD (J1: #18)

    -- ------------------------------------------------------------------------
    -- 4. POSTCHECKS OBLIGATORIOS (VERIFICACIÓN DENTRO DE LA MISMA TRANSACCIÓN)
    -- ------------------------------------------------------------------------
    RAISE NOTICE 'Ejecutando postchecks de integridad endurecidos...';

    -- A. Exactamente 218 nuevos registros con origen='rfef' creados pertenecientes a los 218 IDs del lote
    SELECT COUNT(*) INTO v_total_insertados
    FROM public.club_players
    WHERE origen = 'rfef' AND rfef_player_id IN (
        1511069, 1506439, 1484975, 1478101, 1511392, 1483756, 1539347, 1539780, 1538318, 1482473,
        1530497, 1527430, 776472, 1542198, 1512131, 1511066, 1500153, 1536882, 1137880, 842751,
        821289, 825906, 33874377, 24616341, 24605065, 826520, 814687, 827875, 1118632, 538479,
        900310644, 828676, 828358, 24679388, 819621, 24674855, 1527276, 1515422, 772817, 1531746,
        1525519, 23917106, 1484390, 1525520, 1541884, 23917110, 1498780, 1542392, 1484386, 25552725,
        900640846, 1481818, 900640848, 1520266, 23519898, 1507893, 1363968, 1500345, 1508938, 1515738,
        1500350, 33855037, 1535788, 1535457, 1504995, 1510843, 1484582, 1539838, 473033, 1478889,
        1534746, 1535380, 1543001, 1480857, 1480276, 1480274, 1514007, 1480281, 1540922, 1502290,
        1480275, 24669393, 1478990, 1542337, 1514226, 1542700, 1540923, 1537336, 1494808, 1540918,
        1516666, 23310438, 1368236, 1367205, 1364175, 1363891, 1365615, 1362725, 1366429, 1363430,
        1363429, 1367227, 1364236, 1364630, 1368730, 1367436, 1368796, 24576616, 1363259, 1367926,
        34071958, 1325857, 809355, 826008, 34042813, 817116, 23323965, 812416, 628729, 825613,
        826382, 818237, 814927, 23327967, 811944, 812205, 34060184, 23492022, 34053553, 900176428,
        1506628, 1515680, 25859579, 1483827, 25120706, 1517904, 1512655, 1521544, 24616827, 1484304,
        1527280, 901384678, 1537486, 1500441, 900176843, 1344835, 948020, 1481562, 24147469, 1507452,
        1542087, 1532709, 23388984, 1535814, 1513856, 1484977, 1139265, 1537414, 1528307, 1528846,
        1526711, 1515474, 1492300, 1541701, 758958, 1050135, 829972, 826990, 4475785, 825653,
        826268, 24150608, 827130, 820847, 1112081, 807944, 841009, 813863, 826993, 847100,
        900459882, 828723, 1536035, 1506997, 1528578, 1479396, 1529142, 1515143, 1537923, 33882160,
        1495737, 23364906, 1501390, 1513332, 1530693, 1482735, 1364289, 1480157, 1492714, 723498,
        4472744, 1483772, 1528890, 1492695, 1514872, 1511828, 1480156, 24446382, 1516059, 1532373,
        1513243, 1534792, 1534376, 1483771, 24674595, 23077000, 1534374, 1364588
    );

    IF v_total_insertados <> 218 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Nuevos jugadores del lote con origen=rfef = % (esperado: 218)', v_total_insertados;
    END IF;

    -- B. Exactamente 15 jugadores de Alavés actualizados conservando origen='documento'
    SELECT COUNT(*) INTO v_alaves_actualizados
    FROM public.club_players
    WHERE id IN (
        '825c5e3a-4360-4a70-8d9b-a749725620d7'::uuid -- Jokin Fernandez de Zañartu,
        '0d3e16d1-b6d2-4b90-89dc-7779b09d69f8'::uuid -- Gabriel Vivian,
        'dfb54a40-fcac-496c-acd2-0c75ac769fca'::uuid -- Ede Promise Oghomwenotiti,
        'ae3da1c6-be38-4bb4-a9ba-db85614074b1'::uuid -- Alberto Saez,
        'faa630cb-b908-406d-bf01-31edcdfbfcaf'::uuid -- Imanol Zamora,
        '5553e4a1-6943-4083-9c6f-f45cbf62cd74'::uuid -- Jorge Esteban,
        '37772ba7-7f67-4594-ada0-4ff121789454'::uuid -- Sohaib Hassani,
        'a71a74ff-4dae-45cc-88e1-85b9a65536f1'::uuid -- Hugo Suberviola,
        'af567358-d3b7-468c-ba41-3f3de606d136'::uuid -- Bryan Scoott,
        '6b6d269c-fe49-480b-99b9-69cde109584a'::uuid -- Iker Domingo,
        '6b34cf42-0551-4a03-8631-9f1ee1141989'::uuid -- Javier Ramírez,
        'd91e478f-2470-4aaf-9835-5e48edb3c3b0'::uuid -- Nicolas San Pio,
        '7e930c32-1d0a-47e1-a820-8a66930bdaba'::uuid -- Oier Montero,
        'a7a1fb12-51c4-4225-9df2-458ccd8f4ee0'::uuid -- Ivan Okorie,
        'c57793a5-5f5c-40fd-9c6a-16f449a5d10d'::uuid -- Iker Lobato
    )
    AND origen = 'documento'
    AND rfef_player_id IS NOT NULL;

    IF v_alaves_actualizados <> 15 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Jugadores de Alavés actualizados = % (esperado: 15)', v_alaves_actualizados;
    END IF;

    -- C. Exactamente los 233 rfef_player_id presentes en la tabla
    SELECT COUNT(*) INTO v_total_rfef_233
    FROM public.club_players
    WHERE rfef_player_id IN (
        1511069, 1506439, 1484975, 1478101, 1511392, 1483756, 1539347, 1539780, 1538318, 1482473,
        1530497, 1527430, 776472, 1542198, 1512131, 1511066, 1500153, 1536882, 1137880, 842751,
        821289, 825906, 33874377, 24616341, 24605065, 826520, 814687, 827875, 1118632, 538479,
        900310644, 828676, 828358, 24679388, 819621, 24674855, 1527276, 1515422, 772817, 1531746,
        1525519, 23917106, 1484390, 1525520, 1541884, 23917110, 1498780, 1542392, 1484386, 25552725,
        900640846, 1481818, 900640848, 1520266, 23519898, 1507893, 1363968, 1500345, 1508938, 1515738,
        1500350, 33855037, 1535788, 1535457, 1504995, 1510843, 1484582, 1539838, 473033, 1478889,
        1534746, 1535380, 1543001, 1480857, 1480276, 1480274, 1514007, 1480281, 1540922, 1502290,
        1480275, 24669393, 1478990, 1542337, 1514226, 1542700, 1540923, 1537336, 1494808, 1540918,
        1516666, 23310438, 1368236, 1367205, 1364175, 1363891, 1365615, 1362725, 1366429, 1363430,
        1363429, 1367227, 1364236, 1364630, 1368730, 1367436, 1368796, 24576616, 1363259, 1367926,
        34071958, 1325857, 809355, 826008, 34042813, 817116, 23323965, 812416, 628729, 825613,
        826382, 818237, 814927, 23327967, 811944, 812205, 34060184, 23492022, 34053553, 900176428,
        1506628, 1515680, 25859579, 1483827, 25120706, 1517904, 1512655, 1521544, 24616827, 1484304,
        1527280, 901384678, 1537486, 1500441, 900176843, 1344835, 948020, 1481562, 24147469, 1507452,
        1542087, 1532709, 23388984, 1535814, 1513856, 1484977, 1139265, 1537414, 1528307, 1528846,
        1526711, 1515474, 1492300, 1541701, 758958, 1050135, 829972, 826990, 4475785, 825653,
        826268, 24150608, 827130, 820847, 1112081, 807944, 841009, 813863, 826993, 847100,
        900459882, 828723, 1536035, 1506997, 1528578, 1479396, 1529142, 1515143, 1537923, 33882160,
        1495737, 23364906, 1501390, 1513332, 1530693, 1482735, 1364289, 1480157, 1492714, 723498,
        4472744, 1483772, 1528890, 1492695, 1514872, 1511828, 1480156, 24446382, 1516059, 1532373,
        1513243, 1534792, 1534376, 1483771, 24674595, 23077000, 1534374, 1364588, 1527285, 1539163,
        900379315, 1515418, 1489183, 1288502, 1492952, 1527283, 900752896, 655417, 1176078, 1287698,
        1512654, 1220291, 900656259
    );

    IF v_total_rfef_233 <> 233 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Conteo total de los 233 rfef_player_id en club_players = % (esperado: 233)', v_total_rfef_233;
    END IF;

    -- D. Cero duplicados globales de rfef_player_id en toda la tabla
    SELECT COUNT(*) INTO v_total_duplicados
    FROM (
        SELECT rfef_player_id, COUNT(*)
        FROM public.club_players
        WHERE rfef_player_id IS NOT NULL
        GROUP BY rfef_player_id
        HAVING COUNT(*) > 1
    ) sub;

    IF v_total_duplicados > 0 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Se detectaron % duplicados globales de rfef_player_id en club_players', v_total_duplicados;
    END IF;

    -- E. Los 5 jugadores documentales de Alavés no convocados siguen intactos (rfef_player_id IS NULL)
    SELECT COUNT(*) INTO v_alaves_no_convocados_check
    FROM public.club_players
    WHERE club_season_id = '5545c49b-0756-4408-9412-e19ce28b75d1'::uuid
      AND id IN (
          'b23f455f-3480-4101-92ba-c02b016bad29'::uuid, -- Leon Morales
          'b29f13be-eb93-433d-8517-006de38b9fc9'::uuid, -- Guillermo Saenz
          'cc387fdf-6a94-49a5-9f7d-3bb8d223442f'::uuid, -- Nikola Carrasco
          '17c16fd5-e09b-42f5-b6e3-793a36e1ad52'::uuid, -- Guillermo Hunt
          '1fc9a037-eb04-444c-b48d-8bc6a3c1474a'::uuid  -- Sergio López Saenz
      )
      AND origen = 'documento'
      AND rfef_player_id IS NULL;

    IF v_alaves_no_convocados_check <> 5 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Los 5 jugadores no convocados de Alavés sufrieron alteraciones (encontrados: %/5)', v_alaves_no_convocados_check;
    END IF;

    -- F. Protección relacional SD Indautxu en postcheck: continúa con exactamente 0 club_players
    SELECT COUNT(*) INTO v_indautxu_check
    FROM public.club_players cp
    JOIN public.club_seasons cs ON cp.club_season_id = cs.id
    JOIN public.clubs c ON cs.club_id = c.id
    WHERE c.rfef_club_id = 33836524;

    IF v_indautxu_check > 0 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Se detectaron % registros de Indautxu en club_players vinculados a clubs.rfef_club_id = 33836524', v_indautxu_check;
    END IF;

    -- G. Piloto 70692430 y sus 36 stats permanecen intactos
    SELECT COUNT(*) INTO v_piloto_match_check
    FROM public.official_matches
    WHERE rfef_cod_acta = 70692430;

    SELECT COUNT(*) INTO v_piloto_stats_check
    FROM public.club_match_player_stats;

    IF v_piloto_match_check <> 1 OR v_piloto_stats_check <> 36 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Piloto 70692430 alterado indebidamente (matches: %, stats: %)', v_piloto_match_check, v_piloto_stats_check;
    END IF;

    -- H. DISTRIBUCIÓN POR CLUB DE LOS 218 RFEF_PLAYER_ID ESPECÍFICOS DEL LOTE J1-E
    -- SD LEIOA (18 altas)
    SELECT COUNT(*) INTO v_dist_check
    FROM public.club_players
    WHERE club_season_id = '59d14dd9-b28b-4f8e-9889-c56f6a2eaeca'::uuid
      AND rfef_player_id IN (1511069, 1506439, 1484975, 1478101, 1511392, 1483756, 1539347, 1539780, 1538318, 1482473, 1530497, 1527430, 776472, 1542198, 1512131, 1511066, 1500153, 1536882);

    IF v_dist_check <> 18 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Distribución errónea en SD LEIOA: esperados 18, encontrados %', v_dist_check;
    END IF;

    -- CULTURAL LEONESA (18 altas)
    SELECT COUNT(*) INTO v_dist_check
    FROM public.club_players
    WHERE club_season_id = '48bafceb-6b77-478d-86d1-5af6ed3d23a2'::uuid
      AND rfef_player_id IN (1137880, 842751, 821289, 825906, 33874377, 24616341, 24605065, 826520, 814687, 827875, 1118632, 538479, 900310644, 828676, 828358, 24679388, 819621, 24674855);

    IF v_dist_check <> 18 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Distribución errónea en CULTURAL LEONESA: esperados 18, encontrados %', v_dist_check;
    END IF;

    -- DEPORTIVO ALAVES (3 altas)
    SELECT COUNT(*) INTO v_dist_check
    FROM public.club_players
    WHERE club_season_id = '5545c49b-0756-4408-9412-e19ce28b75d1'::uuid
      AND rfef_player_id IN (1527276, 1515422, 772817);

    IF v_dist_check <> 3 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Distribución errónea en DEPORTIVO ALAVES: esperados 3, encontrados %', v_dist_check;
    END IF;

    -- ARRATIA (17 altas)
    SELECT COUNT(*) INTO v_dist_check
    FROM public.club_players
    WHERE club_season_id = '32f8b024-b52b-4d49-8cc9-4827cdd6aec6'::uuid
      AND rfef_player_id IN (1531746, 1525519, 23917106, 1484390, 1525520, 1541884, 23917110, 1498780, 1542392, 1484386, 25552725, 900640846, 1481818, 900640848, 1520266, 23519898, 1507893);

    IF v_dist_check <> 17 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Distribución errónea en ARRATIA: esperados 17, encontrados %', v_dist_check;
    END IF;

    -- SANTUTXU FC (18 altas)
    SELECT COUNT(*) INTO v_dist_check
    FROM public.club_players
    WHERE club_season_id = 'eea969ce-45de-43ba-b013-c5bf379be93d'::uuid
      AND rfef_player_id IN (1363968, 1500345, 1508938, 1515738, 1500350, 33855037, 1535788, 1535457, 1504995, 1510843, 1484582, 1539838, 473033, 1478889, 1534746, 1535380, 1543001, 1480857);

    IF v_dist_check <> 18 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Distribución errónea en SANTUTXU FC: esperados 18, encontrados %', v_dist_check;
    END IF;

    -- DANOK BAT (18 altas)
    SELECT COUNT(*) INTO v_dist_check
    FROM public.club_players
    WHERE club_season_id = 'c6e8b8eb-af23-48d3-b1bb-052fffb54815'::uuid
      AND rfef_player_id IN (1480276, 1480274, 1514007, 1480281, 1540922, 1502290, 1480275, 24669393, 1478990, 1542337, 1514226, 1542700, 1540923, 1537336, 1494808, 1540918, 1516666, 23310438);

    IF v_dist_check <> 18 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Distribución errónea en DANOK BAT: esperados 18, encontrados %', v_dist_check;
    END IF;

    -- EF MAREO (18 altas)
    SELECT COUNT(*) INTO v_dist_check
    FROM public.club_players
    WHERE club_season_id = '1fdff3a9-21d1-4f0b-84ec-007e125bb8b3'::uuid
      AND rfef_player_id IN (1368236, 1367205, 1364175, 1363891, 1365615, 1362725, 1366429, 1363430, 1363429, 1367227, 1364236, 1364630, 1368730, 1367436, 1368796, 24576616, 1363259, 1367926);

    IF v_dist_check <> 18 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Distribución errónea en EF MAREO: esperados 18, encontrados %', v_dist_check;
    END IF;

    -- REAL VALLADOLID (18 altas)
    SELECT COUNT(*) INTO v_dist_check
    FROM public.club_players
    WHERE club_season_id = '6383ab39-bae4-4668-80d0-2f8110fa3610'::uuid
      AND rfef_player_id IN (34071958, 1325857, 809355, 826008, 34042813, 817116, 23323965, 812416, 628729, 825613, 826382, 818237, 814927, 23327967, 811944, 812205, 34060184, 23492022);

    IF v_dist_check <> 18 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Distribución errónea en REAL VALLADOLID: esperados 18, encontrados %', v_dist_check;
    END IF;

    -- BETOÑO (18 altas)
    SELECT COUNT(*) INTO v_dist_check
    FROM public.club_players
    WHERE club_season_id = '09ae366d-0822-4344-9b31-edfa833fc776'::uuid
      AND rfef_player_id IN (34053553, 900176428, 1506628, 1515680, 25859579, 1483827, 25120706, 1517904, 1512655, 1521544, 24616827, 1484304, 1527280, 901384678, 1537486, 1500441, 900176843, 1344835);

    IF v_dist_check <> 18 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Distribución errónea en BETOÑO: esperados 18, encontrados %', v_dist_check;
    END IF;

    -- SD EIBAR (18 altas)
    SELECT COUNT(*) INTO v_dist_check
    FROM public.club_players
    WHERE club_season_id = '6d3543e6-2f2c-4d77-8213-3718ff785e53'::uuid
      AND rfef_player_id IN (948020, 1481562, 24147469, 1507452, 1542087, 1532709, 23388984, 1535814, 1513856, 1484977, 1139265, 1537414, 1528307, 1528846, 1526711, 1515474, 1492300, 1541701);

    IF v_dist_check <> 18 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Distribución errónea en SD EIBAR: esperados 18, encontrados %', v_dist_check;
    END IF;

    -- UNIONISTAS SALAMANCA (18 altas)
    SELECT COUNT(*) INTO v_dist_check
    FROM public.club_players
    WHERE club_season_id = '65e71700-f8ee-4d02-bb0a-05d87bed6a35'::uuid
      AND rfef_player_id IN (758958, 1050135, 829972, 826990, 4475785, 825653, 826268, 24150608, 827130, 820847, 1112081, 807944, 841009, 813863, 826993, 847100, 900459882, 828723);

    IF v_dist_check <> 18 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Distribución errónea en UNIONISTAS SALAMANCA: esperados 18, encontrados %', v_dist_check;
    END IF;

    -- ANTIGUOKO KE (18 altas)
    SELECT COUNT(*) INTO v_dist_check
    FROM public.club_players
    WHERE club_season_id = '692b8b68-aa45-4e5e-9547-845eaef03452'::uuid
      AND rfef_player_id IN (1536035, 1506997, 1528578, 1479396, 1529142, 1515143, 1537923, 33882160, 1495737, 23364906, 1501390, 1513332, 1530693, 1482735, 1364289, 1480157, 1492714, 723498);

    IF v_dist_check <> 18 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Distribución errónea en ANTIGUOKO KE: esperados 18, encontrados %', v_dist_check;
    END IF;

    -- REAL SOCIEDAD (18 altas)
    SELECT COUNT(*) INTO v_dist_check
    FROM public.club_players
    WHERE club_season_id = '9e01cbcd-e3f5-4208-bd84-4fda4e34a068'::uuid
      AND rfef_player_id IN (4472744, 1483772, 1528890, 1492695, 1514872, 1511828, 1480156, 24446382, 1516059, 1532373, 1513243, 1534792, 1534376, 1483771, 24674595, 23077000, 1534374, 1364588);

    IF v_dist_check <> 18 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Distribución errónea en REAL SOCIEDAD: esperados 18, encontrados %', v_dist_check;
    END IF;

    -- I. Plantilla propia players permanece intacta (27 registros)
    IF (SELECT COUNT(*) FROM public.players) <> 27 THEN
        RAISE EXCEPTION '[POSTCHECK FALLIDO] Tabla de jugadores propios (players) alterada indebidamente';
    END IF;

    RAISE NOTICE '============================================================';
    RAISE NOTICE '   RFEF · J1-E.1 · TRANSACCIÓN VALIDADA EXITOSAMENTE (PASS) ';
    RAISE NOTICE '   - 218 Altas RFEF creadas con origen=rfef                 ';
    RAISE NOTICE '   - 15 Futbolistas Alavés vinculados con origen=documento  ';
    RAISE NOTICE '   - 233 rfef_player_id únicos asignados                    ';
    RAISE NOTICE '   - 5 Futbolistas Alavés no convocados intactos            ';
    RAISE NOTICE '   - SD Indautxu relacionalmente con 0 club_players         ';
    RAISE NOTICE '   - Análisis Propio y tabla players 100%% intactos         ';
    RAISE NOTICE '   - Piloto 70692430 y 36 estadísticas intactos             ';
    RAISE NOTICE '============================================================';
END $$;
