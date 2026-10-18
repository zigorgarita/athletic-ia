-- ==============================================================================
-- ALTA OFICIAL DE JUGADOR: ASIER CAYÓN (PORTERO - JUVENIL DH)
-- Athletic Club / SD Indautxu Juvenil DH 2026/27
-- Criterio: NUNCA PERDER DATOS. NUNCA SOBREESCRIBIR DATOS.
--
-- PREPARADO PARA EJECUCIÓN MANUAL — 0 EJECUCIONES EN BD.
-- ==============================================================================

BEGIN;

-- INSERT estricto con las columnas existentes en public.players
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
  gen_random_uuid(),
  'Asier',
  'Cayón',
  'Cayón',
  30,
  'Portero',
  NULL,
  '2010-01-05',
  NULL,
  NULL,
  'Diestro',
  'Disponible',
  'DH',
  true,
  'https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/asier_cayon.jpg',
  NOW(),
  NOW()
);

COMMIT;

-- Comprobación post-ejecución (solo lectura)
SELECT 
  id,
  dorsal,
  nombre || ' ' || apellidos AS jugador,
  alias,
  demarcacion,
  pierna_dominante,
  equipo,
  estado,
  activo,
  fecha_nacimiento,
  foto_url
FROM public.players 
WHERE dorsal = 30;
