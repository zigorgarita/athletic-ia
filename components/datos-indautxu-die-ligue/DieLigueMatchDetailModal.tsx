'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Play,
  Users,
  Shield,
  ArrowRightLeft,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Flame,
  ShieldAlert,
  Swords,
  Check,
} from 'lucide-react';
import { getStaffPasskey } from '@/lib/passkey';
import { DieLigueMatchActa, DieLigueEventActa, DieLigueTacticalEventActa } from '@/lib/die-ligen/actas';
import { DieLigueClipModal } from './DieLigueClipModal';
import { ClipsMergeDrawer } from './ClipsMergeDrawer';

interface DieLigueMatchDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameId?: string;
  jornada?: number;
  homeTeamName?: string;
  awayTeamName?: string;
}

export function DieLigueMatchDetailModal({
  isOpen,
  onClose,
  gameId,
  jornada,
  homeTeamName,
  awayTeamName,
}: DieLigueMatchDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [match, setMatch] = useState<DieLigueMatchActa | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'alineaciones' | 'eventos' | 'tacticos' | 'tactica'>('alineaciones');
  const [activeTacticalTab, setActiveTacticalTab] = useState<'ofensivos' | 'defensivos'>('ofensivos');
  const [offensiveFilter, setOffensiveFilter] = useState<string>('todos');
  const [defensiveFilter, setDefensiveFilter] = useState<string>('todos');
  const [teamFilter, setTeamFilter] = useState<'todos' | 'local' | 'visitante'>('todos');
  const [downloadingEventId, setDownloadingEventId] = useState<string | null>(null);
  const [clipDownloadError, setClipDownloadError] = useState<string | null>(null);
  const [selectedClips, setSelectedClips] = useState<DieLigueTacticalEventActa[]>([]);
  const [selectedClip, setSelectedClip] = useState<{
    videoUrl: string;
    start: number;
    end: number;
    title: string;
    subtitle?: string;
  } | null>(null);

  const handleToggleSelectClip = (clip: DieLigueTacticalEventActa) => {
    setSelectedClips((prev) => {
      const exists = prev.some((c) => c.id === clip.id);
      if (exists) {
        return prev.filter((c) => c.id !== clip.id);
      } else {
        return [...prev, clip];
      }
    });
  };

  const handleRemoveSelectedClip = (clipId: string) => {
    setSelectedClips((prev) => prev.filter((c) => c.id !== clipId));
  };

  const handleMoveSelectedClip = (index: number, direction: 'up' | 'down') => {
    setSelectedClips((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const handleClearSelectedClips = () => {
    setSelectedClips([]);
  };

  const handleDownloadTacticalClip = async (ev: DieLigueTacticalEventActa) => {
    if (!match || !ev.videoUrl || typeof ev.start !== 'number' || typeof ev.end !== 'number') return;
    setDownloadingEventId(ev.id);
    setClipDownloadError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json, video/mp4, */*',
      };
      const staffPasskey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || '';
      if (staffPasskey) headers['x-staff-passkey'] = staffPasskey;

      const res = await fetch('/api/die-ligen/download-clip', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          trimStart: ev.start,
          trimEnd: ev.end,
          homeTeamName: match.homeTeam.name,
          awayTeamName: match.awayTeam.name,
          gameDate: match.fecha,
          videoUrl: ev.videoUrl,
          translatedEventName: ev.nombreTipo,
          gameMinutes: ev.minutoTexto,
        }),
      });

      if (!res.ok) {
        let errMsg = `Error en el servidor al generar clip (HTTP ${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson?.error) errMsg = errJson.error;
        } catch {
          // ignore non-json
        }
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      let filename = `clip_${match.homeTeam.name}_vs_${match.awayTeam.name}_${ev.tipoClave}_min${ev.minuto}.mp4`;
      if (disposition && disposition.includes('filename=')) {
        const matchName = disposition.match(/filename="?([^";]+)"?/);
        if (matchName?.[1]) filename = matchName[1];
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al descargar clip recortado';
      setClipDownloadError(msg);
    } finally {
      setDownloadingEventId(null);
    }
  };

  const handleDownloadNativeClip = async (ev: DieLigueEventActa) => {
    if (!match || !ev.videoUrl || typeof ev.start !== 'number' || typeof ev.end !== 'number') return;
    setDownloadingEventId(ev.id);
    setClipDownloadError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json, video/mp4, */*',
      };
      const staffPasskey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || '';
      if (staffPasskey) headers['x-staff-passkey'] = staffPasskey;

      const res = await fetch('/api/die-ligen/download-clip', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          trimStart: ev.start,
          trimEnd: ev.end,
          homeTeamName: match.homeTeam.name,
          awayTeamName: match.awayTeam.name,
          gameDate: match.fecha,
          videoUrl: ev.videoUrl,
          translatedEventName: ev.tipo === 'GOL' ? 'Gol' : ev.tipo === 'TARJETA' ? 'Tarjeta' : 'Cambio',
          gameMinutes: ev.minutoTexto,
        }),
      });

      if (!res.ok) {
        let errMsg = `Error en el servidor al generar clip (HTTP ${res.status})`;
        try {
          const errJson = await res.json();
          if (errJson?.error) errMsg = errJson.error;
        } catch {
          // ignore non-json
        }
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      let filename = `clip_${match.homeTeam.name}_vs_${match.awayTeam.name}_${ev.tipo.toLowerCase()}_min${ev.minuto}.mp4`;
      if (disposition && disposition.includes('filename=')) {
        const matchName = disposition.match(/filename="?([^";]+)"?/);
        if (matchName?.[1]) filename = matchName[1];
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al descargar clip recortado';
      setClipDownloadError(msg);
    } finally {
      setDownloadingEventId(null);
    }
  };

  const getEventClipTitle = (ev: DieLigueEventActa): string => {
    if (ev.tipo === 'GOL') {
      const actor = ev.jugadorPrincipal ? `#${ev.jugadorPrincipal.dorsal} ${ev.jugadorPrincipal.nombre}` : 'Gol';
      return `⚽ ${ev.esAutogol ? 'Autogol' : 'Gol'} de ${actor} (${ev.minutoTexto})`;
    }
    if (ev.tipo === 'TARJETA') {
      const actor = ev.jugadorPrincipal ? `#${ev.jugadorPrincipal.dorsal} ${ev.jugadorPrincipal.nombre}` : 'Jugador';
      const cardIcon = ev.tipoTarjeta === 'ROJA' ? '🟥' : '🟨';
      return `${cardIcon} Tarjeta ${ev.tipoTarjeta?.toLowerCase()} para ${actor} (${ev.minutoTexto})`;
    }
    if (ev.tipo === 'SUSTITUCION') {
      return `🔄 Cambio (${ev.minutoTexto}): Entra #${ev.jugadorPrincipal?.dorsal ?? ''} ${ev.jugadorPrincipal?.nombre ?? ''}`;
    }
    return `Clip de evento (${ev.minutoTexto})`;
  };

  useEffect(() => {
    if (!isOpen || !jornada) return;

    const loadMatchDetail = async () => {
      setLoading(true);
      setError(null);
      setSelectedClips([]);
      try {
        const headers: Record<string, string> = { Accept: 'application/json' };
        const staffPasskey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || '';
        if (staffPasskey) headers['x-staff-passkey'] = staffPasskey;

        const res = await fetch(`/api/die-ligen/jornada?jornada=${jornada}`, {
          headers,
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (json.success && json.data?.matches) {
          const matches: DieLigueMatchActa[] = json.data.matches;
          const found =
            matches.find((m) => m.id === gameId) ||
            matches.find(
              (m) =>
                (homeTeamName && m.homeTeam.name.toLowerCase().includes(homeTeamName.toLowerCase())) ||
                (awayTeamName && m.awayTeam.name.toLowerCase().includes(awayTeamName.toLowerCase()))
            );

          if (found) {
            setMatch(found);
          } else {
            throw new Error('No se encontró el partido en los datos de la jornada.');
          }
        } else {
          throw new Error(json.error || 'Error al obtener datos');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    loadMatchDetail();
  }, [isOpen, jornada, gameId, homeTeamName, awayTeamName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                  Detalle Die Ligue • Jornada {jornada}
                </span>
                {match?.isFinished ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Finalizado
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-amber-950/80 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Pendiente Die Ligue
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white truncate max-w-md sm:max-w-xl">
                {match ? `${match.homeTeam.name} vs ${match.awayTeam.name}` : `${homeTeamName || 'Local'} vs ${awayTeamName || 'Visitante'}`}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-sm text-slate-300">Descargando telemetría del partido desde Die Ligue...</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-800 text-red-300 text-sm">
              <p className="font-bold">Aviso de consulta:</p>
              <p className="text-xs text-red-200/80 mt-1">{error}</p>
            </div>
          )}

          {!loading && match && (
            <div className="space-y-6">
              {/* Marcador Principal */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  {match.fecha && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(match.fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  {match.hora && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {match.hora}
                    </span>
                  )}
                  {match.campo && (
                    <span className="flex items-center gap-1 truncate max-w-[220px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{match.campo}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-white text-right">{match.homeTeam.name}</span>
                  <div className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-lg font-black text-white">
                    {match.scoreHome ?? '-'} - {match.scoreAway ?? '-'}
                  </div>
                  <span className="text-sm font-bold text-white text-left">{match.awayTeam.name}</span>
                </div>

                {match.mainVideoUrl && (
                  <a
                    href={match.mainVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition-all shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Vídeo Íntegro 1080p</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                )}
              </div>

              {/* Si NO está finished */}
              {!match.isFinished && (
                <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-800/40 text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                  <h3 className="text-sm font-bold text-amber-300">PENDIENTE DIE LIGUE ({match.status})</h3>
                  <p className="text-xs text-amber-200/80 max-w-md mx-auto">
                    Este encuentro no ha completado el análisis y calibración técnica en Die Ligue.
                    No se computan convocatorias ni minutaje definitivos hasta su finalización oficial.
                  </p>
                </div>
              )}

              {/* Si SÍ está finished: Sub-tabs */}
              {match.isFinished && (
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                    <button
                      onClick={() => setActiveTab('alineaciones')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'alineaciones'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" /> Alineaciones y Minutaje
                    </button>
                    <button
                      onClick={() => setActiveTab('eventos')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'eventos'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Cronología ({match.events.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('tacticos')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'tacticos'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <Swords className="w-3.5 h-3.5" /> Clips tácticos ({match.tacticalEvents?.length || 0})
                    </button>
                    <button
                      onClick={() => setActiveTab('tactica')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'tactica'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" /> Pizarra Táctica
                    </button>
                  </div>

                  {activeTab === 'alineaciones' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Local */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-sm font-bold text-white">{match.homeTeam.name}</span>
                          {match.homeTeam.coach && <span className="text-xs text-slate-400">DT: {match.homeTeam.coach}</span>}
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
                            <span>Titulares (11)</span>
                            <span>Minutos</span>
                          </div>
                          {match.homeTeam.players.filter((p) => p.starting).map((p) => (
                            <div key={p.id} className="flex items-center justify-between py-1 px-2 rounded bg-slate-950/60 border border-slate-800/60 text-xs">
                              <span className="text-slate-300">
                                <strong className="text-white font-mono mr-1">#{p.shirtNumber}</strong> {p.playerName}
                                {p.goles > 0 && <span className="ml-1 text-emerald-400">⚽{p.goles > 1 ? p.goles : ''}</span>}
                                {p.asistencias > 0 && <span className="ml-1 text-blue-400">🅰️</span>}
                                {p.tarjetaAmarilla && <span className="ml-1">🟨</span>}
                                {p.tarjetaRoja && <span className="ml-1">🟥</span>}
                              </span>
                              <span className="font-mono text-slate-400">
                                {p.minutoSalida !== null ? `${p.minutosJugados}' (⬇${p.minutoSalida}')` : '90\''}
                              </span>
                            </div>
                          ))}

                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-3 mb-1 flex justify-between">
                            <span>Suplentes</span>
                            <span>Minutos</span>
                          </div>
                          {match.homeTeam.players.filter((p) => !p.starting).map((p) => (
                            <div key={p.id} className="flex items-center justify-between py-1 px-2 rounded bg-slate-950/60 border border-slate-800/60 text-xs">
                              <span className="text-slate-400">
                                <strong className="text-slate-300 font-mono mr-1">#{p.shirtNumber}</strong> {p.playerName}
                                {p.goles > 0 && <span className="ml-1 text-emerald-400">⚽</span>}
                              </span>
                              <span className="font-mono text-slate-400">
                                {p.minutoEntrada !== null ? `${p.minutosJugados}' (⬆${p.minutoEntrada}')` : 'No jugó'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Visitante */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-sm font-bold text-white">{match.awayTeam.name}</span>
                          {match.awayTeam.coach && <span className="text-xs text-slate-400">DT: {match.awayTeam.coach}</span>}
                        </div>
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
                            <span>Titulares (11)</span>
                            <span>Minutos</span>
                          </div>
                          {match.awayTeam.players.filter((p) => p.starting).map((p) => (
                            <div key={p.id} className="flex items-center justify-between py-1 px-2 rounded bg-slate-950/60 border border-slate-800/60 text-xs">
                              <span className="text-slate-300">
                                <strong className="text-white font-mono mr-1">#{p.shirtNumber}</strong> {p.playerName}
                                {p.goles > 0 && <span className="ml-1 text-emerald-400">⚽{p.goles > 1 ? p.goles : ''}</span>}
                                {p.asistencias > 0 && <span className="ml-1 text-blue-400">🅰️</span>}
                                {p.tarjetaAmarilla && <span className="ml-1">🟨</span>}
                                {p.tarjetaRoja && <span className="ml-1">🟥</span>}
                              </span>
                              <span className="font-mono text-slate-400">
                                {p.minutoSalida !== null ? `${p.minutosJugados}' (⬇${p.minutoSalida}')` : '90\''}
                              </span>
                            </div>
                          ))}

                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-3 mb-1 flex justify-between">
                            <span>Suplentes</span>
                            <span>Minutos</span>
                          </div>
                          {match.awayTeam.players.filter((p) => !p.starting).map((p) => (
                            <div key={p.id} className="flex items-center justify-between py-1 px-2 rounded bg-slate-950/60 border border-slate-800/60 text-xs">
                              <span className="text-slate-400">
                                <strong className="text-slate-300 font-mono mr-1">#{p.shirtNumber}</strong> {p.playerName}
                                {p.goles > 0 && <span className="ml-1 text-emerald-400">⚽</span>}
                              </span>
                              <span className="font-mono text-slate-400">
                                {p.minutoEntrada !== null ? `${p.minutosJugados}' (⬆${p.minutoEntrada}')` : 'No jugó'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'eventos' && (
                    <div className="space-y-3">
                      {clipDownloadError && (
                        <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center justify-between">
                          <span>{clipDownloadError}</span>
                          <button
                            onClick={() => setClipDownloadError(null)}
                            className="text-red-400 hover:text-white ml-2 text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      )}

                      {match.events.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-4 text-center">
                          No hay eventos registrados en este partido.
                        </p>
                      ) : (
                        match.events.map((ev) => (
                          <div
                            key={ev.id}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono font-bold text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded text-[11px] shrink-0">
                                {ev.minutoTexto}
                              </span>
                              {ev.tipo === 'GOL' && (
                                <span className="truncate">
                                  ⚽ <strong>{ev.esAutogol ? 'Autogol' : 'Gol'}</strong> de {ev.jugadorPrincipal ? `#${ev.jugadorPrincipal.dorsal} ${ev.jugadorPrincipal.nombre}` : 'Jugador'} ({ev.equipoNombre})
                                  {ev.jugadorSecundario && <span className="text-slate-400 ml-1">🅰️ #{ev.jugadorSecundario.dorsal} {ev.jugadorSecundario.nombre}</span>}
                                </span>
                              )}
                              {ev.tipo === 'TARJETA' && (
                                <span className="truncate">
                                  {ev.tipoTarjeta === 'ROJA' ? '🟥' : '🟨'} Tarjeta {ev.tipoTarjeta?.toLowerCase()} para {ev.jugadorPrincipal ? `#${ev.jugadorPrincipal.dorsal} ${ev.jugadorPrincipal.nombre}` : 'Jugador'} ({ev.equipoNombre})
                                </span>
                              )}
                              {ev.tipo === 'SUSTITUCION' && (
                                <span className="truncate">
                                  🔄 Cambio ({ev.equipoNombre}): Entra #{ev.jugadorPrincipal?.dorsal} {ev.jugadorPrincipal?.nombre}, sale #{ev.jugadorSecundario?.dorsal} {ev.jugadorSecundario?.nombre}
                                </span>
                              )}
                            </div>

                            {Boolean(
                              ev.videoUrl &&
                              typeof ev.start === 'number' &&
                              typeof ev.end === 'number' &&
                              ev.end > ev.start
                            ) && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedClip({
                                      videoUrl: ev.videoUrl!,
                                      start: ev.start!,
                                      end: ev.end!,
                                      title: getEventClipTitle(ev),
                                      subtitle: `${match.homeTeam.name} vs ${match.awayTeam.name} • Jornada ${jornada}`,
                                    })
                                  }
                                  className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 text-[10px] font-bold border border-blue-500/20 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Ver clip instantáneo en reproductor"
                                >
                                  <Play className="w-2.5 h-2.5" /> Ver clip
                                </button>

                                <button
                                  type="button"
                                  disabled={downloadingEventId === ev.id}
                                  onClick={() => handleDownloadNativeClip(ev)}
                                  className="px-2 py-0.5 rounded bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 disabled:opacity-50 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Descargar archivo MP4 recortado oficial de Die Ligue"
                                >
                                  {downloadingEventId === ev.id ? (
                                    <>
                                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                      <span>Generando...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-2.5 h-2.5" />
                                      <span>Descargar clip</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'tacticos' && (() => {
                    const allTactical = match.tacticalEvents || [];
                    const teamFiltered =
                      teamFilter === 'todos'
                        ? allTactical
                        : teamFilter === 'local'
                        ? allTactical.filter((e) => e.esLocal)
                        : allTactical.filter((e) => !e.esLocal);

                    const offensiveEvents = teamFiltered.filter((e) => e.esOfensivo);
                    const defensiveEvents = teamFiltered.filter((e) => !e.esOfensivo);

                    const offensiveFilterOptions = [
                      { key: 'todos', label: 'Todos', count: offensiveEvents.length },
                      { key: 'tiros', label: 'Tiros', count: offensiveEvents.filter((e) => e.tipoClave === 'tiros').length },
                      { key: 'ocasiones', label: 'Ocasiones', count: offensiveEvents.filter((e) => e.tipoClave === 'ocasiones').length },
                      { key: 'centros', label: 'Centros', count: offensiveEvents.filter((e) => e.tipoClave === 'centros').length },
                      { key: 'corneres', label: 'Córneres', count: offensiveEvents.filter((e) => e.tipoClave === 'corneres').length },
                      { key: 'faltas', label: 'Faltas', count: offensiveEvents.filter((e) => e.tipoClave === 'faltas').length },
                      { key: 'penaltis', label: 'Penaltis', count: offensiveEvents.filter((e) => e.tipoClave === 'penaltis').length },
                      { key: 'saques_puerta', label: 'Saques de puerta', count: offensiveEvents.filter((e) => e.tipoClave === 'saques_puerta').length },
                    ];

                    const defensiveFilterOptions = [
                      { key: 'todos', label: 'Todos', count: defensiveEvents.length },
                      { key: 'tiros', label: 'Tiros recibidos', count: defensiveEvents.filter((e) => e.tipoClave === 'tiros').length },
                      { key: 'ocasiones', label: 'Ocasiones rival', count: defensiveEvents.filter((e) => e.tipoClave === 'ocasiones').length },
                      { key: 'centros', label: 'Centros recibidos', count: defensiveEvents.filter((e) => e.tipoClave === 'centros').length },
                      { key: 'corneres', label: 'Córneres', count: defensiveEvents.filter((e) => e.tipoClave === 'corneres').length },
                      { key: 'faltas', label: 'Faltas', count: defensiveEvents.filter((e) => e.tipoClave === 'faltas').length },
                      { key: 'penaltis', label: 'Penaltis', count: defensiveEvents.filter((e) => e.tipoClave === 'penaltis').length },
                      { key: 'saques_puerta', label: 'Saques de puerta rival', count: defensiveEvents.filter((e) => e.tipoClave === 'saques_puerta').length },
                    ];

                    const currentEvents =
                      activeTacticalTab === 'ofensivos'
                        ? offensiveFilter === 'todos'
                          ? offensiveEvents
                          : offensiveEvents.filter((e) => e.tipoClave === offensiveFilter)
                        : defensiveFilter === 'todos'
                        ? defensiveEvents
                        : defensiveEvents.filter((e) => e.tipoClave === defensiveFilter);

                    return (
                      <div className="space-y-4">
                        {clipDownloadError && (
                          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center justify-between">
                            <span>{clipDownloadError}</span>
                            <button
                              onClick={() => setClipDownloadError(null)}
                              className="text-red-400 hover:text-white ml-2 text-xs font-bold cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        )}

                        {/* Sub-subpestañas: Ofensivos | Defensivos */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTacticalTab('ofensivos');
                                setOffensiveFilter('todos');
                              }}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                activeTacticalTab === 'ofensivos'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              <Flame className="w-3.5 h-3.5 text-amber-400" />
                              <span>Ofensivos</span>
                              <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-amber-400 text-[10px] font-mono border border-slate-800">
                                {offensiveEvents.length}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveTacticalTab('defensivos');
                                setDefensiveFilter('todos');
                              }}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                activeTacticalTab === 'defensivos'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm shadow-blue-500/10'
                                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                              <span>Defensivos</span>
                              <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-blue-400 text-[10px] font-mono border border-slate-800">
                                {defensiveEvents.length}
                              </span>
                            </button>
                          </div>

                          <span className="text-[11px] text-slate-500 italic">
                            {activeTacticalTab === 'ofensivos'
                              ? 'Eventos ofensivos con corte de clip Die Ligue'
                              : 'Acciones defensivas y del rival analizadas'}
                          </span>
                        </div>

                        {/* Filtro por equipo: Todos | Equipo local | Equipo visitante */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-slate-400 font-medium mr-1">Equipo:</span>
                          <button
                            type="button"
                            onClick={() => setTeamFilter('todos')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                              teamFilter === 'todos'
                                ? 'bg-slate-700 text-white font-bold shadow-sm'
                                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            onClick={() => setTeamFilter('local')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                              teamFilter === 'local'
                                ? 'bg-slate-700 text-white font-bold shadow-sm'
                                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                            title={match.homeTeam.name}
                          >
                            Equipo local ({match.homeTeam.name})
                          </button>
                          <button
                            type="button"
                            onClick={() => setTeamFilter('visitante')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 cursor-pointer ${
                              teamFilter === 'visitante'
                                ? 'bg-slate-700 text-white font-bold shadow-sm'
                                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                            title={match.awayTeam.name}
                          >
                            Equipo visitante ({match.awayTeam.name})
                          </button>
                        </div>

                        {/* Filtros rápidos Ofensivos */}
                        {activeTacticalTab === 'ofensivos' && (
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                            {offensiveFilterOptions.map((opt) => (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => setOffensiveFilter(opt.key)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                                  offensiveFilter === opt.key
                                    ? 'bg-amber-500 text-slate-950 font-bold'
                                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <span>{opt.label}</span>
                                <span
                                  className={`text-[10px] font-mono px-1 rounded ${
                                    offensiveFilter === opt.key
                                      ? 'bg-slate-950/20 text-slate-950'
                                      : 'bg-slate-900 text-slate-400'
                                  }`}
                                >
                                  {opt.count}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Filtros rápidos Defensivos */}
                        {activeTacticalTab === 'defensivos' && (
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                            {defensiveFilterOptions.map((opt) => (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => setDefensiveFilter(opt.key)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                                  defensiveFilter === opt.key
                                    ? 'bg-blue-500 text-slate-950 font-bold'
                                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <span>{opt.label}</span>
                                <span
                                  className={`text-[10px] font-mono px-1 rounded ${
                                    defensiveFilter === opt.key
                                      ? 'bg-slate-950/20 text-slate-950'
                                      : 'bg-slate-900 text-slate-400'
                                  }`}
                                >
                                  {opt.count}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Lista de eventos tácticos */}
                        <div className="space-y-2">
                          {currentEvents.length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-6 text-center bg-slate-950/40 rounded-xl border border-slate-900">
                              No hay clips registrados en esta categoría para este partido.
                            </p>
                          ) : (
                            currentEvents.map((ev) => {
                              const isSelected = selectedClips.some((c) => c.id === ev.id);
                              return (
                                <div
                                  key={ev.id}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                                    isSelected
                                      ? 'bg-amber-950/20 border-amber-500/50 shadow-sm shadow-amber-500/5'
                                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {/* Checkbox discreto para selección múltiple */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleSelectClip(ev);
                                      }}
                                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                        isSelected
                                          ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-xs'
                                          : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-transparent'
                                      }`}
                                      title={
                                        isSelected
                                          ? 'Deseleccionar clip'
                                          : 'Seleccionar clip para recopilatorio'
                                      }
                                    >
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </button>

                                    <span
                                      className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] shrink-0 border ${
                                        ev.esOfensivo
                                          ? 'text-amber-400 bg-amber-950/40 border-amber-900/40'
                                          : 'text-blue-400 bg-blue-950/40 border-blue-900/40'
                                      }`}
                                    >
                                      {ev.minutoTexto}
                                    </span>

                                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                      <span className="font-semibold text-white truncate shrink-0">
                                        {ev.nombreTipo}
                                      </span>

                                      {ev.jugadorPrincipal && (
                                        <span className="text-slate-300 truncate">
                                          <strong className="font-mono text-slate-100 mr-1">
                                            #{ev.jugadorPrincipal.dorsal}
                                          </strong>
                                          {ev.jugadorPrincipal.nombre}
                                        </span>
                                      )}

                                      <span className="text-[11px] text-slate-400 shrink-0">
                                        ({ev.equipoNombre})
                                      </span>

                                      {ev.labels.length > 0 && (
                                        <div className="flex items-center gap-1 flex-wrap">
                                          {ev.labels.map((lbl) => (
                                            <span
                                              key={lbl}
                                              className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 text-[10px] border border-slate-800 font-medium"
                                            >
                                              {lbl}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedClip({
                                          videoUrl: ev.videoUrl,
                                          start: ev.start,
                                          end: ev.end,
                                          title: `${ev.nombreTipo} ${
                                            ev.jugadorPrincipal
                                              ? `- #${ev.jugadorPrincipal.dorsal} ${ev.jugadorPrincipal.nombre}`
                                              : ''
                                          } (${ev.minutoTexto})`,
                                          subtitle: `${match.homeTeam.name} vs ${match.awayTeam.name} • Jornada ${jornada}`,
                                        })
                                      }
                                      className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 text-[10px] font-bold border border-blue-500/20 flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Ver clip instantáneo en reproductor"
                                    >
                                      <Play className="w-2.5 h-2.5" /> Ver clip
                                    </button>

                                    <button
                                      type="button"
                                      disabled={downloadingEventId === ev.id}
                                      onClick={() => handleDownloadTacticalClip(ev)}
                                      className="px-2 py-0.5 rounded bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 disabled:opacity-50 text-[10px] font-bold border border-emerald-500/20 flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Descargar archivo MP4 recortado oficial de Die Ligue"
                                    >
                                      {downloadingEventId === ev.id ? (
                                        <>
                                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                          <span>Generando...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Download className="w-2.5 h-2.5" />
                                          <span>Descargar clip</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Bandeja de unión y compilación de clips seleccionados */}
                        <ClipsMergeDrawer
                          match={match}
                          selectedClips={selectedClips}
                          onRemoveClip={handleRemoveSelectedClip}
                          onMoveClip={handleMoveSelectedClip}
                          onClearSelection={handleClearSelectedClips}
                        />
                      </div>
                    );
                  })()}

                  {activeTab === 'tactica' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <h4 className="text-xs font-bold text-slate-300 uppercase mb-2">{match.homeTeam.name}</h4>
                        <p className="text-sm font-extrabold text-blue-400 font-mono">
                          Formación: {match.homeTeam.formation || '4-4-2'}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                        <h4 className="text-xs font-bold text-slate-300 uppercase mb-2">{match.awayTeam.name}</h4>
                        <p className="text-sm font-extrabold text-blue-400 font-mono">
                          Formación: {match.awayTeam.formation || '4-4-2'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Interno de Reproducción de Clip por Tramo [start, end] */}
      {selectedClip && (
        <DieLigueClipModal
          isOpen={true}
          onClose={() => setSelectedClip(null)}
          videoUrl={selectedClip.videoUrl}
          start={selectedClip.start}
          end={selectedClip.end}
          title={selectedClip.title}
          subtitle={selectedClip.subtitle}
          onDownload={() => {
            const targetEv = match?.events.find(
              (e) => e.start === selectedClip.start && e.end === selectedClip.end
            );
            if (targetEv) {
              handleDownloadNativeClip(targetEv);
            }
          }}
          isDownloading={Boolean(downloadingEventId)}
        />
      )}
    </div>
  );
}
