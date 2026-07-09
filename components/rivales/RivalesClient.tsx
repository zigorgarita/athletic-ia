'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useClubs, ClubWithSeason } from '@/hooks/useClubs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Target, Search, Filter, MapPin, TrendingUp, Shield } from 'lucide-react';

type ScoutingFilter = 'all' | 'Sin analizar' | 'Parcial' | 'Completo';

/** Barra de progreso de completitud */
function CompletitudBar({ value }: { value: number }) {
  const color =
    value >= 80
      ? 'from-emerald-500 to-emerald-400'
      : value >= 40
        ? 'from-amber-500 to-yellow-400'
        : 'from-red-500 to-red-400';

  const dotColor =
    value >= 80 ? 'bg-emerald-400' : value >= 40 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-slate-400 tabular-nums w-8 text-right">
        {value}%
      </span>
    </div>
  );
}

/** Badge de estado de scouting */
function ScoutingBadge({ estado }: { estado: string }) {
  const config: Record<string, { dot: string; text: string; bg: string }> = {
    'Sin analizar': {
      dot: 'bg-red-500',
      text: 'text-red-400',
      bg: 'bg-red-950/50 border-red-900/30',
    },
    Parcial: {
      dot: 'bg-amber-500',
      text: 'text-amber-400',
      bg: 'bg-amber-950/50 border-amber-900/30',
    },
    Completo: {
      dot: 'bg-emerald-500',
      text: 'text-emerald-400',
      bg: 'bg-emerald-950/50 border-emerald-900/30',
    },
  };
  const c = config[estado] || config['Sin analizar'];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${c.bg} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse`} />
      {estado}
    </span>
  );
}

export function RivalesClient() {
  const { clubs, loading, error } = useClubs('2026-27');

  const [searchTerm, setSearchTerm] = useState('');
  const [scoutingFilter, setScoutingFilter] = useState<ScoutingFilter>('all');

  // Filtered clubs
  const filteredClubs = useMemo(() => {
    let result = clubs;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.nombre.toLowerCase().includes(term) ||
          c.ciudad?.toLowerCase().includes(term) ||
          c.campo_nombre?.toLowerCase().includes(term)
      );
    }
    if (scoutingFilter !== 'all') {
      result = result.filter(
        (c) => (c.season?.estado_scouting || 'Sin analizar') === scoutingFilter
      );
    }
    return result;
  }, [clubs, searchTerm, scoutingFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = clubs.length;
    const completos = clubs.filter(
      (c) => c.season?.estado_scouting === 'Completo'
    ).length;
    const parciales = clubs.filter(
      (c) => c.season?.estado_scouting === 'Parcial'
    ).length;
    const sinAnalizar = total - completos - parciales;
    const avgCompletitud =
      total > 0
        ? Math.round(clubs.reduce((acc, c) => acc + (c.completitud || 0), 0) / total)
        : 0;
    return { total, completos, parciales, sinAnalizar, avgCompletitud };
  }, [clubs]);

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64 bg-slate-800" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
          {Array.from({ length: 15 }).map((_, n) => (
            <Skeleton key={n} className="h-72 rounded-2xl bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-3">
          <div className="p-2 bg-[#CC0E21]/10 rounded-xl border border-[#CC0E21]/20">
            <Target className="h-7 w-7 text-[#CC0E21]" />
          </div>
          Scouting de Rivales
        </h1>
        <p className="text-slate-400 mt-2 text-sm max-w-2xl">
          Base de inteligencia deportiva · Liga Nacional Juvenil G2 · Temporada
          2026-27
        </p>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Rivales
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {stats.total}
          </div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs font-medium text-emerald-500/70 uppercase tracking-wider">
            Completos
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {stats.completos}
          </div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs font-medium text-amber-500/70 uppercase tracking-wider">
            Parciales
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {stats.parciales}
          </div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Completitud Media
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {stats.avgCompletitud}%
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar rival, ciudad o campo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#CC0E21]/50 focus:ring-1 focus:ring-[#CC0E21]/30 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'Sin analizar', 'Parcial', 'Completo'] as ScoutingFilter[]).map(
            (f) => (
              <button
                key={f}
                onClick={() => setScoutingFilter(f)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  scoutingFilter === f
                    ? 'bg-[#CC0E21]/10 border-[#CC0E21]/40 text-[#CC0E21]'
                    : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {f === 'all' ? 'Todos' : f}
              </button>
            )
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Grid de Rivales */}
      {filteredClubs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 border border-slate-800/80 rounded-2xl text-center">
          <Target className="h-16 w-16 text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-slate-200">
            No se encontraron rivales
          </h3>
          <p className="text-slate-400 mt-2 max-w-md">
            Prueba a cambiar los filtros o el término de búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
          {filteredClubs.map((club) => (
            <Link
              key={club.id}
              href={`/rivales/${club.id}`}
              className="group relative flex flex-col bg-slate-900/40 border border-slate-800/70 rounded-2xl overflow-hidden hover:border-[#CC0E21]/40 transition-all duration-300 hover:shadow-[0_0_40px_rgba(204,14,33,0.08)] hover:-translate-y-1"
            >
              {/* Escudo */}
              <div className="h-36 bg-gradient-to-b from-slate-950 to-slate-900/80 relative flex items-center justify-center p-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(204,14,33,0.03),transparent_70%)]" />
                {club.escudo_url ? (
                  <img
                    src={club.escudo_url}
                    alt={club.nombre}
                    className="h-20 w-20 object-contain z-10 group-hover:scale-110 transition-transform duration-500 drop-shadow-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center z-10 group-hover:scale-110 transition-transform duration-500">
                    <Shield className="h-9 w-9 text-slate-600" />
                  </div>
                )}

                {/* Badge scouting - esquina superior derecha */}
                <div className="absolute top-3 right-3">
                  <ScoutingBadge
                    estado={club.season?.estado_scouting || 'Sin analizar'}
                  />
                </div>
              </div>

              {/* Info */}
              <div className="p-4 flex-1 flex flex-col gap-3 border-t border-slate-800/50">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-[#CC0E21] transition-colors leading-tight line-clamp-2">
                    {club.nombre}
                  </h3>
                  {(club.ciudad || club.campo_nombre) && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-slate-500 text-xs">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {club.ciudad || club.campo_nombre}
                      </span>
                    </div>
                  )}
                </div>

                {/* Barra de completitud */}
                <div className="mt-auto">
                  <CompletitudBar value={club.completitud || 0} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
