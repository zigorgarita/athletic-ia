import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useUploadPlayerPhoto() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadPhoto = useCallback(async (file: File, filename: string): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      // Obtener la extensión del archivo y generar un nombre único
      const fileExt = file.name.split('.').pop();
      const cleanName = filename.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const uniqueFilename = `${cleanName}-${Date.now()}.${fileExt}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('player-photos')
        .upload(uniqueFilename, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Obtener la URL pública
      const { data: publicUrlData } = supabase.storage
        .from('player-photos')
        .getPublicUrl(uniqueFilename);

      return publicUrlData.publicUrl;
    } catch (err: any) {
      setError(err.message || 'Error al subir la foto');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { uploadPhoto, loading, error };
}
