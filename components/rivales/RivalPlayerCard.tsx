'use client';

import React from 'react';
import { ClubPlayer } from '@/hooks/useClubPlayers';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  Edit, 
  Trash2, 
  FileText, 
  Activity
} from 'lucide-react';

interface RivalPlayerCardProps {
  player: ClubPlayer;
  onClick?: (player: ClubPlayer) => void;
  onEdit?: (player: ClubPlayer) => void;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  isEditMode?: boolean;
}

export function RivalPlayerCard({
  player,
  onClick,
  onEdit,
  onDelete,
  isDeleting = false,
  isEditMode = false,
}: RivalPlayerCardProps) {
  // Cálculo de edad si existe fecha de nacimiento
  const getAge = (birthDateString: string | null | undefined): number | null => {
    if (!birthDateString) return null;
    const today = new Date();
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) return null;
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = getAge(player.fecha_nacimiento);

  // Iniciales si no hay foto
  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Color de acento según demarcación
  const pos = (player.posicion || '').toLowerCase();
  const isPortero = pos.includes('portero');
  const isDefensa = pos.includes('lateral') || pos.includes('central') || pos.includes('defensa');
  const isMedio = pos.includes('pivote') || pos.includes('medio') || pos.includes('interior') || pos.includes('punta');
  const isDelantero = pos.includes('extremo') || pos.includes('delantero');

  const stripeColor = isPortero 
    ? 'bg-blue-500' 
    : isDefensa 
    ? 'bg-amber-500' 
    : isMedio 
    ? 'bg-emerald-500' 
    : isDelantero 
    ? 'bg-rose-500' 
    : 'bg-slate-600';

  const hasRealParticipation = player.partidos_jugados !== undefined && player.partidos_jugados !== null;

  // Badge de origen de datos
  const getSourceBadge = () => {
    const orig = player.origen || 'manual';
    if (orig === 'die_ligen') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-950/70 text-purple-300 border border-purple-800/40">
          Die Ligen
        </span>
      );
    }
    if (orig === 'combinado') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-teal-950/70 text-teal-300 border border-teal-800/40">
          Combinado
        </span>
      );
    }
    if (orig === 'documento' || orig === 'fvf') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-sky-950/70 text-sky-300 border border-sky-800/40">
          Documento
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-800/70 text-slate-400 border border-slate-700/50">
        Manual
      </span>
    );
  };

  // Comprobar si dispone de notas de scouting técnico del analista
  const hasScoutingNotes = Boolean(
    player.caracteristicas?.trim() ||
    player.fortalezas?.trim() ||
    player.debilidades?.trim() ||
    player.observaciones?.trim()
  );

  return (
    <Card 
      onClick={() => onClick?.(player)}
      className="overflow-hidden relative group bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:shadow-xl hover:shadow-black/40 transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Franja superior decorativa según posición */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${stripeColor}`} />

      {/* Cabecera de la tarjeta: Badge de fuente y notas de scouting */}
      <div className="pt-3 px-4 flex items-center justify-between z-10">
        {getSourceBadge()}
        {hasScoutingNotes && (
          <span 
            title="Cuenta con informe de scouting redactado" 
            className="inline-flex items-center gap-1 text-[10px] text-amber-400/90 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/40"
          >
            <FileText className="h-2.5 w-2.5" />
            <span className="hidden sm:inline">Informe</span>
          </span>
        )}
      </div>

      <CardContent className="pt-2 pb-4 px-4 flex-1 flex flex-col items-center text-center">
        {/* Contenedor Fotografía / Iniciales */}
        <div className="relative mb-3.5">
          {player.foto_url ? (
            <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-slate-700/80 group-hover:border-[#CC0E21]/60 transition-colors shadow-lg bg-slate-950">
              <img 
                src={player.foto_url} 
                alt={player.nombre} 
                className="h-full w-full object-cover object-top"
                loading="lazy"
                onError={(e) => {
                  // Fallback elegante a iniciales si la URL remota fallara
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    parent.innerHTML = `<div class="h-full w-full flex items-center justify-center bg-slate-800 text-slate-300 font-bold text-lg">${getInitials(player.nombre)}</div>`;
                  }
                }}
              />
            </div>
          ) : (
            <div className="h-20 w-20 rounded-2xl border-2 border-slate-800 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-300 font-extrabold text-xl shadow-inner group-hover:border-slate-700 transition-colors">
              {getInitials(player.nombre)}
            </div>
          )}

          {/* Dorsal */}
          {player.dorsal !== null && player.dorsal !== undefined && player.dorsal > 0 ? (
            <div className="absolute -bottom-1.5 -right-1.5 bg-slate-950 border border-slate-700 text-white font-extrabold h-6 w-6 rounded-lg flex items-center justify-center text-[11px] shadow-md tabular-nums">
              #{player.dorsal}
            </div>
          ) : (
            <div className="absolute -bottom-1.5 -right-1.5 bg-slate-950/90 border border-slate-800 text-slate-500 font-semibold h-6 w-6 rounded-lg flex items-center justify-center text-[10px]">
              #-
            </div>
          )}
        </div>

        {/* Nombre del jugador (hasta 2 líneas con altura uniforme) */}
        <div className="h-12 flex items-center justify-center mb-1">
          <h3 className="font-bold text-slate-100 text-sm sm:text-[15px] leading-snug line-clamp-2 group-hover:text-white transition-colors">
            {player.nombre}
          </h3>
        </div>

        {/* Posición y edad (solo muestra edad si existe fecha confirmada) */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
          <Badge 
            variant="default" 
            className="text-[10px] px-2 py-0.5 bg-slate-800/90 border-slate-700/60 text-slate-200 font-semibold"
          >
            {player.posicion || 'Sin Posición'}
          </Badge>
          {age !== null && (
            <span className="text-[11px] text-slate-400 font-medium">
              {age} años
            </span>
          )}
        </div>

        {/* Datos físicos adaptables (si existen, como en Athletic) */}
        {(player.altura || player.peso || player.pierna_dominante) && (
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium mb-3 bg-slate-950/40 py-1 px-2.5 rounded-lg border border-slate-800/50">
            {player.altura && <span>{player.altura} m</span>}
            {player.altura && player.peso && <span className="text-slate-600">·</span>}
            {player.peso && <span>{player.peso} kg</span>}
            {(player.altura || player.peso) && player.pierna_dominante && <span className="text-slate-600">·</span>}
            {player.pierna_dominante && <span>{player.pierna_dominante}</span>}
          </div>
        )}

        {/* Zona de participación acumulada (Capa 2 - Adaptable y sin datos ficticios) */}
        <div className="w-full mt-auto pt-2 border-t border-slate-800/70 bg-slate-950/20 rounded-xl p-2 text-left">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-slate-500" />
              Participación
            </span>
            <span className={`text-[10px] font-semibold tabular-nums ${hasRealParticipation ? 'text-slate-300' : 'text-slate-500 tracking-wider'}`}>
              {hasRealParticipation ? `${player.minutos_jugados}'` : 'SIN DATOS'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center">
            {/* PJ */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg py-1 px-1">
              <div className="text-[9px] text-slate-400 uppercase font-semibold">PJ</div>
              <div className="text-xs font-bold text-slate-200 tabular-nums">
                {hasRealParticipation ? player.partidos_jugados : '—'}
              </div>
            </div>

            {/* Titular */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg py-1 px-1">
              <div className="text-[9px] text-slate-400 uppercase font-semibold">Titular</div>
              <div className="text-xs font-bold text-slate-200 tabular-nums">
                {hasRealParticipation ? (player.titularidades ?? '—') : '—'}
              </div>
            </div>

            {/* Goles o Goles Encajados */}
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg py-1 px-1">
              <div className="text-[9px] text-slate-400 uppercase font-semibold">
                {isPortero ? 'Encajados' : 'Goles'}
              </div>
              <div className="text-xs font-bold text-slate-200 tabular-nums">
                {hasRealParticipation
                  ? (isPortero ? (player.goles_encajados ?? '—') : (player.goles ?? '—'))
                  : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Acciones para Modo Edición */}
        {isEditMode && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="flex items-center justify-center gap-2 w-full pt-3 border-t border-slate-800/70 mt-3"
          >
            <Button
              variant="ghost"
              onClick={() => onEdit?.(player)}
              className="flex-1 py-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 rounded-lg text-xs"
            >
              <Edit className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>
            <Button
              variant="ghost"
              loading={isDeleting}
              onClick={() => onDelete?.(player.id)}
              className="flex-1 py-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Eliminar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
