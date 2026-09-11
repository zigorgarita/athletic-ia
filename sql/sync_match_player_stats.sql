-- =============================================================================
-- FUNCION RPC ATOMICA: sync_match_player_stats
-- Sincronización Transaccional de Convocatoria y Estadísticas de Jugadores
-- Indautxu 26/27 - S3.2.6-P4.1
-- =============================================================================
-- IMPORTANTE: Este script NO debe ejecutarse automáticamente.
-- Debe ser revisado y ejecutado manualmente por Zigor en Supabase SQL Editor.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_match_player_stats(
    p_match_id UUID,
    p_stats JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_item JSONB;
    v_player_id UUID;
    v_titular BOOLEAN;
    v_minutos INTEGER;
    v_goles INTEGER;
    v_asistencias INTEGER;
    v_tarjeta_amarilla BOOLEAN;
    v_tarjeta_roja BOOLEAN;
    v_recuperaciones INTEGER;
    v_intercepciones INTEGER;
    v_duelos_ganados INTEGER;
    v_pases_completados INTEGER;
    v_pases_totales INTEGER;
    
    v_submitted_player_ids UUID[] := ARRAY[]::UUID[];
    v_inserted INT := 0;
    v_updated INT := 0;
    v_deleted INT := 0;
    v_total_before INT;
    v_total_after INT;
    v_rfef_preserved INT;
    v_existing_id UUID;
BEGIN
    -- 1. Validar que el partido exista
    IF p_match_id IS NULL THEN
        RAISE EXCEPTION 'p_match_id no puede ser nulo';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.matches WHERE id = p_match_id) THEN
        RAISE EXCEPTION 'Partido con id % no encontrado en public.matches', p_match_id;
    END IF;

    -- 2. Validar que p_stats sea un array JSONB
    IF p_stats IS NULL OR jsonb_typeof(p_stats) != 'array' THEN
        RAISE EXCEPTION 'p_stats debe ser un array JSONB válido';
    END IF;

    -- Recuento inicial para telemetría
    SELECT COUNT(*) INTO v_total_before FROM public.match_player_stats WHERE match_id = p_match_id;

    -- 3. Procesar elementos del payload
    IF jsonb_array_length(p_stats) > 0 THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_stats)
        LOOP
            -- Extraer y validar player_id
            BEGIN
                v_player_id := (v_item->>'player_id')::UUID;
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION 'player_id inválido en payload: %', v_item->>'player_id';
            END;

            IF v_player_id IS NULL THEN
                RAISE EXCEPTION 'Cada elemento de p_stats debe incluir un player_id no nulo';
            END IF;

            -- Validar existencia del jugador en la tabla players
            IF NOT EXISTS (SELECT 1 FROM public.players WHERE id = v_player_id) THEN
                RAISE EXCEPTION 'El jugador con ID % no existe en la plantilla (public.players)', v_player_id;
            END IF;

            -- Validar duplicados dentro del mismo payload
            IF v_player_id = ANY(v_submitted_player_ids) THEN
                RAISE EXCEPTION 'Jugador duplicado en el payload enviado: %', v_player_id;
            END IF;
            v_submitted_player_ids := array_append(v_submitted_player_ids, v_player_id);

            -- Extraer y normalizar campos numéricos y booleanos
            v_titular := COALESCE((v_item->>'titular')::BOOLEAN, false);
            v_minutos := GREATEST(0, LEAST(120, COALESCE((v_item->>'minutos')::INTEGER, 0)));
            v_goles := GREATEST(0, COALESCE((v_item->>'goles')::INTEGER, 0));
            v_asistencias := GREATEST(0, COALESCE((v_item->>'asistencias')::INTEGER, 0));
            v_tarjeta_amarilla := COALESCE((v_item->>'tarjeta_amarilla')::BOOLEAN, false);
            v_tarjeta_roja := COALESCE((v_item->>'tarjeta_roja')::BOOLEAN, false);
            v_recuperaciones := GREATEST(0, COALESCE((v_item->>'recuperaciones')::INTEGER, 0));
            v_intercepciones := GREATEST(0, COALESCE((v_item->>'intercepciones')::INTEGER, 0));
            v_duelos_ganados := GREATEST(0, COALESCE((v_item->>'duelos_ganados')::INTEGER, 0));
            v_pases_completados := GREATEST(0, COALESCE((v_item->>'pases_completados')::INTEGER, 0));
            v_pases_totales := GREATEST(0, COALESCE((v_item->>'pases_totales')::INTEGER, 0));

            -- Comprobar si ya existe fila para (p_match_id, v_player_id)
            SELECT id INTO v_existing_id
            FROM public.match_player_stats
            WHERE match_id = p_match_id AND player_id = v_player_id;

            IF v_existing_id IS NOT NULL THEN
                -- ACTUALIZAR FILA EXISTENTE CONSERVANDO SU UUID, CREATED_AT, ORIGEN Y METADATOS FEDERATIVOS RFEF
                UPDATE public.match_player_stats
                SET
                    titular = v_titular,
                    minutos = v_minutos,
                    goles = v_goles,
                    asistencias = v_asistencias,
                    tarjeta_amarilla = v_tarjeta_amarilla,
                    tarjeta_roja = v_tarjeta_roja,
                    recuperaciones = v_recuperaciones,
                    intercepciones = v_intercepciones,
                    duelos_ganados = v_duelos_ganados,
                    pases_completados = v_pases_completados,
                    pases_totales = v_pases_totales,
                    convocado = true,
                    suplente = NOT v_titular
                    -- PRESERVADOS ESTRICTAMENTE: id, created_at, origen, rfef_acta_id, dorsal_partido,
                    -- entro_banquillo, minuto_entrada, minuto_salida, goles_encajados, doble_amarilla, roja_directa
                WHERE id = v_existing_id;

                v_updated := v_updated + 1;
            ELSE
                -- INSERTAR NUEVA FILA MANUAL CON NUEVO UUID
                INSERT INTO public.match_player_stats (
                    id,
                    match_id,
                    player_id,
                    titular,
                    minutos,
                    goles,
                    asistencias,
                    tarjeta_amarilla,
                    tarjeta_roja,
                    recuperaciones,
                    intercepciones,
                    duelos_ganados,
                    pases_completados,
                    pases_totales,
                    convocado,
                    suplente,
                    origen,
                    rfef_acta_id,
                    created_at
                ) VALUES (
                    gen_random_uuid(),
                    p_match_id,
                    v_player_id,
                    v_titular,
                    v_minutos,
                    v_goles,
                    v_asistencias,
                    v_tarjeta_amarilla,
                    v_tarjeta_roja,
                    v_recuperaciones,
                    v_intercepciones,
                    v_duelos_ganados,
                    v_pases_completados,
                    v_pases_totales,
                    true,
                    NOT v_titular,
                    'manual',
                    NULL,
                    now()
                );

                v_inserted := v_inserted + 1;
            END IF;
        END LOOP;
    END IF;

    -- 4. ELIMINACIÓN SEGURA CON PROTECCIÓN RFEF ESTRICTA:
    -- Solo se eliminan las filas con origen = 'manual' que ya no estén en la convocatoria enviada.
    -- Las filas con origen = 'rfef' están BLINDADAS: NUNCA se eliminan por una sincronización manual.
    WITH deleted_rows AS (
        DELETE FROM public.match_player_stats
        WHERE match_id = p_match_id
          AND origen = 'manual'
          AND NOT (player_id = ANY(v_submitted_player_ids))
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted FROM deleted_rows;

    -- 5. Comprobar registros finales y contar RFEF preservados
    SELECT COUNT(*) INTO v_total_after FROM public.match_player_stats WHERE match_id = p_match_id;
    SELECT COUNT(*) INTO v_rfef_preserved FROM public.match_player_stats WHERE match_id = p_match_id AND origen = 'rfef';

    RETURN jsonb_build_object(
        'success', true,
        'match_id', p_match_id,
        'total_before', v_total_before,
        'total_after', v_total_after,
        'inserted_count', v_inserted,
        'updated_count', v_updated,
        'deleted_count', v_deleted,
        'submitted_count', array_length(v_submitted_player_ids, 1),
        'rfef_preserved_count', v_rfef_preserved
    );
END;
$$;

-- =============================================================================
-- PERMISOS Y SEGURIDAD ESTRICTA (PRINCIPIO DE MÍNIMO PRIVILEGIO)
-- =============================================================================
-- Revocar ejecución directa a roles públicos o de cliente anónimo/autenticado
REVOKE ALL ON FUNCTION public.sync_match_player_stats(UUID, JSONB) FROM PUBLIC, anon, authenticated;

-- Conceder ejecución exclusivamente a service_role y postgres (usados desde Next.js server-side)
GRANT EXECUTE ON FUNCTION public.sync_match_player_stats(UUID, JSONB) TO postgres, service_role;

COMMENT ON FUNCTION public.sync_match_player_stats(UUID, JSONB) IS 
'Sincronización atómica de convocatoria y estadísticas de jugadores por partido. Preserva UUIDs, created_at y metadatos RFEF existentes. Blindaje contra borrado de filas RFEF.';
