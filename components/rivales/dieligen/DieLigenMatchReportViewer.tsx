'use client';

import React, { useState, useRef } from 'react';
import { Club, ClubSeason } from '@/hooks/useClubs';
import { extraerDatosPartidoDieLigen, DieLigenMatchReportData } from '@/lib/die-ligen/parser';
import { exportMatchToPdf } from '@/lib/die-ligen/exportMatchPdf';
import { DieLigenTeamMatchItem } from '@/lib/die-ligen/mapping';
import { getStaffPasskey } from '@/lib/passkey';
import { aggregateDieLigenMatches, DieLigenMultiMatchReportData } from '@/lib/die-ligen/aggregator';
import { DieLigenMultiMatchViewer } from './DieLigenMultiMatchViewer';
import {
  UploadCloud,
  FileDown,
  RefreshCw,
  AlertCircle,
  FileText,
  Calendar,
  MapPin,
  Trophy,
  CheckCircle2,
  Clock,
  PlayCircle,
  RotateCcw,
  CheckSquare,
  Square,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DieLigenMatchReportViewerProps {
  club?: Club | null;
  season?: ClubSeason | null;
}

export function DieLigenMatchReportViewer({ club, season }: DieLigenMatchReportViewerProps) {
  const [data, setData] = useState<DieLigenMatchReportData | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para consulta de partidos de Die Ligen
  const [matches, setMatches] = useState<DieLigenTeamMatchItem[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [hasLoadedMatches, setHasLoadedMatches] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [loadingGameId, setLoadingGameId] = useState<string | null>(null);

  // Estados para informe acumulado (Fase 3)
  const [selectedGameIds, setSelectedGameIds] = useState<Set<string>>(new Set());
  const [multiData, setMultiData] = useState<DieLigenMultiMatchReportData | null>(null);
  const [isGeneratingMulti, setIsGeneratingMulti] = useState(false);
  const [multiProgress, setMultiProgress] = useState<string | null>(null);
  const jsonCacheRef = useRef<Map<string, Record<string, unknown>>>(new Map());

  const toggleMatchSelection = (gameId: string) => {
    setSelectedGameIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  const handleSelectAllAnalyzed = () => {
    const analyzedIds = matches.filter((m) => m.isAnalyzed).map((m) => m.gameId);
    setSelectedGameIds(new Set(analyzedIds));
  };

  const handleClearSelection = () => {
    setSelectedGameIds(new Set());
  };

  const fetchAvailableMatches = async () => {
    if (!club?.nombre) {
      setMatchesError('No se ha especificado el club para consultar Die Ligen.');
      return;
    }

    setIsLoadingMatches(true);
    setMatchesError(null);

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      const staffPasskey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || '';
      if (staffPasskey) {
        headers['x-staff-passkey'] = staffPasskey;
      }

      const params = new URLSearchParams();
      params.set('clubName', club.nombre);
      if (club.nombre_corto) {
        params.set('shortName', club.nombre_corto);
      }

      const res = await fetch(`/api/die-ligen/matches?${params.toString()}`, {
        headers,
        cache: 'no-store',
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || `Error del servidor (HTTP ${res.status})`);
      }

      setMatches(json.matches || []);
      setHasLoadedMatches(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al consultar partidos en Die Ligen';
      setMatchesError(msg);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const handleSelectMatch = async (matchItem: DieLigenTeamMatchItem) => {
    if (!matchItem.isAnalyzed) return;

    setLoadingGameId(matchItem.gameId);
    setError(null);

    try {
      // 1. Usar caché en memoria si ya fue descargado
      if (jsonCacheRef.current.has(matchItem.gameId)) {
        const cachedJson = jsonCacheRef.current.get(matchItem.gameId);
        const reportData = extraerDatosPartidoDieLigen(cachedJson);
        setMultiData(null); // Cerrar acumulado si estaba abierto
        setData(reportData);
        setFileName(`Die Ligen: J-${matchItem.jornada} · ${matchItem.homeTeam.name} vs ${matchItem.awayTeam.name}`);
        return;
      }

      // 2. Descargar si no está en caché
      const headers: Record<string, string> = { Accept: 'application/json' };
      const staffPasskey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || '';
      if (staffPasskey) {
        headers['x-staff-passkey'] = staffPasskey;
      }

      const res = await fetch(`/api/die-ligen/game-json?gameId=${encodeURIComponent(matchItem.gameId)}`, {
        headers,
        cache: 'no-store',
      });
      const json = await res.json();

      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.error || `Error al obtener el JSON del partido (HTTP ${res.status})`);
      }

      // Guardar en caché para no volver a descargarlo
      jsonCacheRef.current.set(matchItem.gameId, json.data);

      const reportData = extraerDatosPartidoDieLigen(json.data);
      setMultiData(null); // Cerrar acumulado si estaba abierto
      setData(reportData);
      setFileName(`Die Ligen: J-${matchItem.jornada} · ${matchItem.homeTeam.name} vs ${matchItem.awayTeam.name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al descargar el partido de Die Ligen';
      setError(`Error al descargar el análisis: ${msg}`);
    } finally {
      setLoadingGameId(null);
    }
  };

  const handleGenerateMultiReport = async () => {
    if (selectedGameIds.size === 0) return;
    if (!club?.nombre) return;

    setIsGeneratingMulti(true);
    setMultiProgress(null);
    setError(null);

    try {
      const targetMatches = matches.filter((m) => selectedGameIds.has(m.gameId) && m.isAnalyzed);
      if (targetMatches.length === 0) {
        throw new Error('Ninguno de los partidos seleccionados cuenta con análisis listo.');
      }

      const headers: Record<string, string> = { Accept: 'application/json' };
      const staffPasskey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || '';
      if (staffPasskey) {
        headers['x-staff-passkey'] = staffPasskey;
      }

      let completedCount = 0;
      const totalToFetch = targetMatches.length;

      // Descargador con límite estricto de concurrencia = 2
      const fetchWorker = async (matchItem: DieLigenTeamMatchItem) => {
        const gId = matchItem.gameId;

        // Si ya está en caché, no descargamos de nuevo
        if (jsonCacheRef.current.has(gId)) {
          completedCount++;
          setMultiProgress(`Cargando partidos (${completedCount}/${totalToFetch})...`);
          return jsonCacheRef.current.get(gId);
        }

        setMultiProgress(`Descargando J-${matchItem.jornada} (${completedCount + 1}/${totalToFetch})...`);
        const res = await fetch(`/api/die-ligen/game-json?gameId=${encodeURIComponent(gId)}`, {
          headers,
          cache: 'no-store',
        });
        const json = await res.json();

        if (!res.ok || !json.success || !json.data) {
          throw new Error(
            json.error || `Error al descargar J-${matchItem.jornada} (${matchItem.homeTeam.name} vs ${matchItem.awayTeam.name})`
          );
        }

        jsonCacheRef.current.set(gId, json.data);
        completedCount++;
        setMultiProgress(`Procesando partidos (${completedCount}/${totalToFetch})...`);
        return json.data;
      };

      const concurrencyLimit = 2;
      const rawJsons: Record<string, unknown>[] = new Array(targetMatches.length);
      let currentIndex = 0;

      const runWorker = async () => {
        while (currentIndex < targetMatches.length) {
          const idx = currentIndex++;
          const raw = await fetchWorker(targetMatches[idx]);
          rawJsons[idx] = raw;
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrencyLimit, targetMatches.length) },
        () => runWorker()
      );
      await Promise.all(workers);

      // Parseo estricto con parser.ts (intacto)
      const parsedReports = rawJsons.map((raw) => extraerDatosPartidoDieLigen(raw));

      // Agregador estadístico puro (aggregator.ts)
      const aggregated = aggregateDieLigenMatches(parsedReports, club.nombre);

      setData(null); // Cerrar vista individual
      setMultiData(aggregated);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al generar el informe acumulado';
      setError(msg);
    } finally {
      setIsGeneratingMulti(false);
      setMultiProgress(null);
    }
  };

  const handleFileUpload = (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Por favor, selecciona un archivo JSON de Die Ligen.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsedJson = JSON.parse(text);
        const reportData = extraerDatosPartidoDieLigen(parsedJson);
        setData(reportData);
        setFileName(file.name);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al procesar el archivo JSON.';
        setError(`No se pudo leer el archivo: ${msg}`);
      }
    };
    reader.onerror = () => {
      setError('Error al leer el archivo desde el disco.');
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleExportPdf = async () => {
    if (!data) return;
    try {
      setIsExportingPdf(true);
      await exportMatchToPdf(data);
    } catch (err) {
      console.error('[PDF Export] Error generando PDF de partido:', err);
      alert('Hubo un error al generar el PDF del partido.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── PANEL 1: PARTIDOS DISPONIBLES EN DIE LIGEN ───────────────────── */}
      <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Partidos en Die Ligen — {club?.nombre || 'Rival'}
              </h3>
              {hasLoadedMatches && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {matches.length} partidos ({matches.filter((m) => m.isAnalyzed).length} analizados)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Consulta el calendario oficial del torneo y pulsa sobre un encuentro con análisis terminado para cargar su informe completo.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={fetchAvailableMatches}
              disabled={isLoadingMatches}
              className="text-xs font-bold py-2 px-3.5 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingMatches ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
              <span>{isLoadingMatches ? 'Consultando...' : hasLoadedMatches ? 'Actualizar lista' : 'Consultar partidos en Die Ligen'}</span>
            </Button>
          </div>
        </div>

        {/* Mensaje de error al consultar partidos */}
        {matchesError && (
          <div className="mt-4 bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 flex items-start gap-2.5 text-amber-300 text-xs">
            <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{matchesError}</span>
          </div>
        )}

        {/* Listado de partidos cuando ya se han consultado */}
        {hasLoadedMatches && (
          <div className="mt-4">
            {matches.length === 0 ? (
              <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl text-center text-xs text-slate-400">
                No se encontraron partidos para este rival en la competición oficial de Die Ligen. Puedes cargar el archivo JSON manualmente a continuación.
              </div>
            ) : (
              <>
                {/* Barra de acción multi-partido */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/90 border border-slate-800 rounded-xl mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-300 font-semibold">
                      Selección para informe acumulado:
                    </span>
                    <span className="text-xs font-bold text-[#CC0E21] px-2 py-0.5 rounded bg-[#CC0E21]/15 border border-[#CC0E21]/30 font-mono">
                      {selectedGameIds.size} de {matches.filter((m) => m.isAnalyzed).length} seleccionados
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllAnalyzed}
                      className="text-[11px] font-semibold text-slate-400 hover:text-white underline px-1 transition-colors"
                    >
                      Seleccionar todos analizados
                    </button>
                    {selectedGameIds.size > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-[11px] font-semibold text-slate-400 hover:text-white underline px-1 transition-colors"
                      >
                        Limpiar
                      </button>
                    )}
                    <Button
                      type="button"
                      onClick={handleGenerateMultiReport}
                      disabled={selectedGameIds.size === 0 || isGeneratingMulti}
                      className="text-xs font-bold py-1.5 px-3 bg-[#CC0E21] hover:bg-[#A60B1B] text-white flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Layers className={`h-3.5 w-3.5 ${isGeneratingMulti ? 'animate-spin' : ''}`} />
                      <span>
                        {isGeneratingMulti
                          ? multiProgress || 'Generando...'
                          : `Generar informe acumulado (${selectedGameIds.size})`}
                      </span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {matches.map((m) => {
                    const isLoadingThis = loadingGameId === m.gameId;
                    const isSelected = selectedGameIds.has(m.gameId);

                    return (
                      <div
                        key={m.gameId}
                        className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                          m.isAnalyzed
                            ? isSelected
                              ? 'bg-slate-950 border-[#CC0E21] ring-1 ring-[#CC0E21]/40'
                              : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-950'
                            : 'bg-slate-950/30 border-slate-800/40 opacity-70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          {m.isAnalyzed ? (
                            <button
                              type="button"
                              onClick={() => toggleMatchSelection(m.gameId)}
                              className="flex items-center gap-1.5 text-left group"
                              title={isSelected ? 'Deseleccionar del informe acumulado' : 'Seleccionar para informe acumulado'}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#CC0E21] shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0" />
                              )}
                              <span className="font-bold px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-white font-mono text-[11px]">
                                Jornada {m.jornada}
                              </span>
                            </button>
                          ) : (
                            <span className="font-bold px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700/80 text-slate-400 font-mono text-[11px]">
                              Jornada {m.jornada}
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400 font-medium">
                            {m.isHome ? 'Local' : 'Visitante'}
                          </span>

                          {m.isAnalyzed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Análisis listo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                              <Clock className="w-2.5 h-2.5" />
                              {m.analysisStatus}
                            </span>
                          )}
                        </div>

                        <div className="text-xs">
                          <div className="font-semibold text-slate-200 truncate">
                            {m.homeTeam.name}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center justify-between mt-0.5">
                            <span className="truncate">{m.awayTeam.name}</span>
                            <span className="font-bold text-white font-mono bg-slate-900 px-1.5 py-0.5 rounded text-[11px] ml-2">
                              {m.scoreFormatted || 'vs'}
                            </span>
                          </div>
                        </div>

                        <div>
                          {m.isAnalyzed ? (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleSelectMatch(m)}
                              disabled={isLoadingThis || Boolean(loadingGameId) || isGeneratingMulti}
                              className="w-full text-xs font-bold py-1.5 px-3 border-slate-700 bg-slate-800 hover:bg-[#CC0E21] hover:border-[#CC0E21] hover:text-white text-slate-200 transition-colors flex items-center justify-center gap-1.5"
                            >
                              {isLoadingThis ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin text-white" />
                                  <span>Cargando JSON...</span>
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="h-3.5 w-3.5 text-amber-400" />
                                  <span>Cargar en visor individual</span>
                                </>
                              )}
                            </Button>
                          ) : (
                            <div className="text-[10px] text-center text-slate-500 italic py-1">
                              Análisis aún no publicado en Die Ligen
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ─── PANEL 2: CARGA MANUAL DE JSON LOCAL (RESPALDO / OFFLINE) ────── */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-400" />
              Carga manual de JSON local (Respaldo / Modo Offline)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Si dispones del archivo JSON descargado en disco (ej. J-2 o J-3){club?.nombre ? ` para ${club.nombre}` : ''}{season?.temporada ? ` (${season.temporada})` : ''}, puedes cargarlo directamente aquí sin llamada a la API.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />

            <Button
              type="button"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold py-2 px-3.5 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <UploadCloud className="h-4 w-4 mr-1.5 text-amber-400" />
              {data ? 'Cargar otro JSON local' : 'Cargar JSON local'}
            </Button>
          </div>
        </div>

        {/* Zona Drag & Drop si no hay datos */}
        {!data && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 border-2 border-dashed border-slate-700/80 hover:border-amber-400/60 bg-slate-950/40 hover:bg-amber-400/[0.02] rounded-xl p-6 text-center cursor-pointer transition-all"
          >
            <UploadCloud className="h-8 w-8 text-slate-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">
              Arrastra aquí el archivo JSON o haz clic para seleccionarlo
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Archivos compatibles: JSON original descargado de Die Ligen
            </p>
          </div>
        )}
      </div>

      {/* ─── VISTA DEL INFORME ACUMULADO MULTI-PARTIDO ────────────────────── */}
      {multiData && (
        <DieLigenMultiMatchViewer
          data={multiData}
          onBack={() => setMultiData(null)}
        />
      )}

      {/* Banner de Partido Cargado en Pantalla con botón Exportar PDF */}
      {data && !multiData && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#CC0E21]/20 border border-[#CC0E21]/40 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-[#CC0E21]" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Informe cargado en visor:</div>
              <div className="text-sm font-bold text-white font-mono">{fileName || 'Análisis de partido'}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setData(null);
                setFileName(null);
              }}
              className="text-xs font-medium py-2 px-3 border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              <span>Cerrar informe</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="bg-[#CC0E21] hover:bg-[#b00c1c] text-white font-bold py-2 px-3.5 text-xs flex items-center gap-2 shadow-md shadow-[#CC0E21]/20 border-none"
            >
              {isExportingPdf ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 text-white" />
                  <span>Exportar PDF</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Error de lectura o descarga */}
      {error && (
        <div className="mt-4 bg-red-950/40 border border-red-800/60 rounded-xl p-3.5 flex items-start gap-2.5 text-red-300 text-xs">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ─── VISTA DEL INFORME INDIVIDUAL COMPLETO ────────────────────────── */}
      {data && !multiData && (
        <div className="space-y-6">
          {/* CABECERA DEL PARTIDO */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 font-bold text-amber-400 bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-800/50">
                  <Trophy className="h-3.5 w-3.5" />
                  {data.cabecera.jornada}
                </span>
                <span>{data.cabecera.competicion}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  {data.cabecera.fecha}
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                {data.cabecera.campo}
              </span>
            </div>

            {/* Marcador */}
            <div className="grid grid-cols-3 items-center text-center py-4">
              {/* Local */}
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-red-950/60 border border-red-800 flex items-center justify-center text-lg font-black text-white shadow-inner mb-2">
                  {data.cabecera.local.nombre.slice(0, 3).toUpperCase()}
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white">
                  {data.cabecera.local.nombre}
                </h4>
                <span className="text-[11px] uppercase font-bold tracking-wider text-red-400 mt-0.5">Local</span>
              </div>

              {/* Resultado Central */}
              <div className="flex flex-col items-center">
                <div className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight tabular-nums">
                  {data.cabecera.golesLocal} – {data.cabecera.golesVisitante}
                </div>
                <span className="text-xs text-slate-400 font-medium mt-1">
                  Descanso: {data.cabecera.descansoLocal} – {data.cabecera.descansoVisitante}
                </span>
              </div>

              {/* Visitante */}
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-950/60 border border-blue-800 flex items-center justify-center text-lg font-black text-white shadow-inner mb-2">
                  {data.cabecera.visitante.nombre.slice(0, 3).toUpperCase()}
                </div>
                <h4 className="text-base sm:text-lg font-bold text-white">
                  {data.cabecera.visitante.nombre}
                </h4>
                <span className="text-[11px] uppercase font-bold tracking-wider text-blue-400 mt-0.5">Visitante</span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 1: GOLES */}
          <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#CC0E21]" />
              1. Goles del partido
            </h4>

            {data.goles.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl">
                Sin goles registrados en este partido (0–0).
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.goles.map((g, idx) => {
                  const isLoc = g.esLocal;
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border bg-slate-950/60 transition-all ${
                        isLoc ? 'border-l-4 border-l-red-500 border-slate-800' : 'border-l-4 border-l-blue-500 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/60">
                        <div>
                          <span className={`text-xs font-bold mr-2 ${isLoc ? 'text-red-400' : 'text-blue-400'}`}>
                            {g.minutoFutbolistico}
                          </span>
                          <span className="text-[11px] text-slate-500">({g.tiempoExacto})</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isLoc ? 'bg-red-950/80 text-red-300 border border-red-800/50' : 'bg-blue-950/80 text-blue-300 border border-blue-800/50'
                        }`}>
                          {g.equipoNombre}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                        <span>{g.goleador}</span>
                        {g.esAutogol && (
                          <span className="text-[10px] bg-amber-950 border border-amber-700 text-amber-300 px-1.5 py-0.5 rounded font-bold">
                            Autogol
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-y-1.5 gap-x-3 text-xs text-slate-400">
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Asistencia</span>
                          <span className="text-slate-300">{g.asistente || 'Sin asistencia'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Zona remate</span>
                          <span className="text-slate-300">{g.zona}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Situación</span>
                          <span className="text-slate-300">{g.situacionPrevia}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Carril</span>
                          <span className="text-slate-300">{g.carril}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Tipo jugada</span>
                          <span className="text-slate-300">{g.tipoJugada}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px] uppercase font-semibold">Contraataque</span>
                          <span className="text-slate-300">{g.contraataque ? 'Sí' : 'No'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* SECCIÓN 2: TIROS Y REMATES */}
          <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#CC0E21]" />
              2. Tiros y remates
            </h4>

            {/* Tabla Comparativa */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300 border border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 text-center text-red-400 w-1/4">{data.cabecera.local.nombre}</th>
                    <th className="py-2.5 px-4 text-center w-2/4">Concepto</th>
                    <th className="py-2.5 px-4 text-center text-blue-400 w-1/4">{data.cabecera.visitante.nombre}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  <ComparisonRow valL={data.tiros.local.totalIntentos} label="Intentos totales" valA={data.tiros.visitante.totalIntentos} />
                  <ComparisonRow valL={data.tiros.local.rematesSinGol} label="Remates sin gol" valA={data.tiros.visitante.rematesSinGol} />
                  <ComparisonRow valL={data.tiros.local.goles} label="Goles marcados" valA={data.tiros.visitante.goles} />
                  <ComparisonRow
                    valL={`${data.tiros.local.aPuerta} (${data.tiros.local.pctPuerta})`}
                    label="Tiros a puerta (parados + goles propios)"
                    valA={`${data.tiros.visitante.aPuerta} (${data.tiros.visitante.pctPuerta})`}
                  />
                  <ComparisonRow valL={data.tiros.local.parados} label="Parados por el portero" valA={data.tiros.visitante.parados} />
                  <ComparisonRow
                    valL={`${data.tiros.local.fuera} (${data.tiros.local.pctFuera})`}
                    label="Remates fuera"
                    valA={`${data.tiros.visitante.fuera} (${data.tiros.visitante.pctFuera})`}
                  />
                  <ComparisonRow valL={data.tiros.local.bloqueados} label="Bloqueados por la defensa" valA={data.tiros.visitante.bloqueados} />
                  <ComparisonRow valL={data.tiros.local.alPalo} label="Al palo / travesaño" valA={data.tiros.visitante.alPalo} />
                  <ComparisonRow valL={data.tiros.local.dentroArea} label="Desde dentro del área" valA={data.tiros.visitante.dentroArea} />
                  <ComparisonRow valL={data.tiros.local.fueraArea} label="Desde fuera del área" valA={data.tiros.visitante.fueraArea} />
                  <ComparisonRow valL={data.tiros.local.contraataques} label="Desde contraataque" valA={data.tiros.visitante.contraataques} />
                </tbody>
              </table>
            </div>

            {/* Distribución por carril */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <div className="font-bold text-red-400 mb-2">Distribución por carril — {data.cabecera.local.nombre}</div>
                <div className="space-y-1 text-slate-300">
                  <div>Carril izquierdo: <strong>{data.tiros.local.carriles.izquierda} ({data.tiros.local.carriles.pctIzq})</strong></div>
                  <div>Zona central: <strong>{data.tiros.local.carriles.centro} ({data.tiros.local.carriles.pctCentro})</strong></div>
                  <div>Carril derecho: <strong>{data.tiros.local.carriles.derecha} ({data.tiros.local.carriles.pctDer})</strong></div>
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <div className="font-bold text-blue-400 mb-2">Distribución por carril — {data.cabecera.visitante.nombre}</div>
                <div className="space-y-1 text-slate-300">
                  <div>Carril izquierdo: <strong>{data.tiros.visitante.carriles.izquierda} ({data.tiros.visitante.carriles.pctIzq})</strong></div>
                  <div>Zona central: <strong>{data.tiros.visitante.carriles.centro} ({data.tiros.visitante.carriles.pctCentro})</strong></div>
                  <div>Carril derecho: <strong>{data.tiros.visitante.carriles.derecha} ({data.tiros.visitante.carriles.pctDer})</strong></div>
                </div>
              </div>
            </div>

            {/* Ranking de rematadores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <div className="font-bold text-slate-200 mb-2">Rematadores — {data.cabecera.local.nombre}</div>
                <div className="space-y-1">
                  {data.tiros.local.jugadores.map((j, i) => (
                    <div key={i} className="flex justify-between text-slate-300 border-b border-slate-800/40 pb-1">
                      <span>{j.jugador}</span>
                      <span className="font-bold text-red-400">{j.total}</span>
                    </div>
                  ))}
                  {data.tiros.local.jugadores.length === 0 && <span className="text-slate-500">Sin remates registrados</span>}
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <div className="font-bold text-slate-200 mb-2">Rematadores — {data.cabecera.visitante.nombre}</div>
                <div className="space-y-1">
                  {data.tiros.visitante.jugadores.map((j, i) => (
                    <div key={i} className="flex justify-between text-slate-300 border-b border-slate-800/40 pb-1">
                      <span>{j.jugador}</span>
                      <span className="font-bold text-blue-400">{j.total}</span>
                    </div>
                  ))}
                  {data.tiros.visitante.jugadores.length === 0 && <span className="text-slate-500">Sin remates registrados</span>}
                </div>
              </div>
            </div>

            {/* Cronología de tiros */}
            {data.tiros.cronologia.length > 0 && (
              <div className="pt-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Detalle individual de todos los tiros ({data.tiros.cronologia.length})
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-slate-300 border border-slate-800 rounded-xl overflow-hidden">
                    <thead className="bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-2 px-3 text-left">Min</th>
                        <th className="py-2 px-3 text-left">T. Exacto</th>
                        <th className="py-2 px-3 text-left">Equipo</th>
                        <th className="py-2 px-3 text-left">Jugador</th>
                        <th className="py-2 px-3 text-left">Zona</th>
                        <th className="py-2 px-3 text-left">Resultado</th>
                        <th className="py-2 px-3 text-left">Tipo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                      {data.tiros.cronologia.map((s, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 font-bold text-amber-400">{s.minutoFutbolistico}</td>
                          <td className="py-2 px-3 text-slate-500">{s.tiempoExacto}</td>
                          <td className="py-2 px-3">
                            <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${s.esLocal ? 'bg-red-400' : 'bg-blue-400'}`} />
                            {s.equipoNombre}
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-200">{s.jugador}</td>
                          <td className="py-2 px-3 text-slate-400">{s.zona}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              s.resultadoBadge === 'Gol' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                              s.resultadoBadge === 'Autogol' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                              s.resultadoBadge === 'Remate parado' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                              'bg-slate-800 text-slate-300'
                            }`}>
                              {s.resultadoBadge}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-400">{s.contraataque}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* SECCIÓN 3: CENTROS */}
          <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#CC0E21]" />
              3. Centros al área
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300 border border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 text-center text-red-400 w-1/4">{data.cabecera.local.nombre}</th>
                    <th className="py-2.5 px-4 text-center w-2/4">Concepto</th>
                    <th className="py-2.5 px-4 text-center text-blue-400 w-1/4">{data.cabecera.visitante.nombre}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  <ComparisonRow valL={data.centros.local.total} label="Centros totales" valA={data.centros.visitante.total} />
                  <ComparisonRow valL={data.centros.local.altos} label="Centros altos" valA={data.centros.visitante.altos} />
                  <ComparisonRow valL={data.centros.local.bajos} label="Centros bajos" valA={data.centros.visitante.bajos} />
                  <ComparisonRow valL={data.centros.local.derecha} label="Desde banda derecha" valA={data.centros.visitante.derecha} />
                  <ComparisonRow valL={data.centros.local.izquierda} label="Desde banda izquierda" valA={data.centros.visitante.izquierda} />
                  <ComparisonRow valL={data.centros.local.conRemate} label="Terminan en remate" valA={data.centros.visitante.conRemate} />
                  <ComparisonRow valL={data.centros.local.sinOcasion} label="Sin ocasión registrada" valA={data.centros.visitante.sinOcasion} />
                  <ComparisonRow valL={data.centros.local.contraataques} label="Desde contraataque" valA={data.centros.visitante.contraataques} />
                </tbody>
              </table>
            </div>

            {/* Centradores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <div className="font-bold text-slate-200 mb-2">Centradores — {data.cabecera.local.nombre}</div>
                <div className="space-y-1">
                  {data.centros.local.jugadores.map((j, i) => (
                    <div key={i} className="flex justify-between text-slate-300 border-b border-slate-800/40 pb-1">
                      <span>{j.jugador}</span>
                      <span className="font-bold text-red-400">{j.total}</span>
                    </div>
                  ))}
                  {data.centros.local.jugadores.length === 0 && <span className="text-slate-500">Sin centros registrados</span>}
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <div className="font-bold text-slate-200 mb-2">Centradores — {data.cabecera.visitante.nombre}</div>
                <div className="space-y-1">
                  {data.centros.visitante.jugadores.map((j, i) => (
                    <div key={i} className="flex justify-between text-slate-300 border-b border-slate-800/40 pb-1">
                      <span>{j.jugador}</span>
                      <span className="font-bold text-blue-400">{j.total}</span>
                    </div>
                  ))}
                  {data.centros.visitante.jugadores.length === 0 && <span className="text-slate-500">Sin centros registrados</span>}
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 4: CÓRNERES */}
          <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#CC0E21]" />
              4. Córneres
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300 border border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 text-center text-red-400 w-1/4">{data.cabecera.local.nombre}</th>
                    <th className="py-2.5 px-4 text-center w-2/4">Concepto</th>
                    <th className="py-2.5 px-4 text-center text-blue-400 w-1/4">{data.cabecera.visitante.nombre}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  <ComparisonRow valL={data.corneres.local.total} label="Córneres totales" valA={data.corneres.visitante.total} />
                  <ComparisonRow valL={data.corneres.local.derecha} label="Desde la derecha" valA={data.corneres.visitante.derecha} />
                  <ComparisonRow valL={data.corneres.local.izquierda} label="Desde la izquierda" valA={data.corneres.visitante.izquierda} />
                  <ComparisonRow valL={data.corneres.local.gol} label="Terminan en gol" valA={data.corneres.visitante.gol} />
                  <ComparisonRow valL={data.corneres.local.remate} label="Terminan en otro remate" valA={data.corneres.visitante.remate} />
                  <ComparisonRow valL={data.corneres.local.sinOcasion} label="Sin ocasión" valA={data.corneres.visitante.sinOcasion} />
                </tbody>
              </table>
            </div>

            {/* Lanzadores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <div className="font-bold text-slate-200 mb-2">Lanzadores — {data.cabecera.local.nombre}</div>
                <div className="space-y-1">
                  {data.corneres.local.jugadores.map((j, i) => (
                    <div key={i} className="flex justify-between text-slate-300 border-b border-slate-800/40 pb-1">
                      <span>{j.jugador}</span>
                      <span className="font-bold text-red-400">{j.total}</span>
                    </div>
                  ))}
                  {data.corneres.local.jugadores.length === 0 && <span className="text-slate-500">Sin córneres registrados</span>}
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <div className="font-bold text-slate-200 mb-2">Lanzadores — {data.cabecera.visitante.nombre}</div>
                <div className="space-y-1">
                  {data.corneres.visitante.jugadores.map((j, i) => (
                    <div key={i} className="flex justify-between text-slate-300 border-b border-slate-800/40 pb-1">
                      <span>{j.jugador}</span>
                      <span className="font-bold text-blue-400">{j.total}</span>
                    </div>
                  ))}
                  {data.corneres.visitante.jugadores.length === 0 && <span className="text-slate-500">Sin córneres registrados</span>}
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 5: GOLPES FRANCOS */}
          <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#CC0E21]" />
              5. Golpes francos analizados
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300 border border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 text-center text-red-400 w-1/4">{data.cabecera.local.nombre}</th>
                    <th className="py-2.5 px-4 text-center w-2/4">Concepto</th>
                    <th className="py-2.5 px-4 text-center text-blue-400 w-1/4">{data.cabecera.visitante.nombre}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  <ComparisonRow valL={data.faltas.local.total} label="Golpes francos analizados" valA={data.faltas.visitante.total} />
                  <ComparisonRow valL={data.faltas.local.centros} label="Ejecutados mediante centro" valA={data.faltas.visitante.centros} />
                  <ComparisonRow valL={data.faltas.local.tiros} label="Ejecutados con tiro directo" valA={data.faltas.visitante.tiros} />
                  <ComparisonRow valL={data.faltas.local.pases} label="Ejecutados mediante pase" valA={data.faltas.visitante.pases} />
                </tbody>
              </table>
            </div>
          </section>

          {/* SECCIÓN 6: SAQUES DE PUERTA */}
          <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#CC0E21]" />
              6. Saques de puerta
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300 border border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 text-center text-red-400 w-1/4">{data.cabecera.local.nombre}</th>
                    <th className="py-2.5 px-4 text-center w-2/4">Concepto</th>
                    <th className="py-2.5 px-4 text-center text-blue-400 w-1/4">{data.cabecera.visitante.nombre}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  <ComparisonRow valL={data.saquesPuerta.local.total} label="Saques de puerta totales" valA={data.saquesPuerta.visitante.total} />
                  <ComparisonRow
                    valL={`${data.saquesPuerta.local.cortos} (${data.saquesPuerta.local.pctCortos})`}
                    label="Cortos (salida de balón)"
                    valA={`${data.saquesPuerta.visitante.cortos} (${data.saquesPuerta.visitante.pctCortos})`}
                  />
                  <ComparisonRow
                    valL={`${data.saquesPuerta.local.medios} (${data.saquesPuerta.local.pctMedios})`}
                    label="Medios"
                    valA={`${data.saquesPuerta.visitante.medios} (${data.saquesPuerta.visitante.pctMedios})`}
                  />
                  <ComparisonRow
                    valL={`${data.saquesPuerta.local.largos} (${data.saquesPuerta.local.pctLargos})`}
                    label="Largos / envío directo"
                    valA={`${data.saquesPuerta.visitante.largos} (${data.saquesPuerta.visitante.pctLargos})`}
                  />
                </tbody>
              </table>
            </div>
          </section>

          {/* SECCIÓN 7: SAQUES DE BANDA */}
          <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#CC0E21]" />
              7. Saques de banda
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300 border border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-950 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 text-center text-red-400 w-1/4">{data.cabecera.local.nombre}</th>
                    <th className="py-2.5 px-4 text-center w-2/4">Concepto</th>
                    <th className="py-2.5 px-4 text-center text-blue-400 w-1/4">{data.cabecera.visitante.nombre}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  <ComparisonRow valL={data.saquesBanda.local.total} label="Saques de banda totales" valA={data.saquesBanda.visitante.total} />
                  <ComparisonRow
                    valL={`${data.saquesBanda.local.campoPropio} (${data.saquesBanda.local.pctPropio})`}
                    label="En campo propio"
                    valA={`${data.saquesBanda.visitante.campoPropio} (${data.saquesBanda.visitante.pctPropio})`}
                  />
                  <ComparisonRow
                    valL={`${data.saquesBanda.local.campoRival} (${data.saquesBanda.local.pctRival})`}
                    label="En campo rival"
                    valA={`${data.saquesBanda.visitante.campoRival} (${data.saquesBanda.visitante.pctRival})`}
                  />
                  <ComparisonRow valL={data.saquesBanda.local.generaCentro} label="Generan un centro" valA={data.saquesBanda.visitante.generaCentro} />
                  <ComparisonRow valL={data.saquesBanda.local.sinOcasion} label="Sin ocasión posterior registrada" valA={data.saquesBanda.visitante.sinOcasion} />
                </tbody>
              </table>
            </div>
          </section>

          {/* SECCIÓN 8: FORMACIONES TÁCTICAS */}
          <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 space-y-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#CC0E21]" />
              8. Formaciones tácticas y alineaciones
            </h4>

            {/* Local */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {data.cabecera.local.nombre} — Sistema Ofensivo: {data.formaciones.local.ofensiva.sistemaOfensivo}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SVG del campo */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-center">
                  <FieldSvg players={data.formaciones.local.ofensiva.jugadores} circleColor="#ec140a" />
                </div>

                {/* Tabla de jugadores */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs overflow-y-auto max-h-[340px]">
                  <div className="text-slate-400 mb-2 font-medium">
                    Defensivo: <strong className="text-slate-200">{data.formaciones.local.defensiva.sistemaOfensivo}</strong>
                    {data.formaciones.local.transicion.hayCambioEstructural && (
                      <span className="text-amber-400 block text-[11px] mt-0.5">
                        Transición: {data.formaciones.local.transicion.cambiosPosicion.join(', ')}
                      </span>
                    )}
                  </div>
                  <table className="w-full text-slate-300">
                    <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800 pb-1">
                      <tr>
                        <th className="text-left py-1 w-10">Dorsal</th>
                        <th className="text-left py-1">Jugador</th>
                        <th className="text-right py-1">Puesto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {data.formaciones.local.ofensiva.jugadores.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="py-1.5 font-bold text-red-400">{p.dorsal}</td>
                          <td className="py-1.5 text-slate-200">{p.nombreCompleto}</td>
                          <td className="py-1.5 text-right text-slate-400">{p.posicionEsp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Visitante */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {data.cabecera.visitante.nombre} — Sistema Ofensivo: {data.formaciones.visitante.ofensiva.sistemaOfensivo}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SVG del campo */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-center">
                  <FieldSvg players={data.formaciones.visitante.ofensiva.jugadores} circleColor="#3a56d4" />
                </div>

                {/* Tabla de jugadores */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs overflow-y-auto max-h-[340px]">
                  <div className="text-slate-400 mb-2 font-medium">
                    Defensivo: <strong className="text-slate-200">{data.formaciones.visitante.defensiva.sistemaOfensivo}</strong>
                    {data.formaciones.visitante.transicion.hayCambioEstructural && (
                      <span className="text-amber-400 block text-[11px] mt-0.5">
                        Transición: {data.formaciones.visitante.transicion.cambiosPosicion.join(', ')}
                      </span>
                    )}
                  </div>
                  <table className="w-full text-slate-300">
                    <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800 pb-1">
                      <tr>
                        <th className="text-left py-1 w-10">Dorsal</th>
                        <th className="text-left py-1">Jugador</th>
                        <th className="text-right py-1">Puesto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {data.formaciones.visitante.ofensiva.jugadores.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="py-1.5 font-bold text-blue-400">{p.dorsal}</td>
                          <td className="py-1.5 text-slate-200">{p.nombreCompleto}</td>
                          <td className="py-1.5 text-right text-slate-400">{p.posicionEsp}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// ─── Componentes Auxiliares ───────────────────────────────────────────────────

function ComparisonRow({ valL, label, valA }: { valL: string | number; label: string; valA: string | number }) {
  return (
    <tr className="hover:bg-slate-800/20">
      <td className="py-2 px-4 text-center font-bold text-red-400">{valL}</td>
      <td className="py-2 px-4 text-center text-slate-300 font-medium">{label}</td>
      <td className="py-2 px-4 text-center font-bold text-blue-400">{valA}</td>
    </tr>
  );
}

function FieldSvg({ players, circleColor }: { players: Array<{ dorsal: string | number; apellido: string; cx: number; cy: number; posicionCodigo: string }>; circleColor: string }) {
  return (
    <svg className="w-full max-w-[240px] h-auto drop-shadow-md" viewBox="0 0 220 310" xmlns="http://www.w3.org/2000/svg">
      {/* Césped */}
      <rect width="220" height="310" fill="#153b1b" rx="8" />
      {/* Líneas de campo */}
      <rect x="12" y="12" width="196" height="286" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      <line x1="12" y1="155" x2="208" y2="155" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <circle cx="110" cy="155" r="30" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <rect x="55" y="232" width="110" height="66" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <rect x="78" y="264" width="64" height="34" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      <rect x="55" y="12" width="110" height="66" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <rect x="78" y="12" width="64" height="34" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

      {/* Jugadores */}
      {players.map((p, idx) => {
        const isGk = p.posicionCodigo === 'GK';
        const r = isGk ? 13 : 11;
        const fSize = isGk ? 9 : 8;
        return (
          <g key={idx}>
            <circle cx={p.cx} cy={p.cy} r={r} fill={circleColor} stroke="white" strokeWidth="1.5" />
            <text x={p.cx} y={p.cy + 3.5} textAnchor="middle" fontSize={fSize} fill="white" fontWeight="bold">
              {p.dorsal}
            </text>
            <text x={p.cx} y={p.cy + 15} textAnchor="middle" fontSize="6.5" fill="#e2e8f0" fontWeight="500">
              {p.apellido.slice(0, 10)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
