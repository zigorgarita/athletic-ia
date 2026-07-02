-- ========================================================
-- ACTUALIZAR CONSTRAINT DE absence_reason EN training_attendance
-- Añadir 'Permiso' y 'Selección' a los motivos válidos
-- Seguro para reejecución: primero elimina el constraint anterior
-- ========================================================

-- Eliminar constraint existente (si existe) y recrearlo con los 11 motivos
ALTER TABLE training_attendance 
  DROP CONSTRAINT IF EXISTS training_attendance_absence_reason_check;

ALTER TABLE training_attendance 
  ADD CONSTRAINT training_attendance_absence_reason_check 
  CHECK (absence_reason IN (
    'Lesión', 
    'Enfermedad', 
    'Estudios', 
    'Trabajo', 
    'Permiso',
    'Selección',
    'Viaje', 
    'Decisión técnica', 
    'Motivo personal', 
    'Sin justificar', 
    'Otro'
  ));
