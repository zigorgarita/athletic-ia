import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TrainingAttendance, TrainingEvaluation } from '@/types';

export function useTrainingAttendance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      // 1. Upsert attendance rows if any
      if (attendance.length > 0) {
        const { error: attError } = await supabase
          .from('training_attendance')
          .upsert(attendance, { onConflict: 'session_id,player_id' });
        
        if (attError) throw attError;
      }

      // 2. Upsert evaluation rows if any
      if (evaluations.length > 0) {
        const { error: evalError } = await supabase
          .from('training_evaluations')
          .upsert(evaluations, { onConflict: 'session_id,player_id' });

        if (evalError) throw evalError;
      }

      return true;
    } catch (err: any) {
      console.error('Error saving training attendance/evaluations:', err);
      setError(err.message || 'Error al guardar la asistencia y valoraciones');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    fetchSessionAttendance,
    saveAttendanceAndEvaluations,
    loading,
    error
  };
}
