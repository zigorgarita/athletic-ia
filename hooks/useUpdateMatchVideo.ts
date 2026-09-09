import { useState, useCallback } from 'react';
import { MatchVideo } from '@/types';
import { useEditMode } from '@/context/EditModeContext';

type UpdatedMatchVideo = Partial<Omit<MatchVideo, 'id' | 'created_at'>>;

export function useUpdateMatchVideo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const updateVideo = useCallback(async (id: string, video: UpdatedMatchVideo): Promise<MatchVideo | null> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const res = await fetch('/api/videos/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...video, id })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al actualizar el video del partido');
      }

      const data = await res.json();
      return data;
    } catch (err: any) {
      setError(err.message || 'Error al actualizar el video del partido');
      return null;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  return { updateVideo, loading, error };
}
