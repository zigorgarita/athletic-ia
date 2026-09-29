'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Match } from '@/types';
import { DieLigenTeamMatchItem, isMatchingDieLigenTeam } from '@/lib/die-ligen/mapping';
import { extraerDatosPartidoDieLigen, DieLigenMatchReportData } from '@/lib/die-ligen/parser';
import { getStaffPasskey } from '@/lib/passkey';
import { DieLigenMatchCard } from './DieLigenMatchCard';
import { DieLigenReportModal } from './DieLigenReportModal';
import { BarChart3, Clock, AlertCircle } from 'lucide-react';

export interface DieLigenMatchSectionProps {
  match: Match;
}

export function DieLigenMatchSection({ match }: DieLigenMatchSectionProps) {
  const [matchItem, setMatchItem] = useState<DieLigenTeamMatchItem | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportData, setReportData] = useState<DieLigenMatchReportData | null>(null);
  const [reportFileName, setReportFileName] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Caché en memoria para evitar descargas repetidas de JSON
  const reportCacheRef = useRef<Map<string, DieLigenMatchReportData>>(new Map());

  // Cargar lista de partidos de SD Indautxu para resolver la jornada
  const loadIndautxuMatch = useCallback(async () => {
    setLoadingMatch(true);
    setErrorMsg(null);

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      const staffPasskey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || '';
      if (staffPasskey) {
        headers['x-staff-passkey'] = staffPasskey;
      }

      // Consultar siempre los partidos de SD Indautxu
      const res = await fetch(`/api/die-ligen/matches?clubName=${encodeURIComponent('SD Indautxu')}`, {
        headers,
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}`);
      }

      const json = await res.json();
      if (!json.success || !Array.isArray(json.matches)) {
        throw new Error(json.error || 'No se pudieron consultar los partidos en Die Ligen.');
      }

      const allMatches: DieLigenTeamMatchItem[] = json.matches;

      // 1. Filtrar por la jornada del partido actual
      const candidate = allMatches.find((m) => m.jornada === match.jornada);

      if (candidate) {
        // 2. Validación de seguridad con el rival si aplica
        if (match.rival) {
          const matchesRival = isMatchingDieLigenTeam(candidate.opponentName, match.rival);
          if (!matchesRival) {
            console.warn(
              `[DieLigenMatchSection] Aviso: El rival en Die Ligen (${candidate.opponentName}) no coincide exactamente con el guardado (${match.rival}) para J-${match.jornada}`
            );
          }
        }
        setMatchItem(candidate);
      } else {
        setMatchItem(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con Die Ligen';
      setErrorMsg(msg);
      setMatchItem(null);
    } finally {
      setLoadingMatch(false);
    }
  }, [match.jornada, match.rival]);

  useEffect(() => {
    loadIndautxuMatch();
  }, [loadIndautxuMatch]);

  // Cargar visor individual
  const handleOpenViewer = async () => {
    if (!matchItem || !matchItem.isAnalyzed || !matchItem.gameId) return;

    const gameId = matchItem.gameId;
    const title = `Die Ligen: J-${matchItem.jornada} · ${matchItem.homeTeam.name} vs ${matchItem.awayTeam.name}`;
    setReportFileName(title);

    // 1. Si ya está en caché, abrir de inmediato
    if (reportCacheRef.current.has(gameId)) {
      setReportData(reportCacheRef.current.get(gameId)!);
      setIsModalOpen(true);
      return;
    }

    // 2. Descargar JSON oficial de Die Ligen
    setLoadingReport(true);
    setErrorMsg(null);

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      const staffPasskey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || '';
      if (staffPasskey) {
        headers['x-staff-passkey'] = staffPasskey;
      }

      const res = await fetch(`/api/die-ligen/game-json?gameId=${encodeURIComponent(gameId)}`, {
        headers,
        cache: 'no-store',
      });

      const json = await res.json();
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || `Error al obtener el informe Die Ligen (HTTP ${res.status})`);
      }

      const parsed = extraerDatosPartidoDieLigen(json.data);
      reportCacheRef.current.set(gameId, parsed);
      setReportData(parsed);
      setIsModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al descargar el informe de Die Ligen';
      setErrorMsg(msg);
    } finally {
      setLoadingReport(false);
    }
  };

  // Marcador a mostrar
  const getScoreDisplay = () => {
    if (!matchItem) return undefined;
    if (matchItem.scoreFormatted) return matchItem.scoreFormatted;
    if (matchItem.scoreHome !== null && matchItem.scoreHome !== undefined && matchItem.scoreAway !== null && matchItem.scoreAway !== undefined) {
      return `${matchItem.scoreHome} - ${matchItem.scoreAway}`;
    }
    return undefined;
  };

  return (
    <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4 shadow-sm">
      {/* Cabecera del Bloque */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-amber-400" />
          <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest">
            Informe Oficial Die Ligen
          </h4>
        </div>
        <span
          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
            matchItem?.isAnalyzed
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
              : 'bg-slate-950 text-slate-400 border-slate-800'
          }`}
        >
          {matchItem?.isAnalyzed ? 'DIE LIGEN · ANÁLISIS LISTO' : 'DIE LIGEN · PENDIENTE'}
        </span>
      </div>

      {/* Contenido según estado */}
      {loadingMatch ? (
        <div className="p-6 text-center text-slate-400 space-y-2 bg-slate-950/30 border border-dashed border-slate-800 rounded-xl animate-pulse">
          <Clock className="h-6 w-6 text-slate-600 mx-auto animate-spin" />
          <p className="text-xs font-medium">Consultando partido en Die Ligen...</p>
        </div>
      ) : matchItem ? (
        <DieLigenMatchCard
          jornada={matchItem.jornada}
          isHome={matchItem.isHome}
          homeTeamName={matchItem.homeTeam.name}
          awayTeamName={matchItem.awayTeam.name}
          scoreDisplay={getScoreDisplay()}
          isAnalyzed={matchItem.isAnalyzed}
          analysisStatus={matchItem.analysisStatus}
          onLoadViewer={handleOpenViewer}
          isLoading={loadingReport}
        />
      ) : (
        <div className="p-5 text-center text-slate-500 space-y-2 bg-slate-950/20 border border-dashed border-slate-800/80 rounded-xl">
          <Clock className="h-6 w-6 text-slate-600 mx-auto" />
          <div className="max-w-xs mx-auto space-y-1">
            <p className="text-xs font-bold text-slate-300">Pendiente de análisis en Die Ligen</p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              No se ha publicado todavía el análisis oficial de la Jornada {match.jornada} para el SD Indautxu.
            </p>
          </div>
        </div>
      )}

      {/* Mensaje de error discreto si ocurre alguno */}
      {errorMsg && (
        <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-2.5 flex items-start gap-2 text-xs text-red-300">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Modal del Visor Completo */}
      <DieLigenReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={reportData}
        fileName={reportFileName}
      />
    </div>
  );
}
