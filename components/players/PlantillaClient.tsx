'use client';

import React, { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { usePlayers } from '@/hooks/usePlayers';
import { useCreatePlayer } from '@/hooks/useCreatePlayer';
import { useUpdatePlayer } from '@/hooks/useUpdatePlayer';
import { useDeletePlayer } from '@/hooks/useDeletePlayer';
import { Player } from '@/types';
import { PlayerCard } from '@/components/players/PlayerCard';
import { PlayerForm } from '@/components/players/PlayerForm';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';

export function PlantillaClient() {
  const { players, loading, error, refetch } = usePlayers();
  const { createPlayer, loading: creating, error: createError } = useCreatePlayer();
  const { updatePlayer, loading: updating, error: updateError } = useUpdatePlayer();
  const { deletePlayer } = useDeletePlayer();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setSelectedPlayer(null);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (player: Player) => {
    setSelectedPlayer(player);
    setActionError(null);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: {
    nombre: string;
    dorsal: number;
    demarcacion: 'Portero' | 'Defensa' | 'Centrocampista' | 'Delantero';
    fecha_nacimiento: string;
    foto_url?: string | null | undefined;
  }) => {
    setActionError(null);
    const playerData = {
      nombre: data.nombre,
      dorsal: data.dorsal,
      demarcacion: data.demarcacion,
      fecha_nacimiento: data.fecha_nacimiento,
      foto_url: data.foto_url ?? null,
    };

    if (selectedPlayer) {
      const updated = await updatePlayer(selectedPlayer.id, playerData);
      if (updated) {
        setIsModalOpen(false);
        refetch();
      } else {
        setActionError(updateError || 'Error al actualizar el jugador. Verifica que el dorsal no esté duplicado.');
      }
    } else {
      const created = await createPlayer(playerData);
      if (created) {
        setIsModalOpen(false);
        refetch();
      } else {
        setActionError(createError || 'Error al agregar el jugador. Verifica el límite de 20 jugadores y dorsales únicos.');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este jugador de la plantilla?')) {
      setDeletingPlayerId(id);
      const success = await deletePlayer(id);
      if (success) {
        refetch();
      }
      setDeletingPlayerId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            <Users className="h-8 w-8 text-green-500" />
            Plantilla
          </h1>
          <p className="text-slate-400 text-sm">
            Gestión de futbolistas registrados ({players.length} / 20)
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

      {/* Grid de jugadores / Skeletons */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-4">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-20" />
              <div className="flex gap-2 w-full pt-4 border-t border-slate-800/60 mt-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
              </div>
            </div>
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="p-12 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center gap-4 bg-slate-900/10">
          <Users className="h-12 w-12 text-slate-600" />
          <div>
            <h3 className="text-lg font-bold text-slate-200">No hay jugadores registrados</h3>
            <p className="text-sm text-slate-400 max-w-sm mt-1">
              Comienza agregando futbolistas a la plantilla. Recuerda que hay un límite de 20 jugadores.
            </p>
          </div>
          <Button onClick={handleOpenAddModal} variant="secondary" className="mt-2">
            Registrar Primer Jugador
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              onEdit={handleOpenEditModal}
              onDelete={handleDelete}
              isDeleting={deletingPlayerId === player.id}
            />
          ))}
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
                handleDelete(selectedPlayer.id);
              }
            }}
            isSubmitting={creating || updating}
          />
        </div>
      </Modal>
    </div>
  );
}
