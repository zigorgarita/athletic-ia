'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Users, Search, SlidersHorizontal, Eye, Star, Edit2, Trash2 } from 'lucide-react';
import { usePlayers } from '@/hooks/usePlayers';
import { useCreatePlayer } from '@/hooks/useCreatePlayer';
import { useUpdatePlayer } from '@/hooks/useUpdatePlayer';
import { useDeletePlayer } from '@/hooks/useDeletePlayer';
import { Player, Demarcacion, DetailedEvaluation } from '@/types';
import { PlayerForm } from '@/components/players/PlayerForm';
import { PlayerDetail } from '@/components/players/PlayerDetail';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';

export function PlantillaClient() {
  const { players, loading, error, refetch } = usePlayers();
  const { createPlayer, loading: creating, error: createError } = useCreatePlayer();
  const { updatePlayer, loading: updating, error: updateError } = useUpdatePlayer();
  const { deletePlayer, error: deleteError } = useDeletePlayer();

  // Navigation state (list vs details)
  const [activePlayerForDetail, setActivePlayerForDetail] = useState<Player | null>(null);

  // Form modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter and Sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [posFilter, setPosFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [equipoFilter, setEquipoFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dorsal' | 'valoracion' | 'nombre'>('dorsal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Cache of players' global valuations (calculated from detailed_evaluations)
  const [valuationsCache, setValuationsCache] = useState<Record<string, number>>({});

  // Fetch average valuations for all players to display in table and enable sorting
  useEffect(() => {
    async function loadValuations() {
      try {
        const { data, error: err } = await supabase
          .from('detailed_evaluations')
          .select('player_id, metricas, velocidad, aceleracion, fuerza, resistencia, juego_aereo, marcaje, entrada_defensiva, posicionamiento_defensivo, trabajo_defensivo, pase_corto, pase_largo, control_orientado, regate, centros, finalizacion, disparo_lejano, trabajo_ofensivo, vision_juego, inteligencia_tactica, liderazgo');
        
        if (err) throw err;

        const sumMap: Record<string, { sum: number; count: number }> = {};
        data?.forEach((row: Partial<DetailedEvaluation> & { player_id: string }) => {
          let avg = 0;
          if (row.metricas && Object.keys(row.metricas).length > 0) {
            const vals = Object.values(row.metricas) as number[];
            avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          } else {
            const sumMetrics = 
              (row.velocidad || 0) + (row.aceleracion || 0) + (row.fuerza || 0) + (row.resistencia || 0) + (row.juego_aereo || 0) +
              (row.marcaje || 0) + (row.entrada_defensiva || 0) + (row.posicionamiento_defensivo || 0) + (row.trabajo_defensivo || 0) +
              (row.pase_corto || 0) + (row.pase_largo || 0) + (row.control_orientado || 0) + (row.regate || 0) + (row.centros || 0) +
              (row.finalizacion || 0) + (row.disparo_lejano || 0) + (row.trabajo_ofensivo || 0) + (row.vision_juego || 0) +
              (row.inteligencia_tactica || 0) + (row.liderazgo || 0);
            avg = sumMetrics / 20;
          }

          if (!sumMap[row.player_id]) {
            sumMap[row.player_id] = { sum: 0, count: 0 };
          }
          sumMap[row.player_id].sum += avg;
          sumMap[row.player_id].count += 1;
        });

        const finalCache: Record<string, number> = {};
        Object.keys(sumMap).forEach((pId) => {
          finalCache[pId] = Number((sumMap[pId].sum / sumMap[pId].count).toFixed(1));
        });
        setValuationsCache(finalCache);
      } catch (e) {
        console.error('Error loading global valuations cache:', e);
      }
    }
    if (players.length > 0) {
      loadValuations();
    }
  }, [players]);

  const handleOpenAddModal = () => {
    setSelectedPlayer(null);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, player: Player) => {
    e.stopPropagation(); // Avoid opening details
    setSelectedPlayer(player);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData: {
    nombre: string;
    apellidos: string;
    dorsal: number;
    demarcacion: Demarcacion;
    posicion_secundaria?: string | null;
    fecha_nacimiento: string;
    altura?: number | '' | null;
    peso?: number | '' | null;
    pierna_dominante: 'Diestro' | 'Zurdo' | 'Ambidiestro';
    estado: 'Disponible' | 'Lesionado' | 'Duda' | 'Sancionado';
    rol_abp?: string | null;
    foto_url?: string | null;
    equipo: 'DH' | 'B';
  }) => {
    setActionError(null);
    const payload: Omit<Player, 'id' | 'created_at' | 'updated_at'> = {
      nombre: formData.nombre,
      apellidos: formData.apellidos,
      dorsal: formData.dorsal,
      demarcacion: formData.demarcacion,
      posicion_secundaria: formData.posicion_secundaria ?? null,
      fecha_nacimiento: formData.fecha_nacimiento,
      altura: (formData.altura === '' || formData.altura === undefined) ? null : formData.altura,
      peso: (formData.peso === '' || formData.peso === undefined) ? null : formData.peso,
      pierna_dominante: formData.pierna_dominante,
      estado: formData.estado,
      rol_abp: formData.rol_abp ?? null,
      foto_url: formData.foto_url ?? null,
      equipo: formData.equipo,
    };

    if (selectedPlayer) {
      const updated = await updatePlayer(selectedPlayer.id, payload);
      if (updated) {
        setIsModalOpen(false);
        refetch();
      } else {
        setActionError(updateError || 'Error al actualizar el jugador. Verifica que el dorsal no esté duplicado.');
      }
    } else {
      const created = await createPlayer(payload);
      if (created) {
        setIsModalOpen(false);
        refetch();
      } else {
        setActionError(createError || 'Error al agregar el jugador. Verifica que el dorsal no esté duplicado.');
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Avoid opening details
    if (confirm('¿Estás seguro de que deseas eliminar este jugador de la plantilla?')) {
      const success = await deletePlayer(id);
      if (success) {
        refetch();
      } else {
        alert(deleteError || 'Error al eliminar el jugador de la base de datos.');
      }
    }
  };

  const getAge = (birthDateString: string) => {
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Filter logic
  const filteredPlayers = players.filter((player) => {
    const matchSearch = 
      player.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.apellidos.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchPos = posFilter === 'all' ? true : player.demarcacion === posFilter;
    const matchStatus = statusFilter === 'all' ? true : player.estado === statusFilter;
    const matchEquipo = equipoFilter === 'all' ? true : player.equipo === equipoFilter;

    return matchSearch && matchPos && matchStatus && matchEquipo;
  });

  // Sort logic
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    let fieldA: string | number = a.dorsal;
    let fieldB: string | number = b.dorsal;

    if (sortBy === 'nombre') {
      fieldA = `${a.nombre} ${a.apellidos}`.toLowerCase();
      fieldB = `${b.nombre} ${b.apellidos}`.toLowerCase();
    } else if (sortBy === 'valoracion') {
      fieldA = valuationsCache[a.id] || 0;
      fieldB = valuationsCache[b.id] || 0;
    }

    if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
    if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (field: 'dorsal' | 'valoracion' | 'nombre') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'valoracion' ? 'desc' : 'asc');
    }
  };

  if (activePlayerForDetail) {
    return (
      <PlayerDetail 
        player={activePlayerForDetail} 
        onBack={() => {
          setActivePlayerForDetail(null);
          refetch(); // Refresh data and ratings when returning
        }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            <Users className="h-8 w-8 text-[#CC0E21]" />
            Plantilla
          </h1>
          <p className="text-slate-400 text-sm">
            Gestión de futbolistas registrados ({players.length})
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="flex items-center gap-1.5 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Añadir Jugador
        </Button>
      </div>

      {/* Alerta de Error Principal */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Panel de Filtros */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 text-slate-350 text-xs font-bold uppercase tracking-wider pb-2 border-b border-slate-800/40">
          <SlidersHorizontal className="h-4 w-4 text-[#CC0E21]" />
          Filtros y Búsqueda
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Búsqueda por Nombre */}
          <div className="relative">
            <label className="text-[10px] text-slate-500 font-bold uppercase mb-1.5 block">Nombre o Apellidos</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar jugador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 focus:border-[#CC0E21]"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            </div>
          </div>

          {/* Posición */}
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase mb-1.5 block">Posición</label>
            <select
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 outline-none focus:border-[#CC0E21] cursor-pointer"
            >
              <option value="all">Todas las posiciones</option>
              <option value="Portero">Portero</option>
              <option value="Lateral">Lateral</option>
              <option value="Central">Central</option>
              <option value="Defensa">Defensa</option>
              <option value="Pivote">Pivote</option>
              <option value="Interior">Interior</option>
              <option value="Centrocampista">Centrocampista</option>
              <option value="Extremo">Extremo</option>
              <option value="Delantero">Delantero</option>
            </select>
          </div>

          {/* Equipo */}
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase mb-1.5 block">Equipo</label>
            <select
              value={equipoFilter}
              onChange={(e) => setEquipoFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 outline-none focus:border-[#CC0E21] cursor-pointer"
            >
              <option value="all">Todos los equipos</option>
              <option value="DH">DH</option>
              <option value="B">B</option>
            </select>
          </div>

          {/* Estado Semanal */}
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase mb-1.5 block">Estado Semanal</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 outline-none focus:border-[#CC0E21] cursor-pointer"
            >
              <option value="all">Todos los estados</option>
              <option value="Disponible">Disponible</option>
              <option value="Lesionado">Lesionado</option>
              <option value="Duda">Duda Semanal</option>
              <option value="Sancionado">Sancionado</option>
            </select>
          </div>

          {/* Ordenación Rápida */}
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase mb-1.5 block">Ordenar por</label>
            <div className="flex gap-2">
              <button
                onClick={() => requestSort('dorsal')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-xl border transition-all duration-200 ${
                  sortBy === 'dorsal'
                    ? 'bg-[#CC0E21]/10 text-[#CC0E21] border-[#CC0E21]/20 shadow-md'
                    : 'bg-slate-950/30 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Dorsal {sortBy === 'dorsal' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => requestSort('valoracion')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-xl border transition-all duration-200 ${
                  sortBy === 'valoracion'
                    ? 'bg-[#CC0E21]/10 text-[#CC0E21] border-[#CC0E21]/20 shadow-md'
                    : 'bg-slate-950/30 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Valoración {sortBy === 'valoracion' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de cargando */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl animate-pulse" />
        </div>
      ) : sortedPlayers.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center gap-4 bg-slate-900/10">
          <Users className="h-12 w-12 text-slate-600" />
          <div>
            <h3 className="text-lg font-bold text-slate-200">No se encontraron jugadores</h3>
            <p className="text-sm text-slate-400 max-w-sm mt-1">
              Prueba a cambiar los criterios de búsqueda o filtros, o registra un nuevo jugador.
            </p>
          </div>
          <Button onClick={handleOpenAddModal} variant="secondary" className="mt-2">
            Registrar Jugador
          </Button>
        </div>
      ) : (
        /* Tabla Profesional de Jugadores */
        <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/20 shadow-xl">
          <table className="w-full text-left border-collapse select-none">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <th className="px-4 py-4 w-12 text-center">Foto</th>
                <th className="px-3 py-4 cursor-pointer hover:text-white w-20" onClick={() => requestSort('dorsal')}>
                  Dorsal {sortBy === 'dorsal' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-4 py-4 cursor-pointer hover:text-white" onClick={() => requestSort('nombre')}>
                  Nombre Completo {sortBy === 'nombre' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-4 py-4 w-28">Posición</th>
                <th className="px-4 py-4 w-20">Equipo</th>
                <th className="px-3 py-4 text-center w-16">Edad</th>
                <th className="px-4 py-4 w-24">Pierna</th>
                <th className="px-4 py-4 w-28">Estado</th>
                <th className="px-4 py-4 cursor-pointer hover:text-white w-36" onClick={() => requestSort('valoracion')}>
                  Val. Global {sortBy === 'valoracion' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-4 text-center w-[120px] min-w-[120px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {sortedPlayers.map((player) => {
                const avgValuation = valuationsCache[player.id];
                return (
                  <tr 
                    key={player.id} 
                    onClick={() => setActivePlayerForDetail(player)}
                    className="hover:bg-slate-800/30 transition-colors duration-150 cursor-pointer group"
                  >
                    <td className="px-4 py-3.5 text-center">
                      <Avatar src={player.foto_url} name={player.nombre} size="sm" className="border border-slate-700/60 mx-auto" />
                    </td>
                    <td className="px-3 py-3.5 font-black text-sm text-slate-300">
                      #{player.dorsal}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-100 group-hover:text-[#CC0E21] transition-colors">
                      {player.nombre} <span className="text-slate-400 font-medium">{player.apellidos}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={player.demarcacion}>{player.demarcacion}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        player.equipo === 'DH' 
                          ? 'bg-red-950/10 text-[#CC0E21] border-[#CC0E21]/20' 
                          : 'bg-blue-950/20 text-blue-400 border-blue-900/30'
                      }`}>
                        {player.equipo}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center text-slate-300">
                      {getAge(player.fecha_nacimiento)}
                    </td>
                    <td className="px-4 py-3.5 text-slate-450">
                      {player.pierna_dominante || 'Diestro'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        player.estado === 'Disponible' ? 'bg-green-950/20 text-green-400 border-green-900/30' :
                        player.estado === 'Lesionado' ? 'bg-red-950/20 text-red-400 border-red-900/30' :
                        player.estado === 'Duda' ? 'bg-amber-950/20 text-amber-400 border-amber-900/30' :
                        'bg-slate-950/20 text-slate-400 border-slate-900/30'
                      }`}>
                        {player.estado === 'Duda' ? 'Duda' : player.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold">
                      {avgValuation ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-450 text-amber-450" /> {avgValuation}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => setActivePlayerForDetail(player)} 
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors duration-150"
                          title="Ver ficha"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => handleOpenEditModal(e, player)} 
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#CC0E21] hover:bg-slate-800/50 transition-colors duration-150"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, player.id)} 
                          className="h-8 w-8 flex items-center justify-center rounded-lg text-red-500 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/30 transition-colors duration-150"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Formulario */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedPlayer ? 'Editar Datos del Jugador' : 'Registrar Nuevo Jugador'}
      >
        <div className="space-y-4">
          {actionError && (
            <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-xs">
              {actionError}
            </div>
          )}
          <PlayerForm
            player={selectedPlayer}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsModalOpen(false)}
            onDelete={() => {
              if (selectedPlayer) {
                setIsModalOpen(false);
                const mockEvent = { stopPropagation: () => {} } as unknown as React.MouseEvent;
                handleDelete(mockEvent, selectedPlayer.id);
              }
            }}
            isSubmitting={creating || updating}
          />
        </div>
      </Modal>
    </div>
  );
}
