'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Target, RefreshCw, Loader2 } from 'lucide-react';
import { getStaffPasskey } from '@/lib/passkey';
import { DieLigenTimelineEvent, DieLigenTimelineResult } from '@/lib/die-ligen/client';

interface DieLigenTimelineProps {
  jornada: number;
  isOfficialMatch?: boolean;
}

export function DieLigenTimeline({ jornada, isOfficialMatch = true }: DieLigenTimelineProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [result, setResult] = useState<DieLigenTimelineResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTimeline() {
      // Si no es partido oficial, no consultar Die Ligen
      if (!isOfficialMatch) {
        if (isMounted) {
          setLoading(false);
          setResult({
            available: false,
            jornada,
            reason: 'Solo disponible para partidos oficiales de liga.',
          });
        }
        return;
      }

      setLoading(true);

      try {
        const headers: Record<string, string> = {
          Accept: 'application/json',
        };

        // Enviar clave de staff del cuerpo técnico según el estándar de la app
        const staffPasskey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || '';
        if (staffPasskey) {
          headers['x-staff-passkey'] = staffPasskey;
        }

        const res = await fetch(`/api/die-ligen/timeline?jornada=${jornada}`, {
          method: 'GET',
          headers,
          cache: 'no-store',
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `HTTP ${res.status}`);
        }

        const json = await res.json();
        if (isMounted) {
          if (json.success && json.data) {
            setResult(json.data);
          } else {
            setResult({
              available: false,
              jornada,
              reason: json.error || 'Respuesta vacía de Die Ligen',
            });
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Error al conectar con Die Ligen';
          setResult({
            available: false,
            jornada,
            reason: msg,
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadTimeline();

    return () => {
      isMounted = false;
    };
  }, [jornada, isOfficialMatch]);

  // Si está cargando
  if (loading) {
    return (
      <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
          <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-slate-400" />
            Línea Temporal de Eventos
          </h4>
          <span className="text-[9px] font-bold text-amber-400/90 bg-amber-950/30 px-2.5 py-0.5 rounded-full border border-amber-800/40 uppercase tracking-wider flex items-center gap-1.5">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />
            DIE LIGEN · Conectando...
          </span>
        </div>

        <div className="p-8 text-center text-slate-500 space-y-3 bg-slate-950/20 border border-dashed border-slate-800/80 rounded-xl animate-pulse">
          <Activity className="h-7 w-7 text-slate-700 mx-auto" />
          <p className="text-xs font-bold text-slate-400">Consultando análisis oficial en Die Ligen...</p>
          <p className="text-[11px] text-slate-600">Sincronizando cronología de la Jornada {jornada}.</p>
        </div>
      </div>
    );
  }

  // Si no está disponible en Die Ligen o hubo error (ej. J2 pendiente de jugarse o sin análisis)
  if (!result || !result.available || !result.events || result.events.length === 0) {
    return (
      <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
          <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-slate-400" />
            Línea Temporal de Eventos
          </h4>
          <span className="text-[9px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 uppercase tracking-wider">
            DIE LIGEN · Pendiente conexión
          </span>
        </div>

        <div className="p-8 text-center text-slate-500 space-y-3 bg-slate-950/20 border border-dashed border-slate-800/80 rounded-xl">
          <Activity className="h-8 w-8 text-slate-700 mx-auto" />
          <div className="max-w-md mx-auto space-y-1">
            <h5 className="text-xs font-bold text-slate-300">Registro de Eventos en Tiempo Real</h5>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {result?.reason ||
                'Espacio reservado para la sincronización automática de goles, tarjetas, sustituciones e incidencias cronológicas a través de Die Ligen.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si está disponible con eventos oficiales (como J1 con sus 20 hitos)
  const events = result.events;
  const h1Events = events.filter((e) => e.period === '1T');
  const h2Events = events.filter((e) => e.period === '2T');

  return (
    <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-5">
      {/* Cabecera del bloque */}
      <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <h4 className="text-xs font-black uppercase text-slate-200 tracking-widest">
            Línea Temporal de Eventos
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-800/50 uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            DIE LIGEN · CONECTADO
          </span>
        </div>
      </div>

      {/* Contenedor de la línea temporal */}
      <div className="space-y-4">
        {/* PRIMERA PARTE */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 py-1">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 bg-slate-950/70 border border-slate-850 px-2 py-0.5 rounded">
              1ª Parte
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent" />
          </div>

          <div className="space-y-2">
            {h1Events.map((evt) => (
              <TimelineEventRow key={evt.id} evt={evt} />
            ))}
          </div>
        </div>

        {/* SEGUNDA PARTE */}
        {h2Events.length > 0 && (
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-2 py-1">
              <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 bg-slate-950/70 border border-slate-850 px-2 py-0.5 rounded">
                2ª Parte
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-slate-800 to-transparent" />
            </div>

            <div className="space-y-2">
              {h2Events.map((evt) => (
                <TimelineEventRow key={evt.id} evt={evt} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pie informativo */}
      <div className="pt-2 border-t border-slate-850/80 flex items-center justify-between text-[10px] text-slate-500 font-medium">
        <span>Fuente: Análisis oficial Die Ligen</span>
        <span>{events.length} hitos cronológicos registrados</span>
      </div>
    </div>
  );
}

function TimelineEventRow({ evt }: { evt: DieLigenTimelineEvent }) {
  const isIndautxu = evt.isIndautxu;

  // Renderizado por categoría
  if (evt.category === 'GOAL') {
    return (
      <div
        className={`flex items-start gap-3 p-2.5 rounded-xl border transition-colors ${
          isIndautxu
            ? 'bg-emerald-950/20 border-emerald-800/40 hover:bg-emerald-950/30'
            : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900/40'
        }`}
      >
        {/* Minuto */}
        <div className="flex flex-col items-center justify-center min-w-[38px] pt-0.5">
          <span className="text-xs font-black text-slate-200 tracking-tight">{evt.minuteString}</span>
        </div>

        {/* Icono */}
        <div className="pt-0.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center border shadow-sm ${
              isIndautxu
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
            }`}
          >
            <Target className="h-4 w-4" />
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[11px] font-black tracking-wide uppercase ${
                isIndautxu ? 'text-emerald-300' : 'text-slate-300'
              }`}
            >
              GOL · {evt.teamName}
            </span>
          </div>

          <p className="text-xs font-bold text-slate-100 truncate">
            {evt.scorerName || 'Goleador'}
            {evt.scorerDorsal !== undefined && evt.scorerDorsal !== null && (
              <span className="text-[11px] font-extrabold text-slate-400 ml-1.5">
                (#{evt.scorerDorsal})
              </span>
            )}
          </p>

          {evt.assistName && (
            <p className="text-[11px] text-slate-400 font-medium truncate">
              <span className="text-slate-500 font-semibold">Asistencia:</span> {evt.assistName}
              {evt.assistDorsal !== undefined && evt.assistDorsal !== null && (
                <span className="text-slate-500 ml-1">(#{evt.assistDorsal})</span>
              )}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (evt.category === 'CARD') {
    const isYellow = evt.cardType !== 'RED';
    return (
      <div className="flex items-start gap-3 p-2.5 rounded-xl border bg-slate-950/30 border-slate-850 hover:bg-slate-900/30 transition-colors">
        {/* Minuto */}
        <div className="flex flex-col items-center justify-center min-w-[38px] pt-0.5">
          <span className="text-xs font-black text-slate-300 tracking-tight">{evt.minuteString}</span>
        </div>

        {/* Icono de tarjeta */}
        <div className="pt-1 px-1">
          <div
            className={`w-3.5 h-5 rounded-[2px] shadow-sm border ${
              isYellow
                ? 'bg-amber-400 border-amber-500 shadow-amber-900/40'
                : 'bg-red-600 border-red-700 shadow-red-900/40'
            }`}
            title={isYellow ? 'Tarjeta Amarilla' : 'Tarjeta Roja'}
          />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">
              {isYellow ? 'TARJETA AMARILLA' : 'TARJETA ROJA'} · {evt.teamName}
            </span>
          </div>

          <p className="text-xs font-bold text-slate-200 truncate">
            {evt.offendingPlayerName || 'Jugador amonestado'}
            {evt.offendingPlayerDorsal !== undefined && evt.offendingPlayerDorsal !== null && (
              <span className="text-[11px] font-extrabold text-slate-400 ml-1.5">
                (#{evt.offendingPlayerDorsal})
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  if (evt.category === 'SUBSTITUTION') {
    return (
      <div className="flex items-start gap-3 p-2.5 rounded-xl border bg-slate-950/30 border-slate-850 hover:bg-slate-900/30 transition-colors">
        {/* Minuto */}
        <div className="flex flex-col items-center justify-center min-w-[38px] pt-0.5">
          <span className="text-xs font-black text-slate-300 tracking-tight">{evt.minuteString}</span>
        </div>

        {/* Icono de sustitución */}
        <div className="pt-0.5">
          <div className="w-7 h-7 rounded-lg bg-sky-950/40 border border-sky-800/40 text-sky-400 flex items-center justify-center shadow-sm">
            <RefreshCw className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-400">
              CAMBIO · {evt.teamName}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
            <div className="flex items-center gap-1.5 truncate text-emerald-400 font-semibold">
              <span className="text-[12px] font-black leading-none">▲</span>
              <span className="truncate">
                {evt.playerInName || 'Entra jugador'}
                {evt.playerInDorsal !== undefined && evt.playerInDorsal !== null && (
                  <span className="text-emerald-500/80 font-bold ml-1">
                    (#{evt.playerInDorsal})
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5 truncate text-rose-400/80 font-medium">
              <span className="text-[12px] font-black leading-none text-rose-500">▼</span>
              <span className="truncate">
                {evt.playerOutName || 'Sale jugador'}
                {evt.playerOutDorsal !== undefined && evt.playerOutDorsal !== null && (
                  <span className="text-rose-500/70 font-bold ml-1">
                    (#{evt.playerOutDorsal})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
