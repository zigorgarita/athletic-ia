'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, ABPPlay, Match, MatchABPPlan, MatchABPPlayerAssignment } from '@/types';
import { Button } from '@/components/ui/Button';

import { Skeleton } from '@/components/ui/Skeleton';
import { Calendar, Trash2, ArrowUp, ArrowDown, Check, UserCheck, Copy, X, FolderOpen, AlertCircle,  } from 'lucide-react';

import { ABPPlanField } from './ABPPlanField';
import { exportABPPlanToPDF } from '@/lib/exportPdf';

interface ABPPlanPartidoProps {
  players: Player[];
  matches: Match[];
  onExit: () => void;
}

export function ABPPlanPartido({ players, matches, onExit }: ABPPlanPartidoProps) {
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [matchAbpPlans, setMatchAbpPlans] = useState<MatchABPPlan[]>([]);
  const [matchAbpRoles, setMatchAbpRoles] = useState<MatchABPPlayerAssignment[]>([]);
  const [matchLineupPlayerIds, setMatchLineupPlayerIds] = useState<string[]>([]);
  
  const [libraryPlays, setLibraryPlays] = useState<ABPPlay[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load Library Plays
  useEffect(() => {
    const fetchLibrary = async () => {
      const { data } = await supabase.from('abp_plays').select('*').order('created_at', { ascending: false });
      if (data) setLibraryPlays(data);
    };
    fetchLibrary();
  }, []);

  // Load plans when match changes
  const loadMatchPlans = useCallback(async () => {
    if (!selectedMatchId) {
      setMatchAbpPlans([]);
      setMatchAbpRoles([]);
      setMatchLineupPlayerIds([]);
      return;
    }
    
    setLoading(true);
    try {
      const matchQueryId = selectedMatchId === 'draft' ? null : selectedMatchId;
      
      let query = supabase
        .from('match_abp_plans')
        .select('*, abp_play:abp_plays(*)')
        .order('orden', { ascending: true });
        
      if (matchQueryId) {
        query = query.eq('match_id', matchQueryId);
      } else {
        query = query.is('match_id', null);
      }

      const { data: plansData, error: plansError } = await query;
        
      if (plansError) throw plansError;
      setMatchAbpPlans(plansData || []);
      
      if (plansData && plansData.length > 0) {
        const { data: rolesData, error: rolesError } = await supabase
          .from('match_abp_player_assignments')
          .select('*, role:abp_player_roles(*)')
          .in('match_abp_plan_id', plansData.map(p => p.id));
          
        if (rolesError) throw rolesError;
        setMatchAbpRoles(rolesData || []);
      } else {
        setMatchAbpRoles([]);
      }
      
      // Load tactical lineup if it's a real match
      if (matchQueryId) {
        const { data: lineupData } = await supabase
          .from('tactical_lineups')
          .select('posiciones')
          .eq('match_id', matchQueryId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (lineupData && lineupData.posiciones) {
          let pIds: string[] = [];
          const pos = lineupData.posiciones;
          if (Array.isArray(pos)) pIds = pos.filter((p: { player_id?: string }) => p.player_id).map((p: { player_id?: string }) => p.player_id as string);
          else if (pos.propio && Array.isArray(pos.propio)) pIds = pos.propio.filter((p: { player_id?: string }) => p.player_id).map((p: { player_id?: string }) => p.player_id as string);
          setMatchLineupPlayerIds(pIds);
        } else {
          setMatchLineupPlayerIds([]);
        }
      } else {
        setMatchLineupPlayerIds([]);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error al cargar el plan de partido.');
    } finally {
      setLoading(false);
    }
  }, [selectedMatchId]);

  useEffect(() => {
    loadMatchPlans();
  }, [loadMatchPlans]);

  const selectedMatch = matches.find(m => m.id === selectedMatchId);
  const isDraft = selectedMatchId === 'draft';

  const handleAddPlay = async (playId: string) => {
    if (!selectedMatchId) return;
    try {
      setLoading(true);
      // 1. Get play roles to create empty assignments
      const { data: roles } = await supabase.from('abp_player_roles').select('*').eq('abp_play_id', playId);
      
      // 2. Create Plan
      const newOrder = matchAbpPlans.length + 1;
      const { data: plan, error: planError } = await supabase
        .from('match_abp_plans')
        .insert([{
           match_id: isDraft ? null : selectedMatchId,
           abp_play_id: playId,
           orden: newOrder
        }])
        .select()
        .single();
        
      if (planError) throw planError;
      
      // 3. Create Empty Assignments
      if (roles && roles.length > 0) {
        const assignments = roles.map(r => ({
          match_abp_plan_id: plan.id,
          abp_player_role_id: r.id,
          player_id: null
        }));
        await supabase.from('match_abp_player_assignments').insert(assignments);
      }
      
      setSuccessMsg('Jugada añadida al plan correctamente.');
      loadMatchPlans();
    } catch(e: unknown) {
      setErrorMsg('Error al añadir la jugada: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlayer = async (planId: string, roleId: string, playerId: string) => {
    try {
      const { error } = await supabase
        .from('match_abp_player_assignments')
        .update({ player_id: playerId })
        .match({ match_abp_plan_id: planId, abp_player_role_id: roleId });
      
      if (error) throw error;
      
      setMatchAbpRoles(prev => prev.map(r => 
        (r.match_abp_plan_id === planId && r.abp_player_role_id === roleId) 
          ? { ...r, player_id: playerId } 
          : r
      ));
    } catch(e: unknown) {
      setErrorMsg('Error al asignar jugador: ' + (e as Error).message);
    }
  };

  const handleRemovePlayer = async (planId: string, roleId: string) => {
    try {
      const { error } = await supabase
        .from('match_abp_player_assignments')
        .update({ player_id: null })
        .match({ match_abp_plan_id: planId, abp_player_role_id: roleId });
      
      if (error) throw error;
      
      setMatchAbpRoles(prev => prev.map(r => 
        (r.match_abp_plan_id === planId && r.abp_player_role_id === roleId) 
          ? { ...r, player_id: null } 
          : r
      ));
    } catch(e: unknown) {
      setErrorMsg('Error al quitar jugador: ' + (e as Error).message);
    }
  };

  const handleAutoAssignTitulares = async () => {
    if (matchLineupPlayerIds.length === 0) return;
    setLoading(true);
    
    try {
      // Create a pool of available titulares
      let availableTitulares = [...matchLineupPlayerIds];
      
      // Updates to perform
      const updates = [];
      const newRolesState = [...matchAbpRoles];
      
      // Iterate over every role in every plan
      for (let i = 0; i < newRolesState.length; i++) {
        const role = newRolesState[i];
        
        // If it already has a player and that player is a titular, remove them from available pool
        if (role.player_id && availableTitulares.includes(role.player_id)) {
          availableTitulares = availableTitulares.filter(id => id !== role.player_id);
          continue;
        }
        
        // If it doesn't have a player or has a non-titular, and we still have titulares
        if (!role.player_id && availableTitulares.length > 0) {
          const playerId = availableTitulares.shift(); // Take first available
          if (playerId) {
            role.player_id = playerId;
            updates.push({
              match_abp_plan_id: role.match_abp_plan_id,
              abp_player_role_id: role.abp_player_role_id,
              player_id: playerId
            });
          }
        }
      }
      
      // Execute all updates sequentially (or could be a bulk upsert if PK was just ID)
      // The table has unique constraint on (match_abp_plan_id, abp_player_role_id)
      for (const update of updates) {
        await supabase
          .from('match_abp_player_assignments')
          .update({ player_id: update.player_id })
          .match({ match_abp_plan_id: update.match_abp_plan_id, abp_player_role_id: update.abp_player_role_id });
      }
      
      setMatchAbpRoles(newRolesState);
      setSuccessMsg(`Autocompletado con éxito. Quedan ${availableTitulares.length} titulares sin asignar.`);
    } catch (e: unknown) {
      setErrorMsg('Error en autoasignación: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveOrder = async (planId: string, direction: 'up' | 'down') => {
    const currentIndex = matchAbpPlans.findIndex(p => p.id === planId);
    if (currentIndex < 0) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === matchAbpPlans.length - 1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const currentPlan = matchAbpPlans[currentIndex];
    const targetPlan = matchAbpPlans[targetIndex];
    
    // Swap order values
    const currentOrder = currentPlan.orden;
    const targetOrder = targetPlan.orden;
    
    try {
      setLoading(true);
      await supabase.from('match_abp_plans').update({ orden: targetOrder }).eq('id', currentPlan.id);
      await supabase.from('match_abp_plans').update({ orden: currentOrder }).eq('id', targetPlan.id);
      
      await loadMatchPlans();
    } catch(e: unknown) {
      setErrorMsg('Error al reordenar: ' + (e as Error).message);
      setLoading(false);
    }
  };

  const handleRemovePlan = async (planId: string) => {
    if (!confirm('¿Seguro que quieres quitar esta jugada del plan?')) return;
    try {
      setLoading(true);
      await supabase.from('match_abp_plans').delete().eq('id', planId);
      await loadMatchPlans();
    } catch(e: unknown) {
      setErrorMsg('Error al borrar plan: ' + (e as Error).message);
      setLoading(false);
    }
  };

  const handleCloneToIndependent = async (planId: string, playId: string) => {
    if (!confirm('¿Convertir en jugada independiente? Se creará una copia en la biblioteca que podrás modificar sin afectar a la original.')) return;
    try {
      setLoading(true);
      
      // 1. Get original play
      const { data: originalPlay, error: pErr } = await supabase.from('abp_plays').select('*').eq('id', playId).single();
      if (pErr) throw pErr;
      
      // 2. Clone play
      const newPlayData = { ...originalPlay };
      delete newPlayData.id;
      delete newPlayData.created_at;
      newPlayData.titulo = `${originalPlay.titulo} (Copia Jornada)`;
      
      const { data: newPlay, error: newPlayErr } = await supabase.from('abp_plays').insert([newPlayData]).select().single();
      if (newPlayErr) throw newPlayErr;
      
      // 3. Clone original roles mapping to new play
      const { data: originalRoles } = await supabase.from('abp_player_roles').select('*').eq('abp_play_id', playId);
      
      let newRoles = [];
      if (originalRoles && originalRoles.length > 0) {
         const rolesToInsert = originalRoles.map(r => {
           const nr = { ...r };
           delete nr.id;
           delete nr.created_at;
           nr.abp_play_id = newPlay.id;
           return nr;
         });
         const { data: insertedRoles, error: rolesErr } = await supabase.from('abp_player_roles').insert(rolesToInsert).select();
         if (rolesErr) throw rolesErr;
         newRoles = insertedRoles;
      }
      
      // 4. Get current assignments for this plan
      const currentAssignments = matchAbpRoles.filter(r => r.match_abp_plan_id === planId);
      
      // 5. Delete old assignments
      await supabase.from('match_abp_player_assignments').delete().eq('match_abp_plan_id', planId);
      
      // 6. Update plan to point to new play_id
      await supabase.from('match_abp_plans').update({ abp_play_id: newPlay.id }).eq('id', planId);
      
      // 7. Create new assignments pointing to the new roles, preserving player_id
      if (newRoles.length > 0) {
         const newAssignments = newRoles.map(nr => {
            // Find which player was assigned to the old role with the same orden/etiqueta
            const oldRole = originalRoles?.find(or => or.orden === nr.orden && or.rol_asignado === nr.rol_asignado);
            const oldAssignment = oldRole ? currentAssignments.find(ca => ca.abp_player_role_id === oldRole.id) : null;
            return {
               match_abp_plan_id: planId,
               abp_player_role_id: nr.id,
               player_id: oldAssignment ? oldAssignment.player_id : null
            };
         });
         await supabase.from('match_abp_player_assignments').insert(newAssignments);
      }
      
      setSuccessMsg('Jugada convertida en independiente correctamente.');
      await loadMatchPlans();
    } catch (e: unknown) {
      setErrorMsg('Error al convertir jugada: ' + (e as Error).message);
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (matchAbpPlans.length === 0) {
      setErrorMsg('No hay jugadas en el plan para exportar.');
      return;
    }
    
    setLoading(true);
    try {
      const plays = matchAbpPlans.map(plan => {
        const p = plan.abp_play;
        return {
          fieldElementId: `abp-plan-field-${plan.id}`,
          playName: p?.titulo || 'Sin título',
          tipoABP: p?.tipo || 'Desconocido',
          instrucciones: plan.observaciones || ''
        };
      });
      
      const fileName = isDraft ? 'Borrador_Plan_ABP.pdf' : `J${selectedMatch?.jornada}_${selectedMatch?.rival}_ABP.pdf`.replace(/ /g, '_');
      
      await exportABPPlanToPDF({
        filename: fileName,
        matchInfo: {
          jornada: isDraft ? 'draft' : (selectedMatch?.jornada || ''),
          rival: selectedMatch?.rival || '',
          fecha: selectedMatch?.fecha ? new Date(selectedMatch.fecha).toLocaleDateString('es-ES') : '',
          competicion: 'Liga',
          equipo: 'Indautxu 26/27'
        },
        plays: plays
      });
      
      setSuccessMsg('PDF multipágina generado correctamente.');
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Error al exportar PDF: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mensajes */}
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs flex items-center gap-2">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-300"><X className="h-4 w-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl text-xs flex items-center gap-2">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="ml-auto text-green-400 hover:text-green-300"><X className="h-4 w-4" /></button>
        </div>
      )}
      
      {/* Cabecera y Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
        <div>
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#CC0E21]" />
            Plan ABP del Partido
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Selecciona una jornada para organizar sus jugadas de estrategia.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <select 
            value={selectedMatchId} 
            onChange={(e) => setSelectedMatchId(e.target.value)}
            className="flex-1 md:w-64 bg-slate-900 border border-slate-700 text-sm rounded-xl px-3 py-2 text-slate-200"
          >
            <option value="">-- Seleccionar Jornada --</option>
            <option value="draft">Borrador (Sin partido)</option>
            {matches.map(m => {
              const partidoType = m.tipo_partido === 'AMISTOSO' ? 'Amistoso' : 'Liga';
              return (
                <option key={m.id} value={m.id}>
                  Jornada {m.jornada} - {partidoType} vs {m.rival}
                </option>
              );
            })}
          </select>
          <Button variant="secondary" onClick={onExit}>
            <FolderOpen className="h-4 w-4 mr-2" /> Biblioteca
          </Button>
        </div>
      </div>

      {/* Info de la Jornada */}
      {(selectedMatch || isDraft) && (
        <div className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
             <div>
               <h4 className="font-bold text-slate-200 text-sm">
                 {isDraft ? 'Modo Borrador' : `Jornada ${selectedMatch?.jornada} vs ${selectedMatch?.rival}`}
               </h4>
               {!isDraft && (
                 <p className="text-xs text-slate-400 mt-1">
                   Competición: {selectedMatch?.tipo_partido === 'AMISTOSO' ? 'Amistoso' : 'Liga'} | Fecha: {new Date(selectedMatch?.fecha || '').toLocaleDateString('es-ES')}
                 </p>
               )}
             </div>
             
             {!isDraft && matchLineupPlayerIds.length === 0 && (
               <div className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl text-xs flex items-center gap-2">
                 <AlertCircle className="h-4 w-4" />
                 No existe un once inicial guardado para esta jornada
               </div>
             )}
             {!isDraft && matchLineupPlayerIds.length > 0 && (
               <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs flex items-center gap-2">
                 <Check className="h-4 w-4" />
                 Once inicial disponible ({matchLineupPlayerIds.length} jugadores)
               </div>
             )}
          </div>

          <div className="flex gap-2">
             <select 
               className="flex-1 max-w-sm bg-slate-900 border border-slate-700 text-sm rounded-xl px-3 py-2 text-slate-200"
               onChange={(e) => handleAddPlay(e.target.value)}
               value=""
             >
               <option value="">+ Añadir jugada de la Biblioteca...</option>
               {libraryPlays.map(p => (
                 <option key={p.id} value={p.id}>{p.tipo} - {p.titulo}</option>
               ))}
             </select>
             
              <Button 
               variant="secondary" 
               disabled={!isDraft && matchLineupPlayerIds.length === 0}
               onClick={handleAutoAssignTitulares}
             >
               <UserCheck className="h-4 w-4 mr-2" /> Autoasignar Titulares
             </Button>
             
             <Button
               className="bg-red-600 hover:bg-red-700 text-white"
               disabled={matchAbpPlans.length === 0 || loading}
               onClick={handleExportPDF}
             >
               <Copy className="h-4 w-4 mr-2" /> Exportar Plan a PDF
             </Button>
          </div>
        </div>
      )}

      {/* Lista de ABPs del Plan */}
      {(selectedMatchId) && (
        <div className="space-y-4">
          {loading ? (
             <Skeleton className="h-32 w-full rounded-2xl" />
          ) : matchAbpPlans.length === 0 ? (
            <div className="text-center text-slate-400 p-8 border border-dashed border-slate-700 rounded-2xl">
              <p>No hay jugadas asignadas a este plan.</p>
            </div>
          ) : (
            matchAbpPlans.map((plan, index) => {
              const play = plan.abp_play;
              
              // Prepare roles for the field
              const planRoles = matchAbpRoles
                .filter(r => r.match_abp_plan_id === plan.id)
                .map(r => {
                   // eslint-disable-next-line @typescript-eslint/no-explicit-any
                   const originalRole = r.role || ({} as any);
                   return {
                     ...originalRole,
                     assignment: r,
                     assignedPlayer: players.find(p => p.id === r.player_id)
                   };
                });

              return (
                <div key={plan.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-4">
                     <div className="flex items-center gap-3">
                       <div className="bg-slate-800 p-2 rounded-xl text-slate-400 font-bold text-xs w-8 h-8 flex items-center justify-center">
                         {index + 1}
                       </div>
                       <div>
                         <h4 className="font-bold text-slate-200 text-sm">{play?.titulo || 'Sin título'}</h4>
                         <p className="text-xs text-slate-400">{play?.tipo} | {play?.zona}</p>
                       </div>
                     </div>
                     <div className="flex items-center gap-2">
                        <Button variant="ghost"  title="Subir orden" disabled={index === 0} onClick={() => handleMoveOrder(plan.id, 'up')}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost"  title="Bajar orden" disabled={index === matchAbpPlans.length - 1} onClick={() => handleMoveOrder(plan.id, 'down')}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-6 bg-slate-800 mx-1"></div>
                        <Button variant="ghost" title="Convertir en independiente" className="text-blue-400 hover:text-blue-300" onClick={() => handleCloneToIndependent(plan.id, play?.id as string)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" title="Eliminar del plan" className="text-red-400 hover:text-red-300" onClick={() => handleRemovePlan(plan.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                     </div>
                  </div>
                  
                  <div className="mt-4" id={`abp-plan-field-${plan.id}`}>
                     <ABPPlanField 
                       planId={plan.id}
                       tipo={play?.tipo || ''}
                       zona={play?.zona || null}
                       roles={planRoles}
                       players={players}
                       lineupPlayerIds={matchLineupPlayerIds}
                       onAssignPlayer={(roleId, playerId) => handleAssignPlayer(plan.id, roleId, playerId)}
                       onRemovePlayer={(roleId) => handleRemovePlayer(plan.id, roleId)}
                     />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
