-- =================================================================
-- MIGRACIÓN ADITIVA: Tabla de gestión de carpetas jerárquicas de Google Drive
-- No borra ni altera ningún registro ni columna existente.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.drive_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path_key TEXT UNIQUE NOT NULL,
    drive_folder_id TEXT NOT NULL,
    parent_folder_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS en la tabla drive_folders
ALTER TABLE public.drive_folders ENABLE ROW LEVEL SECURITY;

-- Política de lectura para la aplicación
DROP POLICY IF EXISTS "Permitir SELECT a todos los usuarios" ON public.drive_folders;
CREATE POLICY "Permitir SELECT a todos los usuarios" ON public.drive_folders FOR SELECT TO public USING (true);

-- Índice rápido para búsqueda de rutas lógicas
CREATE INDEX IF NOT EXISTS idx_drive_folders_path_key ON public.drive_folders(path_key);

-- Función RPC Atómica "First-Wins" para registro de carpetas en concurrencia
-- Inserción idempotente: Si path_key ya existe, NO sobrescribe (DO NOTHING) y devuelve el ID canónico existente.
CREATE OR REPLACE FUNCTION register_drive_folder(
    p_path_key TEXT,
    p_drive_folder_id TEXT,
    p_parent_folder_id TEXT,
    p_staff_passkey TEXT DEFAULT 'indautxu2026'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_canonical_id TEXT;
BEGIN
    IF p_staff_passkey != 'indautxu2026' THEN
        RAISE EXCEPTION 'Acceso no autorizado: Clave de staff incorrecta';
    END IF;

    -- 1. Intentar inserción atómica FIRST-WINS (nunca sobrescribe si ya existe)
    INSERT INTO public.drive_folders (path_key, drive_folder_id, parent_folder_id)
    VALUES (p_path_key, p_drive_folder_id, p_parent_folder_id)
    ON CONFLICT (path_key) DO NOTHING;

    -- 2. Recuperar de forma consistente el ID canónico (el que ganó el primer INSERT)
    SELECT drive_folder_id INTO v_canonical_id
    FROM public.drive_folders
    WHERE path_key = p_path_key;

    RETURN v_canonical_id;
END;
$$;

GRANT EXECUTE ON FUNCTION register_drive_folder(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
