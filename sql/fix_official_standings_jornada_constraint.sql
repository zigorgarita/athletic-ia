-- ============================================================================
-- PASO 7B: AJUSTE MÍNIMO EXCLUSIVO DE LA CONSTRAINT DE JORNADA (1..30)
-- ============================================================================
-- Operación:
-- - No recrea la tabla official_standings.
-- - No toca, borra ni reinserta las 16 filas ya validadas y persistidas de J1.
-- - No altera ninguna política RLS, trigger ni otra constraint.
-- - Ajusta única y exclusivamente el rango de jornada a [1..30].
-- ============================================================================

BEGIN;

-- 1. Eliminar constraint de jornada previa (nombre automático o nombrado)
ALTER TABLE public.official_standings 
    DROP CONSTRAINT IF EXISTS official_standings_jornada_check,
    DROP CONSTRAINT IF EXISTS chk_official_standings_jornada;

-- 2. Añadir la constraint formal canónica con límite estricto en 30
ALTER TABLE public.official_standings 
    ADD CONSTRAINT chk_official_standings_jornada 
    CHECK (jornada >= 1 AND jornada <= 30);

COMMIT;
