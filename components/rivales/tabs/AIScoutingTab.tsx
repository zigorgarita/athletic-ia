'use client';
import React, { useState, useMemo } from 'react';
import { Club, ClubSeason } from '@/hooks/useClubs';
import { useClubAIReports, StructuredScoutingPlan, ScoutingBlock } from '@/hooks/useClubAIReports';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import {
  Brain,
  Trash2,
  Calendar,
  Shield,
  Swords,
  AlertTriangle,
  AlertCircle,
  Lightbulb,
  Zap,
  Bot,
  Wand2,
  FileText,
  Compass,
  ArrowRightLeft,
  Flame,
  CheckCircle2,
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import CapaCStructuredView from '@/components/rivales/scouting/CapaCStructuredView';

interface AIScoutingTabProps {
  club?: Club | null;
  season: ClubSeason | null;
}

export function AIScoutingTab({ club, season }: AIScoutingTabProps) {
  const { reports, loading, error: hookError, generateAIScouting, deleteReport } = useClubAIReports(season?.id);
  const { isEditMode } = useEditMode();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // El informe activo por defecto es el más reciente
  const activeReport = useMemo(() => {
    if (!reports || reports.length === 0) return null;
    if (selectedReportId) {
      const found = reports.find(r => r.id === selectedReportId);
      if (found) return found;
    }
    return reports[0];
  }, [reports, selectedReportId]);

  // Parsear el JSON estructurado si existe en informe_completo
  const parsedActivePlan = useMemo<StructuredScoutingPlan | null>(() => {
    if (!activeReport?.informe_completo) return null;
    try {
      const data = JSON.parse(activeReport.informe_completo);
      if (data && typeof data === 'object' && ('resumenEjecutivo' in data || 'comoDefenderles' in data)) {
        return data as StructuredScoutingPlan;
      }
      return null;
    } catch {
      return null;
    }
  }, [activeReport]);

  const handleGenerate = async () => {
    if (!club?.id || !season?.id) {
      setGenerationError('Faltan datos del rival o temporada para generar el análisis.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    const res = await generateAIScouting(club.id, club.nombre, season.temporada);
    setIsGenerating(false);

    if (!res.success) {
      setGenerationError(res.error || 'Error al generar el scouting con IA.');
    } else {
      setSelectedReportId(null); // Apunta automáticamente al nuevo informe más reciente
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este informe de IA?')) {
      await deleteReport(id);
    }
  };

  if (!season) {
    return <div className="p-8 text-center text-slate-400">No hay datos de temporada disponibles.</div>;
  }

  const effectiveError = generationError || hookError;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[1400px] mx-auto">
      
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-5 rounded-3xl border border-indigo-900/40 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Brain className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">IA Scouting: Rival vs SD Indautxu</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-500/30">
                1-4-2-3-1 DH
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cruce automatizado de observaciones aprobadas de informes con la doctrina oficial del club.
            </p>
          </div>
        </div>

        {isEditMode && (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            variant="primary"
            className="bg-indigo-600 hover:bg-indigo-500 text-white border-none shrink-0 flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-200" />
                <span>Analizando Rival con Gemini...</span>
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                <span>{reports.length > 0 ? 'Regenerar Análisis vs Nuestro Modelo' : 'Generar Análisis vs Nuestro Modelo'}</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Banner de Error si existe */}
      {effectiveError && (
        <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-4 flex items-start gap-3 text-red-200 text-sm">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-red-300">Error en el análisis de scouting:</div>
            <div className="mt-0.5 text-xs text-red-300/90">{effectiveError}</div>
          </div>
        </div>
      )}

      {/* Estado: Generando análisis */}
      {isGenerating && (
        <div className="bg-slate-900/60 border border-indigo-500/30 rounded-3xl p-10 text-center space-y-4 animate-pulse">
          <div className="w-14 h-14 rounded-3xl bg-indigo-500/10 border border-indigo-500/40 flex items-center justify-center mx-auto text-indigo-400">
            <Bot className="h-7 w-7 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-200">Gemini está analizando el informe del rival...</h4>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Recuperando observaciones aprobadas de {club?.nombre || 'este rival'}, evaluando su estructura táctica y cruzándola con el Modelo de Juego de la SD Indautxu Juvenil A.
            </p>
          </div>
        </div>
      )}

      {/* Estado: Cargando informes de la base de datos */}
      {loading && !isGenerating && (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-48 bg-slate-900/40 border border-slate-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Estado: Sin análisis guardados */}
      {!loading && !isGenerating && reports.length === 0 && (
        <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50 p-8 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-center mx-auto text-indigo-400">
            <Bot className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-200">Sin análisis táctico generado todavía</h3>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Sube informes PDF en la pestaña <span className="text-slate-200 font-semibold">Documentos</span>, aprueba las observaciones del analista y pulsa el botón superior para que la IA genere el plan táctico comparativo.
            </p>
          </div>
          {isEditMode && (
            <Button
              onClick={handleGenerate}
              className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white border-none inline-flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <Wand2 className="h-4 w-4" />
              Generar análisis vs nuestro modelo
            </Button>
          )}
        </div>
      )}

      {/* Estado: Análisis Disponible (Vista Detallada del Plan Táctico) */}
      {!loading && !isGenerating && activeReport && (
        <div className="space-y-6">

          {/* Barra de Versiones / Historial si hay más de 1 informe */}
          {reports.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800/80">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-2 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                Versiones ({reports.length}):
              </span>
              {reports.map((rep, idx) => {
                const isSelected = rep.id === activeReport.id;
                return (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedReportId(rep.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                        : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <span>{rep.tipo || (idx === 0 ? 'Más reciente' : `Versión ${reports.length - idx}`)}</span>
                    <span className="text-[10px] opacity-75 font-normal">{rep.fecha || rep.created_at.slice(0, 10)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tarjeta de Resumen Ejecutivo y Metadatos */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800/60">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    BORRADOR TÁCTICO IA
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    {activeReport.fecha || activeReport.created_at.slice(0, 10)}
                  </span>
                  <span className="text-xs text-indigo-400 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/40">
                    Tipo: {activeReport.tipo}
                  </span>
                  {parsedActivePlan?.sistemaRivalIdentificado && (
                    <span className="text-xs text-slate-300 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700 font-semibold">
                      Sistema Rival: {parsedActivePlan.sistemaRivalIdentificado}
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold text-white mt-2">
                  Plan de Partido vs {club?.nombre || 'Rival'}
                </h4>
              </div>

              {isEditMode && (
                <button
                  onClick={(e) => handleDelete(activeReport.id, e)}
                  className="p-2 rounded-xl bg-slate-800/60 text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-all shrink-0"
                  title="Eliminar este informe de IA"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Resumen Ejecutivo */}
            <div className="mt-4 text-sm text-slate-300 leading-relaxed bg-indigo-950/20 p-4 rounded-2xl border border-indigo-900/30">
              <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-indigo-400" />
                Resumen Ejecutivo del Choque
              </div>
              <p>{parsedActivePlan?.resumenEjecutivo || activeReport.plan_recomendado || 'Plan táctico adaptado frente al rival.'}</p>
            </div>

            {/* Documentos Fuentes usados */}
            {parsedActivePlan?.metadatosAnalisis && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1 text-slate-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  {parsedActivePlan.metadatosAnalisis.totalObservacionesUsadas || 0} observaciones aprobadas procesadas
                </span>
                {parsedActivePlan.metadatosAnalisis.documentosFuentes && parsedActivePlan.metadatosAnalisis.documentosFuentes.length > 0 && (
                  <span className="flex items-center gap-1 text-slate-400">
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    Fuentes: {parsedActivePlan.metadatosAnalisis.documentosFuentes.join(', ')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* SECCIONES TÁCTICAS EN 3 CAPAS (A / B / C) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 1. CÓMO DEFENDERLES */}
            <ScoutingPhaseCard
              title="1. Cómo Defenderles"
              icon={Shield}
              iconColor="text-blue-400"
              borderColor="border-blue-900/40"
              badgeText="Fase Defensiva"
              block={parsedActivePlan?.comoDefenderles}
              fallbackText={activeReport.como_defenderles}
            />

            {/* 2. CÓMO ATACARLES */}
            <ScoutingPhaseCard
              title="2. Cómo Atacarles"
              icon={Swords}
              iconColor="text-emerald-400"
              borderColor="border-emerald-900/40"
              badgeText="Fase Ofensiva"
              block={parsedActivePlan?.comoAtacarles}
              fallbackText={activeReport.como_atacarles}
            />

            {/* 3. PRESIÓN Y ACTIVADORES */}
            <ScoutingPhaseCard
              title="3. Presión y Activadores"
              icon={Flame}
              iconColor="text-red-400"
              borderColor="border-red-900/40"
              badgeText="Acoso y Saltos"
              block={parsedActivePlan?.presionYActivadores}
              fallbackText={activeReport.fortalezas}
            />

            {/* 4. SALIDA DE BALÓN */}
            <ScoutingPhaseCard
              title="4. Salida de Balón"
              icon={Compass}
              iconColor="text-cyan-400"
              borderColor="border-cyan-900/40"
              badgeText="Iniciación Indautxu"
              block={parsedActivePlan?.salidaBalon}
              fallbackText="Salida mediante Cuadrado de Superioridad (Centrales + Pivotes) y reconocimiento de 3º Hombre."
            />

            {/* 5. TRANSICIÓN OFENSIVA */}
            <ScoutingPhaseCard
              title="5. Transición Ofensiva (Robo ➔ Ataque)"
              icon={ArrowRightLeft}
              iconColor="text-purple-400"
              borderColor="border-purple-900/40"
              badgeText="Explotar Desajuste"
              block={parsedActivePlan?.transicionOfensiva}
              fallbackText={activeReport.debilidades}
            />

            {/* 6. TRANSICIÓN DEFENSIVA (Pérdida ➔ Repliegue) */}
            <ScoutingPhaseCard
              title="6. Transición Defensiva (Pérdida ➔ Repliegue)"
              icon={Shield}
              iconColor="text-orange-400"
              borderColor="border-orange-900/40"
              badgeText="Presión 6-8s o Repliegue"
              block={parsedActivePlan?.transicionDefensiva}
              fallbackText={activeReport.riesgos}
            />

            {/* 7. ABP OFENSIVO */}
            <ScoutingPhaseCard
              title="7. ABP Ofensivo (Córneres y Faltas a Favor)"
              icon={Zap}
              iconColor="text-yellow-400"
              borderColor="border-yellow-900/40"
              badgeText="Balón Parado a Favor"
              block={parsedActivePlan?.abpOfensivo}
              fallbackText="Cargar zonas de debilidad detectadas en la defensa zonal/mixta del rival."
            />

            {/* 8. ABP DEFENSIVO */}
            <ScoutingPhaseCard
              title="8. ABP Defensivo (Neutralización de Jugadas Rival)"
              icon={AlertTriangle}
              iconColor="text-amber-400"
              borderColor="border-amber-900/40"
              badgeText="Vigilancia ABP Rival"
              block={parsedActivePlan?.abpDefensivo}
              fallbackText={activeReport.alertas}
            />

          </div>

          {/* AMENAZAS PRINCIPALES DEL RIVAL */}
          {parsedActivePlan?.amenazasPrincipales && parsedActivePlan.amenazasPrincipales.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-red-300 font-bold text-sm uppercase tracking-wider">
                <AlertCircle className="h-5 w-5 text-red-400" />
                Amenazas Individuales del Rival
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {parsedActivePlan.amenazasPrincipales.map((threat, idx) => (
                  <div key={idx} className="bg-slate-950/60 border border-red-900/30 rounded-2xl p-4 space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-xs font-bold text-white">
                          {threat.jugador || `Jugador #${idx + 1}`}
                        </span>
                        {threat.dorsal && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-red-950 text-red-300 text-[10px] font-bold border border-red-800/50">
                            Dorsal {threat.dorsal}
                          </span>
                        )}
                        {threat.posicion && (
                          <div className="text-[11px] text-slate-400">{threat.posicion}</div>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        threat.peligro === 'critico' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                        threat.peligro === 'alto' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                        'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                      }`}>
                        {threat.peligro || 'alto'}
                      </span>
                    </div>

                    <div className="text-xs space-y-2 pt-1 border-t border-slate-800/80">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Evidencia:</span>
                        <p className="text-slate-300 mt-0.5">{threat.capaA_evidencia}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Consigna Indautxu:
                        </span>
                        <CapaCStructuredView text={threat.capaC_propuestaIndautxu} compact />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DEBILIDADES A EXPLOTAR */}
          {parsedActivePlan?.debilidadesExplotar && parsedActivePlan.debilidadesExplotar.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm uppercase tracking-wider">
                <Lightbulb className="h-5 w-5 text-emerald-400" />
                Vulnerabilidades y Debilidades a Explotar
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {parsedActivePlan.debilidadesExplotar.map((deb, idx) => (
                  <div key={idx} className="bg-slate-950/60 border border-emerald-900/30 rounded-2xl p-4 space-y-2">
                    <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {deb.aspecto || `Vulnerabilidad #${idx + 1}`}
                    </div>
                    <div className="text-xs space-y-2">
                      <p className="text-slate-300"><span className="text-slate-500 font-semibold">Dato observado:</span> {deb.capaA_evidencia}</p>
                      <div className="pt-1 border-t border-slate-800/60">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Plan de ataque Indautxu:
                        </span>
                        <CapaCStructuredView text={deb.capaC_propuestaIndautxu} compact />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONSIGNAS POR LÍNEAS / PUESTOS */}
          {parsedActivePlan?.consignasPorLineas && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm uppercase tracking-wider">
                <Layers className="h-5 w-5 text-indigo-400" />
                Consignas Específicas por Líneas (SD Indautxu 1-4-2-3-1)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <LineCard title="Portería" text={parsedActivePlan.consignasPorLineas.porteria} color="text-amber-400" bg="border-amber-900/30" />
                <LineCard title="Defensa (Centrales y Laterales)" text={parsedActivePlan.consignasPorLineas.defensa} color="text-blue-400" bg="border-blue-900/30" />
                <LineCard title="Mediocampo (Doble Pivote y Mediapunta)" text={parsedActivePlan.consignasPorLineas.mediocampo} color="text-indigo-400" bg="border-indigo-900/30" />
                <LineCard title="Delantera (Extremos y Punta)" text={parsedActivePlan.consignasPorLineas.delantera} color="text-emerald-400" bg="border-emerald-900/30" />
              </div>
            </div>
          )}

          {/* RIESGOS DEL PLAN */}
          {parsedActivePlan?.riesgosDelPlan && parsedActivePlan.riesgosDelPlan.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm uppercase tracking-wider">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                Riesgos Asumidos y Puntos Críticos del Plan
              </div>
              <ul className="space-y-2">
                {parsedActivePlan.riesgosDelPlan.map((r, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                    <span className="text-amber-400 font-bold">⚠️</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

/**
 * Componente Tarjeta de Fase Táctica con Separación Estricta de 3 Capas
 */
function ScoutingPhaseCard({
  title,
  icon: Icon,
  iconColor,
  borderColor,
  badgeText,
  block,
  fallbackText,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  borderColor: string;
  badgeText: string;
  block?: ScoutingBlock;
  fallbackText?: string | null;
}) {
  return (
    <div className={`bg-slate-900/40 border ${borderColor} rounded-3xl p-5 space-y-4 flex flex-col justify-between shadow-lg`}>
      <div className="space-y-3">
        {/* Cabecera de la fase */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <Icon className={`h-4 w-4 ${iconColor}`} />
            <h4 className="text-sm font-bold text-white">{title}</h4>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {badgeText}
          </span>
        </div>

        {/* Si tenemos el bloque estructurado en 3 capas */}
        {block ? (
          <div className="space-y-3 text-xs">
            {/* CAPA A — DATO CONFIRMADO DEL RIVAL */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Capa A — Evidencia del Rival (Informes)
              </div>
              <div className="text-slate-300 pl-2.5 space-y-0.5">
                {block.capaA_evidencias && block.capaA_evidencias.length > 0 ? (
                  block.capaA_evidencias.map((ev, i) => <p key={i}>• {ev}</p>)
                ) : (
                  <p className="text-slate-500 italic">Sin evidencias específicas registradas.</p>
                )}
              </div>
            </div>

            {/* CAPA B — INTERPRETACIÓN IA */}
            {block.capaB_interpretacion && (
              <div className="bg-indigo-950/20 p-3 rounded-xl border border-indigo-900/30 space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  Capa B — Interpretación Táctica IA
                </div>
                <p className="text-indigo-200/90 pl-2.5">{block.capaB_interpretacion}</p>
              </div>
            )}

            {/* CAPA C — PROPUESTA PARA SD INDAUTXU */}
            <div className="bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-900/40 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 pb-1 border-b border-emerald-900/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Capa C — Propuesta SD Indautxu (1-4-2-3-1)
              </div>
              <div className="pt-0.5">
                <CapaCStructuredView
                  text={block.capaC_propuestaIndautxu}
                  fallbackText="Mantener principios del modelo de juego Indautxu."
                />
              </div>
            </div>
          </div>
        ) : (
          /* Fallback si es un informe antiguo de solo texto */
          <div className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800 leading-relaxed">
            {fallbackText || 'Sin datos registrados para esta fase.'}
          </div>
        )}
      </div>
    </div>
  );
}

function LineCard({ title, text, color, bg }: { title: string; text?: string; color: string; bg: string }) {
  return (
    <div className={`bg-slate-950/60 border ${bg} rounded-2xl p-4 space-y-1.5`}>
      <div className={`text-xs font-bold ${color}`}>{title}</div>
      <p className="text-xs text-slate-300 leading-relaxed">{text || 'Sin consignas específicas registradas.'}</p>
    </div>
  );
}
