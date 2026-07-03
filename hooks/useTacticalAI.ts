import { useState, useCallback } from 'react';
import { AIMessage, AIAction, TacticalAIContext, TacticalRoleCard, KnowledgeEntry } from '@/types';
import { useEditMode } from '@/context/EditModeContext';
import { supabase } from '@/lib/supabase';

export function useTacticalAI() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { verifyWritePermission } = useEditMode();
  const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const callAIAPI = useCallback(async (
    message: string,
    actionType: string | undefined,
    context: TacticalAIContext
  ): Promise<AIMessage | null> => {
    setIsThinking(true);
    setError(null);

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      actionType
    };

    // Agregar mensaje del usuario al historial local
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/tactical-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-passkey': passkey
        },
        body: JSON.stringify({
          message,
          actionType,
          context,
          conversationHistory: [...messages, userMessage]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en la llamada al asistente IA.');
      }

      const data = await response.json();
      
      const assistantMessage: AIMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString(),
        suggestedActions: data.suggestedActions || []
      };

      setMessages(prev => [...prev, assistantMessage]);
      return assistantMessage;
    } catch (err: any) {
      console.error('Error al llamar al Asistente IA:', err);
      setError(err.message || 'Ocurrió un error al comunicarse con la IA.');
      return null;
    } finally {
      setIsThinking(false);
    }
  }, [messages, passkey]);

  // Enviar un mensaje libre de chat
  const sendMessage = useCallback(async (message: string, context: TacticalAIContext) => {
    await callAIAPI(message, undefined, context);
  }, [callAIAPI]);

  // Acciones especializadas de pizarra
  const analyzeRival = useCallback(async (context: TacticalAIContext) => {
    const triggerMsg = `Analiza detalladamente al rival utilizando el sistema rival ${context.systemRival} frente a nuestro ${context.systemOwn}.`;
    await callAIAPI(triggerMsg, 'analyze_rival', context);
  }, [callAIAPI]);

  const analyzeOwnSystem = useCallback(async (context: TacticalAIContext) => {
    const triggerMsg = `Realiza un análisis crítico de nuestro sistema propio ${context.systemOwn} con la alineación y evaluaciones actuales.`;
    await callAIAPI(triggerMsg, 'analyze_own_system', context);
  }, [callAIAPI]);

  const compareSystems = useCallback(async (context: TacticalAIContext) => {
    const triggerMsg = `Compara teóricamente el sistema propio ${context.systemOwn} contra el sistema rival ${context.systemRival}.`;
    await callAIAPI(triggerMsg, 'compare_systems', context);
  }, [callAIAPI]);

  const prepareMatch = useCallback(async (context: TacticalAIContext) => {
    const triggerMsg = `Prepara el plan táctico de partido completo contra ${context.matchRival || 'el rival seleccionado'}.`;
    await callAIAPI(triggerMsg, 'prepare_match', context);
  }, [callAIAPI]);

  const createBriefing = useCallback(async (context: TacticalAIContext) => {
    const triggerMsg = `Diseña el briefing táctico de vestuario por líneas para el matchup ${context.systemOwn} vs ${context.systemRival}.`;
    await callAIAPI(triggerMsg, 'create_briefing', context);
  }, [callAIAPI]);

  const generateLineTasks = useCallback(async (context: TacticalAIContext) => {
    const triggerMsg = `Genera fichas de tareas específicas e instrucciones detalladas por líneas de juego.`;
    await callAIAPI(triggerMsg, 'generate_line_tasks', context);
  }, [callAIAPI]);

  const recommendExercises = useCallback(async (context: TacticalAIContext) => {
    const triggerMsg = `Recomienda o diseña ejercicios tácticos específicos para entrenar el matchup actual.`;
    await callAIAPI(triggerMsg, 'recommend_exercises', context);
  }, [callAIAPI]);

  const recommendSession = useCallback(async (context: TacticalAIContext) => {
    const triggerMsg = `Diseña una propuesta de sesión de entrenamiento completa para trabajar este matchup.`;
    await callAIAPI(triggerMsg, 'recommend_session', context);
  }, [callAIAPI]);

  const searchKnowledge = useCallback(async (query: string, context: TacticalAIContext) => {
    const triggerMsg = `Consulta en la biblioteca de conocimiento sobre: "${query}".`;
    await callAIAPI(triggerMsg, 'search_knowledge', context);
  }, [callAIAPI]);

  const explainConcept = useCallback(async (concept: string, context: TacticalAIContext) => {
    const triggerMsg = `Explica detalladamente el concepto táctico: "${concept}".`;
    await callAIAPI(triggerMsg, 'explain_concept', context);
  }, [callAIAPI]);

  // Métodos para aplicar las acciones de la IA a la BD / Estado

  // Guardar sugerencia de la IA en la biblioteca de conocimiento
  const saveToLibrary = useCallback(async (entry: Omit<KnowledgeEntry, 'id' | 'created_at' | 'updated_at' | 'activo' | 'creado_por' | 'temporada'>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      const payload = {
        ...entry,
        activo: true,
        creado_por: 'Asistente IA',
        temporada: '2026-27',
        updated_at: new Date().toISOString()
      };

      const { error: saveErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'knowledge_entries',
        payload,
        conflict_columns: ['id'],
        staff_passkey: passkey
      });

      if (saveErr) throw saveErr;
      return true;
    } catch (err: any) {
      console.error('Error al guardar respuesta IA en la biblioteca:', err);
      setError(err.message || 'Error al guardar respuesta en biblioteca.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission, passkey]);

  // Aplicar sugerencias de fichas de rol a la base de datos
  const applyToRoleCards = useCallback(async (cards: Partial<TacticalRoleCard>[]): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      verifyWritePermission();
      
      const promises = cards.map(card => {
        const conflictCols = card.match_plan_id 
          ? ['match_plan_id', 'posicion_label'] 
          : ['matchup_id', 'posicion_label'];
          
        return supabase.rpc('exec_secure_upsert', {
          target_table: 'tactical_role_cards',
          payload: card,
          conflict_columns: conflictCols,
          staff_passkey: passkey
        });
      });

      const results = await Promise.all(promises);
      const errors = results.filter(res => res.error);
      if (errors.length > 0) throw errors[0].error;

      return true;
    } catch (err: any) {
      console.error('Error al aplicar fichas de rol sugeridas:', err);
      setError(err.message || 'Error al guardar fichas de rol sugeridas.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [verifyWritePermission, passkey]);

  // Helper local para setear carga
  const [loading, setLoading] = useState(false);

  return {
    messages,
    isThinking,
    error,
    loading,
    clearConversation,
    sendMessage,
    analyzeRival,
    analyzeOwnSystem,
    compareSystems,
    prepareMatch,
    createBriefing,
    generateLineTasks,
    recommendExercises,
    recommendSession,
    searchKnowledge,
    explainConcept,
    saveToLibrary,
    applyToRoleCards
  };
}
