'use client';
import React, { useState, useMemo } from 'react';
import { ClubSeason } from '@/hooks/useClubs';
import { useClubPlayers, ClubPlayer } from '@/hooks/useClubPlayers';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Users, Plus, Search, Filter } from 'lucide-react';
import { PlayerCard } from '@/components/players/PlayerCard';
import { Player, Demarcacion } from '@/types';

interface PlayersTabProps {
  season: ClubSeason | null;
}

const POSICIONES = [
  'Portero',
  'Lateral Derecho',
  'Lateral Izquierdo',
  'Defensa Central',
  'Pivote',
  'Medio Centro',
  'Interior Derecho',
  'Interior Izquierdo',
  'Media Punta',
  'Extremo Derecho',
  'Extremo Izquierdo',
  'Delantero Centro'
];

export function PlayersTab({ season }: PlayersTabProps) {
  const { players, loading, savePlayer, deletePlayer } = useClubPlayers(season?.id);
  const { isEditMode } = useEditMode();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPos, setFilterPos] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Partial<ClubPlayer> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredPlayers = useMemo(() => {
    return players.filter(p => {
      const matchName = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       (p.dorsal?.toString() === searchTerm);
      const matchPos = filterPos ? p.posicion === filterPos : true;
      return matchName && matchPos;
    });
  }, [players, searchTerm, filterPos]);

  // Agrupamos por línea para mejor visualización
  const groupedPlayers = useMemo(() => {
    const groups: Record<string, ClubPlayer[]> = {
      'Porteros': [],
      'Defensas': [],
      'Centrocampistas': [],
      'Delanteros': [],
      'Sin Posición': []
    };

    filteredPlayers.forEach(p => {
      const pos = p.posicion || '';
      if (pos === 'Portero') groups['Porteros'].push(p);
      else if (pos.includes('Lateral') || pos.includes('Central')) groups['Defensas'].push(p);
      else if (pos.includes('Pivote') || pos.includes('Medio') || pos.includes('Interior') || pos === 'Media Punta') groups['Centrocampistas'].push(p);
      else if (pos.includes('Extremo') || pos.includes('Delantero')) groups['Delanteros'].push(p);
      else groups['Sin Posición'].push(p);
    });

    return groups;
  }, [filteredPlayers]);

  const handleOpenModal = (player?: ClubPlayer) => {
    if (player) {
      setEditingPlayer(player);
    } else {
      setEditingPlayer({
        nombre: '',
        posicion: 'Medio Centro',
        pierna_dominante: 'Diestro',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer || !editingPlayer.nombre) return;
    
    setIsSaving(true);
    const success = await savePlayer(editingPlayer);
    setIsSaving(false);
    
    if (success) {
      setIsModalOpen(false);
    }
  };



  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingPlayer(prev => prev ? { ...prev, [name]: value } : null);
  };

  if (!season) {
    return <div className="p-8 text-center text-slate-400">No hay datos de temporada disponibles.</div>;
  }

  const inputClass = "w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 focus:ring-1 focus:ring-[#CC0E21]/30 transition-all";
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  const mapToPlayer = (cp: ClubPlayer): Player => {
    let demar: Demarcacion = 'Centrocampista';
    const pos = cp.posicion || '';
    if (pos.includes('Portero')) demar = 'Portero';
    else if (pos.includes('Lateral') || pos.includes('Central') || pos.includes('Defensa')) demar = 'Defensa';
    else if (pos.includes('Delantero') || pos.includes('Extremo') || pos.includes('Punta')) demar = 'Delantero';

    return {
      id: cp.id,
      nombre: cp.nombre,
      apellidos: '',
      dorsal: cp.dorsal || 0,
      demarcacion: demar,
      posicion_secundaria: pos !== demar ? pos : null,
      fecha_nacimiento: cp.fecha_nacimiento || new Date().toISOString(),
      altura: cp.altura,
      peso: cp.peso,
      pierna_dominante: cp.pierna_dominante || 'Diestro',
      estado: 'Disponible',
      rol_abp: null,
      foto_url: cp.foto_url,
      created_at: cp.created_at,
      updated_at: cp.created_at,
    };
  };

  const handleEditAdapter = (player: Player) => {
    const original = players.find(p => p.id === player.id);
    if (original) handleOpenModal(original);
  };

  const handleDeleteAdapter = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este jugador de la plantilla?')) {
      await deletePlayer(id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto">
      
      {/* Barra superior de herramientas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-4 rounded-3xl border border-slate-800/80">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o dorsal..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 transition-colors"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <select
              value={filterPos}
              onChange={e => setFilterPos(e.target.value)}
              className="appearance-none bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-8 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 transition-colors"
            >
              <option value="">Todas las posiciones</option>
              {POSICIONES.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>
        </div>

        {isEditMode && (
          <Button onClick={() => handleOpenModal()} variant="primary" className="shrink-0 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Jugador
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-slate-800 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50">
          <Users className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Plantilla vacía</h3>
          <p className="text-slate-500 text-sm mt-2">Aún no hay jugadores registrados para este rival.</p>
          {isEditMode && (
            <Button onClick={() => handleOpenModal()} variant="secondary" className="mt-6">
              Añadir el primero
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedPlayers).map(([groupName, groupPlayers]) => {
            if (groupPlayers.length === 0) return null;
            
            return (
              <div key={groupName} className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <div className="h-px bg-slate-800 flex-1" />
                  {groupName} <span className="text-slate-600 bg-slate-900 px-2 py-0.5 rounded-full text-[10px]">{groupPlayers.length}</span>
                  <div className="h-px bg-slate-800 flex-1" />
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {groupPlayers.map(player => (
                    <PlayerCard 
                      key={player.id} 
                      player={mapToPlayer(player)} 
                      onEdit={handleEditAdapter} 
                      onDelete={handleDeleteAdapter} 
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear/Editar Jugador */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPlayer?.id ? "Editar Jugador" : "Añadir Jugador"}>
        {editingPlayer && (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <label className={labelClass}>Nombre <span className="text-red-500">*</span></label>
                <input required type="text" name="nombre" value={editingPlayer.nombre || ''} onChange={handleChange} className={inputClass} placeholder="Nombre completo o deportivo" />
              </div>
              <div className="col-span-1">
                <label className={labelClass}>Dorsal</label>
                <input type="number" name="dorsal" value={editingPlayer.dorsal || ''} onChange={handleChange} className={inputClass} placeholder="Ej: 9" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Posición Principal</label>
                <select name="posicion" value={editingPlayer.posicion || ''} onChange={handleChange} className={inputClass}>
                  <option value="">Seleccionar...</option>
                  {POSICIONES.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Pierna Dominante</label>
                <select name="pierna_dominante" value={editingPlayer.pierna_dominante || ''} onChange={handleChange} className={inputClass}>
                  <option value="">Seleccionar...</option>
                  <option value="Diestro">Diestro</option>
                  <option value="Zurdo">Zurdo</option>
                  <option value="Ambidiestro">Ambidiestro</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>URL Fotografía</label>
                <input type="url" name="foto_url" value={editingPlayer.foto_url || ''} onChange={handleChange} className={inputClass} placeholder="https://..." />
              </div>
              <div>
                <label className={labelClass}>Nacimiento</label>
                <input type="date" name="fecha_nacimiento" value={editingPlayer.fecha_nacimiento || ''} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Altura (m)</label>
                <input type="number" step="0.01" name="altura" value={editingPlayer.altura || ''} onChange={handleChange} className={inputClass} placeholder="Ej: 1.85" />
              </div>
              <div>
                <label className={labelClass}>Peso (kg)</label>
                <input type="number" step="0.1" name="peso" value={editingPlayer.peso || ''} onChange={handleChange} className={inputClass} placeholder="Ej: 78.5" />
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Scouting y Observaciones</h4>
              
              <div>
                <label className={labelClass}>Características Principales</label>
                <textarea name="caracteristicas" value={editingPlayer.caracteristicas || ''} onChange={handleChange} rows={2} className={inputClass} placeholder="Perfil general del jugador..." />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Fortalezas</label>
                  <textarea name="fortalezas" value={editingPlayer.fortalezas || ''} onChange={handleChange} rows={2} className={inputClass} placeholder="Puntos fuertes (Ej: Juego aéreo, velocidad...)" />
                </div>
                <div>
                  <label className={labelClass}>Debilidades</label>
                  <textarea name="debilidades" value={editingPlayer.debilidades || ''} onChange={handleChange} rows={2} className={inputClass} placeholder="Puntos débiles o áreas a explotar..." />
                </div>
              </div>
              
              <div>
                <label className={labelClass}>Observaciones Adicionales</label>
                <textarea name="observaciones" value={editingPlayer.observaciones || ''} onChange={handleChange} rows={2} className={inputClass} placeholder="Cualquier otro detalle de interés táctico..." />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button type="submit" variant="primary" loading={isSaving}>Guardar Jugador</Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
