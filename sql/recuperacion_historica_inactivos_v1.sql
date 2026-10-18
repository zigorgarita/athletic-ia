-- ==============================================================================
-- SCRIPT DE RECUPERACIÓN HISTÓRICA E INACTIVACIÓN SEGURA (V1 DEFINITIVA)
-- Athletic Club / SD Indautxu Juvenil DH 2026/27
-- Criterio acordado: NUNCA PERDER DATOS. NUNCA INVENTAR DATOS.
--
-- ESTE SCRIPT ESTÁ PREPARADO PARA REVISIÓN HUMANA — 0 EJECUCIONES EN BD.
--
-- ORIGEN DE LOS DATOS UTILIZADOS:
-- Registro backup original canónico del repositorio:
-- Commit Git: aeb4694 ('scratch/db_backup_before_fase1.json')
-- Tabla original 'players' y 'app/api/admin/bulk-alias/route.ts' (Commit 3a4eaf8)
--
-- Corrección y confirmación humana por Zigor (Responsable del Proyecto):
-- Geovani Raigosa = PORTERO (coincide al 100% con el backup original).
--
-- EXCLUIDOS EXPRESAMENTE:
-- - Neev Mogre: PENDIENTE y sin tocar.
-- - Jugador Torneo Leioa: PENDIENTE y sin tocar.
-- ==============================================================================

BEGIN;

-- 1. AÑADIR CAMPO 'activo' A LA TABLA PLAYERS (IDEMPOTENTE)
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

-- Índice para optimizar consultas de plantilla activa / bajas
CREATE INDEX IF NOT EXISTS idx_players_activo 
ON public.players (activo);

-- ==============================================================================
-- 2. RESTAURACIÓN CON DATOS EXACTOS DEL REGISTRO ORIGINAL (UUID ORIGINAL)
-- ==============================================================================

-- 1. MARKEL ARROYO (UUID original)
-- Origen: Backup original aeb4694 + Mapeo Oficial RFEF (sql/step2_rfef_players_mapping.sql:L130)
-- Dorsal: 1 | Demarcación: Portero | Fecha: 2009-05-03 | Pierna: Diestro | Equipo: DH | RFEF ID: 24521512
-- Altura: NULL | Peso: NULL | Rol ABP: NULL
INSERT INTO public.players (
  id,
  nombre,
  apellidos,
  alias,
  dorsal,
  demarcacion,
  posicion_secundaria,
  fecha_nacimiento,
  altura,
  peso,
  pierna_dominante,
  estado,
  equipo,
  activo,
  rfef_player_id,
  foto_url,
  created_at,
  updated_at
) VALUES (
  'f4b19a54-2483-4469-a91d-e182353a4696',
  'Markel',
  'Arroyo',
  'Markel',
  1,
  'Portero',
  'Portero',
  '2009-05-03',
  NULL,
  NULL,
  'Diestro',
  'Baja temporal',
  'DH',
  false,
  24521512,
  'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/photo_f4b19a54-2483-4469-a91d-e182353a4696.png',
  '2026-06-17T20:21:26.011696+00:00',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  activo = false,
  estado = 'Baja temporal',
  rfef_player_id = 24521512,
  updated_at = NOW();

-- 2. IBÓN ROBLES
-- Origen: Backup original aeb4694 (scratch/db_backup_before_fase1.json)
-- Dorsal: 3 | Demarcación: Centrocampista | Fecha: 2008-09-28 | Pierna: Diestro | Equipo: DH
-- Altura: NULL | Peso: NULL | Pos. Secundaria: NULL
INSERT INTO public.players (
  id,
  nombre,
  apellidos,
  alias,
  dorsal,
  demarcacion,
  posicion_secundaria,
  fecha_nacimiento,
  altura,
  peso,
  pierna_dominante,
  estado,
  equipo,
  activo,
  foto_url,
  created_at,
  updated_at
) VALUES (
  '5d37735a-b197-4664-8910-a1110706cd94',
  'Ibón',
  'Robles',
  'Robles',
  3,
  'Centrocampista',
  NULL,
  '2008-09-28',
  NULL,
  NULL,
  'Diestro',
  'Baja temporal',
  'DH',
  false,
  'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/photo_5d37735a-b197-4664-8910-a1110706cd94.png',
  '2026-06-19T12:02:50.862355+00:00',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  activo = false,
  estado = 'Baja temporal',
  updated_at = NOW();

-- 3. URKO CHOCARRO
-- Origen: Backup original aeb4694 (scratch/db_backup_before_fase1.json)
-- Dorsal: 23 | Demarcación: Defensa | Fecha: 2008-10-15 | Pierna: Diestro | Equipo orig: DH (Juvenil B)
-- Altura: NULL | Peso: NULL | Pos. Secundaria: NULL
INSERT INTO public.players (
  id,
  nombre,
  apellidos,
  alias,
  dorsal,
  demarcacion,
  posicion_secundaria,
  fecha_nacimiento,
  altura,
  peso,
  pierna_dominante,
  estado,
  equipo,
  activo,
  foto_url,
  created_at,
  updated_at
) VALUES (
  '7787d8ad-3b56-49d9-b281-0a554cb646e8',
  'Urko',
  'Chocarro',
  'Chocarro',
  23,
  'Defensa',
  NULL,
  '2008-10-15',
  NULL,
  NULL,
  'Diestro',
  'Disponible',
  'B',
  false,
  'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/photo_7787d8ad-3b56-49d9-b281-0a554cb646e8.png',
  '2026-06-19T12:02:50.995662+00:00',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  activo = false,
  equipo = 'B',
  updated_at = NOW();

-- 4. DIEGO TUBIA
-- Origen: Backup original aeb4694 (scratch/db_backup_before_fase1.json)
-- Dorsal: 27 | Demarcación: Lateral | Fecha: 2010-09-24 | Pierna: Diestro | Equipo: B
-- Altura: NULL | Peso: NULL | Pos. Secundaria: NULL
INSERT INTO public.players (
  id,
  nombre,
  apellidos,
  alias,
  dorsal,
  demarcacion,
  posicion_secundaria,
  fecha_nacimiento,
  altura,
  peso,
  pierna_dominante,
  estado,
  equipo,
  activo,
  foto_url,
  created_at,
  updated_at
) VALUES (
  'fa5f3955-ee32-4cca-98a4-83894a44abf1',
  'Diego',
  'Tubia',
  'Tubia',
  27,
  'Lateral',
  NULL,
  '2010-09-24',
  NULL,
  NULL,
  'Diestro',
  'Disponible',
  'B',
  false,
  'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/photo_fa5f3955-ee32-4cca-98a4-83894a44abf1.png',
  '2026-06-19T12:02:51.528272+00:00',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  activo = false,
  equipo = 'B',
  updated_at = NOW();

-- 5. ARITZ FONSECA
-- Origen: Backup original aeb4694 (scratch/db_backup_before_fase1.json)
-- Dorsal: 24 | Demarcación: Extremo | Fecha: 2010-05-07 | Pierna: Diestro | Equipo: B
-- Altura: NULL | Peso: NULL | Pos. Secundaria: NULL
INSERT INTO public.players (
  id,
  nombre,
  apellidos,
  alias,
  dorsal,
  demarcacion,
  posicion_secundaria,
  fecha_nacimiento,
  altura,
  peso,
  pierna_dominante,
  estado,
  equipo,
  activo,
  foto_url,
  created_at,
  updated_at
) VALUES (
  'a8a582ec-c67a-48d9-a83c-d1d745a4492f',
  'Aritz',
  'Fonseca',
  'Aritz',
  24,
  'Extremo',
  NULL,
  '2010-05-07',
  NULL,
  NULL,
  'Diestro',
  'Disponible',
  'B',
  false,
  'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/photo_a8a582ec-c67a-48d9-a83c-d1d745a4492f.png',
  '2026-06-19T12:02:51.133341+00:00',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  activo = false,
  equipo = 'B',
  updated_at = NOW();

-- 6. GEOVANI RAIGOSA
-- Origen: Backup original aeb4694 (scratch/db_backup_before_fase1.json)
-- Corrección humana confirmada por Zigor: Portero (coincide exactamente con el backup original)
-- Dorsal: 25 | Demarcación: Portero | Fecha: 2010-07-19 | Pierna: Diestro | Equipo: B
-- Altura: NULL | Peso: NULL
INSERT INTO public.players (
  id,
  nombre,
  apellidos,
  alias,
  dorsal,
  demarcacion,
  posicion_secundaria,
  fecha_nacimiento,
  altura,
  peso,
  pierna_dominante,
  estado,
  equipo,
  activo,
  foto_url,
  created_at,
  updated_at
) VALUES (
  '53f1aa52-f7a0-4814-8f90-8f45031b6636',
  'Geovani',
  'Raigosa',
  'Geovanni',
  25,
  'Portero',
  'Portero',
  '2010-07-19',
  NULL,
  NULL,
  'Diestro',
  'Disponible',
  'B',
  false,
  'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/photo_53f1aa52-f7a0-4814-8f90-8f45031b6636.png',
  '2026-06-19T12:02:51.262077+00:00',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  activo = false,
  demarcacion = 'Portero',
  equipo = 'B',
  updated_at = NOW();

COMMIT;

-- ==============================================================================
-- 3. CONSULTAS DE COMPROBACIÓN POST-EJECUCIÓN (SOLO LECTURA)
-- ==============================================================================

-- Total de jugadores activos (debe mantenerse exactamente en 25 jugadores DH)
SELECT count(*) AS total_activos FROM public.players WHERE activo = true;

-- Total de jugadores en histórico / bajas (debe resultar en 6 jugadores)
SELECT count(*) AS total_inactivos FROM public.players WHERE activo = false;

-- Comprobación detallada de los 6 futbolistas restaurados
SELECT 
  id,
  dorsal,
  nombre || ' ' || apellidos AS jugador,
  alias,
  demarcacion,
  posicion_secundaria,
  equipo,
  estado,
  activo,
  fecha_nacimiento,
  pierna_dominante,
  altura,
  peso,
  rfef_player_id
FROM public.players 
WHERE id IN (
  'f4b19a54-2483-4469-a91d-e182353a4696',
  '5d37735a-b197-4664-8910-a1110706cd94',
  '7787d8ad-3b56-49d9-b281-0a554cb646e8',
  'fa5f3955-ee32-4cca-98a4-83894a44abf1',
  'a8a582ec-c67a-48d9-a83c-d1d745a4492f',
  '53f1aa52-f7a0-4814-8f90-8f45031b6636'
)
ORDER BY dorsal ASC;
