import { useState, useEffect, useCallback } from 'react';
import { useEditMode } from '@/context/EditModeContext';
import { Observation, TacticalLineupReportSelection } from '@/types';

export function useTacticalReportSelections(
  lineupId: string | null,
  clubId?: string | null,
  seasonId?: string | null,
  rivalName?: string | null
) {
  const [selections, setSelections] = useState<TacticalLineupReportSelection[]>([]);
  const [approvedObservations, setApprovedObservations] = useState<Observation[]>([]);
  const [reportSourcesLabels, setReportSourcesLabels] = useState<string[]>([]);
  const [targetClubId, setTargetClubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission, currentUser } = useEditMode();

  const buildAuthHeaders = useCallback(() => {
    const editorUser = currentUser?.id || '';
    const editorPass = currentUser?.pass || (
      editorUser === 'zigor' ? (process.env.NEXT_PUBLIC_EDIT_PASSWORD_ZIGOR || '')
      : editorUser === 'aitor' ? (process.env.NEXT_PUBLIC_EDIT_PASSWORD_AITOR || '')
      : editorUser === 'nacho' ? (process.env.NEXT_PUBLIC_EDIT_PASSWORD_NACHO || '')
      : ''
    );

    return {
      'Content-Type': 'application/json',
      'x-editor-user': editorUser,
      'x-editor-pass': editorPass,
    };
  }, [currentUser]);

  const loadSelectionsAndObservations = useCallback(async () => {
    if (!lineupId && !clubId && !seasonId && !rivalName) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rivales/report-context', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          lineupId,
          clubId,
          seasonId,
          rivalName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al obtener contexto de informes del servidor.');
      }

      setSelections(data.selections || []);
      setApprovedObservations(data.approvedObservations || []);
      setReportSourcesLabels(data.reportSourcesLabels || []);
      setTargetClubId(data.targetClubId || null);
    } catch (err: unknown) {
      console.error('Error cargando selecciones de informes:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [lineupId, clubId, seasonId, rivalName, buildAuthHeaders]);

  useEffect(() => {
    loadSelectionsAndObservations();
  }, [loadSelectionsAndObservations]);

  const toggleDocumentSelection = async (documentId: string, isSelected: boolean) => {
    if (!lineupId) return;
    try {
      verifyWritePermission();

      const res = await fetch('/api/rivales/manage-observations', {
        method: 'POST',
        headers: buildAuthHeaders(),
        body: JSON.stringify({
          action: 'toggle_report_selection',
          payload: {
            lineupId,
            documentId,
            selected: isSelected,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar selección de informe en servidor.');
      }

      await loadSelectionsAndObservations();
    } catch (err: unknown) {
      console.error('Error guardando selección de informe:', err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Error al guardar selección: ${msg}`);
    }
  };

  return {
    selections,
    approvedObservations,
    reportSourcesLabels,
    targetClubId,
    loading,
    error,
    refresh: loadSelectionsAndObservations,
    toggleDocumentSelection,
  };
}
