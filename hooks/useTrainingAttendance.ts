import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TrainingAttendance, TrainingEvaluation } from '@/types';
import { useEditMode } from '@/context/EditModeContext';
import { getStaffPasskey } from '@/lib/passkey';

export function useTrainingAttendance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const fetchSessionAttendance = useCallback(async (sessionId: string) => {
    if (!sessionId) return { attendance: [], evaluations: [] };
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch attendance
      const { data: attendanceData, error: attError } = await supabase
        .from('training_attendance')
        .select('*')
        .eq('session_id', sessionId);

      if (attError) throw attError;

      // 2. Fetch evaluations
      const { data: evalData, error: evalError } = await supabase
        .from('training_evaluations')
        .select('*')
        .eq('session_id', sessionId);

      if (evalError) throw evalError;

      return {
        attendance: (attendanceData || []) as TrainingAttendance[],
        evaluations: (evalData || []) as TrainingEvaluation[]
      };
    } catch (err: any) {
      console.error('Error fetching training attendance/evaluations:', err);
      setError(err.message || 'Error al obtener la asistencia del entrenamiento');
      return { attendance: [], evaluations: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAttendanceAndEvaluations = useCallback(async (
    attendance: TrainingAttendance[],
    evaluations: TrainingEvaluation[]
  ) => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const staffPasskey = getStaffPasskey();
      if (staffPasskey) {
        headers['x-staff-passkey'] = staffPasskey;
      }

      const response = await fetch('/api/training/attendance', {
        method: 'POST',
        headers,
        body: JSON.stringify({ attendance, evaluations }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${response.status} al guardar la asistencia.`);
      }

      return true;
    } catch (err: any) {
      console.error('Error saving training attendance/evaluations:', err);
      setError(err.message || 'Error al guardar la asistencia y valoraciones');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  return {
    fetchSessionAttendance,
    saveAttendanceAndEvaluations,
    loading,
    error
  };
}
