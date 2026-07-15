-- 1. Crear tabla de multas
CREATE TABLE IF NOT EXISTS public.player_fines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    motivo TEXT NOT NULL,
    fecha DATE NOT NULL,
    contexto TEXT CHECK (contexto IN ('Entrenamiento', 'Partido', 'Otro')) NOT NULL,
    evento_id UUID, -- Referencia opcional a matches.id o planning_sessions.id
    evento_nombre TEXT, -- Nombre del partido/sesión o descripción manual si es contexto 'Otro'
    importe NUMERIC(10, 2) NOT NULL,
    cantidad INTEGER DEFAULT 1 NOT NULL,
    estado TEXT CHECK (estado IN ('Pendiente', 'Pagado')) DEFAULT 'Pendiente' NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Habilitar RLS en la tabla
ALTER TABLE public.player_fines ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas previas si las hay
DROP POLICY IF EXISTS "Public SELECT only" ON public.player_fines;

-- 4. Crear política de sólo lectura (SELECT) para usuarios públicos (mismo patrón que lesiones/reuniones)
CREATE POLICY "Public SELECT only" ON public.player_fines FOR SELECT USING (true);

-- 5. Trigger de updated_at
DROP TRIGGER IF EXISTS update_player_fines_updated_at ON public.player_fines;
CREATE TRIGGER update_player_fines_updated_at
    BEFORE UPDATE ON public.player_fines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
