'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { usePlayers } from '@/hooks/usePlayers';
import { useEditMode } from '@/context/EditModeContext';
import { GPSSession, GPSData, Player, GPSPlayerMapping } from '@/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { GPSComparisonView } from './GPSComparisonView';
import { 
  Activity, Upload, Calendar, ChevronRight, 
  Trash2, AlertCircle, ArrowUpDown, Award, Lock, CheckCircle2,
  Zap, Gauge, AlertTriangle, HelpCircle, ArrowRightLeft
} from 'lucide-react';

interface Match {
  id: string;
  fecha: string;
  rival: string;
  tipo_partido?: string;
  competicion?: string;
  jornada?: number | null;
  es_local?: boolean;
}

interface ParsedFile {
  filename: string;
  headers: string[];
  rows: Record<string, unknown>[];
  detectedDate?: string | null;
}

interface ColumnMapping {
  player_name: string;
  minutos: string;
  distancia_total: string;
  velocidad_maxima: string;
  hsr: string;
  sprint_distance: string;
  num_sprints: string;
  aceleraciones: string;
  aceleraciones_max: string;
  deceleraciones: string;
  deceleraciones_max: string;
}

interface ParsedGPSRowPayload {
  gps_id: string;
  player_id: string | null;
  minutos: number;
  distancia_total: number;
  hsr: number | null;
  sprint_distance: number | null;
  num_sprints: number | null;
  velocidad_maxima: number | null;
  aceleraciones: number | null;
  aceleraciones_max: number | null;
  deceleraciones: number | null;
  deceleraciones_max: number | null;
  player_load: number | null;
  raw_data: Record<string, unknown>;
}

// Name Normalization helper
function normalizePlayerName(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function GPSClient() {
  const { isEditMode, verifyWritePermission } = useEditMode();
  const { players, loading: loadingPlayers } = usePlayers();
  
  // App States
  const [activeTab, setActiveTab] = useState<'session' | 'compare'>('session');
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [loadingMatches, setLoadingMatches] = useState(true);
  
  const [currentSession, setCurrentSession] = useState<GPSSession | null>(null);
  const [sessionData, setSessionData] = useState<(GPSData & { player?: Player })[]>([]);
  const [allSessions, setAllSessions] = useState<GPSSession[]>([]);
  const [allGpsData, setAllGpsData] = useState<(GPSData & { player?: Player })[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dateMismatchWarning, setDateMismatchWarning] = useState<string | null>(null);

  // Import wizard states
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    player_name: '',
    minutos: '',
    distancia_total: '',
    velocidad_maxima: '',
    hsr: '',
    sprint_distance: '',
    num_sprints: '',
    aceleraciones: '',
    aceleraciones_max: '',
    deceleraciones: '',
    deceleraciones_max: '',
  });
  const [playerMappings, setPlayerMappings] = useState<Record<string, string>>({}); // raw_source_name -> player_id
  const [isSaving, setIsSaving] = useState(false);

  // Sort states
  const [sortField, setSortField] = useState<keyof GPSData | 'm_per_min'>('distancia_total');
  const [sortAsc, setSortAsc] = useState(false);

  // Load list of matches from `matches` table
  const loadMatches = useCallback(async () => {
    setLoadingMatches(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('fecha', { ascending: false });
      
      if (error) throw error;
      const matchRows = data || [];
      setMatches(matchRows);

      if (matchRows.length > 0 && !selectedMatchId) {
        setSelectedMatchId(matchRows[0].id);
      }
    } catch (err) {
      console.error('Error loading matches for GPS:', err);
    } finally {
      setLoadingMatches(false);
    }
  }, [selectedMatchId]);

  // Load session & data for selected match
  const loadSessionForMatch = useCallback(async (matchId: string) => {
    if (!matchId) return;
    setLoadingSession(true);
    setCurrentSession(null);
    setSessionData([]);

    try {
      const { data: sessionRows, error: sessionErr } = await supabase
        .from('gps_sessions')
        .select('*')
        .eq('match_id', matchId)
        .limit(1);

      if (sessionErr) throw sessionErr;

      if (sessionRows && sessionRows.length > 0) {
        const session = sessionRows[0];
        setCurrentSession(session);

        const { data: dataRows, error: dataErr } = await supabase
          .from('gps_data')
          .select('*')
          .eq('session_id', session.id);

        if (dataErr) throw dataErr;

        const mapped = (dataRows || []).map((d: GPSData) => ({
          ...d,
          player: players.find(p => p.id === d.player_id)
        }));
        setSessionData(mapped);
      }
    } catch (err) {
      console.error('Error loading GPS session for match:', err);
    } finally {
      setLoadingSession(false);
    }
  }, [players]);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // Load ALL sessions & data across all matches for Comparison View
  const loadAllSessionsAndData = useCallback(async () => {
    try {
      const { data: sData } = await supabase.from('gps_sessions').select('*');
      const { data: dData } = await supabase.from('gps_data').select('*');
      if (sData) setAllSessions(sData);
      if (dData) {
        const mapped = dData.map((d: GPSData) => ({
          ...d,
          player: players.find(p => p.id === d.player_id)
        }));
        setAllGpsData(mapped);
      }
    } catch (err) {
      console.error('Error loading all GPS data:', err);
    }
  }, [players]);

  useEffect(() => {
    loadAllSessionsAndData();
  }, [loadAllSessionsAndData]);

  useEffect(() => {
    if (selectedMatchId) {
      loadSessionForMatch(selectedMatchId);
    }
  }, [selectedMatchId, loadSessionForMatch]);

  // Force activeTab to 'session' if edit mode is disabled while on 'compare' tab
  useEffect(() => {
    if (!isEditMode && activeTab === 'compare') {
      setActiveTab('session');
    }
  }, [isEditMode, activeTab]);

  const selectedMatch = matches.find(m => m.id === selectedMatchId);

  // Delete session for current match (Edit mode required)
  async function handleDeleteSession() {
    if (!currentSession || !selectedMatch) return;
    
    try {
      verifyWritePermission();
    } catch (err: unknown) {
      const error = err as Error;
      alert(error.message || 'Acceso no autorizado. Activa el Modo Edición.');
      return;
    }

    if (!confirm(`¿Seguro que deseas eliminar los datos GPS cargados para el partido vs ${selectedMatch.rival}?`)) return;

    try {
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
      const { error } = await supabase.rpc('exec_secure_delete', {
        target_table: 'gps_sessions',
        record_id: currentSession.id,
        staff_passkey: passkey
      });
      if (error) throw error;
      
      setCurrentSession(null);
      setSessionData([]);
    } catch (err) {
      console.error('Error deleting session:', err);
      alert('Error al borrar los datos GPS del partido.');
    }
  }

  // Parse Excel (.xlsx) or CSV (.csv)
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setDateMismatchWarning(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!jsonRows || jsonRows.length === 0) {
          setErrorMsg('El archivo no contiene filas de datos procesables.');
          return;
        }

        const headers = Object.keys(jsonRows[0]);
        
        // Detect Date in rows
        let fileDateDetected: string | null = null;
        for (const row of jsonRows) {
          for (const key of Object.keys(row)) {
            if (key.toLowerCase().includes('fecha') || key.toLowerCase().includes('date')) {
              const val = row[key];
              if (val) {
                if (val instanceof Date) {
                  fileDateDetected = val.toISOString().split('T')[0];
                } else {
                  const dateMatch = String(val).match(/\d{4}-\d{2}-\d{2}/) || String(val).match(/\d{2}\/\d{2}\/\d{4}/);
                  if (dateMatch) {
                    fileDateDetected = dateMatch[0];
                  }
                }
              }
            }
          }
          if (fileDateDetected) break;
        }

        // Verify date against selected match
        if (fileDateDetected && selectedMatch) {
          const matchDateFormatted = selectedMatch.fecha;
          if (!fileDateDetected.includes(matchDateFormatted)) {
            setDateMismatchWarning(
              `⚠️ Atención: La fecha detectada en el archivo (${fileDateDetected}) no coincide exactamente con la fecha del partido seleccionado (${selectedMatch.fecha}). Revisa que sea el partido correcto antes de guardar.`
            );
          }
        }

        setParsedFile({
          filename: file.name,
          headers,
          rows: jsonRows,
          detectedDate: fileDateDetected
        });

        // Auto map columns with real PF names
        const mapping = { ...columnMapping };
        headers.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes('nombre del jugador') || lower.includes('jugador') || lower.includes('nombre') || lower.includes('player')) {
            if (!mapping.player_name) mapping.player_name = h;
          }
          if (lower.includes('tiempo de juego') || lower.includes('min') || lower.includes('duracion') || lower.includes('duration')) {
            if (!mapping.minutos) mapping.minutos = h;
          }
          if (lower.includes('dist. recorrida') || lower.includes('distancia') || lower.includes('total distance')) {
            if (!mapping.distancia_total) mapping.distancia_total = h;
          }
          if (lower.includes('vel. max.') || lower.includes('vel. max') || lower.includes('velocidad') || lower.includes('max speed')) {
            if (!mapping.velocidad_maxima) mapping.velocidad_maxima = h;
          }
          if (lower.includes('carreras de alta int. (m)') || lower.includes('alta int. (m)') || lower.includes('hsr')) {
            if (!mapping.hsr) mapping.hsr = h;
          }
          if (lower.includes('carreras de máx. int. (m)') || lower.includes('carreras de max. int. (m)') || lower.includes('max. int. (m)') || lower.includes('sprint distance')) {
            if (!mapping.sprint_distance) mapping.sprint_distance = h;
          }
          if (lower.includes('carreras de máx. int. (#)') || lower.includes('carreras de max. int. (#)') || lower.includes('max. int. (#)') || lower.includes('sprints')) {
            if (!mapping.num_sprints) mapping.num_sprints = h;
          }
          if (lower.includes('ace. alta int. (#)') || lower.includes('ace. alta int (#)') || (lower.includes('ace') && lower.includes('alta'))) {
            if (!mapping.aceleraciones) mapping.aceleraciones = h;
          }
          if (lower.includes('ace. máx. int. (#)') || lower.includes('ace. max. int. (#)') || (lower.includes('ace') && lower.includes('max'))) {
            if (!mapping.aceleraciones_max) mapping.aceleraciones_max = h;
          }
          if (lower.includes('desac. alta int. (#)') || lower.includes('desac. alta int (#)') || (lower.includes('desac') && lower.includes('alta'))) {
            if (!mapping.deceleraciones) mapping.deceleraciones = h;
          }
          if (lower.includes('desac. máx. int. (#)') || lower.includes('desac. max. int. (#)') || (lower.includes('desac') && lower.includes('max'))) {
            if (!mapping.deceleraciones_max) mapping.deceleraciones_max = h;
          }
        });
        setColumnMapping(mapping);
        setImportStep(2);
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Error reading Excel/CSV file:', error);
        setErrorMsg('Error al leer el archivo Excel/CSV: ' + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // Step 3: Player mapping using normalized names & persistent DB mappings
  async function proceedToPlayerMapping() {
    if (!parsedFile) return;
    if (!columnMapping.player_name) {
      setErrorMsg('Debes seleccionar la columna con el Nombre del Jugador.');
      return;
    }

    const rawNames = Array.from(new Set(
      parsedFile.rows
        .map(r => String(r[columnMapping.player_name] || '').trim())
        .filter(name => !!name)
    ));

    // Fetch persistent mappings from Supabase `gps_player_mappings` table
    const dbMappingsMap: Record<string, string> = {};
    try {
      const { data: dbMapRows } = await supabase
        .from('gps_player_mappings')
        .select('*');
      if (dbMapRows) {
        dbMapRows.forEach((row: GPSPlayerMapping) => {
          dbMappingsMap[row.source_name_normalized] = row.player_id;
        });
      }
    } catch (err) {
      console.warn('Could not fetch gps_player_mappings from DB, using fuzzy name match:', err);
    }

    const initialMappings: Record<string, string> = {};
    rawNames.forEach(rawName => {
      const normRaw = normalizePlayerName(rawName);

      // 1. Check persistent DB mapping
      if (dbMappingsMap[normRaw]) {
        initialMappings[rawName] = dbMappingsMap[normRaw];
        return;
      }

      // 2. Fuzzy name matching with plantilla players
      const match = players.find(p => {
        const normFullName = normalizePlayerName(p.nombre + ' ' + (p.apellidos || ''));
        const normReverseName = normalizePlayerName((p.apellidos || '') + ' ' + p.nombre);
        const normFirstName = normalizePlayerName(p.nombre);
        const normLastName = normalizePlayerName(p.apellidos || '');

        return (
          normFullName === normRaw ||
          normReverseName === normRaw ||
          normRaw.includes(normFirstName) ||
          (normLastName.length > 3 && normRaw.includes(normLastName)) ||
          normFullName.includes(normRaw)
        );
      });

      if (match) {
        initialMappings[rawName] = match.id;
      } else {
        initialMappings[rawName] = '';
      }
    });

    setPlayerMappings(initialMappings);
    setErrorMsg(null);
    setImportStep(3);
  }

  // Save Import with full upfront validation BEFORE substitution
  async function handleSaveImport() {
    if (!parsedFile || !selectedMatch) return;
    
    try {
      verifyWritePermission();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || 'Acceso no autorizado. Activa el Modo Edición.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const colNameKey = columnMapping.player_name;
      if (!colNameKey) {
        throw new Error('Columna de Nombre del Jugador no configurada.');
      }

      // --- UPFRONT VALIDATION OF ALL ROWS & PAYLOAD ASSEMBLY ---
      const getNumVal = (row: Record<string, unknown>, colName: string) => {
        if (!colName || row[colName] === undefined || row[colName] === '') return null;
        const val = row[colName];
        if (typeof val === 'number') return isNaN(val) ? null : val;
        const parsed = parseFloat(String(val).replace(/,/g, '.'));
        return isNaN(parsed) ? null : parsed;
      };

      const validPayloads: ParsedGPSRowPayload[] = [];
      for (let i = 0; i < parsedFile.rows.length; i++) {
        const row = parsedFile.rows[i];
        const rawName = String(row[colNameKey] || '').trim();
        if (!rawName) continue;

        const playerIdMapped = playerMappings[rawName] || null;
        const mins = getNumVal(row, columnMapping.minutos) || 90;
        const dist = getNumVal(row, columnMapping.distancia_total);

        if (dist === null) {
          throw new Error(`La fila ${i + 2} (${rawName}) no contiene un valor numérico de Distancia Total válido.`);
        }

        validPayloads.push({
          gps_id: rawName,
          player_id: playerIdMapped,
          minutos: Math.round(mins),
          distancia_total: dist,
          velocidad_maxima: getNumVal(row, columnMapping.velocidad_maxima),
          hsr: getNumVal(row, columnMapping.hsr),
          sprint_distance: getNumVal(row, columnMapping.sprint_distance),
          num_sprints: getNumVal(row, columnMapping.num_sprints) ? Math.round(getNumVal(row, columnMapping.num_sprints)!) : null,
          aceleraciones: getNumVal(row, columnMapping.aceleraciones) ? Math.round(getNumVal(row, columnMapping.aceleraciones)!) : null,
          aceleraciones_max: getNumVal(row, columnMapping.aceleraciones_max) ? Math.round(getNumVal(row, columnMapping.aceleraciones_max)!) : null,
          deceleraciones: getNumVal(row, columnMapping.deceleraciones) ? Math.round(getNumVal(row, columnMapping.deceleraciones)!) : null,
          deceleraciones_max: getNumVal(row, columnMapping.deceleraciones_max) ? Math.round(getNumVal(row, columnMapping.deceleraciones_max)!) : null,
          player_load: null, // Left null as per instructions
          raw_data: row
        });
      }

      if (validPayloads.length === 0) {
        throw new Error('El archivo no contiene registros de jugadores válidos para importar.');
      }

      // --- ALL VALIDATIONS PASSED! INITIATE SAFE SUBSTITUTION ---
      const passkey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';

      // 1. Persist player name mappings in Supabase `gps_player_mappings` table
      for (const rawName of Object.keys(playerMappings)) {
        const pId = playerMappings[rawName];
        if (pId) {
          const normName = normalizePlayerName(rawName);
          await supabase.rpc('exec_secure_upsert', {
            target_table: 'gps_player_mappings',
            payload: {
              source_name: rawName,
              source_name_normalized: normName,
              player_id: pId,
              updated_at: new Date().toISOString()
            },
            conflict_columns: ['source_name_normalized'],
            staff_passkey: passkey
          });
        }
      }

      // 2. Create / Update session in `gps_sessions` preserving match date & readable description
      const matchTypeLabel = selectedMatch.tipo_partido || selectedMatch.competicion || 'PARTIDO';
      const sessionDesc = selectedMatch.jornada 
        ? `J${selectedMatch.jornada}: vs ${selectedMatch.rival} (${matchTypeLabel})`
        : `vs ${selectedMatch.rival} (${matchTypeLabel})`;

      const { data: sessionRes, error: sessionErr } = await supabase.rpc('exec_secure_upsert', {
        target_table: 'gps_sessions',
        payload: {
          id: currentSession?.id || undefined,
          match_id: selectedMatch.id,
          fecha: selectedMatch.fecha,
          descripcion: sessionDesc
        },
        conflict_columns: ['match_id'],
        staff_passkey: passkey
      });

      if (sessionErr) throw sessionErr;
      const targetSessionId = sessionRes.id;

      // 3. If reimporting, clear previous gps_data rows for this session
      if (currentSession) {
        const { data: oldRows } = await supabase
          .from('gps_data')
          .select('id')
          .eq('session_id', targetSessionId);

        if (oldRows && oldRows.length > 0) {
          for (const oldRow of oldRows) {
            await supabase.rpc('exec_secure_delete', {
              target_table: 'gps_data',
              record_id: oldRow.id,
              staff_passkey: passkey
            });
          }
        }
      }

      // 4. Bulk insert new payloads with session_id
      const finalPayloads = validPayloads.map(p => ({
        ...p,
        session_id: targetSessionId
      }));

      const { error: dataErr } = await supabase.rpc('exec_secure_bulk_upsert', {
        target_table: 'gps_data',
        payloads: finalPayloads,
        conflict_columns: null,
        staff_passkey: passkey
      });

      if (dataErr) throw dataErr;

      // 5. Complete & reload
      setIsModalOpen(false);
      resetImportWizard();
      await loadSessionForMatch(selectedMatch.id);

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
    setParsedFile(null);
    setErrorMsg(null);
    setDateMismatchWarning(null);
  }

  // Sort helper
  const handleSort = (field: keyof GPSData | 'm_per_min') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getMetersPerMin = (dist: number, mins: number) => {
    if (!mins || mins <= 0) return 0;
    return Math.round(dist / mins);
  };

  const sortedSessionData = [...sessionData].sort((a, b) => {
    let valA: number | string = 0;
    let valB: number | string = 0;

    if (sortField === 'm_per_min') {
      valA = getMetersPerMin(a.distancia_total, a.minutos);
      valB = getMetersPerMin(b.distancia_total, b.minutos);
    } else if (sortField === 'player_id') {
      valA = a.player?.nombre || '';
      valB = b.player?.nombre || '';
    } else {
      valA = (a[sortField as keyof GPSData] as number | string) || 0;
      valB = (b[sortField as keyof GPSData] as number | string) || 0;
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Calculate Match Leaders
  const getMaxMetricVal = (field: keyof GPSData | 'm_per_min') => {
    if (sessionData.length === 0) return 0;
    if (field === 'm_per_min') {
      return Math.max(...sessionData.map(d => getMetersPerMin(d.distancia_total, d.minutos)));
    }
    return Math.max(...sessionData.map(d => (d[field as keyof GPSData] as number) || 0));
  };

  const maxDist = getMaxMetricVal('distancia_total');
  const maxMetersPerMin = getMaxMetricVal('m_per_min');
  const maxSpeed = getMaxMetricVal('velocidad_maxima');
  const maxSprints = getMaxMetricVal('num_sprints');

  if (loadingPlayers || loadingMatches) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  // Format real match name based on `es_local`
  const getMatchTitle = (m: Match) => {
    return m.es_local ? `Indautxu vs ${m.rival}` : `${m.rival} vs Indautxu`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
            <Activity className="h-8 w-8 text-[#CC0E21]" />
            Rendimiento Físico GPS (Partidos)
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Análisis de rendimiento físico, distancias, intensidad (m/min) y sprints vinculados a un partido.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Edit mode indicator badge */}
          {!isEditMode ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs font-medium">
              <Lock className="h-3.5 w-3.5 text-amber-500" />
              <span>Modo Lectura</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Edición Habilitada</span>
            </div>
          )}

          {/* SINGLE MAIN IMPORT BUTTON ON SCREEN */}
          {isEditMode && (
            <Button 
              variant="primary" 
              onClick={() => { resetImportWizard(); setIsModalOpen(true); }}
              className="flex items-center gap-2 self-start"
              disabled={!selectedMatch}
            >
              <Upload className="h-4 w-4" />
              {currentSession ? 'Reimportar GPS Partido' : 'Importar GPS Partido'}
            </Button>
          )}
        </div>
      </div>

      {/* NAVIGATION SUB-TABS: PARTIDO vs COMPARAR */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('session')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'session'
              ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Activity className="h-4 w-4 text-[#CC0E21]" />
          <span>Detalle de Partido</span>
        </button>

        {isEditMode && (
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'compare'
                ? 'bg-[#CC0E21] text-white shadow-md shadow-red-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>Comparar GPS</span>
            <span className="text-[10px] bg-red-950/60 text-red-200 border border-red-800 rounded px-1.5 py-0.5 ml-1">
              Nuevo
            </span>
          </button>
        )}
      </div>

      {activeTab === 'compare' && isEditMode ? (
        <GPSComparisonView
          matches={matches}
          sessions={allSessions.length > 0 ? allSessions : (currentSession ? [currentSession] : [])}
          gpsDataList={allGpsData.length > 0 ? allGpsData : sessionData}
          players={players}
          selectedMatchId={selectedMatchId}
          onMatchChange={(mId) => setSelectedMatchId(mId)}
        />
      ) : (
        <>
          {/* Match Selector Bar */}
          <div className="p-4 bg-slate-900/50 border border-slate-800/80 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Calendar className="h-5 w-5 text-[#CC0E21] shrink-0" />
          <div className="w-full md:w-96">
            <Select
              label=""
              value={selectedMatchId}
              onChange={(e) => setSelectedMatchId(e.target.value)}
              options={matches.map(m => {
                const labelType = m.tipo_partido || m.competicion || 'PARTIDO';
                const jornadaStr = m.jornada ? ` (J${m.jornada})` : '';
                const formatFecha = new Date(m.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                return {
                  value: m.id,
                  label: `${formatFecha} — ${getMatchTitle(m)}${jornadaStr} [${labelType}]`
                };
              })}
            />
          </div>
        </div>

        {selectedMatch && (
          <div className="flex items-center gap-3 text-xs text-slate-350 bg-slate-950/40 px-3 py-2 border border-slate-850 rounded-xl">
            <span className="font-bold text-slate-200">
              {getMatchTitle(selectedMatch)}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              {new Date(selectedMatch.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#CC0E21]/20 text-[#CC0E21]">
              {selectedMatch.tipo_partido || selectedMatch.competicion || 'PARTIDO'}
            </span>

            {currentSession && isEditMode && (
              <button
                onClick={handleDeleteSession}
                className="ml-2 p-1 text-slate-450 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                title="Eliminar carga GPS de este partido"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {loadingSession ? (
        <div className="p-12 space-y-4">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : !selectedMatch ? (
        <div className="p-12 text-center border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl">
          <p className="text-sm text-slate-400">No hay partidos disponibles en el sistema.</p>
        </div>
      ) : !currentSession ? (
        <div className="p-12 text-center border border-dashed border-slate-800 bg-slate-900/10 rounded-2xl flex flex-col items-center justify-center space-y-3">
          <Activity className="h-10 w-10 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-300">Sin datos GPS cargados para {getMatchTitle(selectedMatch)}</h3>
          <p className="text-xs text-slate-400 max-w-md">
            Este partido no tiene un archivo de rendimiento físico GPS asociado todavía.
            {!isEditMode ? ' Activa el Modo Edición para poder importar el archivo Excel/CSV del partido.' : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Match Leaders Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Distancia Total */}
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

            {/* Intensidad (m/min) */}
            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">Mayor Intensidad</span>
                <Gauge className="h-4 w-4 text-cyan-400" />
              </div>
              <div className="mt-3">
                <span className="text-xl font-black text-slate-100">
                  {maxMetersPerMin > 0 ? `${maxMetersPerMin} m/min` : '-'}
                </span>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <Avatar 
                    src={sessionData.find(d => getMetersPerMin(d.distancia_total, d.minutos) === maxMetersPerMin)?.player?.foto_url || ''} 
                    name={sessionData.find(d => getMetersPerMin(d.distancia_total, d.minutos) === maxMetersPerMin)?.player?.nombre || ''} 
                    size="sm" 
                  />
                  <span className="truncate">{sessionData.find(d => getMetersPerMin(d.distancia_total, d.minutos) === maxMetersPerMin)?.player?.nombre || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Velocidad Máxima */}
            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">Velocidad Máxima</span>
                <Zap className="h-4 w-4 text-amber-500" />
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

            {/* Sprints */}
            <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">Más Sprints</span>
                <Activity className="h-4 w-4 text-blue-500" />
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
          </div>

          {/* Metric Legend Explanation */}
          <div className="p-3 bg-slate-950/30 border border-slate-850 rounded-xl text-[11px] text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-slate-500 shrink-0" />
              <span><strong>Acel. Int. / Decel. Int.:</strong> Acciones clasificadas por el proveedor en zona de alta intensidad.</span>
            </div>
            <div className="flex items-center gap-2">
              <span><strong>Acel. Máx. / Decel. Máx.:</strong> Acciones clasificadas en zona de máxima intensidad.</span>
            </div>
          </div>

          {/* Match Physical Data Table */}
          <div className="border border-slate-800 bg-slate-900/20 rounded-2xl shadow-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-bold uppercase select-none">
                  <th onClick={() => handleSort('player_id')} className="px-4 py-3 cursor-pointer hover:text-slate-100">
                    <div className="flex items-center gap-1">Jugador <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('minutos')} className="px-3 py-3 cursor-pointer hover:text-slate-100">
                    <div className="flex items-center gap-1">Min <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('distancia_total')} className="px-3 py-3 cursor-pointer hover:text-slate-100">
                    <div className="flex items-center gap-1">Distancia (m) <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('m_per_min')} className="px-3 py-3 cursor-pointer hover:text-slate-100">
                    <div className="flex items-center gap-1">m/min <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('hsr')} className="px-3 py-3 cursor-pointer hover:text-slate-100">
                    <div className="flex items-center gap-1">Alta Int. (m) <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('sprint_distance')} className="px-3 py-3 cursor-pointer hover:text-slate-100">
                    <div className="flex items-center gap-1">Sprint/Máx. Int. (m) <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('num_sprints')} className="px-3 py-3 cursor-pointer hover:text-slate-100">
                    <div className="flex items-center gap-1">Nº Sprints <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('velocidad_maxima')} className="px-3 py-3 cursor-pointer hover:text-slate-100">
                    <div className="flex items-center gap-1">Vel. Máx <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('aceleraciones')} className="px-3 py-3 cursor-pointer hover:text-slate-100">
                    <div className="flex items-center gap-1">Acel. Int. <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('aceleraciones_max')} className="px-3 py-3 cursor-pointer hover:text-slate-100">
                    <div className="flex items-center gap-1">Acel. Máx. <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('deceleraciones')} className="px-3 py-3 cursor-pointer hover:text-slate-100">
                    <div className="flex items-center gap-1">Decel. Int. <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                  <th onClick={() => handleSort('deceleraciones_max')} className="px-3 py-3 cursor-pointer hover:text-slate-100">
                    <div className="flex items-center gap-1">Decel. Máx. <ArrowUpDown className="h-3 w-3" /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {sortedSessionData.map((row) => {
                  const mPerMin = getMetersPerMin(row.distancia_total, row.minutos);
                  return (
                    <tr key={row.id} className="hover:bg-slate-800/10 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-200">
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
                            <span className="text-slate-400">{row.gps_id}</span>
                            <span className="text-[10px] text-amber-500 font-bold">No asignado en plantilla</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">{row.minutos} min</td>
                      <td className={`px-3 py-3 font-bold ${row.distancia_total === maxDist ? 'text-green-400' : ''}`}>
                        {row.distancia_total.toLocaleString('es-ES')} m
                      </td>
                      <td className={`px-3 py-3 font-bold ${mPerMin === maxMetersPerMin ? 'text-cyan-400' : 'text-slate-300'}`}>
                        {mPerMin} m/min
                      </td>
                      <td className="px-3 py-3">{row.hsr ? `${row.hsr} m` : '-'}</td>
                      <td className="px-3 py-3">{row.sprint_distance ? `${row.sprint_distance} m` : '-'}</td>
                      <td className={`px-3 py-3 ${row.num_sprints === maxSprints ? 'text-blue-400 font-bold' : ''}`}>
                        {row.num_sprints ?? '-'}
                      </td>
                      <td className={`px-3 py-3 font-bold ${row.velocidad_maxima === maxSpeed ? 'text-amber-400' : ''}`}>
                        {row.velocidad_maxima ? `${row.velocidad_maxima.toFixed(1)} km/h` : '-'}
                      </td>
                      <td className="px-3 py-3">{row.aceleraciones ?? '-'}</td>
                      <td className="px-3 py-3">{row.aceleraciones_max ?? '-'}</td>
                      <td className="px-3 py-3">{row.deceleraciones ?? '-'}</td>
                      <td className="px-3 py-3">{row.deceleraciones_max ?? '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </>
      )}

      {/* Modal Wizard Importador GPS (.xlsx / .csv) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Importar GPS — ${selectedMatch ? getMatchTitle(selectedMatch) : ''}`}>
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {dateMismatchWarning && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{dateMismatchWarning}</span>
          </div>
        )}

        {/* STEP 1: Carga de Archivo Excel (.xlsx) / CSV */}
        {importStep === 1 && selectedMatch && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-950/40 border border-slate-850 rounded-xl text-xs space-y-1">
              <span className="text-slate-400 block font-bold">Partido Objetivo:</span>
              <div className="text-slate-200 font-bold flex items-center gap-2">
                <span>{selectedMatch.fecha}</span> — <span>{getMatchTitle(selectedMatch)}</span>
                <span className="text-[10px] text-[#CC0E21] bg-[#CC0E21]/10 px-2 py-0.5 rounded font-black uppercase">
                  {selectedMatch.tipo_partido || selectedMatch.competicion || 'PARTIDO'}
                </span>
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-700/80 rounded-2xl p-8 text-center bg-slate-950/20 hover:border-[#CC0E21]/50 hover:bg-slate-950/40 transition-all cursor-pointer relative group">
              <input
                type="file"
                accept=".xlsx, .csv, .xls"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
                <Upload className="h-10 w-10 text-slate-500 group-hover:text-[#CC0E21] transition-colors" />
                <span className="text-xs font-bold text-slate-350">Arrastra tu archivo Excel (.xlsx) o CSV del PF aquí</span>
                <span className="text-[10px] text-slate-500">Formato del preparador físico (ej. amistoso 1.xlsx)</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Mapeo de Columnas */}
        {importStep === 2 && parsedFile && (
          <div className="space-y-4">
            <div className="p-2 bg-slate-950/40 border border-slate-850 rounded-xl text-xs text-slate-400 flex justify-between items-center">
              <span>Archivo: <strong>{parsedFile.filename}</strong> ({parsedFile.rows.length} jugadores detectados)</span>
            </div>

            <p className="text-xs text-slate-400 mb-2">
              Empareja las columnas del archivo del preparador físico con los indicadores de Athletic IA.
            </p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {Object.keys(columnMapping).map((dbField) => {
                const key = dbField as keyof ColumnMapping;
                const fieldLabelMap: Record<keyof ColumnMapping, string> = {
                  player_name: 'Nombre del Jugador',
                  minutos: 'Tiempo de Juego (min)',
                  distancia_total: 'Dist. Recorrida (m)',
                  velocidad_maxima: 'Vel. Max. (km/h)',
                  hsr: 'Alta Intensidad (m)',
                  sprint_distance: 'Sprint / Máx. Intensidad (m)',
                  num_sprints: 'Nº Sprints',
                  aceleraciones: 'Aceleraciones Intensas (#)',
                  aceleraciones_max: 'Aceleraciones Máximas (#)',
                  deceleraciones: 'Deceleraciones Intensas (#)',
                  deceleraciones_max: 'Deceleraciones Máximas (#)',
                };
                return (
                  <div key={dbField} className="grid grid-cols-2 gap-3 items-center text-xs">
                    <span className="font-bold text-slate-300">{fieldLabelMap[key]}</span>
                    <Select
                      label=""
                      value={columnMapping[key]}
                      onChange={(e) => setColumnMapping({ ...columnMapping, [key]: e.target.value })}
                      options={[
                        { value: '', label: '-- Ignorar / No Disponible --' },
                        ...parsedFile.headers.map(h => ({ value: h, label: h }))
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

        {/* STEP 3: Mapeo de Jugadores (Por Nombre Normalizado & Memoria en Supabase) */}
        {importStep === 3 && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 mb-2">
              Asigna cada nombre del archivo a un jugador de la plantilla. Los emparejamientos confirmados se recordarán automáticamente en la nube.
            </p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {Object.keys(playerMappings).map((rawName) => (
                <div key={rawName} className="flex items-center justify-between gap-4 p-2 bg-slate-950/40 border border-slate-850 rounded-xl text-xs">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-200 truncate max-w-[170px]">{rawName}</span>
                    <span className="text-[10px] text-slate-500">Nombre en archivo</span>
                  </div>
                  <div className="w-1/2">
                    <Select
                      label=""
                      value={playerMappings[rawName]}
                      onChange={(e) => setPlayerMappings({ ...playerMappings, [rawName]: e.target.value })}
                      options={[
                        { value: '', label: '-- No asignado en plantilla --' },
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
                Guardar e Importar Partido
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
