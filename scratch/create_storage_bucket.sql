-- 1. Crear el bucket 'player-photos' si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Lectura pública de fotos de jugadores" ON storage.objects;
DROP POLICY IF EXISTS "Subida de fotos de jugadores" ON storage.objects;
DROP POLICY IF EXISTS "Edición y borrado de fotos de jugadores" ON storage.objects;

-- 3. Crear políticas RLS para 'player-photos'
CREATE POLICY "Lectura pública de fotos de jugadores" ON storage.objects FOR SELECT USING (bucket_id = 'player-photos');
CREATE POLICY "Subida de fotos de jugadores" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'player-photos');
CREATE POLICY "Edición y borrado de fotos de jugadores" ON storage.objects FOR ALL USING (bucket_id = 'player-photos');
