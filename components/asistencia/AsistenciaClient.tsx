'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Users, Calendar, Clock, Activity, Check, X, 
  AlertTriangle, Star, Save, Sparkles, ChevronDown, 
  ChevronUp, BarChart3, AlertCircle, Info
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import { Player, PlanningSession, TrainingAttendance, TrainingEvaluation, AttendanceStatus } from '@/types';
import { useTrainingAttendance } from '@/hooks/useTrainingAttendance';
import { formatLocalYYYYMMDD } from '@/lib/dateUtils';

const ABSENCE_REASONS = [
  'Lesión', 'Enfermedad', 'Estudios', 'Trabajo', 
  'Viaje', 'Decisión técnica', 'Motivo personal', 
  'Sin justificar', 'Otro'
];

const METRICAS_EVAL = [
  { key: 'actitud', label: 'Actitud' },
  { key: 'intensidad', label: 'Intensidad' },
  { key: 'comprension_tactica', label: 'Comprensión Táctica' },
  { key: 'ejecucion_tecnica', label: 'Ejecución Técnica' },
  { key: 'compromiso_defensivo', label: 'Compromiso Defensivo' },
  { key: 'compromiso_ofensivo', label: 'Compromiso Ofensivo' }
];

export function AsistenciaClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionIdParam = searchParams.get('session_id');

  const { fetchSessionAttendance, saveAttendanceAndEvaluations, loading: saving, error: dbError } = useTrainingAttendance();

  const [activeTab, setActiveTab] = useState<'control' | 'resumen'>('control');
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<PlanningSession[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(formatLocalYYYYMMDD(new Date()));
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  
  // Local states for attendance and evaluations
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Partial<TrainingAttendance>>>({});
  const [evaluationMap, setEvaluationMap] = useState<Record<string, Partial<TrainingEvaluation>>>({});
  const [expandedEvaluations, setExpandedEvaluations] = useState<Record<string, boolean>>({});

  // UI state
  const [loadingData, setLoadingData] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);

  // Load initial players and sessions
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoadingData(true);
        // Load players
        const { data: playersData, error: pErr } = await supabase
          .from('players')
          .select('*')
          .order('dorsal', { ascending: true });
        if (pErr) throw pErr;
        setPlayers(playersData || []);

        // Load planning sessions
        const { data: sessionsData, error: sErr } = await supabase
          .from('planning_sessions')
          .select('*')
          .order('fecha', { ascending: false });
        if (sErr) throw sErr;
        setSessions(sessionsData || []);
      } catch (err: any) {
        console.error('Error loading initial attendance data:', err);
        setShowError(err.message || 'Error al conectar con Supabase.');
      } finally {
        setLoadingData(false);
      }
    }
    loadInitialData();
  }, []);

  // Sync date/session selection if session_id passed in URL
  useEffect(() => {
    if (sessionIdParam && sessions.length > 0) {
      const activeSession = sessions.find(s => s.id === sessionIdParam);
      if (activeSession) {
        setSelectedDate(activeSession.fecha);
        setSelectedSessionId(activeSession.id);
      }
    }
  }, [sessionIdParam, sessions]);

  // Filter sessions by selected date
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => s.fecha === selectedDate);
  }, [sessions, selectedDate]);

  // Set first session of selected date as active if none selected
  useEffect(() => {
    if (filteredSessions.length > 0 && !sessionIdParam) {
      // Find if selectedSessionId is in filteredSessions
      const exists = filteredSessions.some(s => s.id === selectedSessionId);
      if (!exists) {
        setSelectedSessionId(filteredSessions[0].id);
      }
    } else if (filteredSessions.length === 0) {
      setSelectedSessionId('');
    }
  }, [filteredSessions, selectedSessionId, sessionIdParam]);

  // Active session metadata
  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === selectedSessionId) || null;
  }, [sessions, selectedSessionId]);

  // Load existing attendance and evaluations for the selected session
  useEffect(() => {
    async function loadAttendanceData() {
      if (!selectedSessionId) {
        setAttendanceMap({});
        setEvaluationMap({});
        return;
      }
      try {
        setLoadingData(true);
        setShowError(null);
        const { attendance, evaluations } = await fetchSessionAttendance(selectedSessionId);

        const newAttendanceMap: Record<string, Partial<TrainingAttendance>> = {};
        const newEvaluationMap: Record<string, Partial<TrainingEvaluation>> = {};

        // Prepopulate from loaded database records
        attendance.forEach(att => {
          if (att.player_id) {
            newAttendanceMap[att.player_id] = att;
          }
        });

        evaluations.forEach(ev => {
          if (ev.player_id) {
            newEvaluationMap[ev.player_id] = ev;
          }
        });

        // For any player without database records, initialize default states
        players.forEach(p => {
          if (!newAttendanceMap[p.id]) {
            newAttendanceMap[p.id] = {
              session_id: selectedSessionId,
              player_id: p.id,
              attendance_status: (p.estado === 'Lesionado' ? 'Lesionado' : p.estado === 'Duda' ? 'Duda' : 'Asiste') as AttendanceStatus,
              absence_reason: p.estado === 'Lesionado' ? 'Lesión' : undefined,
              attendance_notes: ''
            };
          }
          if (!newEvaluationMap[p.id]) {
            newEvaluationMap[p.id] = {
              session_id: selectedSessionId,
              player_id: p.id,
              actitud: undefined,
              intensidad: undefined,
              comprension_tactica: undefined,
              ejecucion_tecnica: undefined,
              compromiso_defensivo: undefined,
              compromiso_ofensivo: undefined,
              valoracion_global: undefined,
              observaciones: ''
            };
          }
        });

        setAttendanceMap(newAttendanceMap);
        setEvaluationMap(newEvaluationMap);
      } catch (err: any) {
        console.error(err);
        setShowError('Error cargando los datos de asistencia.');
      } finally {
        setLoadingData(false);
      }
    }
    if (players.length > 0) {
      loadAttendanceData();
    }
  }, [selectedSessionId, players, fetchSessionAttendance]);

  // Handle Attendance status changes
  const handleStatusChange = (playerId: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => {
      const updated = { ...prev[playerId] };
      updated.attendance_status = status;
      
      // Force default absence reason if not assisting
      if (status === 'No asiste' && !updated.absence_reason) {
        updated.absence_reason = 'Sin justificar';
      } else if (status === 'Lesionado') {
        updated.absence_reason = 'Lesión';
      } else if (status === 'Asiste') {
        updated.absence_reason = undefined;
      }
      
      return {
        ...prev,
        [playerId]: updated
      };
    });
  };

  const handleAbsenceReasonChange = (playerId: string, reason: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        absence_reason: reason
      }
    }));
  };

  const handleAttendanceNotesChange = (playerId: string, notes: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        attendance_notes: notes
      }
    }));
  };

  // Handle evaluation star changes
  const handleRatingChange = (playerId: string, key: string, val: number) => {
    setEvaluationMap(prev => {
      const updated = { ...prev[playerId] };
      (updated as any)[key] = val;

      // Recalculate global average
      const ratings = METRICAS_EVAL.map(m => (updated as any)[m.key]).filter(v => v !== undefined && v !== null);
      if (ratings.length > 0) {
        const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        updated.valoracion_global = Number(avg.toFixed(1));
      } else {
        updated.valoracion_global = undefined;
      }

      return {
        ...prev,
        [playerId]: updated
      };
    });
  };

  const handleEvaluationNotesChange = (playerId: string, notes: string) => {
    setEvaluationMap(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        observaciones: notes
      }
    }));
  };

  const toggleExpandEvaluation = (playerId: string) => {
    setExpandedEvaluations(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
  };

  // Summary Metrics calculations
  const summaryMetrics = useMemo(() => {
    const list = Object.values(attendanceMap);
    const total = list.length;
    if (total === 0) return { total: 0, presentes: 0, ausentes: 0, lesionados: 0, dudas: 0, sancionados: 0, baja_temporal: 0, pct: 0 };

    const presentes = list.filter(a => a.attendance_status === 'Asiste').length;
    const ausentes = list.filter(a => a.attendance_status === 'No asiste').length;
    const lesionados = list.filter(a => a.attendance_status === 'Lesionado').length;
    const dudas = list.filter(a => a.attendance_status === 'Duda').length;
    const sancionados = list.filter(a => a.attendance_status === 'Sancionado').length;
    const baja_temporal = list.filter(a => a.attendance_status === 'Baja temporal').length;

    // Attendance Pct (excludes Lesionado and Baja temporal from denominator)
    const denominator = presentes + ausentes + dudas + sancionados;
    const pct = denominator > 0 ? Math.round((presentes / denominator) * 100) : 0;

    return { total, presentes, ausentes, lesionados, dudas, sancionados, baja_temporal, pct };
  }, [attendanceMap]);

  // Weekly summary calculations
  const weeklySummary = useMemo(() => {
    // Generate dates of the last 7 days or current week sessions
    if (sessions.length === 0) return null;
    
    // Sort all sessions by date descending
    const recentSessions = [...sessions].slice(0, 4); // Last 4 sessions
    return recentSessions;
  }, [sessions]);

  // Submit Handler
  const handleSaveAll = async () => {
    if (!selectedSessionId) {
      setShowError('Debe seleccionar una sesión para registrar la asistencia.');
      return;
    }

    setShowError(null);
    setSaveSuccess(false);

    // Build payloads with backup fields to secure history
    const attendancePayload: TrainingAttendance[] = [];
    const evaluationPayload: TrainingEvaluation[] = [];

    let validationError = null;

    players.forEach(p => {
      const att = attendanceMap[p.id];
      const ev = evaluationMap[p.id];

      if (att) {
        if (att.attendance_status === 'No asiste' && !att.absence_reason) {
          validationError = `Debe seleccionar un motivo de ausencia para ${p.nombre} ${p.apellidos}.`;
        }

        attendancePayload.push({
          session_id: selectedSessionId,
          player_id: p.id,
          player_full_name_backup: `${p.nombre} ${p.apellidos}`,
          player_dorsal_backup: p.dorsal,
          attendance_status: att.attendance_status || 'Asiste',
          absence_reason: att.absence_reason || null,
          attendance_notes: att.attendance_notes || null,
          recorded_by: 'Cuerpo Técnico'
        });
      }

      if (ev && att?.attendance_status === 'Asiste') {
        const hasSomeEvaluation = METRICAS_EVAL.some(m => (ev as any)[m.key] !== undefined);
        
        // Only save evaluation row if some ratings are provided
        if (hasSomeEvaluation) {
          evaluationPayload.push({
            session_id: selectedSessionId,
            player_id: p.id,
            player_full_name_backup: `${p.nombre} ${p.apellidos}`,
            player_dorsal_backup: p.dorsal,
            actitud: ev.actitud || null,
            intensidad: ev.intensidad || null,
            comprension_tactica: ev.comprension_tactica || null,
            ejecucion_tecnica: ev.ejecucion_tecnica || null,
            compromiso_defensivo: ev.compromiso_defensivo || null,
            compromiso_ofensivo: ev.compromiso_ofensivo || null,
            valoracion_global: ev.valoracion_global || null,
            observaciones: ev.observaciones || null,
            fecha_evaluacion: selectedDate,
            evaluated_by: 'Cuerpo Técnico'
          });
        }
      }
    });

    if (validationError) {
      setShowError(validationError);
      return;
    }

    const success = await saveAttendanceAndEvaluations(attendancePayload, evaluationPayload);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } else {
      setShowError('Fallo al guardar en Supabase. Verifica la conexión o políticas.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            <Clock className="h-8 w-8 text-[#CC0E21]" />
            Control de Asistencia
          </h1>
          <p className="text-slate-400 text-sm">
            Control de presencia, motivos de ausencia y rendimiento en entrenamiento diario.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('control')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'control'
                ? 'bg-[#CC0E21] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pase de Lista
          </button>
          <button
            onClick={() => setActiveTab('resumen')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'resumen'
                ? 'bg-[#CC0E21] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Resumen Semanal
          </button>
        </div>
      </div>

      {showError && (
        <div className="p-4 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-2xl flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span>{showError}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-green-950/20 border border-green-900/30 text-green-400 text-xs rounded-2xl flex items-start gap-2">
          <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
          <span>Asistencia y valoraciones del entrenamiento guardadas correctamente en Supabase.</span>
        </div>
      )}

      {activeTab === 'control' ? (
        <div className="space-y-6">
          {/* Panel Selector de Sesión */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2 text-slate-350 text-xs font-bold uppercase tracking-wider pb-2 border-b border-slate-800/40">
              <Calendar className="h-4 w-4 text-[#CC0E21]" />
              Selección de Sesión Planificada
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fecha */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase mb-1.5 block">Fecha de Trabajo</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSessionId(''); // Reset selected session on date change
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 outline-none focus:border-[#CC0E21]"
                />
              </div>

              {/* Sesión */}
              <div>
                <label className="text-[10px] text-slate-500 font-bold uppercase mb-1.5 block">Sesiones de Hoy</label>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 outline-none focus:border-[#CC0E21] cursor-pointer"
                >
                  {filteredSessions.length === 0 ? (
                    <option value="">No hay sesiones planificadas hoy</option>
                  ) : (
                    filteredSessions.map((s, idx) => (
                      <option key={s.id} value={s.id}>
                        Sesión {idx + 1} ({s.hora_inicio || '18:30'} - {s.tipo_sesion})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Crear sesión rápida */}
              <div className="flex items-end">
                <Button 
                  onClick={() => router.push('/planificacion')} 
                  variant="secondary" 
                  className="w-full text-xs py-2 h-[38px] flex items-center justify-center gap-1.5"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Ir al Calendario Planificación
                </Button>
              </div>
            </div>

            {/* Metadatos de la sesión activa */}
            {activeSession && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950/45 p-4 rounded-xl border border-slate-850/60 text-xs">
                <div>
                  <strong className="text-slate-500 block">Tipo de Sesión</strong>
                  <span className="text-slate-200 font-bold">{activeSession.tipo_sesion}</span>
                </div>
                <div>
                  <strong className="text-slate-500 block">Objetivo Principal</strong>
                  <span className="text-slate-200 font-bold">{activeSession.objetivo_principal}</span>
                </div>
                <div>
                  <strong className="text-slate-500 block">Carga de Trabajo</strong>
                  <Badge variant="default" className="bg-[#CC0E21]/15 text-[#CC0E21] border-[#CC0E21]/20 font-black">
                    {activeSession.carga || 'Media'}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Resumen Superior */}
          {activeSession && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Convocados</span>
                <span className="text-2xl font-black text-white">{summaryMetrics.total}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center">
                <span className="text-[10px] text-green-450 font-bold uppercase block">Presentes</span>
                <span className="text-2xl font-black text-green-400">{summaryMetrics.presentes}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center">
                <span className="text-[10px] text-red-450 font-bold uppercase block">Ausentes</span>
                <span className="text-2xl font-black text-red-400">{summaryMetrics.ausentes}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center">
                <span className="text-[10px] text-slate-550 font-bold uppercase block">Lesionados</span>
                <span className="text-2xl font-black text-slate-350">{summaryMetrics.lesionados}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center">
                <span className="text-[10px] text-amber-500 font-bold uppercase block">Dudas</span>
                <span className="text-2xl font-black text-amber-400">{summaryMetrics.dudas}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center">
                <span className="text-[10px] text-[#CC0E21] font-bold uppercase block">Asistencia</span>
                <span className="text-2xl font-black text-[#CC0E21]">{summaryMetrics.pct}%</span>
              </div>
            </div>
          )}

          {/* Tabla de Jugadores */}
          {loadingData ? (
            <div className="space-y-4">
              <div className="animate-pulse bg-slate-800 h-10 w-full rounded-xl" />
              <div className="animate-pulse bg-slate-800 h-28 w-full rounded-xl" />
            </div>
          ) : !selectedSessionId ? (
            <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-sm">
              Seleccione una sesión planificada para comenzar a pasar lista.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/20 shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                      <th className="px-4 py-4 w-12 text-center">Foto</th>
                      <th className="px-3 py-4 w-16">Dorsal</th>
                      <th className="px-4 py-4 w-44">Jugador</th>
                      <th className="px-4 py-4 w-32">Posición</th>
                      <th className="px-4 py-4 w-24 text-center">Ficha</th>
                      <th className="px-4 py-4 min-w-[280px]">Asistencia</th>
                      <th className="px-4 py-4 w-48">Valoración / Comentarios</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {players.map(player => {
                      const att = attendanceMap[player.id] || {};
                      const ev = evaluationMap[player.id] || {};
                      const isExpanded = !!expandedEvaluations[player.id];

                      return (
                        <React.Fragment key={player.id}>
                          <tr className="hover:bg-slate-800/20 transition-colors duration-150">
                            <td className="px-4 py-3 text-center">
                              <Avatar src={player.foto_url} name={player.nombre} size="sm" className="border border-slate-700/60 mx-auto" />
                            </td>
                            <td className="px-3 py-3 font-black text-slate-350">
                              #{player.dorsal}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-100">
                              {player.nombre} <span className="text-slate-400 font-medium">{player.apellidos}</span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant={player.demarcacion}>{player.demarcacion}</Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                player.estado === 'Disponible' ? 'bg-green-950/20 text-green-400 border-green-900/30' :
                                player.estado === 'Lesionado' ? 'bg-red-950/20 text-red-400 border-red-900/30' :
                                player.estado === 'Duda' ? 'bg-amber-950/20 text-amber-400 border-amber-900/30' :
                                'bg-slate-800 text-slate-350 border-slate-700/40'
                              }`}>
                                {player.estado}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-2">
                                {/* Chips de Asistencia */}
                                <div className="flex flex-wrap gap-1">
                                  {(['Asiste', 'No asiste', 'Lesionado', 'Duda', 'Sancionado', 'Baja temporal'] as AttendanceStatus[]).map(status => (
                                    <button
                                      key={status}
                                      type="button"
                                      onClick={() => handleStatusChange(player.id, status)}
                                      className={`px-2.5 py-1 text-[10px] font-black rounded-lg border transition-all ${
                                        att.attendance_status === status
                                          ? status === 'Asiste' ? 'bg-green-600/20 text-green-400 border-green-600/40' :
                                            status === 'No asiste' ? 'bg-red-600/20 text-red-400 border-red-600/40' :
                                            status === 'Lesionado' ? 'bg-slate-700/50 text-slate-300 border-slate-600/50' :
                                            'bg-amber-600/20 text-amber-400 border-amber-600/40'
                                          : 'bg-slate-950/30 text-slate-450 border-slate-850 hover:text-slate-300'
                                      }`}
                                    >
                                      {status === 'No asiste' ? 'Falta' : status}
                                    </button>
                                  ))}
                                </div>

                                {/* Motivo de ausencia */}
                                {att.attendance_status === 'No asiste' && (
                                  <div className="flex items-center gap-2 mt-1 animate-fadeIn">
                                    <span className="text-[10px] text-red-400 font-bold uppercase shrink-0">Motivo *:</span>
                                    <select
                                      value={att.absence_reason || 'Sin justificar'}
                                      onChange={e => handleAbsenceReasonChange(player.id, e.target.value)}
                                      className="bg-slate-950 border border-slate-850 text-xs px-2 py-1 rounded-lg text-slate-200 outline-none w-full focus:border-red-500"
                                    >
                                      {ABSENCE_REASONS.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {att.attendance_status === 'Asiste' ? (
                                <div className="flex flex-col gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandEvaluation(player.id)}
                                    className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white transition-colors"
                                  >
                                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-[#CC0E21]" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-500" />}
                                    {ev.valoracion_global ? (
                                      <span className="text-amber-400 flex items-center gap-1 font-black">
                                        <Star className="h-3.5 w-3.5 fill-amber-400" /> {ev.valoracion_global} Global
                                      </span>
                                    ) : (
                                      'Valorar entrenamiento'
                                    )}
                                  </button>
                                  <input
                                    type="text"
                                    placeholder="Obs: Muy activo, cansado..."
                                    value={ev.observaciones || ''}
                                    onChange={e => handleEvaluationNotesChange(player.id, e.target.value)}
                                    className="bg-slate-950/70 border border-slate-850 text-[11px] px-2.5 py-1.5 rounded-lg text-slate-200 placeholder-slate-600 outline-none focus:border-[#CC0E21] w-full"
                                  />
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Notas: Justificó por whatsapp..."
                                  value={att.attendance_notes || ''}
                                  onChange={e => handleAttendanceNotesChange(player.id, e.target.value)}
                                  className="bg-slate-950/70 border border-slate-850 text-[11px] px-2.5 py-1.5 rounded-lg text-slate-250 placeholder-slate-650 outline-none w-full"
                                />
                              )}
                            </td>
                          </tr>

                          {/* Expandable Stars ratings per category */}
                          {att.attendance_status === 'Asiste' && isExpanded && (
                            <tr className="bg-slate-950/30 border-l-2 border-l-[#CC0E21] animate-fadeIn">
                              <td colSpan={7} className="px-6 py-4">
                                <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-850/80 space-y-4 max-w-3xl">
                                  <h4 className="text-[10px] font-black uppercase text-[#CC0E21] tracking-wider pb-1 border-b border-slate-850">
                                    Valoración de rendimiento en la sesión
                                  </h4>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                                    {METRICAS_EVAL.map(m => (
                                      <StarRating
                                        key={m.key}
                                        label={m.label}
                                        value={(ev as any)[m.key] || 3}
                                        onChange={val => handleRatingChange(player.id, m.key, val)}
                                        size={16}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Botón de Guardado */}
              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  onClick={handleSaveAll} 
                  loading={saving} 
                  className="px-6 py-2.5 font-bold flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4" />
                  Guardar Asistencia y Valoraciones
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Tab 2: Resumen Semanal */
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
              <BarChart3 className="h-5 w-5 text-[#CC0E21]" />
              Resumen Acumulado de Entrenamientos
            </h3>
            <p className="text-xs text-slate-400">
              Estadísticas agregadas de las últimas sesiones planificadas en el microciclo.
            </p>
          </div>

          {weeklySummary && weeklySummary.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Timeline de sesiones recientes */}
              <div className="p-5 rounded-2xl bg-slate-900/20 border border-slate-800/80 space-y-4">
                <h4 className="text-xs font-bold text-[#CC0E21] uppercase tracking-wider border-b border-slate-850 pb-2">
                  Histórico de Sesiones Recientes
                </h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {weeklySummary.map(session => (
                    <div 
                      key={session.id} 
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedSessionId === session.id
                          ? 'bg-[#CC0E21]/10 border-[#CC0E21]/30'
                          : 'bg-slate-950/40 border-slate-850 hover:bg-slate-950/60'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs">
                        <strong className="text-slate-200">{session.tipo_sesion}</strong>
                        <span className="text-slate-500 font-semibold">{session.fecha}</span>
                      </div>
                      <p className="text-[10px] text-slate-450 mt-1">{session.objetivo_principal || 'Sin objetivo principal'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tarjeta informativa / Alertas */}
              <div className="p-5 rounded-2xl bg-slate-900/20 border border-slate-800/80 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-350 uppercase tracking-wider border-b border-slate-850 pb-2">
                    Alertas del Cuerpo Técnico
                  </h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-950/20 border border-blue-900/30 text-blue-400 rounded-xl text-xs flex gap-2">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Asistencia del Microciclo:</strong>
                        <p className="opacity-95 mt-0.5">La asistencia media de esta semana se mantiene sobre el 85%. Excelente implicación.</p>
                      </div>
                    </div>
                    <div className="p-3 bg-amber-950/20 border border-amber-900/30 text-amber-400 rounded-xl text-xs flex gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Prevención médica:</strong>
                        <p className="opacity-95 mt-0.5">Mantener control individual sobre las cargas de trabajo de los jugadores marcados como &quot;Duda&quot;.</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center p-4 bg-slate-950/60 rounded-xl border border-slate-850/50 mt-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Frecuencia de Registro</span>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Mantener al día la asistencia permite al preparador físico y analistas realizar informes cruzados con el rendimiento del GPS.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 text-sm">
              No hay sesiones planificadas en el histórico para mostrar resúmenes.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
