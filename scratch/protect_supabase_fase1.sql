-- =========================================================================
-- PROPUESTA DE MITIGACIÓN FASE 1: SECURE DATABASE OPERATIONS VIA RPC
-- =========================================================================

-- 1. Eliminar políticas públicas abiertas de inserción, edición y borrado (prevención de conflictos)
DROP POLICY IF EXISTS "Public Insert" ON players;
DROP POLICY IF EXISTS "Public Update" ON players;
DROP POLICY IF EXISTS "Public Delete" ON players;
DROP POLICY IF EXISTS "Permitir inserción de jugadores" ON players;
DROP POLICY IF EXISTS "Permitir actualización de jugadores" ON players;
DROP POLICY IF EXISTS "Permitir eliminación de jugadores" ON players;

DROP POLICY IF EXISTS "Public Insert" ON detailed_evaluations;
DROP POLICY IF EXISTS "Public Update" ON detailed_evaluations;
DROP POLICY IF EXISTS "Public Delete" ON detailed_evaluations;

DROP POLICY IF EXISTS "Public Insert" ON observaciones;
DROP POLICY IF EXISTS "Public Update" ON observaciones;
DROP POLICY IF EXISTS "Public Delete" ON observaciones;

DROP POLICY IF EXISTS "Public Insert" ON player_injuries;
DROP POLICY IF EXISTS "Public Update" ON player_injuries;
DROP POLICY IF EXISTS "Public Delete" ON player_injuries;
DROP POLICY IF EXISTS "Public Delete Injuries" ON player_injuries;

DROP POLICY IF EXISTS "Public Insert Attendance" ON training_attendance;
DROP POLICY IF EXISTS "Public Update Attendance" ON training_attendance;
DROP POLICY IF EXISTS "Public Delete Attendance" ON training_attendance;

DROP POLICY IF EXISTS "Public Insert Training Evaluations" ON training_evaluations;
DROP POLICY IF EXISTS "Public Update Training Evaluations" ON training_evaluations;
DROP POLICY IF EXISTS "Public Delete Training Evaluations" ON training_evaluations;

DROP POLICY IF EXISTS "Public Insert" ON matches;
DROP POLICY IF EXISTS "Public Update" ON matches;
DROP POLICY IF EXISTS "Public Delete" ON matches;

DROP POLICY IF EXISTS "Public Insert" ON match_player_stats;
DROP POLICY IF EXISTS "Public Update" ON match_player_stats;
DROP POLICY IF EXISTS "Public Delete" ON match_player_stats;

DROP POLICY IF EXISTS "Public Insert" ON gps_sessions;
DROP POLICY IF EXISTS "Public Update" ON gps_sessions;
DROP POLICY IF EXISTS "Public Delete" ON gps_sessions;

DROP POLICY IF EXISTS "Public Insert" ON gps_data;
DROP POLICY IF EXISTS "Public Update" ON gps_data;
DROP POLICY IF EXISTS "Public Delete" ON gps_data;

DROP POLICY IF EXISTS "Public Insert" ON abp_plays;
DROP POLICY IF EXISTS "Public Update" ON abp_plays;
DROP POLICY IF EXISTS "Public Delete" ON abp_plays;

DROP POLICY IF EXISTS "Public Insert" ON abp_player_roles;
DROP POLICY IF EXISTS "Public Update" ON abp_player_roles;
DROP POLICY IF EXISTS "Public Delete" ON abp_player_roles;

DROP POLICY IF EXISTS "Public Insert" ON tactical_lineups;
DROP POLICY IF EXISTS "Public Update" ON tactical_lineups;
DROP POLICY IF EXISTS "Public Delete" ON tactical_lineups;

DROP POLICY IF EXISTS "Public Write Match ABP" ON match_abp_plays;
DROP POLICY IF EXISTS "Public Update Match ABP" ON match_abp_plays;
DROP POLICY IF EXISTS "Public Delete Match ABP" ON match_abp_plays;

DROP POLICY IF EXISTS "Public Write Match ABP Roles" ON match_abp_player_roles;
DROP POLICY IF EXISTS "Public Update Match ABP Roles" ON match_abp_player_roles;
DROP POLICY IF EXISTS "Public Delete Match ABP Roles" ON match_abp_player_roles;

DROP POLICY IF EXISTS "Public Write Match Full Videos" ON match_full_videos;
DROP POLICY IF EXISTS "Public Update Match Full Videos" ON match_full_videos;
DROP POLICY IF EXISTS "Public Delete Match Full Videos" ON match_full_videos;

DROP POLICY IF EXISTS "Public Write Match Video Clips" ON match_video_clips;
DROP POLICY IF EXISTS "Public Update Match Video Clips" ON match_video_clips;
DROP POLICY IF EXISTS "Public Delete Match Video Clips" ON match_video_clips;

DROP POLICY IF EXISTS "Public Write Match Strategic" ON match_strategic_actions;
DROP POLICY IF EXISTS "Public Update Match Strategic" ON match_strategic_actions;
DROP POLICY IF EXISTS "Public Delete Match Strategic" ON match_strategic_actions;

DROP POLICY IF EXISTS "Public Write Match Custom" ON match_custom_videos;
DROP POLICY IF EXISTS "Public Update Match Custom" ON match_custom_videos;
DROP POLICY IF EXISTS "Public Delete Match Custom" ON match_custom_videos;

DROP POLICY IF EXISTS "Public Write Match Documents" ON match_documents;
DROP POLICY IF EXISTS "Public Update Match Documents" ON match_documents;
DROP POLICY IF EXISTS "Public Delete Match Documents" ON match_documents;

DROP POLICY IF EXISTS "Public Insert" ON planning_periods;
DROP POLICY IF EXISTS "Public Update" ON planning_periods;
DROP POLICY IF EXISTS "Public Delete" ON planning_periods;

DROP POLICY IF EXISTS "Public Insert" ON planning_sessions;
DROP POLICY IF EXISTS "Public Update" ON planning_sessions;
DROP POLICY IF EXISTS "Public Delete" ON planning_sessions;

DROP POLICY IF EXISTS "Public Insert" ON planning_concepts;
DROP POLICY IF EXISTS "Public Update" ON planning_concepts;
DROP POLICY IF EXISTS "Public Delete" ON planning_concepts;

DROP POLICY IF EXISTS "Public Insert" ON planning_tasks;
DROP POLICY IF EXISTS "Public Update" ON planning_tasks;
DROP POLICY IF EXISTS "Public Delete" ON planning_tasks;

DROP POLICY IF EXISTS "Public Insert" ON planning_session_players;
DROP POLICY IF EXISTS "Public Update" ON planning_session_players;
DROP POLICY IF EXISTS "Public Delete" ON planning_session_players;

DROP POLICY IF EXISTS "Public Insert" ON planning_documents;
DROP POLICY IF EXISTS "Public Update" ON planning_documents;
DROP POLICY IF EXISTS "Public Delete" ON planning_documents;

DROP POLICY IF EXISTS "Public Insert Task Library" ON planning_task_library;
DROP POLICY IF EXISTS "Public Update Task Library" ON planning_task_library;
DROP POLICY IF EXISTS "Public Delete Task Library" ON planning_task_library;

DROP POLICY IF EXISTS "Permitir inserción de videos" ON match_videos;
DROP POLICY IF EXISTS "Permitir actualización de videos" ON match_videos;
DROP POLICY IF EXISTS "Permitir eliminación de videos" ON match_videos;


-- 2. Asegurar que las políticas de Lectura Pública (SELECT) están activas y son las únicas
CREATE OR REPLACE FUNCTION recreate_select_policies()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    t TEXT;
    tables_to_secure TEXT[] := ARRAY[
        'players', 'detailed_evaluations', 'observaciones', 'player_injuries',
        'training_attendance', 'training_evaluations', 'matches', 'match_player_stats',
        'gps_sessions', 'gps_data', 'abp_plays', 'abp_player_roles', 'tactical_lineups',
        'match_abp_plays', 'match_abp_player_roles', 'match_full_videos', 'match_video_clips',
        'match_strategic_actions', 'match_custom_videos', 'match_documents', 'planning_periods',
        'planning_sessions', 'planning_concepts', 'planning_tasks', 'planning_session_players',
        'planning_documents', 'planning_task_library', 'match_videos'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_secure
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS "Public SELECT only" ON %I;', t);
        EXECUTE format('CREATE POLICY "Public SELECT only" ON %I FOR SELECT USING (true);', t);
    END LOOP;
END;
$$;

SELECT recreate_select_policies();
DROP FUNCTION recreate_select_policies();


-- 3. Crear las funciones RPC seguras (SECURITY DEFINER)
-- Estas funciones evitan el RLS y validan la contraseña

-- A) Eliminar seguro genérico
CREATE OR REPLACE FUNCTION exec_secure_delete(
    target_table TEXT,
    record_id UUID,
    staff_passkey TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF staff_passkey != 'indautxu2026' THEN
        RAISE EXCEPTION 'Acceso no autorizado: Clave incorrecta';
    END IF;

    EXECUTE format('DELETE FROM %I WHERE id = $1', target_table) USING record_id;
    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION exec_secure_upsert(
    target_table TEXT,
    payload JSONB,
    conflict_columns TEXT[],
    staff_passkey TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cols TEXT[];
    vals TEXT[];
    update_exprs TEXT[];
    query TEXT;
    col TEXT;
    result JSONB;
BEGIN
    IF staff_passkey != 'indautxu2026' THEN
        RAISE EXCEPTION 'Acceso no autorizado: Clave incorrecta';
    END IF;

    -- Extraer columnas y valores formateados de forma segura
    SELECT 
        array_agg(key),
        array_agg(format('%L', value))
    INTO cols, vals
    FROM jsonb_each_text(payload);

    IF cols IS NULL OR cardinality(cols) = 0 THEN
        RAISE EXCEPTION 'Payload vacío';
    END IF;

    IF conflict_columns IS NULL OR cardinality(conflict_columns) = 0 THEN
        -- INSERT simple
        query := format(
            'INSERT INTO %I AS t (%s) VALUES (%s) RETURNING to_jsonb(t)',
            target_table,
            array_to_string(cols, ', '),
            array_to_string(vals, ', ')
        );
    ELSE
        -- INSERT con ON CONFLICT UPDATE
        FOREACH col IN ARRAY cols
        LOOP
            IF NOT (col = ANY(conflict_columns)) THEN
                update_exprs := array_append(update_exprs, format('%I = EXCLUDED.%I', col, col));
            END IF;
        END LOOP;

        IF update_exprs IS NULL OR cardinality(update_exprs) = 0 THEN
            query := format(
                'INSERT INTO %I AS t (%s) VALUES (%s) ON CONFLICT (%s) DO NOTHING RETURNING to_jsonb(t)',
                target_table,
                array_to_string(cols, ', '),
                array_to_string(vals, ', '),
                array_to_string(conflict_columns, ', ')
            );
        ELSE
            query := format(
                'INSERT INTO %I AS t (%s) VALUES (%s) ON CONFLICT (%s) DO UPDATE SET %s RETURNING to_jsonb(t)',
                target_table,
                array_to_string(cols, ', '),
                array_to_string(vals, ', '),
                array_to_string(conflict_columns, ', '),
                array_to_string(update_exprs, ', ')
            );
        END IF;
    END IF;

    EXECUTE query INTO result;
    RETURN result;
END;
$$;

-- C) Guardar seguro en lote (Bulk INSERT/UPDATE)
CREATE OR REPLACE FUNCTION exec_secure_bulk_upsert(
    target_table TEXT,
    payloads JSONB, -- Debe ser un Array JSON
    conflict_columns TEXT[],
    staff_passkey TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    payload JSONB;
BEGIN
    IF staff_passkey != 'indautxu2026' THEN
        RAISE EXCEPTION 'Acceso no autorizado: Clave incorrecta';
    END IF;

    IF jsonb_typeof(payloads) != 'array' THEN
        RAISE EXCEPTION 'El payload debe ser un array JSON';
    END IF;

    FOR payload IN SELECT * FROM jsonb_array_elements(payloads)
    LOOP
        PERFORM exec_secure_upsert(target_table, payload, conflict_columns, staff_passkey);
    END LOOP;

    RETURN TRUE;
END;
$$;

-- D) Conceder permisos de ejecución para el rol público anon
GRANT EXECUTE ON FUNCTION exec_secure_delete TO anon;
GRANT EXECUTE ON FUNCTION exec_secure_upsert TO anon;
GRANT EXECUTE ON FUNCTION exec_secure_bulk_upsert TO anon;

-- E) Eliminar estadísticas de jugador por partido
CREATE OR REPLACE FUNCTION delete_match_player_stats_secure(
    target_match_id UUID,
    staff_passkey TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF staff_passkey != 'indautxu2026' THEN
        RAISE EXCEPTION 'Acceso no autorizado: Clave incorrecta';
    END IF;

    DELETE FROM match_player_stats WHERE match_id = target_match_id;
    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_match_player_stats_secure TO anon;

-- F) Eliminar registros por columna genérica
CREATE OR REPLACE FUNCTION exec_secure_delete_by_col(
    target_table TEXT,
    col_name TEXT,
    col_value UUID,
    staff_passkey TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF staff_passkey != 'indautxu2026' THEN
        RAISE EXCEPTION 'Acceso no autorizado: Clave incorrecta';
    END IF;

    EXECUTE format('DELETE FROM %I WHERE %I = $1', target_table, col_name) USING col_value;
    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION exec_secure_delete_by_col TO anon;
