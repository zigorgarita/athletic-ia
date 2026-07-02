-- ========================================================
-- TABLA DE FICHAS DE ROL POR POSICIÓN (tactical_role_cards)
-- ========================================================
CREATE TABLE IF NOT EXISTS tactical_role_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matchup_id UUID REFERENCES tactical_matchups(id) ON DELETE CASCADE,
    match_plan_id UUID REFERENCES tactical_match_plans(id) ON DELETE CASCADE,
    linea TEXT CHECK (linea IN ('Portería', 'Defensa', 'Mediocampo', 'Delantera')) NOT NULL,
    posicion_label TEXT NOT NULL, -- ej: 'POR', 'LD', 'DFC', 'MCD', etc.
    fase_ofensiva TEXT,
    fase_defensiva TEXT,
    transiciones TEXT,
    instrucciones_especificas TEXT,
    referencia_visual TEXT,
    ai_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_matchup_position UNIQUE (matchup_id, posicion_label),
    CONSTRAINT unique_match_plan_position UNIQUE (match_plan_id, posicion_label)
);

-- Habilitar RLS
ALTER TABLE tactical_role_cards ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS públicas para lectura
DROP POLICY IF EXISTS "Public Read Role Cards" ON tactical_role_cards;
CREATE POLICY "Public Read Role Cards" ON tactical_role_cards FOR SELECT USING (true);

-- ========================================================
-- PRECARGA DE DATOS (Fichas base por defecto para el sistema 1-4-2-3-1 vs 1-4-3-3)
-- ========================================================

DO $$
DECLARE
    id_14231_vs_1433 UUID;
BEGIN
    -- Intentar obtener el ID del matchup 1-4-2-3-1 vs 1-4-3-3
    SELECT m.id INTO id_14231_vs_1433 
    FROM tactical_matchups m
    JOIN tactical_systems s_own ON m.system_own_id = s_own.id
    JOIN tactical_systems s_riv ON m.system_rival_id = s_riv.id
    WHERE s_own.nombre = '1-4-2-3-1' AND s_riv.nombre = '1-4-3-3'
    LIMIT 1;

    IF id_14231_vs_1433 IS NOT NULL THEN
        -- Portero (POR)
        INSERT INTO tactical_role_cards (matchup_id, linea, posicion_label, fase_ofensiva, fase_defensiva, transiciones, instrucciones_especificas)
        VALUES (id_14231_vs_1433, 'Portería', 'POR', 
        'Apoyo activo en salida corta. Ofrecer siempre línea de pase de seguridad detrás de los centrales.',
        'Voz de mando para guiar vigilancias defensivas. Dominar el juego aéreo en área de penal.',
        'Transición Ofensiva: Lanzamiento rápido con mano a extremos si están libres. Transición Defensiva: Salida rápida para cortar pases al espacio detrás de la última línea.',
        'Atento a los centros cruzados de su extremo diestro rápido.')
        ON CONFLICT ON CONSTRAINT unique_matchup_position DO NOTHING;

        -- Lateral Derecho (LD)
        INSERT INTO tactical_role_cards (matchup_id, linea, posicion_label, fase_ofensiva, fase_defensiva, transiciones, instrucciones_especificas)
        VALUES (id_14231_vs_1433, 'Defensa', 'LD', 
        'Progresar en amplitud por banda exterior. Doblar por fuera al extremo derecho (ED) para generar 2 vs 1.',
        'Estrechar vigilancia sobre su extremo izquierdo ágil. No conceder perfil interior para su disparo.',
        'Transición Ofensiva: Carrera explosiva por carril exterior. Transición Defensiva: Repliegue inmediato para ocupar línea de 4.',
        'Asegurar vigilancias defensivas cuando el mediocentro del lado opuesto se incorpore al ataque.')
        ON CONFLICT ON CONSTRAINT unique_matchup_position DO NOTHING;

        -- Mediapunta (MCO)
        INSERT INTO tactical_role_cards (matchup_id, linea, posicion_label, fase_ofensiva, fase_defensiva, transiciones, instrucciones_especificas)
        VALUES (id_14231_vs_1433, 'Mediocampo', 'MCO', 
        'Recibir libre entre líneas a la espalda de sus dos interiores. Girar rápido y asistir a extremos.',
        'Tapar línea de pase de su pivote organizador. Ayudar en bloque medio ejerciendo presión al poseedor.',
        'Transición Ofensiva: Conducción rápida hacia portería rival o pase en profundidad. Transición Defensiva: Retardar el juego directo rival presionando el pivote.',
        'Moverse de forma asimétrica por pasillos interiores para forzar salidas de sus centrales.')
        ON CONFLICT ON CONSTRAINT unique_matchup_position DO NOTHING;

        -- Delantero (DC)
        INSERT INTO tactical_role_cards (matchup_id, linea, posicion_label, fase_ofensiva, fase_defensiva, transiciones, instrucciones_especificas)
        VALUES (id_14231_vs_1433, 'Delantera', 'DC', 
        'Fijar a los centrales rivales en última línea. Desmarques de ruptura en profundidad y descargas de espaldas.',
        'Iniciar la presión sobre centrales rivales. Tapar perfiles de salida en corto.',
        'Transición Ofensiva: Ruptura al espacio inmediatamente tras recuperación. Transición Defensiva: Repliegue a bloque medio para tapar el centro.',
        'Aprovechar desmarques de apoyo para liberar a nuestro mediapunta (MCO).')
        ON CONFLICT ON CONSTRAINT unique_matchup_position DO NOTHING;
    END IF;
END $$;
