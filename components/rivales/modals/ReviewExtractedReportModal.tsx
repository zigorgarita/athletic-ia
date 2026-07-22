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
  const { verifyWritePermission, currentUser } = useEditMode();
  const [activeTab, setActiveTab] = useState<'all' | 'rival' | 'analyst' | 'players'>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado editable para observaciones (SIEMPRE 'pendiente' por defecto)
  const [observations, setObservations] = useState<Observation[]>([]);
  const [threats, setThreats] = useState<RivalPlayerThreat[]>([]);

  useEffect(() => {
    if (!extraction || !isOpen) {
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

      const editorUser = currentUser?.id || '';
      const editorPass = currentUser?.pass || (
        editorUser === 'zigor' ? (process.env.NEXT_PUBLIC_EDIT_PASSWORD_ZIGOR || '')
        : editorUser === 'aitor' ? (process.env.NEXT_PUBLIC_EDIT_PASSWORD_AITOR || '')
        : editorUser === 'nacho' ? (process.env.NEXT_PUBLIC_EDIT_PASSWORD_NACHO || '')
        : ''
      );

      const today = new Date().toISOString().split('T')[0];

      // Convertir cada observación aprobada al esquema de Supabase club_report_observations
      const payloadRows = approvedObs.map(obs => ({
        document_id: documentId || null,
        club_id: clubId || null,
        club_season_id: clubSeasonId || null,
        document_name: documentName,
        document_date: extraction.metadatos?.fechaInforme || today,
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
            document_date: extraction.metadatos?.fechaInforme || today,
            rival_name: rivalName,
            season: season,
            category: 'jugadorRival',
            content: `[Dorsal ${t.dorsal || 'S/N'}] ${t.nombre || 'Jugador Rival'} (${t.posicionHabitual || 'Posición'}): ${t.observaciones}. Fortalezas: ${Array.isArray(t.fortalezas) ? t.fortalezas.join(', ') : t.fortalezas}. ${t.consignaEspecifica || ''}`,
            source_type: 'texto',
            page: t.pagina || 11,
            original_evidence: t.evidenciaOriginal || t.movimientosFrecuentes || null,
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
          'x-editor-user': editorUser,
          'x-editor-pass': editorPass,
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

  // Filtrado por pestaña
  const filteredObservations = observations.filter(obs => {
    if (activeTab === 'rival') return !obs.esPropuestaAnalista;
    if (activeTab === 'analyst') return obs.esPropuestaAnalista;
    return true;
  });

  const totalAprobadas = observations.filter(o => o.estado === 'aprobado').length;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

          {/* Cabecera Modal */}
          <div className="p-6 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#CC0E21]/10 rounded-2xl border border-[#CC0E21]/30">
                <UserCheck className="h-6 w-6 text-[#CC0E21]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  Revisión Humana del Informe Táctico
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    Validación Pendiente
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {documentName} • Rival: <strong className="text-slate-200">{rivalName}</strong> ({season})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Subcabecera de Pestañas y Acciones */}
          <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todas ({observations.length})
              </button>
              <button
                onClick={() => setActiveTab('rival')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'rival'
                    ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Hechos del Rival ({observations.filter(o => !o.esPropuestaAnalista).length})
              </button>
              <button
                onClick={() => setActiveTab('analyst')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'analyst'
                    ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Propuestas del Autor ({observations.filter(o => o.esPropuestaAnalista).length})
              </button>
              {threats.length > 0 && (
                <button
                  onClick={() => setActiveTab('players')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'players'
                      ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Amenazas Jugadores ({threats.length})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleApproveAll}
                className="px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/40 rounded-xl transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Aprobar Todas ({observations.length})
              </button>
            </div>
          </div>

          {/* Mensajes de Feedback */}
          {feedbackMsg && (
            <div
              className={`mx-6 mt-4 p-3 rounded-2xl border text-xs flex items-center gap-2 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-800/50 text-rose-300'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Cuerpo Modal: Lista de Observaciones en 3 Capas */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
            {activeTab !== 'players' ? (
              filteredObservations.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No hay observaciones registradas en esta pestaña.
                </div>
              ) : (
                filteredObservations.map((obs) => (
                  <div
                    key={obs.id}
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      obs.estado === 'aprobado'
                        ? 'bg-slate-900/90 border-emerald-600/50 shadow-md shadow-emerald-950/20'
                        : obs.estado === 'rechazado'
                        ? 'bg-slate-950/40 border-rose-900/30 opacity-60'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Fila Superior: Categoria, Pagina, Badge Estado y Controles */}
                    <div className="flex justify-between items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                          {obs.categoria}
                        </span>
                        {obs.pagina && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Pág. {obs.pagina}
                          </span>
                        )}
                        {obs.fuente && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-400 font-mono">
                            {obs.fuente}
                          </span>
                        )}
                        {obs.esPropuestaAnalista && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/50 text-purple-300 border border-purple-800/40 font-semibold">
                            Propuesta del Autor
                          </span>
                        )}
                      </div>

                      {/* Botones de Aprobar / Rechazar */}
                      <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                          onClick={() => handleStatusChange(obs.id, 'aprobado')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                            obs.estado === 'aprobado'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-900'
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleStatusChange(obs.id, 'pendiente')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            obs.estado === 'pendiente'
                              ? 'bg-amber-600/30 text-amber-400 border border-amber-500/30'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                          }`}
                        >
                          Pendiente
                        </button>
                        <button
                          onClick={() => handleStatusChange(obs.id, 'rechazado')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                            obs.estado === 'rechazado'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-rose-400 hover:bg-slate-900'
                          }`}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Descartar
                        </button>
                      </div>
                    </div>

                    {/* renderizado de las 3 Capas */}
                    <div className="space-y-2 pt-1">
                      {/* Capa A: Dato Literal del Informe */}
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 font-medium">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3 text-slate-400" /> Capa A — Dato Literal del Informe:
                        </div>
                        <textarea
                          value={obs.contenido}
                          onChange={e => handleContentEdit(obs.id, e.target.value)}
                          rows={2}
                          className="w-full bg-transparent text-slate-100 text-xs focus:outline-none resize-none"
                        />
                      </div>

                      {/* Capa B: Deducción de la IA */}
                      {obs.deduccionIA && (
                        <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-200 flex flex-col gap-0.5">
                          <span className="font-bold text-blue-400 flex items-center gap-1 text-[10px] uppercase">
                            <Sparkles className="h-3 w-3" /> Capa B — Deducción IA:
                          </span>
                          <span>{obs.deduccionIA}</span>
                        </div>
                      )}

                      {/* Capa C: Propuesta Modelo Indautxu */}
                      {obs.propuestaIndautxu && (
                        <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-[11px] text-emerald-200 flex flex-col gap-0.5">
                          <span className="font-bold text-emerald-400 flex items-center gap-1 text-[10px] uppercase">
                            <Compass className="h-3 w-3" /> Capa C — Propuesta Modelo Indautxu:
                          </span>
                          <span>{obs.propuestaIndautxu}</span>
                        </div>
                      )}
                    </div>

                    {/* Ajustes de Confianza, Prioridad y Evidencia */}
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
              threats.map((t, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-rose-900/40 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-rose-950 text-rose-300 font-bold text-xs border border-rose-800">
                        Dorsal {t.dorsal || 'S/N'}
                      </span>
                      <span className="font-bold text-slate-100 text-sm">{t.nombre || 'Jugador Rival'}</span>
                      <span className="text-xs text-slate-400 font-mono">({t.posicionHabitual})</span>
                      <span className="text-[10px] text-slate-400 font-mono">Pág. {t.pagina || 11}</span>
                    </div>

                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-lg border ${
                      t.nivelPeligro === 'critico' || t.nivelPeligro === 'alto'
                        ? 'bg-rose-950 text-rose-400 border-rose-800'
                        : 'bg-amber-950 text-amber-400 border-amber-800'
                    }`}>
                      Amenaza {t.nivelPeligro}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200">
                      <strong className="text-slate-400 block text-[10px] uppercase mb-0.5">Capa A — Dato Literal del Documento:</strong>
                      {t.observaciones}
                    </div>

                    {t.deduccionIA && (
                      <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-900/40 text-xs text-blue-200">
                        <strong className="text-blue-400 block text-[10px] uppercase mb-0.5">Capa B — Deducción IA:</strong>
                        {t.deduccionIA}
                      </div>
                    )}

                    {t.propuestaIndautxu && (
                      <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-xs text-emerald-200">
                        <strong className="text-emerald-400 block text-[10px] uppercase mb-0.5">Capa C — Propuesta Modelo Indautxu:</strong>
                        {t.propuestaIndautxu}
                      </div>
                    )}
                  </div>

                  {t.evidenciaOriginal && (
                    <div className="text-[10px] text-slate-500 italic">
                      Evidencia original exactísima: &quot;{t.evidenciaOriginal}&quot;
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pie de Modal y Botón Principal Confirmar e Integrar */}
          <div className="p-6 bg-slate-900/90 border-t border-slate-800 flex flex-wrap justify-between items-center gap-4">
            <div className="text-xs text-slate-400">
              Aprobadas para guardar: <strong className="text-emerald-400 text-sm font-bold">{totalAprobadas}</strong> de {observations.length} observaciones.
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleConfirmAndIntegrate()}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2"
              >
                {isSaving ? (
                  <>Procesando...</>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar e Integrar ({totalAprobadas} aprobadas)
                  </>
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
