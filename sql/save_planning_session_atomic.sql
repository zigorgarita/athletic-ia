-- =============================================================================
-- FUNCION RPC: save_planning_session_atomic
-- Guardado Atómico y Transaccional de Sesiones de Planificación
-- Indautxu 26/27 - S3.2.6-P2
-- =============================================================================

CREATE OR REPLACE FUNCTION public.save_planning_session_atomic(
    p_session JSONB,
    p_tasks JSONB DEFAULT '[]'::jsonb,
    p_players JSONB DEFAULT '[]'::jsonb,
    p_concepts JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session_id UUID;
    v_session_is_new BOOLEAN := false;
    v_task_elem JSONB;
    v_task_id UUID;
    v_kept_task_ids UUID[] := ARRAY[]::UUID[];
    v_player_elem JSONB;
    v_concept_elem JSONB;
    v_concept_categoria TEXT;
    v_concept_concepto TEXT;
    v_concepts_count INT := 0;
    v_tasks_count INT := 0;
    v_players_count INT := 0;
    v_raw_id TEXT;
BEGIN
    -- 1. Validar y resolver ID de la sesión
    v_raw_id := p_session->>'id';
    IF v_raw_id IS NOT NULL AND v_raw_id !~* '^temp-' AND length(v_raw_id) > 0 THEN
        v_session_id := v_raw_id::UUID;
        v_session_is_new := false;
    ELSE
        v_session_id := gen_random_uuid();
        v_session_is_new := true;
    END IF;

    -- 2. Upsert atómico en planning_sessions
    INSERT INTO public.planning_sessions (
        id,
        fecha,
        hora_inicio,
        hora_fin,
        duracion_total,
        campo_instalacion,
        tipo_sesion,
        objetivo_principal,
        carga,
        num_jugadores_previstos,
        num_porteros_previstos,
        jornada_id,
        objetivo_semanal,
        estado,
        evaluacion_completada,
        evaluacion_duracion_real,
        evaluacion_observaciones,
        categoria_filtro,
        hora_convocatoria,
        observaciones_convocatoria,
        checklist_material,
        valoracion_entrenador,
        rival
    ) VALUES (
        v_session_id,
        (p_session->>'fecha')::DATE,
        p_session->>'hora_inicio',
        p_session->>'hora_fin',
        COALESCE((p_session->>'duracion_total')::INTEGER, 0),
        p_session->>'campo_instalacion',
        COALESCE(p_session->>'tipo_sesion', 'Entrenamiento'),
        p_session->>'objetivo_principal',
        COALESCE(p_session->>'carga', 'Media'),
        COALESCE((p_session->>'num_jugadores_previstos')::INTEGER, 18),
        COALESCE((p_session->>'num_porteros_previstos')::INTEGER, 2),
        CASE WHEN p_session->>'jornada_id' IS NOT NULL AND p_session->>'jornada_id' != '' THEN (p_session->>'jornada_id')::UUID ELSE NULL END,
        p_session->>'objetivo_semanal',
        COALESCE(p_session->>'estado', 'Planificada'),
        COALESCE((p_session->>'evaluacion_completada')::BOOLEAN, false),
        (p_session->>'evaluacion_duracion_real')::INTEGER,
        p_session->>'evaluacion_observaciones',
        COALESCE(p_session->>'categoria_filtro', 'Liga'),
        p_session->>'hora_convocatoria',
        p_session->>'observaciones_convocatoria',
        COALESCE(p_session->'checklist_material', '{}'::jsonb),
        (p_session->>'valoracion_entrenador')::NUMERIC,
        p_session->>'rival'
    )
    ON CONFLICT (id) DO UPDATE SET
        fecha = EXCLUDED.fecha,
        hora_inicio = EXCLUDED.hora_inicio,
        hora_fin = EXCLUDED.hora_fin,
        duracion_total = EXCLUDED.duracion_total,
        campo_instalacion = EXCLUDED.campo_instalacion,
        tipo_sesion = EXCLUDED.tipo_sesion,
        objetivo_principal = EXCLUDED.objetivo_principal,
        carga = EXCLUDED.carga,
        estado = EXCLUDED.estado,
        evaluacion_completada = EXCLUDED.evaluacion_completada,
        evaluacion_duracion_real = EXCLUDED.evaluacion_duracion_real,
        evaluacion_observaciones = EXCLUDED.evaluacion_observaciones,
        hora_convocatoria = EXCLUDED.hora_convocatoria,
        observaciones_convocatoria = EXCLUDED.observaciones_convocatoria,
        checklist_material = EXCLUDED.checklist_material,
        valoracion_entrenador = EXCLUDED.valoracion_entrenador,
        rival = EXCLUDED.rival;

    -- 3. Gestión quirúrgica de Tareas (planning_tasks)
    IF jsonb_array_length(p_tasks) > 0 THEN
        FOR v_task_elem IN SELECT * FROM jsonb_array_elements(p_tasks) LOOP
            v_raw_id := v_task_elem->>'id';
            IF v_raw_id IS NOT NULL AND v_raw_id !~* '^temp-' AND length(v_raw_id) = 36 THEN
                v_task_id := v_raw_id::UUID;
                -- Validación de seguridad: no permitir modificar tareas pertenecientes a otra sesión
                IF EXISTS (SELECT 1 FROM public.planning_tasks WHERE id = v_task_id AND planning_session_id != v_session_id) THEN
                    RAISE EXCEPTION 'Violación de seguridad: La tarea % no pertenece a la sesión %', v_task_id, v_session_id;
                END IF;
                v_kept_task_ids := array_append(v_kept_task_ids, v_task_id);
            ELSE
                v_task_id := gen_random_uuid();
            END IF;

            INSERT INTO public.planning_tasks (
                id,
                planning_session_id,
                nombre_tarea,
                tipo_tarea,
                minutos,
                jugadores,
                espacio,
                objetivo,
                descripcion,
                observaciones,
                orden,
                responsable_staff,
                responsable_staff_otro
            ) VALUES (
                v_task_id,
                v_session_id,
                COALESCE(v_task_elem->>'nombre_tarea', 'Tarea sin nombre'),
                COALESCE(v_task_elem->>'tipo_tarea', 'Concepto Táctico'),
                COALESCE((v_task_elem->>'minutos')::INTEGER, 15),
                (v_task_elem->>'jugadores')::INTEGER,
                v_task_elem->>'espacio',
                v_task_elem->>'objetivo',
                v_task_elem->>'descripcion',
                v_task_elem->>'observaciones',
                COALESCE((v_task_elem->>'orden')::INTEGER, v_tasks_count),
                COALESCE(v_task_elem->>'responsable_staff', 'Primer Entrenador'),
                v_task_elem->>'responsable_staff_otro'
            )
            ON CONFLICT (id) DO UPDATE SET
                nombre_tarea = EXCLUDED.nombre_tarea,
                tipo_tarea = EXCLUDED.tipo_tarea,
                minutos = EXCLUDED.minutos,
                jugadores = EXCLUDED.jugadores,
                espacio = EXCLUDED.espacio,
                objetivo = EXCLUDED.objetivo,
                descripcion = EXCLUDED.descripcion,
                observaciones = EXCLUDED.observaciones,
                orden = EXCLUDED.orden,
                responsable_staff = EXCLUDED.responsable_staff,
                responsable_staff_otro = EXCLUDED.responsable_staff_otro;

            v_tasks_count := v_tasks_count + 1;
        END LOOP;

        -- Eliminar ÚNICAMENTE las tareas preexistentes de esta sesión que NO están en v_kept_task_ids
        IF NOT v_session_is_new THEN
            DELETE FROM public.planning_tasks
            WHERE planning_session_id = v_session_id
              AND (cardinality(v_kept_task_ids) = 0 OR id != ALL(v_kept_task_ids));
        END IF;
    ELSE
        -- Si la lista enviada está vacía explícitamente y no es sesión nueva, se limpian las tareas de ESTA sesión
        IF NOT v_session_is_new THEN
            DELETE FROM public.planning_tasks WHERE planning_session_id = v_session_id;
        END IF;
    END IF;

    -- 4. Guardado de convocados (planning_session_players)
    IF jsonb_array_length(p_players) > 0 THEN
        FOR v_player_elem IN SELECT * FROM jsonb_array_elements(p_players) LOOP
            INSERT INTO public.planning_session_players (
                session_id,
                player_id,
                convocado,
                estado_sesion
            ) VALUES (
                v_session_id,
                (v_player_elem->>'player_id')::UUID,
                COALESCE((v_player_elem->>'convocado')::BOOLEAN, false),
                COALESCE(v_player_elem->>'estado_sesion', 'Disponible')
            )
            ON CONFLICT (session_id, player_id) DO UPDATE SET
                convocado = EXCLUDED.convocado,
                estado_sesion = EXCLUDED.estado_sesion;

            v_players_count := v_players_count + 1;
        END LOOP;
    END IF;

    -- 5. Gestión de Conceptos (planning_concepts)
    -- Limpiar conceptos previos de esta sesión que ya no vengan seleccionados
    IF NOT v_session_is_new THEN
        DELETE FROM public.planning_concepts
        WHERE session_id = v_session_id;
    END IF;

    IF jsonb_array_length(p_concepts) > 0 THEN
        FOR v_concept_elem IN SELECT * FROM jsonb_array_elements(p_concepts) LOOP
            v_concept_categoria := v_concept_elem->>'categoria';
            v_concept_concepto := v_concept_elem->>'concepto';

            IF v_concept_categoria IS NOT NULL AND v_concept_concepto IS NOT NULL THEN
                INSERT INTO public.planning_concepts (
                    session_id,
                    categoria,
                    concepto
                ) VALUES (
                    v_session_id,
                    v_concept_categoria,
                    v_concept_concepto
                )
                ON CONFLICT (session_id, categoria, concepto) DO NOTHING;

                v_concepts_count := v_concepts_count + 1;
            END IF;
        END LOOP;
    END IF;

    -- 6. Retorno de diagnóstico estructurado
    RETURN jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'is_new', v_session_is_new,
        'tasks_saved', v_tasks_count,
        'players_saved', v_players_count,
        'concepts_saved', v_concepts_count
    );
END;
$$;

-- Seguridad estricta: Revocar ejecución pública; solo service_role y postgres
REVOKE ALL ON FUNCTION public.save_planning_session_atomic(JSONB, JSONB, JSONB, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_planning_session_atomic(JSONB, JSONB, JSONB, JSONB) TO service_role, postgres;
