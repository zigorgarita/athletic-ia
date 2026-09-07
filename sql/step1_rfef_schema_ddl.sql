-- ============================================================================
-- PASO 1: ESQUEMA DDL IDEMPOTENTE Y SEGURO - SD INDAUTXU RFEF (DEFINITIVO)
-- ============================================================================
-- Procedimiento acordado:
-- 1. Este script NO se ejecuta automáticamente por la IA.
-- 2. Zigor lo revisa y lo ejecuta manualmente en el SQL Editor de Supabase.
-- 3. Posteriormente, la IA realiza la verificación READ-ONLY.
--
-- Principio de Seguridad y Fidelidad de Datos (NULL vs DEFAULT):
-- - Las columnas oficiales federativas son NULLABLE SIN DEFAULT:
--   Al ejecutarse, todas las filas históricas/manuales existentes quedan con NULL.
--   NULL significa estrictamente: "Dato oficial no disponible / no acreditado por RFEF".
-- - 'origen' tiene NOT NULL DEFAULT 'manual':
--   Todas las filas históricas/manuales existentes adquieren origen = 'manual'.
-- - Los valores (true, false, 0, etc.) solo se asignarán de forma EXPLÍCITA
--   cuando procedan del importador o saneador del acta oficial RFEF ('rfef').
-- - Amistosos y pretemporada quedan 100% operativos e intactos.
-- - ANÁLISIS PROPIO: NI TOCAR (100% aislado).
-- ============================================================================

-- 1. VINCULACIÓN FEDERATIVA EN public.players (Cero duplicados en club_players)
ALTER TABLE public.players 
  ADD COLUMN IF NOT EXISTS rfef_player_id INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_rfef_player_id 
  ON public.players(rfef_player_id) 
  WHERE rfef_player_id IS NOT NULL;

-- 2. AMPLIACIÓN OFICIAL EN public.match_player_stats (NULLABLE Y SIN DEFAULTS FICTICIOS)
ALTER TABLE public.match_player_stats 
  ADD COLUMN IF NOT EXISTS convocado BOOLEAN,
  ADD COLUMN IF NOT EXISTS suplente BOOLEAN,
  ADD COLUMN IF NOT EXISTS entro_banquillo BOOLEAN,
  ADD COLUMN IF NOT EXISTS minuto_entrada INTEGER CHECK (minuto_entrada >= 0 AND minuto_entrada <= 120),
  ADD COLUMN IF NOT EXISTS minuto_salida INTEGER CHECK (minuto_salida >= 0 AND minuto_salida <= 120),
  ADD COLUMN IF NOT EXISTS goles_encajados INTEGER CHECK (goles_encajados >= 0),
  ADD COLUMN IF NOT EXISTS doble_amarilla BOOLEAN,
  ADD COLUMN IF NOT EXISTS roja_directa BOOLEAN,
  ADD COLUMN IF NOT EXISTS dorsal_partido INTEGER CHECK (dorsal_partido >= 1 AND dorsal_partido <= 99),
  ADD COLUMN IF NOT EXISTS origen VARCHAR(20) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS rfef_acta_id INTEGER;

-- 3. COMENTARIOS DOCUMENTALES DEL ESQUEMA
COMMENT ON COLUMN public.players.rfef_player_id IS 'Identificador federativo único del futbolista en el sistema oficial RFEF.';
COMMENT ON COLUMN public.match_player_stats.origen IS 'Origen de los datos: manual (pretemporada/amistosos) o rfef (oficial consolidado de Liga).';
COMMENT ON COLUMN public.match_player_stats.convocado IS 'Convocatoria oficial acreditada por acta RFEF. NULL para registros manuales históricos.';
COMMENT ON COLUMN public.match_player_stats.suplente IS 'Suplencia oficial acreditada por acta RFEF. NULL para registros manuales históricos.';
COMMENT ON COLUMN public.match_player_stats.entro_banquillo IS 'Participación efectiva desde banquillo. NULL para registros manuales históricos.';
COMMENT ON COLUMN public.match_player_stats.goles_encajados IS 'Goles encajados durante los minutos en campo (porteros). NULL si no consta en acta oficial.';
COMMENT ON COLUMN public.match_player_stats.rfef_acta_id IS 'Código del acta oficial RFEF (ej. 70692427). NULL para partidos no oficiales.';

-- ============================================================================
-- CONSULTA DE VERIFICACIÓN POST-EJECUCIÓN (READ-ONLY)
-- Ejecutar en Supabase tras aplicar el DDL para confirmar la estructura:
-- ============================================================================
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'match_player_stats'
--   AND column_name IN ('convocado', 'suplente', 'entro_banquillo', 'minuto_entrada', 
--                       'minuto_salida', 'goles_encajados', 'doble_amarilla', 
--                       'roja_directa', 'dorsal_partido', 'origen', 'rfef_acta_id');
-- ============================================================================
