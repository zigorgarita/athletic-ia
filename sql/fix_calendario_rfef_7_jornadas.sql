-- ============================================================================
-- SCRIPT TRANSACCIONAL DEFENSIVO: CORRECCIÓN ESTRUCTURAL DE LOCALÍAS RFEF
-- Partidos afectados (7): J4, J13, J14, J18, J19, J28, J29
--
-- GARANTÍAS DE MÁXIMA SEGURIDAD Y ENDURECIMIENTO:
-- 1. Modifica EXCLUSIVAMENTE la columna public.matches.es_local.
-- 2. CADA UPDATE exige explícitamente:
--    id + jornada + rival + es_local actual esperado + jugado = false.
-- 3. CERO escrituras en fechas, rivales, campos, resultados ni IDs.
-- 4. CERO eliminaciones (NO DELETE, NO TRUNCATE).
-- 5. PRECHECK estricto previo de las 7 condiciones completas.
-- 6. Verificación atómica de conteo (exactamente 7 filas modificadas en total).
-- 7. POSTCHECK estricto final verificando las 7 tuplas completas:
--    id + jornada + rival + es_local RFEF oficial + jugado = false.
-- 8. Transacción única en bloque DO $$ ... $$: cualquier discrepancia aborta
--    inmediatamente y revierte la base de datos (ROLLBACK automático).
-- 9. J3 ya fue corregida previamente y queda rigurosamente preservada.
--
-- ESTADO: PREPARADO PARA EJECUCIÓN MANUAL POR ZIGOR · NO EJECUTADO POR AGENTE
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_total_precheck INTEGER;
    v_rows_updated INTEGER := 0;
    v_step_count INTEGER;
    v_total_postcheck INTEGER;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE '  FASE 1/3: PRECHECK DEFENSIVO GLOBAL (7 JORNADAS)           ';
    RAISE NOTICE '============================================================';

    -- PRECHECK: Verificar que existen exactamente los 7 registros en su estado erróneo actual
    SELECT COUNT(*) INTO v_total_precheck
    FROM public.matches
    WHERE (
        (id = 'a04dd36b-44d0-4fe6-9d95-d1bfdcdd09d5' AND jornada = 4  AND rival ILIKE '%alavés%'   AND es_local = FALSE AND jugado = FALSE) OR
        (id = '4ed948d4-e63f-40e8-8466-53ba9ea696b2' AND jornada = 13 AND rival ILIKE '%athletic%' AND es_local = FALSE AND jugado = FALSE) OR
        (id = '911f86af-ebbb-4621-8718-d52f4bf7bf6f' AND jornada = 14 AND rival ILIKE '%betoño%'   AND es_local = TRUE  AND jugado = FALSE) OR
        (id = '70559ec3-a6c3-4160-9b9d-2073a13c62d1' AND jornada = 18 AND rival ILIKE '%leioa%'    AND es_local = FALSE AND jugado = FALSE) OR
        (id = 'ed7c4d70-77ce-4676-8f90-573536741f84' AND jornada = 19 AND rival ILIKE '%alavés%'   AND es_local = TRUE  AND jugado = FALSE) OR
        (id = 'bb3e2f09-7d6b-4181-816f-7c669e798a1e' AND jornada = 28 AND rival ILIKE '%athletic%' AND es_local = TRUE  AND jugado = FALSE) OR
        (id = 'a09e585c-bc94-4341-8de0-f1390ca2e54c' AND jornada = 29 AND rival ILIKE '%betoño%'   AND es_local = FALSE AND jugado = FALSE)
    );

    IF v_total_precheck <> 7 THEN
        RAISE EXCEPTION 'PRECHECK ABORTADO: Se esperaban 7 registros en estado previo erróneo, se encontraron %. Transacción cancelada sin modificaciones.', v_total_precheck;
    END IF;

    RAISE NOTICE '✅ PRECHECK CONFORME: Localizados los 7 registros con UUID, jornada, rival, es_local previo y jugado=false.';

    RAISE NOTICE '============================================================';
    RAISE NOTICE '  FASE 2/3: ACTUALIZACIÓN INDIVIDUAL ENDURECIDA              ';
    RAISE NOTICE '============================================================';

    -- J4: RFEF oficial -> INDAUTXU, S.D. (Local) vs Deportivo Alavés (Visitante)
    UPDATE public.matches
    SET es_local = TRUE
    WHERE id = 'a04dd36b-44d0-4fe6-9d95-d1bfdcdd09d5'
      AND jornada = 4
      AND rival ILIKE '%alavés%'
      AND es_local = FALSE
      AND jugado = FALSE;
    GET DIAGNOSTICS v_step_count = ROW_COUNT;
    IF v_step_count <> 1 THEN
        RAISE EXCEPTION 'ERROR J4: Fallo al actualizar J4. Filas afectadas: %. Abortando.', v_step_count;
    END IF;
    v_rows_updated := v_rows_updated + v_step_count;

    -- J13: RFEF oficial -> INDAUTXU, S.D. (Local) vs Athletic Club (Visitante)
    UPDATE public.matches
    SET es_local = TRUE
    WHERE id = '4ed948d4-e63f-40e8-8466-53ba9ea696b2'
      AND jornada = 13
      AND rival ILIKE '%athletic%'
      AND es_local = FALSE
      AND jugado = FALSE;
    GET DIAGNOSTICS v_step_count = ROW_COUNT;
    IF v_step_count <> 1 THEN
        RAISE EXCEPTION 'ERROR J13: Fallo al actualizar J13. Filas afectadas: %. Abortando.', v_step_count;
    END IF;
    v_rows_updated := v_rows_updated + v_step_count;

    -- J14: RFEF oficial -> CD Betoño (Local) vs INDAUTXU, S.D. (Visitante)
    UPDATE public.matches
    SET es_local = FALSE
    WHERE id = '911f86af-ebbb-4621-8718-d52f4bf7bf6f'
      AND jornada = 14
      AND rival ILIKE '%betoño%'
      AND es_local = TRUE
      AND jugado = FALSE;
    GET DIAGNOSTICS v_step_count = ROW_COUNT;
    IF v_step_count <> 1 THEN
        RAISE EXCEPTION 'ERROR J14: Fallo al actualizar J14. Filas afectadas: %. Abortando.', v_step_count;
    END IF;
    v_rows_updated := v_rows_updated + v_step_count;

    -- J18: RFEF oficial -> INDAUTXU, S.D. (Local) vs SD Leioa (Visitante)
    UPDATE public.matches
    SET es_local = TRUE
    WHERE id = '70559ec3-a6c3-4160-9b9d-2073a13c62d1'
      AND jornada = 18
      AND rival ILIKE '%leioa%'
      AND es_local = FALSE
      AND jugado = FALSE;
    GET DIAGNOSTICS v_step_count = ROW_COUNT;
    IF v_step_count <> 1 THEN
        RAISE EXCEPTION 'ERROR J18: Fallo al actualizar J18. Filas afectadas: %. Abortando.', v_step_count;
    END IF;
    v_rows_updated := v_rows_updated + v_step_count;

    -- J19: RFEF oficial -> Deportivo Alavés (Local) vs INDAUTXU, S.D. (Visitante)
    UPDATE public.matches
    SET es_local = FALSE
    WHERE id = 'ed7c4d70-77ce-4676-8f90-573536741f84'
      AND jornada = 19
      AND rival ILIKE '%alavés%'
      AND es_local = TRUE
      AND jugado = FALSE;
    GET DIAGNOSTICS v_step_count = ROW_COUNT;
    IF v_step_count <> 1 THEN
        RAISE EXCEPTION 'ERROR J19: Fallo al actualizar J19. Filas afectadas: %. Abortando.', v_step_count;
    END IF;
    v_rows_updated := v_rows_updated + v_step_count;

    -- J28: RFEF oficial -> Athletic Club (Local) vs INDAUTXU, S.D. (Visitante)
    UPDATE public.matches
    SET es_local = FALSE
    WHERE id = 'bb3e2f09-7d6b-4181-816f-7c669e798a1e'
      AND jornada = 28
      AND rival ILIKE '%athletic%'
      AND es_local = TRUE
      AND jugado = FALSE;
    GET DIAGNOSTICS v_step_count = ROW_COUNT;
    IF v_step_count <> 1 THEN
        RAISE EXCEPTION 'ERROR J28: Fallo al actualizar J28. Filas afectadas: %. Abortando.', v_step_count;
    END IF;
    v_rows_updated := v_rows_updated + v_step_count;

    -- J29: RFEF oficial -> INDAUTXU, S.D. (Local) vs CD Betoño (Visitante)
    UPDATE public.matches
    SET es_local = TRUE
    WHERE id = 'a09e585c-bc94-4341-8de0-f1390ca2e54c'
      AND jornada = 29
      AND rival ILIKE '%betoño%'
      AND es_local = FALSE
      AND jugado = FALSE;
    GET DIAGNOSTICS v_step_count = ROW_COUNT;
    IF v_step_count <> 1 THEN
        RAISE EXCEPTION 'ERROR J29: Fallo al actualizar J29. Filas afectadas: %. Abortando.', v_step_count;
    END IF;
    v_rows_updated := v_rows_updated + v_step_count;

    -- Validación estricta acumulada
    IF v_rows_updated <> 7 THEN
        RAISE EXCEPTION 'ERROR DE CONTEO TOTAL: Se esperaban 7 filas modificadas, se acumularon %. Abortando.', v_rows_updated;
    END IF;

    RAISE NOTICE '✅ ACTUALIZACIÓN CONFORME: Exactamente 7 filas modificadas (1 por jornada).';

    RAISE NOTICE '============================================================';
    RAISE NOTICE '  FASE 3/3: POSTCHECK DEFENSIVO GLOBAL (7 JORNADAS)          ';
    RAISE NOTICE '============================================================';

    -- POSTCHECK: Verificar las 7 condiciones oficiales completas RFEF
    SELECT COUNT(*) INTO v_total_postcheck
    FROM public.matches
    WHERE (
        (id = 'a04dd36b-44d0-4fe6-9d95-d1bfdcdd09d5' AND jornada = 4  AND rival ILIKE '%alavés%'   AND es_local = TRUE  AND jugado = FALSE) OR
        (id = '4ed948d4-e63f-40e8-8466-53ba9ea696b2' AND jornada = 13 AND rival ILIKE '%athletic%' AND es_local = TRUE  AND jugado = FALSE) OR
        (id = '911f86af-ebbb-4621-8718-d52f4bf7bf6f' AND jornada = 14 AND rival ILIKE '%betoño%'   AND es_local = FALSE AND jugado = FALSE) OR
        (id = '70559ec3-a6c3-4160-9b9d-2073a13c62d1' AND jornada = 18 AND rival ILIKE '%leioa%'    AND es_local = TRUE  AND jugado = FALSE) OR
        (id = 'ed7c4d70-77ce-4676-8f90-573536741f84' AND jornada = 19 AND rival ILIKE '%alavés%'   AND es_local = FALSE AND jugado = FALSE) OR
        (id = 'bb3e2f09-7d6b-4181-816f-7c669e798a1e' AND jornada = 28 AND rival ILIKE '%athletic%' AND es_local = FALSE AND jugado = FALSE) OR
        (id = 'a09e585c-bc94-4341-8de0-f1390ca2e54c' AND jornada = 29 AND rival ILIKE '%betoño%'   AND es_local = TRUE  AND jugado = FALSE)
    );

    IF v_total_postcheck <> 7 THEN
        RAISE EXCEPTION 'POSTCHECK ABORTADO: Solo % de 7 registros cumplen las condiciones oficiales finales RFEF. Transacción revertida completamente.', v_total_postcheck;
    END IF;

    RAISE NOTICE '============================================================';
    RAISE NOTICE '  POSTCHECK SUPERADO CON ÉXITO: 7/7 LOCALÍAS RFEF VERIFICADAS';
    RAISE NOTICE '============================================================';
END $$;

COMMIT;
