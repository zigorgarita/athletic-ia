/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities, @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  Shield,
  Layers,
  FileText,
  Users,
  Image as ImageIcon,
  ExternalLink,
  ChevronRight,
  Info,
  Lock,
  Activity,
  Clipboard,
  FileCode,
} from 'lucide-react';

import { getStaffPasskey } from '@/lib/passkey';
import { useEditMode } from '@/context/EditModeContext';

interface RfefPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialJornada?: number;
}

export function RfefPreviewModal({
  isOpen,
  onClose,
  initialJornada = 3,
}: RfefPreviewModalProps) {
  const [jornada, setJornada] = useState<number>(initialJornada);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'indautxu' | 'partidos' | 'jugadores' | 'auditoria'>('indautxu');
  const { currentUser, isEditMode } = useEditMode();
  const [pasting, setPasting] = useState<boolean>(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [showManualPaste, setShowManualPaste] = useState<boolean>(false);
  const [manualHtml, setManualHtml] = useState<string>('');

  const fetchFromBridgeAndPreview = async (j: number) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setPasteError(null);

    try {
      let resBridge: Response;
      try {
        resBridge = await fetch(`http://127.0.0.1:41189/jornada-completa?jornada=${j}`, {
          method: 'GET',
        });
      } catch (networkErr: any) {
        setError('Puente RFEF local no disponible.');
        setData(null);
        setLoading(false);
        return;
      }

      if (!resBridge.ok) {
        let errJson: any = null;
        try {
          errJson = await resBridge.json();
        } catch (_) {}
        const errorMsg = errJson?.error || `Error ${resBridge.status} en el puente local RFEF.`;
        setError(errorMsg);
        setData(null);
        setLoading(false);
        return;
      }

      let payload: any = null;
      try {
        payload = await resBridge.json();
      } catch (_) {}

      if (
        !payload ||
        payload.ok !== true ||
        payload.jornada !== j ||
        typeof payload.calendarHtml !== 'string' ||
        !payload.calendarHtml.trim() ||
        !Array.isArray(payload.actas)
      ) {
        setError('Respuesta inválida del puente local RFEF.');
        setData(null);
        setLoading(false);
        return;
      }

      await fetchPreview(j, payload.calendarHtml, payload.actas);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el calendario y actas desde el puente local.');
      setData(null);
      setLoading(false);
    }
  };

  const loadData = (targetJornada: number) => {
    if (isEditMode) {
      fetchFromBridgeAndPreview(targetJornada);
    } else {
      fetchPreview(targetJornada);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setJornada(initialJornada);
      setPasteError(null);
      setManualHtml('');
      setShowManualPaste(false);
      loadData(initialJornada);
    }
  }, [isOpen, initialJornada]);

  const fetchPreview = async (
    j: number,
    customCalendarHtml?: string,
    customActas?: Array<{ codActa: number; actaHtml: string; bytes?: number }>
  ) => {
    setLoading(true);
    setError(null);
    setPasteError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const staffPasskey = getStaffPasskey() || process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      if (staffPasskey) {
        headers['x-staff-passkey'] = staffPasskey;
      }
      if (currentUser?.id && currentUser?.pass) {
        headers['x-editor-user'] = currentUser.id;
        headers['x-editor-pass'] = currentUser.pass;
      }

      const bodyPayload: any = { jornada: j };
      if (customCalendarHtml) {
        bodyPayload.calendarHtml = customCalendarHtml;
      }
      if (customActas && Array.isArray(customActas)) {
        bodyPayload.actas = customActas;
      }

      const res = await fetch('/api/rfef/preview', {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Error ${res.status} al consultar la RFEF.`);
      }
      setData(json);
      setManualHtml('');
      setShowManualPaste(false);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.');
      setData(null);
    } finally {
      setLoading(false);
      setPasting(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    if (!isEditMode) {
      setPasteError('La ingesta de HTML oficial requiere tener el Modo Edición activado.');
      return;
    }
    setPasteError(null);
    setPasting(true);

    try {
      let text = '';
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        text = await navigator.clipboard.readText();
      } else {
        setShowManualPaste(true);
        setPasting(false);
        return;
      }

      const trimmed = (text || '').trim();
      if (!trimmed) {
        setPasteError(`El portapapeles está vacío. Ejecuta primero en tu consola: .\\scripts\\rfef-fetch.bat ${jornada}`);
        setPasting(false);
        return;
      }

      if (trimmed.length < 500) {
        setPasteError('El contenido del portapapeles es insuficiente para un calendario oficial de la RFEF.');
        setPasting(false);
        return;
      }

      const hasRfefMarker =
        trimmed.includes('NFG_') ||
        trimmed.includes('rfef') ||
        trimmed.includes('novanet') ||
        trimmed.includes('Resultados') ||
        trimmed.includes('Competicion');

      if (!hasRfefMarker) {
        setPasteError('El contenido del portapapeles no parece ser el HTML oficial generado por rfef-fetch.bat.');
        setPasting(false);
        return;
      }

      await fetchPreview(jornada, trimmed);
    } catch (err: any) {
      console.warn('Clipboard read error:', err);
      setShowManualPaste(true);
      setPasteError('El navegador no permitió leer el portapapeles directamente. Pégalo manualmente con Ctrl+V abajo.');
      setPasting(false);
    }
  };

  const handleManualPasteSubmit = () => {
    const trimmed = manualHtml.trim();
    if (!trimmed) {
      setPasteError('Introduce o pega el contenido HTML oficial.');
      return;
    }
    if (trimmed.length < 500) {
      setPasteError('El contenido pegado es insuficiente para un calendario oficial de la RFEF.');
      return;
    }
    const hasRfefMarker =
      trimmed.includes('NFG_') ||
      trimmed.includes('rfef') ||
      trimmed.includes('novanet') ||
      trimmed.includes('Resultados') ||
      trimmed.includes('Competicion');

    if (!hasRfefMarker) {
      setPasteError('El contenido pegado no parece ser un HTML oficial de la RFEF.');
      return;
    }

    fetchPreview(jornada, trimmed);
  };

  const handleJornadaChange = (newJ: number) => {
    setJornada(newJ);
    loadData(newJ);
  };

  if (!isOpen) return null;

  const isLive = data?.rfefLive === true;
  const isSnapshot = data?.source === 'snapshot';
  const isNone = data?.source === 'none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Contenedor del Modal */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-bold text-white tracking-wide">
                  Previsualización Oficial RFEF
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Jornada {jornada}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                División de Honor Juvenil · Grupo 2 (2026/27) · <span className="text-emerald-400 font-medium">Modo Solo Lectura</span>
              </p>
            </div>
          </div>

          {/* Selector de Jornada y Botón Cerrar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">Jor:</span>
              <select
                value={jornada}
                onChange={(e) => handleJornadaChange(parseInt(e.target.value, 10))}
                disabled={loading}
                className="bg-transparent text-white font-mono text-xs font-bold focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num} className="bg-slate-900 text-white">
                    Jornada {num}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => loadData(jornada)}
              disabled={loading}
              title="Refrescar consulta RFEF"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Cerrar modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Barra de Estado RFEF (LIVE vs SNAPSHOT) */}
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Estado conexión:</span>
            {loading ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" /> Consultando RFEF...
              </span>
            ) : isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> RFEF LIVE · TIEMPO REAL
              </span>
            ) : isSnapshot ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> SNAPSHOT LOCAL · NO ACTUALIZABLE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> SIN RESPUESTA FEDERATIVA
              </span>
            )}

            {data?.sources?.calendar?.bytes > 0 && (
              <span className="text-slate-500 font-mono text-[11px] hidden md:inline">
                ({data.sources.calendar.bytes.toLocaleString()} bytes)
              </span>
            )}

            {data?.rfefHttpDiagnostic && !isLive && !isSnapshot && (
              <span className="text-slate-400 font-mono text-[11px] hidden sm:inline bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                HTTP {data.rfefHttpDiagnostic.httpCode} · {data.rfefHttpDiagnostic.bytesReceived}B · {data.rfefHttpDiagnostic.finalPath}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/50">
              <Lock className="w-3 h-3 text-amber-400" />
              Sincronización Bloqueada (Fase Solo Lectura)
            </span>
          </div>
        </div>

        {/* Panel de Ingesta Schannel P2.1 / P3 (Exclusivo Modo Edición) */}
        {isEditMode ? (
          <div className="px-6 py-3 bg-slate-950/90 border-b border-slate-800 flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-950/50 border border-red-800/60 px-2 py-0.5 rounded-md">
                  <FileCode className="w-3.5 h-3.5" />
                  Schannel P2.1 Helper
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  Cargar HTML oficial de <strong className="text-white">Jornada {jornada}</strong> desde portapapeles
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePasteFromClipboard}
                  disabled={loading || pasting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-red-950/50 cursor-pointer disabled:opacity-50"
                  title="Lee el portapapeles de Windows generado por rfef-fetch.bat"
                >
                  <Clipboard className={`w-3.5 h-3.5 ${pasting ? 'animate-pulse' : ''}`} />
                  {pasting ? 'Leyendo...' : 'Pegar HTML desde Portapapeles'}
                </button>
                <button
                  onClick={() => setShowManualPaste((v) => !v)}
                  className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 px-1.5 py-1"
                >
                  {showManualPaste ? 'Cerrar pegado manual' : 'Pegar manual (Ctrl+V)'}
                </button>
              </div>
            </div>

            {showManualPaste && (
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-700/80 space-y-2 mt-1">
                <div className="text-[11px] text-slate-300 flex items-center justify-between">
                  <span>Pega aquí el HTML oficial copiado por <code className="text-red-300 font-mono">rfef-fetch.bat {jornada}</code>:</span>
                  <span className="text-slate-500 text-[10px]">No se guardará en disco ni BD</span>
                </div>
                <textarea
                  value={manualHtml}
                  onChange={(e) => setManualHtml(e.target.value)}
                  placeholder="Pega aquí el HTML oficial completo (Ctrl+V)..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-red-500"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setManualHtml('');
                      setShowManualPaste(false);
                    }}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleManualPasteSubmit}
                    disabled={loading || !manualHtml.trim()}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded cursor-pointer disabled:opacity-50"
                  >
                    Cargar HTML Pegado
                  </button>
                </div>
              </div>
            )}

            {pasteError && (
              <div className="text-xs text-rose-300 bg-rose-950/50 border border-rose-900/60 rounded px-3 py-1.5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{pasteError}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="px-6 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Solo Lectura: La ingesta de HTML oficial desde portapapeles está reservada al Modo Edición.</span>
            </div>
          </div>
        )}

        {/* Pestañas internas de navegación */}
        <div className="flex items-center gap-1 px-6 pt-3 bg-slate-900 border-b border-slate-800 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('indautxu')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'indautxu'
                ? 'border-red-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> Partido Indautxu
          </button>
          <button
            onClick={() => setActiveTab('partidos')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'partidos'
                ? 'border-red-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> 8 Partidos Jornada ({data?.matches?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('jugadores')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'jugadores'
                ? 'border-red-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Actas y Convocatorias
          </button>
          <button
            onClick={() => setActiveTab('auditoria')}
            className={`px-3 py-2 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'auditoria'
                ? 'border-red-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Auditoría y Avisos ({((data?.blockers?.length || 0) + (data?.warnings?.length || 0))})
          </button>
        </div>

        {/* Cuerpo del Modal con Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Mensaje de carga */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="w-8 h-8 border-3 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
              <p className="text-slate-400 text-sm font-mono">
                Consultando página oficial de la RFEF para Jornada {jornada}...
              </p>
            </div>
          )}

          {/* Mensaje de error general */}
          {error && !loading && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm">Error en la consulta federativa</div>
                <div className="text-xs text-rose-300/90">{error}</div>
              </div>
            </div>
          )}

          {/* Aviso de Snapshot si aplica */}
          {isSnapshot && !loading && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-200 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">AVISO DE MODO SNAPSHOT:</span> Los datos mostrados proceden de un snapshot local archivado (archivo: <code className="font-mono text-amber-300">{data?.sources?.calendar?.snapshotFile || 'local'}</code>). No provienen de una consulta en directo y cualquier sincronización automática queda terminantemente bloqueada.
              </div>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Resumen Superior de Métricas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Partidos RFEF</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {data.matches?.length || 0} / 8
                  </div>
                  <div className="text-[10px] text-slate-500">Oficiales detectados</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Actas Oficiales</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {data.availability?.actasAvailable || '0/8'}
                  </div>
                  <div className="text-[10px] text-slate-500">Publicadas por RFEF</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Clasificación J{jornada}</div>
                  <div className={`text-sm font-bold font-mono mt-1 ${data.availability?.standingsAvailable ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {data.availability?.standingsAvailable ? 'Disponible' : 'No disponible'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate" title={data.availability?.standingsReason || ''}>
                    {data.availability?.standingsAvailable ? `${data.standings?.length || 16} equipos` : 'Pendiente computar'}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Bloqueos Críticos</div>
                  <div className={`text-xl font-bold font-mono mt-1 ${data.blockers?.length === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {data.blockers?.length || 0}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {data.blockers?.length === 0 ? '0 blockers' : 'Requiere revisión'}
                  </div>
                </div>
              </div>

              {/* TAB 1: PARTIDO INDAUTXU Y COMPARATIVA */}
              {activeTab === 'indautxu' && (
                <div className="space-y-4">
                  {/* Tarjeta de Enfrentamiento Oficial RFEF */}
                  {data.indautxuMatch ? (
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-red-400 bg-red-950/40 border border-red-900/50 px-2.5 py-0.5 rounded">
                            Partido Oficial SD Indautxu
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            Origen: <span className="font-bold text-slate-200 uppercase">{data.indautxuMatch.source}</span>
                          </span>
                        </div>
                        {data.indautxuMatch.resultadoOficial ? (
                          <span className="px-2.5 py-0.5 rounded font-mono font-bold text-sm bg-slate-800 text-white border border-slate-700">
                            Resultado: {data.indautxuMatch.resultadoOficial}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-slate-800/60 text-slate-400 border border-slate-700/50">
                            Partido No Disputado / Futuro
                          </span>
                        )}
                      </div>

                      {/* Nombres de equipos y marcador */}
                      <div className="flex items-center justify-between gap-4 py-2 border-y border-slate-800/60">
                        <div className={`flex-1 text-right font-bold text-sm md:text-base ${data.indautxuMatch.esLocal ? 'text-red-300 font-extrabold' : 'text-slate-200'}`}>
                          {data.indautxuMatch.localTeam}
                          {data.indautxuMatch.esLocal && <span className="ml-1.5 text-xs text-red-400 font-normal">(Indautxu)</span>}
                        </div>
                        <div className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 shrink-0">
                          {data.indautxuMatch.resultadoOficial || 'VS'}
                        </div>
                        <div className={`flex-1 text-left font-bold text-sm md:text-base ${!data.indautxuMatch.esLocal ? 'text-red-300 font-extrabold' : 'text-slate-200'}`}>
                          {data.indautxuMatch.visitorTeam}
                          {!data.indautxuMatch.esLocal && <span className="ml-1.5 text-xs text-red-400 font-normal">(Indautxu)</span>}
                        </div>
                      </div>

                      {/* Datos de Campo, Fecha y Hora */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                        <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                          <Calendar className="w-4 h-4 text-red-400 shrink-0" />
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase font-medium">Fecha Oficial</div>
                            <div className="font-mono font-semibold">{data.indautxuMatch.fecha || 'Por determinar'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                          <Clock className="w-4 h-4 text-blue-400 shrink-0" />
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase font-medium">Hora Oficial</div>
                            <div className="font-mono font-semibold">{data.indautxuMatch.hora ? data.indautxuMatch.hora.substring(0, 5) : 'Por determinar'}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                          <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="truncate">
                            <div className="text-[10px] text-slate-500 uppercase font-medium">Campo Oficial</div>
                            <div className="font-semibold truncate" title={data.indautxuMatch.campo || ''}>
                              {data.indautxuMatch.campo || 'Por determinar'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-slate-400 text-sm">
                      No se detectó el partido de la SD Indautxu en la jornada seleccionada.
                    </div>
                  )}

                  {/* TABLA COMPARATIVA: ATHLETIC IA vs RFEF */}
                  {data.comparisonWithDb && (
                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-slate-400" />
                          Comparativa Athletic IA (public.matches) ↔ RFEF Oficial
                        </h3>
                        <span className="text-[11px] text-slate-500 font-mono">
                          UUID: {data.comparisonWithDb.dbMatchId ? data.comparisonWithDb.dbMatchId.substring(0, 8) + '...' : 'N/D'}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400 font-medium">
                              <th className="py-2 px-2">Parámetro</th>
                              <th className="py-2 px-2">Athletic IA (BD Actual)</th>
                              <th className="py-2 px-2">RFEF (Oficial)</th>
                              <th className="py-2 px-2 text-right">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {/* Localía */}
                            <tr>
                              <td className="py-2.5 px-2 font-medium text-slate-300">Sede / Localía</td>
                              <td className="py-2.5 px-2 font-mono text-slate-300">
                                {data.comparisonWithDb.dbEsLocal ? 'Local (Casa)' : 'Visitante (Fuera)'}
                              </td>
                              <td className="py-2.5 px-2 font-mono text-slate-300">
                                {data.comparisonWithDb.rfefEsLocal ? 'Local (Casa)' : 'Visitante (Fuera)'}
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                {data.comparisonWithDb.localiaMatches ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Coincide
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                                    <XCircle className="w-3.5 h-3.5" /> DISCREPANCIA
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* Rival */}
                            <tr>
                              <td className="py-2.5 px-2 font-medium text-slate-300">Rival</td>
                              <td className="py-2.5 px-2 font-semibold text-slate-200">{data.comparisonWithDb.dbRival}</td>
                              <td className="py-2.5 px-2 font-semibold text-slate-200">{data.comparisonWithDb.rfefRival}</td>
                              <td className="py-2.5 px-2 text-right">
                                {data.comparisonWithDb.rivalMatches ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Coincide
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                                    <XCircle className="w-3.5 h-3.5" /> DISCREPANCIA
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* Fecha */}
                            <tr className={!data.comparisonWithDb.fechaMatches ? 'bg-amber-500/5' : ''}>
                              <td className="py-2.5 px-2 font-medium text-slate-300">Fecha</td>
                              <td className="py-2.5 px-2 font-mono text-slate-300">{data.comparisonWithDb.dbFecha || 'N/D'}</td>
                              <td className="py-2.5 px-2 font-mono font-bold text-amber-300">
                                {data.comparisonWithDb.rfefFecha || 'N/D'}
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                {data.comparisonWithDb.fechaMatches ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Coincide
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-400 font-semibold" title="RFEF ha modificado la fecha oficial">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Modificada RFEF
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* Hora */}
                            <tr className={!data.comparisonWithDb.horaMatches ? 'bg-amber-500/5' : ''}>
                              <td className="py-2.5 px-2 font-medium text-slate-300">Hora</td>
                              <td className="py-2.5 px-2 font-mono text-slate-300">
                                {data.comparisonWithDb.dbHora ? data.comparisonWithDb.dbHora.substring(0, 5) : 'N/D'}
                              </td>
                              <td className="py-2.5 px-2 font-mono font-bold text-amber-300">
                                {data.comparisonWithDb.rfefHora ? data.comparisonWithDb.rfefHora.substring(0, 5) : 'N/D'}
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                {data.comparisonWithDb.horaMatches ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Coincide
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-400 font-semibold" title="RFEF ha fijado la hora oficial">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Modificada RFEF
                                  </span>
                                )}
                              </td>
                            </tr>

                            {/* Campo */}
                            <tr>
                              <td className="py-2.5 px-2 font-medium text-slate-300">Campo</td>
                              <td className="py-2.5 px-2 text-slate-300 truncate max-w-[160px]" title={data.comparisonWithDb.dbCampo}>
                                {data.comparisonWithDb.dbCampo || 'N/D'}
                              </td>
                              <td className="py-2.5 px-2 text-slate-200 font-semibold truncate max-w-[160px]" title={data.comparisonWithDb.rfefCampo}>
                                {data.comparisonWithDb.rfefCampo || 'N/D'}
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                {data.comparisonWithDb.campoMatches ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Coincide
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Ajuste campo
                                  </span>
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: LOS 8 PARTIDOS DE LA JORNADA */}
              {activeTab === 'partidos' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 font-medium">
                    Listado de los 8 enfrentamientos oficiales programados por la RFEF:
                  </div>

                  <div className="space-y-2">
                    {data.matches?.map((m: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          m.isIndautxuMatch
                            ? 'bg-red-950/20 border-red-900/50 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-semibold ${m.localTeam.includes('Indautxu') ? 'text-red-400 font-bold' : 'text-slate-200'}`}>
                                {m.localTeam}
                              </span>
                              <span className="text-slate-500 font-mono text-[10px]">vs</span>
                              <span className={`font-semibold ${m.visitorTeam.includes('Indautxu') ? 'text-red-400 font-bold' : 'text-slate-200'}`}>
                                {m.visitorTeam}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                              {m.fecha && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-500" /> {m.fecha} {m.hora ? m.hora.substring(0, 5) : ''}
                                </span>
                              )}
                              {m.campo && (
                                <span className="flex items-center gap-1 truncate max-w-[220px]" title={m.campo}>
                                  <MapPin className="w-3 h-3 text-slate-500" /> {m.campo}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {m.hasActa ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                              Acta {m.codActa || ''}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800/60 text-slate-500 border border-slate-700/40">
                              Sin acta
                            </span>
                          )}

                          {m.resultadoOficial ? (
                            <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-900 text-white border border-slate-700">
                              {m.resultadoOficial}
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-500">Pendiente</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: AUDITORÍA DE JUGADORES Y CONVOCATORIAS */}
              {activeTab === 'jugadores' && (
                <div className="space-y-4">
                  {/* Auditoría de Fotos y Siluetas */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                      <div className="text-[11px] text-slate-400 uppercase font-medium">Jugadores Rivales Nuevos</div>
                      <div className="text-xl font-bold font-mono text-white mt-1">
                        {data.playersAudit?.newRivalPlayersCount || 0}
                      </div>
                      <div className="text-[10px] text-slate-500">Sin registrar en club_players</div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                      <div className="text-[11px] text-slate-400 uppercase font-medium">Fotos Reales Detectadas</div>
                      <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                        {data.playersAudit?.realPhotosDetectedCount || 0}
                      </div>
                      <div className="text-[10px] text-slate-500">Imágenes válidas en base64</div>
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                      <div className="text-[11px] text-slate-400 uppercase font-medium">Siluetas Descartadas</div>
                      <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                        {data.playersAudit?.discardedSilhouettesCount || 0}
                      </div>
                      <div className="text-[10px] text-slate-500">Placeholders federativos</div>
                    </div>
                  </div>

                  {/* Convocatoria de Indautxu */}
                  {data.indautxuMatch?.convocados?.length > 0 ? (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Convocatoria Indautxu ({data.indautxuMatch.convocados.length} jugadores)
                        </h4>
                        {data.indautxuMatch.minutosPostcheck && (
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                            data.indautxuMatch.minutosPostcheck.valid ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300'
                          }`}>
                            Suma Minutos: {data.indautxuMatch.minutosPostcheck.totalMinutos} min (Esperado: 990 min)
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {data.indautxuMatch.convocados.map((p: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-900/60 border border-slate-800/60">
                            <span className="font-mono text-slate-400 w-6">#{p.dorsal || '-'}</span>
                            <span className="flex-1 font-medium text-slate-200 truncate">{p.nombre}</span>
                            <span className="text-[11px] text-slate-500 font-mono">{p.rol} ({p.minutos}')</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 rounded-xl bg-slate-950/40 border border-slate-800 text-center space-y-2">
                      <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                      <div className="text-sm font-semibold text-slate-300">Sin actas oficiales publicadas todavía</div>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        La jornada {jornada} se encuentra programada pero no se ha disputado aún. No se inventan alineaciones, minutos ni convocatorias.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: AUDITORÍA DE SEGURIDAD Y AVISOS */}
              {activeTab === 'auditoria' && (
                <div className="space-y-4">
                  {/* Evidencia e Instrumentación Diagnóstica HTTP RFEF */}
                  {(data.rfefHttpDiagnostic || data.sources?.calendar?.httpDiagnostic) && (() => {
                    const diag = data.rfefHttpDiagnostic || data.sources?.calendar?.httpDiagnostic;
                    return (
                      <div className="bg-slate-950/80 border border-indigo-900/50 rounded-xl p-4 space-y-3 text-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="font-bold text-indigo-300 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-400" />
                            Evidencia HTTP RFEF (Instrumentación Diagnóstica)
                          </div>
                          <span className={`font-mono font-bold text-[11px] px-2.5 py-0.5 rounded border ${
                            diag.httpCode === 200 ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-rose-950/80 text-rose-300 border-rose-800'
                          }`}>
                            HTTP {diag.httpCode || 'N/D'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
                          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-[10px] uppercase">Código HTTP Final</span>
                            <span className="text-white font-bold text-sm">
                              {diag.httpCode ?? 'N/D'}
                            </span>
                          </div>
                          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-[10px] uppercase">Redirects</span>
                            <span className="text-white font-bold text-sm">
                              {diag.numRedirects ?? 0}
                            </span>
                          </div>
                          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-[10px] uppercase">Bytes Recibidos</span>
                            <span className="text-white font-bold text-sm">
                              {diag.bytesReceived ?? 0}
                            </span>
                          </div>
                          <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-[10px] uppercase">Cookie JSESSIONID</span>
                            <span className={`font-bold text-sm ${diag.hasJSessionId ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {diag.hasJSessionId ? 'SÍ (PRESENTE)' : 'NO'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1 text-[11px] font-mono border-t border-slate-800/80">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-400">Path final:</span>
                            <span className="text-amber-300 font-bold">{diag.finalPath || 'N/D'}</span>
                            {diag.endsInLogin && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 text-[10px] border border-rose-800">
                                Termina en NLogin
                              </span>
                            )}
                            {diag.endsInExpectedPath && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] border border-emerald-800">
                                Termina en NFG_CmpJornada
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-slate-400 truncate">
                            <span className="text-slate-500">URL sanitizada:</span>
                            <span className="truncate">{diag.sanitizedUrl || 'N/D'}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-400">Exit code curl:</span>
                            <span className={diag.curlExitCode === 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {diag.curlExitCode ?? 'N/D'}
                            </span>
                            {diag.curlError && (
                              <span className="text-rose-400 text-[10px]">({diag.curlError})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Blockers Críticos */}
                  {data.blockers?.length > 0 && (
                    <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/60 space-y-2">
                      <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                        <XCircle className="w-4 h-4 text-rose-400" />
                        Bloqueos Críticos Detectados ({data.blockers.length})
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-xs text-rose-200/90 font-mono">
                        {data.blockers.map((b: string, idx: number) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings Informativos */}
                  {data.warnings?.length > 0 && (
                    <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-900/50 space-y-2">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Avisos y Diagnóstico ({data.warnings.length})
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-xs text-amber-200/90">
                        {data.warnings.map((w: string, idx: number) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Auditoría de Cero Escrituras */}
                  {data.readOnlyAudit && (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                      <div className="font-bold text-slate-300 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        Garantía Estricta de Solo Lectura
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-400">
                        <div>Escrituras intentadas: <span className="font-mono font-bold text-emerald-400">{data.readOnlyAudit.writesAttempted}</span></div>
                        <div>Operaciones de mutación permitidas: <span className="font-mono font-bold text-rose-400">{data.readOnlyAudit.writeOperationsAllowed ? 'SÍ' : 'NO'}</span></div>
                      </div>
                      <div className="pt-2 border-t border-slate-800/60 text-slate-500 font-mono text-[11px]">
                        Consultas ejecutadas: {data.readOnlyAudit.operationsExecuted?.join(' · ')}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Panel de previsualización sin modificaciones en la base de datos.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={() => fetchPreview(jornada)}
              disabled={loading}
              className="px-4 py-2 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Reconsultar RFEF
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
