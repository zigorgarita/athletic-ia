-- ============================================================================
-- PASO 2: VINCULACIÓN DE IDENTIDADES FEDERATIVAS RFEF - SD INDAUTXU (HARDENED)
-- ============================================================================
-- Procedimiento acordado:
-- 1. Este script NO se ejecuta automáticamente por la IA.
-- 2. Zigor lo revisa y lo ejecuta manualmente en el SQL Editor de Supabase.
-- 3. Posteriormente, la IA realiza la verificación READ-ONLY.
--
-- Mejoras de Seguridad e Idempotencia Real (Auditoría Crítica):
-- 1. PRECHECK ANTICOLISIÓN: Si un jugador ya tiene un rfef_player_id distinto
--    al esperado, el script ABORTA de inmediato con RAISE EXCEPTION.
-- 2. CONDICIÓN IS NULL OR = ID: Solo se permite si está NULL o si ya tiene el ID exacto.
-- 3. IDEMPOTENCIA REAL: El UPDATE utiliza 'IS DISTINCT FROM', evitando reescrituras
--    innecesarias de tuplas MVCC si ya está asignado.
-- 4. VALIDACIÓN DE IDENTIDADES EXACTAS: En lugar de depender de ROW_COUNT = 18,
--    se comprueba post-ejecución que los 18 UUIDs tienen EXACTAMENTE su ID esperado.
-- 5. ANÁLISIS PROPIO: NI TOCAR (100% aislado).
-- ============================================================================

DO $$
DECLARE
    v_total_players_pre INTEGER;
    v_precheck_uuids INTEGER;
    v_conflict_count INTEGER;
    v_updated_rows INTEGER;
    v_total_players_post INTEGER;
    v_informed_rfef INTEGER;
    v_distinct_rfef INTEGER;
    v_null_rfef INTEGER;
    v_matching_identities INTEGER;
    v_indautxu_club_players INTEGER;
    v_index_count INTEGER;
BEGIN
    RAISE NOTICE '=== INICIANDO PASO 2: VINCULACIÓN DE IDENTIDADES RFEF ===';

    -- ------------------------------------------------------------------------
    -- PRECHECK 1: Confirmar que public.players contiene exactamente 27 jugadores
    -- ------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_total_players_pre FROM public.players;
    IF v_total_players_pre != 27 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: public.players contiene % jugadores (se esperaban exactamente 27). Transacción abortada.', v_total_players_pre;
    END IF;
    RAISE NOTICE '-> Precheck 1 OK: Exactamente 27 jugadores propios en public.players.';

    -- ------------------------------------------------------------------------
    -- PRECHECK 2: Confirmar que los 18 UUIDs existen en la base de datos
    -- ------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_precheck_uuids
    FROM public.players
    WHERE id IN (
        'f4b19a54-2483-4469-a91d-e182353a4696'::uuid, -- Markel Arroyo
        'fce6e1eb-b43e-47f9-a169-f2e247602952'::uuid, -- Xabier Davalillo
        'f62b76fd-9935-4cfd-8844-3ab1c552f75b'::uuid, -- Marcos Cruz
        'ac998b90-c3db-4339-a72c-367625e4f744'::uuid, -- Juan Solaeta
        'e2085d0e-b789-450c-9f08-18a781007726'::uuid, -- Iker Eskubi
        'dc7bd009-b340-4fd6-abda-d8b1202c4bbc'::uuid, -- Xabier Puig
        '1ea2f019-f18c-415d-abb0-932063067b75'::uuid, -- Unax Gil
        'cf0a0604-5815-4b41-a1d0-dc661795bd59'::uuid, -- David Mosulen
        'd902c8c5-7eae-44c4-9806-e8cbbd63242a'::uuid, -- Jon Sánchez
        'ff305212-c3ac-45f0-8ced-f6ce38ee3a5a'::uuid, -- Aratz Dionisio
        'da6e3da0-0781-4370-8647-7de8200d65da'::uuid, -- Iker Anglada
        '3bf71d54-aab8-499e-8ca9-2a2d594f9a33'::uuid, -- Joel Chacón
        '6a9e2b4c-2de5-4b88-b72a-8e9e2e9bb0f6'::uuid, -- Aritz del Pico
        '90b997ed-c48a-4011-8d00-68970c702ee4'::uuid, -- Jon Bermejo
        '5b9934fc-4944-4ce1-8116-ba12da1361ae'::uuid, -- Danel López
        '4de61d70-ab18-4332-b484-f113e4cb4378'::uuid, -- Jean Carlo González
        'ffc0129c-b74f-4f31-a901-402591e88e22'::uuid, -- David Castaños
        'c7d74da3-f000-4303-98cb-d783c76a76ab'::uuid  -- Iván Herrero
    );

    IF v_precheck_uuids != 18 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Solo se encontraron % de los 18 UUIDs en public.players. Transacción abortada.', v_precheck_uuids;
    END IF;
    RAISE NOTICE '-> Precheck 2 OK: Los 18 UUIDs existen en la plantilla.';

    -- ------------------------------------------------------------------------
    -- PRECHECK 3: Comprobar colisiones previas (rfef_player_id conflictivo)
    -- Si alguno ya tiene un ID federativo diferente al esperado, abortar.
    -- ------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.players p
    JOIN (VALUES
        ('f4b19a54-2483-4469-a91d-e182353a4696'::uuid, 24521512),
        ('fce6e1eb-b43e-47f9-a169-f2e247602952'::uuid, 1541810),
        ('f62b76fd-9935-4cfd-8844-3ab1c552f75b'::uuid, 1486719),
        ('ac998b90-c3db-4339-a72c-367625e4f744'::uuid, 23352157),
        ('e2085d0e-b789-450c-9f08-18a781007726'::uuid, 1502313),
        ('dc7bd009-b340-4fd6-abda-d8b1202c4bbc'::uuid, 23290732),
        ('1ea2f019-f18c-415d-abb0-932063067b75'::uuid, 1542360),
        ('cf0a0604-5815-4b41-a1d0-dc661795bd59'::uuid, 1301108),
        ('d902c8c5-7eae-44c4-9806-e8cbbd63242a'::uuid, 1517993),
        ('ff305212-c3ac-45f0-8ced-f6ce38ee3a5a'::uuid, 1529187),
        ('da6e3da0-0781-4370-8647-7de8200d65da'::uuid, 770194),
        ('3bf71d54-aab8-499e-8ca9-2a2d594f9a33'::uuid, 1542256),
        ('6a9e2b4c-2de5-4b88-b72a-8e9e2e9bb0f6'::uuid, 1488838),
        ('90b997ed-c48a-4011-8d00-68970c702ee4'::uuid, 24584490),
        ('5b9934fc-4944-4ce1-8116-ba12da1361ae'::uuid, 25742086),
        ('4de61d70-ab18-4332-b484-f113e4cb4378'::uuid, 1538372),
        ('ffc0129c-b74f-4f31-a901-402591e88e22'::uuid, 24144753),
        ('c7d74da3-f000-4303-98cb-d783c76a76ab'::uuid, 1364945)
    ) AS v(id, rfef_id) ON p.id = v.id
    WHERE p.rfef_player_id IS NOT NULL AND p.rfef_player_id != v.rfef_id;

    IF v_conflict_count > 0 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Existen % futbolistas con un rfef_player_id previo contradictorio. Transacción abortada para evitar sobreescritura accidental.', v_conflict_count;
    END IF;
    RAISE NOTICE '-> Precheck 3 OK: Cero conflictos de identidad (los campos están en NULL o ya tienen el ID esperado).';

    -- ------------------------------------------------------------------------
    -- PRECHECK 4: Confirmar que el índice único parcial existe
    -- ------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'players' 
      AND indexname = 'idx_players_rfef_player_id';

    IF v_index_count = 0 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: El índice idx_players_rfef_player_id no existe en public.players. Ejecutar Paso 1 primero.';
    END IF;
    RAISE NOTICE '-> Precheck 4 OK: Índice único parcial idx_players_rfef_player_id verificado en pg_indexes.';

    -- ------------------------------------------------------------------------
    -- EJECUCIÓN: UPDATE idempotente 1 a 1 de rfef_player_id por UUID
    -- Solo actualiza si hay cambio efectivo (IS DISTINCT FROM)
    -- ------------------------------------------------------------------------
    UPDATE public.players AS p
    SET rfef_player_id = v.rfef_id
    FROM (VALUES
        ('f4b19a54-2483-4469-a91d-e182353a4696'::uuid, 24521512), -- Markel Arroyo
        ('fce6e1eb-b43e-47f9-a169-f2e247602952'::uuid, 1541810),  -- Xabier Davalillo
        ('f62b76fd-9935-4cfd-8844-3ab1c552f75b'::uuid, 1486719),  -- Marcos Cruz
        ('ac998b90-c3db-4339-a72c-367625e4f744'::uuid, 23352157), -- Juan Solaeta
        ('e2085d0e-b789-450c-9f08-18a781007726'::uuid, 1502313),  -- Iker Eskubi
        ('dc7bd009-b340-4fd6-abda-d8b1202c4bbc'::uuid, 23290732), -- Xabier Puig
        ('1ea2f019-f18c-415d-abb0-932063067b75'::uuid, 1542360),  -- Unax Gil
        ('cf0a0604-5815-4b41-a1d0-dc661795bd59'::uuid, 1301108),  -- David Mosulen
        ('d902c8c5-7eae-44c4-9806-e8cbbd63242a'::uuid, 1517993),  -- Jon Sánchez
        ('ff305212-c3ac-45f0-8ced-f6ce38ee3a5a'::uuid, 1529187),  -- Aratz Dionisio
        ('da6e3da0-0781-4370-8647-7de8200d65da'::uuid, 770194),   -- Iker Anglada
        ('3bf71d54-aab8-499e-8ca9-2a2d594f9a33'::uuid, 1542256),  -- Joel Chacón
        ('6a9e2b4c-2de5-4b88-b72a-8e9e2e9bb0f6'::uuid, 1488838),  -- Aritz del Pico
        ('90b997ed-c48a-4011-8d00-68970c702ee4'::uuid, 24584490), -- Jon Bermejo
        ('5b9934fc-4944-4ce1-8116-ba12da1361ae'::uuid, 25742086), -- Danel López
        ('4de61d70-ab18-4332-b484-f113e4cb4378'::uuid, 1538372),  -- Jean Carlo González
        ('ffc0129c-b74f-4f31-a901-402591e88e22'::uuid, 24144753), -- David Castaños
        ('c7d74da3-f000-4303-98cb-d783c76a76ab'::uuid, 1364945)   -- Iván Herrero
    ) AS v(id, rfef_id)
    WHERE p.id = v.id
      AND p.rfef_player_id IS DISTINCT FROM v.rfef_id;

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    RAISE NOTICE '-> Filas modificadas en esta ejecución: % (de 18 evaluadas).', v_updated_rows;

    -- ------------------------------------------------------------------------
    -- POSTCHECK 1: El total de jugadores en public.players sigue siendo 27
    -- ------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_total_players_post FROM public.players;
    IF v_total_players_post != 27 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: El total de jugadores cambió a % (debe ser 27). Transacción abortada.', v_total_players_post;
    END IF;
    RAISE NOTICE '-> Postcheck 1 OK: Total de jugadores inalterado (27).';

    -- ------------------------------------------------------------------------
    -- POSTCHECK 2: Exactamente los 18 UUIDs tienen EXACTAMENTE su ID RFEF asignado
    -- ------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_matching_identities
    FROM public.players p
    JOIN (VALUES
        ('f4b19a54-2483-4469-a91d-e182353a4696'::uuid, 24521512),
        ('fce6e1eb-b43e-47f9-a169-f2e247602952'::uuid, 1541810),
        ('f62b76fd-9935-4cfd-8844-3ab1c552f75b'::uuid, 1486719),
        ('ac998b90-c3db-4339-a72c-367625e4f744'::uuid, 23352157),
        ('e2085d0e-b789-450c-9f08-18a781007726'::uuid, 1502313),
        ('dc7bd009-b340-4fd6-abda-d8b1202c4bbc'::uuid, 23290732),
        ('1ea2f019-f18c-415d-abb0-932063067b75'::uuid, 1542360),
        ('cf0a0604-5815-4b41-a1d0-dc661795bd59'::uuid, 1301108),
        ('d902c8c5-7eae-44c4-9806-e8cbbd63242a'::uuid, 1517993),
        ('ff305212-c3ac-45f0-8ced-f6ce38ee3a5a'::uuid, 1529187),
        ('da6e3da0-0781-4370-8647-7de8200d65da'::uuid, 770194),
        ('3bf71d54-aab8-499e-8ca9-2a2d594f9a33'::uuid, 1542256),
        ('6a9e2b4c-2de5-4b88-b72a-8e9e2e9bb0f6'::uuid, 1488838),
        ('90b997ed-c48a-4011-8d00-68970c702ee4'::uuid, 24584490),
        ('5b9934fc-4944-4ce1-8116-ba12da1361ae'::uuid, 25742086),
        ('4de61d70-ab18-4332-b484-f113e4cb4378'::uuid, 1538372),
        ('ffc0129c-b74f-4f31-a901-402591e88e22'::uuid, 24144753),
        ('c7d74da3-f000-4303-98cb-d783c76a76ab'::uuid, 1364945)
    ) AS v(id, rfef_id) ON p.id = v.id
    WHERE p.rfef_player_id = v.rfef_id;

    IF v_matching_identities != 18 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Solo % de los 18 futbolistas tienen su ID RFEF exacto esperado. Transacción abortada.', v_matching_identities;
    END IF;
    RAISE NOTICE '-> Postcheck 2 OK: Las 18 identidades coinciden al 100%% con lo esperado.';

    -- ------------------------------------------------------------------------
    -- POSTCHECK 3: Exactamente 18 jugadores tienen rfef_player_id informado
    -- ------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_informed_rfef FROM public.players WHERE rfef_player_id IS NOT NULL;
    IF v_informed_rfef != 18 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Se encontraron % jugadores con RFEF ID informado (deben ser exactamente 18). Transacción abortada.', v_informed_rfef;
    END IF;
    RAISE NOTICE '-> Postcheck 3 OK: Exactamente 18 jugadores con rfef_player_id no nulo.';

    -- ------------------------------------------------------------------------
    -- POSTCHECK 4: Los 18 RFEF IDs son completamente distintos (cero colisiones)
    -- ------------------------------------------------------------------------
    SELECT COUNT(DISTINCT rfef_player_id) INTO v_distinct_rfef FROM public.players WHERE rfef_player_id IS NOT NULL;
    IF v_distinct_rfef != 18 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Se encontraron duplicados en los RFEF IDs asignados (% distintos de 18). Transacción abortada.', v_distinct_rfef;
    END IF;
    RAISE NOTICE '-> Postcheck 4 OK: Exactamente 18 RFEF IDs distintos (unicidad estricta).';

    -- ------------------------------------------------------------------------
    -- POSTCHECK 5: Exactamente 9 jugadores permanecen con rfef_player_id = NULL
    -- ------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_null_rfef FROM public.players WHERE rfef_player_id IS NULL;
    IF v_null_rfef != 9 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Se encontraron % jugadores con RFEF ID en NULL (deben ser exactamente 9). Transacción abortada.', v_null_rfef;
    END IF;
    RAISE NOTICE '-> Postcheck 5 OK: Exactamente 9 jugadores permanecen con rfef_player_id = NULL.';

    -- ------------------------------------------------------------------------
    -- POSTCHECK 6: SD Indautxu sigue teniendo exactamente 0 jugadores en club_players
    -- ------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_indautxu_club_players
    FROM public.club_players cp
    JOIN public.club_seasons cs ON cs.id = cp.club_season_id
    WHERE cs.club_id = '13f4a8d6-a39c-4b39-a8dd-ca9c63c0c1ee'::uuid;

    IF v_indautxu_club_players != 0 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: SD Indautxu tiene % jugadores en club_players (debe ser estrictamente 0). Transacción abortada.', v_indautxu_club_players;
    END IF;
    RAISE NOTICE '-> Postcheck 6 OK: Cero duplicados en club_players (estricto cumplimiento arquitectónico).';

    RAISE NOTICE '=== PASO 2 COMPLETADO CON ÉXITO: 18 IDENTIDADES RFEF VINCULADAS SIN ERRORES ===';
END $$;
