-- ============================================================
-- MIGRACIÓN ADITIVA: Texto literal de PDF para Duración y Jugadores
-- ESTADO: PENDIENTE DE EJECUCIÓN MANUAL — NO EJECUTAR AUTOMÁTICAMENTE
-- Preparado por: Athletic IA · Fecha: 2026-09-26
--
-- Conserva el texto literal original extraído del PDF
-- sin forzar conversiones numéricas erróneas (ej: "4 series de 4-5 min")
-- CERO UPDATE · CERO DELETE · 100% no destructivo
-- ============================================================

ALTER TABLE public.planning_task_library
  ADD COLUMN IF NOT EXISTS duracion_texto_pdf  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS jugadores_texto_pdf TEXT DEFAULT NULL;
