import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TacticalRoleCard } from '@/types';
import { useEditMode } from '@/context/EditModeContext';

export function useTacticalRoleCards() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();

  const fetchRoleCards = useCallback(async (matchupId: string | null, matchPlanId: string | null): Promise<TacticalRoleCard[]> => {
    setLoading(true);
    setError(null);
    try {
      const queries = [];
      if (matchupId) {
        queries.push(
          supabase.from('tactical_role_cards').select('*').eq('matchup_id', matchupId)
        );
      }
      if (matchPlanId) {
        queries.push(
          supabase.from('tactical_role_cards').select('*').eq('match_plan_id', matchPlanId)
        );
      }

      if (queries.length === 0) return [];

      const results = await Promise.all(queries);
      
      // Handle potential query errors
      results.forEach(res => {
        if (res.error) throw res.error;
      });

      const baseCards: TacticalRoleCard[] = matchupId && results[0] ? results[0].data || [] : [];
      const planCards: TacticalRoleCard[] = matchPlanId && results[matchupId ? 1 : 0] ? results[matchupId ? 1 : 0].data || [] : [];

      // Merge cards: prioritize match_plan overridden cards over matchup base cards
      const mergedMap = new Map<string, TacticalRoleCard>();
      
      baseCards.forEach(c => mergedMap.set(c.posicion_label, c));
      planCards.forEach(c => mergedMap.set(c.posicion_label, c));

      return Array.from(mergedMap.values());
    } catch (err: any) {
      console.error('Error fetching tactical role cards:', err);
      setError(err.message || 'Error al obtener fichas de rol.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveRoleCard = useCallback(async (card: Omit<TacticalRoleCard, 'id' | 'created_at'> & { id?: string }): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

      // Determine correct conflict constraint
      const conflictCols = card.match_plan_id 
        ? ['match_plan_id', 'posicion_label'] 
        : ['matchup_id', 'posicion_label'];

      const { error: upsertErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'tactical_role_cards',
        payload: card,
        conflict_columns: conflictCols,
        staff_passkey: passkey
      });

      if (upsertErr) throw upsertErr;
      return true;
    } catch (err: any) {
      console.error('Error saving role card:', err);
      setError(err.message || 'Error al guardar la ficha de rol.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission]);

  return {
    loading,
    error,
    fetchRoleCards,
    saveRoleCard
  };
}
