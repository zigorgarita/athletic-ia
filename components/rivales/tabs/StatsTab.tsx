'use client';
import React, { useState } from 'react';
import { ClubSeason } from '@/hooks/useClubs';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { BarChart2, TrendingUp, Trophy, Activity, Target, Shield, AlertCircle, Save, Edit3, Hash } from 'lucide-react';

interface StatsTabProps {
  season: ClubSeason | null;
  onUpdate: (data: Partial<ClubSeason>) => Promise<boolean>;
}

export function StatsTab({ season, onUpdate }: StatsTabProps) {
  const { isEditMode } = useEditMode();
  
  // Default stats structure if missing
  const defaultStats = {
    partidos_jugados: 0, 
    victorias: 0, 
    empates: 0, 
    derrotas: 0, 
    goles_favor: 0, 
    goles_contra: 0, 
    posicion_liga: '', 
    puntos: 0, 
    posesion_media: '', 
    xg_favor: '', 
    xg_contra: '', 
    porterias_cero: 0, 
    tarjetas_amarillas: 0, 
    tarjetas_rojas: 0
  };

  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState(() => {
    return { ...defaultStats, ...(season?.estadisticas || {}) };
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Si es un campo de texto (ej. "1º" o "52.4%") lo guardamos tal cual, si no intentamos parsear a numero
    const isText = ['posicion_liga', 'posesion_media', 'xg_favor', 'xg_contra'].includes(name);
    setStats((prev: typeof defaultStats) => ({
      ...prev,
      [name]: isText ? value : (value === '' ? 0 : Number(value))
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onUpdate({ estadisticas: stats });
    setIsSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };

  if (!season) {
    return <div className="p-8 text-center text-slate-400">No hay datos de temporada disponibles.</div>;
  }

  const inputClass = "w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 focus:ring-1 focus:ring-[#CC0E21]/30 transition-all text-center font-bold text-lg";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 text-center";

  // Cálculos derivados
  const winRate = stats.partidos_jugados > 0 ? Math.round((stats.victorias / stats.partidos_jugados) * 100) : 0;
  const golesPorPartido = stats.partidos_jugados > 0 ? (stats.goles_favor / stats.partidos_jugados).toFixed(2) : 0;
  const golesEnContraPorPartido = stats.partidos_jugados > 0 ? (stats.goles_contra / stats.partidos_jugados).toFixed(2) : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1200px] mx-auto pb-10">
      
      {/* Cabecera */}
      <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-3xl border border-slate-800/80">
        <div className="flex items-center gap-3 ml-2">
          <BarChart2 className="h-5 w-5 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-200">Estadísticas Globales de la Temporada</h3>
        </div>
        {isEditMode && !isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="secondary" className="shrink-0 flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Editar Datos
          </Button>
        )}
        {isEditing && (
          <div className="flex gap-2 shrink-0">
             <Button onClick={() => setIsEditing(false)} variant="ghost" disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} variant="primary" loading={isSaving} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Clasificación y Rendimiento */}
        <div className="space-y-6">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 relative overflow-hidden group hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgb(245,158,11,0.1)] transition-all duration-300">
            <div className="absolute -right-6 -top-6 text-slate-800/30 group-hover:text-amber-500/10 transition-colors duration-500">
              <Trophy className="h-40 w-40" />
            </div>
            
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-6 flex items-center gap-2 relative z-10">
              <Hash className="h-4 w-4" /> Posición y Puntos
            </h4>
            
            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div>
                <label className={labelClass}>Posición en Liga</label>
                {isEditing ? (
                  <input type="text" name="posicion_liga" value={stats.posicion_liga} onChange={handleChange} className={inputClass} placeholder="Ej: 1º" />
                ) : (
                  <p className="text-3xl font-black text-white text-center bg-slate-950 p-4 rounded-2xl border border-slate-800/50">{stats.posicion_liga || '--'}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Puntos Totales</label>
                {isEditing ? (
                  <input type="number" name="puntos" value={stats.puntos} onChange={handleChange} className={inputClass} />
                ) : (
                  <p className="text-3xl font-black text-amber-400 text-center bg-slate-950 p-4 rounded-2xl border border-slate-800/50">{stats.puntos}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 hover:border-slate-600/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2">
              <Activity className="h-4 w-4" /> Partidos
            </h4>
            
            <div className="mb-6">
                <label className={labelClass}>Partidos Jugados</label>
                {isEditing ? (
                  <input type="number" name="partidos_jugados" value={stats.partidos_jugados} onChange={handleChange} className={inputClass} />
                ) : (
                  <p className="text-2xl font-black text-white text-center bg-slate-950 p-3 rounded-2xl border border-slate-800/50">{stats.partidos_jugados}</p>
                )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Vict.</label>
                {isEditing ? (
                  <input type="number" name="victorias" value={stats.victorias} onChange={handleChange} className={inputClass} />
                ) : (
                  <p className="text-xl font-bold text-emerald-400 text-center bg-emerald-500/10 p-2 rounded-xl">{stats.victorias}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Emp.</label>
                {isEditing ? (
                  <input type="number" name="empates" value={stats.empates} onChange={handleChange} className={inputClass} />
                ) : (
                  <p className="text-xl font-bold text-amber-400 text-center bg-amber-500/10 p-2 rounded-xl">{stats.empates}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Derr.</label>
                {isEditing ? (
                  <input type="number" name="derrotas" value={stats.derrotas} onChange={handleChange} className={inputClass} />
                ) : (
                  <p className="text-xl font-bold text-red-400 text-center bg-red-500/10 p-2 rounded-xl">{stats.derrotas}</p>
                )}
              </div>
            </div>
            
            {!isEditing && (
              <div className="mt-6">
                <div className="flex justify-between text-xs text-slate-500 font-bold uppercase mb-2">
                  <span>Porcentaje de Victoria</span>
                  <span className="text-emerald-400">{winRate}%</span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${winRate}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Columna Centro: Goles */}
        <div className="space-y-6">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 hover:border-sky-500/30 hover:shadow-[0_8px_30px_rgb(14,165,233,0.1)] transition-all duration-300">
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-6 flex items-center gap-2">
              <Target className="h-4 w-4" /> Fase Ofensiva
            </h4>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className={labelClass}>Goles a Favor</label>
                {isEditing ? (
                  <input type="number" name="goles_favor" value={stats.goles_favor} onChange={handleChange} className={inputClass} />
                ) : (
                  <p className="text-3xl font-black text-sky-400 text-center bg-slate-950 p-4 rounded-2xl border border-slate-800/50">{stats.goles_favor}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>xG a favor</label>
                {isEditing ? (
                  <input type="text" name="xg_favor" value={stats.xg_favor} onChange={handleChange} className={inputClass} placeholder="Ej: 21.5" />
                ) : (
                  <p className="text-3xl font-black text-white text-center bg-slate-950 p-4 rounded-2xl border border-slate-800/50">{stats.xg_favor || '--'}</p>
                )}
              </div>
            </div>

            {!isEditing && (
              <div className="bg-sky-500/5 p-4 rounded-2xl border border-sky-500/10 flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Media goles marcados</span>
                <span className="text-xl font-black text-white">{golesPorPartido} <span className="text-xs text-slate-500">/ p</span></span>
              </div>
            )}
          </div>

          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 hover:border-orange-500/30 hover:shadow-[0_8px_30px_rgb(249,115,22,0.1)] transition-all duration-300">
            <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400 mb-6 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Fase Defensiva
            </h4>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
               <div>
                <label className={labelClass}>Goles en Contra</label>
                {isEditing ? (
                  <input type="number" name="goles_contra" value={stats.goles_contra} onChange={handleChange} className={inputClass} />
                ) : (
                  <p className="text-3xl font-black text-orange-400 text-center bg-slate-950 p-4 rounded-2xl border border-slate-800/50">{stats.goles_contra}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>xG en contra</label>
                {isEditing ? (
                  <input type="text" name="xg_contra" value={stats.xg_contra} onChange={handleChange} className={inputClass} placeholder="Ej: 18.2" />
                ) : (
                  <p className="text-3xl font-black text-white text-center bg-slate-950 p-4 rounded-2xl border border-slate-800/50">{stats.xg_contra || '--'}</p>
                )}
              </div>
            </div>

            <div className="mb-6">
                <label className={labelClass}>Porterías a cero</label>
                {isEditing ? (
                  <input type="number" name="porterias_cero" value={stats.porterias_cero} onChange={handleChange} className={inputClass} />
                ) : (
                  <p className="text-2xl font-black text-emerald-400 text-center bg-emerald-500/10 p-3 rounded-2xl">{stats.porterias_cero}</p>
                )}
            </div>

            {!isEditing && (
              <div className="bg-orange-500/5 p-4 rounded-2xl border border-orange-500/10 flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Media goles recibidos</span>
                <span className="text-xl font-black text-white">{golesEnContraPorPartido} <span className="text-xs text-slate-500">/ p</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Estilo y Disciplina */}
        <div className="space-y-6">
          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 hover:border-purple-500/30 hover:shadow-[0_8px_30px_rgb(168,85,247,0.1)] transition-all duration-300">
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-6 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Estilo de Juego
            </h4>
            
            <div>
              <label className={labelClass}>Posesión Media</label>
              {isEditing ? (
                <input type="text" name="posesion_media" value={stats.posesion_media} onChange={handleChange} className={inputClass} placeholder="Ej: 52%" />
              ) : (
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800/50 flex flex-col items-center justify-center text-center">
                   <p className="text-5xl font-black text-white mb-2">{stats.posesion_media || '--'}</p>
                   <p className="text-xs text-slate-500">Promedio temporada</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800/80 hover:border-red-500/30 hover:shadow-[0_8px_30px_rgb(239,68,68,0.1)] transition-all duration-300">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-6 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Disciplina
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-10 bg-amber-400 rounded-sm mb-3 shadow-[0_0_15px_rgba(251,191,36,0.3)] rotate-12" />
                <label className={labelClass}>Amarillas</label>
                {isEditing ? (
                  <input type="number" name="tarjetas_amarillas" value={stats.tarjetas_amarillas} onChange={handleChange} className={inputClass} />
                ) : (
                  <p className="text-2xl font-black text-white text-center bg-slate-950 px-6 py-3 rounded-xl border border-slate-800/50 w-full">{stats.tarjetas_amarillas}</p>
                )}
              </div>
              <div className="flex flex-col items-center">
                <div className="w-8 h-10 bg-red-500 rounded-sm mb-3 shadow-[0_0_15px_rgba(239,68,68,0.3)] -rotate-12" />
                <label className={labelClass}>Rojas</label>
                {isEditing ? (
                  <input type="number" name="tarjetas_rojas" value={stats.tarjetas_rojas} onChange={handleChange} className={inputClass} />
                ) : (
                  <p className="text-2xl font-black text-white text-center bg-slate-950 px-6 py-3 rounded-xl border border-slate-800/50 w-full">{stats.tarjetas_rojas}</p>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
