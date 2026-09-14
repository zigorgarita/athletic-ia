-- ============================================================================
-- J-2 · PASO 4 · ACTUALIZACIÓN DE FOTOGRAFÍAS OFICIALES RFEF RIVALES (26 JUGADORES)
-- 
-- OBJETIVO:
-- 1. Actualizar foto_url en public.club_players para los 26 futbolistas rivales con foto real RFEF.
-- 2. Mantener foto_url = NULL para los 3 futbolistas con silueta (DIEZ URUTXURTU, INCERTIS, ENPARANTZA).
-- 3. Blindaje: Cero escrituras en SD INDAUTXU (public.players) ni en fotos CDN de ATHLETIC CLUB.
-- 
-- CONDICIÓN PREVIA: Las 26 fotos deben haberse subido previamente al bucket 'player-photos' de Storage.
-- ESTADO: PREPARADO · NO EJECUTADO AUTOMÁTICAMENTE
-- ============================================================================

DO $$
DECLARE
    v_updated_rows INTEGER;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE '   INICIANDO J2-04: ACTUALIZACIÓN FOTOS RFEF RIVALES J-2    ';
    RAISE NOTICE '============================================================';

    -- Actualización atómica de las 26 fotos
    WITH updates(rfef_id, url) AS (
        VALUES
            (900640864, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_900640864.jpg'),
            (1536366, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1536366.jpg'),
            (811414, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_811414.jpg'),
            (828669, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_828669.jpg'),
            (530745, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_530745.jpg'),
            (1539851, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1539851.png'),
            (1540919, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1540919.jpg'),
            (1491020, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1491020.jpg'),
            (1508934, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1508934.jpg'),
            (1515473, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1515473.jpg'),
            (1508936, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1508936.jpg'),
            (829455, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_829455.jpg'),
            (825614, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_825614.jpg'),
            (1514870, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1514870.jpg'),
            (847648, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_847648.jpg'),
            (1527555, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1527555.jpg'),
            (1511831, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1511831.jpg'),
            (1495316, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1495316.jpg'),
            (665289, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_665289.jpg'),
            (1531473, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1531473.jpg'),
            (1363982, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1363982.jpg'),
            (1364465, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1364465.jpg'),
            (1361512, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1361512.jpg'),
            (1527282, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1527282.jpg'),
            (1480414, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1480414.jpg'),
            (1486176, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1486176.jpg')
    )
    UPDATE public.club_players cp
    SET foto_url = u.url
    FROM updates u
    WHERE cp.rfef_player_id = u.rfef_id
      AND cp.foto_url IS NULL;

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
    RAISE NOTICE '-> % fotos de futbolistas rivales actualizadas con éxito.', v_updated_rows;

    IF v_updated_rows <> 26 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Se esperaban 26 actualizaciones de fotos, registradas: %', v_updated_rows;
    END IF;

    RAISE NOTICE '============================================================';
    RAISE NOTICE '   J2-04 FOTOS RFEF COMPLETADO EXITOSAMENTE                 ';
    RAISE NOTICE '============================================================';
END $$;
