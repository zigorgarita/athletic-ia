import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { Player } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface PlayerCardProps {
  player: Player;
  onEdit: (player: Player) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

export function PlayerCard({ player, onEdit, onDelete, isDeleting = false }: PlayerCardProps) {
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

  return (
    <Card className="overflow-hidden relative group">
      {/* Línea decorativa según posición */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${
        player.demarcacion === 'Portero' ? 'bg-blue-500' :
        player.demarcacion === 'Defensa' ? 'bg-amber-500' :
        player.demarcacion === 'Centrocampista' ? 'bg-green-500' : 'bg-rose-500'
      }`} />

      <CardContent className="pt-8 pb-6 flex flex-col items-center text-center">
        <div className="relative mb-4">
          <Avatar src={player.foto_url} name={player.nombre} size="xl" className="border-2 border-slate-700/80 group-hover:border-[#CC0E21]/50 transition-colors duration-300" />
          <div className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-700 text-slate-100 font-bold h-7 w-7 rounded-full flex items-center justify-center text-xs shadow-md">
            #{player.dorsal}
          </div>
        </div>

        <h3 className="font-bold text-slate-100 text-lg line-clamp-1 mb-1 group-hover:text-[#CC0E21] transition-colors duration-200">
          {player.nombre}
        </h3>

        <div className="flex items-center gap-2 mb-4">
          <Badge variant={player.demarcacion}>{player.demarcacion}</Badge>
          <span className="text-xs text-slate-400 font-medium">
            {getAge(player.fecha_nacimiento)} años
          </span>
        </div>

        <div className="flex items-center justify-center gap-2 w-full pt-4 border-t border-slate-800/60 mt-2">
          <Button
            variant="ghost"
            onClick={() => onEdit(player)}
            className="flex-1 py-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 rounded-lg text-xs"
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            Editar
          </Button>
          <Button
            variant="ghost"
            loading={isDeleting}
            onClick={() => onDelete(player.id)}
            className="flex-1 py-2 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg text-xs"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
