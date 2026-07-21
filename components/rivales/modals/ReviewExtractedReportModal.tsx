'use client';

import React, { useState, useEffect } from 'react';
import { Observation, FlexibleReportExtraction, RivalPlayerThreat } from '@/types';
import { Button } from '@/components/ui/Button';
import { useEditMode } from '@/context/EditModeContext';
import { CheckCircle2, XCircle, AlertCircle, ShieldAlert, UserCheck, Sparkles, Compass } from 'lucide-react';

interface ReviewExtractedReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  extraction: FlexibleReportExtraction | null;
  documentId?: string;
  documentName?: string;
  clubId?: string;
  clubSeasonId?: string;
  rivalName?: string;
  season?: string;
  onSuccess?: () => void;
}

export function ReviewExtractedReportModal({
  isOpen,
  onClose,
  extraction,
  documentId,
  documentName = 'Informe de Scouting',
  clubId,
  clubSeasonId,
  rivalName = 'Rival',
  season = '2026-27',
  onSuccess,
}: ReviewExtractedReportModalProps) {
  const { isEditMode, verifyWritePermission } = useEditMode();
  const [activeTab, setActiveTab] = useState<'all' | 'rival' | 'analyst' | 'players'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado editable para observaciones (SIEMPRE 'pendiente' por defecto)
  const [observations, setObservations] = useState<Observation[]>([]);
  const [threats, setThreats] = useState<RivalPlayerThreat[]>([]);

  useEffect(() => {
    if (!extraction) {
      setObservations([]);
      setThreats([]);
      return;
    }
    const result: Observation[] = [];

    const extRecord = extraction as unknown as Record<string, unknown>;

    // Observaciones del Rival
    const rivalObj = extraction.observacionesRival || extRecord.observaciones_rival || extRecord.hechosRival;
    if (rivalObj) {
      if (Array.isArray(rivalObj)) {
        (rivalObj as Observation[]).forEach(obs => {
          result.push({
            ...obs,
            categoria: obs.categoria || 'salidaBalon',
            estado: 'pendiente', // OBLIGATORIO PENDIENTE POR DEFECTO
            confianza: obs.confianza || 'alta',
            prioridad: obs.prioridad || 'normal',
            esPropuestaAnalista: false,
          });
        });
      } else if (typeof rivalObj === 'object') {
        Object.entries(rivalObj as Record<string, Observation[]>).forEach(([cat, list]) => {
          if (Array.isArray(list)) {
            list.forEach(obs => {
              result.push({
                ...obs,
                categoria: obs.categoria || cat,
                estado: 'pendiente', // OBLIGATORIO PENDIENTE POR DEFECTO
                confianza: obs.confianza || 'alta',
                prioridad: obs.prioridad || 'normal',
                esPropuestaAnalista: false,
              });
            });
          }
        });
      }
    }

    // Propuestas del Analista
    const analystObj = extraction.propuestasDelAnalista || extRecord.propuestas_del_analista || extRecord.propuestasAnalista;
    if (analystObj) {
      if (Array.isArray(analystObj)) {
        (analystObj as Observation[]).forEach(obs => {
          result.push({
            ...obs,
            categoria: obs.categoria || 'planAtaque',
            estado: 'pendiente', // OBLIGATORIO PENDIENTE POR DEFECTO
            confianza: obs.confianza || 'alta',
            prioridad: obs.prioridad || 'normal',
            esPropuestaAnalista: true,
          });
        });
      } else if (typeof analystObj === 'object') {
        Object.entries(analystObj as Record<string, Observation[]>).forEach(([cat, list]) => {
          if (Array.isArray(list)) {
            list.forEach(obs => {
              result.push({
                ...obs,
                categoria: obs.categoria || cat,
                estado: 'pendiente', // OBLIGATORIO PENDIENTE POR DEFECTO
                confianza: obs.confianza || 'alta',
                prioridad: obs.prioridad || 'normal',
                esPropuestaAnalista: true,
              });
            });
          }
        });
      }
    }

    setObservations(result);

    const threatList = extraction.amenazasJugadores || extRecord.amenazas_jugadores || extRecord.jugadoresPeligrosos || [];
    setThreats(Array.isArray(threatList) ? (threatList as RivalPlayerThreat[]) : []);
  }, [extraction, isOpen]);

  if (!isOpen || !extraction) return null;

  // Filtrado por pestaña
  const filteredObservations = observations.filter(obs => {
    if (activeTab === 'rival') return !obs.esPropuestaAnalista;
    if (activeTab === 'analyst') return obs.esPropuestaAnalista;
    return true;
  });

  const handleStatusChange = (id: string, newStatus: 'pendiente' | 'aprobado' | 'rechazado') => {
    setObservations(prev =>
      prev.map(obs => (obs.id === id ? { ...obs, estado: newStatus } : obs))
    );
  };

  const handleConfidenceChange = (id: string, confidence: 'alta' | 'media' | 'baja') => {
    setObservations(prev =>
      prev.map(obs => (obs.id === id ? { ...obs, confianza: confidence } : obs))
    );
  };

  const handlePriorityChange = (id: string, priority: 'baja' | 'normal' | 'alta' | 'clave') => {
    setObservations(prev =>
      prev.map(obs => (obs.id === id ? { ...obs, prioridad: priority } : obs))
    );
  };

  const handleContentEdit = (id: string, content: string) => {
    setObservations(prev =>
      prev.map(obs => (obs.id === id ? { ...obs, contenido: content } : obs))
    );
  };

  const handleApproveAll = () => {
    setObservations(prev => prev.map(obs => ({ ...obs, estado: 'aprobado' })));
  };

  const handleConfirmAndIntegrate = async () => {
    try {
      setIsSaving(true);
      setFeedbackMsg(null);
      verifyWritePermission();

      // Guardar ÚNICAMENTE las observaciones que el entrenador haya aprobado explícitamente
      const approvedObs = observations.filter(obs => obs.estado === 'aprobado');

      if (approvedObs.length === 0 && threats.length === 0) {
        setFeedbackMsg({ type: 'error', text: 'Debes aprobar al menos una observación marcándola en verde para integrar en la ficha de rival.' });
        setIsSaving(false);
        return;
      }

      const passkey = process.env.COACH_STAFF_PASSKEY || '';
      const today = new Date().toISOString().split('T')[0];

      // Convertir cada observación aprobada al esquema de Supabase club_report_observations
      const payloadRows = approvedObs.map(obs => ({
        document_id: documentId || null,
        club_id: clubId || null,
        club_season_id: clubSeasonId || null,
        document_name: documentName,
        document_date: extraction.metadatos.fechaInforme || today,
        rival_name: rivalName,
        season: season,
        category: obs.categoria,
        content: obs.contenido,
        source_type: obs.fuente || 'texto',
        page: obs.pagina || 1,
        original_evidence: obs.evidenciaOriginal || null,
        confidence: obs.confianza,
        status: 'aprobado',
        priority: obs.prioridad || 'normal',
        is_analyst_proposal: obs.esPropuestaAnalista || false,
        rival_player_name: obs.rivalPlayerName || null,
        rival_player_dorsal: obs.rivalPlayerDorsal || null,
        rival_player_position: obs.rivalPlayerPosition || null,
        rival_player_threat_level: obs.rivalPlayerThreatLevel || null,
        observation_date: today,
        approved_at: new Date().toISOString(),
      }));

      // También guardar las amenazas de jugadores en formato observación aprobada si existen
      threats.forEach(t => {
        if (t.dorsal || t.nombre) {
          payloadRows.push({
            document_id: documentId || null,
            club_id: clubId || null,
            club_season_id: clubSeasonId || null,
            document_name: documentName,
            document_date: extraction.metadatos.fechaInforme || today,
            rival_name: rivalName,
            season: season,
            category: 'jugadorRival',
            content: `[Dorsal ${t.dorsal || 'S/N'}] ${t.nombre || 'Jugador Rival'} (${t.posicionHabitual || 'Posición'}): ${t.observaciones}. Fortalezas: ${Array.isArray(t.fortalezas) ? t.fortalezas.join(', ') : t.fortalezas}. ${t.consignaEspecifica || ''}`,
            source_type: 'texto',
            page: t.pagina || 11,
            original_evidence: t.movimientosFrecuentes || null,
            confidence: 'alta',
            status: 'aprobado',
            priority: t.nivelPeligro === 'critico' || t.nivelPeligro === 'alto' ? 'clave' : 'alta',
            is_analyst_proposal: false,
            rival_player_name: t.nombre || null,
            rival_player_dorsal: t.dorsal || null,
            rival_player_position: t.posicionHabitual || null,
            rival_player_threat_level: t.nivelPeligro || 'alto',
            observation_date: today,
            approved_at: new Date().toISOString(),
          });
        }
      });

      // Insertar en servidor mediante la API privada /api/rivales/manage-observations
      const res = await fetch('/api/rivales/manage-observations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-passkey': passkey,
        },
        body: JSON.stringify({
          action: 'save_approved_observations',
          payload: {
            rows: payloadRows,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar observaciones aprobadas en servidor.');
      }

      setFeedbackMsg({ type: 'success', text: `¡Éxito! ${payloadRows.length} observaciones aprobadas e integradas en la ficha de ${rivalName}.` });
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      console.error('Error al guardar observaciones aprobadas:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setFeedbackMsg({ type: 'error', text: msg || 'Error al guardar la revisión humana.' });
    } finally {
      setIsSaving(false);
    }
  };

  const totalAprobadas = observations.filter(o => o.estado === 'aprobado').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

        {/* Cabecera Modal */}
        <div className="p-6 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#CC0E21]/10 rounded-2xl border border-[#CC0E21]/30">
              <UserCheck className="h-6 w-6 text-[#CC0E21]" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                Revisión Humana del Informe
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-800 text-amber-400 font-semibold">
                  Estado: Pendiente de Validación
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {documentName} · Rival: <span className="text-slate-200 font-medium">{rivalName}</span> ({season})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            ✕
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className={`px-6 py-3 text-xs font-semibold flex items-center gap-2 ${feedbackMsg.type === 'success' ? 'bg-emerald-950/90 border-b border-emerald-800 text-emerald-300' : 'bg-red-950/90 border-b border-red-800 text-red-300'}`}>
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {feedbackMsg.text}
          </div>
        )}

        {/* Filtros por pestaña */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'all' ? 'bg-[#CC0E21] text-white shadow-md' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'}`}
            >
              Todas ({observations.length})
            </button>
            <button
              onClick={() => setActiveTab('rival')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'rival' ? 'bg-[#CC0E21] text-white shadow-md' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'}`}
            >
              Hechos del Rival ({observations.filter(o => !o.esPropuestaAnalista).length})
            </button>
            <button
              onClick={() => setActiveTab('analyst')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'analyst' ? 'bg-[#CC0E21] text-white shadow-md' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'}`}
            >
              Propuestas del Autor ({observations.filter(o => o.esPropuestaAnalista).length})
            </button>
            <button
              onClick={() => setActiveTab('players')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'players' ? 'bg-[#CC0E21] text-white shadow-md' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'}`}
            >
              Amenazas Jugadores ({threats.length})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Aprobadas por el Entrenador: <strong className="text-emerald-400">{totalAprobadas}</strong> / {observations.length}
            </span>
            <Button onClick={handleApproveAll} variant="secondary" className="text-xs py-1 px-3">
              Marcar Todas Aprobadas
            </Button>
          </div>
        </div>

        {/* Cuerpo Principal del Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {activeTab !== 'players' ? (
            filteredObservations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No hay observaciones en esta categoría.
              </div>
            ) : (
              filteredObservations.map(obs => (
                <div
                  key={obs.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 ${
                    obs.estado === 'aprobado'
                      ? 'bg-slate-900/90 border-emerald-500/50 shadow-md'
                      : obs.estado === 'rechazado'
                      ? 'bg-slate-950/40 border-red-900/30 opacity-60'
                      : 'bg-slate-900/60 border-amber-500/30'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        {obs.categoria}
                      </span>

                      {obs.esPropuestaAnalista ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-950/70 border border-amber-800 text-amber-300">
                          Propuesta del Autor del Informe
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-950/70 border border-blue-800 text-blue-300">
                          Capa A: Dato Extraído (Literal)
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 font-mono">Pág. {obs.pagina || 1} ({obs.fuente})</span>
                    </div>

                    {/* Selector de Estado Humano */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStatusChange(obs.id, 'aprobado')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          obs.estado === 'aprobado' ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50' : 'bg-slate-800 text-slate-400 hover:text-emerald-400'
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleStatusChange(obs.id, 'rechazado')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          obs.estado === 'rechazado' ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-400/50' : 'bg-slate-800 text-slate-400 hover:text-red-400'
                        }`}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Rechazar
                      </button>
                    </div>
                  </div>

                  {/* CAPA A: Dato Extraído Literalmente */}
                  <div className="space-y-1 mb-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Capa A — Dato Literal del Informe:
                    </label>
                    <textarea
                      value={obs.contenido}
                      onChange={e => handleContentEdit(obs.id, e.target.value)}
                      disabled={!isEditMode}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-[#CC0E21]/50 transition-all resize-y"
                    />
                  </div>

                  {/* Visualización Separada de Capa B y Capa C */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {obs.deduccionIA && (
                      <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-200 flex flex-col gap-0.5">
                        <span className="font-bold text-blue-400 flex items-center gap-1 text-[10px] uppercase">
                          <Sparkles className="h-3 w-3" /> Capa B — Deducción IA:
                        </span>
                        <span>{obs.deduccionIA}</span>
                      </div>
                    )}

                    {obs.propuestaIndautxu && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-[11px] text-emerald-200 flex flex-col gap-0.5">
                        <span className="font-bold text-emerald-400 flex items-center gap-1 text-[10px] uppercase">
                          <Compass className="h-3 w-3" /> Capa C — Propuesta Modelo Indautxu:
                        </span>
                        <span>{obs.propuestaIndautxu}</span>
                      </div>
                    )}
                  </div>

                  {/* Ajustes de Confianza y Evidencia */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex justify-between items-center text-xs text-slate-400 flex-wrap gap-2">
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1 text-[11px]">
                        Confianza:
                        <select
                          value={obs.confianza}
                          onChange={e => handleConfidenceChange(obs.id, e.target.value as 'alta' | 'media' | 'baja')}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-[11px] text-slate-200"
                        >
                          <option value="alta">Alta</option>
                          <option value="media">Media</option>
                          <option value="baja">Baja</option>
                        </select>
                      </label>

                      <label className="flex items-center gap-1 text-[11px]">
                        Prioridad:
                        <select
                          value={obs.prioridad || 'normal'}
                          onChange={e => handlePriorityChange(obs.id, e.target.value as 'baja' | 'normal' | 'alta' | 'clave')}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-[11px] text-slate-200"
                        >
                          <option value="baja">Baja</option>
                          <option value="normal">Normal</option>
                          <option value="alta">Alta</option>
                          <option value="clave">Clave ⭐</option>
                        </select>
                      </label>
                    </div>

                    {obs.evidencias && obs.evidencias.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 w-full mt-1">
                        {obs.evidencias.map((ev, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400 font-mono">
                            Pág. {ev.pagina} ({ev.fuente}): &quot;{ev.evidenciaOriginal}&quot; [{ev.confianza}]
                          </span>
                        ))}
                      </div>
                    ) : (
                      obs.evidenciaOriginal && (
                        <span className="text-[10px] text-slate-500 italic max-w-md truncate">
                          Evidencia original: &quot;{obs.evidenciaOriginal}&quot;
                        </span>
                      )
                    )}
                  </div>
                </div>
              ))
            )
          ) : (
            /* Sección de Amenazas de Jugadores Rival con Capas A, B y C */
            <div className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-xs text-slate-300">
                <h4 className="font-bold text-slate-100 flex items-center gap-2 mb-1">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  Amenazas de Jugadores Rivales Detectadas (Estado Literal Respetado)
                </h4>
                <p className="text-slate-400 text-[11px]">
                  Datos extraídos literalmente del informe y aislados de las propuestas tácticas del Modelo Indautxu.
                </p>
              </div>

              {threats.map((t, idx) => (
                <div key={idx} className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                        Dorsal {t.dorsal || 'S/N'}
                      </span>
                      <h4 className="font-bold text-slate-100">{t.nombre || 'Jugador Rival'}</h4>
                      <span className="text-xs text-slate-400">({t.posicionHabitual})</span>
                      <span className="text-[10px] text-slate-500 font-mono">Pág. {t.pagina || 11}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-950 border border-amber-700 text-amber-300 text-[10px] font-bold uppercase">
                      Peligro {t.nivelPeligro} (Literal)
                    </span>
                  </div>

                  {/* CAPA A: Dato Extraído Literal */}
                  <div>
                    <strong className="text-slate-400 text-[10px] uppercase block mb-1">Capa A — Dato Literal del Documento:</strong>
                    <p className="text-xs text-slate-200 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">{t.observaciones}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-950/50 p-3 rounded-xl border border-slate-800">
                    <div>
                      <strong className="text-slate-400 text-[10px] uppercase block mb-1">Fortalezas Literales del Informe:</strong>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(t.fortalezas) ? t.fortalezas.map((f, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-[10px]">
                            {f}
                          </span>
                        )) : <span className="text-slate-400 text-[10px]">{t.fortalezas}</span>}
                      </div>
                    </div>
                    <div>
                      <strong className="text-slate-400 text-[10px] uppercase block mb-1">Puesto Afectado Directo:</strong>
                      <span className="text-emerald-400 font-medium">{t.nuestroPuestoAfectadoDirecto || 'Central Izquierdo'}</span>
                    </div>
                  </div>

                  {/* Visualización de Capa B y Capa C */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {t.deduccionIA && (
                      <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-200">
                        <strong className="text-blue-400 block text-[10px] uppercase mb-0.5 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Capa B — Deducción IA:
                        </strong>
                        {t.deduccionIA}
                      </div>
                    )}
                    {(t.propuestaIndautxu || t.consignaEspecifica) && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-[11px] text-emerald-200">
                        <strong className="text-emerald-400 block text-[10px] uppercase mb-0.5 flex items-center gap-1">
                          <Compass className="h-3 w-3" /> Capa C — Propuesta Modelo Indautxu:
                        </strong>
                        {t.propuestaIndautxu || t.consignaEspecifica}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer Acciones */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
          <div className="text-xs text-slate-400">
            Paso obligatorio de <strong className="text-slate-200">Validación Humana por el Entrenador</strong> antes de integrar datos en la Pizarra.
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAndIntegrate}
              disabled={isSaving || totalAprobadas === 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              {isSaving ? 'Guardando Integración...' : `Confirmar e Integrar (${totalAprobadas} Aprobadas)`}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
