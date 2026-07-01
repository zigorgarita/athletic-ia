-- =========================================================================
-- MIGRACIÓN: CREACIÓN DE LA TABLA DE REUNIONES INDIVIDUALES (EXTENSIBLE)
-- Ejecutar este script en el editor SQL de Supabase antes de compilar la app.
-- =========================================================================

CREATE TABLE IF NOT EXISTS player_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    solicitada_por TEXT NOT NULL CHECK (solicitada_por IN ('Jugador', 'Staff')),
    motivo TEXT NOT NULL,
    desarrollo TEXT,
    resolucion TEXT,
    estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'En seguimiento', 'Resuelta')),
    
    -- Campos futuros integrados (Diseño preparado para crecer)
    participantes TEXT[] DEFAULT '{}'::TEXT[],
    adjuntos JSONB DEFAULT '[]'::jsonb,
    firma_url TEXT,
    seguimiento_notas TEXT,
    recordatorio_fecha DATE,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 1. Habilitar RLS en la tabla de reuniones
ALTER TABLE player_meetings ENABLE ROW LEVEL SECURITY;

-- 2. Crear política de lectura pública (SELECT)
DROP POLICY IF EXISTS "Public Read Meetings" ON player_meetings;
CREATE POLICY "Public Read Meetings" ON player_meetings FOR SELECT USING (true);
