'use client';

import React from 'react';
import Link from 'next/link';
import { Match } from '@/types';
import { Button } from '@/components/ui/Button';
import { 
  Calendar, 
  MapPin, 
  ClipboardList, 
  Edit3, 
  Trash2, 
  FileText, 
  Users, 
  BookOpen, 
  Activity, 
  Film, 
  Camera, 
  Paperclip, 
  ClipboardCheck, 
  ExternalLink 
} from 'lucide-react';

interface MatchCardProps {
  match: Match;
  isEditMode?: boolean;
  onEdit?: (match: Match) => void;
  onDelete?: (id: string) => void;
  onManageConvo?: (match: Match) => void;
  
  // Extensibility indicators (optional)
  hasReport?: boolean;
  hasLineup?: boolean;
  hasMatchPlan?: boolean;
  hasABP?: boolean;
  hasVideos?: boolean;
  hasPhotos?: boolean;
  hasDocuments?: boolean;
  hasEvents?: boolean;
}

// Helper to normalize and get rival logo if available
function getRivalLogo(rivalName: string): string | null {
  const normalized = rivalName.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '');

  if (normalized.includes('arratia')) return '/logos/arratia.svg';
  if (normalized.includes('santutxu')) return '/logos/santutxu.svg';
  if (normalized.includes('unionistas')) return '/logos/unionistas.svg';

  return null;
}

// Helper to get rival initials for the fallback logo
function getRivalInitials(rivalName: string): string {
  const parts = rivalName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
  }
  return rivalName.substring(0, 2).toUpperCase();
}

export function MatchCard({
  match,
  isEditMode = false,
  onEdit,
  onDelete,
  onManageConvo,
  hasReport = false,
  hasLineup = false,
  hasMatchPlan = false,
  hasABP = false,
  hasVideos = false,
  hasPhotos = false,
  hasDocuments = false,
  hasEvents = false,
}: MatchCardProps) {
  const dateObj = new Date(match.fecha);
  const formattedDate = dateObj.toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  const isWinner = match.jugado && match.goles_favor !== null && match.goles_contra !== null && match.goles_favor > match.goles_contra;
  const isLoser = match.jugado && match.goles_favor !== null && match.goles_contra !== null && match.goles_favor < match.goles_contra;

  const rivalLogo = getRivalLogo(match.rival);
  const rivalInitials = getRivalInitials(match.rival);
  
  const matchWithFields = match as Match & { campo?: string; hora?: string };
  const fieldName = matchWithFields.campo || (match.es_local ? 'Iparralde (Local)' : 'Campo Rival (Visitante)');
  
  // Custom type casting since Match interface doesn't explicitly declare hora in TS
  const matchTime = matchWithFields.hora || null;

  return (
    <div className="relative bg-slate-900/40 border border-slate-800 hover:border-red-500/20 rounded-3xl p-5 flex flex-col justify-between transition-all duration-300 group shadow-lg hover:shadow-red-500/5 select-none overflow-hidden h-[330px]">
      
      {/* Background radial highlight on hover */}
      <div className="absolute inset-0 bg-radial-gradient from-red-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Cabecera Tarjeta */}
      <div className="flex justify-between items-center z-10 shrink-0">
        <span className="text-[10px] font-black tracking-widest text-slate-400 bg-slate-950 border border-slate-850 px-2.5 py-0.5 rounded-full uppercase leading-none">
          {match.tipo_partido || 'LIGA'}{match.jornada ? ` — JORNADA ${match.jornada}` : ''}
        </span>
        
        {/* Acciones de edición en la esquina */}
        {isEditMode && (onEdit || onDelete) && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(match); }}
                className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                title="Editar jornada"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(match.id); }}
                className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                title="Eliminar jornada"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Enfrentamiento Central (Escudos y Nombres) */}
      <div className="flex items-center justify-between gap-2 my-4 z-10 shrink-0">
        {/* Local Team */}
        <div className="flex flex-col items-center flex-1 text-center">
          <div className="h-14 w-14 rounded-full bg-slate-950 border border-slate-800/80 flex items-center justify-center p-2.5 shadow-md group-hover:scale-105 transition-transform duration-300">
            {match.es_local ? (
              <img src="/escudo.jpg" alt="SD Indautxu" className="object-contain max-h-full max-w-full" />
            ) : (
              rivalLogo ? (
                <img src={rivalLogo} alt={match.rival} className="object-contain max-h-full max-w-full" />
              ) : (
                <div className="h-full w-full rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-xs font-black text-slate-200">
                  {rivalInitials}
                </div>
              )
            )}
          </div>
          <span className="text-xs font-bold text-slate-250 mt-2 truncate w-full max-w-[85px] leading-tight">
            {match.es_local ? 'SD Indautxu' : match.rival}
          </span>
        </div>

        {/* Marcador o VS */}
        <div className="flex flex-col items-center justify-center px-2">
          {match.jugado ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl font-black text-white tracking-widest bg-slate-950/70 border border-slate-850 px-3.5 py-1 rounded-xl shadow-inner">
                {match.es_local 
                  ? `${match.goles_favor} - ${match.goles_contra}`
                  : `${match.goles_contra} - ${match.goles_favor}`
                }
              </span>
              <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                isWinner ? 'bg-green-500/10 text-green-400' :
                isLoser ? 'bg-red-500/10 text-red-400' :
                'bg-amber-500/10 text-amber-400'
              }`}>
                {isWinner ? 'Ganado' : isLoser ? 'Perdido' : 'Empate'}
              </span>
            </div>
          ) : (
            <span className="text-[10px] font-black text-slate-500 bg-slate-950/30 border border-slate-850/60 px-3 py-1 rounded-full uppercase leading-none">
              VS
            </span>
          )}
        </div>

        {/* Visitante Team */}
        <div className="flex flex-col items-center flex-1 text-center">
          <div className="h-14 w-14 rounded-full bg-slate-950 border border-slate-800/80 flex items-center justify-center p-2.5 shadow-md group-hover:scale-105 transition-transform duration-300">
            {!match.es_local ? (
              <img src="/escudo.jpg" alt="SD Indautxu" className="object-contain max-h-full max-w-full" />
            ) : (
              rivalLogo ? (
                <img src={rivalLogo} alt={match.rival} className="object-contain max-h-full max-w-full" />
              ) : (
                <div className="h-full w-full rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-xs font-black text-slate-200">
                  {rivalInitials}
                </div>
              )
            )}
          </div>
          <span className="text-xs font-bold text-slate-250 mt-2 truncate w-full max-w-[85px] leading-tight">
            {!match.es_local ? 'SD Indautxu' : match.rival}
          </span>
        </div>
      </div>

      {/* Info General (Fecha, Hora, Campo) */}
      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 bg-slate-950/20 border border-slate-850/60 p-2.5 rounded-2xl z-10 shrink-0 leading-tight">
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{formattedDate}{matchTime ? ` - ${matchTime}` : ''}</span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span className="truncate" title={fieldName}>{fieldName}</span>
        </div>
      </div>

      {/* Fila de Indicadores Visuales Extensibles */}
      <div className="flex items-center justify-center gap-2 border-t border-slate-800/40 pt-3 mt-3 z-10 shrink-0">
        <div title={`Informe Rival: ${hasReport ? 'Disponible' : 'No configurado'}`}>
          <FileText className={`h-4 w-4 transition-colors ${hasReport ? 'text-blue-400' : 'text-slate-700'}`} />
        </div>
        <div title={`Alineación: ${hasLineup ? 'Lista' : 'Pendiente'}`}>
          <Users className={`h-4 w-4 transition-colors ${hasLineup ? 'text-green-400' : 'text-slate-700'}`} />
        </div>
        <div title={`Plan de Partido: ${hasMatchPlan ? 'Preparado' : 'Pendiente'}`}>
          <BookOpen className={`h-4 w-4 transition-colors ${hasMatchPlan ? 'text-amber-400' : 'text-slate-700'}`} />
        </div>
        <div title={`ABP: ${hasABP ? 'Asignadas' : 'Sin asignar'}`}>
          <Activity className={`h-4 w-4 transition-colors ${hasABP ? 'text-[#CC0E21]' : 'text-slate-700'}`} />
        </div>
        <div title={`Vídeos: ${hasVideos ? 'Disponibles' : 'Sin cargar'}`}>
          <Film className={`h-4 w-4 transition-colors ${hasVideos ? 'text-purple-400' : 'text-slate-700'}`} />
        </div>
        <div title={`Fotografías: ${hasPhotos ? 'Cargadas' : 'Sin fotos'}`}>
          <Camera className={`h-4 w-4 transition-colors ${hasPhotos ? 'text-indigo-400' : 'text-slate-700'}`} />
        </div>
        <div title={`Documentos: ${hasDocuments ? 'Adjuntos' : 'Ninguno'}`}>
          <Paperclip className={`h-4 w-4 transition-colors ${hasDocuments ? 'text-teal-400' : 'text-slate-700'}`} />
        </div>
        <div title={`Eventos: ${hasEvents ? 'Registrados' : 'Sin registrar'}`}>
          <ClipboardCheck className={`h-4 w-4 transition-colors ${hasEvents ? 'text-rose-400' : 'text-slate-700'}`} />
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/20 z-10 shrink-0">
        <Link
          href={`/${match.tipo_partido === 'AMISTOSO' ? 'amistosos' : 'liga'}/${match.id}`}
          className="flex-1 flex items-center justify-center gap-1 text-[11px] font-black py-2 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-200 transition-all hover:border-red-500/20"
        >
          <ExternalLink className="h-3 w-3 text-[#CC0E21]" />
          Ver Ficha
        </Link>
        {onManageConvo && (
          <Button
            onClick={() => onManageConvo(match)}
            variant="primary"
            className="flex-1 flex items-center justify-center gap-1 text-[11px] font-black py-2 px-3 rounded-xl h-auto bg-[#CC0E21] hover:bg-red-500 border-none text-white transition-all shadow-md shadow-red-900/10"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Convocatoria
          </Button>
        )}
      </div>
      
    </div>
  );
}
