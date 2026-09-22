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
} from 'lucide-react';
import { getStaffPasskey } from '@/lib/passkey';
import { DieLigueMatchActa } from '@/lib/die-ligen/actas';

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
  const [activeTab, setActiveTab] = useState<'alineaciones' | 'eventos' | 'tactica'>('alineaciones');

  useEffect(() => {
    if (!isOpen || !jornada) return;

    const loadMatchDetail = async () => {
      setLoading(true);
      setError(null);
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
                    <div className="space-y-2">
                      {match.events.map((ev) => (
                        <div key={ev.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono font-bold text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded text-[11px]">
                              {ev.minutoTexto}
                            </span>
                            {ev.tipo === 'GOL' && (
                              <span>
                                ⚽ <strong>{ev.esAutogol ? 'Autogol' : 'Gol'}</strong> de {ev.jugadorPrincipal ? `#${ev.jugadorPrincipal.dorsal} ${ev.jugadorPrincipal.nombre}` : 'Jugador'} ({ev.equipoNombre})
                                {ev.jugadorSecundario && <span className="text-slate-400 ml-1">🅰️ #{ev.jugadorSecundario.dorsal} {ev.jugadorSecundario.nombre}</span>}
                              </span>
                            )}
                            {ev.tipo === 'TARJETA' && (
                              <span>
                                {ev.tipoTarjeta === 'ROJA' ? '🟥' : '🟨'} Tarjeta {ev.tipoTarjeta?.toLowerCase()} para {ev.jugadorPrincipal ? `#${ev.jugadorPrincipal.dorsal} ${ev.jugadorPrincipal.nombre}` : 'Jugador'} ({ev.equipoNombre})
                              </span>
                            )}
                            {ev.tipo === 'SUSTITUCION' && (
                              <span>
                                🔄 Cambio ({ev.equipoNombre}): Entra #{ev.jugadorPrincipal?.dorsal} {ev.jugadorPrincipal?.nombre}, sale #{ev.jugadorSecundario?.dorsal} {ev.jugadorSecundario?.nombre}
                              </span>
                            )}
                          </div>

                          {ev.videoUrl && (
                            <a
                              href={ev.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 text-[10px] font-bold border border-blue-500/20 flex items-center gap-1"
                            >
                              <Play className="w-2.5 h-2.5" /> Clip
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

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
    </div>
  );
}
