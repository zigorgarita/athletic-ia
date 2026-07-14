'use client';
import React, { useState } from 'react';
import { Club, ClubSeason } from '@/hooks/useClubs';
import { useClubMatches, ClubMatch } from '@/hooks/useClubMatches';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { History, Plus, Search } from 'lucide-react';
import { MatchCard } from '@/components/liga/MatchCard';
import { Match } from '@/types';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingMatch(prev => prev ? { ...prev, [name]: value } : null);
  };

  if (!club || !season) {
    return <div className="p-8 text-center text-slate-400">No hay datos disponibles.</div>;
  }

  const inputClass = "w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 focus:ring-1 focus:ring-[#CC0E21]/30 transition-all placeholder:text-slate-600";
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  const mapToMatch = (m: ClubMatch): Match & { campo?: string; hora?: string } => ({
    id: m.our_match_id || m.id, // match_id for navigation, or club_match_id if external
    jornada: parseInt(m.jornada || '0') || 0,
    rival: m.rival_en_ese_partido || 'Desconocido',
    fecha: m.fecha || new Date().toISOString(),
    es_local: m.local_visitante === 'Local',
    goles_favor: m.goles_favor,
    goles_contra: m.goles_contra,
    jugado: m.fecha ? new Date(m.fecha).getTime() < Date.now() : false,
    created_at: m.created_at || new Date().toISOString(),
    tipo_partido: m.competicion === 'Amistoso' ? 'AMISTOSO' : 'LIGA',
    campo: m.campo || (m.local_visitante === 'Visitante' ? club?.campo_nombre : undefined) || undefined,
    hora: m.hora || undefined,
  });



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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-[330px] bg-slate-800/50 animate-pulse rounded-3xl" />)}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMatches.map(match => {
            const mapped = mapToMatch(match);
            return (
              <MatchCard
                key={match.id}
                match={mapped}
                isEditMode={isEditMode}
                onEdit={() => handleOpenModal(match)}
                onDelete={() => deleteMatch(match.id)}
                disableNavigation={!match.our_match_id}
                hasReport={!!match.informe_analista || !!match.observaciones_mister}
              />
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
