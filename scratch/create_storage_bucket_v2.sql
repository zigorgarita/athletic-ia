-- ========================================================
-- SUBBLOQUE 4D — CREACIÓN DEL BUCKET 'indautxu-assets'
-- Script Idempotente para Supabase Storage
-- ========================================================

-- 1. Crear el bucket 'indautxu-assets' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('indautxu-assets', 'indautxu-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Eliminar políticas existentes para evitar duplicados
DROP POLICY IF EXISTS "Public Read Assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert Assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Manage Assets" ON storage.objects;

-- 3. Crear políticas RLS para 'indautxu-assets'
-- Lectura pública para cualquier objeto en el bucket
CREATE POLICY "Public Read Assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'indautxu-assets');

-- Permitir inserción (upload) pública/anónima
CREATE POLICY "Public Insert Assets" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'indautxu-assets');

-- Permitir gestión (update/delete)
CREATE POLICY "Public Manage Assets" 
ON storage.objects FOR ALL 
USING (bucket_id = 'indautxu-assets') 
WITH CHECK (bucket_id = 'indautxu-assets');
