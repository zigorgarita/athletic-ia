'use client';
import React, { useState } from 'react';
import { Club } from '@/hooks/useClubs';
import { Button } from '@/components/ui/Button';
import { useEditMode } from '@/context/EditModeContext';
import { Save, MapPin, Building, Globe, Map, Upload } from 'lucide-react';

interface GeneralTabProps {
  club: Club;
  onUpdate: (data: Partial<Club>) => Promise<boolean>;
}

export function GeneralTab({ club, onUpdate }: GeneralTabProps) {
  const { isEditMode } = useEditMode();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Club>>({
    nombre_corto: club.nombre_corto || '',
    escudo_url: club.escudo_url || '',
    imagen_fondo_url: club.imagen_fondo_url || '',
    ciudad: club.ciudad || '',
    provincia: club.provincia || '',
    comunidad_autonoma: club.comunidad_autonoma || '',
    ano_fundacion: club.ano_fundacion || undefined,
    colores: club.colores || '',
    equipacion_local: club.equipacion_local || '',
    equipacion_visitante: club.equipacion_visitante || '',
    presidente: club.presidente || '',
    director_deportivo: club.director_deportivo || '',
    web: club.web || '',
    cantera: club.cantera || '',
    campo_nombre: club.campo_nombre || '',
    campo_direccion: club.campo_direccion || '',
    campo_google_maps: club.campo_google_maps || '',
    coordenadas_gps: club.coordenadas_gps || '',
    tiempo_viaje: club.tiempo_viaje || '',
    campo_cesped: club.campo_cesped || '',
    campo_dimensiones: club.campo_dimensiones || '',
    campo_capacidad: club.campo_capacidad || '',
    vestuarios: club.vestuarios || '',
    banquillos: club.banquillos || '',
    zona_grabacion: club.zona_grabacion || '',
    observaciones_campo: club.observaciones_campo || '',
    observaciones_generales: club.observaciones_generales || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate(formData);
    setIsSaving(false);
  };

  const inputClass = `w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 focus:ring-1 focus:ring-[#CC0E21]/30 transition-all ${!isEditMode && 'opacity-70 cursor-not-allowed'}`;
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Botonera Guardar */}
      {isEditMode && (
        <div className="flex justify-end">
          <Button onClick={handleSave} variant="primary" loading={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            Guardar Cambios
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Identidad y Ubicación */}
        <div className="space-y-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-slate-200 mb-5 flex items-center gap-2">
              <Building className="h-5 w-5 text-slate-500" />
              Identidad y Ubicación
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Nombre Corto</label>
                  <input type="text" name="nombre_corto" value={formData.nombre_corto as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: Athletic" />
                </div>
                <div>
                  <label className={labelClass}>Año Fundación</label>
                  <input type="number" name="ano_fundacion" value={formData.ano_fundacion || ''} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: 1898" />
                </div>
              </div>
              <div>
                <label className={labelClass}>URL del Escudo</label>
                <div className="relative">
                  <input type="url" name="escudo_url" value={formData.escudo_url as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="https://..." />
                  {isEditMode && (
                    <Upload className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  )}
                </div>
              </div>
              <div>
                <label className={labelClass}>URL de Fotografía de Cabecera (Campo)</label>
                <div className="relative">
                  <input type="url" name="imagen_fondo_url" value={formData.imagen_fondo_url as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="https://..." />
                  {isEditMode && <Upload className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />}
                </div>
              </div>
              <div>
                <label className={labelClass}>Colores del Club</label>
                <input type="text" name="colores" value={formData.colores as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: Rojiblanco" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Equipación Local</label>
                  <input type="text" name="equipacion_local" value={formData.equipacion_local as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: Camiseta rojiblanca" />
                </div>
                <div>
                  <label className={labelClass}>Equipación Visitante</label>
                  <input type="text" name="equipacion_visitante" value={formData.equipacion_visitante as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: Camiseta azul" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Ciudad</label>
                  <input type="text" name="ciudad" value={formData.ciudad as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: Bilbao" />
                </div>
                <div>
                  <label className={labelClass}>Provincia</label>
                  <input type="text" name="provincia" value={formData.provincia as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: Bizkaia" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Comunidad Autónoma</label>
                <input type="text" name="comunidad_autonoma" value={formData.comunidad_autonoma as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: País Vasco" />
              </div>
            </div>
          </div>

          {/* Directiva y Contacto */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6">
            <h3 className="text-lg font-bold text-slate-200 mb-5 flex items-center gap-2">
              <Globe className="h-5 w-5 text-slate-500" />
              Directiva y Contacto
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Presidente</label>
                  <input type="text" name="presidente" value={formData.presidente as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Director Deportivo</label>
                  <input type="text" name="director_deportivo" value={formData.director_deportivo as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Sitio Web</label>
                <input type="url" name="web" value={formData.web as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="https://..." />
              </div>
              <div>
                <label className={labelClass}>Acuerdo Cantera / Filialidad</label>
                <input type="text" name="cantera" value={formData.cantera as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: Filial de la Real Sociedad" />
              </div>
              <div>
                <label className={labelClass}>Observaciones Generales</label>
                <textarea name="observaciones_generales" value={formData.observaciones_generales as string} onChange={handleChange} disabled={!isEditMode} rows={4} className={inputClass} placeholder="Notas adicionales sobre el club..." />
              </div>
            </div>
          </div>
        </div>

        {/* Instalaciones y Campo */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-slate-200 mb-5 flex items-center gap-2">
            <Map className="h-5 w-5 text-slate-500" />
            Instalaciones / Campo
          </h3>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nombre de la Instalación / Campo</label>
              <input type="text" name="campo_nombre" value={formData.campo_nombre as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: Lezama - Campo 8" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tiempo Estimado de Viaje</label>
                <input type="text" name="tiempo_viaje" value={formData.tiempo_viaje as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: 45 minutos" />
              </div>
              <div>
                <label className={labelClass}>Coordenadas GPS</label>
                <input type="text" name="coordenadas_gps" value={formData.coordenadas_gps as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: 43.2627, -2.9253" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Dirección</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input type="text" name="campo_direccion" value={formData.campo_direccion as string} onChange={handleChange} disabled={!isEditMode} className={`${inputClass} pl-10`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Enlace Google Maps</label>
              <input type="url" name="campo_google_maps" value={formData.campo_google_maps as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="https://goo.gl/maps/..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tipo de Césped</label>
                <select name="campo_cesped" value={formData.campo_cesped as string} onChange={handleChange} disabled={!isEditMode} className={inputClass}>
                  <option value="">Seleccionar...</option>
                  <option value="Artificial">Artificial</option>
                  <option value="Natural">Natural</option>
                  <option value="Híbrido">Híbrido</option>
                  <option value="Tierra">Tierra</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Dimensiones</label>
                <input type="text" name="campo_dimensiones" value={formData.campo_dimensiones as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: 105 x 68 m" />
              </div>
            </div>

            <div>
              <label className={labelClass}>Mejor zona para grabar (Scouting)</label>
              <input type="text" name="zona_grabacion" value={formData.zona_grabacion as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: Grada preferencia, torre central" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Vestuarios</label>
                <input type="text" name="vestuarios" value={formData.vestuarios as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: Amplios, bajo grada" />
              </div>
              <div>
                <label className={labelClass}>Banquillos</label>
                <input type="text" name="banquillos" value={formData.banquillos as string} onChange={handleChange} disabled={!isEditMode} className={inputClass} placeholder="Ej: Cubiertos, 12 asientos" />
              </div>
            </div>

            <div>
              <label className={labelClass}>Observaciones del campo</label>
              <textarea name="observaciones_campo" value={formData.observaciones_campo as string} onChange={handleChange} disabled={!isEditMode} rows={3} className={inputClass} placeholder="Anotaciones sobre iluminación, viento, etc." />
            </div>
          </div>
        </div>
      </div>

      {/* Galería de Instalaciones (Placeholder para Fase 10/11 o cuando se añadan imágenes completas) */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 mt-8">
        <h3 className="text-lg font-bold text-slate-200 mb-2 flex items-center gap-2">
          <Upload className="h-5 w-5 text-slate-500" />
          Fotografías de Instalaciones
        </h3>
        <p className="text-slate-400 text-sm mb-6 max-w-2xl">
          Aquí podrás subir fotografías del campo principal, anexo, vestuarios, banquillos, grada y zonas de calentamiento y grabación.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Campo Principal', 'Vestuarios', 'Banquillos', 'Grada / Grabación'].map((cat) => (
            <div key={cat} className="h-32 border-2 border-dashed border-slate-700/50 rounded-2xl flex flex-col items-center justify-center text-slate-500 hover:border-slate-500 hover:text-slate-300 transition-colors cursor-pointer bg-slate-950/30">
              <Upload className="h-6 w-6 mb-2 opacity-50" />
              <span className="text-xs font-bold uppercase tracking-wider">{cat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
