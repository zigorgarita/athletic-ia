'use client';
import React, { useState } from 'react';
import { Club, ClubSeason } from '@/hooks/useClubs';
import { useClubMatches, ClubMatch } from '@/hooks/useClubMatches';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { History, Plus, Trash2, Calendar, MapPin, Trophy, Target, FileText, ChevronRight, Search } from 'lucide-react';

interface HistoryTabProps {
  club: Club | null;
  season: ClubSeason | null;
}

export function HistoryTab({ club, season }: HistoryTabProps) {
  const { matches, loading, saveMatch, deleteMatch } = useClubMatches(season?.id);
  const { isEditMode } = useEditMode();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Partial<ClubMatch> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMatches = matches.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (m.competicion?.toLowerCase().includes(term) ||
            m.jornada?.toLowerCase().includes(term) ||
            m.resultado?.toLowerCase().includes(term));
  });

  const handleOpenModal = (match?: ClubMatch) => {
    if (match) {
      setEditingMatch(match);
    } else {
      setEditingMatch({
        fecha: new Date().toISOString().split('T')[0],
        local_visitante: 'Visitante',
        competicion: 'Liga',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch || !editingMatch.fecha) return;
    
    setIsSaving(true);
    const success = await saveMatch(editingMatch);
    setIsSaving(false);
    
    if (success) {
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este partido del historial?')) {
      await deleteMatch(id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingMatch(prev => prev ? { ...prev, [name]: value } : null);
  };

  const toggleExpand = (id: string) => {
    setExpandedMatchId(prev => prev === id ? null : id);
  };

  if (!club || !season) {
    return <div className="p-8 text-center text-slate-400">No hay datos disponibles.</div>;
  }

  const inputClass = "w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 focus:ring-1 focus:ring-[#CC0E21]/30 transition-all placeholder:text-slate-600";
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  // Helper para pintar el resultado de forma visual (Verde victoria, Rojo derrota, Naranja empate) si somos el Indautxu
  const getResultColor = (golesFavor: number | null, golesContra: number | null) => {
    if (golesFavor === null || golesContra === null) return 'text-slate-300';
    if (golesFavor > golesContra) return 'text-emerald-400 font-black'; // Victoria
    if (golesFavor < golesContra) return 'text-red-400 font-black'; // Derrota
    return 'text-orange-400 font-black'; // Empate
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1200px] mx-auto">
      
      {/* Cabecera y Buscador */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-4 rounded-3xl border border-slate-800/80">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por competición, jornada..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 transition-colors"
            />
          </div>
          <div className="text-sm text-slate-500 py-2">
            {filteredMatches.length} {filteredMatches.length === 1 ? 'partido' : 'partidos'}
          </div>
        </div>

        {isEditMode && (
          <Button onClick={() => handleOpenModal()} variant="primary" className="shrink-0 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Registrar Partido
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-800 animate-pulse rounded-2xl" />)}
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50">
          <History className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Historial vacío</h3>
          <p className="text-slate-500 text-sm mt-2">Aún no se han registrado enfrentamientos contra este rival en esta temporada.</p>
          {isEditMode && (
            <Button onClick={() => handleOpenModal()} variant="secondary" className="mt-6">
              Añadir el primer partido
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map(match => {
            const isExpanded = expandedMatchId === match.id;
            const resultColor = getResultColor(match.goles_favor, match.goles_contra);
            
            return (
              <div 
                key={match.id} 
                className={`bg-slate-900/40 border ${isExpanded ? 'border-[#CC0E21]/40' : 'border-slate-800/80'} rounded-2xl overflow-hidden transition-all`}
              >
                {/* Fila Resumen */}
                <div 
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
                  onClick={() => toggleExpand(match.id)}
                >
                  <div className="flex items-center gap-4 sm:gap-6 flex-1">
                    {/* Fecha y Competición */}
                    <div className="hidden sm:flex flex-col items-center justify-center w-20 shrink-0 border-r border-slate-800/50 pr-4">
                      <span className="text-xs text-slate-500 uppercase font-bold">{match.competicion || 'Liga'}</span>
                      <span className="text-lg font-black text-slate-200">{match.fecha ? new Date(match.fecha).getDate() : '--'}</span>
                      <span className="text-[10px] text-slate-400 uppercase">{match.fecha ? new Date(match.fecha).toLocaleString('es-ES', { month: 'short' }) : '---'}</span>
                    </div>

                    {/* Equipos y Resultado */}
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      <div className="flex items-center gap-3 flex-1 justify-end text-right">
                        <span className={`font-bold ${match.local_visitante === 'Local' ? 'text-white' : 'text-slate-400'}`}>Indautxu</span>
                      </div>
                      
                      <div className="flex items-center justify-center bg-slate-950 px-4 py-2 rounded-xl border border-slate-800/50 shrink-0 mx-auto sm:mx-0 min-w-[100px]">
                        {match.resultado ? (
                          <span className={`text-xl tracking-widest ${resultColor}`}>
                            {match.resultado}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-sm font-bold">VS</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 flex-1 text-left">
                        <span className={`font-bold ${match.local_visitante === 'Visitante' ? 'text-white' : 'text-slate-400'}`}>{club.nombre}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {isEditMode && (
                      <div className="flex items-center opacity-0 group-hover:opacity-100 sm:opacity-100 mr-2">
                         <Button 
                          variant="ghost" 
                          className="text-xs py-1 px-2 h-8"
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(match); }}
                        >
                          Editar
                        </Button>
                        <button 
                          onClick={(e) => handleDelete(match.id, e)} 
                          className="p-2 text-slate-600 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <ChevronRight className={`h-5 w-5 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {/* Detalles Expandidos */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 border-t border-slate-800/80 bg-slate-950/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2">
                    
                    {/* Bloque 1: Info General */}
                    <div className="space-y-4">
                      <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/50 pb-2">
                        <FileText className="h-4 w-4" /> Ficha del Partido
                      </h5>
                      <ul className="space-y-2 text-sm text-slate-300">
                        <li className="flex items-center gap-2"><Trophy className="h-3.5 w-3.5 text-slate-500" /> <span className="text-slate-500">Competición:</span> {match.competicion} {match.jornada && `- ${match.jornada}`}</li>
                        <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-500" /> <span className="text-slate-500">Campo:</span> {match.campo || 'No especificado'}</li>
                        <li className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-slate-500" /> <span className="text-slate-500">Fecha y Hora:</span> {match.fecha ? new Date(match.fecha).toLocaleDateString('es-ES') : '--'} a las {match.hora || '--:--'}</li>
                      </ul>
                    </div>

                    {/* Bloque 2: Sistemas y Táctica */}
                    <div className="space-y-4">
                      <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/50 pb-2">
                        <Target className="h-4 w-4" /> Pizarra Táctica
                      </h5>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Nuestro Sistema</p>
                          <p className="font-bold text-emerald-400">{match.sistema_nuestro || '---'}</p>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Sistema Rival</p>
                          <p className="font-bold text-red-400">{match.sistema_rival || '---'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Bloque 3: Valoraciones */}
                    {(match.informe_analista || match.observaciones_mister) && (
                       <div className="space-y-4 md:col-span-2 lg:col-span-1">
                        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/50 pb-2">
                          <Target className="h-4 w-4" /> Conclusiones
                        </h5>
                        {match.observaciones_mister && (
                          <div className="text-sm text-slate-300">
                            <span className="text-slate-500 text-xs block mb-1">Observaciones:</span>
                            <p className="italic bg-slate-900/30 p-3 rounded-xl border-l-2 border-[#CC0E21]/50">{match.observaciones_mister}</p>
                          </div>
                        )}
                        {match.informe_analista && (
                           <div className="text-sm text-slate-300">
                            <span className="text-slate-500 text-xs block mb-1">Informe del Analista:</span>
                            <p className="bg-slate-900/30 p-3 rounded-xl border-l-2 border-slate-600/50">{match.informe_analista}</p>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear/Editar Partido */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMatch?.id ? "Editar Partido" : "Registrar Partido"}>
        {editingMatch && (
          <form onSubmit={handleSave} className="space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Fecha <span className="text-red-500">*</span></label>
                <input required type="date" name="fecha" value={editingMatch.fecha || ''} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Hora</label>
                <input type="time" name="hora" value={editingMatch.hora || ''} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Competición</label>
                <input type="text" name="competicion" value={editingMatch.competicion || ''} onChange={handleChange} className={inputClass} placeholder="Ej: Liga" />
              </div>
              <div>
                <label className={labelClass}>Jornada</label>
                <input type="text" name="jornada" value={editingMatch.jornada || ''} onChange={handleChange} className={inputClass} placeholder="Ej: Jornada 12" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div>
                <label className={labelClass}>Local/Visitante</label>
                <select name="local_visitante" value={editingMatch.local_visitante || ''} onChange={handleChange} className={inputClass}>
                  <option value="Local">Jugamos de Local</option>
                  <option value="Visitante">Jugamos de Visitante</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Goles Indautxu</label>
                <input type="number" name="goles_favor" value={editingMatch.goles_favor ?? ''} onChange={handleChange} className={inputClass} placeholder="0" min="0" />
              </div>
              <div>
                <label className={labelClass}>Goles Rival</label>
                <input type="number" name="goles_contra" value={editingMatch.goles_contra ?? ''} onChange={handleChange} className={inputClass} placeholder="0" min="0" />
              </div>
            </div>
            
            <div>
               <label className={labelClass}>Resultado (Texto libre si se prefiere)</label>
               <input type="text" name="resultado" value={editingMatch.resultado || ''} onChange={handleChange} className={inputClass} placeholder="Ej: 2-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/50">
              <div>
                <label className={labelClass}>Nuestro Sistema</label>
                <input type="text" name="sistema_nuestro" value={editingMatch.sistema_nuestro || ''} onChange={handleChange} className={inputClass} placeholder="Ej: 1-4-3-3" />
              </div>
              <div>
                <label className={labelClass}>Sistema Rival</label>
                <input type="text" name="sistema_rival" value={editingMatch.sistema_rival || ''} onChange={handleChange} className={inputClass} placeholder="Ej: 1-4-4-2" />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/50">
              <label className={labelClass}>Observaciones Post-Partido</label>
              <textarea name="observaciones_mister" value={editingMatch.observaciones_mister || ''} onChange={handleChange} rows={3} className={inputClass} placeholder="Qué pasó, qué hicimos bien, qué falló..." />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button type="submit" variant="primary" loading={isSaving}>Guardar Historial</Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
