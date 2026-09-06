'use client';

import React from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { OfficialMatch, OfficialPlayerStat } from '@/hooks/useOfficialMatches';
import { 
  Shield, 
  MapPin, 
  User, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  ArrowDownRight, 
  ArrowUpRight,
  Award
} from 'lucide-react';

interface OfficialMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: OfficialMatch | null;
  stats: OfficialPlayerStat[];
  loading?: boolean;
}

export function OfficialMatchModal({
  isOpen,
  onClose,
  match,
  stats,
  loading = false,
}: OfficialMatchModalProps) {
  if (!isOpen || !match) return null;

  const localClub = match.local_club;
  const visitorClub = match.visitor_club;

  const localStats = stats.filter(s => s.club_id === localClub?.id);
  const visitorStats = stats.filter(s => s.club_id === visitorClub?.id);

  const localTitulares = localStats.filter(s => s.titular);
  const localSuplentes = localStats.filter(s => !s.titular);

  const visitorTitulares = visitorStats.filter(s => s.titular);
  const visitorSuplentes = visitorStats.filter(s => !s.titular);

  const incidenciasOficiales = match.oficiales?.incidencias || [];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateStr).toLocaleDateString('es-ES');
    } catch {
      return dateStr;
    }
  };

  const renderPlayerRow = (stat: OfficialPlayerStat) => {
    const isExpulsado = stat.doble_amarilla || stat.roja;

    return (
      <div 
        key={stat.id}
        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-800/40 transition-colors border-b border-slate-800/40 text-xs"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Dorsal del partido */}
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-800 border border-slate-700 font-mono font-bold text-slate-300 shrink-0">
            {stat.dorsal_partido ?? '-'}
          </span>

          {/* Nombre y datos de cambio individuales (sin inferir parejas) */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`font-medium truncate ${isExpulsado ? 'text-red-400 font-bold' : 'text-slate-200'}`}>
                {stat.player?.nombre || 'Jugador'}
              </span>

              {/* Indicadores de sustitución individuales */}
              {stat.minuto_entrada !== null && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded">
                  <ArrowUpRight className="h-3 w-3" />
                  Entró {stat.minuto_entrada}&apos;
                </span>
              )}
              {stat.minuto_salida !== null && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 bg-rose-950/80 text-rose-400 border border-rose-800/60 rounded">
                  <ArrowDownRight className="h-3 w-3" />
                  {isExpulsado ? `Expulsado ${stat.minuto_salida}'` : `Salió ${stat.minuto_salida}'`}
                </span>
              )}
            </div>

            {/* Motivo sanción si existe */}
            {stat.motivo_sancion && (
              <p className="text-[10px] text-slate-400 truncate mt-0.5" title={stat.motivo_sancion}>
                {stat.motivo_sancion}
              </p>
            )}
          </div>
        </div>

        {/* Minutos e hitos de partido */}
        <div className="flex items-center gap-2.5 shrink-0 ml-3">
          {/* Goles */}
          {stat.goles > 0 && (
            <span className="inline-flex items-center gap-1 font-bold text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900/40">
              <span>⚽</span>
              <span>{stat.goles > 1 ? stat.goles : ''}</span>
            </span>
          )}

          {/* Tarjetas amarillas */}
          {stat.amarillas > 0 && !stat.doble_amarilla && (
            <span className="inline-flex items-center gap-0.5 font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/40">
              <span className="inline-block w-2.5 h-3.5 bg-amber-400 rounded-xs" />
              {stat.amarillas > 1 && <span>{stat.amarillas}</span>}
            </span>
          )}

          {/* Doble amarilla */}
          {stat.doble_amarilla && (
            <span className="inline-flex items-center gap-1 font-bold text-red-400 bg-red-950/50 px-1.5 py-0.5 rounded border border-red-900/50" title="Doble Amarilla / Expulsión">
              <span className="inline-block w-2 h-3 bg-amber-400 rounded-xs" />
              <span className="inline-block w-2 h-3 bg-red-600 rounded-xs" />
            </span>
          )}

          {/* Roja directa */}
          {stat.roja && (
            <span className="inline-flex items-center font-bold text-red-400 bg-red-950/50 px-1.5 py-0.5 rounded border border-red-900/50" title="Roja Directa">
              <span className="inline-block w-2.5 h-3.5 bg-red-600 rounded-xs" />
            </span>
          )}

          {/* Minutos jugados */}
          <span className="w-12 text-right font-mono font-bold text-slate-300 tabular-nums">
            {stat.minutos}&apos;
          </span>
        </div>
      </div>
    );
  };

  const renderTeamSection = (
    teamName: string, 
    club: typeof localClub, 
    titulares: OfficialPlayerStat[], 
    suplentes: OfficialPlayerStat[]
  ) => {
    return (
      <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col h-full">
        {/* Cabecera del equipo */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          {club?.escudo_url ? (
            <Image 
              src={club.escudo_url} 
              alt={teamName}
              width={28}
              height={28}
              className="w-7 h-7 object-contain shrink-0" 
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0 font-bold text-xs">
              <Shield className="h-4 w-4" />
            </div>
          )}
          <h4 className="font-black text-slate-100 uppercase tracking-wide text-sm truncate">
            {teamName}
          </h4>
        </div>

        {/* Titulares */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5 px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Titulares ({titulares.length})
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Min
            </span>
          </div>
          <div className="space-y-0.5">
            {titulares.map(renderPlayerRow)}
          </div>
        </div>

        {/* Suplentes */}
        <div className="mt-4 pt-3 border-t border-slate-800/60">
          <div className="flex items-center justify-between mb-1.5 px-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Suplentes ({suplentes.length})
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Min
            </span>
          </div>
          <div className="space-y-0.5">
            {suplentes.map(renderPlayerRow)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`OFICIAL RFEF · ACTA ${match.rfef_cod_acta}`}
      maxWidth="max-w-5xl"
    >
      <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
        {/* Banner de Certificación Federativa */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-blue-950/30 border border-blue-900/40 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-blue-300 font-semibold">
            <Award className="h-4 w-4 text-blue-400 shrink-0" />
            <span>DATO OFICIAL · RFEF (Acta Arbitral Certificada)</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {match.competicion} · {match.grupo} · Jornada {match.jornada}
          </div>
        </div>

        {/* Marcador y Detalles Principales */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-inner">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Equipo Local */}
            <div className="flex flex-col items-center text-center">
              {localClub?.escudo_url ? (
                <Image 
                  src={localClub.escudo_url} 
                  alt={localClub.nombre}
                  width={56}
                  height={56}
                  className="w-14 h-14 object-contain mb-2" 
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                  <Shield className="h-8 w-8" />
                </div>
              )}
              <h3 className="font-black text-slate-100 text-sm md:text-base uppercase tracking-wide">
                {localClub?.nombre || 'Local'}
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Local</span>
            </div>

            {/* Marcador y Fecha */}
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="text-4xl md:text-5xl font-black text-slate-100 tracking-tight font-mono mb-2">
                {match.goles_local ?? 0} <span className="text-slate-600 font-normal">–</span> {match.goles_visitante ?? 0}
              </div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700/60 mb-1">
                <Calendar className="h-3.5 w-3.5 text-blue-400" />
                <span>{formatDate(match.fecha)}</span>
                {match.hora && (
                  <>
                    <span className="text-slate-500">•</span>
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    <span>{match.hora.substring(0, 5)} h</span>
                  </>
                )}
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 mt-1">
                Partido Finalizado
              </span>
            </div>

            {/* Equipo Visitante */}
            <div className="flex flex-col items-center text-center">
              {visitorClub?.escudo_url ? (
                <Image 
                  src={visitorClub.escudo_url} 
                  alt={visitorClub.nombre}
                  width={56}
                  height={56}
                  className="w-14 h-14 object-contain mb-2" 
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                  <Shield className="h-8 w-8" />
                </div>
              )}
              <h3 className="font-black text-slate-100 text-sm md:text-base uppercase tracking-wide">
                {visitorClub?.nombre || 'Visitante'}
              </h3>
              <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Visitante</span>
            </div>
          </div>

          {/* Metadatos de Instalación y Trío Arbitral */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-5 border-t border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-300">Instalación:</span>{' '}
                <span>{match.campo || 'No especificado'}</span>
                {match.superficie && (
                  <span className="text-slate-500"> ({match.superficie})</span>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-300">Árbitro:</span>{' '}
                <span>{match.arbitro || 'No asignado'}</span>
                {match.asistentes && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    <span className="font-semibold text-slate-400">Asistentes:</span> {match.asistentes}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sección de Alineaciones (2 Columnas) */}
        {loading ? (
          <div className="py-12 text-center text-slate-500 animate-pulse text-sm">
            Cargando estadísticas oficiales del acta...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {renderTeamSection(localClub?.nombre || 'Equipo Local', localClub, localTitulares, localSuplentes)}
            {renderTeamSection(visitorClub?.nombre || 'Equipo Visitante', visitorClub, visitorTitulares, visitorSuplentes)}
          </div>
        )}

        {/* Sección Independiente: Incidencias de Oficiales (Nunca mezcladas con jugadores) */}
        {incidenciasOficiales.length > 0 && (
          <div className="bg-slate-950/60 border border-amber-900/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" />
              <span>Incidencias de Oficiales y Cuerpo Técnico</span>
            </div>
            <div className="space-y-2">
              {incidenciasOficiales.map((inc, idx) => (
                <div key={idx} className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2 font-semibold">
                    <span className="text-amber-400">Minuto {inc.minuto}&apos;:</span>
                    <span className="text-slate-200">{inc.cargo || 'Oficial'} {inc.nombre} ({inc.club})</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-950 text-amber-300 rounded border border-amber-800">
                      {inc.tipo || 'Amonestación'}
                    </span>
                  </div>
                  {inc.motivo && (
                    <p className="text-[11px] text-slate-400 mt-1 italic">
                      &quot;{inc.motivo}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pie de modal con confirmación de lectura */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700"
          >
            Cerrar Acta
          </button>
        </div>
      </div>
    </Modal>
  );
}
