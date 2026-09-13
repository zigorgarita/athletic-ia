-- =============================================================================
-- FUNCION RPC ATOMICA: sync_match_own_analysis_video_players
-- Sincronización Transaccional de Jugadores Asignados a Vídeo de Análisis Propio
-- Indautxu 26/27 - S3.2.6 P4.4.2
-- =============================================================================
-- REGLA DE SEGURIDAD ESTRICTA:
-- Este script NO debe ejecutarse automáticamente por ninguna herramienta.
-- Zigor lo revisará y ejecutará manualmente en Supabase SQL Editor.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_match_own_analysis_video_players(
    p_video_id UUID,
    p_player_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_before INT := 0;
    v_total_after INT := 0;
    v_deleted INT := 0;
    v_inserted INT := 0;
    v_unique_player_ids UUID[] := ARRAY[]::UUID[];
    v_invalid_players UUID[] := ARRAY[]::UUID[];
    v_submitted_count INT := 0;
    v_final_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    -- 1. Validar que el ID del vídeo no sea nulo
    IF p_video_id IS NULL THEN
        RAISE EXCEPTION 'p_video_id no puede ser nulo';
    END IF;

    -- 2. Validar que el vídeo exista en match_own_analysis_videos
    IF NOT EXISTS (SELECT 1 FROM public.match_own_analysis_videos WHERE id = p_video_id) THEN
        RAISE EXCEPTION 'Vídeo con id % no encontrado en match_own_analysis_videos', p_video_id;
    END IF;

    -- 3. Fail-Closed para p_player_ids IS NULL
    -- Evita que una llamada accidental con valor nulo vacíe las asociaciones
    IF p_player_ids IS NULL THEN
        RAISE EXCEPTION 'p_player_ids no puede ser nulo. Para desasignar todos los jugadores pase un array vacío: ARRAY[]::UUID[]';
    END IF;

    -- 4. Fail-Closed para elementos NULL dentro del array
    -- Si existe cualquier elemento NULL en la lista, abortar de inmediato sin modificar nada
    IF array_position(p_player_ids, NULL) IS NOT NULL THEN
        RAISE EXCEPTION 'p_player_ids contiene uno o más elementos nulos (NULL). Operación cancelada sin modificaciones.';
    END IF;

    -- 5. Normalizar la lista: deduplicar UUIDs válidos
    SELECT COALESCE(ARRAY_AGG(DISTINCT pid), ARRAY[]::UUID[])
    INTO v_unique_player_ids
    FROM unnest(p_player_ids) AS pid;

    v_submitted_count := cardinality(v_unique_player_ids);

    -- 6. Validar que TODOS los jugadores existan en public.players (Fail-before-mutation)
    IF v_submitted_count > 0 THEN
        SELECT COALESCE(ARRAY_AGG(pid), ARRAY[]::UUID[])
        INTO v_invalid_players
        FROM unnest(v_unique_player_ids) AS pid
        WHERE NOT EXISTS (SELECT 1 FROM public.players WHERE id = pid);

        IF cardinality(v_invalid_players) > 0 THEN
            RAISE EXCEPTION 'Operación cancelada: los siguientes player_id no existen en la tabla players: %', v_invalid_players;
        END IF;
    END IF;

    -- Recuento inicial para auditoría y telemetría
    SELECT COUNT(*) INTO v_total_before
    FROM public.match_own_analysis_video_players
    WHERE video_id = p_video_id;

    -- 7. Eliminación de asociaciones obsoletas:
    -- Elimina de match_own_analysis_video_players las relaciones que ya no estén en v_unique_player_ids
    -- Si v_unique_player_ids está vacío (cardinality = 0), elimina todas las asociaciones para este vídeo
    IF v_submitted_count = 0 THEN
        DELETE FROM public.match_own_analysis_video_players
        WHERE video_id = p_video_id;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;
    ELSE
        DELETE FROM public.match_own_analysis_video_players
        WHERE video_id = p_video_id
          AND player_id != ALL(v_unique_player_ids);
        GET DIAGNOSTICS v_deleted = ROW_COUNT;
    END IF;

    -- 8. Inserción de nuevas asociaciones preservando las existentes
    -- ON CONFLICT evita errores y conserva la fecha de creación original de las asociaciones previas
    IF v_submitted_count > 0 THEN
        INSERT INTO public.match_own_analysis_video_players (video_id, player_id)
        SELECT p_video_id, pid
        FROM unnest(v_unique_player_ids) AS pid
        ON CONFLICT (video_id, player_id) DO NOTHING;
        
        GET DIAGNOSTICS v_inserted = ROW_COUNT;
    END IF;

    -- 9. Recuento final y lista de IDs sincronizados
    SELECT COUNT(*), COALESCE(ARRAY_AGG(player_id ORDER BY created_at ASC), ARRAY[]::UUID[])
    INTO v_total_after, v_final_ids
    FROM public.match_own_analysis_video_players
    WHERE video_id = p_video_id;

    -- 10. Retorno estructurado con telemetría completa
    RETURN jsonb_build_object(
        'success', true,
        'video_id', p_video_id,
        'total_before', v_total_before,
        'total_after', v_total_after,
        'added', v_inserted,
        'removed', v_deleted,
        'assigned_player_ids', v_final_ids
    );
END;
$$;

-- =============================================================================
-- POLÍTICA DE PERMISOS (Principio de Mínimo Privilegio)
-- El RPC solo debe ser consumido desde servidor autenticado (service_role)
-- Se bloquea expresamente la invocación pública, anónima o autenticada directa desde navegador.
-- =============================================================================
REVOKE ALL ON FUNCTION public.sync_match_own_analysis_video_players(UUID, UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_match_own_analysis_video_players(UUID, UUID[]) FROM anon;
REVOKE ALL ON FUNCTION public.sync_match_own_analysis_video_players(UUID, UUID[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_match_own_analysis_video_players(UUID, UUID[]) TO service_role;
