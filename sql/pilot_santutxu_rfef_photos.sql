-- ============================================================================
-- PILOTO CONTROLADO · FOTOS RFEF · SANTUTXU FC (16 JUGADORES)
-- Fecha: 2026-09-08
-- Procedimiento acordado:
-- 1. Anty prepara el script (este archivo).
-- 2. Zigor lo revisa y lo ejecuta manualmente en el SQL Editor de Supabase.
-- 3. Anty realiza la verificación estricta READ-ONLY posterior.
--
-- BLINDAJES CRIPTOGRÁFICOS TRANSACCIONALES:
-- 1. INDAUTXU (public.players): Cero sentencias que modifiquen la tabla.
--    Precheck y Postcheck calculan el checksum MD5 de id:foto_url de las 27 filas.
--    Cualquier cambio de un solo carácter en cualquier foto_url aborta y revierte la transacción.
-- 2. ATHLETIC CLUB: Checksum MD5 de id:foto_url de los 18 futbolistas con foto CDN oficial.
--    Cualquier modificación aborta y revierte la transacción.
-- 3. ALCANCE ULTRA-ESTRICTO: El UPDATE utiliza club_season_id específico de Santutxu FC
--    ('eea969ce-45de-43ba-b013-c5bf379be93d') y únicamente los 16 UUIDs con foto_url IS NULL.
-- 4. SILUETAS RFEF: Los 2 jugadores con silueta federativa (#23 Asumu y #27 Rodríguez)
--    permanecen estrictamente con foto_url IS NULL.
-- ============================================================================

DO $$
DECLARE
    v_indautxu_count_pre INTEGER;
    v_indautxu_with_photo_pre INTEGER;
    v_indautxu_hash_pre TEXT;
    v_athletic_with_photo_pre INTEGER;
    v_athletic_hash_pre TEXT;
    v_santutxu_count_pre INTEGER;
    v_santutxu_null_pre INTEGER;
    v_updated_rows INTEGER;
    v_indautxu_count_post INTEGER;
    v_indautxu_with_photo_post INTEGER;
    v_indautxu_hash_post TEXT;
    v_athletic_with_photo_post INTEGER;
    v_athletic_hash_post TEXT;
    v_santutxu_with_photo_post INTEGER;
    v_santutxu_null_post INTEGER;
    v_siluetas_check INTEGER;
    v_other_clubs_photo_count INTEGER;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE '   INICIANDO PILOTO CONTROLADO: FOTOS RFEF · SANTUTXU FC   ';
    RAISE NOTICE '============================================================';

    -- ------------------------------------------------------------------------
    -- 1. PRECHECKS OBLIGATORIOS (READ-ONLY)
    -- ------------------------------------------------------------------------

    -- A. Blindaje Indautxu: 27 filas, 27 fotos y cálculo de Checksum MD5
    SELECT COUNT(*), COUNT(foto_url), md5(string_agg(id::text || ':' || coalesce(foto_url, ''), '|' ORDER BY id))
    INTO v_indautxu_count_pre, v_indautxu_with_photo_pre, v_indautxu_hash_pre
    FROM public.players;

    IF v_indautxu_count_pre != 27 OR v_indautxu_with_photo_pre != 27 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: public.players tiene % filas y % fotos (se esperaban 27/27). Transacción abortada.',
            v_indautxu_count_pre, v_indautxu_with_photo_pre;
    END IF;
    RAISE NOTICE '-> Precheck 1 OK: Indautxu blindado (27/27 fotos, Checksum MD5: %)', v_indautxu_hash_pre;

    -- B. Blindaje Athletic Club: 18 fotos y cálculo de Checksum MD5
    SELECT COUNT(cp.foto_url), md5(string_agg(cp.id::text || ':' || coalesce(cp.foto_url, ''), '|' ORDER BY cp.id))
    INTO v_athletic_with_photo_pre, v_athletic_hash_pre
    FROM public.club_players cp
    JOIN public.club_seasons cs ON cp.club_season_id = cs.id
    JOIN public.clubs c ON cs.club_id = c.id
    WHERE c.rfef_club_id = 205514 AND cs.temporada = '2026-27';

    IF v_athletic_with_photo_pre != 18 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Athletic Club tiene % fotos (se esperaban exactamente 18). Transacción abortada.',
            v_athletic_with_photo_pre;
    END IF;
    RAISE NOTICE '-> Precheck 2 OK: Athletic Club blindado (18 fotos CDN, Checksum MD5: %)', v_athletic_hash_pre;

    -- C. Estado inicial Santutxu FC: 18 jugadores, exactamente 18 con foto_url IS NULL
    SELECT COUNT(*), COUNT(*) FILTER (WHERE foto_url IS NULL)
    INTO v_santutxu_count_pre, v_santutxu_null_pre
    FROM public.club_players
    WHERE club_season_id = 'eea969ce-45de-43ba-b013-c5bf379be93d'::uuid;

    IF v_santutxu_count_pre != 18 OR v_santutxu_null_pre != 18 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Santutxu tiene % jugadores y % con foto_url NULL (se esperaban 18/18). Transacción abortada.',
            v_santutxu_count_pre, v_santutxu_null_pre;
    END IF;
    RAISE NOTICE '-> Precheck 3 OK: Santutxu FC preparado (18 jugadores, 18 con foto NULL).';

    -- ------------------------------------------------------------------------
    -- 2. EJECUCIÓN CONTROLADA DEL UPDATE (EXCLUSIVAMENTE SANTUTXU FC)
    -- ------------------------------------------------------------------------
    WITH pilot_updates(p_id, p_rfef_id, p_url) AS (
        VALUES
            ('9a98b248-8df9-4464-9ca5-2eef3fc16415'::uuid, 1363968, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1363968.jpg'),
            ('0daad4a6-c84c-4f02-8c80-f5c55391fce9'::uuid, 1500345, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1500345.jpg'),
            ('60ff9a72-873d-4509-ab96-2cbe02cf0b4e'::uuid, 1508938, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1508938.jpg'),
            ('5e058fa7-f596-4397-9c37-971119d2c781'::uuid, 1515738, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1515738.jpg'),
            ('44ef8238-c5d6-4389-8fd5-3553534237c4'::uuid, 1500350, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1500350.jpg'),
            ('9d6b9c70-fa93-481c-8317-17e644921a91'::uuid, 33855037, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_33855037.png'),
            ('4fc4360c-f398-468d-94c4-16ea0799bdb8'::uuid, 1535788, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1535788.jpg'),
            ('8ebb7daa-42df-4a67-a54f-037c2abb6f6d'::uuid, 1535457, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1535457.jpg'),
            ('f814816c-4d9c-4c4d-9224-ef78af8d3b59'::uuid, 1504995, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1504995.jpg'),
            ('fcde9b29-4838-4a37-87b7-e643bedd42e2'::uuid, 1510843, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1510843.jpg'),
            ('5c51a900-b512-479b-a50e-e6d85cea30aa'::uuid, 1539838, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1539838.jpg'),
            ('cf1f1e33-4c23-4bf3-b08a-447da369a8c0'::uuid, 473033, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_473033.jpg'),
            ('0d785be1-70bd-46f1-84c9-d20791e68110'::uuid, 1478889, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1478889.jpg'),
            ('bd9a1cd4-b2d8-4372-adba-df1e8ab9e59c'::uuid, 1534746, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1534746.jpg'),
            ('3df34a3b-32d2-47ee-b4a9-411815043b94'::uuid, 1535380, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1535380.jpg'),
            ('e39e02f3-0bbe-47b4-ab29-08f04641f234'::uuid, 1543001, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1543001.jpg')
    )
    UPDATE public.club_players cp
    SET foto_url = pu.p_url
    FROM pilot_updates pu
    WHERE cp.id = pu.p_id
      AND cp.rfef_player_id = pu.p_rfef_id
      AND cp.club_season_id = 'eea969ce-45de-43ba-b013-c5bf379be93d'::uuid
      AND cp.foto_url IS NULL;

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    IF v_updated_rows != 16 THEN
        RAISE EXCEPTION 'TRANSACCIÓN ABORTADA: Se actualizaron % filas (se esperaban exactamente 16).', v_updated_rows;
    END IF;
    RAISE NOTICE '-> Update ejecutado con éxito: Exactamente % filas actualizadas en Santutxu FC.', v_updated_rows;

    -- ------------------------------------------------------------------------
    -- 3. POSTCHECKS OBLIGATORIOS (GARANTÍA Y BLINDAJE CRIPTOGRÁFICO)
    -- ------------------------------------------------------------------------

    -- A. Verificar Indautxu: Cantidad y Checksum MD5 exacto
    SELECT COUNT(*), COUNT(foto_url), md5(string_agg(id::text || ':' || coalesce(foto_url, ''), '|' ORDER BY id))
    INTO v_indautxu_count_post, v_indautxu_with_photo_post, v_indautxu_hash_post
    FROM public.players;

    IF v_indautxu_count_post != 27 OR v_indautxu_with_photo_post != 27 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Alteración en conteo de public.players. Transacción revertida.';
    END IF;

    IF v_indautxu_hash_pre != v_indautxu_hash_post THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: ¡Checksum MD5 de public.players alterado! Transacción revertida.';
    END IF;
    RAISE NOTICE '-> Postcheck 1 OK: Indautxu 100%% intacto (Checksum MD5 verificado byte a byte: %)', v_indautxu_hash_post;

    -- B. Verificar Athletic Club: Cantidad y Checksum MD5 exacto
    SELECT COUNT(cp.foto_url), md5(string_agg(cp.id::text || ':' || coalesce(cp.foto_url, ''), '|' ORDER BY cp.id))
    INTO v_athletic_with_photo_post, v_athletic_hash_post
    FROM public.club_players cp
    JOIN public.club_seasons cs ON cp.club_season_id = cs.id
    JOIN public.clubs c ON cs.club_id = c.id
    WHERE c.rfef_club_id = 205514 AND cs.temporada = '2026-27';

    IF v_athletic_with_photo_post != 18 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Alteración en conteo de fotos de Athletic Club. Transacción revertida.';
    END IF;

    IF v_athletic_hash_pre != v_athletic_hash_post THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: ¡Checksum MD5 de Athletic Club alterado! Transacción revertida.';
    END IF;
    RAISE NOTICE '-> Postcheck 2 OK: Athletic Club 100%% intacto (Checksum MD5 verificado byte a byte: %)', v_athletic_hash_post;

    -- C. Verificar estado final de Santutxu: exactamente 16 con foto y 2 con NULL
    SELECT COUNT(*) FILTER (WHERE foto_url IS NOT NULL), COUNT(*) FILTER (WHERE foto_url IS NULL)
    INTO v_santutxu_with_photo_post, v_santutxu_null_post
    FROM public.club_players
    WHERE club_season_id = 'eea969ce-45de-43ba-b013-c5bf379be93d'::uuid;

    IF v_santutxu_with_photo_post != 16 OR v_santutxu_null_post != 2 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Santutxu tiene % con foto y % con NULL (se esperaban 16 y 2). Transacción revertida.',
            v_santutxu_with_photo_post, v_santutxu_null_post;
    END IF;
    RAISE NOTICE '-> Postcheck 3 OK: Santutxu FC tiene exactamente 16 con foto y 2 con NULL.';

    -- D. Verificar expresamente que los 2 jugadores de silueta permanecen en NULL
    SELECT COUNT(*)
    INTO v_siluetas_check
    FROM public.club_players
    WHERE club_season_id = 'eea969ce-45de-43ba-b013-c5bf379be93d'::uuid
      AND rfef_player_id IN (1484582, 1480857)
      AND foto_url IS NOT NULL;

    IF v_siluetas_check != 0 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Los jugadores con silueta (#23 Asumu o #27 Rodríguez) recibieron foto indebidamente. Transacción revertida.';
    END IF;
    RAISE NOTICE '-> Postcheck 4 OK: Jugadores de silueta (#23 Asumu y #27 Rodríguez) permanecen en NULL con fallback de iniciales.';

    -- E. Verificar que ningún otro club rival ha adquirido fotos (sigue en 0 salvo Athletic que tiene 18)
    SELECT COUNT(cp.foto_url)
    INTO v_other_clubs_photo_count
    FROM public.club_players cp
    JOIN public.club_seasons cs ON cp.club_season_id = cs.id
    JOIN public.clubs c ON cs.club_id = c.id
    WHERE cs.temporada = '2026-27'
      AND c.rfef_club_id NOT IN (205514, 205567);

    IF v_other_clubs_photo_count != 0 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Se detectaron fotos en otros rivales no autorizados (% fotos). Transacción revertida.',
            v_other_clubs_photo_count;
    END IF;
    RAISE NOTICE '-> Postcheck 5 OK: Los otros 13 rivales permanecen con 0 fotos.';

    RAISE NOTICE '============================================================';
    RAISE NOTICE '   PILOTO SANTUTXU FC COMPLETADO Y VALIDADO CON ÉXITO      ';
    RAISE NOTICE '============================================================';
END $$;
