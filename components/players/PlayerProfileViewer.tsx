import React from 'react';
import { Player } from '@/types';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Calendar, Ruler, Weight, User, MapPin, Target, Shield, Heart } from 'lucide-react';

interface PlayerProfileViewerProps {
  player: Player;
}

export function PlayerProfileViewer({ player }: PlayerProfileViewerProps) {
  // Calculate age
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

  const age = getAge(player.fecha_nacimiento);

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-xl flex flex-col md:flex-row">
      {/* Columna Izquierda: Foto y Nombre */}
      <div className="relative p-6 md:w-1/3 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 border-b md:border-b-0 md:border-r border-gray-700">
        <div className="absolute top-4 left-4">
          <span className="text-5xl font-black text-gray-700/50 italic">{player.dorsal}</span>
        </div>
        
        <div className="mb-4 mt-6">
          <Avatar 
            src={player.foto_url || undefined} 
            name={`${player.nombre} ${player.apellidos}`} 
            size="xl" 
            className="w-32 h-32 border-4 border-gray-700 shadow-lg"
          />
        </div>
        
        <h2 className="text-2xl font-bold text-white text-center mb-1">{player.nombre}</h2>
        <h3 className="text-lg text-gray-400 text-center mb-4">{player.apellidos}</h3>
        
        <div className="flex gap-2 justify-center flex-wrap">
          <Badge variant="default" className="text-sm px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30">
            {player.demarcacion}
          </Badge>
          {player.posicion_secundaria && (
            <Badge variant="default" className="text-sm px-3 py-1 border-gray-600 text-gray-400">
              {player.posicion_secundaria}
            </Badge>
          )}
        </div>
      </div>

      {/* Columna Derecha: Datos Biológicos y Deportivos Base */}
      <div className="p-6 md:w-2/3 grid grid-cols-2 gap-6">
        
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-700 pb-2">Biológicos</h4>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center text-gray-400">
              <Calendar size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Edad / F. Nacimiento</p>
              <p className="text-sm font-medium text-white">{age} años <span className="text-gray-500">({new Date(player.fecha_nacimiento).toLocaleDateString('es-ES')})</span></p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center text-gray-400">
              <Ruler size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Altura</p>
              <p className="text-sm font-medium text-white">{player.altura ? `${player.altura} m` : 'No especificada'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center text-gray-400">
              <User size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Peso</p>
              <p className="text-sm font-medium text-white">{player.peso ? `${player.peso} kg` : 'No especificado'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-700 pb-2">Identidad Deportiva</h4>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center text-gray-400">
              <Target size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Pie Dominante</p>
              <p className="text-sm font-medium text-white">{player.pierna_dominante}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center text-gray-400">
              <Shield size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Equipo / Categoría</p>
              <p className="text-sm font-medium text-white">{player.equipo || 'Indautxu Juvenil A'} <span className="text-gray-500">({player.categoria || 'Juvenil'})</span></p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-700/50 flex items-center justify-center text-gray-400">
              <MapPin size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Nacionalidad</p>
              <p className="text-sm font-medium text-white">{player.nacionalidad || 'España'}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
