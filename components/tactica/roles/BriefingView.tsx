'use client';

import React, { useState, useEffect } from 'react';
import { TacticalRoleCard, PositionNode, Player } from '@/types';
import { useTacticalBriefing, BriefingPlayerPayload, BriefingRoleCardPayload } from '@/hooks/useTacticalBriefing';
import { 
  LayoutList, Trophy, ShieldAlert, Sparkles, 
  Loader2, Award, Zap, HelpCircle, UserCheck
} from 'lucide-react';

interface BriefingViewProps {
  nodesPropio: PositionNode[];
  players: Player[];
  roleCards: TacticalRoleCard[];
  ventajas: string;
  desventajas: string;
  zonaConflicto: string;
  dueloClave: string;
  tareasLineas: string;
  selectedMatchId: string;
  rivalName: string;
  sistemaPropio: string;
  sistemaRival: string;
  isEditMode: boolean;
  onNodeClick: (node: PositionNode) => void;
  onTareasLineasChange: (val: string) => void;
  onApplyRoleCards: (cards: Partial<TacticalRoleCard>[]) => Promise<boolean>;
}

interface LineBriefing {
  porteria: string[];
  defensa: string[];
  mediocampo: string[];
  delantera: string[];
}

function parseLineBriefing(text: string): LineBriefing {
  const result: LineBriefing = {
    porteria: ['', '', ''],
    defensa: ['', '', ''],
    mediocampo: ['', '', ''],
    delantera: ['', '', '']
  };

  if (!text) return result;

  const sections = text.split('\n\n');
  sections.forEach(sec => {
    const lines = sec.split('\n');
    const header = lines[0]?.replace(':', '').trim().toLowerCase();
    
    let key: keyof LineBriefing | null = null;
    if (header === 'portería' || header === 'porteria') key = 'porteria';
    else if (header === 'defensa') key = 'defensa';
    else if (header === 'mediocampo' || header === 'medios') key = 'mediocampo';
    else if (header === 'delantera' || header === 'ataque') key = 'delantera';

    if (key) {
      const bulletLines = lines.slice(1)
        .map(l => l.replace(/^[-*•]\s*/, '').trim())
        .filter(l => !!l);
      
      for (let i = 0; i < 3; i++) {
        result[key][i] = bulletLines[i] || '';
      }
    }
  });

  return result;
}

function stringifyLineBriefing(data: LineBriefing): string {
  const formatSection = (title: string, items: string[]) => {
    const bullets = items.map(it => it.trim()).filter(it => !!it);
    if (bullets.length === 0) return '';
    return `${title}:\n${bullets.map(b => `- ${b}`).join('\n')}`;
  };

  const sections = [
    formatSection('Portería', data.porteria),
    formatSection('Defensa', data.defensa),
    formatSection('Mediocampo', data.mediocampo),
    formatSection('Delantera', data.delantera)
  ].filter(s => !!s);

  return sections.join('\n\n');
}

export function BriefingView({
  nodesPropio,
  players,
  roleCards,
  ventajas,
  desventajas,
  zonaConflicto,
  dueloClave,
  tareasLineas,
  selectedMatchId,
  rivalName,
  sistemaPropio,
  sistemaRival,
  isEditMode,
  onNodeClick,
  onTareasLineasChange,
  onApplyRoleCards
}: BriefingViewProps) {
  const [activeTab, setActiveTab] = useState<'colectivo' | 'lineas' | 'individuales'>('colectivo');
  
  // Tactical Briefing hook
  const { 
    synthesizeLines, 
    synthesizePlayers, 
    isGeneratingLines, 
    isGeneratingPlayers, 
    error: briefingError 
  } = useTacticalBriefing();

  // Parsing line briefing state
  const [lineBriefing, setLineBriefing] = useState<LineBriefing>(parseLineBriefing(tareasLineas));
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state with incoming prop
  useEffect(() => {
    setLineBriefing(parseLineBriefing(tareasLineas));
  }, [tareasLineas]);

  const handleLineChange = (line: keyof LineBriefing, index: number, value: string) => {
    const updated = { ...lineBriefing };
    updated[line][index] = value;
    setLineBriefing(updated);
    
    // Propagate up as unified stringified block
    const unified = stringifyLineBriefing(updated);
    onTareasLineasChange(unified);
  };

  const getAssignedPlayerNodes = () => nodesPropio.filter(n => !!n.player_id);

  // IA - Sintetizar por Líneas
  const handleSynthesizeLines = async () => {
    setSuccessMsg(null);
    const payload = {
      rivalName,
      sistemaPropio,
      sistemaRival,
      ventajas,
      desventajas,
      zonaConflicto,
      dueloClave,
      tareasLineas
    };

    const result = await synthesizeLines(payload);
    if (result) {
      const updated = {
        porteria: result.porteria || ['', '', ''],
        defensa: result.defensa || ['', '', ''],
        mediocampo: result.mediocampo || ['', '', ''],
        delantera: result.delantera || ['', '', '']
      };
      setLineBriefing(updated);
      onTareasLineasChange(stringifyLineBriefing(updated));
      setSuccessMsg('Consignas por líneas sintetizadas correctamente con IA.');
    }
  };

  // IA - Sintetizar Individuales
  const handleSynthesizePlayers = async () => {
    setSuccessMsg(null);
    const titularNodes = getAssignedPlayerNodes();
    if (titularNodes.length !== 11) {
      alert('Para realizar el briefing individual se requiere tener el once inicial completo (11 jugadores) en la pizarra.');
      return;
    }

    const onceInicial: BriefingPlayerPayload[] = titularNodes.map(n => {
      const player = players.find(p => p.id === n.player_id);
      return {
        id: n.player_id!,
        nombre: player?.nombre || 'Jugador',
        apellidos: player?.apellidos || '',
        dorsal: player?.dorsal || 0,
        demarcacion: player?.demarcacion || 'Sin definir',
        label_posicion: n.label,
        x: n.x,
        y: n.y
      };
    });

    const mappedRoleCards: BriefingRoleCardPayload[] = roleCards.map(rc => ({
      posicion_label: rc.posicion_label,
      linea: rc.linea,
      fase_ofensiva: rc.fase_ofensiva,
      fase_defensiva: rc.fase_defensiva,
      transiciones: rc.transiciones,
      instrucciones_especificas: rc.instrucciones_especificas
    }));

    const payload = {
      rivalName,
      sistemaPropio,
      sistemaRival,
      ventajas,
      desventajas,
      zonaConflicto,
      dueloClave,
      tareasLineas,
      onceInicial,
      roleCards: mappedRoleCards
    };

    const result = await synthesizePlayers(payload);
    if (result && result.players) {
      // Map to DB tactical_role_cards overrides format
      const cardsToApply = result.players.map(p => {
        // We find matching node to assign matchup/plan reference later in client upsert
        return {
          posicion_label: p.posicion_label,
          fase_ofensiva: p.fase_ofensiva,
          fase_defensiva: p.fase_defensiva,
          transiciones: p.transiciones,
          instrucciones_especificas: p.instrucciones_especificas
        };
      });

      const success = await onApplyRoleCards(cardsToApply);
      if (success) {
        setSuccessMsg('Fichas individuales personalizadas por IA y guardadas con éxito.');
      }
    }
  };



  return (
    <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-6 mt-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <LayoutList className="h-5 w-5 text-[#CC0E21]" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
            Briefing Táctico del Equipo
            <span className="text-[10px] text-slate-400 font-bold bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-lg flex items-center gap-1 normal-case">
              <Trophy className="h-3 w-3 text-yellow-500" /> DH 2026-27
            </span>
          </h3>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-850/50">
          <button
            onClick={() => setActiveTab('colectivo')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'colectivo' 
                ? 'bg-[#CC0E21] text-white shadow' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Plan Colectivo
          </button>
          <button
            onClick={() => setActiveTab('lineas')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'lineas' 
                ? 'bg-[#CC0E21] text-white shadow' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Por Líneas
          </button>
          <button
            onClick={() => setActiveTab('individuales')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'individuales' 
                ? 'bg-[#CC0E21] text-white shadow' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Instrucciones Individuales
          </button>
        </div>
      </div>

      {/* Success/Error Banner */}
      {successMsg && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-500 font-bold">X</button>
        </div>
      )}
      {briefingError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex justify-between items-center">
          <span>{briefingError}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-red-500 font-bold">X</button>
        </div>
      )}

      {/* Content Tabs */}
      <div className="space-y-6">
        
        {/* TAB 1: PLAN COLECTIVO */}
        {activeTab === 'colectivo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#CC0E21] flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Ventajas del Choque
              </span>
              <p className="text-xs text-slate-350 leading-relaxed min-h-[50px]">
                {ventajas || 'No se han definido ventajas tácticas en la Página 3.'}
              </p>
            </div>

            <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" /> Riesgos / Desventajas
              </span>
              <p className="text-xs text-slate-350 leading-relaxed min-h-[50px]">
                {desventajas || 'No se han definido riesgos o desventajas estructurales.'}
              </p>
            </div>

            <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-slate-400" /> Zona de Conflicto Clave
              </span>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-350 capitalize font-semibold">
                  Carril {zonaConflicto || 'Sin configurar'}
                </p>
                {zonaConflicto && (
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse inline-block" />
                )}
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-850 p-4.5 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" /> Duelo Táctico Principal
              </span>
              <p className="text-xs text-slate-300 font-medium">
                {dueloClave || 'No se ha indicado ningún duelo táctico clave.'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: POR LÍNEAS */}
        {activeTab === 'lineas' && (
          <div className="space-y-4">
            
            {/* AI Synthesize Button */}
            {isEditMode && selectedMatchId && (
              <div className="flex justify-end">
                <button
                  onClick={handleSynthesizeLines}
                  disabled={isGeneratingLines}
                  className="px-3 py-1.5 bg-gradient-to-r from-[#CC0E21] to-red-700 hover:from-red-700 hover:to-[#CC0E21] disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white border border-slate-800/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                >
                  {isGeneratingLines ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sintetizando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <span>Sintetizar por Líneas (IA)</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Line editors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(['porteria', 'defensa', 'mediocampo', 'delantera'] as const).map(line => {
                const lineTitles = {
                  porteria: { label: 'Portería', icon: '🧤' },
                  defensa: { label: 'Defensa', icon: '🛡️' },
                  mediocampo: { label: 'Mediocampo', icon: '⚙️' },
                  delantera: { label: 'Delantera', icon: '⚡' }
                };

                return (
                  <div key={line} className="bg-slate-950/20 border border-slate-850 p-4.5 rounded-2xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-350 uppercase tracking-widest flex items-center gap-2">
                      <span>{lineTitles[line].icon}</span>
                      <span>{lineTitles[line].label}</span>
                    </h4>
                    <div className="space-y-2">
                      {[0, 1, 2].map(idx => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-500 w-4 shrink-0 text-right">{idx + 1}.</span>
                          <input
                            type="text"
                            value={lineBriefing[line][idx]}
                            onChange={(e) => handleLineChange(line, idx, e.target.value)}
                            disabled={!isEditMode}
                            placeholder={`Pauta ${idx + 1} (máx 10 palabras)...`}
                            className="w-full bg-slate-950/80 border border-slate-850 focus:border-[#CC0E21]/50 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: INSTRUCCIONES INDIVIDUALES */}
        {activeTab === 'individuales' && (
          <div className="space-y-4">
            
            {/* AI Synthesize Button */}
            {isEditMode && selectedMatchId && (
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <span className="text-[10px] text-slate-400 font-bold bg-slate-950 border border-slate-850/60 px-3 py-1.5 rounded-xl">
                  Titulares colocados: {getAssignedPlayerNodes().length} / 11
                </span>
                <button
                  onClick={handleSynthesizePlayers}
                  disabled={isGeneratingPlayers || getAssignedPlayerNodes().length !== 11}
                  className="px-3 py-1.5 bg-gradient-to-r from-[#CC0E21] to-red-700 hover:from-red-700 hover:to-[#CC0E21] disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 text-white border border-slate-800/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                >
                  {isGeneratingPlayers ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Sintetizando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <span>Sintetizar Individuales (IA)</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Grid of Players */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {nodesPropio.map(node => {
                const assignedPlayer = players.find(p => p.id === node.player_id);
                const card = roleCards.find(c => c.posicion_label === node.label) || null;

                if (!node.player_id) {
                  return (
                    <div 
                      key={node.id} 
                      className="border border-dashed border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[200px] text-slate-600 bg-slate-950/10"
                    >
                      <UserCheck className="h-6 w-6 text-slate-700 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{node.label}</span>
                      <span className="text-[9px] mt-0.5">Vacío</span>
                    </div>
                  );
                }

                return (
                  <div 
                    key={node.id}
                    onClick={() => onNodeClick(node)}
                    className="group border border-slate-850 hover:border-[#CC0E21]/50 rounded-2xl p-4 bg-slate-950/40 hover:bg-slate-900/10 cursor-pointer transition-all flex flex-col gap-3 min-h-[220px]"
                  >
                    
                    {/* Ficha Header */}
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
                      <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                        {assignedPlayer?.foto_url ? (
                          <img 
                            src={assignedPlayer.foto_url} 
                            alt={assignedPlayer.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          assignedPlayer?.dorsal || node.label
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-slate-400 text-[8px] font-bold uppercase tracking-wider block bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900 inline-block">
                          {node.label}
                        </span>
                        <h5 className="text-[11px] font-bold text-slate-200 truncate mt-0.5">
                          {assignedPlayer?.nombre} {assignedPlayer?.apellidos}
                        </h5>
                      </div>
                    </div>

                    {/* Consignas desglosadas */}
                    <div className="flex-1 flex flex-col justify-between gap-1.5">
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[8px] font-bold uppercase text-[#CC0E21] tracking-wider block">Ataque</span>
                          <p className="text-[10px] text-slate-350 leading-tight truncate">
                            {card?.fase_ofensiva || 'Sin consigna específica.'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold uppercase text-blue-400 tracking-wider block">Defensa</span>
                          <p className="text-[10px] text-slate-350 leading-tight truncate">
                            {card?.fase_defensiva || 'Sin consigna específica.'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold uppercase text-purple-400 tracking-wider block">Transición</span>
                          <p className="text-[10px] text-slate-350 leading-tight truncate">
                            {card?.transiciones || 'Sin consigna específica.'}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-900">
                        <span className="text-[8px] font-bold uppercase text-amber-500 tracking-wider block">Instrucción Especial</span>
                        <p className="text-[10px] text-slate-200 leading-tight font-medium line-clamp-2 mt-0.5">
                          {card?.instrucciones_especificas || 'Sin instrucción especial.'}
                        </p>
                      </div>
                    </div>

                    {/* Botón flotante al hover */}
                    <div className="text-right text-[8px] font-bold text-slate-500 group-hover:text-[#CC0E21] transition-colors pt-1 border-t border-slate-900/60">
                      Haga clic para editar ficha
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
