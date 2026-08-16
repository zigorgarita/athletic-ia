'use client';

import React, { useState, useEffect } from 'react';
import { Player, PlayerPhysicalTest, PlayerBodyMeasurement } from '@/types';
import { Activity, Ruler, History } from 'lucide-react';

interface PlayerDatosPFTabProps {
  player: Player;
}

const TEST_LABELS: Record<string, string> = {
  yoyo: 'Yo-Yo Test',
  sprint_curvo_derecho: 'Sprint Curvo D.',
  sprint_curvo_izquierdo: 'Sprint Curvo I.',
  sprint_lineal: 'Sprint Lineal',
  illinois: 'Illinois',
  saltabilidad: 'Saltabilidad',
};

const ORDERED_TEST_TYPES: Array<keyof typeof TEST_LABELS> = [
  'yoyo',
  'sprint_curvo_derecho',
  'sprint_curvo_izquierdo',
  'sprint_lineal',
  'illinois',
  'saltabilidad',
];

export function PlayerDatosPFTab({ player }: PlayerDatosPFTabProps) {
  const [tests, setTests] = useState<PlayerPhysicalTest[]>([]);
  const [measurements, setMeasurements] = useState<PlayerBodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para selector de histórico
  const [selectedTestPeriod, setSelectedTestPeriod] = useState<string>('');
  const [selectedMedPeriod, setSelectedMedPeriod] = useState<string>('');
  const [showTestHistoryModal, setShowTestHistoryModal] = useState(false);
  const [showMedHistoryModal, setShowMedHistoryModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadDatosPF() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/datos-pf?playerId=${player.id}`);
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Se requiere inicio de sesión del cuerpo técnico para ver estos datos.');
          }
          throw new Error('Error al cargar datos del preparador físico.');
        }
        const data = await res.json();
        if (isMounted) {
          const testList: PlayerPhysicalTest[] = data.tests || [];
          const medList: PlayerBodyMeasurement[] = data.measurements || [];
          setTests(testList);
          setMeasurements(medList);

          // Inicializar con el período más reciente
          if (testList.length > 0) {
            const periods = Array.from(new Set(testList.map((t) => t.periodo)));
            setSelectedTestPeriod(periods[0] || '');
          }
          if (medList.length > 0) {
            const periods = Array.from(new Set(medList.map((m) => m.periodo)));
            setSelectedMedPeriod(periods[0] || '');
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al obtener datos';
        if (isMounted) setError(msg);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDatosPF();
    return () => {
      isMounted = false;
    };
  }, [player.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800" />
        <div className="h-56 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-900/40 rounded-2xl text-center text-xs text-red-400">
        {error}
      </div>
    );
  }

  // Agrupar tests por período
  const testPeriods = Array.from(new Set(tests.map((t) => t.periodo)));
  const currentTests = tests.filter((t) => t.periodo === selectedTestPeriod);

  // Mapa de tests para el período seleccionado
  const testMap: Record<string, PlayerPhysicalTest> = {};
  currentTests.forEach((t) => {
    testMap[t.test_type] = t;
  });

  // Mediciones del período seleccionado
  const medPeriods = Array.from(new Set(measurements.map((m) => m.periodo)));
  const currentMed = measurements.find((m) => m.periodo === selectedMedPeriod) || measurements[0];

  return (
    <div className="space-y-6">
      {/* 1. SECCIÓN: TESTS FÍSICOS */}
      <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Tests Físicos</h3>
              <p className="text-[11px] text-slate-400">
                {selectedTestPeriod ? `Período: ${selectedTestPeriod}` : 'Sin registros'}
              </p>
            </div>
          </div>

          {testPeriods.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400">Toma:</label>
              <select
                value={selectedTestPeriod}
                onChange={(e) => setSelectedTestPeriod(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs px-2.5 py-1.5 rounded-xl text-slate-200 outline-none"
              >
                {testPeriods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {tests.length > 0 && (
            <button
              onClick={() => setShowTestHistoryModal(true)}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors px-2.5 py-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-750"
            >
              <History className="h-3 w-3" />
              Historial ({testPeriods.length})
            </button>
          )}
        </div>

        {tests.length === 0 ? (
          <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
            Sin tests físicos registrados para este jugador.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ORDERED_TEST_TYPES.map((typeKey) => {
              const testItem = testMap[typeKey];
              const hasVal = testItem && testItem.valor !== null && testItem.valor !== undefined;

              return (
                <div
                  key={typeKey}
                  className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between"
                >
                  <span className="text-[11px] text-slate-400 font-medium">
                    {TEST_LABELS[typeKey]}
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    {hasVal ? (
                      <span className="text-base font-bold text-slate-100 font-mono">
                        {testItem.valor_origen || testItem.valor}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-600 font-medium">Sin dato</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. SECCIÓN: MEDICIONES CORPORALES */}
      <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Ruler className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Mediciones Corporales</h3>
              <p className="text-[11px] text-slate-400">
                {currentMed ? `Período: ${currentMed.periodo}` : 'Sin registros'}
              </p>
            </div>
          </div>

          {medPeriods.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400">Toma:</label>
              <select
                value={selectedMedPeriod}
                onChange={(e) => setSelectedMedPeriod(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs px-2.5 py-1.5 rounded-xl text-slate-200 outline-none"
              >
                {medPeriods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {measurements.length > 0 && (
            <button
              onClick={() => setShowMedHistoryModal(true)}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors px-2.5 py-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-750"
            >
              <History className="h-3 w-3" />
              Historial ({measurements.length})
            </button>
          )}
        </div>

        {!currentMed ? (
          <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
            Sin mediciones corporales registradas para este jugador.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bloque Composición General */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-medium">Peso (Toma)</span>
                <p className="mt-1 text-base font-bold text-slate-100 font-mono">
                  {currentMed.peso !== null ? `${currentMed.peso} kg` : <span className="text-xs text-slate-600 font-normal">Sin dato</span>}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-medium">IMC</span>
                <p className="mt-1 text-base font-bold text-slate-100 font-mono">
                  {currentMed.imc !== null ? currentMed.imc : <span className="text-xs text-slate-600 font-normal">Sin dato</span>}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 font-medium">Grasa Corporal</span>
                <p className="mt-1 text-base font-bold text-slate-100 font-mono">
                  {currentMed.grasa_corporal !== null ? currentMed.grasa_corporal : <span className="text-xs text-slate-600 font-normal">Sin dato</span>}
                </p>
              </div>
            </div>

            {/* Bloque Pliegues Corporales */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Pliegues Corporales
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: 'Tríceps', val: currentMed.triceps },
                  { label: 'Subescapular', val: currentMed.subescapular },
                  { label: 'Suprailiaco', val: currentMed.suprailiaco },
                  { label: 'Abdominal', val: currentMed.abdominal },
                  { label: 'Cuádriceps', val: currentMed.cuadriceps },
                  { label: 'Bíceps', val: currentMed.biceps },
                  { label: 'Gemelo', val: currentMed.gemelo },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 flex justify-between items-center"
                  >
                    <span className="text-[11px] text-slate-400">{item.label}</span>
                    <span className="text-xs font-bold text-slate-200 font-mono">
                      {item.val !== null ? item.val : <span className="text-slate-600 font-normal">Sin dato</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Simple Histórico de Tests */}
      {showTestHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <History className="h-4 w-4 text-blue-400" />
                Historial de Tests Físicos ({player.nombre} {player.apellidos})
              </h4>
              <button
                onClick={() => setShowTestHistoryModal(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                ✕
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-3">
              {testPeriods.map((per) => {
                const perTests = tests.filter((t) => t.periodo === per);
                return (
                  <div key={per} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                    <p className="text-xs font-bold text-blue-400">{per}</p>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      {perTests.map((t) => (
                        <div key={t.id} className="text-slate-300">
                          <span className="text-slate-500 block">{TEST_LABELS[t.test_type] || t.test_type}:</span>
                          <span className="font-bold font-mono">{t.valor_origen || t.valor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Simple Histórico de Mediciones */}
      {showMedHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <History className="h-4 w-4 text-emerald-400" />
                Historial de Mediciones Corporales ({player.nombre} {player.apellidos})
              </h4>
              <button
                onClick={() => setShowMedHistoryModal(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                ✕
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-3">
              {measurements.map((m) => (
                <div key={m.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-emerald-400">{m.periodo}</span>
                    <span className="text-slate-300 font-mono">
                      {m.peso ? `${m.peso} kg` : 'Sin peso'}
                      {m.grasa_corporal ? ` | Grasa: ${m.grasa_corporal}` : ''}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-300">
                    <div><span className="text-slate-500">Tríc:</span> {m.triceps ?? '-'}</div>
                    <div><span className="text-slate-500">Subs:</span> {m.subescapular ?? '-'}</div>
                    <div><span className="text-slate-500">Supr:</span> {m.suprailiaco ?? '-'}</div>
                    <div><span className="text-slate-500">Abdom:</span> {m.abdominal ?? '-'}</div>
                    <div><span className="text-slate-500">Cuad:</span> {m.cuadriceps ?? '-'}</div>
                    <div><span className="text-slate-500">Bíc:</span> {m.biceps ?? '-'}</div>
                    <div><span className="text-slate-500">Gem:</span> {m.gemelo ?? '-'}</div>
                    <div><span className="text-slate-500">IMC:</span> {m.imc ?? '-'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
