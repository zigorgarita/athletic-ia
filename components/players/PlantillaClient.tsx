'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect } from 'react';
import { Plus, Users, Search, SlidersHorizontal, Eye, Star, Edit2, Trash2, Heart } from 'lucide-react';
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
  const [valFilter, setValFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dorsal' | 'valoracion' | 'nombre' | 'modificacion'>('dorsal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Cache of players' latest global valuations and injury states
  const [valuationsCache, setValuationsCache] = useState<Record<string, number>>({});
  const [lastEvaluationDates, setLastEvaluationDates] = useState<Record<string, string>>({});
  const [injuriesCache, setInjuriesCache] = useState<Record<string, string>>({});

  // Fetch only the latest valuations and last injuries for all players
  useEffect(() => {
    async function loadValuationsAndInjuries() {
      try {
        // Fetch all evaluations sorted chronologically ascending
        // The loop will overwrite previous records, leaving only the LATEST evaluation in the maps.
        const { data: evals, error: evalErr } = await supabase
          .from('detailed_evaluations')
          .select('player_id, valoracion_global, fecha_evaluacion, perfil_especifico, valoraciones_generales, metricas')
          .order('fecha_evaluacion', { ascending: true });
        
        if (evalErr) throw evalErr;

        const latestValMap: Record<string, number> = {};
        const latestDateMap: Record<string, string> = {};

        evals?.forEach((row) => {
          let globalVal = row.valoracion_global;
          
          if (globalVal === undefined || globalVal === null) {
            let vals: number[] = [];
            if (row.perfil_especifico && Object.keys(row.perfil_especifico).length > 0) {
              vals = Object.values(row.perfil_especifico) as number[];
            } else if (row.metricas && Object.keys(row.metricas).length > 0) {
              vals = Object.values(row.metricas) as number[];
            }
            if (vals.length > 0) {
              globalVal = vals.reduce((a, b) => a + b, 0) / vals.length;
            }
          }
          
          if (globalVal !== null && globalVal !== undefined) {
            latestValMap[row.player_id] = Number(Number(globalVal).toFixed(1));
          }
          latestDateMap[row.player_id] = row.fecha_evaluacion;
        });

        setValuationsCache(latestValMap);
        setLastEvaluationDates(latestDateMap);

        // Fetch injuries
        const { data: injuries, error: injErr } = await supabase
          .from('player_injuries')
          .select('player_id, tipo_lesion, fecha_lesion, estado')
          .order('fecha_lesion', { ascending: true });

        if (injErr) throw injErr;

        const latestInjuryMap: Record<string, string> = {};
        injuries?.forEach((row) => {
          if (row.estado === 'Activa' || row.estado === 'Recaída' || row.estado === 'En recuperación') {
            latestInjuryMap[row.player_id] = `${row.tipo_lesion} (${row.fecha_lesion})`;
          } else {
            latestInjuryMap[row.player_id] = `Alta: ${row.tipo_lesion}`;
          }
        });
        setInjuriesCache(latestInjuryMap);

      } catch (e) {
        console.error('Error loading general caches:', e);
      }
    }
    if (players.length > 0) {
      loadValuationsAndInjuries();
    }
  }, [players]);

  const handleOpenAddModal = () => {
    setSelectedPlayer(null);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (e: React.MouseEvent, player: Player) => {
    e.stopPropagation();
    setSelectedPlayer(player);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData: any) => {
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
    e.stopPropagation();
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
    if (!birthDateString) return '-';
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
    
    // Valuation filters
    const val = valuationsCache[player.id] || 0;
    const matchVal = 
      valFilter === 'all' ? true :
      valFilter === 'alta' ? val >= 4.0 :
      valFilter === 'baja' ? (val > 0 && 3.0 > val) : true;

    return matchSearch && matchPos && matchStatus && matchEquipo && matchVal;
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
    } else if (sortBy === 'modificacion') {
      fieldA = lastEvaluationDates[a.id] || '';
      fieldB = lastEvaluationDates[b.id] || '';
    }

    if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
    if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (field: 'dorsal' | 'valoracion' | 'nombre' | 'modificacion') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'valoracion' || field === 'modificacion' ? 'desc' : 'asc');
    }
  };

  if (activePlayerForDetail) {
    return (
      <PlayerDetail 
        player={activePlayerForDetail} 
        onBack={() => {
          setActivePlayerForDetail(null);
          refetch();
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
            Fichas completas y gestión de futbolistas ({players.length})
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="flex items-center gap-1.5 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Añadir Jugador
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Panel de Filtros */}
      <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 text-slate-350 text-xs font-bold uppercase tracking-wider pb-2 border-b border-slate-800/40">
          <SlidersHorizontal className="h-4 w-4 text-[#CC0E21]" />
          Filtros de Plantilla
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {/* Búsqueda */}
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
            <label className="text-[10px] text-slate-500 font-bold uppercase mb-1.5 block">Posición principal</label>
            <select
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 outline-none focus:border-[#CC0E21] cursor-pointer"
            >
              <option value="all">Todas</option>
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
              <option value="all">Todos (DH / B)</option>
              <option value="DH">DH</option>
              <option value="B">B</option>
            </select>
          </div>

          {/* Estado Médico */}
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase mb-1.5 block">Estado Médico</label>
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
              <option value="Baja temporal">Baja temporal</option>
            </select>
          </div>

          {/* Valoración Rápida */}
          <div>
            <label className="text-[10px] text-slate-500 font-bold uppercase mb-1.5 block">Valoración</label>
            <select
              value={valFilter}
              onChange={(e) => setValFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 outline-none focus:border-[#CC0E21] cursor-pointer"
            >
              <option value="all">Todas las valoraciones</option>
              <option value="alta">Alta (&gt;= 4.0 ★)</option>
              <option value="baja">Baja (&lt; 3.0 ★)</option>
            </select>
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
              Prueba a cambiar los criterios de búsqueda o filtros.
            </p>
          </div>
        </div>
      ) : (
        /* Tabla Profesional de Plantilla */
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
                <th className="px-4 py-4 w-28">Estado</th>
                <th className="px-4 py-4 cursor-pointer hover:text-white w-32" onClick={() => requestSort('valoracion')}>
                  Val. Vigente {sortBy === 'valoracion' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-4 py-4 w-48">Última Lesión</th>
                <th className="px-4 py-4 cursor-pointer hover:text-white w-36" onClick={() => requestSort('modificacion')}>
                  Modificado {sortBy === 'modificacion' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-4 text-center w-[120px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {sortedPlayers.map((player) => {
                const latestValuation = valuationsCache[player.id];
                const lastEvalDate = lastEvaluationDates[player.id];
                const injuryText = injuriesCache[player.id];
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
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        player.estado === 'Disponible' ? 'bg-green-950/20 text-green-400 border-green-900/30' :
                        player.estado === 'Lesionado' ? 'bg-red-950/20 text-red-400 border-red-900/30' :
                        player.estado === 'Duda' ? 'bg-amber-950/20 text-amber-400 border-amber-900/30' :
                        player.estado === 'Sancionado' ? 'bg-orange-950/20 text-orange-400 border-orange-900/30' :
                        'bg-slate-800 text-slate-350 border-slate-700/40'
                      }`}>
                        {player.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold">
                      {latestValuation ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> {latestValuation}
                        </span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 max-w-[180px] truncate">
                      {injuryText ? (
                        <span className={injuryText.startsWith('Alta:') ? 'text-slate-500 line-through text-[11px]' : 'text-red-400 font-medium'}>
                          {injuryText.startsWith('Alta:') ? injuryText.replace('Alta:', '') : injuryText}
                        </span>
                      ) : (
                        <span className="text-slate-650">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {lastEvalDate || '-'}
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
