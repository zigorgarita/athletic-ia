'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, ABPPlay, ABPPlayerRole, ABPType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Film, Plus, AlertCircle, Trash2, BookOpen, Layers, X
} from 'lucide-react';

interface ABPSectionProps {
  players: Player[];
}

const ABP_TYPES: ABPType[] = [
  'Córner Ofensivo', 'Córner Defensivo', 
  'Falta Ofensiva', 'Falta Defensiva', 
  'Penalti', 'Saque de Banda', 'Jugada Ensayada'
];

export function ABPSection({ players }: ABPSectionProps) {
  const [plays, setPlays] = useState<ABPPlay[]>([]);
  const [selectedPlay, setSelectedPlay] = useState<ABPPlay | null>(null);
  const [playRoles, setPlayRoles] = useState<(ABPPlayerRole & { player?: Player })[]>([]);
  
  // Modals / loading states
  const [loadingPlays, setLoadingPlays] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [isPlayModalOpen, setIsPlayModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isSavingPlay, setIsSavingPlay] = useState(false);
  const [isSavingRole, setIsSavingRole] = useState(false);
  
  // Form states - Play
  const [playTitle, setPlayTitle] = useState('');
  const [playDesc, setPlayDesc] = useState('');
  const [playType, setPlayType] = useState<ABPType>('Córner Ofensivo');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  
  // Form states - Role
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [assignedRole, setAssignedRole] = useState('');

  // Alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter
  const [activeFilter, setActiveFilter] = useState<ABPType | 'Todos'>('Todos');

  const loadPlays = useCallback(async () => {
    setLoadingPlays(true);
    try {
      const { data, error } = await supabase
        .from('abp_plays')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlays(data || []);
      if (data && data.length > 0 && !selectedPlay) {
        setSelectedPlay(data[0]);
      }
    } catch (err) {
      console.error('Error loading ABP plays:', err);
    } finally {
      setLoadingPlays(false);
    }
  }, [selectedPlay]);

  const loadPlayRoles = useCallback(async (playId: string) => {
    setLoadingRoles(true);
    try {
      const { data, error } = await supabase
        .from('abp_player_roles')
        .select('*')
        .eq('abp_play_id', playId);

      if (error) throw error;
      const mapped = (data || []).map((r: ABPPlayerRole) => ({
        ...r,
        player: players.find(p => p.id === r.player_id)
      }));
      setPlayRoles(mapped);
    } catch (err) {
      console.error('Error loading roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  }, [players]);

  useEffect(() => {
    loadPlays();
  }, [loadPlays]);

  useEffect(() => {
    if (selectedPlay) {
      loadPlayRoles(selectedPlay.id);
    } else {
      setPlayRoles([]);
    }
  }, [selectedPlay, loadPlayRoles]);

  // --- Create ABP Play (includes Video Upload to Storage) ---
  async function handleCreatePlay(e: React.FormEvent) {
    e.preventDefault();
    if (!playTitle.trim()) {
      setErrorMsg('El título es obligatorio.');
      return;
    }
    setIsSavingPlay(true);
    setErrorMsg(null);

    try {
      let videoUrl = null;

      // Upload video if selected
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `abp-videos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('match-videos')
          .upload(filePath, videoFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('match-videos').getPublicUrl(filePath);
        videoUrl = data.publicUrl;
      }

      const { data: playRes, error: insertError } = await supabase
        .from('abp_plays')
        .insert({
          tipo: playType,
          titulo: playTitle,
          descripcion: playDesc || null,
          video_url: videoUrl
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setPlayTitle('');
      setPlayDesc('');
      setVideoFile(null);
      setIsPlayModalOpen(false);
      await loadPlays();
      if (playRes) {
        setSelectedPlay(playRes);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error creating ABP play:', error);
      setErrorMsg(error.message || 'Error al guardar la jugada.');
    } finally {
      setIsSavingPlay(false);
    }
  }

  // --- Assign Player Role ---
  async function handleAssignRole(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlay || !selectedPlayerId || !assignedRole.trim()) {
      setErrorMsg('Debes seleccionar un jugador y definir su rol.');
      return;
    }
    setIsSavingRole(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('abp_player_roles')
        .insert({
          abp_play_id: selectedPlay.id,
          player_id: selectedPlayerId,
          rol_asignado: assignedRole
        });

      if (error) throw error;

      setAssignedRole('');
      setSelectedPlayerId('');
      setIsRoleModalOpen(false);
      loadPlayRoles(selectedPlay.id);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error assigning role:', error);
      setErrorMsg('Este jugador ya tiene un rol asignado en esta jugada.');
    } finally {
      setIsSavingRole(false);
    }
  }

  async function handleDeleteRole(roleId: string) {
    if (!selectedPlay) return;
    try {
      const { error } = await supabase.from('abp_player_roles').delete().eq('id', roleId);
      if (error) throw error;
      loadPlayRoles(selectedPlay.id);
    } catch (err) {
      console.error('Error deleting role:', err);
    }
  }

  async function handleDeletePlay(playId: string) {
    if (!confirm('¿Seguro que deseas eliminar esta jugada de estrategia?')) return;
    try {
      const { error } = await supabase.from('abp_plays').delete().eq('id', playId);
      if (error) throw error;
      if (selectedPlay?.id === playId) {
        setSelectedPlay(null);
      }
      loadPlays();
    } catch (err) {
      console.error('Error deleting play:', err);
    }
  }

  const filteredPlays = activeFilter === 'Todos' 
    ? plays 
    : plays.filter(p => p.tipo === activeFilter);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar: Lista de Jugadas ABP */}
      <div className="lg:col-span-1 space-y-4">
        {/* Filtros de Tipos */}
        <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest">Tipos de ABP</h3>
            <Button 
              variant="ghost" 
              onClick={() => setIsPlayModalOpen(true)}
              className="p-1 h-auto text-green-500 hover:text-green-400"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <button
            onClick={() => setActiveFilter('Todos')}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors duration-150 ${
              activeFilter === 'Todos' 
                ? 'bg-green-500/10 text-green-400 font-bold border border-green-500/20' 
                : 'text-slate-400 hover:bg-slate-850/50'
            }`}
          >
            Todos
          </button>
          
          {ABP_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors duration-150 ${
                activeFilter === type 
                  ? 'bg-green-500/10 text-green-400 font-bold border border-green-500/20' 
                  : 'text-slate-400 hover:bg-slate-850/50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Listado de jugadas filtradas */}
        <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-2 max-h-[300px] overflow-y-auto pr-1">
          <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-2">Listado</h3>
          {loadingPlays ? (
            <Skeleton className="h-10 w-full" />
          ) : filteredPlays.length === 0 ? (
            <p className="text-xs text-slate-550 italic text-center py-4">No hay jugadas de esta categoría.</p>
          ) : (
            filteredPlays.map(play => (
              <div
                key={play.id}
                onClick={() => setSelectedPlay(play)}
                className={`w-full flex items-center justify-between text-left p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedPlay?.id === play.id
                    ? 'bg-green-500/10 border-green-500/30 text-green-400 font-bold'
                    : 'bg-slate-950/40 border-slate-850 text-slate-350 hover:bg-slate-850/40'
                }`}
              >
                <div className="truncate mr-2">
                  <span className="block truncate font-bold text-slate-200">{play.titulo}</span>
                  <span className="text-[9px] text-slate-500">{play.tipo}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeletePlay(play.id); }}
                  className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors duration-150"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detalle de la Jugada y Asignación de Roles */}
      <div className="lg:col-span-3 space-y-6">
        {selectedPlay ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Panel Izquierdo: Descripción y Vídeo */}
            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-green-400 font-bold tracking-widest uppercase">{selectedPlay.tipo}</span>
                  <h2 className="text-xl font-extrabold text-slate-100">{selectedPlay.titulo}</h2>
                </div>
              </div>

              {selectedPlay.descripcion && (
                <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-xl text-xs text-slate-300">
                  <h4 className="font-bold text-slate-400 mb-1 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-green-500" /> Instrucciones
                  </h4>
                  <p className="whitespace-pre-line leading-relaxed">{selectedPlay.descripcion}</p>
                </div>
              )}

              {/* Reproductor de Vídeo */}
              {selectedPlay.video_url ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <Film className="h-3.5 w-3.5 text-blue-500" /> Vídeo Demostrativo
                  </h4>
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-black">
                    <video
                      src={selectedPlay.video_url}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="border border-slate-850 bg-slate-950/20 p-6 rounded-xl text-center text-xs text-slate-500 italic">
                  No se ha subido ningún vídeo explicativo para esta jugada.
                </div>
              )}
            </div>

            {/* Panel Derecho: Roles y Asignación */}
            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between h-full">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-green-500" /> Roles Estratégicos
                  </h3>
                  <Button 
                    variant="secondary"
                    onClick={() => setIsRoleModalOpen(true)}
                    className="py-1 px-3 text-xs flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Asignar Rol
                  </Button>
                </div>

                {loadingRoles ? (
                  <Skeleton className="h-24 w-full" />
                ) : playRoles.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-6 text-center border border-dashed border-slate-850 rounded-xl">Sin roles asignados aún.</p>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {playRoles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-850 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar src={role.player?.foto_url} name={role.player?.nombre || ''} size="sm" />
                          <div>
                            <span className="font-bold text-slate-200 block">
                              {role.player ? `${role.player.nombre} (#${role.player.dorsal})` : 'Jugador no asignado'}
                            </span>
                            <span className="text-[10px] text-green-400 font-semibold">{role.rol_asignado}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors duration-150"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl flex flex-col items-center justify-center space-y-3">
            <BookOpen className="h-10 w-10 text-slate-650" />
            <p className="text-sm text-slate-400 italic">No hay jugadas registradas en la base de datos.</p>
          </div>
        )}
      </div>

      {/* Modal Nueva Jugada */}
      <Modal isOpen={isPlayModalOpen} onClose={() => setIsPlayModalOpen(false)} title="Crear Jugada ABP">
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleCreatePlay} className="space-y-4">
          <Input
            label="Título de la Jugada"
            type="text"
            required
            value={playTitle}
            onChange={(e) => setPlayTitle(e.target.value)}
          />

          <Select
            label="Tipo de ABP"
            value={playType}
            onChange={(e) => setPlayType(e.target.value as ABPType)}
            options={ABP_TYPES.map(t => ({ value: t, label: t }))}
          />

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Instrucciones y Ejecución</label>
            <textarea
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
              rows={4}
              placeholder="Describe el lanzamiento, los arrastres y los rematadores..."
              value={playDesc}
              onChange={(e) => setPlayDesc(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 block">Vídeo Demostrativo (.mp4/.mov)</label>
            <input
              type="file"
              accept="video/mp4,video/quicktime"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsPlayModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" loading={isSavingPlay}>Guardar Jugada</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Asignar Rol */}
      <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title="Asignar Rol a Jugador">
        <form onSubmit={handleAssignRole} className="space-y-4">
          <Select
            label="Selecciona Futbolista"
            required
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            options={[
              { value: '', label: '-- Elige un jugador --' },
              ...players.map(p => ({ value: p.id, label: `${p.nombre} ${p.apellidos || ''} (#${p.dorsal})` }))
            ]}
          />

          <Input
            label="Rol Asignado"
            type="text"
            required
            placeholder="Ej. Rematador primer palo, Bloqueo de central"
            value={assignedRole}
            onChange={(e) => setAssignedRole(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsRoleModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" loading={isSavingRole}>Asignar Rol</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
