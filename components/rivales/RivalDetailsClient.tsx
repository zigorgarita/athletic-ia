'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useClubDetails } from '@/hooks/useClubDetails';
import { GeneralTab } from '@/components/rivales/tabs/GeneralTab';
import { PlayersTab } from '@/components/rivales/tabs/PlayersTab';
import { StaffTab } from '@/components/rivales/tabs/StaffTab';
import { PlayModelTab } from '@/components/rivales/tabs/PlayModelTab';
import { ReportsTab } from '@/components/rivales/tabs/ReportsTab';
import { VideosTab } from '@/components/rivales/tabs/VideosTab';
import { DocumentsTab } from '@/components/rivales/tabs/DocumentsTab';
import { AIScoutingTab } from '@/components/rivales/tabs/AIScoutingTab';
import { HistoryTab } from '@/components/rivales/tabs/HistoryTab';
import { StatsTab } from '@/components/rivales/tabs/StatsTab';
import { CalendarTab } from '@/components/rivales/tabs/CalendarTab';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Target, ArrowLeft, Info, Users, UserCheck, Crosshair, Brain,
  FileText, Film, FolderOpen, History, BarChart2, CalendarDays,
  Shield, MapPin, AlertCircle, ChevronRight,
} from 'lucide-react';

// --- Tab definitions ---
const TABS = [
  { id: 'GENERAL',      label: 'Datos Generales',   icon: Info,          short: 'General' },
  { id: 'PLANTILLA',    label: 'Plantilla',         icon: Users,         short: 'Plantilla' },
  { id: 'STAFF',        label: 'Cuerpo Técnico',    icon: UserCheck,     short: 'Staff' },
  { id: 'MODELO',       label: 'Modelo de Juego',   icon: Crosshair,     short: 'Modelo' },
  { id: 'IA',           label: 'IA Scouting',       icon: Brain,         short: 'IA' },
  { id: 'INFORME',      label: 'Informe del Míster', icon: FileText,     short: 'Informe' },
  { id: 'VIDEOS',       label: 'Vídeos',            icon: Film,          short: 'Vídeos' },
  { id: 'DOCUMENTOS',   label: 'Documentos',        icon: FolderOpen,    short: 'Docs' },
  { id: 'HISTORIAL',    label: 'Historial',         icon: History,       short: 'Historial' },
  { id: 'ESTADISTICAS', label: 'Estadísticas',      icon: BarChart2,     short: 'Stats' },
  { id: 'CALENDARIO',   label: 'Calendario',        icon: CalendarDays,  short: 'Calendario' },
] as const;

type TabType = typeof TABS[number]['id'];

// --- Placeholder content for each tab (to be replaced in later phases) ---
function TabPlaceholder({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 mb-4">
        <Icon className="h-10 w-10 text-slate-500" />
      </div>
      <h3 className="text-lg font-bold text-slate-300">{label}</h3>
      <p className="text-slate-500 text-sm mt-2 max-w-sm">
        Este módulo se desarrollará en las siguientes fases. La estructura está lista y conectada a la base de datos.
      </p>
    </div>
  );
}

export function RivalDetailsClient({ rivalId }: { rivalId: string }) {
  const router = useRouter();
  const { club, season, completitud, loading, updateClub, updateSeason } = useClubDetails(rivalId, '2026-27');
  const [activeTab, setActiveTab] = useState<TabType>('GENERAL');

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <Skeleton className="h-8 w-40 bg-slate-800" />
        <Skeleton className="h-40 w-full bg-slate-800 rounded-3xl" />
        <Skeleton className="h-12 w-full bg-slate-800 rounded-xl" />
        <Skeleton className="h-64 w-full bg-slate-800 rounded-3xl" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="p-4 md:p-8 text-center text-slate-400">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-slate-600" />
        <p>Club no encontrado.</p>
        <div className="mt-4">
          <Button onClick={() => router.push('/rivales')} variant="secondary">
            Volver a Rivales
          </Button>
        </div>
      </div>
    );
  }

  // Helper para el nivel de dificultad
  const difficultyLevel = season?.nivel_dificultad || 0;
  const getDifficultyColor = (level: number) => {
    switch(level) {
      case 1: return 'bg-emerald-500';
      case 2: return 'bg-yellow-400';
      case 3: return 'bg-amber-500';
      case 4: return 'bg-orange-500';
      case 5: return 'bg-red-600';
      default: return 'bg-slate-700';
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header con info del club */}
      <div className="relative border-b border-slate-800/80 overflow-hidden">
        {/* Fondo de fotografía del campo */}
        {club.imagen_fondo_url ? (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 mix-blend-luminosity"
            style={{ backgroundImage: `url(${club.imagen_fondo_url})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 opacity-80" />
        )}
        
        {/* Overlay gradient para asegurar legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent" />

        <div className="relative z-10 max-w-[1600px] mx-auto px-4 md:px-8 pt-4 pb-5">
          {/* Breadcrumb */}
          <Link
            href="/rivales"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-[#CC0E21] transition-colors mb-6 bg-slate-950/50 px-3 py-1.5 rounded-full backdrop-blur-md border border-slate-800/50 w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a Rivales
          </Link>

          {/* Club identity */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Escudo */}
              <div className="shrink-0 relative">
                <div className="absolute inset-0 bg-white/5 rounded-2xl blur-xl" />
                {club.escudo_url ? (
                  <img
                    src={club.escudo_url}
                    alt={club.nombre}
                    className="relative h-20 w-20 md:h-24 md:w-24 object-contain drop-shadow-2xl"
                  />
                ) : (
                  <div className="relative h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center backdrop-blur-sm">
                    <Shield className="h-10 w-10 text-slate-500" />
                  </div>
                )}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight truncate drop-shadow-md">
                  {club.nombre}
                </h1>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                  {(club.ciudad || club.campo_nombre) && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-300">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      {[club.ciudad, club.campo_nombre].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {season && (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800/50 backdrop-blur-sm">
                      {season.temporada} · {season.grupo || 'Sin grupo'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Status section */}
            <div className="flex items-center gap-6 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-md">
              {/* Scouting Status */}
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Estado Scouting</div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  season?.estado_scouting === 'Completo' ? 'bg-emerald-950/50 text-emerald-400 border-emerald-900/30' :
                  season?.estado_scouting === 'Parcial' ? 'bg-amber-950/50 text-amber-400 border-amber-900/30' :
                  'bg-red-950/50 text-red-400 border-red-900/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    season?.estado_scouting === 'Completo' ? 'bg-emerald-500' :
                    season?.estado_scouting === 'Parcial' ? 'bg-amber-500' :
                    'bg-red-500'
                  } animate-pulse`} />
                  {season?.estado_scouting || 'Sin analizar'}
                </span>
              </div>

              {/* Dificultad */}
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Nivel Dificultad</div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div 
                      key={level} 
                      className={`w-3 h-3 rounded-full border border-slate-800/50 ${level <= difficultyLevel ? getDifficultyColor(level) : 'bg-slate-800/50'} shadow-inner`}
                    />
                  ))}
                </div>
              </div>

              {/* Completitud */}
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">Ficha</div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#CC0E21] to-red-500 rounded-full" 
                      style={{ width: `${completitud}%` }} 
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-300 tabular-nums">{completitud}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <div className="flex overflow-x-auto no-scrollbar -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all whitespace-nowrap border-2 ${
                    isActive
                      ? 'bg-[#CC0E21] text-white border-[#CC0E21] shadow-[0_0_15px_rgba(204,14,33,0.5)]'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-500'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.short}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-6">
        {activeTab === 'GENERAL' && (
          <GeneralTab club={club} onUpdate={updateClub} />
        )}
        {activeTab === 'PLANTILLA' && (
          <PlayersTab season={season} />
        )}
        {activeTab === 'STAFF' && (
          <StaffTab season={season} />
        )}
        {activeTab === 'MODELO' && (
          <PlayModelTab season={season} />
        )}
        {activeTab === 'IA' && (
          <AIScoutingTab season={season} />
        )}
        {activeTab === 'INFORME' && (
          <ReportsTab season={season} />
        )}
        {activeTab === 'VIDEOS' && (
          <VideosTab club={club} season={season} />
        )}
        {activeTab === 'DOCUMENTOS' && (
          <DocumentsTab club={club} season={season} />
        )}
        {activeTab === 'HISTORIAL' && (
          <HistoryTab club={club} season={season} />
        )}
        {activeTab === 'ESTADISTICAS' && (
          <StatsTab season={season} onUpdate={updateSeason} />
        )}
        {activeTab === 'CALENDARIO' && (
          <CalendarTab season={season} />
        )}
      </div>
    </div>
  );
}
