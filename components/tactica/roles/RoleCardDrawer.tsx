'use client';

import React, { useState, useEffect } from 'react';
import { TacticalRoleCard, PositionNode, Player } from '@/types';
import { X, Save, Edit3, Shield, Zap, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';

interface RoleCardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  node: PositionNode | null;
  assignedPlayer: Player | null;
  roleCard: TacticalRoleCard | null;
  isEditMode: boolean;
  onSave: (updatedCard: Partial<TacticalRoleCard>) => Promise<void>;
  isSaving: boolean;
}

export function RoleCardDrawer({
  isOpen,
  onClose,
  node,
  assignedPlayer,
  roleCard,
  isEditMode,
  onSave,
  isSaving,
}: RoleCardDrawerProps) {
  const [faseOfensiva, setFaseOfensiva] = useState('');
  const [faseDefensiva, setFaseDefensiva] = useState('');
  const [transiciones, setTransiciones] = useState('');
  const [instruccionesEspeciales, setInstruccionesEspeciales] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Sync state with selected node role card details
  useEffect(() => {
    if (node) {
      setFaseOfensiva(roleCard?.fase_ofensiva || '');
      setFaseDefensiva(roleCard?.fase_defensiva || '');
      setTransiciones(roleCard?.transiciones || '');
      setInstruccionesEspeciales(roleCard?.instrucciones_especificas || '');
      setIsEditing(false);
    }
  }, [node, roleCard]);

  if (!isOpen || !node) return null;

  // Determine line based on position abbreviation
  const getLineLabel = (pos: string): 'Portería' | 'Defensa' | 'Mediocampo' | 'Delantera' => {
    if (pos === 'POR') return 'Portería';
    if (['LD', 'LI', 'DFC'].includes(pos)) return 'Defensa';
    if (['MCD', 'MC', 'MCO'].includes(pos)) return 'Mediocampo';
    return 'Delantera';
  };

  const line = getLineLabel(node.label);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      linea: line,
      posicion_label: node.label,
      fase_ofensiva: faseOfensiva.trim() || null,
      fase_defensiva: faseDefensiva.trim() || null,
      transiciones: transiciones.trim() || null,
      instrucciones_especificas: instruccionesEspeciales.trim() || null,
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10">
      <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
        {/* Header section */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/20">
          <div className="flex items-center gap-3">
            {assignedPlayer ? (
              <Avatar src={assignedPlayer.foto_url} name={assignedPlayer.nombre} size="md" className="border border-slate-800" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                {node.label}
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-200 block">
                {assignedPlayer ? assignedPlayer.nombre : `Posición: ${node.label}`}
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Línea: {line} ({node.label}) {assignedPlayer ? `#${assignedPlayer.dorsal}` : ''}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-350 transition-colors p-1 rounded-lg hover:bg-slate-800/60">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isEditMode && !isEditing && (
            <Button
              onClick={() => setIsEditing(true)}
              variant="secondary"
              className="w-full flex items-center justify-center gap-1.5 text-xs bg-slate-850/60 hover:bg-slate-800 border-slate-800 text-slate-300 py-2.5 rounded-2xl"
            >
              <Edit3 className="h-3.5 w-3.5 text-blue-400" /> Editar Ficha de Rol
            </Button>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Fase Ofensiva */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Zap className="h-3.5 w-3.5 text-yellow-500" /> Fase Ofensiva (Ataque)
              </label>
              {isEditing ? (
                <textarea
                  value={faseOfensiva}
                  onChange={(e) => setFaseOfensiva(e.target.value)}
                  placeholder="Instrucciones al tener la posesión..."
                  className="w-full min-h-[100px] bg-slate-950/80 border border-slate-850 focus:border-[#CC0E21]/50 rounded-2xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
                />
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850/50 text-xs text-slate-300 leading-relaxed min-h-[60px] whitespace-pre-line italic">
                  {faseOfensiva || 'Sin instrucciones ofensivas definidas.'}
                </div>
              )}
            </div>

            {/* 2. Fase Defensiva */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Shield className="h-3.5 w-3.5 text-blue-400" /> Fase Defensiva
              </label>
              {isEditing ? (
                <textarea
                  value={faseDefensiva}
                  onChange={(e) => setFaseDefensiva(e.target.value)}
                  placeholder="Instrucciones sin la posesión..."
                  className="w-full min-h-[100px] bg-slate-950/80 border border-slate-850 focus:border-blue-500/50 rounded-2xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
                />
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850/50 text-xs text-slate-300 leading-relaxed min-h-[60px] whitespace-pre-line italic">
                  {faseDefensiva || 'Sin instrucciones defensivas definidas.'}
                </div>
              )}
            </div>

            {/* 3. Transiciones */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-orange-400" /> Transiciones (A/D y D/A)
              </label>
              {isEditing ? (
                <textarea
                  value={transiciones}
                  onChange={(e) => setTransiciones(e.target.value)}
                  placeholder="Instrucciones en cambios rápidos de posesión..."
                  className="w-full min-h-[100px] bg-slate-950/80 border border-slate-850 focus:border-orange-500/50 rounded-2xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
                />
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850/50 text-xs text-slate-300 leading-relaxed min-h-[60px] whitespace-pre-line italic">
                  {transiciones || 'Sin instrucciones de transición definidas.'}
                </div>
              )}
            </div>

            {/* 4. Instrucciones específicas */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                <BookOpen className="h-3.5 w-3.5 text-purple-400" /> Detalles del Partido
              </label>
              {isEditing ? (
                <textarea
                  value={instruccionesEspeciales}
                  onChange={(e) => setInstruccionesEspeciales(e.target.value)}
                  placeholder="Detalle o marcas específicas frente al rival de turno..."
                  className="w-full min-h-[80px] bg-slate-950/80 border border-slate-850 focus:border-purple-500/50 rounded-2xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition-colors"
                />
              ) : (
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-850/50 text-xs text-slate-300 leading-relaxed min-h-[60px] whitespace-pre-line italic">
                  {instruccionesEspeciales || 'Sin marcas específicas definidas.'}
                </div>
              )}
            </div>

            {/* Edit actions */}
            {isEditing && (
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 text-xs py-2.5 rounded-xl bg-slate-950/50 border border-slate-800"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSaving}
                  className="flex-1 text-xs py-2.5 rounded-xl"
                >
                  <Save className="h-3.5 w-3.5 mr-1" /> Guardar
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
