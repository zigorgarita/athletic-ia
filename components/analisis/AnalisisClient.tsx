'use client';

import React, { useState, useEffect } from 'react';
import { usePlayers } from '@/hooks/usePlayers';
import { DetailedEvaluation, MatchPlayerStats } from '@/types';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/ui/Avatar';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  BarChart3, Users, Star, Trophy, Clock, 
  ArrowRightLeft, Sparkles, Scale, TrendingUp
} from 'lucide-react';

export function AnalisisClient() {
  const { players, loading: loadingPlayers } = usePlayers();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'comparator'>('dashboard');

  // Database states
  const [allEvaluations, setAllEvaluations] = useState<DetailedEvaluation[]>([]);
  const [allStats, setAllStats] = useState<MatchPlayerStats[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Selector states for single-player radar and comparator
  const [radarPlayerId, setRadarPlayerId] = useState<string>('');
  const [compPlayerAId, setCompPlayerAId] = useState<string>('');
  const [compPlayerBId, setCompPlayerBId] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      setLoadingData(true);
      try {
        const [evalsRes, statsRes] = await Promise.all([
          supabase.from('detailed_evaluations').select('*').order('fecha_evaluacion', { ascending: false }),
          supabase.from('match_player_stats').select('*'),
        ]);

        if (evalsRes.error) throw evalsRes.error;
        if (statsRes.error) throw statsRes.error;

        setAllEvaluations(evalsRes.data || []);
        setAllStats(statsRes.data || []);
      } catch (err) {
        console.error('Error loading analytics data:', err);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  // Autofill selectors when players load
  useEffect(() => {
    if (players.length > 0) {
      if (!radarPlayerId) setRadarPlayerId(players[0].id);
      if (!compPlayerAId) setCompPlayerAId(players[0].id);
      if (players.length > 1 && !compPlayerBId) setCompPlayerBId(players[1].id);
    }
  }, [players, radarPlayerId, compPlayerAId, compPlayerBId]);

  // --- Helper Calculations ---

  const getAge = (birthDateString: string) => {
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Get average metrics for a player
  const getPlayerAverages = (pId: string) => {
    const pEvals = allEvaluations.filter((e) => e.player_id === pId);
    if (pEvals.length === 0) {
      return {
        tecnica: 0,
        tactica: 0,
        condicional: 0,
        defensiva: 0,
        global: 0,
        raw: null,
      };
    }
    
    // Most recent evaluation
    const latest = pEvals[0];

    const tecnica = (
      latest.pase_corto + latest.pase_largo + latest.control_orientado + 
      latest.regate + latest.centros + latest.finalizacion + 
      latest.disparo_lejano + latest.trabajo_ofensivo
    ) / 8;

    const tactica = (latest.vision_juego + latest.inteligencia_tactica + latest.liderazgo) / 3;
    const condicional = (latest.velocidad + latest.aceleracion + latest.fuerza + latest.resistencia + latest.juego_aereo) / 5;
    const defensiva = (latest.marcaje + latest.entrada_defensiva + latest.posicionamiento_defensivo + latest.trabajo_defensivo) / 4;
    const global = (tecnica + tactica + condicional + defensiva) / 4;

    return { tecnica, tactica, condicional, defensiva, global, raw: latest };
  };

  // Get cumulative stats for a player
  const getPlayerStatsSummary = (pId: string) => {
    const pStats = allStats.filter((s) => s.player_id === pId);
    return {
      partidos: pStats.length,
      titularidades: pStats.filter((s) => s.titular).length,
      minutos: pStats.reduce((sum, s) => sum + (s.minutos || 0), 0),
      goles: pStats.reduce((sum, s) => sum + (s.goles || 0), 0),
      asistencias: pStats.reduce((sum, s) => sum + (s.asistencias || 0), 0),
      tarjetas_amarillas: pStats.filter((s) => s.tarjeta_amarilla).length,
      tarjetas_rojas: pStats.filter((s) => s.tarjeta_roja).length,
    };
  };

  // --- Dashboard Data Prep ---

  // Ranking of players sorted by global average rating
  const rankingList = players.map((p) => {
    const avgs = getPlayerAverages(p.id);
    return {
      player: p,
      averages: avgs,
    };
  }).sort((a, b) => b.averages.global - a.averages.global);

  const top5 = rankingList.filter((item) => item.averages.global > 0).slice(0, 5);

  // Position averages
  const positionAverages = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'].reduce((acc, pos) => {
    const posPlayers = players.filter((p) => p.demarcacion === pos);
    const avgs = posPlayers.map((p) => getPlayerAverages(p.id).global).filter((g) => g > 0);
    const avg = avgs.length > 0 ? avgs.reduce((sum, val) => sum + val, 0) / avgs.length : 0;
    return { ...acc, [pos]: avg };
  }, {} as Record<string, number>);

  // Distribution by position
  const positionCounts = players.reduce((acc, p) => {
    acc[p.demarcacion] = (acc[p.demarcacion] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Top players by minutes played
  const playerMinutes = players.map((p) => {
    const sumMin = allStats.filter((s) => s.player_id === p.id).reduce((sum, s) => sum + (s.minutos || 0), 0);
    return {
      player: p,
      minutos: sumMin,
    };
  }).sort((a, b) => b.minutos - a.minutos);

  // --- SVG Radar Chart Component Generator ---
  const renderRadarChart = (playerAId: string, playerBId?: string) => {
    const avgsA = getPlayerAverages(playerAId);
    const avgsB = playerBId ? getPlayerAverages(playerBId) : null;

    // Dimensions
    const size = 300;
    const center = size / 2;
    const radius = 100;

    // Coordinates for radar categories: 1. Técnica, 2. Táctica, 3. Físico, 4. Defensiva
    const categories = [
      { name: 'Técnica', angle: -Math.PI / 2 },
      { name: 'Táctica', angle: 0 },
      { name: 'Defensa', angle: Math.PI / 2 },
      { name: 'Físico', angle: Math.PI },
    ];

    const getCoords = (val: number, angle: number) => {
      // Scale rating (1 to 5) to radius
      const factor = (val / 5) * radius;
      return {
        x: center + factor * Math.cos(angle),
        y: center + factor * Math.sin(angle),
      };
    };

    const getPolyData = (avgs: typeof avgsA) => {
      const p1 = getCoords(avgs.tecnica || 1, categories[0].angle);
      const p2 = getCoords(avgs.tactica || 1, categories[1].angle);
      const p3 = getCoords(avgs.defensiva || 1, categories[2].angle);
      const p4 = getCoords(avgs.condicional || 1, categories[3].angle);
      return `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;
    };

    return (
      <div className="flex flex-col items-center justify-center">
        <svg width={size} height={size} className="overflow-visible select-none">
          {/* Concentric rings (Grid levels 1 to 5) */}
          {[1, 2, 3, 4, 5].map((lvl) => {
            const r = (lvl / 5) * radius;
            return (
              <circle
                key={lvl}
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray={lvl < 5 ? '3 3' : 'none'}
              />
            );
          })}

          {/* Category Axes lines */}
          {categories.map((cat, idx) => {
            const edge = getCoords(5, cat.angle);
            return (
              <line
                key={idx}
                x1={center}
                y1={center}
                x2={edge.x}
                y2={edge.y}
                stroke="#475569"
                strokeWidth="1.2"
              />
            );
          })}

          {/* Category Labels */}
          {categories.map((cat, idx) => {
            const labelPos = getCoords(5.8, cat.angle);
            return (
              <text
                key={idx}
                x={labelPos.x}
                y={labelPos.y + (cat.angle === Math.PI / 2 ? 6 : -2)}
                fill="#94a3b8"
                fontSize="10"
                fontWeight="black"
                textAnchor="middle"
              >
                {cat.name}
              </text>
            );
          })}

          {/* Polygon Player A (Cyan / Green) */}
          {avgsA.global > 0 && (
            <polygon
              points={getPolyData(avgsA)}
              fill="rgba(34, 197, 94, 0.25)"
              stroke="#22c55e"
              strokeWidth="2.5"
            />
          )}

          {/* Polygon Player B (Emerald / Purple if comparing) */}
          {avgsB && avgsB.global > 0 && (
            <polygon
              points={getPolyData(avgsB)}
              fill="rgba(168, 85, 247, 0.25)"
              stroke="#a855f7"
              strokeWidth="2.5"
            />
          )}

          {/* Dots on nodes */}
          {categories.map((cat, idx) => {
            const valA = idx === 0 ? avgsA.tecnica : idx === 1 ? avgsA.tactica : idx === 2 ? avgsA.defensiva : avgsA.condicional;
            const pA = getCoords(valA || 0, cat.angle);
            return valA > 0 ? <circle key={`dotA-${idx}`} cx={pA.x} cy={pA.y} r="3.5" fill="#22c55e" /> : null;
          })}

          {avgsB && categories.map((cat, idx) => {
            const valB = idx === 0 ? avgsB.tecnica : idx === 1 ? avgsB.tactica : idx === 2 ? avgsB.defensiva : avgsB.condicional;
            const pB = getCoords(valB || 0, cat.angle);
            return valB > 0 ? <circle key={`dotB-${idx}`} cx={pB.x} cy={pB.y} r="3.5" fill="#a855f7" /> : null;
          })}
        </svg>

        {/* Legend */}
        <div className="flex gap-4 mt-3 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span className="text-slate-400">
              {players.find(p => p.id === playerAId)?.nombre || 'Jugador A'}
            </span>
          </div>
          {playerBId && (
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              <span className="text-slate-400">
                {players.find(p => p.id === playerBId)?.nombre || 'Jugador B'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loadingPlayers || loadingData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-2xl animate-pulse" />
        <Skeleton className="h-64 w-full rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-green-500" />
          Panel Analítico y Comparador
        </h1>
        <p className="text-slate-400 text-sm">
          Análisis de rendimiento integral de la plantilla y comparativa de jugadores basada en datos reales de Supabase.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-6 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'dashboard'
              ? 'border-green-500 text-green-400 bg-green-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="h-4 w-4" />
          Panel General (Dashboard)
        </button>
        <button
          onClick={() => setActiveTab('comparator')}
          className={`flex items-center gap-2 px-6 py-3.5 border-b-2 text-sm font-semibold transition-all duration-200 ${
            activeTab === 'comparator'
              ? 'border-green-500 text-green-400 bg-green-500/5'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" />
          Comparador 1vs1
        </button>
      </div>

      {/* TAB CONTENT: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Top 5 y Medias por Posición */}
          <div className="space-y-6 lg:col-span-1">
            {/* Top 5 Jugadores */}
            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" /> Top 5 Plantilla
              </h3>
              {top5.length === 0 ? (
                <p className="text-xs text-slate-550 italic">Sin datos de valoraciones en Supabase.</p>
              ) : (
                <div className="space-y-3">
                  {top5.map((item, idx) => (
                    <div key={item.player.id} className="flex items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-green-550 w-4">#{idx + 1}</span>
                        <Avatar src={item.player.foto_url} name={item.player.nombre} size="sm" />
                        <div>
                          <span className="font-bold text-slate-100 block text-xs">{item.player.nombre}</span>
                          <span className="text-[10px] text-slate-550">{item.player.demarcacion}</span>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold text-amber-400 flex items-center gap-0.5">
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
                        {item.averages.global.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Medias por Posición */}
            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
                <Scale className="h-4 w-4 text-blue-400" /> Media por Posición
              </h3>
              <div className="space-y-3.5">
                {Object.keys(positionAverages).map((pos) => {
                  const val = positionAverages[pos];
                  return (
                    <div key={pos} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300">{pos}</span>
                        <span className="text-slate-150">{val > 0 ? `${val.toFixed(1)} / 5` : '-'}</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                        <div
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${(val / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Columna Central: Radar Individual de Rendimiento */}
          <div className="space-y-6 lg:col-span-1">
            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4 flex flex-col items-center">
              <div className="w-full">
                <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" /> Radar de Rendimiento
                </h3>
                <p className="text-[11px] text-slate-550 mt-1">Selecciona un futbolista para ver su gráfico de radar.</p>
              </div>

              {players.length > 0 && (
                <div className="w-full sm:max-w-xs mt-2">
                  <Select
                    label=""
                    value={radarPlayerId}
                    onChange={(e) => setRadarPlayerId(e.target.value)}
                    options={players.map((p) => ({
                      value: p.id,
                      label: `${p.nombre} ${p.apellidos || ''} (#${p.dorsal})`,
                    }))}
                  />
                </div>
              )}

              {radarPlayerId ? (
                <div className="py-2">
                  {renderRadarChart(radarPlayerId)}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic mt-6">Registra jugadores para ver la analítica.</p>
              )}
            </div>

            {/* Distribución por Posición */}
            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" /> Distribución de Posiciones
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {['Portero', 'Defensa', 'Centrocampista', 'Delantero'].map((pos) => {
                  const count = positionCounts[pos] || 0;
                  return (
                    <div key={pos} className="bg-slate-950/40 p-3 rounded-xl border border-slate-850 text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-black block">{pos}s</span>
                      <span className="text-xl font-black text-slate-100">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Minutos por Jugador y Ranking General */}
          <div className="space-y-6 lg:col-span-1">
            {/* Minutos por Jugador */}
            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4 max-h-[300px] overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" /> Minutos Acumulados
              </h3>
              <div className="space-y-2.5">
                {playerMinutes.slice(0, 6).map((item) => (
                  <div key={item.player.id} className="flex items-center justify-between text-xs bg-slate-950/20 p-2 rounded-lg border border-slate-850">
                    <span className="font-semibold text-slate-200">{item.player.nombre}</span>
                    <span className="text-slate-400 font-bold">{item.minutos} min</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ranking General de la Plantilla */}
            <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4 max-h-[350px] overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-350 uppercase tracking-wider flex items-center gap-2">
                <Trophy className="h-4 w-4 text-green-500" /> Ranking General
              </h3>
              <div className="space-y-2">
                {rankingList.map((item, idx) => (
                  <div key={item.player.id} className="flex items-center justify-between text-xs bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-black">#{idx + 1}</span>
                      <span className="font-bold text-slate-100">{item.player.nombre}</span>
                    </div>
                    <span className="text-[11px] font-bold text-green-400">
                      {item.averages.global > 0 ? item.averages.global.toFixed(1) : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: COMPARATOR */}
      {activeTab === 'comparator' && (
        <div className="space-y-6">
          {/* Selectores de Comparación */}
          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <Select
              label="Seleccionar Jugador A"
              value={compPlayerAId}
              onChange={(e) => setCompPlayerAId(e.target.value)}
              options={players.map((p) => ({
                value: p.id,
                label: `${p.nombre} ${p.apellidos || ''} (#${p.dorsal})`,
              }))}
            />
            <Select
              label="Seleccionar Jugador B"
              value={compPlayerBId}
              onChange={(e) => setCompPlayerBId(e.target.value)}
              options={players.map((p) => ({
                value: p.id,
                label: `${p.nombre} ${p.apellidos || ''} (#${p.dorsal})`,
              }))}
            />
          </div>

          {compPlayerAId && compPlayerBId ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Radar de Comparativa */}
              <div className="lg:col-span-1 p-6 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col items-center justify-center">
                <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-4">Radar Comparativo</h3>
                {renderRadarChart(compPlayerAId, compPlayerBId)}
              </div>

              {/* Tabla Comparativa de Datos */}
              <div className="lg:col-span-2 overflow-x-auto border border-slate-800 bg-slate-900/20 rounded-2xl shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold uppercase">
                      <th className="px-6 py-3.5">Parámetro</th>
                      <th className="px-6 py-3.5 text-green-400 font-black">
                        {players.find(p => p.id === compPlayerAId)?.nombre}
                      </th>
                      <th className="px-6 py-3.5 text-purple-400 font-black">
                        {players.find(p => p.id === compPlayerBId)?.nombre}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-200">
                    {/* Posición */}
                    <tr>
                      <td className="px-6 py-3.5 font-bold text-slate-400">Posición Principal</td>
                      <td className="px-6 py-3.5">{players.find(p => p.id === compPlayerAId)?.demarcacion}</td>
                      <td className="px-6 py-3.5">{players.find(p => p.id === compPlayerBId)?.demarcacion}</td>
                    </tr>
                    {/* Edad */}
                    <tr>
                      <td className="px-6 py-3.5 font-bold text-slate-400">Edad</td>
                      <td className="px-6 py-3.5">{getAge(players.find(p => p.id === compPlayerAId)?.fecha_nacimiento || '')} años</td>
                      <td className="px-6 py-3.5">{getAge(players.find(p => p.id === compPlayerBId)?.fecha_nacimiento || '')} años</td>
                    </tr>
                    {/* Estatura / Peso */}
                    <tr>
                      <td className="px-6 py-3.5 font-bold text-slate-400">Estatura / Peso</td>
                      <td className="px-6 py-3.5">
                        {players.find(p => p.id === compPlayerAId)?.altura || '-'}m / {players.find(p => p.id === compPlayerAId)?.peso || '-'}kg
                      </td>
                      <td className="px-6 py-3.5">
                        {players.find(p => p.id === compPlayerBId)?.altura || '-'}m / {players.find(p => p.id === compPlayerBId)?.peso || '-'}kg
                      </td>
                    </tr>
                    {/* Pierna dominante */}
                    <tr>
                      <td className="px-6 py-3.5 font-bold text-slate-400">Pierna Dominante</td>
                      <td className="px-6 py-3.5">{players.find(p => p.id === compPlayerAId)?.pierna_dominante}</td>
                      <td className="px-6 py-3.5">{players.find(p => p.id === compPlayerBId)?.pierna_dominante}</td>
                    </tr>
                    {/* Valoración Global */}
                    <tr className="bg-slate-950/20 font-bold">
                      <td className="px-6 py-3.5 text-slate-350">Valoración Global Promedio</td>
                      <td className="px-6 py-3.5 text-green-400">{getPlayerAverages(compPlayerAId).global > 0 ? getPlayerAverages(compPlayerAId).global.toFixed(1) : '-'}</td>
                      <td className="px-6 py-3.5 text-purple-400">{getPlayerAverages(compPlayerBId).global > 0 ? getPlayerAverages(compPlayerBId).global.toFixed(1) : '-'}</td>
                    </tr>
                    {/* Averages detallados */}
                    <tr>
                      <td className="px-6 py-3.5 text-slate-400">Promedio Técnico</td>
                      <td className="px-6 py-3.5">{getPlayerAverages(compPlayerAId).tecnica > 0 ? getPlayerAverages(compPlayerAId).tecnica.toFixed(1) : '-'}</td>
                      <td className="px-6 py-3.5">{getPlayerAverages(compPlayerBId).tecnica > 0 ? getPlayerAverages(compPlayerBId).tecnica.toFixed(1) : '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3.5 text-slate-400">Promedio Táctico</td>
                      <td className="px-6 py-3.5">{getPlayerAverages(compPlayerAId).tactica > 0 ? getPlayerAverages(compPlayerAId).tactica.toFixed(1) : '-'}</td>
                      <td className="px-6 py-3.5">{getPlayerAverages(compPlayerBId).tactica > 0 ? getPlayerAverages(compPlayerBId).tactica.toFixed(1) : '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3.5 text-slate-400">Promedio Físico</td>
                      <td className="px-6 py-3.5">{getPlayerAverages(compPlayerAId).condicional > 0 ? getPlayerAverages(compPlayerAId).condicional.toFixed(1) : '-'}</td>
                      <td className="px-6 py-3.5">{getPlayerAverages(compPlayerBId).condicional > 0 ? getPlayerAverages(compPlayerBId).condicional.toFixed(1) : '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3.5 text-slate-400">Promedio Defensivo</td>
                      <td className="px-6 py-3.5">{getPlayerAverages(compPlayerAId).defensiva > 0 ? getPlayerAverages(compPlayerAId).defensiva.toFixed(1) : '-'}</td>
                      <td className="px-6 py-3.5">{getPlayerAverages(compPlayerBId).defensiva > 0 ? getPlayerAverages(compPlayerBId).defensiva.toFixed(1) : '-'}</td>
                    </tr>
                    {/* Estadísticas de partidos */}
                    <tr className="bg-slate-950/20 font-bold">
                      <td className="px-6 py-3.5 text-slate-350">Partidos Jugados</td>
                      <td className="px-6 py-3.5">{getPlayerStatsSummary(compPlayerAId).partidos}</td>
                      <td className="px-6 py-3.5">{getPlayerStatsSummary(compPlayerBId).partidos}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3.5 text-slate-400">Minutos Totales</td>
                      <td className="px-6 py-3.5">{getPlayerStatsSummary(compPlayerAId).minutos} m</td>
                      <td className="px-6 py-3.5">{getPlayerStatsSummary(compPlayerBId).minutos} m</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-3.5 text-slate-400">Goles / Asistencias</td>
                      <td className="px-6 py-3.5">
                        {getPlayerStatsSummary(compPlayerAId).goles} / {getPlayerStatsSummary(compPlayerAId).asistencias}
                      </td>
                      <td className="px-6 py-3.5">
                        {getPlayerStatsSummary(compPlayerBId).goles} / {getPlayerStatsSummary(compPlayerBId).asistencias}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic text-center p-8">Selecciona dos jugadores arriba para compararlos.</p>
          )}
        </div>
      )}
    </div>
  );
}
