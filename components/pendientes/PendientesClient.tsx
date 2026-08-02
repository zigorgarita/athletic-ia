'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import Link from 'next/link';
import { usePendientes, PendienteInjury, PendienteFine, PendienteMeeting, PendientePlayer } from '@/hooks/usePendientes';
import {
  AlertTriangle, Heart, Coins, MessageSquare,
  ChevronRight, RefreshCw, Clock, Calendar,
  AlertCircle, CheckCircle2
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function PlayerAvatar({ player }: { player: PendientePlayer }) {
  return (
    <div className="relative shrink-0">
      {player.foto_url ? (
        <img
          src={player.foto_url}
          alt={`${player.nombre} ${player.apellidos}`}
          className="h-10 w-10 rounded-full object-cover border border-slate-700"
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
          <span className="text-slate-400 text-sm font-bold">
            {player.nombre.charAt(0)}{player.apellidos.charAt(0)}
          </span>
        </div>
      )}
      <span className="absolute -bottom-0.5 -right-0.5 text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-300 rounded-full px-1 leading-tight">
        {player.dorsal}
      </span>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  count,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`flex items-center justify-center h-9 w-9 rounded-xl ${color} shrink-0`}>
        {icon}
      </div>
      <div className="flex-1">
        <h2 className="text-base font-bold text-slate-100">{title}</h2>
      </div>
      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${count === 0 ? 'bg-slate-800 text-slate-500' : `${color} text-white`}`}>
        {count}
      </span>
    </div>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800/50 text-slate-500 text-sm">
      <CheckCircle2 className="h-4 w-4 text-emerald-600/60" />
      {label}
    </div>
  );
}

// ─── Injury Card ─────────────────────────────────────────────────────────────

const INJURY_ESTADO_COLOR: Record<string, string> = {
  'Activa': 'bg-red-950/60 text-red-400 border-red-900/40',
  'En recuperación': 'bg-amber-950/60 text-amber-400 border-amber-900/40',
  'Recaída': 'bg-orange-950/60 text-orange-400 border-orange-900/40',
};

function InjuryCard({ injury }: { injury: PendienteInjury }) {
  const href = `/plantilla?player=${injury.player_id}&tab=fisico`;
  const estadoClass = INJURY_ESTADO_COLOR[injury.estado] ?? 'bg-slate-800 text-slate-400 border-slate-700';

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-red-900/40 hover:bg-slate-900 transition-all duration-200"
    >
      <PlayerAvatar player={injury.player} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">
          {injury.player.nombre} {injury.player.apellidos}
        </p>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {injury.tipo_lesion}
          {injury.diagnostico ? ` · ${injury.diagnostico}` : ''}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-slate-500">
            Desde {formatDate(injury.fecha_lesion)}
          </span>
          {injury.fecha_prevista_recuperacion && (
            <>
              <span className="text-slate-700">·</span>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Alta prev. {formatDate(injury.fecha_prevista_recuperacion)}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${estadoClass}`}>
          {injury.estado}
        </span>
        <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>
    </Link>
  );
}

// ─── Fine Card ───────────────────────────────────────────────────────────────

function FineCard({ fine }: { fine: PendienteFine }) {
  const href = `/plantilla?player=${fine.player_id}&tab=multas`;
  const total = fine.importe * fine.cantidad;

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-amber-900/40 hover:bg-slate-900 transition-all duration-200"
    >
      <PlayerAvatar player={fine.player} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">
          {fine.player.nombre} {fine.player.apellidos}
        </p>
        <p className="text-xs text-slate-400 truncate mt-0.5">{fine.motivo}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-slate-500">{formatDate(fine.fecha)}</span>
          <span className="text-slate-700">·</span>
          <span className="text-[10px] text-slate-500">{fine.contexto}</span>
          {fine.cantidad > 1 && (
            <>
              <span className="text-slate-700">·</span>
              <span className="text-[10px] text-slate-500">×{fine.cantidad}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="text-sm font-bold text-amber-400">{total.toFixed(2)} €</span>
        <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>
    </Link>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

const MEETING_CLASE_STYLE: Record<string, { badge: string; dot: string }> = {
  Vencida: {
    badge: 'bg-red-950/60 text-red-400 border-red-900/40',
    dot: 'bg-red-500',
  },
  Hoy: {
    badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-900/40',
    dot: 'bg-emerald-500 animate-pulse',
  },
  Próxima: {
    badge: 'bg-blue-950/60 text-blue-400 border-blue-900/40',
    dot: 'bg-blue-500',
  },
};

const MEETING_ESTADO_STYLE: Record<string, string> = {
  Pendiente: 'bg-slate-800 text-slate-400 border-slate-700',
  'En seguimiento': 'bg-indigo-950/60 text-indigo-400 border-indigo-900/40',
};

function MeetingCard({ meeting }: { meeting: PendienteMeeting }) {
  const href = `/plantilla?player=${meeting.player_id}&tab=reuniones`;
  const claseStyle = MEETING_CLASE_STYLE[meeting.clasificacion];
  const estadoStyle = MEETING_ESTADO_STYLE[meeting.estado] ?? 'bg-slate-800 text-slate-400';

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800/60 hover:border-blue-900/40 hover:bg-slate-900 transition-all duration-200"
    >
      <PlayerAvatar player={meeting.player} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">
          {meeting.player.nombre} {meeting.player.apellidos}
        </p>
        <p className="text-xs text-slate-400 truncate mt-0.5">{meeting.motivo}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <Calendar className="h-3 w-3 text-slate-500" />
          <span className="text-[10px] text-slate-500">{formatDate(meeting.fecha)}</span>
          <span className="text-slate-700">·</span>
          <span className="text-[10px] text-slate-500">Por {meeting.solicitada_por}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${claseStyle.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${claseStyle.dot}`} />
          {meeting.clasificacion}
        </span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${estadoStyle}`}>
          {meeting.estado}
        </span>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 ml-1" />
    </Link>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PendientesClient() {
  const { injuries, fines, meetings, total, loading, error, refetch } = usePendientes();

  const totalMultas = fines.reduce((acc, f) => acc + f.importe * f.cantidad, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-[#CC0E21]" />
            Pendientes
          </h1>
          <p className="text-sm text-slate-400">
            Resumen de situaciones que requieren atención del cuerpo técnico
          </p>
        </div>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-[#CC0E21]/15 text-[#CC0E21] border border-[#CC0E21]/25">
              {total} pendiente{total !== 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-950/40 border border-red-900/40 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-slate-900/60 border border-slate-800/60 animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-8">
          {/* ── LESIONES ── */}
          <section>
            <SectionHeader
              icon={<Heart className="h-4 w-4 text-red-400" />}
              title="Lesiones activas"
              count={injuries.length}
              color="bg-red-950/60"
            />
            {injuries.length === 0 ? (
              <EmptySection label="Sin lesiones activas" />
            ) : (
              <div className="space-y-2">
                {injuries.map((inj) => (
                  <InjuryCard key={inj.id} injury={inj} />
                ))}
              </div>
            )}
          </section>

          {/* ── MULTAS ── */}
          <section>
            <SectionHeader
              icon={<Coins className="h-4 w-4 text-amber-400" />}
              title="Multas pendientes"
              count={fines.length}
              color="bg-amber-950/60"
            />
            {fines.length > 0 && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="text-xs text-slate-500">Total pendiente:</span>
                <span className="text-sm font-bold text-amber-400">{totalMultas.toFixed(2)} €</span>
              </div>
            )}
            {fines.length === 0 ? (
              <EmptySection label="Sin multas pendientes" />
            ) : (
              <div className="space-y-2">
                {fines.map((fine) => (
                  <FineCard key={fine.id} fine={fine} />
                ))}
              </div>
            )}
          </section>

          {/* ── REUNIONES ── */}
          <section>
            <SectionHeader
              icon={<MessageSquare className="h-4 w-4 text-blue-400" />}
              title="Reuniones abiertas"
              count={meetings.length}
              color="bg-blue-950/60"
            />
            {meetings.length === 0 ? (
              <EmptySection label="Sin reuniones abiertas" />
            ) : (
              <div className="space-y-2">
                {meetings.map((m) => (
                  <MeetingCard key={m.id} meeting={m} />
                ))}
              </div>
            )}
          </section>

          {/* All clear */}
          {total === 0 && !error && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-emerald-950/40 border border-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-slate-200">Todo al día</p>
              <p className="text-sm text-slate-500">No hay lesiones, multas ni reuniones pendientes</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
