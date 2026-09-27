-- ============================================================
-- MIGRACIÓN FASE 2: planning_task_library · Biblioteca desde PDFs
-- ESTADO: PENDIENTE DE EJECUCIÓN MANUAL — NO EJECUTAR AUTOMÁTICAMENTE
-- Preparado por: Athletic IA · Fecha: 2026-09-25
--
-- INSTRUCCIONES DE EJECUCIÓN:
-- 1. Revisar este archivo completo antes de ejecutar
-- 2. Ejecutar en Supabase SQL Editor en orden de bloques
-- 3. Verificar resultado de cada bloque antes de continuar
-- 4. Este script es idempotente (IF NOT EXISTS / IF NOT EXISTS)
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- BLOQUE 1: 13 columnas nuevas en planning_task_library (incluye pagina_pdf)
-- ADD COLUMN IF NOT EXISTS → operación 100% no destructiva
-- Filas existentes: todos los valores nuevos quedan a NULL
-- aprobada DEFAULT NULL → tareas actuales siguen siendo visibles
-- CERO UPDATE · CERO modificación de datos existentes
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.planning_task_library
  -- Contenido táctico enriquecido
  ADD COLUMN IF NOT EXISTS desarrollo         TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS organizacion       TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS consignas          TEXT[]        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transicion_rec     TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transicion_perd    TEXT          DEFAULT NULL,
  -- Trazabilidad de origen (solo staff/editor)
  ADD COLUMN IF NOT EXISTS fuente_pdf_url     TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sesion_origen_id   UUID          DEFAULT NULL
    REFERENCES public.planning_sessions(id)
    ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS numero_tarea_pdf   SMALLINT      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pagina_pdf         SMALLINT      DEFAULT NULL,
  -- Ciclo de vida y calidad
  -- NULL = legado/manual visible · FALSE = borrador PDF oculto · TRUE = aprobada visible
  ADD COLUMN IF NOT EXISTS aprobada           BOOLEAN       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS revisada_por       TEXT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS revisada_at        TIMESTAMPTZ   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS confianza_global   TEXT          DEFAULT NULL
    CHECK (confianza_global IN ('alta', 'media', 'baja'));

-- Verificación: listar columnas actuales de la tabla
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'planning_task_library'
-- ORDER BY ordinal_position;


-- ────────────────────────────────────────────────────────────
-- BLOQUE 2: Nueva tabla de conceptos aprobados
-- Un concepto solo existe aquí si un humano lo aprobó explícitamente
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.planning_task_library_concepts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id   UUID        NOT NULL
                 REFERENCES public.planning_task_library(id)
                 ON DELETE RESTRICT,
  categoria    TEXT        NOT NULL
                 CHECK (categoria IN (
                   'ATAQUE','DEFENSA','TRANSICIONES','ABP','CONDICIONAL','MENTAL'
                 )),
  concepto     TEXT        NOT NULL,
  aprobado_por TEXT        NOT NULL,     -- nombre del staff que aprobó (auditoría)
  aprobado_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT uq_library_concepto UNIQUE (library_id, categoria, concepto)
  -- Garantiza: no se puede insertar el mismo concepto dos veces para la misma tarea
);


-- ────────────────────────────────────────────────────────────
-- BLOQUE 3: RLS para la tabla nueva (coherente con otras tablas planning_*)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.planning_task_library_concepts
  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Lectura: cualquier usuario autenticado puede leer conceptos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'planning_task_library_concepts'
      AND policyname = 'ptlc_select'
  ) THEN
    CREATE POLICY "ptlc_select"
      ON public.planning_task_library_concepts
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  -- Escritura: solo service_role (usado por los API routes del servidor)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'planning_task_library_concepts'
      AND policyname = 'ptlc_insert'
  ) THEN
    CREATE POLICY "ptlc_insert"
      ON public.planning_task_library_concepts
      FOR INSERT TO service_role
      WITH CHECK (true);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- BLOQUE 4: Índices de rendimiento
-- ────────────────────────────────────────────────────────────

-- Índice parcial para la query de biblioteca activa:
-- .or('aprobada.is.null,aprobada.eq.true')
CREATE INDEX IF NOT EXISTS idx_ptl_aprobada
  ON public.planning_task_library (aprobada);

-- Índice para búsqueda por sesión de origen
CREATE INDEX IF NOT EXISTS idx_ptl_sesion_origen
  ON public.planning_task_library (sesion_origen_id)
  WHERE sesion_origen_id IS NOT NULL;

-- Índice para búsqueda de conceptos por tarea
CREATE INDEX IF NOT EXISTS idx_ptlc_library_id
  ON public.planning_task_library_concepts (library_id);

-- Índice para búsqueda de conceptos por categoría y valor
CREATE INDEX IF NOT EXISTS idx_ptlc_cat_concepto
  ON public.planning_task_library_concepts (categoria, concepto);


-- ============================================================
-- VERIFICACIÓN FINAL (ejecutar separadamente para comprobar)
-- ============================================================
-- SELECT COUNT(*) FROM planning_task_library WHERE aprobada IS NULL;     -- debe = total de filas actuales
-- SELECT COUNT(*) FROM planning_task_library WHERE aprobada = FALSE;      -- debe = 0 (ningún borrador aún)
-- SELECT COUNT(*) FROM planning_task_library WHERE aprobada = TRUE;       -- debe = 0 (ninguna aprobada aún)
-- SELECT COUNT(*) FROM planning_task_library_concepts;                    -- debe = 0 (tabla nueva vacía)
-- ============================================================
