-- =============================================================================
-- FUNCIONES RPC: Autorización Centralizada y Borrado Atómico de Jugadas ABP
-- Athletic IA / Indautxu 26/27
-- =============================================================================

-- 1. Función de Seguridad Interna (Principio de Mínimo Privilegio: Sin acceso directo público)
CREATE OR REPLACE FUNCTION verify_staff_passkey(staff_passkey TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF staff_passkey IS NULL OR staff_passkey != 'indautxu2026' THEN
        RAISE EXCEPTION 'Acceso no autorizado: Clave incorrecta';
    END IF;
END;
$$;

-- Revocación estricta de ejecución pública:
-- No accesible directamente por anon/authenticated desde la API web;
-- solo invocable internamente por procedimientos SECURITY DEFINER o service_role.
REVOKE ALL ON FUNCTION verify_staff_passkey(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_staff_passkey(TEXT) TO postgres, service_role;

-- 2. RPC Atómico y Transaccional para Eliminar una Jugada ABP y sus Dependencias
CREATE OR REPLACE FUNCTION delete_abp_play_atomic(
    p_play_id UUID,
    staff_passkey TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_play_exists BOOLEAN;
    v_assignments_deleted INTEGER := 0;
    v_plans_deleted INTEGER := 0;
    v_roles_deleted INTEGER := 0;
BEGIN
    -- 1. Autorización centralizada interna
    PERFORM verify_staff_passkey(staff_passkey);

    -- 2. Validar que la jugada existe antes de proceder
    SELECT EXISTS(SELECT 1 FROM public.abp_plays WHERE id = p_play_id) INTO v_play_exists;
    IF NOT v_play_exists THEN
        RAISE EXCEPTION 'La jugada ABP con ID % no existe.', p_play_id;
    END IF;

    -- 3. Eliminar asignaciones de jugadores de los planes que pertenecen a esta jugada
    WITH deleted_assignments AS (
        DELETE FROM public.match_abp_player_assignments
        WHERE match_abp_plan_id IN (
            SELECT id FROM public.match_abp_plans WHERE abp_play_id = p_play_id
        )
        RETURNING id
    )
    SELECT count(*) INTO v_assignments_deleted FROM deleted_assignments;

    -- 4. Eliminar planes de partido vinculados exclusivamente a esta jugada
    WITH deleted_plans AS (
        DELETE FROM public.match_abp_plans
        WHERE abp_play_id = p_play_id
        RETURNING id
    )
    SELECT count(*) INTO v_plans_deleted FROM deleted_plans;

    -- 5. Eliminar roles y posiciones de la pizarra táctica de esta jugada
    WITH deleted_roles AS (
        DELETE FROM public.abp_player_roles
        WHERE abp_play_id = p_play_id
        RETURNING id
    )
    SELECT count(*) INTO v_roles_deleted FROM deleted_roles;

    -- 6. Eliminar la jugada base de abp_plays
    DELETE FROM public.abp_plays
    WHERE id = p_play_id;

    -- 7. Retorno estructurado de los conteos eliminados
    RETURN jsonb_build_object(
        'success', true,
        'play_id', p_play_id,
        'assignments_deleted', v_assignments_deleted,
        'plans_deleted', v_plans_deleted,
        'roles_deleted', v_roles_deleted,
        'play_deleted', 1
    );
END;
$$;

REVOKE ALL ON FUNCTION delete_abp_play_atomic(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_abp_play_atomic(UUID, TEXT) TO anon, authenticated, service_role;
