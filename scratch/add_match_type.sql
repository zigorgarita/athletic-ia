-- Añadir la columna 'tipo_partido' a la tabla matches para separar Liga de Amistosos
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS tipo_partido TEXT DEFAULT 'LIGA' CHECK (tipo_partido IN ('LIGA', 'AMISTOSO'));
