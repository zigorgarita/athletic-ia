-- ============================================================================
-- J-2 · PASO 3 · IMPORTACIÓN OFICIAL DE CLASIFICACIÓN RFEF (JORNADA 2)
-- 
-- Competición: Juvenil División de Honor - Grupo 2 (Temporada 2026-27)
-- Parámetros RFEF: CodCompeticion = 33836116, CodGrupo = 33836118, CodJornada = 2
--
-- Coherencia federativa reflejada fielmente:
-- * 14 clubes con 2 PJ oficiales computados.
-- * 2 clubes (SD Eibar y EF Mareo) con 1 PJ computado provisionalmente por la RFEF
--   en la tabla acumulada a la espera de validación administrativa de su acta.
-- * Balance matemático de la tabla oficial: 68 GF = 68 GC, G=12, P=12, E=6.
--
-- ESTADO: PREPARADO · NO EJECUTADO AUTOMÁTICAMENTE
-- ============================================================================

DO $$
DECLARE
    v_j2_existente INTEGER;
    v_total_insertados INTEGER;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE '   INICIANDO J2-03: CLASIFICACIÓN OFICIAL RFEF JORNADA 2    ';
    RAISE NOTICE '============================================================';

    -- Precheck: Verificar que la Jornada 2 no exista en official_standings
    SELECT COUNT(*) INTO v_j2_existente
    FROM public.official_standings
    WHERE temporada = '2026-27' AND jornada = 2;

    IF v_j2_existente > 0 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Ya existen % registros para la Jornada 2 en official_standings.', v_j2_existente;
    END IF;
    RAISE NOTICE '-> PRECHECK OK: Jornada 2 no existe previamente en official_standings.';

    -- Inserción de las 16 posiciones oficiales
    INSERT INTO public.official_standings (
        temporada, jornada, posicion, club_id, pj, g, e, p, gf, gc, dg, puntos, source
    ) VALUES
        ('2026-27', 2, 1, 'e686b482-b4c2-4ed0-acf2-3bded5585c4c'::uuid, 2, 2, 0, 0, 13, 3, 10, 6, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 2, 'f14fbbca-81f4-4ee3-b818-e1e41827454b'::uuid, 2, 2, 0, 0, 5, 3, 2, 6, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 3, '5ed38a15-75db-4752-8706-634b92d898b5'::uuid, 2, 1, 1, 0, 7, 2, 5, 4, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 4, 'a764b115-09dd-4fbd-be05-c7d8f36a54bc'::uuid, 2, 1, 1, 0, 3, 2, 1, 4, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 5, 'de9fd8d8-04fa-4c19-ac29-c2e41352b375'::uuid, 2, 1, 1, 0, 3, 2, 1, 4, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 6, '8af137d7-ed20-4a9e-aebc-3a515b093d26'::uuid, 2, 1, 1, 0, 3, 2, 1, 4, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 7, 'a823e75c-2246-4b19-9dd1-89ab199ebe38'::uuid, 2, 1, 0, 1, 6, 4, 2, 3, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 8, '9a76a56a-3195-4b4b-9ff0-054731d6dda8'::uuid, 2, 1, 0, 1, 5, 4, 1, 3, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 9, '9b131d39-b143-488b-851d-a55c140c1396'::uuid, 1, 1, 0, 0, 2, 1, 1, 3, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 10, '89203a30-4e2d-4cd4-83d5-a0a745140609'::uuid, 2, 1, 0, 1, 3, 3, 0, 3, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 11, '7534c39f-8b17-47e2-8dd8-b3f238ed9ace'::uuid, 2, 0, 1, 1, 4, 5, -1, 1, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 12, 'cb701fe7-be63-4540-85b6-9296a165a424'::uuid, 2, 0, 1, 1, 4, 6, -2, 1, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 13, 'b66776ce-a334-4d59-998d-f8726fea9dce'::uuid, 2, 0, 0, 2, 2, 4, -2, 0, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 14, '13f4a8d6-a39c-4b39-a8dd-ca9c63c0c1ee'::uuid, 2, 0, 0, 2, 2, 7, -5, 0, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 15, 'c4e8af5c-bc98-4c5d-9751-c6c54b502422'::uuid, 2, 0, 0, 2, 0, 6, -6, 0, 'RFEF_OFFICIAL_WEB'),
        ('2026-27', 2, 16, 'aa8de564-c6cb-4689-9416-dbffb9c5bf56'::uuid, 1, 0, 0, 1, 2, 11, -9, 0, 'RFEF_OFFICIAL_WEB');

    GET DIAGNOSTICS v_total_insertados = ROW_COUNT;
    RAISE NOTICE '-> Inserciones: % registros de clasificación creados para Jornada 2.', v_total_insertados;

    IF v_total_insertados <> 16 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Se esperaban 16 registros de clasificación, insertados: %', v_total_insertados;
    END IF;

    RAISE NOTICE '============================================================';
    RAISE NOTICE '   J2-03 CLASIFICACIÓN COMPLETADA EXITOSAMENTE             ';
    RAISE NOTICE '============================================================';
END $$;
