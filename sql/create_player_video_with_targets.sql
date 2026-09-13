-- =============================================================================
-- FUNCION RPC ATOMICA: create_player_video_with_targets
-- Creación Transaccional de Vídeo Individual (Tipo B) + Asignación de Jugadores
-- Indautxu 26/27 - S3.2.6 P4.4.5 (Fase B1)
-- =============================================================================
-- REGLA DE SEGURIDAD ESTRICTA:
-- Este script NO debe ejecutarse automáticamente por ninguna herramienta.
-- Zigor lo revisará y ejecutará manualmente en Supabase SQL Editor.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_player_video_with_targets(
    p_titulo TEXT,
    p_categoria TEXT,
    p_comentario_tecnico TEXT,
    p_video_url TEXT,
    p_drive_file_id TEXT,
    p_tipo_origen TEXT,
    p_tamano_bytes BIGINT,
    p_primary_player_id UUID,
    p_secondary_player_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_video_id UUID;
    v_clean_title TEXT;
    v_clean_category TEXT;
    v_clean_origin TEXT;
    v_unique_secondaries UUID[] := ARRAY[]::UUID[];
    v_invalid_players UUID[] := ARRAY[]::UUID[];
BEGIN
    -- 1. Validar que el ID del jugador principal no sea nulo
    IF p_primary_player_id IS NULL THEN
        RAISE EXCEPTION 'p_primary_player_id no puede ser nulo';
    END IF;

    -- 2. Validar que el jugador principal exista en la tabla players
    IF NOT EXISTS (SELECT 1 FROM public.players WHERE id = p_primary_player_id) THEN
        RAISE EXCEPTION 'Jugador principal con id % no encontrado en la tabla players', p_primary_player_id;
    END IF;

    -- 3. Validar título no vacío
    v_clean_title := trim(p_titulo);
    IF v_clean_title IS NULL OR v_clean_title = '' THEN
        RAISE EXCEPTION 'El título del vídeo no puede ser nulo ni estar vacío';
    END IF;

    -- 4. Validar tipo_origen y contenido correspondiente
    v_clean_origin := trim(p_tipo_origen);
    IF v_clean_origin IS NULL OR v_clean_origin NOT IN ('Enlace', 'Archivo') THEN
        RAISE EXCEPTION 'tipo_origen inválido (%). Debe ser "Enlace" o "Archivo"', p_tipo_origen;
    END IF;

    IF NULLIF(trim(p_video_url), '') IS NULL AND NULLIF(trim(p_drive_file_id), '') IS NULL THEN
        RAISE EXCEPTION 'Debe proporcionarse al menos un enlace de vídeo (video_url) o un identificador de Google Drive (drive_file_id)';
    END IF;

    -- 5. Normalizar categoría (default 'Seguimiento Individual' si viene vacía)
    v_clean_category := COALESCE(NULLIF(trim(p_categoria), ''), 'Seguimiento Individual');

    -- 6. Validar array de secundarios: fail-closed si contiene elementos NULL
    IF p_secondary_player_ids IS NOT NULL THEN
        IF array_position(p_secondary_player_ids, NULL) IS NOT NULL THEN
            RAISE EXCEPTION 'secondary_player_ids contiene uno o más elementos nulos (NULL). Operación cancelada.';
        END IF;

        -- Deduplicar secundarios y excluir al jugador principal si fue incluido por error
        SELECT COALESCE(ARRAY_AGG(DISTINCT pid), ARRAY[]::UUID[])
        INTO v_unique_secondaries
        FROM unnest(p_secondary_player_ids) AS pid
        WHERE pid != p_primary_player_id;
    END IF;

    -- 7. Validar que TODOS los secundarios existan en la tabla players
    IF cardinality(v_unique_secondaries) > 0 THEN
        SELECT COALESCE(ARRAY_AGG(pid), ARRAY[]::UUID[])
        INTO v_invalid_players
        FROM unnest(v_unique_secondaries) AS pid
        WHERE NOT EXISTS (SELECT 1 FROM public.players WHERE id = pid);

        IF cardinality(v_invalid_players) > 0 THEN
            RAISE EXCEPTION 'Operación cancelada: los siguientes secondary_player_ids no existen en la tabla players: %', v_invalid_players;
        END IF;
    END IF;

    -- 8. Inserción atómica en player_videos
    INSERT INTO public.player_videos (
        titulo,
        categoria,
        comentario_tecnico,
        video_url,
        drive_file_id,
        tipo_origen,
        tamano_bytes
    ) VALUES (
        v_clean_title,
        v_clean_category,
        NULLIF(trim(p_comentario_tecnico), ''),
        NULLIF(trim(p_video_url), ''),
        NULLIF(trim(p_drive_file_id), ''),
        v_clean_origin,
        p_tamano_bytes
    )
    RETURNING id INTO v_video_id;

    -- 9. Inserción del Jugador Principal (is_primary = true)
    INSERT INTO public.player_video_targets (
        video_id,
        player_id,
        is_primary
    ) VALUES (
        v_video_id,
        p_primary_player_id,
        true
    );

    -- 10. Inserción de Jugadores Secundarios (is_primary = false)
    IF cardinality(v_unique_secondaries) > 0 THEN
        INSERT INTO public.player_video_targets (
            video_id,
            player_id,
            is_primary
        )
        SELECT
            v_video_id,
            pid,
            false
        FROM unnest(v_unique_secondaries) AS pid;
    END IF;

    -- 11. Retorno estructurado con datos del registro y asociaciones creadas
    RETURN jsonb_build_object(
        'success', true,
        'video_id', v_video_id,
        'primary_player_id', p_primary_player_id,
        'secondary_player_ids', v_unique_secondaries,
        'total_targets', 1 + cardinality(v_unique_secondaries)
    );
END;
$$;

-- =============================================================================
-- POLÍTICA DE PERMISOS (Principio de Mínimo Privilegio)
-- El RPC solo debe ser consumido server-side mediante service_role.
-- Se bloquea expresamente la invocación pública, anónima o autenticada directa desde navegador.
-- =============================================================================
REVOKE ALL ON FUNCTION public.create_player_video_with_targets(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, UUID, UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_player_video_with_targets(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, UUID, UUID[]) FROM anon;
REVOKE ALL ON FUNCTION public.create_player_video_with_targets(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, UUID, UUID[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_player_video_with_targets(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, UUID, UUID[]) TO service_role;
