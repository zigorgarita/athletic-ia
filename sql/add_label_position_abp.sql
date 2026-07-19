-- Migración: Añadir columna label_position a abp_player_roles
-- Compatibilidad: columna nullable con DEFAULT 'bottom'
-- Las jugadas existentes que no tengan el campo devuelven 'bottom' automáticamente.

ALTER TABLE abp_player_roles
  ADD COLUMN IF NOT EXISTS label_position TEXT DEFAULT 'bottom';

-- (Opcional) Constraint de valores permitidos
ALTER TABLE abp_player_roles
  ADD CONSTRAINT chk_label_position
  CHECK (label_position IN ('top', 'bottom', 'left', 'right'));
