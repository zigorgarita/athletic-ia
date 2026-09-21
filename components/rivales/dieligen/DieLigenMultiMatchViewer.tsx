'use client';

import React, { useState } from 'react';
import { DieLigenMultiMatchReportData } from '@/lib/die-ligen/aggregator';
import { exportMultiMatchToPdf } from '@/lib/die-ligen/exportMultiMatchPdf';
import {
  FileDown,
  RotateCcw,
  Target,
  Crosshair,
  TrendingUp,
  Shield,
  Users,
  Compass,
  CornerDownRight,
  Goal,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DieLigenMultiMatchViewerProps {
  data: DieLigenMultiMatchReportData;
  onBack: () => void;
}

type TabType =
  | 'tendencias'
  | 'goles'
  | 'tiros'
  | 'centros'
  | 'corneres'
  | 'faltas'
  | 'saquesPuerta'
  | 'saquesBanda'
  | 'formaciones';

export function DieLigenMultiMatchViewer({ data, onBack }: DieLigenMultiMatchViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tendencias');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [selectedFormationIdx, setSelectedFormationIdx] = useState<number>(0);

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportMultiMatchToPdf(data);
    } catch (err) {
      console.error('[MultiMatch PDF] Error exportando PDF acumulado:', err);
      alert('Hubo un error al generar el PDF del informe acumulado.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const bal = data.balance;

  return (
    <div className="space-y-6">
      {/* ─── CABECERA DEL INFORME ACUMULADO ─────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#CC0E21]/20 border border-[#CC0E21]/40 text-[#CC0E21] uppercase tracking-wider">
                Informe Acumulado · {data.totalPartidos} Partidos
              </span>
              <span className="text-xs font-semibold text-slate-400">
                {data.competicion} · {data.temporada}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
              <span>{data.targetClubName}</span>
              <span className="text-xs font-normal text-slate-400">
                (Muestra: {data.jornadasIncluidas})
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={onBack}
              className="text-xs font-semibold py-2 px-3 border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Volver a selección</span>
            </Button>

            <Button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="text-xs font-bold py-2 px-4 bg-[#CC0E21] hover:bg-[#A60B1B] text-white flex items-center gap-2 shadow-sm transition-all"
            >
              <FileDown className={`h-4 w-4 ${isExportingPdf ? 'animate-bounce' : ''}`} />
              <span>{isExportingPdf ? 'Generando PDF...' : 'Exportar PDF Acumulado'}</span>
            </Button>
          </div>
        </div>

        {/* ─── TARJETAS DE BALANCE GENERAL ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-slate-950/70 border border-slate-800/70 rounded-xl p-3">
            <div className="text-[11px] font-medium text-slate-400">Balance</div>
            <div className="text-base font-bold text-white mt-0.5 flex items-center gap-1.5">
              <span className="text-emerald-400">{bal.victorias}V</span>
              <span className="text-slate-500">-</span>
              <span className="text-amber-400">{bal.empates}E</span>
              <span className="text-slate-500">-</span>
              <span className="text-rose-400">{bal.derrotas}D</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{bal.puntos} puntos logrados</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/70 rounded-xl p-3">
            <div className="text-[11px] font-medium text-slate-400">Goles a favor</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">
              {bal.golesFavor} <span className="text-xs font-normal text-slate-400">({bal.promedioGolesFavor}/p)</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Total en la muestra</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/70 rounded-xl p-3">
            <div className="text-[11px] font-medium text-slate-400">Goles en contra</div>
            <div className="text-base font-bold text-rose-400 mt-0.5">
              {bal.golesContra} <span className="text-xs font-normal text-slate-400">({bal.promedioGolesContra}/p)</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Dif: {bal.diferenciaGoles > 0 ? `+${bal.diferenciaGoles}` : bal.diferenciaGoles}</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/70 rounded-xl p-3">
            <div className="text-[11px] font-medium text-slate-400">Remates / Partido</div>
            <div className="text-base font-bold text-white mt-0.5">
              {data.tiros.promedioTiros} <span className="text-xs font-normal text-slate-400">({data.tiros.promedioPuerta} pta)</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{data.tiros.pctPuerta} puntería</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/70 rounded-xl p-3">
            <div className="text-[11px] font-medium text-slate-400">Centros / Partido</div>
            <div className="text-base font-bold text-white mt-0.5">
              {data.centros.promedioCentros}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{data.centros.pctConRemate} con remate</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/70 rounded-xl p-3">
            <div className="text-[11px] font-medium text-slate-400">Córneres / Partido</div>
            <div className="text-base font-bold text-white mt-0.5">
              {data.corneres.promedioCorneres}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{data.corneres.pctPeligro} peligro</div>
          </div>
        </div>

        {/* ─── TIRA DE PARTIDOS ANALIZADOS ─────────────────────────────────── */}
        <div className="mt-4 pt-3 border-t border-slate-800/60">
          <div className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wide">
            Partidos incluidos en este informe ({data.totalPartidos}):
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {data.partidos.map((p) => (
              <div
                key={p.gameIndex}
                className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono">
                      J-{p.jornada}
                    </span>
                    <span className="truncate max-w-[110px]" title={p.rivalNombre}>
                      vs {p.rivalNombre}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {p.esLocal ? 'Local' : 'Visitante'} · {p.fecha}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-white text-xs">{p.resultado}</div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      p.signo === 'V'
                        ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                        : p.signo === 'E'
                        ? 'bg-amber-950 border border-amber-800 text-amber-400'
                        : 'bg-rose-950 border border-rose-800 text-rose-400'
                    }`}
                  >
                    {p.signo === 'V' ? 'Victoria' : p.signo === 'E' ? 'Empate' : 'Derrota'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── SELECTOR DE PESTAÑAS / SECCIONES ───────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('tendencias')}
          className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'tendencias'
              ? 'bg-[#CC0E21] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Evolución & Tendencias</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('goles')}
          className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'goles'
              ? 'bg-[#CC0E21] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Goal className="h-3.5 w-3.5" />
          <span>1. Goles ({bal.golesFavor})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tiros')}
          className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'tiros'
              ? 'bg-[#CC0E21] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Crosshair className="h-3.5 w-3.5" />
          <span>2. Tiros ({data.tiros.totalIntentos})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('centros')}
          className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'centros'
              ? 'bg-[#CC0E21] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          <span>3. Centros ({data.centros.total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('corneres')}
          className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'corneres'
              ? 'bg-[#CC0E21] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CornerDownRight className="h-3.5 w-3.5" />
          <span>4. Córneres ({data.corneres.total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('faltas')}
          className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'faltas'
              ? 'bg-[#CC0E21] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Target className="h-3.5 w-3.5" />
          <span>5. Faltas ({data.faltas.total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saquesPuerta')}
          className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'saquesPuerta'
              ? 'bg-[#CC0E21] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>6. Saques Puerta ({data.saquesPuerta.total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saquesBanda')}
          className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'saquesBanda'
              ? 'bg-[#CC0E21] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Compass className="h-3.5 w-3.5" />
          <span>7. Saques Banda ({data.saquesBanda.total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('formaciones')}
          className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'formaciones'
              ? 'bg-[#CC0E21] text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>8. Sistemas & Titulares</span>
        </button>
      </div>

      {/* ─── CONTENIDO SEGÚN PESTAÑA ACTIVA ─────────────────────────────────── */}

      {/* ─── PESTAÑA 0: EVOLUCIÓN Y TENDENCIAS ──────────────────────────────── */}
      {activeTab === 'tendencias' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#CC0E21]" />
              <span>Tabla comparativa evolutiva jornada a jornada</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Métricas directas de {data.targetClubName} registradas en cada partido analizado.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-slate-400 bg-slate-950/80 border-b border-slate-800 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Jornada</th>
                    <th className="py-2.5 px-3">Rival</th>
                    <th className="py-2.5 px-3">Cond.</th>
                    <th className="py-2.5 px-3">Resultado</th>
                    <th className="py-2.5 px-3 text-right">Tiros (Puerta)</th>
                    <th className="py-2.5 px-3 text-right">Centros</th>
                    <th className="py-2.5 px-3 text-right">Córneres</th>
                    <th className="py-2.5 px-3 text-right">Saques Puerta</th>
                    <th className="py-2.5 px-3 text-right">Saques Banda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.tendenciasPorJornada.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-white font-mono">{row.jornada}</td>
                      <td className="py-2.5 px-3 text-slate-200 font-medium">{row.rival}</td>
                      <td className="py-2.5 px-3 text-slate-400">{row.condicion}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-white mr-1.5">{row.resultado}</span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            row.signo === 'V'
                              ? 'bg-emerald-950 text-emerald-400'
                              : row.signo === 'E'
                              ? 'bg-amber-950 text-amber-400'
                              : 'bg-rose-950 text-rose-400'
                          }`}
                        >
                          {row.signo}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-200 font-bold">
                        {row.rematesTotal} <span className="text-slate-400 font-normal">({row.rematesPuerta})</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-200">{row.centrosTotal}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-200">{row.corneresTotal}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-200">{row.saquesPuertaTotal}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-200">{row.saquesBandaTotal}</td>
                    </tr>
                  ))}
                  {/* Fila de Totales y Promedios */}
                  <tr className="bg-slate-950 font-bold text-slate-100 border-t-2 border-slate-700">
                    <td className="py-3 px-3" colSpan={4}>
                      TOTAL ACUMULADO ({data.totalPartidos} PARTIDOS)
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#CC0E21]">
                      {data.tiros.totalIntentos} ({data.tiros.aPuerta})
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-100">{data.centros.total}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-100">{data.corneres.total}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-100">{data.saquesPuerta.total}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-100">{data.saquesBanda.total}</td>
                  </tr>
                  <tr className="bg-slate-950/60 text-slate-300 font-medium">
                    <td className="py-2 px-3 text-slate-400" colSpan={4}>
                      PROMEDIO POR ENCUENTRO
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">
                      {data.tiros.promedioTiros} ({data.tiros.promedioPuerta})
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">{data.centros.promedioCentros}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">{data.corneres.promedioCorneres}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">{(data.saquesPuerta.total / data.totalPartidos).toFixed(1)}</td>
                    <td className="py-2 px-3 text-right font-mono text-slate-300">{(data.saquesBanda.total / data.totalPartidos).toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 1: GOLES ──────────────────────────────────────────────── */}
      {activeTab === 'goles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Goleadores */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                <span>Goleadores acumulados</span>
                <span className="text-xs font-normal text-emerald-400">{bal.golesFavor} goles totales</span>
              </h3>
              {data.goles.goleadores.length === 0 ? (
                <div className="text-xs text-slate-400 italic">No hay goles a favor registrados.</div>
              ) : (
                <div className="space-y-2">
                  {data.goles.goleadores.map((g, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs"
                    >
                      <span className="font-semibold text-white">{g.jugador}</span>
                      <span className="font-bold text-[#CC0E21] px-2 py-0.5 rounded bg-[#CC0E21]/10 border border-[#CC0E21]/30">
                        {g.total} {g.total === 1 ? 'gol' : 'goles'}
                      </span>
                    </div>
                  ))}
                  {data.goles.autogolesFavor > 0 && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/40 text-xs text-slate-400">
                      <span>Autogoles a favor del rival</span>
                      <span className="font-mono font-bold text-amber-400">{data.goles.autogolesFavor} gol(es)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Asistentes */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                <span>Asistentes acumulados</span>
                <span className="text-xs font-normal text-blue-400">Pases de gol</span>
              </h3>
              {data.goles.asistentes.length === 0 ? (
                <div className="text-xs text-slate-400 italic">No hay asistencias registradas.</div>
              ) : (
                <div className="space-y-2">
                  {data.goles.asistentes.map((a, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs"
                    >
                      <span className="font-semibold text-white">{a.jugador}</span>
                      <span className="font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-950/40 border border-blue-800/50">
                        {a.total} {a.total === 1 ? 'asistencia' : 'asistencias'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Listado cronológico de goles a favor */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">
              Detalle cronológico de todos los goles a favor
            </h3>
            {data.goles.golesFavorLista.length === 0 ? (
              <div className="text-xs text-slate-400 italic">Sin goles registrados en la muestra.</div>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {data.goles.golesFavorLista.map((g, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#CC0E21] bg-[#CC0E21]/10 px-1.5 py-0.5 rounded text-[11px]">
                        {g.jornadaBadge}
                      </span>
                      <span className="text-slate-400">{g.minutoFutbolistico}</span>
                      <span className="font-semibold text-white">{g.goleador}</span>
                      {g.esAutogol && (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/60">
                          Autogol
                        </span>
                      )}
                      {g.asistente && g.asistente !== 'Sin asistencia' && (
                        <span className="text-slate-400 text-[11px]">
                          (Asist: <span className="text-slate-300">{g.asistente}</span>)
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[11px]">vs {g.rivalPartido}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 2: TIROS Y REMATES ────────────────────────────────────── */}
      {activeTab === 'tiros' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Total intentos</div>
              <div className="text-xl font-bold text-white mt-1">{data.tiros.totalIntentos}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.tiros.promedioTiros} por partido</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Remates a puerta</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{data.tiros.aPuerta}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.tiros.pctPuerta} de eficacia</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Dentro del área</div>
              <div className="text-xl font-bold text-white mt-1">{data.tiros.dentroArea}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.tiros.pctDentroArea} del total</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Tras contraataque</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{data.tiros.contraataques}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Transiciones rápidas</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Distribución por carriles */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">Distribución de remates por carril</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Carril Izquierdo</span>
                    <span className="font-bold text-white">
                      {data.tiros.carriles.izquierda} ({data.tiros.carriles.pctIzq})
                    </span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: data.tiros.carriles.pctIzq }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Carril Central</span>
                    <span className="font-bold text-white">
                      {data.tiros.carriles.centro} ({data.tiros.carriles.pctCentro})
                    </span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#CC0E21] rounded-full"
                      style={{ width: data.tiros.carriles.pctCentro }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Carril Derecho</span>
                    <span className="font-bold text-white">
                      {data.tiros.carriles.derecha} ({data.tiros.carriles.pctDer})
                    </span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: data.tiros.carriles.pctDer }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Ranking de rematadores */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white mb-3">Jugadores con más remates</h3>
              {data.tiros.rematadores.length === 0 ? (
                <div className="text-xs text-slate-400 italic">No hay rematadores registrados.</div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {data.tiros.rematadores.slice(0, 8).map((r, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs"
                    >
                      <span className="text-white font-medium">{r.jugador}</span>
                      <span className="font-bold font-mono text-slate-200">
                        {r.total} {r.total === 1 ? 'remate' : 'remates'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 3: CENTROS ────────────────────────────────────────────── */}
      {activeTab === 'centros' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Total centros</div>
              <div className="text-xl font-bold text-white mt-1">{data.centros.total}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.centros.promedioCentros} por partido</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Por banda derecha</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{data.centros.derecha}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.centros.pctDerecha} del total</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Por banda izquierda</div>
              <div className="text-xl font-bold text-blue-400 mt-1">{data.centros.izquierda}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.centros.pctIzquierda} del total</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Rematados al área</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{data.centros.conRemate}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.centros.pctConRemate} de efectividad</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">Principales centradores</h3>
            {data.centros.centradores.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No hay centradores registrados.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {data.centros.centradores.slice(0, 9).map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs"
                  >
                    <span className="text-white font-medium">{c.jugador}</span>
                    <span className="font-bold font-mono text-[#CC0E21]">{c.total} centros</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 4: CÓRNERES ───────────────────────────────────────────── */}
      {activeTab === 'corneres' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Total córneres</div>
              <div className="text-xl font-bold text-white mt-1">{data.corneres.total}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.corneres.promedioCorneres} por partido</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Lado derecho</div>
              <div className="text-xl font-bold text-white mt-1">{data.corneres.derecha}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.corneres.pctDerecha}</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Lado izquierdo</div>
              <div className="text-xl font-bold text-white mt-1">{data.corneres.izquierda}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.corneres.pctIzquierda}</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Peligro (remate/gol)</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {data.corneres.remate + data.corneres.gol}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.corneres.pctPeligro} de los saques</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">Lanzadores habituales de córner</h3>
            {data.corneres.lanzadores.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No hay lanzadores registrados.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {data.corneres.lanzadores.map((l, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs"
                  >
                    <span className="text-white font-medium">{l.jugador}</span>
                    <span className="font-bold font-mono text-amber-400">{l.total} lanzados</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 5: FALTAS ─────────────────────────────────────────────── */}
      {activeTab === 'faltas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Golpes francos totales</div>
              <div className="text-xl font-bold text-white mt-1">{data.faltas.total}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.faltas.promedioFaltas} por partido</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Tiro directo</div>
              <div className="text-xl font-bold text-rose-400 mt-1">{data.faltas.tiros}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.faltas.pctTiros}</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Centro al área</div>
              <div className="text-xl font-bold text-amber-400 mt-1">{data.faltas.centros}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.faltas.pctCentros}</div>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
              <div className="text-xs text-slate-400">Pase en corto</div>
              <div className="text-xl font-bold text-blue-400 mt-1">{data.faltas.pases}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{data.faltas.pctPases}</div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">Ejecutores de faltas</h3>
            {data.faltas.lanzadores.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No hay lanzadores de faltas registrados.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {data.faltas.lanzadores.map((l, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs"
                  >
                    <span className="text-white font-medium">{l.jugador}</span>
                    <span className="font-bold font-mono text-slate-200">{l.total} faltas</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 6: SAQUES DE PUERTA ───────────────────────────────────── */}
      {activeTab === 'saquesPuerta' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400">Saques cortos (&lt;30m)</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {data.saquesPuerta.cortos}{' '}
                <span className="text-sm font-normal text-slate-400">({data.saquesPuerta.pctCortos})</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Salida en corto combinada</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400">Saques medios (30m - 50m)</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {data.saquesPuerta.medios}{' '}
                <span className="text-sm font-normal text-slate-400">({data.saquesPuerta.pctMedios})</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Hacia pivotes / medios</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400">Saques largos (&gt;50m)</div>
              <div className="text-2xl font-bold text-blue-400 mt-1">
                {data.saquesPuerta.largos}{' '}
                <span className="text-sm font-normal text-slate-400">({data.saquesPuerta.pctLargos})</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Juego directo en largo</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 7: SAQUES DE BANDA ────────────────────────────────────── */}
      {activeTab === 'saquesBanda' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400">En campo propio</div>
              <div className="text-2xl font-bold text-white mt-1">
                {data.saquesBanda.campoPropio}{' '}
                <span className="text-sm font-normal text-slate-400">({data.saquesBanda.pctPropio})</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Inicios y desahogos</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400">En campo rival</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {data.saquesBanda.campoRival}{' '}
                <span className="text-sm font-normal text-slate-400">({data.saquesBanda.pctRival})</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Progresión en zona ofensiva</div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400">Generan centro directo</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {data.saquesBanda.generaCentro}{' '}
                <span className="text-sm font-normal text-slate-400">({data.saquesBanda.pctGeneraCentro})</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Saques directos hacia área</div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PESTAÑA 8: SISTEMAS & TITULARES ───────────────────────────────── */}
      {activeTab === 'formaciones' && (
        <div className="space-y-6">
          {/* Sistemas utilizados */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-2">Sistemas tácticos registrados en la muestra</h3>
            <p className="text-xs text-slate-400 mb-4">
              Frecuencia real y jornadas donde {data.targetClubName} inició con cada dibujo estructural.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {data.formaciones.sistemasUsados.map((sys, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Sistema</span>
                    <span className="text-xs font-bold text-[#CC0E21] px-2 py-0.5 rounded bg-[#CC0E21]/10">
                      {sys.pctUso}
                    </span>
                  </div>
                  <div className="text-lg font-extrabold text-white mt-1">{sys.sistema}</div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    {sys.partidosCount} de {data.totalPartidos} partidos ({sys.jornadas.join(', ')})
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selector de alineación por jornada */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Alineación y disposición por jornada
                </h3>
                <p className="text-xs text-slate-400">
                  Selecciona una jornada para consultar la disposición de jugadores sobre el campo.
                </p>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                {data.formaciones.partidosDetalle.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedFormationIdx(idx)}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      selectedFormationIdx === idx
                        ? 'bg-[#CC0E21] text-white shadow-sm'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {p.jornada} · {p.sistemaNombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Ficha de la formación seleccionada */}
            {data.formaciones.partidosDetalle[selectedFormationIdx] && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800/80">
                  <div className="text-xs">
                    <span className="font-bold text-white mr-2">
                      {data.formaciones.partidosDetalle[selectedFormationIdx].jornada} vs{' '}
                      {data.formaciones.partidosDetalle[selectedFormationIdx].rival}
                    </span>
                    <span className="text-slate-400">
                      ({data.formaciones.partidosDetalle[selectedFormationIdx].esLocal ? 'Local' : 'Visitante'})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[#CC0E21] text-xs">
                    Sistema: {data.formaciones.partidosDetalle[selectedFormationIdx].sistemaNombre}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {data.formaciones.partidosDetalle[selectedFormationIdx].formacionCompleta?.ofensiva?.jugadores?.map(
                    (pl, pIdx) => (
                      <div
                        key={pIdx}
                        className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400 bg-slate-950 px-1.5 py-0.5 rounded text-[11px]">
                            {pl.dorsal}
                          </span>
                          <span className="text-slate-200 font-medium truncate max-w-[120px]">
                            {pl.nombreCompleto}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">{pl.posicionEsp || pl.posicionCodigo}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Matriz objetiva de titulares */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-2">Matriz objetiva de titulares en la muestra</h3>
            <p className="text-xs text-slate-400 mb-4">
              Datos registrados exclusivamente a partir de las alineaciones iniciales de los partidos analizados (sin estimaciones ni datos inventados).
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-slate-400 bg-slate-950/80 border-b border-slate-800 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Dorsal</th>
                    <th className="py-2.5 px-3">Jugador</th>
                    <th className="py-2.5 px-3 text-right">Titularidades</th>
                    <th className="py-2.5 px-3 text-right">% Titular</th>
                    <th className="py-2.5 px-3">Posiciones registradas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.formaciones.matrizTitulares.map((pl, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-amber-400">{pl.dorsal}</td>
                      <td className="py-2 px-3 font-semibold text-white">{pl.nombreCompleto}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-200">
                        {pl.titularidades} / {pl.totalPartidos}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-400">
                        {pl.pctTitular}
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {pl.posiciones.length > 0 ? pl.posiciones.join(', ') : 'N/D'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
