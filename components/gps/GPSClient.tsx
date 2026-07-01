'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { usePlayers } from '@/hooks/usePlayers';
import { GPSSession, GPSData, Player } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { 
  Activity, Upload, Calendar, ChevronRight, 
  Trash2, AlertCircle, ArrowUpDown, Award
} from 'lucide-react';
import { formatLocalYYYYMMDD } from '@/lib/dateUtils';

interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

interface ColumnMapping {
  gps_id: string;
  minutos: string;
  distancia_total: string;
  hsr: string;
  sprint_distance: string;
  num_sprints: string;
  velocidad_maxima: string;
  aceleraciones: string;
  deceleraciones: string;
  player_load: string;
}

export function GPSClient() {
  const { players, loading: loadingPlayers } = usePlayers();
  
  // App States
  const [sessions, setSessions] = useState<GPSSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<GPSSession | null>(null);
  const [sessionData, setSessionData] = useState<(GPSData & { player?: Player })[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Import wizard states
  const [importStep, setImportStep] = useState<1 | 2 | 3 | 4>(1);
  const [sessionDate, setSessionDate] = useState(formatLocalYYYYMMDD(new Date()));
  const [sessionDesc, setSessionDesc] = useState('');
  const [csvContent, setCsvContent] = useState<ParsedCSV | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    gps_id: '',
    minutos: '',
    distancia_total: '',
    hsr: '',
    sprint_distance: '',
    num_sprints: '',
    velocidad_maxima: '',
    aceleraciones: '',
    deceleraciones: '',
    player_load: '',
  });
  const [playerMappings, setPlayerMappings] = useState<Record<string, string>>({}); // gps_id -> player_id
  const [isSaving, setIsSaving] = useState(false);

  // Sort states
  const [sortField, setSortField] = useState<keyof GPSData>('distancia_total');
  const [sortAsc, setSortAsc] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const { data, error } = await supabase
        .from('gps_sessions')
        .select('*')
        .order('fecha', { ascending: false });
      
      if (error) throw error;
      setSessions(data || []);
      if (data && data.length > 0 && !selectedSession) {
        setSelectedSession(data[0]);
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, [selectedSession]);

  const loadSessionDetails = useCallback(async (sessionId: string) => {
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase
        .from('gps_data')
        .select('*')
        .eq('session_id', sessionId);

      if (error) throw error;
      
      const mapped = (data || []).map((d: GPSData) => ({
        ...d,
        player: players.find(p => p.id === d.player_id)
      }));
      setSessionData(mapped);
    } catch (err) {
      console.error('Error loading session details:', err);
    } finally {
      setLoadingDetails(false);
    }
  }, [players]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (selectedSession) {
      loadSessionDetails(selectedSession.id);
    } else {
      setSessionData([]);
    }
  }, [selectedSession, loadSessionDetails]);

  async function handleDeleteSession(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar esta sesión de GPS y todos sus datos?')) return;

    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase.rpc('exec_secure_delete', {
        target_table: 'gps_sessions',
        record_id: sessionId,
        staff_passkey: passkey
      });
      if (error) throw error;
      
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
      loadSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
      alert('Error al borrar la sesión');
    }
  }

  // --- CSV Parser helper ---
  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) {
        setErrorMsg('El archivo está vacío o no tiene suficientes filas.');
        return;
      }
      
      const separator = text.includes(';') ? ';' : ',';
      const headers = lines[0].split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));
      const rows = lines.slice(1).map(line => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === separator && !inQuotes) {
            values.push(current.trim().replace(/^["']|["']$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim().replace(/^["']|["']$/g, ''));
        return values;
      });

      setCsvContent({ headers, rows });
      setErrorMsg(null);

      // Auto map columns
      const mapping = { ...columnMapping };
      headers.forEach(h => {
        const lower = h.toLowerCase();
        if (lower.includes('device') || lower.includes('dispositivo') || lower.includes('gps id') || lower.includes('id') || lower.includes('player') || lower.includes('jugador') || lower.includes('name') || lower.includes('nombre')) {
          if (!mapping.gps_id) mapping.gps_id = h;
        }
        if (lower.includes('duration') || lower.includes('time') || lower.includes('tiempo') || lower.includes('min') || lower.includes('duracion')) {
          if (!mapping.minutos) mapping.minutos = h;
        }
        if (lower.includes('distance') || lower.includes('distancia') || lower.includes('total distance') || lower.includes('metros') || lower.includes('m')) {
          if (!mapping.distancia_total) mapping.distancia_total = h;
        }
        if (lower.includes('hsr') || lower.includes('high speed') || lower.includes('alta velocidad')) {
          if (!mapping.hsr) mapping.hsr = h;
        }
        if (lower.includes('sprint distance') || lower.includes('distancia sprint') || lower.includes('sprint_dist')) {
          if (!mapping.sprint_distance) mapping.sprint_distance = h;
        }
        if (lower.includes('sprints') || lower.includes('num_sprints') || lower.includes('num sprints')) {
          if (!mapping.num_sprints) mapping.num_sprints = h;
        }
        if (lower.includes('max speed') || lower.includes('top speed') || lower.includes('velocidad maxima') || lower.includes('vel_max') || lower.includes('max_speed')) {
          if (!mapping.velocidad_maxima) mapping.velocidad_maxima = h;
        }
        if (lower.includes('acc') || lower.includes('aceleraciones') || lower.includes('acel')) {
          if (!mapping.aceleraciones) mapping.aceleraciones = h;
        }
        if (lower.includes('dec') || lower.includes('deceleraciones') || lower.includes('decel')) {
          if (!mapping.deceleraciones) mapping.deceleraciones = h;
        }
        if (lower.includes('load') || lower.includes('player load') || lower.includes('carga')) {
          if (!mapping.player_load) mapping.player_load = h;
        }
      });
      setColumnMapping(mapping);
      setImportStep(2); // Avanzar a mapeo de columnas
    };
    reader.readAsText(file);
  }

  // --- Step 3: Run unique GPS IDs parsing and auto-match ---
  function proceedToPlayerMapping() {
    if (!csvContent) return;
    const gpsIdIndex = csvContent.headers.indexOf(columnMapping.gps_id);
    if (gpsIdIndex === -1) {
      setErrorMsg('Debes seleccionar al menos la columna del identificador GPS (Dispositivo).');
      return;
    }

    const uniqueGpsIds = Array.from(new Set(csvContent.rows.map(r => r[gpsIdIndex]).filter(id => !!id)));
    
    // Load existing mappings from LocalStorage
    const saved = localStorage.getItem('indautxu_gps_mappings');
    const existingMappings = saved ? JSON.parse(saved) : {};

    const initialMappings: Record<string, string> = {};
    uniqueGpsIds.forEach(id => {
      // 1. Check localstorage mapping
      if (existingMappings[id]) {
        initialMappings[id] = existingMappings[id];
        return;
      }
      // 2. Fuzzy match with player names
      const match = players.find(p => {
        const idLower = id.toLowerCase();
        return idLower.includes(p.nombre.toLowerCase()) || 
               idLower.includes(p.apellidos.toLowerCase()) ||
               p.nombre.toLowerCase().includes(idLower);
      });
      if (match) {
        initialMappings[id] = match.id;
      } else {
        initialMappings[id] = '';
      }
    });

    setPlayerMappings(initialMappings);
    setErrorMsg(null);
    setImportStep(3); // Avanzar a mapeo de jugadores
  }

  // --- Save everything to Supabase ---
  async function handleSaveImport() {
    if (!csvContent) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      // 1. Create session
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { data: sessionDataRes, error: sessionErr } = await supabase
        .rpc('exec_secure_upsert', {
          target_table: 'gps_sessions',
          payload: {
            fecha: sessionDate,
            descripcion: sessionDesc || null
          },
          conflict_columns: null,
          staff_passkey: passkey
        });

      if (sessionErr) throw sessionErr;
      const newSessionId = sessionDataRes.id;

      // Save mappings in LocalStorage for next time
      localStorage.setItem('indautxu_gps_mappings', JSON.stringify(playerMappings));

      // 2. Parse rows and insert
      const h = csvContent.headers;
      const getVal = (row: string[], colName: string) => {
        const idx = h.indexOf(colName);
        if (idx === -1 || !row[idx]) return null;
        const num = parseFloat(row[idx].replace(/,/g, '.')); // Handle comma decimals
        return isNaN(num) ? null : num;
      };

      const payload = csvContent.rows.map(row => {
        const gpsIdVal = row[h.indexOf(columnMapping.gps_id)];
        if (!gpsIdVal) return null;
        
        const playerIdMapped = playerMappings[gpsIdVal] || null;
        const mins = getVal(row, columnMapping.minutos) || 90; // Default if missing

        return {
          session_id: newSessionId,
          player_id: playerIdMapped || null,
          gps_id: gpsIdVal,
          minutos: Math.round(mins),
          distancia_total: getVal(row, columnMapping.distancia_total) || 0,
          hsr: getVal(row, columnMapping.hsr),
          sprint_distance: getVal(row, columnMapping.sprint_distance),
          num_sprints: getVal(row, columnMapping.num_sprints) ? Math.round(getVal(row, columnMapping.num_sprints)!) : null,
          velocidad_maxima: getVal(row, columnMapping.velocidad_maxima),
          aceleraciones: getVal(row, columnMapping.aceleraciones) ? Math.round(getVal(row, columnMapping.aceleraciones)!) : null,
          deceleraciones: getVal(row, columnMapping.deceleraciones) ? Math.round(getVal(row, columnMapping.deceleraciones)!) : null,
          player_load: getVal(row, columnMapping.player_load),
        };
      }).filter(p => p !== null);

      const { error: dataErr } = await supabase
        .rpc('exec_secure_bulk_upsert', {
          target_table: 'gps_data',
          payloads: payload,
          conflict_columns: null,
          staff_passkey: passkey
        });
      if (dataErr) throw dataErr;

      // Close modal & reload
      setIsModalOpen(false);
      resetImportWizard();
      await loadSessions();
      // Select the new session
      const foundSession = sessions.find(s => s.fecha === sessionDate);
      if (foundSession) {
        setSelectedSession(foundSession);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Error saving GPS import:', error);
      setErrorMsg(error.message || 'Error al guardar los datos del GPS.');
    } finally {
      setIsSaving(false);
    }
  }

  function resetImportWizard() {
    setImportStep(1);
    setCsvContent(null);
    setSessionDesc('');
    setSessionDate(formatLocalYYYYMMDD(new Date()));
    setErrorMsg(null);
  }

  // --- Sort helper ---
  const handleSort = (field: keyof GPSData) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedSessionData = [...sessionData].sort((a, b) => {
    let valA = a[sortField] || 0;
    let valB = b[sortField] || 0;

    // Handle names sorting
    if (sortField as string === 'player_id') {
      valA = a.player?.nombre || '';
      valB = b.player?.nombre || '';
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Highlight session leaders
  const getMaxMetricVal = (field: keyof GPSData) => {
    if (sessionData.length === 0) return 0;
    return Math.max(...sessionData.map(d => (d[field] as number) || 0));
  };

  const maxDist = getMaxMetricVal('distancia_total');
  const maxSpeed = getMaxMetricVal('velocidad_maxima');
  const maxSprints = getMaxMetricVal('num_sprints');
  const maxLoad = getMaxMetricVal('player_load');

  if (loadingPlayers) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            <Activity className="h-8 w-8 text-[#CC0E21]" />
            Rendimiento Físico (GPS)
          </h1>
          <p className="text-slate-400 text-sm">
            Importación y visualización del desgaste físico, distancias, sprints y velocidad punta.
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => { resetImportWizard(); setIsModalOpen(true); }}
          className="flex items-center gap-2 self-start"
        >
          <Upload className="h-4 w-4" />
          Importar Datos GPS
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Sesiones de GPS */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
            <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest mb-3">Sesiones Históricas</h3>
            {loadingSessions ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 text-center border border-dashed border-slate-850 rounded-xl">Sin sesiones registradas.</p>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {sessions.map((session) => (
                  <button
                     key={session.id}
                     onClick={() => setSelectedSession(session)}
                     className={`w-full flex items-center justify-between text-left p-3 rounded-xl border text-xs transition-all duration-200 ${
                       selectedSession?.id === session.id
                         ? 'bg-[#CC0E21]/10 border-[#CC0E21]/30 text-[#CC0E21] font-bold'
                         : 'bg-slate-950/20 border-slate-850 text-slate-350 hover:bg-slate-850/30'
                     }`}
                  >
                     <div className="space-y-1 truncate mr-2">
                       <div className="flex items-center gap-1.5 font-bold text-slate-200">
                         <Calendar className="h-3 w-3 text-slate-450" />
                        {new Date(session.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <span className="text-[10px] text-slate-450 truncate block">
                        {session.descripcion || 'Sin descripción'}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors duration-150"
                      title="Eliminar sesión"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contenido Principal: Datos Físicos */}
        <div className="lg:col-span-3 space-y-6">
          {selectedSession ? (
            <>
              {/* Resumen de Líderes de la Sesión */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Líder de Distancia */}
                <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">Distancia Total</span>
                    <Award className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="mt-3">
                    <span className="text-xl font-black text-slate-100">
                      {maxDist > 0 ? `${(maxDist / 1000).toFixed(2)} km` : '-'}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Avatar 
                        src={sessionData.find(d => d.distancia_total === maxDist)?.player?.foto_url || ''} 
                        name={sessionData.find(d => d.distancia_total === maxDist)?.player?.nombre || ''} 
                        size="sm" 
                      />
                      <span className="truncate">{sessionData.find(d => d.distancia_total === maxDist)?.player?.nombre || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Líder de Velocidad */}
                <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">Velocidad Máxima</span>
                    <Award className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="mt-3">
                    <span className="text-xl font-black text-slate-100">
                      {maxSpeed > 0 ? `${maxSpeed.toFixed(1)} km/h` : '-'}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Avatar 
                        src={sessionData.find(d => d.velocidad_maxima === maxSpeed)?.player?.foto_url || ''} 
                        name={sessionData.find(d => d.velocidad_maxima === maxSpeed)?.player?.nombre || ''} 
                        size="sm" 
                      />
                      <span className="truncate">{sessionData.find(d => d.velocidad_maxima === maxSpeed)?.player?.nombre || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Líder de Sprints */}
                <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">Sprints</span>
                    <Award className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="mt-3">
                    <span className="text-xl font-black text-slate-100">
                      {maxSprints > 0 ? `${maxSprints}` : '-'}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Avatar 
                        src={sessionData.find(d => d.num_sprints === maxSprints)?.player?.foto_url || ''} 
                        name={sessionData.find(d => d.num_sprints === maxSprints)?.player?.nombre || ''} 
                        size="sm" 
                      />
                      <span className="truncate">{sessionData.find(d => d.num_sprints === maxSprints)?.player?.nombre || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Carga del Jugador (Player Load) */}
                <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">Mayor Desgaste</span>
                    <Award className="h-4 w-4 text-purple-500" />
                  </div>
                  <div className="mt-3">
                    <span className="text-xl font-black text-slate-100">
                      {maxLoad > 0 ? maxLoad.toFixed(0) : '-'}
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                      <Avatar 
                        src={sessionData.find(d => d.player_load === maxLoad)?.player?.foto_url || ''} 
                        name={sessionData.find(d => d.player_load === maxLoad)?.player?.nombre || ''} 
                        size="sm" 
                      />
                      <span className="truncate">{sessionData.find(d => d.player_load === maxLoad)?.player?.nombre || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabla Detallada */}
              <div className="border border-slate-800 bg-slate-900/20 rounded-2xl shadow-xl overflow-x-auto">
                {loadingDetails ? (
                  <div className="p-12 space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : sortedSessionData.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-12 text-center">No hay registros cargados en esta sesión.</p>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold uppercase select-none">
                        <th onClick={() => handleSort('player_id')} className="px-5 py-3 cursor-pointer hover:text-slate-100">
                          <div className="flex items-center gap-1">Jugador <ArrowUpDown className="h-3 w-3" /></div>
                        </th>
                        <th onClick={() => handleSort('minutos')} className="px-4 py-3 cursor-pointer hover:text-slate-100">
                          <div className="flex items-center gap-1">Minutos <ArrowUpDown className="h-3 w-3" /></div>
                        </th>
                        <th onClick={() => handleSort('distancia_total')} className="px-4 py-3 cursor-pointer hover:text-slate-100">
                          <div className="flex items-center gap-1">Distancia (m) <ArrowUpDown className="h-3 w-3" /></div>
                        </th>
                        <th onClick={() => handleSort('hsr')} className="px-4 py-3 cursor-pointer hover:text-slate-100">
                          <div className="flex items-center gap-1">HSR (m) <ArrowUpDown className="h-3 w-3" /></div>
                        </th>
                        <th onClick={() => handleSort('sprint_distance')} className="px-4 py-3 cursor-pointer hover:text-slate-100">
                          <div className="flex items-center gap-1">Dist. Sprint <ArrowUpDown className="h-3 w-3" /></div>
                        </th>
                        <th onClick={() => handleSort('num_sprints')} className="px-4 py-3 cursor-pointer hover:text-slate-100">
                          <div className="flex items-center gap-1">Sprints <ArrowUpDown className="h-3 w-3" /></div>
                        </th>
                        <th onClick={() => handleSort('velocidad_maxima')} className="px-4 py-3 cursor-pointer hover:text-slate-100">
                          <div className="flex items-center gap-1">V. Máx <ArrowUpDown className="h-3 w-3" /></div>
                        </th>
                        <th onClick={() => handleSort('player_load')} className="px-4 py-3 cursor-pointer hover:text-slate-100">
                          <div className="flex items-center gap-1">Carga <ArrowUpDown className="h-3 w-3" /></div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {sortedSessionData.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-800/10 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-200">
                            {row.player ? (
                              <div className="flex items-center gap-2">
                                <Avatar src={row.player.foto_url} name={row.player.nombre} size="sm" />
                                <div>
                                  <span className="block">{row.player.nombre} {row.player.apellidos}</span>
                                  <span className="text-[10px] text-slate-500 font-bold">#{row.player.dorsal}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col">
                                <span className="text-slate-500 italic">No asignado</span>
                                <span className="text-[10px] text-slate-500 font-bold">Dispositivo: {row.gps_id}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">{row.minutos} min</td>
                          <td className={`px-4 py-3 font-bold ${row.distancia_total === maxDist ? 'text-green-400' : ''}`}>
                            {row.distancia_total.toLocaleString('es-ES')} m
                          </td>
                          <td className="px-4 py-3">{row.hsr ? `${row.hsr} m` : '-'}</td>
                          <td className="px-4 py-3">{row.sprint_distance ? `${row.sprint_distance} m` : '-'}</td>
                          <td className={`px-4 py-3 ${row.num_sprints === maxSprints ? 'text-blue-400 font-bold' : ''}`}>
                            {row.num_sprints ?? '-'}
                          </td>
                          <td className={`px-4 py-3 font-bold ${row.velocidad_maxima === maxSpeed ? 'text-amber-400' : ''}`}>
                            {row.velocidad_maxima ? `${row.velocidad_maxima.toFixed(1)} km/h` : '-'}
                          </td>
                          <td className={`px-4 py-3 ${row.player_load === maxLoad ? 'text-purple-400 font-bold' : ''}`}>
                            {row.player_load ? row.player_load.toFixed(1) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl flex flex-col items-center justify-center space-y-3">
              <Activity className="h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-400 italic">Ninguna sesión de GPS seleccionada. Haz clic en una en la barra lateral o crea una nueva.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal del Importador GPS */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Importar Sesión de GPS">
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Datos de Sesión y Carga de Archivo */}
        {importStep === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Fecha de la Sesión"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
              <Input
                label="Descripción / Nombre"
                type="text"
                placeholder="Ej. Entreno 14-Junio"
                value={sessionDesc}
                onChange={(e) => setSessionDesc(e.target.value)}
              />
            </div>

            {/* Zona de Drop de Archivo */}
            <div className="border-2 border-dashed border-slate-700/80 rounded-2xl p-8 text-center bg-slate-950/20 hover:border-[#CC0E21]/50 hover:bg-slate-950/40 transition-all cursor-pointer relative group">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <Upload className="h-10 w-10 text-slate-500 group-hover:text-[#CC0E21] transition-colors" />
                <span className="text-xs font-bold text-slate-350">Arrastra tu archivo .csv aquí</span>
                <span className="text-[10px] text-slate-500">O haz clic para explorar tus archivos</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Mapeo de Columnas */}
        {importStep === 2 && csvContent && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 mb-2">
              Empareja las columnas del archivo CSV cargado con las métricas físicas requeridas por la aplicación.
            </p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {Object.keys(columnMapping).map((dbField) => {
                const key = dbField as keyof ColumnMapping;
                return (
                  <div key={dbField} className="grid grid-cols-2 gap-3 items-center text-xs">
                    <span className="font-bold text-slate-300 capitalize">{key.replace('_', ' ')}</span>
                    <Select
                      label=""
                      value={columnMapping[key]}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [key]: e.target.value })}
                      options={[
                        { value: '', label: '-- Ignorar / No Disponible --' },
                        ...csvContent.headers.map(h => ({ value: h, label: h }))
                      ]}
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setImportStep(1)}>Volver</Button>
              <Button variant="primary" onClick={proceedToPlayerMapping} className="flex items-center gap-1">
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Mapeo de Jugadores */}
        {importStep === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 mb-2">
              Asigna a cada dispositivo o identificador de GPS encontrado en el archivo con el jugador correspondiente.
            </p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {Object.keys(playerMappings).map((gpsId) => (
                <div key={gpsId} className="flex items-center justify-between gap-4 p-2 bg-slate-950/40 border border-slate-850 rounded-xl text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-200 truncate max-w-[150px]">{gpsId}</span>
                    <span className="text-[10px] text-slate-500 font-bold">ID Dispositivo</span>
                  </div>
                  <div className="w-1/2">
                    <Select
                      label=""
                      value={playerMappings[gpsId]}
                      onChange={(e) => setPlayerMappings({ ...playerMappings, [gpsId]: e.target.value })}
                      options={[
                        { value: '', label: '-- No asignado / Invitado --' },
                        ...players.map(p => ({ value: p.id, label: `${p.nombre} ${p.apellidos || ''} (#${p.dorsal})` }))
                      ]}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setImportStep(2)}>Volver</Button>
              <Button variant="primary" onClick={handleSaveImport} loading={isSaving}>
                Guardar e Importar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
