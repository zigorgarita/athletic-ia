'use client';

import React, { useState } from 'react';
import { AIAction, KnowledgeEntry } from '@/types';
import { useTacticalAI } from '@/hooks/useTacticalAI';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { Check, Copy, Save, Calendar, CheckSquare, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AIActionButtonProps {
  action: AIAction;
  onApplied?: (message: string) => void;
}

export function AIActionButton({ action, onApplied }: AIActionButtonProps) {
  const { applyToRoleCards, saveToLibrary } = useTacticalAI();
  const { verifyWritePermission } = useEditMode();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

  // Validación de posiciones para aplicar fichas de rol
  if (action.type === 'apply_to_role_card') {
    const required = ['POR', 'LD', 'DFC', 'LI', 'MCD', 'MCO', 'ED', 'EI', 'DC'];
    const present = new Set(action.data.roleCards?.map((c: { posicion_label: string }) => c.posicion_label) || []);
    const missing = required.filter(r => !present.has(r));
    
    if (missing.length > 0) {
      return (
        <div className="text-xs bg-red-950/40 border border-red-900/50 text-red-400 px-3.5 py-2.5 rounded-xl font-medium w-full flex flex-col gap-1 mt-1">
          <span className="flex items-center gap-1.5 font-bold text-red-300">
            ⚠️ Fichas de rol incompletas
          </span>
          <span className="text-[11px] text-slate-300 leading-normal">
            La IA generó {present.size} de 9 fichas. Faltan: <strong className="text-red-300 font-bold">{missing.join(', ')}</strong>.
          </span>
          <span className="text-[10px] text-red-400/80 italic mt-0.5 font-semibold">
            Regenerar fichas.
          </span>
        </div>
      );
    }
  }

  const handleExecute = async () => {
    setLoading(true);
    try {
      if (action.type === 'copy') {
        await navigator.clipboard.writeText(action.data.text);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
        if (onApplied) onApplied('¡Copiado al portapapeles!');
        return;
      }

      // Las demás acciones requieren permisos de escritura
      verifyWritePermission();

      if (action.type === 'apply_to_role_card') {
        const res = await applyToRoleCards(action.data.roleCards);
        if (res.success) {
          setSuccess(true);
          if (onApplied) onApplied('¡Fichas de rol actualizadas correctamente!');
        } else {
          throw res.error || new Error('No se pudieron aplicar las fichas de rol.');
        }
      }

      else if (action.type === 'save_to_library') {
        const ok = await saveToLibrary(action.data as Omit<KnowledgeEntry, 'id' | 'created_at' | 'updated_at' | 'activo' | 'creado_por' | 'temporada'>);
        if (ok) {
          setSuccess(true);
          if (onApplied) onApplied('¡Guardado en la Biblioteca de Conocimiento!');
        } else {
          alert('Error al guardar en la biblioteca.');
        }
      }

      else if (action.type === 'create_session') {
        // 1. Crear sesión de planificación
        const sessionPayload = {
          fecha: new Date().toISOString().split('T')[0],
          tipo_sesion: 'Entrenamiento',
          objetivo_principal: action.data.objetivo_principal,
          carga: action.data.carga || 'Media',
          num_jugadores_previstos: 18,
          num_porteros_previstos: 2
        };

        const { data: savedSession, error: sErr } = await supabase.rpc('exec_secure_upsert', {
          target_table: 'planning_sessions',
          payload: sessionPayload,
          conflict_columns: ['id'],
          staff_passkey: passkey
        });

        if (sErr) throw sErr;
        const sessionId = (savedSession as { id: string } | null)?.id;

        if (sessionId && action.data.tareas && action.data.tareas.length > 0) {
          // 2. Crear tareas asociadas
          const taskPromises = (action.data.tareas as {
            nombre_tarea: string;
            tipo_tarea: string;
            minutos?: number;
            descripcion: string;
            orden?: number;
          }[]).map((task) => {
            const taskPayload = {
              planning_session_id: sessionId,
              nombre_tarea: task.nombre_tarea,
              tipo_tarea: task.tipo_tarea,
              minutos: task.minutos || 15,
              descripcion: task.descripcion,
              orden: task.orden || 0
            };
            return supabase.rpc('exec_secure_upsert', {
              target_table: 'planning_tasks',
              payload: taskPayload,
              conflict_columns: ['id'],
              staff_passkey: passkey
            });
          });

          await Promise.all(taskPromises);
        }

        setSuccess(true);
        if (onApplied) onApplied('¡Sesión creada en Planificación!');
      }

      else if (action.type === 'apply_to_matchup') {
        // Enviar evento personalizado para que TacticaClient lo aplique a sus states
        const event = new CustomEvent('apply-ai-matchup-analysis', {
          detail: action.data
        });
        window.dispatchEvent(event);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
        if (onApplied) onApplied('¡Análisis aplicado a la pizarra táctica!');
      }

    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(`Error al ejecutar acción: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    if (loading) return <RefreshCw className="h-3.5 w-3.5 animate-spin" />;
    if (success) return <Check className="h-3.5 w-3.5 text-emerald-400" />;
    
    switch (action.type) {
      case 'copy': return <Copy className="h-3.5 w-3.5" />;
      case 'save_to_library': return <Save className="h-3.5 w-3.5" />;
      case 'create_session': return <Calendar className="h-3.5 w-3.5" />;
      case 'apply_to_role_card': return <CheckSquare className="h-3.5 w-3.5" />;
      default: return <Check className="h-3.5 w-3.5" />;
    }
  };

  return (
    <Button
      type="button"
      onClick={handleExecute}
      disabled={loading}
      variant={success ? 'ghost' : 'secondary'}
      className={`px-3 py-1.5 h-8 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
        success 
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
          : 'bg-slate-850 hover:bg-slate-800 border-slate-750 text-slate-350 hover:text-slate-100'
      }`}
    >
      {getIcon()}
      <span>{success ? 'Aplicado' : action.label}</span>
    </Button>
  );
}
