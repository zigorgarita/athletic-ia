-- ============================================================================
-- ESCALADO GLOBAL JORNADA 1 · FOTOS RFEF · 14 CLUBES RIVALES (211 JUGADORES)
-- Fecha: 2026-09-08
-- Procedimiento acordado:
-- 1. Anty prepara el script (este archivo) y extrae las 211 fotos localmente.
-- 2. Zigor sube las 211 fotos a player-photos/rivals/ y ejecuta este SQL en Supabase SQL Editor.
-- 3. Anty realiza la verificación estricta READ-ONLY posterior.
--
-- BLINDAJES CRIPTOGRÁFICOS TRANSACCIONALES:
-- 1. SD INDAUTXU (public.players): Cero sentencias que modifiquen la tabla.
--    Precheck y Postcheck calculan el checksum MD5 de id:foto_url de las 27 filas.
--    Cualquier cambio de un solo carácter aborta y revierte la transacción.
-- 2. FOTOS EXISTENTES ATHLETIC CLUB: Checksum MD5 de los 18 futbolistas con foto CDN original.
--    Precheck y Postcheck validan que sus 18 URLs originales permanecen 100% idénticas por UUID explícito.
-- 3. FOTOS EXISTENTES SANTUTXU FC (PILOTO): Checksum MD5 de los 16 futbolistas del piloto.
--    Precheck y Postcheck validan que sus 16 URLs del piloto permanecen 100% idénticas.
-- 4. SILUETAS RFEF: Las 29 siluetas detectadas permanecen estrictamente con foto_url IS NULL.
-- 5. ALCANCE ULTRA-ESTRICTO: El UPDATE utiliza pares unívocos (id, rfef_player_id) y foto_url IS NULL.
--    ROW_COUNT debe ser exactamente 211 o la transacción revierte.
-- ============================================================================

DO $$
DECLARE
    -- Blindaje Indautxu
    v_indautxu_count_pre INTEGER;
    v_indautxu_with_photo_pre INTEGER;
    v_indautxu_hash_pre TEXT;
    v_indautxu_count_post INTEGER;
    v_indautxu_with_photo_post INTEGER;
    v_indautxu_hash_post TEXT;

    -- Blindaje Athletic Club (18 fotos CDN existentes)
    v_athletic_cdn_count_pre INTEGER;
    v_athletic_cdn_hash_pre TEXT;
    v_athletic_cdn_count_post INTEGER;
    v_athletic_cdn_hash_post TEXT;

    -- Blindaje Santutxu FC (16 fotos piloto existentes)
    v_santutxu_pilot_hash_pre TEXT;
    v_santutxu_pilot_hash_post TEXT;

    -- Conteo general club_players
    v_total_cp_pre INTEGER;
    v_total_cp_with_photo_pre INTEGER;
    v_updated_rows INTEGER;
    v_total_cp_post INTEGER;
    v_total_cp_with_photo_post INTEGER;
    v_total_cp_null_post INTEGER;
    v_siluetas_check INTEGER;
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE '   INICIANDO ESCALADO J1: FOTOS RFEF · 14 CLUBES RIVALES   ';
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

    -- B. Blindaje Athletic Club (18 fotos CDN existentes comprobadas por UUID explícito)
    SELECT COUNT(*), md5(string_agg(cp.id::text || ':' || cp.foto_url, '|' ORDER BY cp.id))
    INTO v_athletic_cdn_count_pre, v_athletic_cdn_hash_pre
    FROM public.club_players cp
    JOIN public.club_seasons cs ON cp.club_season_id = cs.id
    JOIN public.clubs c ON cs.club_id = c.id
    WHERE c.rfef_club_id = 205514 AND cs.temporada = '2026-27' 
      AND cp.id IN ('184a6c34-890a-4053-837b-b249a140f280'::uuid, '1cb4314e-9f4f-45e8-b75c-d92d03adb0ee'::uuid, '31b7b4bc-0839-4087-8b73-cd2602c36ec1'::uuid, '47f19e51-db4b-44bc-b617-28c5696383e1'::uuid, '71f51b86-328b-4a2c-8cb3-d6a47f328e18'::uuid, '7dcdce76-007a-40cd-98fb-75d29ab9ad20'::uuid, '91791b09-9363-4720-9b6e-47f20bb3bb65'::uuid, '965d2b55-b36e-4601-8b77-d356b00406d8'::uuid, '969615d0-cd46-4f52-86ec-8f2890675879'::uuid, '99f15656-8f3b-4422-8e83-4e82f5363726'::uuid, 'a351be4d-8c04-4d9a-887d-62d1e78a7fbf'::uuid, 'aab6fe10-b797-454a-ab92-5b7b139f2e0b'::uuid, 'b44938b9-0d27-4145-9f19-8911c97e0fb3'::uuid, 'b54485d6-df06-4ce0-9ef8-4cbf0a0ccd78'::uuid, 'c0ced88b-ea07-422c-8044-92965e7ed507'::uuid, 'd74d2adf-e14f-4fef-ac01-8af99644a63a'::uuid, 'ee7941d4-18b9-4f6e-a7e2-bbac8920523d'::uuid, 'f244947a-76c7-4994-bee9-5d2a3a544193'::uuid);

    IF v_athletic_cdn_count_pre != 18 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: Athletic Club debe tener exactamente 18 fotos CDN preexistentes (encontradas: %). Transacción abortada.', v_athletic_cdn_count_pre;
    END IF;
    RAISE NOTICE '-> Precheck 2 OK: Athletic Club 18 fotos CDN blindadas por UUID (Checksum MD5: %)', v_athletic_cdn_hash_pre;

    -- C. Blindaje Santutxu FC (16 fotos piloto): Checksum MD5 de las 16 fotos del piloto
    SELECT md5(string_agg(cp.id::text || ':' || cp.foto_url, '|' ORDER BY cp.id))
    INTO v_santutxu_pilot_hash_pre
    FROM public.club_players cp
    JOIN public.club_seasons cs ON cp.club_season_id = cs.id
    JOIN public.clubs c ON cs.club_id = c.id
    WHERE c.rfef_club_id = 205567 AND cs.temporada = '2026-27' AND cp.foto_url IS NOT NULL;

    RAISE NOTICE '-> Precheck 3 OK: Santutxu FC fotos piloto blindadas (Checksum MD5: %)', v_santutxu_pilot_hash_pre;

    -- D. Conteo global previo de club_players: 280 filas, exactamente 34 con foto (18 Athletic + 16 Santutxu)
    SELECT COUNT(*), COUNT(foto_url)
    INTO v_total_cp_pre, v_total_cp_with_photo_pre
    FROM public.club_players;

    IF v_total_cp_pre != 280 OR v_total_cp_with_photo_pre != 34 THEN
        RAISE EXCEPTION 'PRECHECK FALLIDO: club_players tiene % filas y % con foto (se esperaban 280 y 34). Transacción abortada.',
            v_total_cp_pre, v_total_cp_with_photo_pre;
    END IF;
    RAISE NOTICE '-> Precheck 4 OK: club_players en estado esperado (280 filas, 34 con foto previa).';

    -- ------------------------------------------------------------------------
    -- 2. EJECUCIÓN CONTROLADA DEL UPDATE (EXCLUSIVAMENTE 211 FILAS CANDIDATAS)
    -- ------------------------------------------------------------------------
    WITH escalado_updates(p_id, p_rfef_id, p_url) AS (
        VALUES
            ('825c5e3a-4360-4a70-8d9b-a749725620d7'::uuid, 1527285, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1527285.jpg'),
            ('e539ec40-2fdc-49d9-aef0-f8ed77b0dc1b'::uuid, 1527276, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1527276.jpg'),
            ('0d3e16d1-b6d2-4b90-89dc-7779b09d69f8'::uuid, 1539163, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1539163.jpg'),
            ('dfb54a40-fcac-496c-acd2-0c75ac769fca'::uuid, 900379315, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_900379315.jpg'),
            ('ae3da1c6-be38-4bb4-a9ba-db85614074b1'::uuid, 1515418, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1515418.jpg'),
            ('faa630cb-b908-406d-bf01-31edcdfbfcaf'::uuid, 1489183, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1489183.jpg'),
            ('5553e4a1-6943-4083-9c6f-f45cbf62cd74'::uuid, 1288502, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1288502.jpg'),
            ('37772ba7-7f67-4594-ada0-4ff121789454'::uuid, 1492952, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1492952.jpg'),
            ('a71a74ff-4dae-45cc-88e1-85b9a65536f1'::uuid, 1527283, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1527283.jpg'),
            ('af567358-d3b7-468c-ba41-3f3de606d136'::uuid, 900752896, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_900752896.jpg'),
            ('6b6d269c-fe49-480b-99b9-69cde109584a'::uuid, 655417, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_655417.jpg'),
            ('b6bb2258-2624-422f-89ee-d1aabf0cd942'::uuid, 1515422, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1515422.jpg'),
            ('366c3a12-1994-4949-a6cc-a0c9386f1cc0'::uuid, 772817, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_772817.jpg'),
            ('6b34cf42-0551-4a03-8631-9f1ee1141989'::uuid, 1176078, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1176078.jpg'),
            ('d91e478f-2470-4aaf-9835-5e48edb3c3b0'::uuid, 1287698, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1287698.jpg'),
            ('7e930c32-1d0a-47e1-a820-8a66930bdaba'::uuid, 1512654, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1512654.jpg'),
            ('a7a1fb12-51c4-4225-9df2-458ccd8f4ee0'::uuid, 1220291, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1220291.jpg'),
            ('c57793a5-5f5c-40fd-9c6a-16f449a5d10d'::uuid, 900656259, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_900656259.png'),
            ('d2cca55a-406b-4fb5-bb62-4278d95acd59'::uuid, 1531746, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1531746.jpg'),
            ('78aaa5ee-5c2b-4e2c-aded-4e848b9264f0'::uuid, 1498780, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1498780.jpg'),
            ('82b1a326-515b-4cd7-be09-77b818f6ccd9'::uuid, 1542392, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1542392.jpg'),
            ('b1abe0c4-d8a9-4b58-8227-ccf16d3f062f'::uuid, 900640846, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_900640846.jpg'),
            ('4f61de4f-5aca-493d-8dcb-12f2f58252c3'::uuid, 1481818, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1481818.jpg'),
            ('f5da49b6-b60d-404f-95f4-da5fa67d115e'::uuid, 900640848, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_900640848.jpg'),
            ('152c3efb-432d-49aa-8d07-34d8a40c4536'::uuid, 1484975, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1484975.jpg'),
            ('65bc3616-311a-40fd-b402-99c24ab45aef'::uuid, 1478101, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1478101.png'),
            ('1737e6f6-0606-4981-85c1-76b0b0ea4118'::uuid, 1511392, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1511392.jpg'),
            ('bdb8fc75-f680-49ff-a928-d049f622de8a'::uuid, 1483756, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1483756.jpg'),
            ('6bb29859-ffd1-40e8-91b1-a341ac8464a8'::uuid, 1539347, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1539347.jpg'),
            ('80d4bc3d-a66a-43d7-bab1-c8eef8d9d4e5'::uuid, 1539780, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1539780.jpg'),
            ('e8caf572-03ee-45a7-a2dd-808a347f18d2'::uuid, 1538318, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1538318.png'),
            ('6ee59d49-f5ef-48d7-9109-4998b439706d'::uuid, 1530497, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1530497.jpg'),
            ('e9efbdfc-b4c7-4b3c-a193-fb08827bcf01'::uuid, 1527430, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1527430.jpg'),
            ('2e1a3b6b-a5da-4dfb-8599-a084b5ab8f9e'::uuid, 776472, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_776472.jpg'),
            ('d650a367-3dd8-4d28-ad59-f0f720bd0a05'::uuid, 1542198, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1542198.png'),
            ('cbcf27bd-3e73-4091-a990-337836d30616'::uuid, 1512131, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1512131.jpg'),
            ('9e505a2e-024f-47d3-b185-7c788abd09db'::uuid, 1511066, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1511066.png'),
            ('febe1ce8-863d-485a-ab2e-aa4568f3077d'::uuid, 1500153, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1500153.jpg'),
            ('1c44e542-dc10-4ef0-ac80-de4ddb567651'::uuid, 1536882, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1536882.jpg'),
            ('72f83412-1487-42b9-8491-a7522894298b'::uuid, 1137880, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1137880.jpg'),
            ('f1e45a99-4199-4f26-a35a-ce97eafd8e5d'::uuid, 842751, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_842751.jpg'),
            ('3deb1a1b-9b04-442f-b57c-9a0532d5e186'::uuid, 821289, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_821289.jpg'),
            ('7af7180e-b5eb-4e9c-b006-6cbf2e8f8343'::uuid, 825906, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_825906.jpg'),
            ('24b87b97-0201-43bc-b89c-4d3dc4803caa'::uuid, 33874377, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_33874377.jpg'),
            ('05499c94-f5a1-49df-a114-41548ec88d9b'::uuid, 24616341, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_24616341.jpg'),
            ('d69accdb-1ceb-4713-9b09-ba05c9c7a4c2'::uuid, 24605065, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_24605065.jpg'),
            ('05283426-9212-4107-ab91-cbb623274d74'::uuid, 826520, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_826520.jpg'),
            ('db1b3e1f-fcc7-49ae-a27b-2f27e0f43080'::uuid, 814687, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_814687.jpg'),
            ('f6eff52f-3695-4032-9124-60ca8932dafe'::uuid, 827875, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_827875.jpg'),
            ('2f609e94-7914-4916-a286-f4bf3b0b1f03'::uuid, 1118632, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1118632.jpg'),
            ('0d524dfd-50c8-4093-b7bd-169cd606bd7f'::uuid, 538479, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_538479.jpg'),
            ('01a8aba5-0bbd-4896-9cd3-460dc0244a95'::uuid, 900310644, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_900310644.jpg'),
            ('072423e2-64ab-4505-a9a9-c06d3ae6f8f2'::uuid, 828676, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_828676.jpg'),
            ('eadac80b-5805-4662-ab24-b797cb091d16'::uuid, 828358, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_828358.jpg'),
            ('eec9ffd3-2d18-44d0-ba69-37fecdd94912'::uuid, 24679388, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_24679388.jpg'),
            ('7ec9a486-93b7-4d22-81a0-628bf033d2c8'::uuid, 819621, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_819621.jpg'),
            ('6b68002c-02c8-4d5c-b225-c308a73f8a7e'::uuid, 24674855, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_24674855.jpg'),
            ('6043f731-d43e-4fc0-9f4d-e71ef7a8eeab'::uuid, 1480276, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1480276.jpg'),
            ('bd385fec-36eb-4762-993c-b419bd50ba3b'::uuid, 1480274, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1480274.jpg'),
            ('69f8b50d-00e6-4fbc-ab83-9d0c5870d074'::uuid, 1514007, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1514007.jpg'),
            ('e936a026-3c01-4f0f-bfa4-d5e14e2de0d6'::uuid, 1540922, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1540922.jpg'),
            ('0bbe6401-43a8-4c32-8787-a3c3bf0312ad'::uuid, 1502290, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1502290.jpg'),
            ('25c6d833-0e76-496d-beff-67953ce37370'::uuid, 1480275, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1480275.jpg'),
            ('b8cebc70-cd52-43ff-bf72-f554b9fd95bc'::uuid, 24669393, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_24669393.jpg'),
            ('03f781d4-febb-4835-9ab2-9eb84d1f884b'::uuid, 1478990, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1478990.jpg'),
            ('87b6cb72-ca25-4c6e-90eb-6aa4d54e8395'::uuid, 1542337, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1542337.jpg'),
            ('2903f3c1-f819-4c30-90b2-18cf671f8d48'::uuid, 1514226, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1514226.jpg'),
            ('42c9600b-37bc-4d2e-ab1c-293b199e737d'::uuid, 1542700, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1542700.jpg'),
            ('ed33acda-92f1-4860-ab2f-489f3f42e78c'::uuid, 1540923, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1540923.jpg'),
            ('243d4f4b-a241-4e4e-869c-5cbda9534cfa'::uuid, 1537336, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1537336.jpg'),
            ('081e218c-7ad7-4117-aee4-236b9b46bd3c'::uuid, 1494808, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1494808.jpg'),
            ('0a614515-11c2-435e-85cb-5c754ab1b8f4'::uuid, 1540918, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1540918.jpg'),
            ('b87e63dc-287b-4635-96f2-897acdc03090'::uuid, 1516666, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1516666.jpg'),
            ('2a9312d1-c079-4fc7-b6f3-35b9cc478628'::uuid, 23310438, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_23310438.jpg'),
            ('b184b7ff-b787-4c3e-94c0-d0a099193a5d'::uuid, 4472744, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_4472744.jpg'),
            ('d5809e43-e088-442b-93a4-7debcd9bdf33'::uuid, 1483772, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1483772.jpg'),
            ('a07cbafc-b98e-4de9-9e17-8d2ce8faad50'::uuid, 1528890, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1528890.jpg'),
            ('caeaae86-8eb0-4a03-9cc5-df6e0983fbe9'::uuid, 1492695, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1492695.jpg'),
            ('41a4b360-c02a-4931-acf8-adb32e69b02e'::uuid, 1511828, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1511828.jpg'),
            ('82b9d592-18ec-4bec-b989-8aa0f3c93354'::uuid, 1480156, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1480156.jpg'),
            ('625e8dbd-0994-4ac8-9dff-d02638b5b04d'::uuid, 24446382, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_24446382.jpg'),
            ('06232a2c-1c8f-41eb-b678-d183bc645a9a'::uuid, 1516059, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1516059.jpg'),
            ('f939c99a-d430-45e5-86ab-7051848932f2'::uuid, 1532373, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1532373.jpg'),
            ('850abaee-67b8-48f8-ad96-71636f3b7b86'::uuid, 1513243, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1513243.jpg'),
            ('74c9f177-23a7-4d39-b09a-76d3621ce25b'::uuid, 1534792, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1534792.jpg'),
            ('deb0ffb4-44c9-434c-ba76-b3dcc2992a0d'::uuid, 1534376, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1534376.jpg'),
            ('0416c3a5-2f14-4ddf-a374-9c776c91d0f4'::uuid, 1483771, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1483771.jpg'),
            ('e6db2ea9-a0ba-4a35-955b-90065562dd52'::uuid, 24674595, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_24674595.jpg'),
            ('afa1f0d3-5fce-498d-b8d1-41a39df7e7ae'::uuid, 23077000, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_23077000.jpg'),
            ('7bdd3f37-0496-4a74-ad3d-0a65e469b854'::uuid, 1534374, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1534374.jpg'),
            ('faf1be0b-ab53-4410-bc74-49a7c5410bfb'::uuid, 1367205, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1367205.jpg'),
            ('e5c379c2-3ed8-4d40-b5d4-87e02842f363'::uuid, 1364175, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1364175.jpg'),
            ('d10bf4aa-ac4d-4e2b-9214-dd157c5ef3be'::uuid, 1366429, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1366429.jpg'),
            ('d3b54744-106a-4ac0-b75e-d3e56e7e59e4'::uuid, 1363430, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1363430.jpg'),
            ('e9aeda97-bb36-4634-957a-0f293819d876'::uuid, 1363429, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1363429.jpg'),
            ('ed924ded-f2b1-4c6e-95bd-9cd69443121a'::uuid, 1367227, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1367227.jpg'),
            ('880d585f-9590-47de-b0fd-70cab5bfcbcf'::uuid, 1364236, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1364236.jpg'),
            ('fa49e0c5-3bb6-4741-81f7-d74827d33f68'::uuid, 1364630, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1364630.jpg'),
            ('15146308-7280-4183-bb66-9164ded7b18b'::uuid, 1367436, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1367436.jpg'),
            ('4f8e88a9-ed9a-4790-98e4-88db7baf10c8'::uuid, 1368796, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1368796.jpg'),
            ('21ffef8a-0767-4b6b-a26a-6b3d3485dc8a'::uuid, 24576616, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_24576616.jpg'),
            ('065d136f-93ae-4b81-ab20-2c8928e84347'::uuid, 1363259, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1363259.jpg'),
            ('49b6a4c3-4204-43e6-90a2-5faef44f82c0'::uuid, 1367926, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1367926.jpg'),
            ('0591ce05-c2ad-48fd-b27b-4a429fb2fc84'::uuid, 34071958, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_34071958.jpg'),
            ('480401f3-897e-47b2-8c96-51bfdca95365'::uuid, 1325857, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1325857.jpg'),
            ('cd165ba7-dd6e-4bec-a5da-e7c7ee586dd0'::uuid, 809355, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_809355.jpg'),
            ('cf44b30f-44b7-4494-a8ae-a0823e1b5862'::uuid, 826008, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_826008.jpg'),
            ('2a84e644-4810-404d-af7a-2460eff748cc'::uuid, 34042813, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_34042813.jpg'),
            ('205f773d-ea82-4c09-8d21-afef3cbe7ff2'::uuid, 817116, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_817116.jpg'),
            ('f7154807-01ed-4606-acf6-0bf76bcdada4'::uuid, 23323965, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_23323965.jpg'),
            ('6fc1f957-4a04-468a-a9ca-5546d45804b7'::uuid, 812416, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_812416.jpg'),
            ('0ffc476a-9dda-4f88-91d7-a7cd5487df5e'::uuid, 628729, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_628729.jpg'),
            ('542c12a6-6fa8-4478-a8d5-a5390b38f534'::uuid, 825613, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_825613.jpg'),
            ('2da8047c-d8a9-4a36-b6fc-eb7dab45c0a4'::uuid, 826382, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_826382.jpg'),
            ('cea17141-070b-4853-86a4-df29c5b5f7d4'::uuid, 818237, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_818237.jpg'),
            ('0b980b65-4de5-43e0-af8e-e94fb3fc1bd3'::uuid, 814927, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_814927.jpg'),
            ('81cdf88f-ce84-4ad9-8b60-c0eccf65deea'::uuid, 23327967, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_23327967.jpg'),
            ('05a90f78-309e-47d4-bcfe-6de5302daeb2'::uuid, 811944, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_811944.jpg'),
            ('78a74819-6f09-4012-bfdf-910d621ea56b'::uuid, 812205, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_812205.jpg'),
            ('b95c34f3-7018-4359-a6a4-3a40c3a5fca3'::uuid, 34060184, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_34060184.jpg'),
            ('cb17af8e-a268-47ab-b165-c4a9ca75acf1'::uuid, 23492022, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_23492022.jpg'),
            ('390a79e0-129f-4a30-a6eb-e1149b16acc8'::uuid, 34053553, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_34053553.jpg'),
            ('7ad74390-07b1-4648-8ee0-887590de585d'::uuid, 900176428, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_900176428.jpg'),
            ('5e853f52-cac3-47bd-8112-90e13877dde3'::uuid, 1506628, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1506628.jpg'),
            ('aac33bc5-62ec-43ee-8961-e23871d59597'::uuid, 1515680, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1515680.png'),
            ('b031f863-f170-4600-9072-df84f84ece56'::uuid, 25859579, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_25859579.jpg'),
            ('c9d9d6e6-14f2-45d1-a285-90e09b8ad2d7'::uuid, 1483827, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1483827.jpg'),
            ('811bdc56-ff42-497d-8fce-44b02fb8c35d'::uuid, 25120706, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_25120706.jpg'),
            ('b0fd71c0-5a88-44ab-b185-4192164415b6'::uuid, 1517904, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1517904.jpg'),
            ('711ccd48-601c-4251-8bad-0a40729fe1a7'::uuid, 1512655, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1512655.jpg'),
            ('bb2630c2-fb02-44e3-8209-c926d741a1b1'::uuid, 1521544, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1521544.jpg'),
            ('dbff834d-61a8-4e39-806a-dd04a0232f5b'::uuid, 24616827, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_24616827.jpg'),
            ('0ee10ff3-40f8-4370-b596-9d44681c84d6'::uuid, 1484304, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1484304.jpg'),
            ('1ee67fc0-73c3-4cd5-a10c-5afafa5466ec'::uuid, 901384678, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_901384678.jpg'),
            ('b1bd20c3-4899-43e7-acc0-ff319d8a39e8'::uuid, 1537486, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1537486.jpg'),
            ('a470ccdb-4a32-4fb1-9b2a-987b016e4f1d'::uuid, 1344835, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1344835.jpg'),
            ('c6efaf27-e211-4ffc-a807-845980019fe3'::uuid, 948020, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_948020.jpg'),
            ('3c077243-506e-4a5b-aa8c-05addaf23cb4'::uuid, 1481562, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1481562.jpg'),
            ('0332c64a-0751-4a7b-b0cf-10a2a492214f'::uuid, 24147469, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_24147469.jpg'),
            ('91907812-cf99-4ce6-8ea5-884a43f0cf68'::uuid, 1507452, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1507452.jpg'),
            ('f14ff1c1-4b83-4328-829f-bf333e053683'::uuid, 1542087, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1542087.jpg'),
            ('b9ca987e-dbdc-4bb4-abcc-49c5fe83aaf7'::uuid, 1532709, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1532709.jpg'),
            ('9a68c8c5-3505-419c-bea6-70e1c598f1f3'::uuid, 23388984, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_23388984.jpg'),
            ('91c20806-ad92-4952-a328-7d807c19ea88'::uuid, 1535814, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1535814.jpg'),
            ('3bde4a5f-8abf-4122-ad86-d674d77ffded'::uuid, 1513856, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1513856.jpg'),
            ('1c429993-1db6-4589-b62e-f694aefc7c5c'::uuid, 1484977, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1484977.jpg'),
            ('ce97500b-8551-42d3-9e59-1724a5e3b648'::uuid, 1139265, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1139265.jpg'),
            ('50b77aaa-f6a0-4585-840f-e2fe4ec88071'::uuid, 1537414, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1537414.jpg'),
            ('4373537b-5a6a-49a9-91af-80539133231d'::uuid, 1528307, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1528307.jpg'),
            ('fe042107-5406-45da-8ef4-769261a65743'::uuid, 1528846, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1528846.jpg'),
            ('8e14385e-8010-4fa4-b3ed-8fb13944129a'::uuid, 1526711, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1526711.jpg'),
            ('e811e853-ef6f-42c4-acb0-6cf541c1e19b'::uuid, 1515474, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1515474.jpg'),
            ('73294c31-55c4-45ab-b239-28c679f8e157'::uuid, 1492300, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1492300.jpg'),
            ('61ce6f6e-040f-45e0-b4b0-af7c58bf9d49'::uuid, 1541701, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1541701.jpg'),
            ('a1c47908-b112-46da-b531-46b72d193782'::uuid, 1486871, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1486871.jpg'),
            ('9c87aa96-e241-4dc8-8ab2-56b5a07fbab4'::uuid, 25439141, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_25439141.jpg'),
            ('a830e844-d5a8-449a-aeae-515e2fccf835'::uuid, 33129429, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_33129429.jpg'),
            ('b4922751-98f8-41b6-b0c3-67cdb72297a9'::uuid, 1505560, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1505560.jpg'),
            ('daf3f451-00f0-48c6-84b6-3507a0eb30ee'::uuid, 25241054, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_25241054.jpg'),
            ('914f2ab9-f57a-4949-815d-5414ab41a31d'::uuid, 489124, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_489124.jpg'),
            ('02cb3bb9-3ad3-4764-9323-33aac7b9c89d'::uuid, 25177199, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_25177199.jpg'),
            ('d08ae98c-b216-4b4b-8dd0-0c83963e32de'::uuid, 23445453, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_23445453.jpg'),
            ('cec2cb8a-d457-4f75-b4d8-f20901db3ea0'::uuid, 1346342, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1346342.jpg'),
            ('d09bc5a2-9489-450f-b3c4-c92755fa1a32'::uuid, 1365893, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1365893.jpg'),
            ('4ef80ad6-ce84-4dff-a448-34dd2ffd8c05'::uuid, 1511829, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1511829.jpg'),
            ('7bbf1361-0d7d-48f7-9cb2-9989f479ffc8'::uuid, 1108391, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1108391.jpg'),
            ('a2a4d071-d258-4251-af66-d0e7e04119f6'::uuid, 1361353, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1361353.jpg'),
            ('ab59506c-7ffe-4e9d-9b38-1e342fdca87e'::uuid, 1368621, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1368621.jpg'),
            ('42cc2fc5-a50d-48a2-9a3a-2e382bf095d3'::uuid, 885652, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_885652.jpg'),
            ('0b857df9-a0ff-437b-be1a-cf0fb2da369e'::uuid, 1346348, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1346348.jpg'),
            ('ac94962c-3f69-4671-af9a-16767b51afae'::uuid, 1361938, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1361938.jpg'),
            ('33fad77f-1768-4bde-889d-93bb7d76c3e5'::uuid, 1369428, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1369428.jpg'),
            ('e8f20d06-d55c-4e8a-85c8-99851593af9d'::uuid, 1362005, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1362005.jpg'),
            ('1d104d40-9700-4dbd-94f9-f3662db31eac'::uuid, 1362760, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1362760.jpg'),
            ('d7093089-26ed-449a-a520-dae8cc38a9f5'::uuid, 1368755, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1368755.jpg'),
            ('4405676f-c34a-436d-957f-576dd4a236e5'::uuid, 863015, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_863015.jpg'),
            ('7a17309a-56da-453a-b587-83f083afd36e'::uuid, 1295765, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1295765.jpg'),
            ('9dfc5ad5-bb70-4a7d-85af-5828a8e6738b'::uuid, 758958, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_758958.jpg'),
            ('23e1ddf3-9622-4ce0-9e96-3a1ca4a0cfd8'::uuid, 1050135, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1050135.jpg'),
            ('7bc33554-1a32-444e-abc9-9a06cf30b244'::uuid, 829972, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_829972.jpg'),
            ('99fb598e-a393-4c40-b3cb-86f090c65d36'::uuid, 826990, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_826990.jpg'),
            ('4f778754-5b92-4900-8d36-328db7e1a0a3'::uuid, 4475785, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_4475785.jpg'),
            ('f6a3e5cf-9ee5-4e31-b012-96ec858d67dc'::uuid, 825653, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_825653.jpg'),
            ('91818b67-de06-41e5-b8d1-54db558154de'::uuid, 826268, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_826268.jpg'),
            ('a25ee87a-4c8f-477d-bd76-e2b25d66beaf'::uuid, 24150608, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_24150608.jpg'),
            ('3ae71837-4e04-488a-8ca0-d706c6274d26'::uuid, 827130, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_827130.jpg'),
            ('ded5fe23-bf18-48d4-8f98-8ccdc65c3c97'::uuid, 820847, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_820847.jpg'),
            ('0c3ca138-5941-4716-810c-0eb27632cf43'::uuid, 1112081, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1112081.jpg'),
            ('d749984c-ae84-410e-a27d-5e160bd31ca0'::uuid, 807944, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_807944.jpg'),
            ('ebeafb3e-3b35-4884-a986-c496ca07416b'::uuid, 841009, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_841009.jpg'),
            ('1cd504a1-aa8d-4701-a869-147ba05bb91e'::uuid, 813863, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_813863.jpg'),
            ('2799aff3-1630-4b5b-8117-11a9b10e6840'::uuid, 826993, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_826993.jpg'),
            ('7a0bdc19-2a4e-46d0-8256-371a9265f24f'::uuid, 847100, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_847100.jpg'),
            ('e403478b-8dae-4b86-9121-7a93b1c2d453'::uuid, 828723, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_828723.jpg'),
            ('f9888301-6c1d-4e23-89b7-2fee26eb2c7e'::uuid, 1536035, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1536035.jpg'),
            ('41868dba-2645-4e1a-8bf5-50f78fb9291c'::uuid, 1506997, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1506997.jpg'),
            ('b5b1aad1-54c1-4771-88c7-24df607133dd'::uuid, 1528578, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1528578.jpg'),
            ('73f22b5a-9e92-4deb-ae36-9b85eb6d0285'::uuid, 1479396, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1479396.jpg'),
            ('18140852-e819-4663-99ae-214c8a45b073'::uuid, 1529142, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1529142.jpg'),
            ('ff381bc6-e955-4bee-be20-1a1d55e7ab80'::uuid, 1515143, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1515143.jpg'),
            ('fbaa6c9f-d702-4c0d-9c07-c72c7b74e1a9'::uuid, 1537923, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1537923.jpg'),
            ('5dd5d983-a9a6-461e-a848-f1295a2ee8aa'::uuid, 33882160, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_33882160.jpg'),
            ('95779f7e-12d5-4d97-8305-8bc75fa185b8'::uuid, 1495737, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1495737.jpg'),
            ('17323daa-a764-4556-85f3-5b7867d55992'::uuid, 1501390, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1501390.jpg'),
            ('6615c5ab-beea-440f-86a8-8254d537b9ce'::uuid, 1513332, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1513332.jpg'),
            ('5e40e751-8169-46ec-90f5-628fb8f1db34'::uuid, 1530693, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1530693.jpg'),
            ('7e4028ac-a178-4441-b8a8-64ccacc5462e'::uuid, 1482735, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1482735.jpg'),
            ('126df13e-5b3f-4ccb-b0b8-5798a52a4d78'::uuid, 1364289, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1364289.jpg'),
            ('9fc9f360-72e7-4d40-b2d9-1138bd9fd11e'::uuid, 1480157, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1480157.jpg'),
            ('a213afaa-4990-49e2-abbf-aee1994d3273'::uuid, 1492714, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_1492714.jpg'),
            ('1020f817-fb2d-4293-bb8b-474e201b273d'::uuid, 723498, 'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/rivals/rfef_723498.jpg')
    )
    UPDATE public.club_players cp
    SET foto_url = eu.p_url
    FROM escalado_updates eu
    WHERE cp.id = eu.p_id
      AND cp.rfef_player_id = eu.p_rfef_id
      AND cp.foto_url IS NULL;

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    IF v_updated_rows != 211 THEN
        RAISE EXCEPTION 'TRANSACCIÓN ABORTADA: Se actualizaron % filas (se esperaban exactamente 211).', v_updated_rows;
    END IF;
    RAISE NOTICE '-> Update ejecutado con éxito: Exactamente % filas actualizadas en club_players.', v_updated_rows;

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

    -- B. Verificar Athletic Club (18 fotos CDN existentes conservadas idénticas por UUID explícito)
    SELECT COUNT(*), md5(string_agg(cp.id::text || ':' || cp.foto_url, '|' ORDER BY cp.id))
    INTO v_athletic_cdn_count_post, v_athletic_cdn_hash_post
    FROM public.club_players cp
    JOIN public.club_seasons cs ON cp.club_season_id = cs.id
    JOIN public.clubs c ON cs.club_id = c.id
    WHERE c.rfef_club_id = 205514 AND cs.temporada = '2026-27' 
      AND cp.id IN ('184a6c34-890a-4053-837b-b249a140f280'::uuid, '1cb4314e-9f4f-45e8-b75c-d92d03adb0ee'::uuid, '31b7b4bc-0839-4087-8b73-cd2602c36ec1'::uuid, '47f19e51-db4b-44bc-b617-28c5696383e1'::uuid, '71f51b86-328b-4a2c-8cb3-d6a47f328e18'::uuid, '7dcdce76-007a-40cd-98fb-75d29ab9ad20'::uuid, '91791b09-9363-4720-9b6e-47f20bb3bb65'::uuid, '965d2b55-b36e-4601-8b77-d356b00406d8'::uuid, '969615d0-cd46-4f52-86ec-8f2890675879'::uuid, '99f15656-8f3b-4422-8e83-4e82f5363726'::uuid, 'a351be4d-8c04-4d9a-887d-62d1e78a7fbf'::uuid, 'aab6fe10-b797-454a-ab92-5b7b139f2e0b'::uuid, 'b44938b9-0d27-4145-9f19-8911c97e0fb3'::uuid, 'b54485d6-df06-4ce0-9ef8-4cbf0a0ccd78'::uuid, 'c0ced88b-ea07-422c-8044-92965e7ed507'::uuid, 'd74d2adf-e14f-4fef-ac01-8af99644a63a'::uuid, 'ee7941d4-18b9-4f6e-a7e2-bbac8920523d'::uuid, 'f244947a-76c7-4994-bee9-5d2a3a544193'::uuid);

    IF v_athletic_cdn_count_post != 18 OR v_athletic_cdn_hash_pre != v_athletic_cdn_hash_post THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: ¡Checksum MD5 o conteo de las 18 fotos CDN de Athletic Club alterado! Transacción revertida.';
    END IF;
    RAISE NOTICE '-> Postcheck 2 OK: Athletic Club 18 fotos CDN intactas (Checksum MD5 verificado byte a byte: %)', v_athletic_cdn_hash_post;

    -- C. Verificar Santutxu FC (16 fotos piloto existentes conservadas idénticas)
    SELECT md5(string_agg(cp.id::text || ':' || cp.foto_url, '|' ORDER BY cp.id))
    INTO v_santutxu_pilot_hash_post
    FROM public.club_players cp
    JOIN public.club_seasons cs ON cp.club_season_id = cs.id
    JOIN public.clubs c ON cs.club_id = c.id
    WHERE c.rfef_club_id = 205567 AND cs.temporada = '2026-27' AND cp.foto_url IS NOT NULL;

    IF v_santutxu_pilot_hash_pre != v_santutxu_pilot_hash_post THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: ¡Checksum MD5 de las 16 fotos del piloto Santutxu alterado! Transacción revertida.';
    END IF;
    RAISE NOTICE '-> Postcheck 3 OK: Santutxu FC 16 fotos piloto intactas (Checksum MD5 verificado byte a byte: %)', v_santutxu_pilot_hash_post;

    -- D. Verificar conteo global final de club_players: exactamente 280 filas, 245 con foto y 35 en NULL
    SELECT COUNT(*), COUNT(foto_url), COUNT(*) FILTER (WHERE foto_url IS NULL)
    INTO v_total_cp_post, v_total_cp_with_photo_post, v_total_cp_null_post
    FROM public.club_players;

    IF v_total_cp_post != 280 OR v_total_cp_with_photo_post != 245 OR v_total_cp_null_post != 35 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: club_players tiene % filas, % con foto y % en NULL (se esperaban 280, 245 y 35). Transacción revertida.',
            v_total_cp_post, v_total_cp_with_photo_post, v_total_cp_null_post;
    END IF;
    RAISE NOTICE '-> Postcheck 4 OK: Estado global de club_players verificado (280 filas, 245 con foto, 35 en NULL).';

    -- E. Verificar expresamente que las 29 siluetas detectadas continúan en NULL
    SELECT COUNT(*)
    INTO v_siluetas_check
    FROM public.club_players
    WHERE rfef_player_id IN (
        1525519, 23917106, 1484390, 1525520, 1541884, 23917110, 1484386, 25552725, 1520266, 23519898, 1507893, 1511069, 1506439, 1482473, 1484582, 1480857, 1480281, 1514872, 1364588, 1368236, 1363891, 1365615, 1362725, 1368730, 1527280, 1500441, 900176843, 900459882, 23364906
    )
    AND foto_url IS NOT NULL;

    IF v_siluetas_check != 0 THEN
        RAISE EXCEPTION 'POSTCHECK FALLIDO: Hay % siluetas que recibieron foto indebidamente. Transacción revertida.', v_siluetas_check;
    END IF;
    RAISE NOTICE '-> Postcheck 5 OK: Todas las 29 siluetas federativas permanecen en NULL con fallback de iniciales.';

    RAISE NOTICE '============================================================';
    RAISE NOTICE '   ESCALADO J1 COMPLETADO Y VALIDADO CON ÉXITO             ';
    RAISE NOTICE '============================================================';
END $$;
