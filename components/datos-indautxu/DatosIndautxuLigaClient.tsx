'use client';

import React, { useState } from 'react';
import { Users, Trophy, Calendar, ShieldCheck, Sparkles } from 'lucide-react';
import { JugadoresTab } from './tabs/JugadoresTab';
import { ClasificacionTab } from './tabs/ClasificacionTab';
import { CalendarioTab } from './tabs/CalendarioTab';

export type DatosLigaSubTab = 'jugadores' | 'clasificacion' | 'calendario';

interface TabItem {
  id: DatosLigaSubTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description: string;
}

const TABS: TabItem[] = [
  {
    id: 'jugadores',
    label: 'JUGADORES',
    icon: Users,
    badge: '27',
    description: 'Estadísticas oficiales acumuladas y minutaje'
  },
  {
    id: 'clasificacion',
    label: 'CLASIFICACIÓN',
    icon: Trophy,
    badge: 'RFEF',
    description: 'Tabla oficial federativa y trayectoria histórica'
  },
  {
    id: 'calendario',
    label: 'CALENDARIO',
    icon: Calendar,
    badge: '30',
    description: 'Jornadas de Liga, resultados y programación'
  }
];

export function DatosIndautxuLigaClient() {
  const [activeTab, setActiveTab] = useState<DatosLigaSubTab>('jugadores');

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
      {/* 1. Cabecera Principal de la Sección */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-red-950/40 border border-slate-800 p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Escudo SD Indautxu */}
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden bg-slate-950 border-2 border-red-600/40 shadow-lg shadow-red-950/40 flex items-center justify-center shrink-0">
              <img
                src="/escudo.jpg"
                alt="SD Indautxu"
                className="w-full h-full object-contain p-1.5"
              />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[11px] font-bold tracking-widest text-red-400 uppercase px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                  División de Honor Juvenil • Grupo 2
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                  Temporada 2026/27
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight mt-2">
                DATOS INDAUTXU DE LIGA
              </h1>

              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Panel integral oficial de rendimiento de Liga: plantilla, clasificación federativa RFEF y fixture de 30 jornadas.
              </p>
            </div>
          </div>

          {/* Badge de Verificación de Datos */}
          <div className="hidden lg:flex flex-col items-end justify-center shrink-0 pl-6 border-l border-slate-800/80 text-right">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fuente Oficial RFEF</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
              Sincronización Federativa
            </div>
          </div>
        </div>

        {/* 2. Barra de Navegación por Subpestañas */}
        <div className="mt-8 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-red-600 text-white shadow-lg shadow-red-950/60 font-extrabold'
                      : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Contenedor de la Subpestaña Activa */}
      <div className="transition-all duration-300">
        {activeTab === 'jugadores' && <JugadoresTab />}
        {activeTab === 'clasificacion' && <ClasificacionTab />}
        {activeTab === 'calendario' && <CalendarioTab />}
      </div>
    </div>
  );
}
