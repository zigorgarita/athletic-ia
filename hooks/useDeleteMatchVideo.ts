import { useState, useCallback } from 'react';
import { useEditMode } from '@/context/EditModeContext';

export function useDeleteMatchVideo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const deleteVideo = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch(`/api/videos/matches?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al eliminar el video del partido');
      }

      return true;
    } catch (err: any) {
      setError(err.message || 'Error al eliminar el video del partido');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  return { deleteVideo, loading, error };
}
