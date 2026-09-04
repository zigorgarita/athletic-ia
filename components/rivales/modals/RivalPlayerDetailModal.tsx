'use client';

import React, { useState } from 'react';
import { ClubPlayer } from '@/hooks/useClubPlayers';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Ruler,
  User,
  Shield,
  Activity,
  FileText,
  Clock,
  Target,
  AlertTriangle,
  Flame,
  Edit
} from 'lucide-react';

interface RivalPlayerDetailModalProps {
  player: ClubPlayer | null;
  isOpen: boolean;
  onClose: () => void;
  clubName?: string;
  onEdit?: (player: ClubPlayer) => void;
  isEditMode?: boolean;
}

export function RivalPlayerDetailModal({
  player,
  isOpen,
  onClose,
  clubName,
  onEdit,
  isEditMode = false,
}: RivalPlayerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'participacion' | 'scouting'>('participacion');

  if (!player) return null;

  // Cálculo de edad
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

  const pos = (player.posicion || '').toLowerCase();
  const isPortero = pos.includes('portero');
  const hasRealParticipation = player.partidos_jugados !== undefined && player.partidos_jugados !== null;

  // Badge de origen
  const getSourceBadge = () => {
    const orig = player.origen || 'manual';
    if (orig === 'die_ligen') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-950/70 text-purple-300 border border-purple-800/40">
          Fuente: Die Ligen
        </span>
      );
    }
    if (orig === 'combinado') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-950/70 text-teal-300 border border-teal-800/40">
          Fuente: Combinada (Manual + Die Ligen)
        </span>
      );
    }
    if (orig === 'documento' || orig === 'fvf') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-950/70 text-sky-300 border border-sky-800/40">
          Fuente: Documento / Alineación
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
        Fuente: Manual
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={player.nombre ? `Ficha Jugador: ${player.nombre}` : 'Ficha del Jugador'}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6 -mt-2">
        {/* Cabecera de identidad del jugador rival */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-5 bg-slate-900/60 rounded-2xl border border-slate-800 relative overflow-hidden">
          {/* Fondo sutil */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full blur-3xl pointer-events-none" />

          {/* Fotografía o Avatar de Iniciales */}
          <div className="relative shrink-0">
            {player.foto_url ? (
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border-2 border-slate-700 shadow-xl bg-slate-950">
                <img
                  src={player.foto_url}
                  alt={player.nombre}
                  className="h-full w-full object-cover object-top"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = `<div class="h-full w-full flex items-center justify-center bg-slate-800 text-slate-200 font-extrabold text-2xl">${getInitials(player.nombre)}</div>`;
                    }
                  }}
                />
              </div>
            ) : (
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-2 border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-200 font-black text-3xl shadow-xl">
                {getInitials(player.nombre)}
              </div>
            )}

            {/* Dorsal */}
            {player.dorsal !== null && player.dorsal !== undefined && player.dorsal > 0 ? (
              <div className="absolute -bottom-2 -right-2 bg-slate-950 border border-slate-600 text-white font-extrabold h-8 w-8 rounded-xl flex items-center justify-center text-xs shadow-lg tabular-nums">
                #{player.dorsal}
              </div>
            ) : (
              <div className="absolute -bottom-2 -right-2 bg-slate-950/90 border border-slate-800 text-slate-500 font-semibold h-8 w-8 rounded-xl flex items-center justify-center text-xs">
                #-
              </div>
            )}
          </div>

          {/* Datos principales */}
          <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {getSourceBadge()}
              {clubName && (
                <span className="text-xs text-slate-400 font-medium bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800">
                  {clubName}
                </span>
              )}
            </div>

            <h2 className="text-2xl font-extrabold text-white tracking-tight break-words">
              {player.nombre}
            </h2>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
              <Badge variant="default" className="bg-slate-800 text-slate-200 border-slate-700 text-xs px-2.5 py-0.5 font-bold">
                {player.posicion || 'Sin Posición'}
              </Badge>
              {age !== null ? (
                <span className="text-xs text-slate-300 font-medium">
                  {age} años {player.fecha_nacimiento && <span className="text-slate-500">({new Date(player.fecha_nacimiento).toLocaleDateString('es-ES')})</span>}
                </span>
              ) : (
                <span className="text-xs text-slate-500 italic">
                  Edad no registrada
                </span>
              )}
            </div>

            {/* Datos biológicos / físicos */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5 text-slate-500" />
                <span>Altura: <strong className="text-slate-200">{player.altura ? `${player.altura} m` : 'Sin datos'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span>Peso: <strong className="text-slate-200">{player.peso ? `${player.peso} kg` : 'Sin datos'}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-slate-500" />
                <span>Pierna: <strong className="text-slate-200">{player.pierna_dominante || 'Sin datos'}</strong></span>
              </div>
            </div>
          </div>

          {/* Botón de edición en cabecera si está en edit mode */}
          {isEditMode && onEdit && (
            <Button
              variant="secondary"
              onClick={() => {
                onClose();
                onEdit(player);
              }}
              className="shrink-0 text-xs flex items-center gap-1.5 self-center sm:self-start"
            >
              <Edit className="h-3.5 w-3.5" />
              Editar Ficha
            </Button>
          )}
        </div>

        {/* Pestañas internas del modal */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('participacion')}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'participacion'
                ? 'border-[#CC0E21] text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="h-4 w-4 text-[#CC0E21]" />
            Participación y Minutos
          </button>
          <button
            onClick={() => setActiveTab('scouting')}
            className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'scouting'
                ? 'border-[#CC0E21] text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4 text-amber-500" />
            Scouting y Notas del Míster
          </button>
        </div>

        {/* CONTENIDO TAB 1: PARTICIPACIÓN */}
        {activeTab === 'participacion' && (
          <div className="space-y-6">
              {/* Tarjetas KPI de Participación */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Métricas Acumuladas
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Partidos Jugados */}
                  <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Partidos Jugados</div>
                    <div className={`text-xl font-bold mt-1 tabular-nums ${hasRealParticipation ? 'text-white' : 'text-slate-400 font-semibold'}`}>
                      {hasRealParticipation ? player.partidos_jugados : 'Sin datos'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Disponibles: {hasRealParticipation && player.partidos_disponibles != null ? player.partidos_disponibles : 'Sin datos'}
                    </div>
                  </div>

                  {/* Titularidades / Suplencias */}
                  <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Titular / Suplente</div>
                    <div className={`text-xl font-bold mt-1 tabular-nums ${hasRealParticipation ? 'text-white' : 'text-slate-400 font-semibold'}`}>
                      {hasRealParticipation ? (
                        <>
                          {player.titularidades ?? 0} <span className="text-xs text-slate-500 font-normal">/ {player.entradas_banquillo ?? 0}</span>
                        </>
                      ) : (
                        '— / —'
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Partidos completos: {hasRealParticipation && player.partidos_completos != null ? player.partidos_completos : 'Sin datos'}
                    </div>
                  </div>

                  {/* Minutos Jugados */}
                  <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Minutos Jugados</div>
                    <div className={`text-xl font-bold mt-1 tabular-nums ${hasRealParticipation ? 'text-white' : 'text-slate-400 font-semibold'}`}>
                      {hasRealParticipation ? `${player.minutos_jugados}'` : 'Sin datos'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Posibles: {hasRealParticipation && player.minutos_posibles != null ? `${player.minutos_posibles}'` : 'Sin datos'}
                    </div>
                  </div>

                  {/* % Participación */}
                  <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">% Participación</div>
                    <div className={`text-xl font-bold mt-1 tabular-nums ${hasRealParticipation ? 'text-white' : 'text-slate-400 font-semibold'}`}>
                      {hasRealParticipation && player.porcentaje_participacion != null ? `${player.porcentaje_participacion}%` : 'Sin datos'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Minuto cambio: {hasRealParticipation && player.minuto_habitual_cambio ? player.minuto_habitual_cambio : 'Sin datos'}
                    </div>
                  </div>

                  {/* Goles */}
                  <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Goles Marcados</div>
                    <div className={`text-xl font-bold mt-1 tabular-nums ${hasRealParticipation ? 'text-white' : 'text-slate-400 font-semibold'}`}>
                      {hasRealParticipation ? (player.goles ?? 0) : 'Sin datos'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {isPortero ? 'Goles a favor' : 'En la competición'}
                    </div>
                  </div>

                  {/* Tarjetas */}
                  <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase">Tarjetas</div>
                    <div className="text-sm font-bold text-white mt-1 tabular-nums flex items-center gap-2">
                      {hasRealParticipation ? (
                        <>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-3.5 bg-yellow-400 rounded-sm inline-block" />
                            {player.tarjetas_amarillas || 0}
                          </span>
                          <span className="text-slate-600">·</span>
                          <span className="inline-flex items-center gap-1">
                            <span className="w-2.5 h-3.5 bg-red-600 rounded-sm inline-block" />
                            {player.tarjetas_rojas || 0}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400 font-semibold">— / —</span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Amarillas y Rojas
                    </div>
                  </div>

                  {/* Métricas específicas si es Portero */}
                  {isPortero && (
                    <>
                      <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase">Goles Encajados</div>
                        <div className={`text-xl font-bold mt-1 tabular-nums ${hasRealParticipation ? 'text-white' : 'text-slate-400 font-semibold'}`}>
                          {hasRealParticipation ? (player.goles_encajados ?? 0) : 'Sin datos'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Estando en el campo
                        </div>
                      </div>

                      <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase">Porterías a Cero</div>
                        <div className={`text-xl font-bold mt-1 tabular-nums ${hasRealParticipation ? 'text-white' : 'text-slate-400 font-semibold'}`}>
                          {hasRealParticipation ? (player.porterias_cero ?? 0) : 'Sin datos'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Partidos sin encajar
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bloque Últimas 5-6 Jornadas */}
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Últimas 5-6 Jornadas
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    T = Titular · S = Suplente · NC = No convocado · SD = Sin datos
                  </span>
                </div>

                {player.ultimas_jornadas && player.ultimas_jornadas.length > 0 ? (
                  <div className="flex gap-2">
                    {player.ultimas_jornadas.map((j, idx) => (
                      <div
                        key={idx}
                        className="flex-1 text-center p-2 rounded-lg bg-slate-950 border border-slate-800"
                      >
                        <div className="text-[10px] font-bold text-slate-500">J{j.jornada}</div>
                        <div className={`text-sm font-extrabold mt-1 ${
                          j.estado === 'T' ? 'text-emerald-400' :
                          j.estado === 'S' ? 'text-amber-400' :
                          j.estado === 'NC' ? 'text-red-400' : 'text-slate-600'
                        }`}>
                          {j.estado}
                        </div>
                        {j.minutos !== undefined && (
                          <div className="text-[9px] text-slate-500 tabular-nums">{j.minutos}&apos;</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 bg-slate-950/50 rounded-lg border border-slate-800/60 text-slate-500 text-xs">
                    Aún no hay partidos sincronizados con datos de participación.
                  </div>
                )}
              </div>

            {/* Historial Jornada a Jornada */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Historial de Partidos
              </h4>

              {player.historial_partidos && player.historial_partidos.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Jornada</th>
                        <th className="p-3">Partido</th>
                        <th className="p-3">Rol</th>
                        <th className="p-3">Minutos</th>
                        <th className="p-3">Posición</th>
                        <th className="p-3">{isPortero ? 'Encajados' : 'Goles'}</th>
                        <th className="p-3">Tarjetas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {player.historial_partidos.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="p-3 font-semibold">J{h.jornada}</td>
                          <td className="p-3">{h.partido}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              h.titular ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                            }`}>
                              {h.titular ? 'Titular' : 'Suplente'}
                            </span>
                          </td>
                          <td className="p-3 tabular-nums">{h.minutos}&apos;</td>
                          <td className="p-3">{h.posicion || '—'}</td>
                          <td className="p-3 tabular-nums">{isPortero ? (h.goles_encajados ?? 0) : (h.goles ?? 0)}</td>
                          <td className="p-3">
                            {(h.tarjetas_amarillas || 0) > 0 && <span>🟨 </span>}
                            {(h.tarjetas_rojas || 0) > 0 && <span>🟥 </span>}
                            {!(h.tarjetas_amarillas || 0) && !(h.tarjetas_rojas || 0) && '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-950/40 rounded-xl border border-slate-800/80 p-6">
                  <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">
                    Historial jornada a jornada sin registros aún
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Se completará automáticamente al vincular las alineaciones y actas oficiales recibidas desde Die Ligen.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTENIDO TAB 2: SCOUTING DEL MÍSTER */}
        {activeTab === 'scouting' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">
                Información táctica introducida por el cuerpo técnico (Aitor / Analistas).
              </span>
              {isEditMode && onEdit && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    onClose();
                    onEdit(player);
                  }}
                  className="text-xs text-[#CC0E21] hover:text-red-400"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Modificar notas
                </Button>
              )}
            </div>

            {/* Perfil general */}
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Target className="h-4 w-4 text-blue-400" />
                Características Principales
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {player.caracteristicas?.trim() || (
                  <span className="text-slate-600 italic">Sin características registradas.</span>
                )}
              </p>
            </div>

            {/* Fortalezas y Debilidades */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900/50 rounded-xl border border-emerald-950/50 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <Flame className="h-4 w-4 text-emerald-400" />
                  Puntos Fuertes / Fortalezas
                </div>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {player.fortalezas?.trim() || (
                    <span className="text-slate-600 italic">Sin fortalezas registradas.</span>
                  )}
                </p>
              </div>

              <div className="p-4 bg-slate-900/50 rounded-xl border border-amber-950/50 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Debilidades / Áreas a Explotar
                </div>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {player.debilidades?.trim() || (
                    <span className="text-slate-600 italic">Sin debilidades registradas.</span>
                  )}
                </p>
              </div>
            </div>

            {/* Observaciones adicionales */}
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <FileText className="h-4 w-4 text-slate-400" />
                Observaciones Adicionales
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {player.observaciones?.trim() || (
                  <span className="text-slate-600 italic">Sin observaciones adicionales.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Pie del modal */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
