import { useState, useEffect, useCallback } from 'react';
import { useEditMode } from '@/context/EditModeContext';
import { Observation, TacticalLineupReportSelection } from '@/types';
import { getStaffPasskey, setStaffPasskey, clearStaffPasskey } from '@/lib/passkey';

export function useTacticalReportSelections(
  lineupId: string | null,
  clubId?: string | null,
  seasonId?: string | null
) {
  const [selections, setSelections] = useState<TacticalLineupReportSelection[]>([]);
  const [approvedObservations, setApprovedObservations] = useState<Observation[]>([]);
  const [reportSourcesLabels, setReportSourcesLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const loadSelectionsAndObservations = useCallback(async () => {
    if (!lineupId && (!clubId || !seasonId)) return;
    setLoading(true);
    setError(null);
    try {
      const passkey = getStaffPasskey();
      const res = await fetch('/api/rivales/report-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-coach-staff-passkey': passkey,
          'x-staff-passkey': passkey,
        },
        body: JSON.stringify({
          lineupId,
          clubId,
          seasonId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al obtener contexto de informes del servidor.');
      }

      setSelections(data.selections || []);
      setApprovedObservations(data.approvedObservations || []);
      setReportSourcesLabels(data.reportSourcesLabels || []);
    } catch (err: unknown) {
      console.error('Error cargando selecciones de informes:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [lineupId, clubId, seasonId]);

  useEffect(() => {
    loadSelectionsAndObservations();
  }, [loadSelectionsAndObservations]);

  const toggleDocumentSelection = async (documentId: string, isSelected: boolean) => {
    if (!lineupId) return;
    try {
      verifyWritePermission();

      let passkey = getStaffPasskey();
      if (!passkey && typeof window !== 'undefined') {
        const inputKey = window.prompt('Introduce la clave del cuerpo técnico para seleccionar este informe:');
        if (!inputKey) return;
        passkey = inputKey.trim();
        setStaffPasskey(passkey);
      }

      const res = await fetch('/api/rivales/manage-observations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-coach-staff-passkey': passkey,
          'x-staff-passkey': passkey,
        },
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
      if (res.status === 401 || res.status === 403) {
        clearStaffPasskey();
        const inputKey = window.prompt('Clave del cuerpo técnico incorrecta. Reintrodúcela:');
        if (inputKey) {
          const retryKey = inputKey.trim();
          setStaffPasskey(retryKey);
          const retryRes = await fetch('/api/rivales/manage-observations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-coach-staff-passkey': retryKey,
              'x-staff-passkey': retryKey,
            },
            body: JSON.stringify({
              action: 'toggle_report_selection',
              payload: {
                lineupId,
                documentId,
                selected: isSelected,
              },
            }),
          });
          const retryData = await retryRes.json();
          if (!retryRes.ok || !retryData.success) {
            throw new Error(retryData.error || 'Error al guardar selección de informe.');
          }
          await loadSelectionsAndObservations();
          return;
        }
        throw new Error('Acceso no autorizado.');
      }

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
    loading,
    error,
    refresh: loadSelectionsAndObservations,
    toggleDocumentSelection,
  };
}
