-- ============================================================================
-- MIGRACIÓN DEFENSIVA J1-F.2 (V2 DEFINITIVA): IMPORTACIÓN DE LOS 7 PARTIDOS RESTANTES DE J1
-- División de Honor Juvenil - Grupo 2 (Temporada 2026-27)
-- 
-- PARTIDOS INCLUIDOS (7):
-- 1. 70692424: DEPORTIVO ALAVÉS (5) vs ARRATIA (0)             [35 stats: 18 + 17]
-- 2. 70692425: SD LEIOA (4) vs CULTURAL LEONESA (2)            [36 stats: 18 + 18]
-- 3. 70692426: SANTUTXU FC (1) vs DANOK BAT (1)                [36 stats: 18 + 18]
-- 4. 70692427: REAL SOCIEDAD (5) vs SD INDAUTXU (1)           [18 stats: 18 + 0 (Indautxu propio)]
-- 5. 70692428: EF MAREO (3) vs REAL VALLADOLID (10)            [36 stats: 18 + 18]
-- 6. 70692429: BETOÑO (1) vs SD EIBAR (2)                      [36 stats: 18 + 18]
-- 7. 70692431: UNIONISTAS SALAMANCA (2) vs ANTIGUOKO KE (2)    [36 stats: 18 + 18]
--
-- TOTAL FILAS A INSERTAR:
-- - official_matches: 7 filas (UUID generado automáticamente por PostgreSQL)
-- - club_match_player_stats: 233 filas
--
-- ESTADO FINAL ESPERADO EN SUPABASE:
-- - official_matches: exactamente 8 filas (1 piloto + 7 nuevos)
-- - club_match_player_stats: exactamente 269 filas (36 piloto + 233 nuevos)
--
-- PROTECCIONES RELACIONALES OBLIGATORIAS:
-- - PRECHECK y POSTCHECK verifican la tupla relacional (rfef_player_id + rfef_club_id):
--   club_players -> club_seasons -> clubs
--   Cualquier jugador que no pertenezca estrictamente al club de la estadística aborta la transacción.
-- - Piloto 70692430 Athletic–UD Logroñés y sus 36 stats: TOTALMENTE PROTEGIDO E INTACTO
-- - SD Indautxu (rfef_club_id=33836524): 0 club_players, 0 stats en club_match_player_stats
-- - Plantilla propia public.players: TOTALMENTE INTACTA (27 registros)
-- - Transaccional en bloque DO $$ ... $$ con rollback completo ante cualquier excepción
-- ============================================================================

DO $$
DECLARE
    -- Variables de control y verificación
    v_count_matches INTEGER;
    v_count_stats INTEGER;
    v_count_players INTEGER;
    v_pilot_match_id UUID;
    v_pilot_stats_count INTEGER;
    v_indautxu_club_id UUID;
    v_indautxu_players_count INTEGER;
    v_indautxu_stats_count INTEGER;
    v_own_players_count INTEGER;
    
    -- Variables UUID para los 7 partidos (generados por PostgreSQL al insertar)
    v_match_id_70692424 UUID;
    v_match_id_70692425 UUID;
    v_match_id_70692426 UUID;
    v_match_id_70692427 UUID;
    v_match_id_70692428 UUID;
    v_match_id_70692429 UUID;
    v_match_id_70692431 UUID;

    -- Variables de clubes
    v_club_205484 UUID; -- DEPORTIVO ALAVES
    v_club_33836523 UUID; -- ARRATIA
    v_club_23289700 UUID; -- SD LEIOA
    v_club_33836521 UUID; -- CULTURAL LEONESA
    v_club_205567 UUID; -- SANTUTXU FC
    v_club_900361152 UUID; -- DANOK BAT
    v_club_205597 UUID; -- REAL SOCIEDAD
    v_club_33836524 UUID; -- SD INDAUTXU
    v_club_33836522 UUID; -- EF MAREO
    v_club_205459 UUID; -- REAL VALLADOLID
    v_club_23289793 UUID; -- BETOÑO
    v_club_205540 UUID; -- SD EIBAR
    v_club_207449 UUID; -- UNIONISTAS SALAMANCA
    v_club_205603 UUID; -- ANTIGUOKO KE

    -- Variables de comprobación postcheck
    v_check_count INTEGER;
    v_sum_minutos INTEGER;
    v_sum_goles INTEGER;
    v_sum_amarillas INTEGER;
    v_sum_rojas INTEGER;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'INICIANDO VALIDACIONES PREVIAS (PRECHECKS) J1-F.2...';
    RAISE NOTICE '=======================================================';

    -- ----------------------------------------------------------------
    -- PRECHECK 1: PILOTO 70692430 Y SUS 36 STATS ESTÁN PRESENTES E INTACTOS
    -- ----------------------------------------------------------------
    SELECT id INTO v_pilot_match_id 
    FROM public.official_matches 
    WHERE rfef_cod_acta = 70692430;

    IF v_pilot_match_id IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: No se encontró el partido piloto 70692430 en official_matches.';
    END IF;

    SELECT COUNT(*) INTO v_pilot_stats_count 
    FROM public.club_match_player_stats 
    WHERE official_match_id = v_pilot_match_id;

    IF v_pilot_stats_count <> 36 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: El partido piloto 70692430 debe tener exactamente 36 estadísticas (encontradas: %).', v_pilot_stats_count;
    END IF;
    RAISE NOTICE '-> PRECHECK 1 OK: Piloto 70692430 intacto con 36 estadísticas.';

    -- ----------------------------------------------------------------
    -- PRECHECK 2: LOS 7 CODACTA NO EXISTEN EN official_matches
    -- ----------------------------------------------------------------
    SELECT COUNT(*) INTO v_count_matches 
    FROM public.official_matches 
    WHERE rfef_cod_acta IN (70692424, 70692425, 70692426, 70692427, 70692428, 70692429, 70692431);

    IF v_count_matches > 0 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Alguno de los 7 codActa ya existe en official_matches (encontrados: %).', v_count_matches;
    END IF;
    RAISE NOTICE '-> PRECHECK 2 OK: 0 de los 7 codActa existen actualmente en official_matches.';

    -- ----------------------------------------------------------------
    -- PRECHECK 3: RESOLUCIÓN ESTRICTA DE LOS 14 CLUBES POR rfef_club_id
    -- ----------------------------------------------------------------
    SELECT id INTO v_club_205484 FROM public.clubs WHERE rfef_club_id = 205484;
    IF v_club_205484 IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club con rfef_club_id = % (%) no existe en public.clubs.', 205484, 'DEPORTIVO ALAVES';
    END IF;
    SELECT id INTO v_club_33836523 FROM public.clubs WHERE rfef_club_id = 33836523;
    IF v_club_33836523 IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club con rfef_club_id = % (%) no existe en public.clubs.', 33836523, 'ARRATIA';
    END IF;
    SELECT id INTO v_club_23289700 FROM public.clubs WHERE rfef_club_id = 23289700;
    IF v_club_23289700 IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club con rfef_club_id = % (%) no existe en public.clubs.', 23289700, 'SD LEIOA';
    END IF;
    SELECT id INTO v_club_33836521 FROM public.clubs WHERE rfef_club_id = 33836521;
    IF v_club_33836521 IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club con rfef_club_id = % (%) no existe en public.clubs.', 33836521, 'CULTURAL LEONESA';
    END IF;
    SELECT id INTO v_club_205567 FROM public.clubs WHERE rfef_club_id = 205567;
    IF v_club_205567 IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club con rfef_club_id = % (%) no existe en public.clubs.', 205567, 'SANTUTXU FC';
    END IF;
    SELECT id INTO v_club_900361152 FROM public.clubs WHERE rfef_club_id = 900361152;
    IF v_club_900361152 IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club con rfef_club_id = % (%) no existe en public.clubs.', 900361152, 'DANOK BAT';
    END IF;
    SELECT id INTO v_club_205597 FROM public.clubs WHERE rfef_club_id = 205597;
    IF v_club_205597 IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club con rfef_club_id = % (%) no existe en public.clubs.', 205597, 'REAL SOCIEDAD';
    END IF;
    SELECT id INTO v_club_33836524 FROM public.clubs WHERE rfef_club_id = 33836524;
    IF v_club_33836524 IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club con rfef_club_id = % (%) no existe en public.clubs.', 33836524, 'SD INDAUTXU';
    END IF;
    SELECT id INTO v_club_33836522 FROM public.clubs WHERE rfef_club_id = 33836522;
    IF v_club_33836522 IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club con rfef_club_id = % (%) no existe en public.clubs.', 33836522, 'EF MAREO';
    END IF;
    SELECT id INTO v_club_205459 FROM public.clubs WHERE rfef_club_id = 205459;
    IF v_club_205459 IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club con rfef_club_id = % (%) no existe en public.clubs.', 205459, 'REAL VALLADOLID';
    END IF;
    SELECT id INTO v_club_23289793 FROM public.clubs WHERE rfef_club_id = 23289793;
    IF v_club_23289793 IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club con rfef_club_id = % (%) no existe en public.clubs.', 23289793, 'BETOÑO';
    END IF;
    SELECT id INTO v_club_205540 FROM public.clubs WHERE rfef_club_id = 205540;
    IF v_club_205540 IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club con rfef_club_id = % (%) no existe en public.clubs.', 205540, 'SD EIBAR';
    END IF;
    SELECT id INTO v_club_207449 FROM public.clubs WHERE rfef_club_id = 207449;
    IF v_club_207449 IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club con rfef_club_id = % (%) no existe en public.clubs.', 207449, 'UNIONISTAS SALAMANCA';
    END IF;
    SELECT id INTO v_club_205603 FROM public.clubs WHERE rfef_club_id = 205603;
    IF v_club_205603 IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Club con rfef_club_id = % (%) no existe en public.clubs.', 205603, 'ANTIGUOKO KE';
    END IF;
    RAISE NOTICE '-> PRECHECK 3 OK: Los 14 clubes resueltos unívocamente por rfef_club_id.';

    -- ----------------------------------------------------------------
    -- PRECHECK 4: SD INDAUTXU PROTEGIDO (TIPO PROPIO, 0 JUGADORES EN club_players)
    -- ----------------------------------------------------------------
    SELECT id INTO v_indautxu_club_id 
    FROM public.clubs 
    WHERE rfef_club_id = 33836524 AND tipo = 'PROPIO';

    IF v_indautxu_club_id IS NULL THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: SD INDAUTXU no existe en public.clubs con rfef_club_id=33836524 y tipo=PROPIO.';
    END IF;

    SELECT COUNT(cp.id) INTO v_indautxu_players_count
    FROM public.club_players cp
    JOIN public.club_seasons cs ON cs.id = cp.club_season_id
    WHERE cs.club_id = v_indautxu_club_id;

    IF v_indautxu_players_count > 0 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: SD INDAUTXU tiene % jugadores en club_players (debe ser estrictamente 0).', v_indautxu_players_count;
    END IF;
    RAISE NOTICE '-> PRECHECK 4 OK: SD INDAUTXU verificado con tipo=PROPIO y exactamente 0 club_players.';

    -- ----------------------------------------------------------------
    -- PRECHECK 5: PLANTILLA PROPIA public.players INTACTA (EXACTAMENTE 27)
    -- ----------------------------------------------------------------
    SELECT COUNT(*) INTO v_own_players_count FROM public.players;
    IF v_own_players_count <> 27 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: La tabla propia public.players no tiene 27 filas (encontradas: %).', v_own_players_count;
    END IF;
    RAISE NOTICE '-> PRECHECK 5 OK: Tabla propia public.players intacta con exactamente 27 filas.';

    -- ----------------------------------------------------------------
    -- PRECHECK 6: VERIFICACIÓN RELACIONAL JUGADOR <-> CLUB DE LOS 233 REGISTROS
    -- Cada rfef_player_id debe existir y pertenecer exactamente al club_id esperado
    -- ----------------------------------------------------------------
    SELECT COUNT(*) INTO v_count_players
    FROM (
        VALUES
            (1527285, 205484) /* FERNANDEZ DE ZAÑARTU ANSORREGUI, JOKIN -> DEPORTIVO ALAVES */,
            (1527276, 205484) /* BEOBIDE SAENZ DE PIPAON, MAREN AIMAR -> DEPORTIVO ALAVES */,
            (1539163, 205484) /* VIVIAN SANCHEZ, GABRIEL -> DEPORTIVO ALAVES */,
            (900379315, 205484) /* OGHOMWENOTITI IKPEKHIA, EDEOGHOGHO PROMISE -> DEPORTIVO ALAVES */,
            (1515418, 205484) /* SAEZ FERNANDEZ, ALBERTO -> DEPORTIVO ALAVES */,
            (1489183, 205484) /* ZAMORA SAEZ, IMANOL -> DEPORTIVO ALAVES */,
            (1288502, 205484) /* ESTEBAN HERNANDEZ, JORGE -> DEPORTIVO ALAVES */,
            (1492952, 205484) /* HASSANI ZINEDINE, SOHAIB -> DEPORTIVO ALAVES */,
            (1527283, 205484) /* SUBERVIOLA CANTERA, HUGO -> DEPORTIVO ALAVES */,
            (900752896, 205484) /* CIPRIAN GARABITO, BRYAN SCOOTT -> DEPORTIVO ALAVES */,
            (655417, 205484) /* DOMINGO RUPEREZ, IKER -> DEPORTIVO ALAVES */,
            (1515422, 205484) /* MUGICA VICARIO, OIER -> DEPORTIVO ALAVES */,
            (772817, 205484) /* LOPEZ BERODIA, DARIO -> DEPORTIVO ALAVES */,
            (1176078, 205484) /* RAMIREZ GARCIA, JAVIER -> DEPORTIVO ALAVES */,
            (1287698, 205484) /* SAN PIO GALAN, NICOLAS -> DEPORTIVO ALAVES */,
            (1512654, 205484) /* MONTERO MARQUINEZ, OIER -> DEPORTIVO ALAVES */,
            (1220291, 205484) /* OKORIE IGIDI, IVAN -> DEPORTIVO ALAVES */,
            (900656259, 205484) /* LOBATO HERRERO, IKER -> DEPORTIVO ALAVES */,
            (1531746, 33836523) /* EGILUZ DOMINGUEZ, MARKEL -> ARRATIA */,
            (1525519, 33836523) /* OLABARRI ARANGUREN, EKI -> ARRATIA */,
            (23917106, 33836523) /* ESKALZA URTIAGA, XUBAN -> ARRATIA */,
            (1484390, 33836523) /* BARRENETXEA ZULOAGA, JULEN -> ARRATIA */,
            (1525520, 33836523) /* ISPIZUA URRUTXUA, UNAI -> ARRATIA */,
            (1541884, 33836523) /* GONZALEZ DE ETXABARRI ALONSO, IBON -> ARRATIA */,
            (23917110, 33836523) /* ARTETXE BELAUSTEGI, IKER -> ARRATIA */,
            (1498780, 33836523) /* GARCIA PARGA, JON -> ARRATIA */,
            (1542392, 33836523) /* JUARROS MANTEROLA, OIER -> ARRATIA */,
            (1484386, 33836523) /* LEGARRETA RIOS, LUKEN -> ARRATIA */,
            (25552725, 33836523) /* INTXAURRAGA SERNA, ENAITZ -> ARRATIA */,
            (900640846, 33836523) /* ZULUAGA ETXEBARRIA, IZORTZ -> ARRATIA */,
            (1481818, 33836523) /* BRAVO MAGDALENO, ALFONSO -> ARRATIA */,
            (900640848, 33836523) /* ZAUTUA BIZKARGUENAGA, AIMAR -> ARRATIA */,
            (1520266, 33836523) /* ALCAIRE COSTA, IBAI -> ARRATIA */,
            (23519898, 33836523) /* IZAGIRRE ZENIKAZELAIA, OIHAN -> ARRATIA */,
            (1507893, 33836523) /* GOTI IZAGUIRRE, URKO -> ARRATIA */,
            (1511069, 23289700) /* TORRONTEGUI DIAS, GAIZKA -> SD LEIOA */,
            (1506439, 23289700) /* ZUAZO MUELA, MARTIN -> SD LEIOA */,
            (1484975, 23289700) /* TORRES IBAÑEZ DE MAEZTU, ALEX -> SD LEIOA */,
            (1478101, 23289700) /* BIDAURRAZAGA MORGADO, ASIER -> SD LEIOA */,
            (1511392, 23289700) /* GALDEANO BARANDIKA, IKER -> SD LEIOA */,
            (1483756, 23289700) /* DE ABAJO LOPEZ, BEÑAT -> SD LEIOA */,
            (1539347, 23289700) /* PEREZ RODRIGUEZ, IÑIGO -> SD LEIOA */,
            (1539780, 23289700) /* GUTIERREZ CASTAÑEIRA, PAUL -> SD LEIOA */,
            (1538318, 23289700) /* SANTAMARIA MARTINEZ, KERMAN -> SD LEIOA */,
            (1482473, 23289700) /* GOIKOETXEA OTAOLA, JULEN -> SD LEIOA */,
            (1530497, 23289700) /* VIVANCO MIGUEL, DANEL -> SD LEIOA */,
            (1527430, 23289700) /* GARCIA DELGADO, MARKEL -> SD LEIOA */,
            (776472, 23289700) /* MIQUELARENA VIZCAYA, ANDONI -> SD LEIOA */,
            (1542198, 23289700) /* ANTOLIN ARMENTEROS, MARKEL -> SD LEIOA */,
            (1512131, 23289700) /* DEL RIO ESPARZA, EKAIN -> SD LEIOA */,
            (1511066, 23289700) /* LOPEZ KORTA, GORKA -> SD LEIOA */,
            (1500153, 23289700) /* RAMOS BERDOTE, MARKEL -> SD LEIOA */,
            (1536882, 23289700) /* CARBAJO ANCHIA, GORKA -> SD LEIOA */,
            (1137880, 33836521) /* EIRIZ GONZALEZ, LUCAS -> CULTURAL LEONESA */,
            (842751, 33836521) /* GONZALEZ CACHAN, SERGIO -> CULTURAL LEONESA */,
            (821289, 33836521) /* LAFUENTE SARMIENTO, MARIO -> CULTURAL LEONESA */,
            (825906, 33836521) /* IBAÑEZ POTES, MANUEL -> CULTURAL LEONESA */,
            (33874377, 33836521) /* PAPA FALEFE, SY -> CULTURAL LEONESA */,
            (24616341, 33836521) /* ROJO BREA, PABLO -> CULTURAL LEONESA */,
            (24605065, 33836521) /* GARCIA GUTIERREZ, HUGO -> CULTURAL LEONESA */,
            (826520, 33836521) /* RODRIGO CARO, MARCO -> CULTURAL LEONESA */,
            (814687, 33836521) /* ALVAREZ MARTINEZ, DANIEL -> CULTURAL LEONESA */,
            (827875, 33836521) /* LARRAURI GONÇALVES, GAIZKA -> CULTURAL LEONESA */,
            (1118632, 33836521) /* DIAZ ALEJO, BORJA -> CULTURAL LEONESA */,
            (538479, 33836521) /* FLORES OSORIO, HUGO -> CULTURAL LEONESA */,
            (900310644, 33836521) /* VELASCO RODRIGUEZ, DIEGO -> CULTURAL LEONESA */,
            (828676, 33836521) /* FERNANDEZ ALONSO, BELTRAN -> CULTURAL LEONESA */,
            (828358, 33836521) /* MARTINEZ OCHOA, ANGEL -> CULTURAL LEONESA */,
            (24679388, 33836521) /* GARCIA SOTORRIO, JORGE -> CULTURAL LEONESA */,
            (819621, 33836521) /* SEOANE CASTRO, JUAN -> CULTURAL LEONESA */,
            (24674855, 33836521) /* IGLESIAS FERNANDEZ, IZAN -> CULTURAL LEONESA */,
            (1363968, 205567) /* ALONSO TORRECILLA, VICTOR -> SANTUTXU FC */,
            (1500345, 205567) /* REGO MORA, DIEGO -> SANTUTXU FC */,
            (1508938, 205567) /* GARCIA FERNANDEZ, OIER -> SANTUTXU FC */,
            (1515738, 205567) /* URRESTI RECIO, ALEX JHOVANNY -> SANTUTXU FC */,
            (1500350, 205567) /* VEGA PRIETO, IKER -> SANTUTXU FC */,
            (33855037, 205567) /* GIRALDO AMAYA, SEBASTIAN -> SANTUTXU FC */,
            (1535788, 205567) /* MARTIN BARTOLOME, GORKA -> SANTUTXU FC */,
            (1535457, 205567) /* EGUIDAZU PINILLA, ASIER -> SANTUTXU FC */,
            (1504995, 205567) /* DUQUE MICOLTA, URTZI -> SANTUTXU FC */,
            (1510843, 205567) /* ORTEGA HENALES, IBAI -> SANTUTXU FC */,
            (1484582, 205567) /* ASUMU ANGONO, SERGIO NDONG -> SANTUTXU FC */,
            (1539838, 205567) /* ESTEBAN SAN ROMAN, ANGEL -> SANTUTXU FC */,
            (473033, 205567) /* CABALLERO TENA, DIEGO -> SANTUTXU FC */,
            (1478889, 205567) /* PORTILLO RUBIN, XABIER -> SANTUTXU FC */,
            (1534746, 205567) /* HERRERA NAVAS, ANDER -> SANTUTXU FC */,
            (1535380, 205567) /* LEON GARCIA, LUCAS -> SANTUTXU FC */,
            (1543001, 205567) /* IRAZABAL VADILLO, LINO -> SANTUTXU FC */,
            (1480857, 205567) /* RODRIGUEZ ALVAREZ, SENDOA -> SANTUTXU FC */,
            (1480276, 900361152) /* EZKERRA HERRERO, XABIER -> DANOK BAT */,
            (1480274, 900361152) /* FERNANDEZ AYALA, UNAI -> DANOK BAT */,
            (1514007, 900361152) /* OSIPOV, SEBASTIAN -> DANOK BAT */,
            (1480281, 900361152) /* SANTAMARIA FERRERO, ARITZ -> DANOK BAT */,
            (1540922, 900361152) /* MARTELL SERRANO, AIMAR -> DANOK BAT */,
            (1502290, 900361152) /* FELIZ FERNANDEZ, SAUL -> DANOK BAT */,
            (1480275, 900361152) /* BAPTISTA BASTERRA, JAVIER -> DANOK BAT */,
            (24669393, 900361152) /* LOPEZ SILVA, HUGO JOHAN -> DANOK BAT */,
            (1478990, 900361152) /* ETXABE SAN JOSE, OIER -> DANOK BAT */,
            (1542337, 900361152) /* DIAZ PEREZ, IBAI -> DANOK BAT */,
            (1514226, 900361152) /* SERRANO ACERO, IKER -> DANOK BAT */,
            (1542700, 900361152) /* ITURRALDE ALVAREZ, DANEL -> DANOK BAT */,
            (1540923, 900361152) /* GARCIA SANTAMARIA, OIER -> DANOK BAT */,
            (1537336, 900361152) /* ESCANCIANO MUGURUZA, TELMO -> DANOK BAT */,
            (1494808, 900361152) /* MORENO IBARLOZA, DANEL -> DANOK BAT */,
            (1540918, 900361152) /* GONZALEZ MORA, SERGIO -> DANOK BAT */,
            (1516666, 900361152) /* VALDIVIELSO TRINCHE, ENEKO -> DANOK BAT */,
            (23310438, 900361152) /* DE LECEA CIGARAN, FRANCISCO DE ASIS -> DANOK BAT */,
            (4472744, 205597) /* AZKARRAGA ARROSPIDE, UNAX -> REAL SOCIEDAD */,
            (1483772, 205597) /* PEREZ ARANDIA, ALAR -> REAL SOCIEDAD */,
            (1528890, 205597) /* ORUEZABAL AMONDARAIN, OIER -> REAL SOCIEDAD */,
            (1492695, 205597) /* MARTIN ARTOLA, MANEX -> REAL SOCIEDAD */,
            (1514872, 205597) /* MUGICA TORRES, YERAY -> REAL SOCIEDAD */,
            (1511828, 205597) /* AYALA DE LOS MOZOS, ALEX -> REAL SOCIEDAD */,
            (1480156, 205597) /* ECHARRI JAREÑO, XABIER -> REAL SOCIEDAD */,
            (24446382, 205597) /* GOROSTIZAGA UBARRECHENA, TELMO -> REAL SOCIEDAD */,
            (1516059, 205597) /* SOLANA TOMAS, UNAI -> REAL SOCIEDAD */,
            (1532373, 205597) /* LOZANO ULECIA, IVAN -> REAL SOCIEDAD */,
            (1513243, 205597) /* SANTANA PIKABEA, JOEL -> REAL SOCIEDAD */,
            (1534792, 205597) /* BUSTAMANTE DAVILA, DANIEL -> REAL SOCIEDAD */,
            (1534376, 205597) /* ALDASORO SARRIEGI, BEÑAT -> REAL SOCIEDAD */,
            (1483771, 205597) /* FERNANDEZ BAYO, PABLO -> REAL SOCIEDAD */,
            (24674595, 205597) /* DE LUCAS GARCIA, XANET -> REAL SOCIEDAD */,
            (23077000, 205597) /* MEHMETI, DION -> REAL SOCIEDAD */,
            (1534374, 205597) /* ALBIZU AGUDO, IKER -> REAL SOCIEDAD */,
            (1364588, 205597) /* IBAÑEZ MINGUEZ, PEDRO -> REAL SOCIEDAD */,
            (1368236, 33836522) /* GUTIERREZ BLANCO, JOSE -> EF MAREO */,
            (1367205, 33836522) /* FABIAN HERRAIZ, PABLO -> EF MAREO */,
            (1364175, 33836522) /* HERNANDEZ BELLIDO, UNAX -> EF MAREO */,
            (1363891, 33836522) /* PINILLA CIAURRI, IZAN -> EF MAREO */,
            (1365615, 33836522) /* ARRIAGA RUIZ E, MIKEL -> EF MAREO */,
            (1362725, 33836522) /* RUIZ NAVARRO PABLO, SIMON -> EF MAREO */,
            (1366429, 33836522) /* RIERA MERINO, MATEO -> EF MAREO */,
            (1363430, 33836522) /* GARCIA CASTILLO, DANIEL -> EF MAREO */,
            (1363429, 33836522) /* DE MIGUEL LLORACH, ERIC -> EF MAREO */,
            (1367227, 33836522) /* FERNANDEZ NESTARES, SAUL -> EF MAREO */,
            (1364236, 33836522) /* GARCIA VILLAREAL, ADRIAN -> EF MAREO */,
            (1364630, 33836522) /* GARRIDO OLIVAN, ISMAEL -> EF MAREO */,
            (1368730, 33836522) /* FERNÁNDEZ SIERRA, LUCAS -> EF MAREO */,
            (1367436, 33836522) /* MARIN NOGUERA, ALVARO -> EF MAREO */,
            (1368796, 33836522) /* LEON MARZO, MATEO -> EF MAREO */,
            (24576616, 33836522) /* RUIZ DA CRUZ, DAVID -> EF MAREO */,
            (1363259, 33836522) /* VIZCAINO FERNANDEZ, FERRAN -> EF MAREO */,
            (1367926, 33836522) /* SAENZ FERNANDEZ, ALVARO -> EF MAREO */,
            (34071958, 205459) /* MIHAYLOV, STEFAN STEFANOV -> REAL VALLADOLID */,
            (1325857, 205459) /* GARCÍA JIMÉNEZ, ÁLVARO -> REAL VALLADOLID */,
            (809355, 205459) /* BENITEZ HUSILLOS, CARLOS -> REAL VALLADOLID */,
            (826008, 205459) /* MOLLEDA ALONSO, KILIAN -> REAL VALLADOLID */,
            (34042813, 205459) /* SYLLA, VASSERI -> REAL VALLADOLID */,
            (817116, 205459) /* MARTIN SERNA, MARIO -> REAL VALLADOLID */,
            (23323965, 205459) /* FERNÁNDEZ CRUZ, MARCOS -> REAL VALLADOLID */,
            (812416, 205459) /* ESTEBAN ALVAREZ, SERGIO -> REAL VALLADOLID */,
            (628729, 205459) /* IGUAZ OLMOS, ALEJANDRO -> REAL VALLADOLID */,
            (825613, 205459) /* MERINO CAPARROS, SERGIO -> REAL VALLADOLID */,
            (826382, 205459) /* OLANDIA SANCHEZ, JAVIER -> REAL VALLADOLID */,
            (818237, 205459) /* MARTÍNEZ BARRIO, JUAN -> REAL VALLADOLID */,
            (814927, 205459) /* FRAILE GONZÁLEZ, ALBERTO -> REAL VALLADOLID */,
            (23327967, 205459) /* DE LUCAS GARCÍA, PABLO -> REAL VALLADOLID */,
            (811944, 205459) /* ESCALADA MARTINEZ, ALEJANDRO -> REAL VALLADOLID */,
            (812205, 205459) /* ZAPATERO FERNANDEZ, ALEJANDRO -> REAL VALLADOLID */,
            (34060184, 205459) /* KANTA, MOHAMED -> REAL VALLADOLID */,
            (23492022, 205459) /* DIAGNE SARR, MAMADOU LAMINE -> REAL VALLADOLID */,
            (34053553, 23289793) /* MAYE EBO, LEUDIS -> BETOÑO */,
            (900176428, 23289793) /* BOYANO DELGADO, ALAIN -> BETOÑO */,
            (1506628, 23289793) /* ECHEVARRIA MENDOZA, ANTTON -> BETOÑO */,
            (1515680, 23289793) /* ORAA ORTIZ DE MENDIBIL, MARKEL -> BETOÑO */,
            (25859579, 23289793) /* GRAJALES BEIZTEGUI, OIER -> BETOÑO */,
            (1483827, 23289793) /* BRAHIM BEZEID, MOHAMED -> BETOÑO */,
            (25120706, 23289793) /* BENAISSA AGBALOU, HAYTAM -> BETOÑO */,
            (1517904, 23289793) /* BARREÑA SAEZ DE CAMARA, ASIER -> BETOÑO */,
            (1512655, 23289793) /* CASTAÑO ORTIZ DE URBINA, UNAX -> BETOÑO */,
            (1521544, 23289793) /* FRANCES VAZQUEZ, ARGOITZ -> BETOÑO */,
            (24616827, 23289793) /* MARTINEZ CALDERON, OSCAR -> BETOÑO */,
            (1484304, 23289793) /* SANTIAGO SOLETO, MARKEL -> BETOÑO */,
            (1527280, 23289793) /* DE SOUSA FERNANDEZ, JON -> BETOÑO */,
            (901384678, 23289793) /* DIARRA SOUMANO, TIEMOKO -> BETOÑO */,
            (1537486, 23289793) /* ARCHI BEZIOUI, RAYAN -> BETOÑO */,
            (1500441, 23289793) /* SAEZ RUBINA, URKO -> BETOÑO */,
            (900176843, 23289793) /* GARCIA CASTRO, HUGO -> BETOÑO */,
            (1344835, 23289793) /* GARBAYO MAULEON, HUGO -> BETOÑO */,
            (948020, 205540) /* AGUILERA GARCÍA, NICO -> SD EIBAR */,
            (1481562, 205540) /* IRISARRI ALAMINO, EKHI -> SD EIBAR */,
            (24147469, 205540) /* NAVARRO GUTIERREZ, MARCOS -> SD EIBAR */,
            (1507452, 205540) /* ITURRI BENGOECHEA, JON -> SD EIBAR */,
            (1542087, 205540) /* ABRALDES AZKORBEBEITIA, ANARTZ -> SD EIBAR */,
            (1532709, 205540) /* VILLENA ARANDIA, OROITZ -> SD EIBAR */,
            (23388984, 205540) /* ONDO ELA, DALMACIO -> SD EIBAR */,
            (1535814, 205540) /* SUKIA YABEN, ETXAHUN -> SD EIBAR */,
            (1513856, 205540) /* HIERRO ALDAZABAL, ANDER -> SD EIBAR */,
            (1484977, 205540) /* CRESPO SANCHEZ, HUGO -> SD EIBAR */,
            (1139265, 205540) /* PINTOS VAZQUEZ, JUAN -> SD EIBAR */,
            (1537414, 205540) /* PRADERA RODRIGUEZ, UNAX -> SD EIBAR */,
            (1528307, 205540) /* GOMEZ MURILLO, MIKEL -> SD EIBAR */,
            (1528846, 205540) /* GARMENDIA BERZAL, MARKEL -> SD EIBAR */,
            (1526711, 205540) /* IRIONDO LETURIA, EKHI -> SD EIBAR */,
            (1515474, 205540) /* VAZQUEZ LLONA, AIMAR -> SD EIBAR */,
            (1492300, 205540) /* LOPEZ LOPEZ, UNAI -> SD EIBAR */,
            (1541701, 205540) /* UNANUE ARMENDARIZ, ANER -> SD EIBAR */,
            (758958, 207449) /* LAGO FERNANDEZ, MATIAS -> UNIONISTAS SALAMANCA */,
            (1050135, 207449) /* RUIZ RANGEL, ALVARO -> UNIONISTAS SALAMANCA */,
            (829972, 207449) /* SANCHEZ RUANO, NICOLAS -> UNIONISTAS SALAMANCA */,
            (826990, 207449) /* LOPEZ DE LA IGLESIA, PEDRO -> UNIONISTAS SALAMANCA */,
            (4475785, 207449) /* MARTIN GARCIA, OSCAR -> UNIONISTAS SALAMANCA */,
            (825653, 207449) /* CASADO SASTRE, IVÁN -> UNIONISTAS SALAMANCA */,
            (826268, 207449) /* GONZALEZ GOMEZ, MARIO -> UNIONISTAS SALAMANCA */,
            (24150608, 207449) /* VIÑUELA SACRISTAN, AITOR -> UNIONISTAS SALAMANCA */,
            (827130, 207449) /* SANCHEZ GALA, PABLO -> UNIONISTAS SALAMANCA */,
            (820847, 207449) /* MARTIN POBLACION, PABLO -> UNIONISTAS SALAMANCA */,
            (1112081, 207449) /* RODRIGUEZ LOPEZ, XAVI -> UNIONISTAS SALAMANCA */,
            (807944, 207449) /* BARRIO QUINTERO, VICTOR -> UNIONISTAS SALAMANCA */,
            (841009, 207449) /* FERNANDEZ CABANES, GINES JAVIER -> UNIONISTAS SALAMANCA */,
            (813863, 207449) /* CHOKRAFI ELAYAT, OUALID -> UNIONISTAS SALAMANCA */,
            (826993, 207449) /* SÁNCHEZ MARTÍN, ADRIÁN -> UNIONISTAS SALAMANCA */,
            (847100, 207449) /* RAMOS GOMEZ, HECTOR -> UNIONISTAS SALAMANCA */,
            (900459882, 207449) /* GOMEZ MARTIN, PABLO -> UNIONISTAS SALAMANCA */,
            (828723, 207449) /* CORRALES GUZMAN, ALEJANDRO -> UNIONISTAS SALAMANCA */,
            (1536035, 205603) /* ALBISU JAUREGI, UHAITZ -> ANTIGUOKO KE */,
            (1506997, 205603) /* LOPETEGUI ZATARAIN, ANER -> ANTIGUOKO KE */,
            (1528578, 205603) /* VITORIA SAN SEBASTIAN, UNAX -> ANTIGUOKO KE */,
            (1479396, 205603) /* ENPARANTZA ALUSTIZA, AIMAR -> ANTIGUOKO KE */,
            (1529142, 205603) /* ASEGUINOLAZA MATEOS, ALVARO -> ANTIGUOKO KE */,
            (1515143, 205603) /* RUBIO ALONSO, OIHAN -> ANTIGUOKO KE */,
            (1537923, 205603) /* SAIZAR DIAZ, UNAX -> ANTIGUOKO KE */,
            (33882160, 205603) /* JUGLAR, FERDINAND ARTHUR MARIE -> ANTIGUOKO KE */,
            (1495737, 205603) /* CARCEDO URBIETA, MIKEL -> ANTIGUOKO KE */,
            (23364906, 205603) /* VIDAL ARRUTI, HARITZ -> ANTIGUOKO KE */,
            (1501390, 205603) /* EL FAKHKHAR FERNANDEZ, ANASS -> ANTIGUOKO KE */,
            (1513332, 205603) /* LIZARTZA GORROTXATEGI, URKO -> ANTIGUOKO KE */,
            (1530693, 205603) /* ITURRIZA LULUAGA, MARKEL -> ANTIGUOKO KE */,
            (1482735, 205603) /* GALARZA GARMENDIA, EÑAUT -> ANTIGUOKO KE */,
            (1364289, 205603) /* SALGUEIRO JALON, GONZALO -> ANTIGUOKO KE */,
            (1480157, 205603) /* FERNANDEZ DE LEZEA LATABURU, MARKEL -> ANTIGUOKO KE */,
            (1492714, 205603) /* ALBIZU ARAUCO, LANDER -> ANTIGUOKO KE */,
            (723498, 205603) /* VIDORRETA CASTAÑEDA, JON SANTIAGO -> ANTIGUOKO KE */
    ) AS expected(rfef_player_id, rfef_club_id)
    JOIN public.clubs c ON c.rfef_club_id = expected.rfef_club_id
    JOIN public.club_seasons cs ON cs.club_id = c.id
    JOIN public.club_players cp ON cp.club_season_id = cs.id AND cp.rfef_player_id = expected.rfef_player_id;

    IF v_count_players <> 233 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Comprobación relacional jugador<->club falló. Esperados 233 pares coincidentes, encontrados: %', v_count_players;
    END IF;
    RAISE NOTICE '-> PRECHECK 6 OK: Los 233 jugadores pertenecen exactamente a la temporada de su club respectivo.';

    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'PRECHECKS COMPLETADOS CON ÉXITO. INSERTANDO DATOS...';
    RAISE NOTICE '=======================================================';

    -- ================================================================
    -- PARTIDO 1/7: CodActa 70692424 (DEPORTIVO ALAVES vs ARRATIA)
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692424, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 1,
        '2026-09-06', '12:00:00', v_club_205484, v_club_33836523, 5, 0,
        true, 'Jose Luis Compañon - Ibaia nº 4 (HA)', 'Hierba Artificial', 'Ruiz Rabanal, Iker', 'Campos Viteri, Ekaitz / Alcorta Herrero, Gaizka', NULL, 'rfef'
    ) RETURNING id INTO v_match_id_70692424;

    -- Estadísticas: DEPORTIVO ALAVES (18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1527285 AND cs.club_id = v_club_205484), v_club_205484, 13, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1527276 AND cs.club_id = v_club_205484), v_club_205484, 2, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1539163 AND cs.club_id = v_club_205484), v_club_205484, 3, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900379315 AND cs.club_id = v_club_205484), v_club_205484, 5, true, true, NULL, 45, 45, 0, 1, false, false, 'Amarilla (42'')', 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1515418 AND cs.club_id = v_club_205484), v_club_205484, 6, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1489183 AND cs.club_id = v_club_205484), v_club_205484, 7, true, true, NULL, NULL, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1288502 AND cs.club_id = v_club_205484), v_club_205484, 8, true, true, NULL, 70, 70, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1492952 AND cs.club_id = v_club_205484), v_club_205484, 9, true, true, NULL, 57, 57, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1527283 AND cs.club_id = v_club_205484), v_club_205484, 10, true, true, NULL, 70, 70, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900752896 AND cs.club_id = v_club_205484), v_club_205484, 11, true, true, NULL, 57, 57, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 655417 AND cs.club_id = v_club_205484), v_club_205484, 26, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1515422 AND cs.club_id = v_club_205484), v_club_205484, 1, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 772817 AND cs.club_id = v_club_205484), v_club_205484, 12, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1176078 AND cs.club_id = v_club_205484), v_club_205484, 14, true, false, 45, NULL, 45, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1287698 AND cs.club_id = v_club_205484), v_club_205484, 15, true, false, 70, NULL, 20, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1512654 AND cs.club_id = v_club_205484), v_club_205484, 16, true, false, 57, NULL, 33, 0, 1, false, false, 'Amarilla (88'')', 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1220291 AND cs.club_id = v_club_205484), v_club_205484, 18, true, false, 57, NULL, 33, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900656259 AND cs.club_id = v_club_205484), v_club_205484, 27, true, false, 70, NULL, 20, 0, 0, false, false, NULL, 'rfef');

    -- Estadísticas: ARRATIA (17 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1531746 AND cs.club_id = v_club_33836523), v_club_33836523, 1, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1525519 AND cs.club_id = v_club_33836523), v_club_33836523, 2, true, true, NULL, NULL, 90, 0, 1, false, false, 'Amarilla (21'')', 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23917106 AND cs.club_id = v_club_33836523), v_club_33836523, 3, true, true, NULL, 81, 81, 0, 1, false, false, 'Amarilla (41'')', 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1484390 AND cs.club_id = v_club_33836523), v_club_33836523, 4, true, true, NULL, NULL, 90, 0, 1, false, false, 'Amarilla (42'')', 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1525520 AND cs.club_id = v_club_33836523), v_club_33836523, 6, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1541884 AND cs.club_id = v_club_33836523), v_club_33836523, 7, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23917110 AND cs.club_id = v_club_33836523), v_club_33836523, 10, true, true, NULL, 75, 75, 0, 1, false, false, 'Amarilla (42'')', 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1498780 AND cs.club_id = v_club_33836523), v_club_33836523, 14, true, true, NULL, 75, 75, 0, 1, false, false, 'Amarilla (14'')', 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1542392 AND cs.club_id = v_club_33836523), v_club_33836523, 16, true, true, NULL, 56, 56, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1484386 AND cs.club_id = v_club_33836523), v_club_33836523, 19, true, true, NULL, 81, 81, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 25552725 AND cs.club_id = v_club_33836523), v_club_33836523, 29, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900640846 AND cs.club_id = v_club_33836523), v_club_33836523, 8, true, false, 56, NULL, 34, 0, 1, false, false, 'Amarilla (88'')', 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1481818 AND cs.club_id = v_club_33836523), v_club_33836523, 13, true, false, NULL, NULL, 0, 0, 1, false, false, 'Amarilla (44'')', 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900640848 AND cs.club_id = v_club_33836523), v_club_33836523, 15, true, false, 75, NULL, 15, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1520266 AND cs.club_id = v_club_33836523), v_club_33836523, 26, true, false, 81, NULL, 9, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23519898 AND cs.club_id = v_club_33836523), v_club_33836523, 27, true, false, 81, NULL, 9, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692424, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1507893 AND cs.club_id = v_club_33836523), v_club_33836523, 30, true, false, 75, NULL, 15, 0, 0, false, false, NULL, 'rfef');

    -- ================================================================
    -- PARTIDO 2/7: CodActa 70692425 (SD LEIOA vs CULTURAL LEONESA)
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692425, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 1,
        '2026-09-05', '17:00:00', v_club_23289700, v_club_33836521, 4, 2,
        true, 'Campo Municipal Sarriena 1', 'Hierba Artificial', 'Gutierrez Garcia, Markel', 'Luque Marcianes, Andoni / Iruretagoyena Gestoso, Mikel', '{"incidencias":[{"club":"CULTURAL LEONESA","tipo":"Amarilla","cargo":"2º Entrenador","minuto":70,"motivo":"Por desaprobar con palabras y gestos una de mis decisiones.","nombre":"TABARES BOLAÑOS, CRISTIAN"}]}'::jsonb, 'rfef'
    ) RETURNING id INTO v_match_id_70692425;

    -- Estadísticas: SD LEIOA (18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1511069 AND cs.club_id = v_club_23289700), v_club_23289700, 1, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1506439 AND cs.club_id = v_club_23289700), v_club_23289700, 3, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1484975 AND cs.club_id = v_club_23289700), v_club_23289700, 4, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1478101 AND cs.club_id = v_club_23289700), v_club_23289700, 7, true, true, NULL, NULL, 90, 1, 1, false, false, 'Amarilla (34'')', 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1511392 AND cs.club_id = v_club_23289700), v_club_23289700, 8, true, true, NULL, 46, 46, 0, 1, false, false, 'Amarilla (29'')', 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1483756 AND cs.club_id = v_club_23289700), v_club_23289700, 9, true, true, NULL, 65, 65, 0, 1, false, false, 'Amarilla (62'')', 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1539347 AND cs.club_id = v_club_23289700), v_club_23289700, 15, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1539780 AND cs.club_id = v_club_23289700), v_club_23289700, 16, true, true, NULL, 46, 46, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1538318 AND cs.club_id = v_club_23289700), v_club_23289700, 17, true, true, NULL, 81, 81, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1482473 AND cs.club_id = v_club_23289700), v_club_23289700, 21, true, true, NULL, 76, 76, 0, 1, false, false, 'Amarilla (22'')', 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1530497 AND cs.club_id = v_club_23289700), v_club_23289700, 23, true, true, NULL, NULL, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1527430 AND cs.club_id = v_club_23289700), v_club_23289700, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 776472 AND cs.club_id = v_club_23289700), v_club_23289700, 2, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1542198 AND cs.club_id = v_club_23289700), v_club_23289700, 6, true, false, 46, NULL, 44, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1512131 AND cs.club_id = v_club_23289700), v_club_23289700, 10, true, false, 76, NULL, 14, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1511066 AND cs.club_id = v_club_23289700), v_club_23289700, 11, true, false, 81, NULL, 9, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1500153 AND cs.club_id = v_club_23289700), v_club_23289700, 19, true, false, 46, NULL, 44, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1536882 AND cs.club_id = v_club_23289700), v_club_23289700, 20, true, false, 65, NULL, 25, 0, 0, false, false, NULL, 'rfef');

    -- Estadísticas: CULTURAL LEONESA (18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1137880 AND cs.club_id = v_club_33836521), v_club_33836521, 1, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 842751 AND cs.club_id = v_club_33836521), v_club_33836521, 2, true, true, NULL, 70, 70, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 821289 AND cs.club_id = v_club_33836521), v_club_33836521, 3, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 825906 AND cs.club_id = v_club_33836521), v_club_33836521, 4, true, true, NULL, NULL, 90, 1, 1, false, false, 'Amarilla (72'')', 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 33874377 AND cs.club_id = v_club_33836521), v_club_33836521, 5, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24616341 AND cs.club_id = v_club_33836521), v_club_33836521, 6, true, true, NULL, 81, 81, 0, 1, false, false, 'Amarilla (76'')', 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24605065 AND cs.club_id = v_club_33836521), v_club_33836521, 7, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 826520 AND cs.club_id = v_club_33836521), v_club_33836521, 8, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 814687 AND cs.club_id = v_club_33836521), v_club_33836521, 9, true, true, NULL, 60, 60, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 827875 AND cs.club_id = v_club_33836521), v_club_33836521, 10, true, true, NULL, 81, 81, 1, 1, false, false, 'Amarilla (72'')', 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1118632 AND cs.club_id = v_club_33836521), v_club_33836521, 11, true, true, NULL, 60, 60, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 538479 AND cs.club_id = v_club_33836521), v_club_33836521, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900310644 AND cs.club_id = v_club_33836521), v_club_33836521, 12, true, false, 70, NULL, 20, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 828676 AND cs.club_id = v_club_33836521), v_club_33836521, 14, true, false, 81, NULL, 9, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 828358 AND cs.club_id = v_club_33836521), v_club_33836521, 15, true, false, 81, NULL, 9, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24679388 AND cs.club_id = v_club_33836521), v_club_33836521, 16, true, false, NULL, NULL, 0, 0, 1, false, false, 'Amarilla (63'')', 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 819621 AND cs.club_id = v_club_33836521), v_club_33836521, 17, true, false, 60, NULL, 30, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692425, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24674855 AND cs.club_id = v_club_33836521), v_club_33836521, 18, true, false, 60, NULL, 30, 0, 0, false, false, NULL, 'rfef');

    -- ================================================================
    -- PARTIDO 3/7: CodActa 70692426 (SANTUTXU FC vs DANOK BAT)
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692426, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 1,
        '2026-09-06', '12:00:00', v_club_205567, v_club_900361152, 1, 1,
        true, 'Mallona 1', 'Hierba Artificial', 'Andrade Del Olmo, Jon', 'Unamuno Barbolla, Ander / Del Palacio Olazabalaga, Gaizka', NULL, 'rfef'
    ) RETURNING id INTO v_match_id_70692426;

    -- Estadísticas: SANTUTXU FC (18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1363968 AND cs.club_id = v_club_205567), v_club_205567, 13, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1500345 AND cs.club_id = v_club_205567), v_club_205567, 5, true, true, NULL, 67, 67, 0, 1, false, false, 'Amarilla (37'')', 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1508938 AND cs.club_id = v_club_205567), v_club_205567, 6, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1515738 AND cs.club_id = v_club_205567), v_club_205567, 9, true, true, NULL, 58, 58, 0, 1, false, false, 'Amarilla (53'')', 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1500350 AND cs.club_id = v_club_205567), v_club_205567, 10, true, true, NULL, 86, 86, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 33855037 AND cs.club_id = v_club_205567), v_club_205567, 11, true, true, NULL, 58, 58, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1535788 AND cs.club_id = v_club_205567), v_club_205567, 12, true, true, NULL, NULL, 90, 0, 1, false, false, 'Amarilla (76'')', 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1535457 AND cs.club_id = v_club_205567), v_club_205567, 14, true, true, NULL, NULL, 90, 0, 1, false, false, 'Amarilla (52'')', 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1504995 AND cs.club_id = v_club_205567), v_club_205567, 21, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1510843 AND cs.club_id = v_club_205567), v_club_205567, 22, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1484582 AND cs.club_id = v_club_205567), v_club_205567, 23, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1539838 AND cs.club_id = v_club_205567), v_club_205567, 1, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 473033 AND cs.club_id = v_club_205567), v_club_205567, 7, true, false, 86, NULL, 4, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1478889 AND cs.club_id = v_club_205567), v_club_205567, 17, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1534746 AND cs.club_id = v_club_205567), v_club_205567, 19, true, false, 67, NULL, 23, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1535380 AND cs.club_id = v_club_205567), v_club_205567, 24, true, false, 58, NULL, 32, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1543001 AND cs.club_id = v_club_205567), v_club_205567, 26, true, false, 58, NULL, 32, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1480857 AND cs.club_id = v_club_205567), v_club_205567, 27, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef');

    -- Estadísticas: DANOK BAT (18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1480276 AND cs.club_id = v_club_900361152), v_club_900361152, 1, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1480274 AND cs.club_id = v_club_900361152), v_club_900361152, 3, true, true, NULL, NULL, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1514007 AND cs.club_id = v_club_900361152), v_club_900361152, 4, true, true, NULL, 56, 56, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1480281 AND cs.club_id = v_club_900361152), v_club_900361152, 6, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1540922 AND cs.club_id = v_club_900361152), v_club_900361152, 8, true, true, NULL, 56, 56, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1502290 AND cs.club_id = v_club_900361152), v_club_900361152, 9, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1480275 AND cs.club_id = v_club_900361152), v_club_900361152, 10, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24669393 AND cs.club_id = v_club_900361152), v_club_900361152, 16, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1478990 AND cs.club_id = v_club_900361152), v_club_900361152, 18, true, true, NULL, 72, 72, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1542337 AND cs.club_id = v_club_900361152), v_club_900361152, 21, true, true, NULL, 46, 46, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1514226 AND cs.club_id = v_club_900361152), v_club_900361152, 26, true, true, NULL, 81, 81, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1542700 AND cs.club_id = v_club_900361152), v_club_900361152, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1540923 AND cs.club_id = v_club_900361152), v_club_900361152, 2, true, false, 81, NULL, 9, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1537336 AND cs.club_id = v_club_900361152), v_club_900361152, 5, true, false, 56, NULL, 34, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1494808 AND cs.club_id = v_club_900361152), v_club_900361152, 7, true, false, 46, NULL, 44, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1540918 AND cs.club_id = v_club_900361152), v_club_900361152, 19, true, false, 72, NULL, 18, 0, 1, false, false, 'Amarilla (83'')', 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1516666 AND cs.club_id = v_club_900361152), v_club_900361152, 22, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692426, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23310438 AND cs.club_id = v_club_900361152), v_club_900361152, 27, true, false, 56, NULL, 34, 0, 0, false, false, NULL, 'rfef');

    -- ================================================================
    -- PARTIDO 4/7: CodActa 70692427 (REAL SOCIEDAD vs SD INDAUTXU)
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692427, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 1,
        '2026-09-06', '18:00:00', v_club_205597, v_club_33836524, 5, 1,
        true, 'Instalaciones de Zubieta Z6 H.N.', 'Hierba Natural', 'Villaseca Outeiral, Aimar', 'Aramberri Velez, Alex / Eceiza Lumbreras, Aimar', NULL, 'rfef'
    ) RETURNING id INTO v_match_id_70692427;

    -- Estadísticas: REAL SOCIEDAD (18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 4472744 AND cs.club_id = v_club_205597), v_club_205597, 1, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1483772 AND cs.club_id = v_club_205597), v_club_205597, 2, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1528890 AND cs.club_id = v_club_205597), v_club_205597, 3, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1492695 AND cs.club_id = v_club_205597), v_club_205597, 4, true, true, NULL, NULL, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1514872 AND cs.club_id = v_club_205597), v_club_205597, 5, true, true, NULL, 87, 87, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1511828 AND cs.club_id = v_club_205597), v_club_205597, 6, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1480156 AND cs.club_id = v_club_205597), v_club_205597, 7, true, true, NULL, NULL, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24446382 AND cs.club_id = v_club_205597), v_club_205597, 8, true, true, NULL, 87, 87, 1, 1, false, false, 'Amarilla (80'')', 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1516059 AND cs.club_id = v_club_205597), v_club_205597, 9, true, true, NULL, 69, 69, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1532373 AND cs.club_id = v_club_205597), v_club_205597, 10, true, true, NULL, 63, 63, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1513243 AND cs.club_id = v_club_205597), v_club_205597, 11, true, true, NULL, 63, 63, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1534792 AND cs.club_id = v_club_205597), v_club_205597, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1534376 AND cs.club_id = v_club_205597), v_club_205597, 12, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1483771 AND cs.club_id = v_club_205597), v_club_205597, 14, true, false, 63, NULL, 27, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24674595 AND cs.club_id = v_club_205597), v_club_205597, 15, true, false, 87, NULL, 3, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23077000 AND cs.club_id = v_club_205597), v_club_205597, 16, true, false, 87, NULL, 3, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1534374 AND cs.club_id = v_club_205597), v_club_205597, 17, true, false, 63, NULL, 27, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692427, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1364588 AND cs.club_id = v_club_205597), v_club_205597, 18, true, false, 69, NULL, 21, 0, 0, false, false, NULL, 'rfef');

    -- Estadísticas: SD INDAUTXU (SD INDAUTXU - CLUB PROPIO)
    -- OMITIDO INTENCIONALMENTE: 0 estadísticas y 0 jugadores en club_players.

    -- ================================================================
    -- PARTIDO 5/7: CodActa 70692428 (EF MAREO vs REAL VALLADOLID)
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692428, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 1,
        '2026-09-06', '12:00:00', v_club_33836522, v_club_205459, 3, 10,
        true, 'El Salvador', 'Hierba Natural', 'García Zuñeda, Diego', 'Martinez Alonso, Jorge / Prior Bacaicoa, Sergio', NULL, 'rfef'
    ) RETURNING id INTO v_match_id_70692428;

    -- Estadísticas: EF MAREO (18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1368236 AND cs.club_id = v_club_33836522), v_club_33836522, 1, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1367205 AND cs.club_id = v_club_33836522), v_club_33836522, 2, true, true, NULL, 57, 57, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1364175 AND cs.club_id = v_club_33836522), v_club_33836522, 3, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1363891 AND cs.club_id = v_club_33836522), v_club_33836522, 5, true, true, NULL, NULL, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1365615 AND cs.club_id = v_club_33836522), v_club_33836522, 7, true, true, NULL, NULL, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1362725 AND cs.club_id = v_club_33836522), v_club_33836522, 8, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1366429 AND cs.club_id = v_club_33836522), v_club_33836522, 10, true, true, NULL, NULL, 90, 0, 1, false, false, 'Amarilla (87'')', 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1363430 AND cs.club_id = v_club_33836522), v_club_33836522, 16, true, true, NULL, 77, 77, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1363429 AND cs.club_id = v_club_33836522), v_club_33836522, 17, true, true, NULL, 57, 57, 0, 1, false, false, 'Amarilla (17'')', 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1367227 AND cs.club_id = v_club_33836522), v_club_33836522, 19, true, true, NULL, 77, 77, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1364236 AND cs.club_id = v_club_33836522), v_club_33836522, 22, true, true, NULL, 57, 57, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1364630 AND cs.club_id = v_club_33836522), v_club_33836522, 6, true, false, 77, NULL, 13, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1368730 AND cs.club_id = v_club_33836522), v_club_33836522, 9, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1367436 AND cs.club_id = v_club_33836522), v_club_33836522, 11, true, false, 57, NULL, 33, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1368796 AND cs.club_id = v_club_33836522), v_club_33836522, 12, true, false, 77, NULL, 13, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24576616 AND cs.club_id = v_club_33836522), v_club_33836522, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1363259 AND cs.club_id = v_club_33836522), v_club_33836522, 18, true, false, 57, NULL, 33, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1367926 AND cs.club_id = v_club_33836522), v_club_33836522, 21, true, false, 57, NULL, 33, 0, 0, false, false, NULL, 'rfef');

    -- Estadísticas: REAL VALLADOLID (18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 34071958 AND cs.club_id = v_club_205459), v_club_205459, 1, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1325857 AND cs.club_id = v_club_205459), v_club_205459, 2, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 809355 AND cs.club_id = v_club_205459), v_club_205459, 3, true, true, NULL, 62, 62, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 826008 AND cs.club_id = v_club_205459), v_club_205459, 4, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 34042813 AND cs.club_id = v_club_205459), v_club_205459, 5, true, true, NULL, 62, 62, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 817116 AND cs.club_id = v_club_205459), v_club_205459, 6, true, true, NULL, NULL, 90, 2, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23323965 AND cs.club_id = v_club_205459), v_club_205459, 7, true, true, NULL, 62, 62, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 812416 AND cs.club_id = v_club_205459), v_club_205459, 8, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 628729 AND cs.club_id = v_club_205459), v_club_205459, 9, true, true, NULL, 62, 62, 3, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 825613 AND cs.club_id = v_club_205459), v_club_205459, 10, true, true, NULL, 62, 62, 3, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 826382 AND cs.club_id = v_club_205459), v_club_205459, 11, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 818237 AND cs.club_id = v_club_205459), v_club_205459, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 814927 AND cs.club_id = v_club_205459), v_club_205459, 12, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23327967 AND cs.club_id = v_club_205459), v_club_205459, 14, true, false, 62, NULL, 28, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 811944 AND cs.club_id = v_club_205459), v_club_205459, 15, true, false, 62, NULL, 28, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 812205 AND cs.club_id = v_club_205459), v_club_205459, 16, true, false, 62, NULL, 28, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 34060184 AND cs.club_id = v_club_205459), v_club_205459, 17, true, false, 62, NULL, 28, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692428, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23492022 AND cs.club_id = v_club_205459), v_club_205459, 18, true, false, 62, NULL, 28, 0, 0, false, false, NULL, 'rfef');

    -- ================================================================
    -- PARTIDO 6/7: CodActa 70692429 (BETOÑO vs SD EIBAR)
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692429, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 1,
        '2026-09-06', '12:00:00', v_club_23289793, v_club_205540, 1, 2,
        true, 'Campos de Futbol Betoño - Campo 1', 'Hierba Artificial', 'San Pedro Diez, Alberto', 'Garcia Paunero, Xabier / Palomares Soto, Yoel', NULL, 'rfef'
    ) RETURNING id INTO v_match_id_70692429;

    -- Estadísticas: BETOÑO (18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 34053553 AND cs.club_id = v_club_23289793), v_club_23289793, 1, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900176428 AND cs.club_id = v_club_23289793), v_club_23289793, 2, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1506628 AND cs.club_id = v_club_23289793), v_club_23289793, 4, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1515680 AND cs.club_id = v_club_23289793), v_club_23289793, 5, true, true, NULL, 83, 83, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 25859579 AND cs.club_id = v_club_23289793), v_club_23289793, 6, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1483827 AND cs.club_id = v_club_23289793), v_club_23289793, 7, true, true, NULL, 58, 58, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 25120706 AND cs.club_id = v_club_23289793), v_club_23289793, 8, true, true, NULL, 58, 58, 0, 1, false, false, 'Amarilla (12'')', 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1517904 AND cs.club_id = v_club_23289793), v_club_23289793, 11, true, true, NULL, 73, 73, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1512655 AND cs.club_id = v_club_23289793), v_club_23289793, 14, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1521544 AND cs.club_id = v_club_23289793), v_club_23289793, 15, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24616827 AND cs.club_id = v_club_23289793), v_club_23289793, 17, true, true, NULL, 83, 83, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1484304 AND cs.club_id = v_club_23289793), v_club_23289793, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1527280 AND cs.club_id = v_club_23289793), v_club_23289793, 21, true, false, 58, NULL, 32, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 901384678 AND cs.club_id = v_club_23289793), v_club_23289793, 22, true, false, 83, NULL, 7, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1537486 AND cs.club_id = v_club_23289793), v_club_23289793, 24, true, false, 83, NULL, 7, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1500441 AND cs.club_id = v_club_23289793), v_club_23289793, 26, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900176843 AND cs.club_id = v_club_23289793), v_club_23289793, 27, true, false, 58, NULL, 32, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1344835 AND cs.club_id = v_club_23289793), v_club_23289793, 28, true, false, 73, NULL, 17, 0, 0, false, false, NULL, 'rfef');

    -- Estadísticas: SD EIBAR (18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 948020 AND cs.club_id = v_club_205540), v_club_205540, 13, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1481562 AND cs.club_id = v_club_205540), v_club_205540, 2, true, true, NULL, 60, 60, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24147469 AND cs.club_id = v_club_205540), v_club_205540, 5, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1507452 AND cs.club_id = v_club_205540), v_club_205540, 7, true, true, NULL, 60, 60, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1542087 AND cs.club_id = v_club_205540), v_club_205540, 8, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1532709 AND cs.club_id = v_club_205540), v_club_205540, 9, true, true, NULL, NULL, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23388984 AND cs.club_id = v_club_205540), v_club_205540, 11, true, true, NULL, 73, 73, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1535814 AND cs.club_id = v_club_205540), v_club_205540, 14, true, true, NULL, 46, 46, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1513856 AND cs.club_id = v_club_205540), v_club_205540, 17, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1484977 AND cs.club_id = v_club_205540), v_club_205540, 18, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1139265 AND cs.club_id = v_club_205540), v_club_205540, 21, true, true, NULL, 86, 86, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1537414 AND cs.club_id = v_club_205540), v_club_205540, 1, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1528307 AND cs.club_id = v_club_205540), v_club_205540, 3, true, false, 60, NULL, 30, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1528846 AND cs.club_id = v_club_205540), v_club_205540, 4, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1526711 AND cs.club_id = v_club_205540), v_club_205540, 6, true, false, 86, NULL, 4, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1515474 AND cs.club_id = v_club_205540), v_club_205540, 10, true, false, 60, NULL, 30, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1492300 AND cs.club_id = v_club_205540), v_club_205540, 20, true, false, 46, NULL, 44, 0, 1, false, false, 'Amarilla (66'')', 'rfef'),
        (v_match_id_70692429, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1541701 AND cs.club_id = v_club_205540), v_club_205540, 22, true, false, 73, NULL, 17, 0, 0, false, false, NULL, 'rfef');

    -- ================================================================
    -- PARTIDO 7/7: CodActa 70692431 (UNIONISTAS SALAMANCA vs ANTIGUOKO KE)
    -- ================================================================
    INSERT INTO public.official_matches (
        rfef_cod_acta, temporada, competicion, grupo, jornada,
        fecha, hora, local_club_id, visitor_club_id, goles_local, goles_visitante,
        jugado, campo, superficie, arbitro, asistentes, oficiales, source
    ) VALUES (
        70692431, '2026-27', 'División de Honor Juvenil', 'Grupo 2', 1,
        '2026-09-06', '16:00:00', v_club_207449, v_club_205603, 2, 2,
        true, 'Anexo Estadio Municipal Reina Sofia', 'Hierba Artificial', 'Del Brio Sanchez, Joel', 'Romero Marin, Asier / Mangas Risueño, Alejandro', NULL, 'rfef'
    ) RETURNING id INTO v_match_id_70692431;

    -- Estadísticas: UNIONISTAS SALAMANCA (18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 758958 AND cs.club_id = v_club_207449), v_club_207449, 25, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1050135 AND cs.club_id = v_club_207449), v_club_207449, 2, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 829972 AND cs.club_id = v_club_207449), v_club_207449, 3, true, true, NULL, 71, 71, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 826990 AND cs.club_id = v_club_207449), v_club_207449, 4, true, true, NULL, NULL, 90, 1, 1, false, false, 'Amarilla (20'')', 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 4475785 AND cs.club_id = v_club_207449), v_club_207449, 5, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 825653 AND cs.club_id = v_club_207449), v_club_207449, 6, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 826268 AND cs.club_id = v_club_207449), v_club_207449, 9, true, true, NULL, 71, 71, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 24150608 AND cs.club_id = v_club_207449), v_club_207449, 10, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 827130 AND cs.club_id = v_club_207449), v_club_207449, 17, true, true, NULL, 83, 83, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 820847 AND cs.club_id = v_club_207449), v_club_207449, 19, true, true, NULL, 76, 76, 0, 1, false, false, 'Amarilla (85'')', 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1112081 AND cs.club_id = v_club_207449), v_club_207449, 20, true, true, NULL, 46, 46, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 807944 AND cs.club_id = v_club_207449), v_club_207449, 1, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 841009 AND cs.club_id = v_club_207449), v_club_207449, 7, true, false, 76, NULL, 14, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 813863 AND cs.club_id = v_club_207449), v_club_207449, 8, true, false, 71, NULL, 19, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 826993 AND cs.club_id = v_club_207449), v_club_207449, 14, true, false, 83, NULL, 7, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 847100 AND cs.club_id = v_club_207449), v_club_207449, 26, true, false, 46, NULL, 44, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 900459882 AND cs.club_id = v_club_207449), v_club_207449, 27, true, false, 71, NULL, 19, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 828723 AND cs.club_id = v_club_207449), v_club_207449, 28, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef');

    -- Estadísticas: ANTIGUOKO KE (18 jugadores)
    INSERT INTO public.club_match_player_stats (
        official_match_id, club_player_id, club_id, dorsal_partido, convocado, titular,
        minuto_entrada, minuto_salida, minutos, goles, amarillas, doble_amarilla, roja, motivo_sancion, source
    ) VALUES
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1536035 AND cs.club_id = v_club_205603), v_club_205603, 1, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1506997 AND cs.club_id = v_club_205603), v_club_205603, 2, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1528578 AND cs.club_id = v_club_205603), v_club_205603, 3, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1479396 AND cs.club_id = v_club_205603), v_club_205603, 4, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1529142 AND cs.club_id = v_club_205603), v_club_205603, 5, true, true, NULL, NULL, 90, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1515143 AND cs.club_id = v_club_205603), v_club_205603, 6, true, true, NULL, 76, 76, 0, 1, false, false, 'Amarilla (76'')', 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1537923 AND cs.club_id = v_club_205603), v_club_205603, 7, true, true, NULL, 70, 70, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 33882160 AND cs.club_id = v_club_205603), v_club_205603, 8, true, true, NULL, 61, 61, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1495737 AND cs.club_id = v_club_205603), v_club_205603, 9, true, true, NULL, 61, 61, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 23364906 AND cs.club_id = v_club_205603), v_club_205603, 10, true, true, NULL, 61, 61, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1501390 AND cs.club_id = v_club_205603), v_club_205603, 11, true, true, NULL, NULL, 90, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1513332 AND cs.club_id = v_club_205603), v_club_205603, 13, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1530693 AND cs.club_id = v_club_205603), v_club_205603, 12, true, false, 76, NULL, 14, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1482735 AND cs.club_id = v_club_205603), v_club_205603, 14, true, false, 61, NULL, 29, 1, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1364289 AND cs.club_id = v_club_205603), v_club_205603, 15, true, false, NULL, NULL, 0, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1480157 AND cs.club_id = v_club_205603), v_club_205603, 16, true, false, 61, NULL, 29, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 1492714 AND cs.club_id = v_club_205603), v_club_205603, 17, true, false, 70, NULL, 20, 0, 0, false, false, NULL, 'rfef'),
        (v_match_id_70692431, (SELECT cp.id FROM public.club_players cp JOIN public.club_seasons cs ON cs.id = cp.club_season_id WHERE cp.rfef_player_id = 723498 AND cs.club_id = v_club_205603), v_club_205603, 18, true, false, 61, NULL, 29, 0, 0, false, false, NULL, 'rfef');

    -- ================================================================
    -- VALIDACIONES POSTERIORES (POSTCHECKS)
    -- ================================================================
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'INICIANDO VALIDACIONES POSTERIORES (POSTCHECKS)...';
    RAISE NOTICE '=======================================================';

    -- ----------------------------------------------------------------
    -- POSTCHECK 1: TOTAL DE PARTIDOS EN official_matches ES EXACTAMENTE 8
    -- ----------------------------------------------------------------
    SELECT COUNT(*) INTO v_count_matches FROM public.official_matches;
    IF v_count_matches <> 8 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Total official_matches esperado 8 (1 piloto + 7 nuevos), encontrado: %', v_count_matches;
    END IF;
    RAISE NOTICE '-> POSTCHECK 1 OK: Exactamente 8 partidos en official_matches.';

    -- ----------------------------------------------------------------
    -- POSTCHECK 2: TOTAL DE REGISTROS EN club_match_player_stats ES EXACTAMENTE 269
    -- ----------------------------------------------------------------
    SELECT COUNT(*) INTO v_count_stats FROM public.club_match_player_stats;
    IF v_count_stats <> 269 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Total club_match_player_stats esperado 269 (36 piloto + 233 nuevos), encontrado: %', v_count_stats;
    END IF;
    RAISE NOTICE '-> POSTCHECK 2 OK: Exactamente 269 registros en club_match_player_stats.';

    -- ----------------------------------------------------------------
    -- POSTCHECK 3: PILOTO 70692430 SIGUE CON EXACTAMENTE 36 STATS
    -- ----------------------------------------------------------------
    SELECT COUNT(*) INTO v_check_count 
    FROM public.club_match_player_stats 
    WHERE official_match_id = v_pilot_match_id;
    IF v_check_count <> 36 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: El piloto 70692430 fue alterado (stats encontradas: %)', v_check_count;
    END IF;
    RAISE NOTICE '-> POSTCHECK 3 OK: Piloto 70692430 continúa con exactamente 36 stats.';

    -- ----------------------------------------------------------------
    -- POSTCHECK 4: INTEGRIDAD RELACIONAL ESTADÍSTICA <-> CLUB REAL DEL JUGADOR
    -- En los 233 stats nuevos, club_id debe coincidir con club_players -> club_seasons -> club_id
    -- ----------------------------------------------------------------
    SELECT COUNT(*) INTO v_check_count
    FROM public.club_match_player_stats cmps
    JOIN public.club_players cp ON cp.id = cmps.club_player_id
    JOIN public.club_seasons cs ON cs.id = cp.club_season_id
    WHERE cmps.official_match_id IN (v_match_id_70692424, v_match_id_70692425, v_match_id_70692426, v_match_id_70692427, v_match_id_70692428, v_match_id_70692429, v_match_id_70692431)
      AND cmps.club_id <> cs.club_id;

    IF v_check_count > 0 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Existen % estadísticas donde club_match_player_stats.club_id no coincide con el club_id real del jugador.', v_check_count;
    END IF;
    RAISE NOTICE '-> POSTCHECK 4 OK: Integridad relacional 100%% garantizada (club_match_player_stats.club_id = club_seasons.club_id).';

    -- ----------------------------------------------------------------
    -- POSTCHECK 5: RECUENTO EXACTO DE STATS POR CADA UNO DE LOS 7 PARTIDOS
    -- ----------------------------------------------------------------
    SELECT COUNT(*) INTO v_check_count FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692424;
    IF v_check_count <> 35 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Partido % esperado % stats, encontradas: %', 70692424, 35, v_check_count;
    END IF;
    SELECT COUNT(*) INTO v_check_count FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692425;
    IF v_check_count <> 36 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Partido % esperado % stats, encontradas: %', 70692425, 36, v_check_count;
    END IF;
    SELECT COUNT(*) INTO v_check_count FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692426;
    IF v_check_count <> 36 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Partido % esperado % stats, encontradas: %', 70692426, 36, v_check_count;
    END IF;
    SELECT COUNT(*) INTO v_check_count FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692427;
    IF v_check_count <> 18 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Partido % esperado % stats, encontradas: %', 70692427, 18, v_check_count;
    END IF;
    SELECT COUNT(*) INTO v_check_count FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692428;
    IF v_check_count <> 36 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Partido % esperado % stats, encontradas: %', 70692428, 36, v_check_count;
    END IF;
    SELECT COUNT(*) INTO v_check_count FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692429;
    IF v_check_count <> 36 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Partido % esperado % stats, encontradas: %', 70692429, 36, v_check_count;
    END IF;
    SELECT COUNT(*) INTO v_check_count FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692431;
    IF v_check_count <> 36 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Partido % esperado % stats, encontradas: %', 70692431, 36, v_check_count;
    END IF;
    RAISE NOTICE '-> POSTCHECK 5 OK: Recuento de estadísticas correcto por cada partido.';

    -- ----------------------------------------------------------------
    -- POSTCHECK 6: VERIFICACIÓN DE MINUTOS (990'' POR EQUIPO PARTICIPANTE)
    -- ----------------------------------------------------------------
    SELECT SUM(minutos) INTO v_sum_minutos FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692424 AND club_id = v_club_205484;
    IF v_sum_minutos <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos local en % (%) suman %, esperado 990', 70692424, 'DEPORTIVO ALAVES', v_sum_minutos;
    END IF;
    SELECT SUM(minutos) INTO v_sum_minutos FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692424 AND club_id = v_club_33836523;
    IF v_sum_minutos <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos visitante en % (%) suman %, esperado 990', 70692424, 'ARRATIA', v_sum_minutos;
    END IF;
    SELECT SUM(minutos) INTO v_sum_minutos FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692425 AND club_id = v_club_23289700;
    IF v_sum_minutos <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos local en % (%) suman %, esperado 990', 70692425, 'SD LEIOA', v_sum_minutos;
    END IF;
    SELECT SUM(minutos) INTO v_sum_minutos FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692425 AND club_id = v_club_33836521;
    IF v_sum_minutos <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos visitante en % (%) suman %, esperado 990', 70692425, 'CULTURAL LEONESA', v_sum_minutos;
    END IF;
    SELECT SUM(minutos) INTO v_sum_minutos FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692426 AND club_id = v_club_205567;
    IF v_sum_minutos <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos local en % (%) suman %, esperado 990', 70692426, 'SANTUTXU FC', v_sum_minutos;
    END IF;
    SELECT SUM(minutos) INTO v_sum_minutos FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692426 AND club_id = v_club_900361152;
    IF v_sum_minutos <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos visitante en % (%) suman %, esperado 990', 70692426, 'DANOK BAT', v_sum_minutos;
    END IF;
    SELECT SUM(minutos) INTO v_sum_minutos FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692427 AND club_id = v_club_205597;
    IF v_sum_minutos <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos local en % (%) suman %, esperado 990', 70692427, 'REAL SOCIEDAD', v_sum_minutos;
    END IF;
    SELECT SUM(minutos) INTO v_sum_minutos FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692428 AND club_id = v_club_33836522;
    IF v_sum_minutos <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos local en % (%) suman %, esperado 990', 70692428, 'EF MAREO', v_sum_minutos;
    END IF;
    SELECT SUM(minutos) INTO v_sum_minutos FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692428 AND club_id = v_club_205459;
    IF v_sum_minutos <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos visitante en % (%) suman %, esperado 990', 70692428, 'REAL VALLADOLID', v_sum_minutos;
    END IF;
    SELECT SUM(minutos) INTO v_sum_minutos FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692429 AND club_id = v_club_23289793;
    IF v_sum_minutos <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos local en % (%) suman %, esperado 990', 70692429, 'BETOÑO', v_sum_minutos;
    END IF;
    SELECT SUM(minutos) INTO v_sum_minutos FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692429 AND club_id = v_club_205540;
    IF v_sum_minutos <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos visitante en % (%) suman %, esperado 990', 70692429, 'SD EIBAR', v_sum_minutos;
    END IF;
    SELECT SUM(minutos) INTO v_sum_minutos FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692431 AND club_id = v_club_207449;
    IF v_sum_minutos <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos local en % (%) suman %, esperado 990', 70692431, 'UNIONISTAS SALAMANCA', v_sum_minutos;
    END IF;
    SELECT SUM(minutos) INTO v_sum_minutos FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692431 AND club_id = v_club_205603;
    IF v_sum_minutos <> 990 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Minutos visitante en % (%) suman %, esperado 990', 70692431, 'ANTIGUOKO KE', v_sum_minutos;
    END IF;
    RAISE NOTICE '-> POSTCHECK 6 OK: Simulación de minutos correcta (990 minutos por equipo).';

    -- ----------------------------------------------------------------
    -- POSTCHECK 7: VERIFICACIÓN DE GOLES POR JUGADOR VS MARCADOR DE ACTA
    -- ----------------------------------------------------------------
    SELECT COALESCE(SUM(goles), 0) INTO v_sum_goles FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692424 AND club_id = v_club_205484;
    IF v_sum_goles <> 5 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Goles local en % suman %, esperado %', 70692424, v_sum_goles, 5;
    END IF;
    SELECT COALESCE(SUM(goles), 0) INTO v_sum_goles FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692424 AND club_id = v_club_33836523;
    IF v_sum_goles <> 0 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Goles visitante en % suman %, esperado %', 70692424, v_sum_goles, 0;
    END IF;
    SELECT COALESCE(SUM(goles), 0) INTO v_sum_goles FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692425 AND club_id = v_club_23289700;
    IF v_sum_goles <> 4 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Goles local en % suman %, esperado %', 70692425, v_sum_goles, 4;
    END IF;
    SELECT COALESCE(SUM(goles), 0) INTO v_sum_goles FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692425 AND club_id = v_club_33836521;
    IF v_sum_goles <> 2 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Goles visitante en % suman %, esperado %', 70692425, v_sum_goles, 2;
    END IF;
    SELECT COALESCE(SUM(goles), 0) INTO v_sum_goles FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692426 AND club_id = v_club_205567;
    IF v_sum_goles <> 1 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Goles local en % suman %, esperado %', 70692426, v_sum_goles, 1;
    END IF;
    SELECT COALESCE(SUM(goles), 0) INTO v_sum_goles FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692426 AND club_id = v_club_900361152;
    IF v_sum_goles <> 1 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Goles visitante en % suman %, esperado %', 70692426, v_sum_goles, 1;
    END IF;
    SELECT COALESCE(SUM(goles), 0) INTO v_sum_goles FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692427 AND club_id = v_club_205597;
    IF v_sum_goles <> 5 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Goles local en % suman %, esperado %', 70692427, v_sum_goles, 5;
    END IF;
    SELECT COALESCE(SUM(goles), 0) INTO v_sum_goles FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692428 AND club_id = v_club_33836522;
    IF v_sum_goles <> 3 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Goles local en % suman %, esperado %', 70692428, v_sum_goles, 3;
    END IF;
    SELECT COALESCE(SUM(goles), 0) INTO v_sum_goles FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692428 AND club_id = v_club_205459;
    IF v_sum_goles <> 10 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Goles visitante en % suman %, esperado %', 70692428, v_sum_goles, 10;
    END IF;
    SELECT COALESCE(SUM(goles), 0) INTO v_sum_goles FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692429 AND club_id = v_club_23289793;
    IF v_sum_goles <> 1 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Goles local en % suman %, esperado %', 70692429, v_sum_goles, 1;
    END IF;
    SELECT COALESCE(SUM(goles), 0) INTO v_sum_goles FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692429 AND club_id = v_club_205540;
    IF v_sum_goles <> 2 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Goles visitante en % suman %, esperado %', 70692429, v_sum_goles, 2;
    END IF;
    SELECT COALESCE(SUM(goles), 0) INTO v_sum_goles FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692431 AND club_id = v_club_207449;
    IF v_sum_goles <> 2 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Goles local en % suman %, esperado %', 70692431, v_sum_goles, 2;
    END IF;
    SELECT COALESCE(SUM(goles), 0) INTO v_sum_goles FROM public.club_match_player_stats WHERE official_match_id = v_match_id_70692431 AND club_id = v_club_205603;
    IF v_sum_goles <> 2 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Goles visitante en % suman %, esperado %', 70692431, v_sum_goles, 2;
    END IF;
    RAISE NOTICE '-> POSTCHECK 6 OK: Suma de goles por jugador coincide exactamente con el marcador.';

    -- ----------------------------------------------------------------
    -- POSTCHECK 8: VERIFICACIÓN DE TARJETAS EN EL LOTE (30 AMARILLAS, 0 ROJAS DIRECTAS, 0 DOBLE AMARILLA)
    -- ----------------------------------------------------------------
    SELECT COALESCE(SUM(amarillas), 0), COUNT(*) FILTER (WHERE roja = true), COUNT(*) FILTER (WHERE doble_amarilla = true)
    INTO v_sum_amarillas, v_sum_rojas, v_check_count
    FROM public.club_match_player_stats
    WHERE official_match_id IN (v_match_id_70692424, v_match_id_70692425, v_match_id_70692426, v_match_id_70692427, v_match_id_70692428, v_match_id_70692429, v_match_id_70692431);

    IF v_sum_amarillas <> 30 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Total amarillas en lote J1 esperado 30, encontrado: %', v_sum_amarillas;
    END IF;
    IF v_sum_rojas <> 0 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Total rojas directas en lote J1 esperado 0, encontrado: %', v_sum_rojas;
    END IF;
    IF v_check_count <> 0 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Total dobles amarillas en lote J1 esperado 0, encontrado: %', v_check_count;
    END IF;
    RAISE NOTICE '-> POSTCHECK 8 OK: Conteo de tarjetas verificado (30 amarillas, 0 rojas directas, 0 dobles amarillas).';

    -- ----------------------------------------------------------------
    -- POSTCHECK 9: PROTECCIÓN DE SD INDAUTXU Y PLANTILLA PROPIA
    -- ----------------------------------------------------------------
    -- SD Indautxu debe tener 0 registros en club_match_player_stats
    SELECT COUNT(*) INTO v_indautxu_stats_count
    FROM public.club_match_player_stats
    WHERE club_id = v_indautxu_club_id;
    IF v_indautxu_stats_count > 0 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: SD INDAUTXU tiene % estadísticas en club_match_player_stats (debe ser estrictamente 0)', v_indautxu_stats_count;
    END IF;

    -- SD Indautxu debe tener 0 registros en club_players
    SELECT COUNT(cp.id) INTO v_indautxu_players_count
    FROM public.club_players cp
    JOIN public.club_seasons cs ON cs.id = cp.club_season_id
    WHERE cs.club_id = v_indautxu_club_id;
    IF v_indautxu_players_count > 0 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: SD INDAUTXU tiene % jugadores en club_players (debe ser estrictamente 0)', v_indautxu_players_count;
    END IF;

    -- Plantilla propia public.players intacta
    SELECT COUNT(*) INTO v_own_players_count FROM public.players;
    IF v_own_players_count <> 27 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Plantilla propia public.players alterada (encontradas: %, esperado: 27)', v_own_players_count;
    END IF;
    RAISE NOTICE '-> POSTCHECK 9 OK: SD INDAUTXU y plantilla propia public.players 100%% protegidos e intactos.';

    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'IMPORTACIÓN J1-F.2 (7 PARTIDOS) FINALIZADA CON ÉXITO';
    RAISE NOTICE '=======================================================';
END $$;
