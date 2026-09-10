-- =============================================================================
-- FUNCION RPC: save_gps_session_atomic
-- Guardado Atómico y Transaccional de Sesiones y Datos GPS
-- Indautxu 26/27 - S3.2.6-P3
-- =============================================================================

CREATE OR REPLACE FUNCTION public.save_gps_session_atomic(
    p_session JSONB,
    p_rows JSONB DEFAULT '[]'::jsonb,
    p_mappings JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session_id UUID;
    v_match_id UUID := NULL;
    v_tournament_match_id UUID := NULL;
    v_fecha DATE;
    v_descripcion TEXT;
    v_mapping_elem JSONB;
    v_row_elem JSONB;
    v_player_id UUID;
    v_mappings_count INT := 0;
    v_rows_count INT := 0;
    v_raw_id TEXT;
    v_raw_match_id TEXT;
    v_raw_tm_id TEXT;
BEGIN
    -- 1. Validar y procesar p_session
    IF p_session IS NULL THEN
        RAISE EXCEPTION 'p_session no puede ser nulo';
    END IF;

    v_raw_id := p_session->>'id';
    v_raw_match_id := p_session->>'match_id';
    v_raw_tm_id := p_session->>'tournament_match_id';
    v_fecha := (p_session->>'fecha')::DATE;
    v_descripcion := p_session->>'descripcion';

    IF v_fecha IS NULL THEN
        RAISE EXCEPTION 'La fecha de la sesión GPS es obligatoria';
    END IF;

    IF v_raw_match_id IS NOT NULL AND length(trim(v_raw_match_id)) > 0 THEN
        v_match_id := trim(v_raw_match_id)::UUID;
    END IF;

    IF v_raw_tm_id IS NOT NULL AND length(trim(v_raw_tm_id)) > 0 THEN
        v_tournament_match_id := trim(v_raw_tm_id)::UUID;
    END IF;

    IF v_match_id IS NULL AND v_tournament_match_id IS NULL THEN
        RAISE EXCEPTION 'La sesión GPS debe estar vinculada a un partido (match_id) o sub-partido de torneo (tournament_match_id)';
    END IF;

    -- Resolver o crear UUID de la sesión
    IF v_raw_id IS NOT NULL AND length(trim(v_raw_id)) > 0 AND v_raw_id !~* '^temp-' THEN
        v_session_id := trim(v_raw_id)::UUID;
    ELSE
        -- Buscar si ya existe una sesión para ese match_id o tournament_match_id
        IF v_tournament_match_id IS NOT NULL THEN
            SELECT id INTO v_session_id
            FROM public.gps_sessions
            WHERE tournament_match_id = v_tournament_match_id
            LIMIT 1;
        ELSIF v_match_id IS NOT NULL THEN
            SELECT id INTO v_session_id
            FROM public.gps_sessions
            WHERE match_id = v_match_id
            LIMIT 1;
        END IF;

        IF v_session_id IS NULL THEN
            v_session_id := gen_random_uuid();
        END IF;
    END IF;

    -- 2. Guardar / Actualizar Mappings de Jugadores en gps_player_mappings
    IF p_mappings IS NOT NULL AND jsonb_array_length(p_mappings) > 0 THEN
        FOR v_mapping_elem IN SELECT * FROM jsonb_array_elements(p_mappings) LOOP
            IF (v_mapping_elem->>'source_name_normalized') IS NOT NULL 
               AND length(trim(v_mapping_elem->>'source_name_normalized')) > 0 
               AND (v_mapping_elem->>'player_id') IS NOT NULL THEN
                
                INSERT INTO public.gps_player_mappings (
                    source_name,
                    source_name_normalized,
                    player_id,
                    updated_at
                ) VALUES (
                    v_mapping_elem->>'source_name',
                    trim(v_mapping_elem->>'source_name_normalized'),
                    (v_mapping_elem->>'player_id')::UUID,
                    COALESCE((v_mapping_elem->>'updated_at')::TIMESTAMPTZ, now())
                )
                ON CONFLICT (source_name_normalized) DO UPDATE SET
                    source_name = EXCLUDED.source_name,
                    player_id = EXCLUDED.player_id,
                    updated_at = EXCLUDED.updated_at;

                v_mappings_count := v_mappings_count + 1;
            END IF;
        END LOOP;
    END IF;

    -- 3. Upsert atómico en gps_sessions
    IF v_tournament_match_id IS NOT NULL THEN
        INSERT INTO public.gps_sessions (
            id,
            tournament_match_id,
            match_id,
            fecha,
            descripcion
        ) VALUES (
            v_session_id,
            v_tournament_match_id,
            NULL,
            v_fecha,
            v_descripcion
        )
        ON CONFLICT (tournament_match_id) DO UPDATE SET
            fecha = EXCLUDED.fecha,
            descripcion = EXCLUDED.descripcion
        RETURNING id INTO v_session_id;
    ELSE
        INSERT INTO public.gps_sessions (
            id,
            match_id,
            tournament_match_id,
            fecha,
            descripcion
        ) VALUES (
            v_session_id,
            v_match_id,
            NULL,
            v_fecha,
            v_descripcion
        )
        ON CONFLICT (match_id) DO UPDATE SET
            fecha = EXCLUDED.fecha,
            descripcion = EXCLUDED.descripcion
        RETURNING id INTO v_session_id;
    END IF;

    -- 4. Sustitución atómica de gps_data
    -- Se eliminan las filas previas exclusivamente de esta sesión para insertar el nuevo set validado
    -- Si falla la inserción de cualquier fila posterior, la transacción revierte TODO automáticamente.
    DELETE FROM public.gps_data
    WHERE session_id = v_session_id;

    IF p_rows IS NOT NULL AND jsonb_array_length(p_rows) > 0 THEN
        FOR v_row_elem IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
            v_player_id := NULL;
            IF (v_row_elem->>'player_id') IS NOT NULL AND length(trim(v_row_elem->>'player_id')) > 0 THEN
                v_player_id := (v_row_elem->>'player_id')::UUID;
            END IF;

            INSERT INTO public.gps_data (
                session_id,
                player_id,
                gps_id,
                minutos,
                distancia_total,
                hsr,
                sprint_distance,
                num_sprints,
                velocidad_maxima,
                aceleraciones,
                aceleraciones_max,
                deceleraciones,
                deceleraciones_max,
                player_load,
                raw_data
            ) VALUES (
                v_session_id,
                v_player_id,
                COALESCE(v_row_elem->>'gps_id', 'Jugador'),
                COALESCE((v_row_elem->>'minutos')::INTEGER, 0),
                COALESCE((v_row_elem->>'distancia_total')::NUMERIC, 0),
                (v_row_elem->>'hsr')::NUMERIC,
                (v_row_elem->>'sprint_distance')::NUMERIC,
                (v_row_elem->>'num_sprints')::INTEGER,
                (v_row_elem->>'velocidad_maxima')::NUMERIC,
                (v_row_elem->>'aceleraciones')::INTEGER,
                (v_row_elem->>'aceleraciones_max')::INTEGER,
                (v_row_elem->>'deceleraciones')::INTEGER,
                (v_row_elem->>'deceleraciones_max')::INTEGER,
                (v_row_elem->>'player_load')::NUMERIC,
                COALESCE(v_row_elem->'raw_data', '{}'::jsonb)
            );

            v_rows_count := v_rows_count + 1;
        END LOOP;
    END IF;

    -- 5. Retorno de diagnóstico estructurado
    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'mappings_saved', v_mappings_count,
        'rows_saved', v_rows_count
    );
END;
$$;

-- Seguridad estricta: Revocar ejecución pública; solo service_role y postgres
REVOKE ALL ON FUNCTION public.save_gps_session_atomic(JSONB, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_gps_session_atomic(JSONB, JSONB, JSONB) TO service_role, postgres;
