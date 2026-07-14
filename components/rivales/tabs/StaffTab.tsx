'use client';
import React, { useState, useMemo } from 'react';
import { ClubSeason } from '@/hooks/useClubs';
import { useClubStaff, ClubStaff } from '@/hooks/useClubStaff';
import { useEditMode } from '@/context/EditModeContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { UserCheck, Plus, Trash2, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

interface StaffTabProps {
  season: ClubSeason | null;
}

const ROLES = [
  'Entrenador',
  'Segundo entrenador',
  'Preparador físico',
  'Entrenador de porteros',
  'Analista',
  'Delegado',
  'Otro'
];

// Helper to sort roles logically
const getRoleWeight = (rol: string) => {
  switch (rol) {
    case 'Entrenador': return 1;
    case 'Segundo entrenador': return 2;
    case 'Preparador físico': return 3;
    case 'Entrenador de porteros': return 4;
    case 'Analista': return 5;
    case 'Delegado': return 6;
    default: return 7;
  }
};

export function StaffTab({ season }: StaffTabProps) {
  const { staff, loading, saveStaff, deleteStaff } = useClubStaff(season?.id);
  const { isEditMode } = useEditMode();
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Partial<ClubStaff> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filteredStaff = useMemo(() => {
    return staff
      .filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || p.rol.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const diff = getRoleWeight(a.rol) - getRoleWeight(b.rol);
        if (diff !== 0) return diff;
        return a.nombre.localeCompare(b.nombre);
      });
  }, [staff, searchTerm]);

  const handleOpenModal = (member?: ClubStaff) => {
    if (member) {
      setEditingStaff(member);
    } else {
      setEditingStaff({
        nombre: '',
        rol: 'Entrenador',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editingStaff.nombre || !editingStaff.rol) return;
    
    setIsSaving(true);
    const success = await saveStaff(editingStaff);
    setIsSaving(false);
    
    if (success) {
      setIsModalOpen(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar este miembro del cuerpo técnico?')) {
      await deleteStaff(id);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingStaff(prev => prev ? { ...prev, [name]: value } : null);
  };

  if (!season) {
    return <div className="p-8 text-center text-slate-400">No hay datos de temporada disponibles.</div>;
  }

  const inputClass = "w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 focus:ring-1 focus:ring-[#CC0E21]/30 transition-all";
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Barra superior de herramientas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-4 rounded-3xl border border-slate-800/80">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar nombre o rol..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-[#CC0E21]/50 transition-colors"
            />
          </div>
        </div>

        {isEditMode && (
          <Button onClick={() => handleOpenModal()} variant="primary" className="shrink-0 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Añadir Miembro
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-800 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-slate-800/50">
          <UserCheck className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Cuerpo Técnico vacío</h3>
          <p className="text-slate-500 text-sm mt-2">Aún no hay miembros del staff registrados.</p>
          {isEditMode && (
            <Button onClick={() => handleOpenModal()} variant="secondary" className="mt-6">
              Añadir el primero
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStaff.map(member => (
            <Card 
              key={member.id}
              onClick={() => handleOpenModal(member)}
              className="group relative overflow-hidden bg-slate-900/40 border-slate-800/80 hover:border-[#CC0E21]/50 transition-all duration-300 cursor-pointer hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#CC0E21] to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {isEditMode && (
                <button 
                  onClick={(e) => handleDelete(member.id, e)} 
                  className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100 z-10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              <CardContent className="p-6 flex flex-col items-center text-center mt-2">
                <Avatar 
                  src={member.foto_url} 
                  name={member.nombre} 
                  size="xl" 
                  className="mb-4 border-2 border-slate-800 group-hover:border-[#CC0E21]/30 transition-colors"
                />
                
                <h4 className="font-bold text-slate-100 text-lg mb-1 group-hover:text-[#CC0E21] transition-colors">{member.nombre}</h4>
                <Badge variant="default" className="mb-4 text-xs font-semibold px-3 py-0.5 border-slate-700 text-slate-300">
                  {member.rol}
                </Badge>
                
                {member.observaciones && (
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed w-full">
                    {member.observaciones}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar Staff */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingStaff?.id ? "Editar Staff" : "Añadir Staff"}>
        {editingStaff && (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Nombre <span className="text-red-500">*</span></label>
                <input required type="text" name="nombre" value={editingStaff.nombre || ''} onChange={handleChange} className={inputClass} placeholder="Nombre completo" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Rol en el equipo <span className="text-red-500">*</span></label>
                <select required name="rol" value={editingStaff.rol || ''} onChange={handleChange} className={inputClass}>
                  <option value="">Seleccionar...</option>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>URL Fotografía</label>
                <input type="url" name="foto_url" value={editingStaff.foto_url || ''} onChange={handleChange} className={inputClass} placeholder="https://..." />
              </div>
            </div>

            <div>
              <label className={labelClass}>Observaciones</label>
              <textarea name="observaciones" value={editingStaff.observaciones || ''} onChange={handleChange} rows={3} className={inputClass} placeholder="Anotaciones sobre este miembro del staff..." />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>Cancelar</Button>
              <Button type="submit" variant="primary" loading={isSaving}>Guardar Miembro</Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
