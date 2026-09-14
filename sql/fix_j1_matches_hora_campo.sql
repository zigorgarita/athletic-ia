-- ============================================================================
-- CORRECCIÓN MÍNIMA DE DATOS OFICIALES RFEF J1 EN public.matches
-- ============================================================================
-- Partido: Real Sociedad de Fútbol 5 – 1 SD Indautxu (Jornada 1)
-- matches.id: '0b77432e-aa46-446a-bc03-14924d37e662'
-- official_matches.rfef_cod_acta: 70692427
--
-- OBJETIVO:
-- Sincronizar 'hora' y 'campo' en public.matches para que coincidan
-- exactamente con el acta oficial RFEF ya vinculada en public.official_matches.
--
-- ESTADO: PREPARADO PARA EJECUCIÓN MANUAL POR ZIGOR · CERO EJECUCIONES AUTOMÁTICAS
-- ============================================================================

BEGIN;

DO $$
DECLARE
    v_match_id UUID := '0b77432e-aa46-446a-bc03-14924d37e662'::uuid;
    v_off_match_id UUID;
    v_acta_id INTEGER;
    
    -- Variables de control de datos en official_matches
    v_om_fecha DATE;
    v_om_hora TIME;
    v_om_campo TEXT;
    
    -- Variables de control de datos en matches
    v_m_fecha DATE;
    v_m_hora TIME;
    v_m_campo TEXT;
    v_m_jugado BOOLEAN;
    v_m_gf INTEGER;
    v_m_gc INTEGER;
BEGIN
    RAISE NOTICE '=== INICIANDO SINCRONIZACIÓN DE HORA Y CAMPO J1 (RFEF) ===';

    -- ------------------------------------------------------------------------
    -- 1. PRECHECKS DEFENSIVOS (READ-ONLY)
    -- ------------------------------------------------------------------------
    
    -- A. Verificar existencia de J1 en matches y obtener su vínculo official_match_id
    SELECT official_match_id, fecha, jugado, goles_favor, goles_contra
    INTO v_off_match_id, v_m_fecha, v_m_jugado, v_m_gf, v_m_gc
    FROM public.matches
    WHERE id = v_match_id AND jornada = 1;

    IF v_off_match_id IS NULL THEN
        RAISE EXCEPTION 'PRECHECK 1 FALLIDO: El partido J1 en public.matches no tiene vínculo official_match_id.';
    END IF;

    IF v_m_jugado IS NOT TRUE OR v_m_gf <> 1 OR v_m_gc <> 5 THEN
        RAISE EXCEPTION 'PRECHECK 2 FALLIDO: El partido J1 en public.matches no tiene el estado/marcador oficial esperado (1-5, jugado=true).';
    END IF;

    RAISE NOTICE '-> Precheck 1 OK: Partido J1 localizado con vínculo oficial % y marcador 1-5.', v_off_match_id;

    -- B. Verificar datos oficiales en public.official_matches
    SELECT rfef_cod_acta, fecha, hora, campo
    INTO v_acta_id, v_om_fecha, v_om_hora, v_om_campo
    FROM public.official_matches
    WHERE id = v_off_match_id;

    IF v_acta_id <> 70692427 THEN
        RAISE EXCEPTION 'PRECHECK 3 FALLIDO: El acta vinculada (%) no corresponde al CodActa 70692427 de J1.', v_acta_id;
    END IF;

    IF v_om_fecha <> '2026-09-06' OR v_om_hora <> '18:00:00' OR v_om_campo <> 'Instalaciones de Zubieta Z6 H.N.' THEN
        RAISE EXCEPTION 'PRECHECK 4 FALLIDO: Datos en official_matches incoherentes (Fecha: %, Hora: %, Campo: %).', v_om_fecha, v_om_hora, v_om_campo;
    END IF;

    RAISE NOTICE '-> Precheck 2 OK: Datos oficiales en official_matches confirmados: % %, Campo: %', v_om_fecha, v_om_hora, v_om_campo;

    -- ------------------------------------------------------------------------
    -- 2. ACTUALIZACIÓN MÍNIMA Y DEFENSIVA EN public.matches
    -- ------------------------------------------------------------------------
    UPDATE public.matches
    SET 
        hora = v_om_hora,
        campo = v_om_campo
    WHERE id = v_match_id;

    RAISE NOTICE '-> UPDATE completado: hora y campo actualizados en matches para J1.';

    -- ------------------------------------------------------------------------
    -- 3. POSTCHECKS ESTRICTOS: VALIDAR COHERENCIA 100% matches = official_matches
    -- ------------------------------------------------------------------------
    SELECT fecha, hora, campo
    INTO v_m_fecha, v_m_hora, v_m_campo
    FROM public.matches
    WHERE id = v_match_id;

    IF v_m_fecha IS DISTINCT FROM v_om_fecha THEN
        RAISE EXCEPTION 'POSTCHECK 1 FALLIDO: matches.fecha (%) <> official_matches.fecha (%).', v_m_fecha, v_om_fecha;
    END IF;

    IF v_m_hora IS DISTINCT FROM v_om_hora THEN
        RAISE EXCEPTION 'POSTCHECK 2 FALLIDO: matches.hora (%) <> official_matches.hora (%).', v_m_hora, v_om_hora;
    END IF;

    IF v_m_campo IS DISTINCT FROM v_om_campo THEN
        RAISE EXCEPTION 'POSTCHECK 3 FALLIDO: matches.campo (%) <> official_matches.campo (%).', v_m_campo, v_om_campo;
    END IF;

    RAISE NOTICE '-> POSTCHECKS OK: Coherencia 100%% confirmada entre matches y official_matches para J1.';
    RAISE NOTICE '   Fecha: % | Hora: % | Campo: %', v_m_fecha, v_m_hora, v_m_campo;
    RAISE NOTICE '=== J1 CORREGIDA CON ÉXITO: LISTA PARA COMMIT ===';
END $$;

COMMIT;
