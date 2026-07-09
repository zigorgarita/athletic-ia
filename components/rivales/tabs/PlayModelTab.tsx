'use client';
import React, { useState, useEffect } from 'react';
import { ClubSeason } from '@/hooks/useClubs';
import { useClubPlayModel, ClubPlayModel } from '@/hooks/useClubPlayModel';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { Crosshair, Shield, Zap, ArrowRightLeft, Flag } from 'lucide-react';

interface PlayModelTabProps {
  season: ClubSeason | null;
}

export function PlayModelTab({ season }: PlayModelTabProps) {
  const { playModel, loading, saveModel } = useClubPlayModel(season?.id);
  const { isEditMode } = useEditMode();

  const [formData, setFormData] = useState<Partial<ClubPlayModel>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (playModel) {
      setFormData(playModel);
    } else {
      setFormData({});
    }
  }, [playModel]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (createNewVersion = false) => {
    setIsSaving(true);
    await saveModel(formData, createNewVersion);
    setIsSaving(false);
  };

  if (!season) {
    return <div className="p-8 text-center text-slate-400">No hay datos de temporada disponibles.</div>;
  }

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-800 animate-pulse rounded-3xl" />)}
      </div>
    );
  }

  const inputClass = "w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 focus:ring-1 focus:ring-[#CC0E21]/30 transition-all placeholder:text-slate-600 disabled:opacity-60 disabled:cursor-not-allowed";
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1200px] mx-auto">
      
      {/* Cabecera de acciones */}
      {isEditMode && (
        <div className="flex justify-between items-center bg-slate-900/40 p-4 rounded-3xl border border-slate-800/80 sticky top-4 z-10 backdrop-blur-md">
          <div className="text-sm text-slate-400">
            {playModel ? (
              <span>Editando versión {playModel.version} (Última act: {playModel.fecha})</span>
            ) : (
              <span>Creando primer modelo de juego</span>
            )}
          </div>
          <div className="flex gap-3">
            {playModel && (
              <Button onClick={() => handleSave(true)} variant="secondary" disabled={isSaving}>
                Guardar como Nueva Versión
              </Button>
            )}
            <Button onClick={() => handleSave(false)} variant="primary" loading={isSaving}>
              Guardar Cambios
            </Button>
          </div>
        </div>
      )}

      {/* SISTEMAS */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-slate-200 mb-5 flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-slate-500" />
          Sistemas de Juego
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Sistema Principal</label>
            <input type="text" name="sistema_principal" value={formData.sistema_principal || ''} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: 1-4-2-3-1" />
          </div>
          <div>
            <label className={labelClass}>Sistemas Alternativos</label>
            <input type="text" name="sistemas_alternativos" value={formData.sistemas_alternativos || ''} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: 1-4-4-2, 1-3-5-2" />
          </div>
        </div>
      </div>

      {/* FASE OFENSIVA */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-slate-200 mb-5 flex items-center gap-2">
          <Zap className="h-5 w-5 text-emerald-500/70" />
          Fase Ofensiva
        </h3>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Salida de Balón</label>
              <textarea name="salida_balon" value={formData.salida_balon || ''} onChange={handleChange} disabled={!isEditMode} rows={3} className={inputClass} placeholder="¿Cómo inician? (En corto, directo, jugadores clave...)" />
            </div>
            <div>
              <label className={labelClass}>Construcción / Progresión</label>
              <textarea name="construccion" value={formData.construccion || ''} onChange={handleChange} disabled={!isEditMode} rows={3} className={inputClass} placeholder="¿Cómo superan líneas de presión?" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Ataque Organizado</label>
            <textarea name="ataque_organizado" value={formData.ataque_organizado || ''} onChange={handleChange} disabled={!isEditMode} rows={3} className={inputClass} placeholder="Comportamiento en 3/4 de campo..." />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Ataque por Bandas</label>
              <textarea name="ataque_bandas" value={formData.ataque_bandas || ''} onChange={handleChange} disabled={!isEditMode} rows={2} className={inputClass} placeholder="Mecanismos exteriores, centros, incorporaciones..." />
            </div>
            <div>
              <label className={labelClass}>Ataque Interior</label>
              <textarea name="ataque_interior" value={formData.ataque_interior || ''} onChange={handleChange} disabled={!isEditMode} rows={2} className={inputClass} placeholder="Juego entre líneas, desmarques ruptura..." />
            </div>
          </div>
        </div>
      </div>

      {/* TRANSICIONES */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-slate-200 mb-5 flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-blue-500/70" />
          Transiciones
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Transición Ofensiva (Robo → Ataque)</label>
            <textarea name="transicion_ofensiva" value={formData.transicion_ofensiva || ''} onChange={handleChange} disabled={!isEditMode} rows={4} className={inputClass} placeholder="¿Contraatacan rápido? ¿Aseguran pase de seguridad? ¿Buscadores principales?" />
          </div>
          <div>
            <label className={labelClass}>Transición Defensiva (Pérdida → Defensa)</label>
            <textarea name="transicion_defensiva" value={formData.transicion_defensiva || ''} onChange={handleChange} disabled={!isEditMode} rows={4} className={inputClass} placeholder="¿Presionan tras pérdida? ¿Repliegan? ¿Zonas vulnerables?" />
          </div>
        </div>
      </div>

      {/* FASE DEFENSIVA */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-slate-200 mb-5 flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#CC0E21]/70" />
          Fase Defensiva
        </h3>
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Presión</label>
              <textarea name="presion" value={formData.presion || ''} onChange={handleChange} disabled={!isEditMode} rows={3} className={inputClass} placeholder="Alturas de presión, detonantes, orientación..." />
            </div>
            <div>
              <label className={labelClass}>Bloque Defensivo</label>
              <textarea name="bloque_defensivo" value={formData.bloque_defensivo || ''} onChange={handleChange} disabled={!isEditMode} rows={3} className={inputClass} placeholder="Comportamiento en bloque medio/bajo, distancias entre líneas..." />
            </div>
          </div>
          <div>
            <label className={labelClass}>Defensa del Área</label>
            <textarea name="defensa_area" value={formData.defensa_area || ''} onChange={handleChange} disabled={!isEditMode} rows={2} className={inputClass} placeholder="Marcajes (zonal/mixto), despejes, espacios vulnerables..." />
          </div>
        </div>
      </div>

      {/* ABP */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-slate-200 mb-5 flex items-center gap-2">
          <Flag className="h-5 w-5 text-purple-500/70" />
          Acciones a Balón Parado (ABP)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>ABP Ofensiva</label>
            <textarea name="abp_ofensiva" value={formData.abp_ofensiva || ''} onChange={handleChange} disabled={!isEditMode} rows={4} className={inputClass} placeholder="Lanzadores, jugadas destacadas (córners, faltas laterales...)" />
          </div>
          <div>
            <label className={labelClass}>ABP Defensiva</label>
            <textarea name="abp_defensiva" value={formData.abp_defensiva || ''} onChange={handleChange} disabled={!isEditMode} rows={4} className={inputClass} placeholder="Disposición defensiva (zonal, al hombre, mixto), hombres en barrera, posiciones débiles..." />
          </div>
        </div>
      </div>

    </div>
  );
}
