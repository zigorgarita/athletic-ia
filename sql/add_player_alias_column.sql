-- Migración: Añadir columna alias a la tabla players (Fase 1: Alias Infraestructura)
-- Proyecto: Indautxu DH 26/27 - Athletic IA

ALTER TABLE public.players ADD COLUMN IF NOT EXISTS alias TEXT NULL;
