-- ========================================================
-- 1. TABLA DE SISTEMAS DE JUEGO (tactical_systems)
-- ========================================================
CREATE TABLE IF NOT EXISTS tactical_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    filosofia TEXT,
    coordenadas_base JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================================
-- 2. TABLA DE MATCHUPS TEÓRICOS (tactical_matchups)
-- ========================================================
CREATE TABLE IF NOT EXISTS tactical_matchups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_own_id UUID NOT NULL REFERENCES tactical_systems(id) ON DELETE CASCADE,
    system_rival_id UUID NOT NULL REFERENCES tactical_systems(id) ON DELETE CASCADE,
    ventajas TEXT,
    desventajas TEXT,
    zona_conflicto TEXT,
    duelo_clave TEXT,
    tareas_lineas TEXT,
    ai_context TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_system_matchup UNIQUE (system_own_id, system_rival_id)
);

-- ========================================================
-- 3. TABLA DE PLANES TÁCTICOS DE PARTIDO (tactical_match_plans)
-- ========================================================
CREATE TABLE IF NOT EXISTS tactical_match_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    system_own_id UUID REFERENCES tactical_systems(id) ON DELETE SET NULL,
    system_rival_id UUID REFERENCES tactical_systems(id) ON DELETE SET NULL,
    matchup_id UUID REFERENCES tactical_matchups(id) ON DELETE SET NULL,
    notas_entrenador TEXT,
    conclusiones_post TEXT,
    estado TEXT CHECK (estado IN ('borrador', 'preparado', 'cerrado')) DEFAULT 'borrador',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_match_plan UNIQUE (match_id)
);

-- Habilitar RLS
ALTER TABLE tactical_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE tactical_matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE tactical_match_plans ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS públicas
DROP POLICY IF EXISTS "Public Read Systems" ON tactical_systems;
DROP POLICY IF EXISTS "Public Read Matchups" ON tactical_matchups;
DROP POLICY IF EXISTS "Public Read Match Plans" ON tactical_match_plans;

CREATE POLICY "Public Read Systems" ON tactical_systems FOR SELECT USING (true);
CREATE POLICY "Public Read Matchups" ON tactical_matchups FOR SELECT USING (true);
CREATE POLICY "Public Read Match Plans" ON tactical_match_plans FOR SELECT USING (true);

-- ========================================================
-- MIGRACIÓN DE DATOS INICIALES (Formaciones base)
-- ========================================================

INSERT INTO tactical_systems (nombre, descripcion, filosofia, coordenadas_base) VALUES 
('1-4-2-3-1', 'Sistema con doble pivote defensivo, mediapunta central y dos extremos rápidos.', 'Equilibrio defensivo y transiciones rápidas por banda.', '[
  {"id": 1, "label": "POR", "x": 50, "y": 88, "notas_entrenador": ""},
  {"id": 2, "label": "LD", "x": 15, "y": 68, "notas_entrenador": ""},
  {"id": 3, "label": "DFC", "x": 38, "y": 74, "notas_entrenador": ""},
  {"id": 4, "label": "DFC", "x": 62, "y": 74, "notas_entrenador": ""},
  {"id": 5, "label": "LI", "x": 85, "y": 68, "notas_entrenador": ""},
  {"id": 6, "label": "MCD", "x": 36, "y": 58, "notas_entrenador": ""},
  {"id": 7, "label": "MCD", "x": 64, "y": 58, "notas_entrenador": ""},
  {"id": 8, "label": "MCO", "x": 50, "y": 40, "notas_entrenador": ""},
  {"id": 9, "label": "ED", "x": 18, "y": 30, "notas_entrenador": ""},
  {"id": 10, "label": "EI", "x": 82, "y": 30, "notas_entrenador": ""},
  {"id": 11, "label": "DC", "x": 50, "y": 16, "notas_entrenador": ""}
]'::jsonb) ON CONFLICT (nombre) DO UPDATE SET coordenadas_base = EXCLUDED.coordenadas_base;

INSERT INTO tactical_systems (nombre, descripcion, filosofia, coordenadas_base) VALUES 
('1-4-3-3', 'Sistema clásico de posesión con un pivote y dos interiores creativos.', 'Fútbol de asociación, superioridad en el mediocampo y amplitud.', '[
  {"id": 1, "label": "POR", "x": 50, "y": 88, "notas_entrenador": ""},
  {"id": 2, "label": "LD", "x": 15, "y": 68, "notas_entrenador": ""},
  {"id": 3, "label": "DFC", "x": 38, "y": 74, "notas_entrenador": ""},
  {"id": 4, "label": "DFC", "x": 62, "y": 74, "notas_entrenador": ""},
  {"id": 5, "label": "LI", "x": 85, "y": 68, "notas_entrenador": ""},
  {"id": 6, "label": "MCD", "x": 50, "y": 55, "notas_entrenador": ""},
  {"id": 7, "label": "MC", "x": 30, "y": 44, "notas_entrenador": ""},
  {"id": 8, "label": "MC", "x": 70, "y": 44, "notas_entrenador": ""},
  {"id": 9, "label": "ED", "x": 18, "y": 22, "notas_entrenador": ""},
  {"id": 10, "label": "EI", "x": 82, "y": 22, "notas_entrenador": ""},
  {"id": 11, "label": "DC", "x": 50, "y": 15, "notas_entrenador": ""}
]'::jsonb) ON CONFLICT (nombre) DO UPDATE SET coordenadas_base = EXCLUDED.coordenadas_base;

INSERT INTO tactical_systems (nombre, descripcion, filosofia, coordenadas_base) VALUES 
('1-4-4-2', 'El sistema tradicional con dos líneas de cuatro organizadas.', 'Solidez defensiva del bloque medio y ataque directo por parejas.', '[
  {"id": 1, "label": "POR", "x": 50, "y": 88, "notas_entrenador": ""},
  {"id": 2, "label": "LD", "x": 15, "y": 68, "notas_entrenador": ""},
  {"id": 3, "label": "DFC", "x": 38, "y": 74, "notas_entrenador": ""},
  {"id": 4, "label": "DFC", "x": 62, "y": 74, "notas_entrenador": ""},
  {"id": 5, "label": "LI", "x": 85, "y": 68, "notas_entrenador": ""},
  {"id": 6, "label": "MC", "x": 36, "y": 50, "notas_entrenador": ""},
  {"id": 7, "label": "MC", "x": 64, "y": 50, "notas_entrenador": ""},
  {"id": 8, "label": "ED", "x": 15, "y": 40, "notas_entrenador": ""},
  {"id": 9, "label": "EI", "x": 85, "y": 40, "notas_entrenador": ""},
  {"id": 10, "label": "DC", "x": 38, "y": 18, "notas_entrenador": ""},
  {"id": 11, "label": "DC", "x": 62, "y": 18, "notas_entrenador": ""}
]'::jsonb) ON CONFLICT (nombre) DO UPDATE SET coordenadas_base = EXCLUDED.coordenadas_base;

INSERT INTO tactical_systems (nombre, descripcion, filosofia, coordenadas_base) VALUES 
('1-3-5-2', 'Tres centrales, carrileros largos y doble pivote.', 'Ocupación densa del carril central y amplitud a cargo de carrileros.', '[
  {"id": 1, "label": "POR", "x": 50, "y": 88, "notas_entrenador": ""},
  {"id": 2, "label": "DFC", "x": 25, "y": 74, "notas_entrenador": ""},
  {"id": 3, "label": "DFC", "x": 50, "y": 77, "notas_entrenador": ""},
  {"id": 4, "label": "DFC", "x": 75, "y": 74, "notas_entrenador": ""},
  {"id": 5, "label": "MCD", "x": 36, "y": 58, "notas_entrenador": ""},
  {"id": 6, "label": "MCD", "x": 64, "y": 58, "notas_entrenador": ""},
  {"id": 7, "label": "LD", "x": 15, "y": 45, "notas_entrenador": ""},
  {"id": 8, "label": "LI", "x": 85, "y": 45, "notas_entrenador": ""},
  {"id": 9, "label": "MCO", "x": 50, "y": 40, "notas_entrenador": ""},
  {"id": 10, "label": "DC", "x": 38, "y": 18, "notas_entrenador": ""},
  {"id": 11, "label": "DC", "x": 62, "y": 18, "notas_entrenador": ""}
]'::jsonb) ON CONFLICT (nombre) DO UPDATE SET coordenadas_base = EXCLUDED.coordenadas_base;

INSERT INTO tactical_systems (nombre, descripcion, filosofia, coordenadas_base) VALUES 
('1-5-3-2', 'Defensa de cinco hombres en bloque bajo para priorizar seguridad.', 'Repliegue, contención defensiva y contragolpes directos.', '[
  {"id": 1, "label": "POR", "x": 50, "y": 88, "notas_entrenador": ""},
  {"id": 2, "label": "LD", "x": 12, "y": 68, "notas_entrenador": ""},
  {"id": 3, "label": "DFC", "x": 30, "y": 75, "notas_entrenador": ""},
  {"id": 4, "label": "DFC", "x": 50, "y": 77, "notas_entrenador": ""},
  {"id": 5, "label": "DFC", "x": 70, "y": 75, "notas_entrenador": ""},
  {"id": 6, "label": "LI", "x": 88, "y": 68, "notas_entrenador": ""},
  {"id": 7, "label": "MC", "x": 35, "y": 50, "notas_entrenador": ""},
  {"id": 8, "label": "MC", "x": 50, "y": 54, "notas_entrenador": ""},
  {"id": 9, "label": "MC", "x": 65, "y": 50, "notas_entrenador": ""},
  {"id": 10, "label": "DC", "x": 38, "y": 22, "notas_entrenador": ""},
  {"id": 11, "label": "DC", "x": 62, "y": 22, "notas_entrenador": ""}
]'::jsonb) ON CONFLICT (nombre) DO UPDATE SET coordenadas_base = EXCLUDED.coordenadas_base;

INSERT INTO tactical_systems (nombre, descripcion, filosofia, coordenadas_base) VALUES 
('Personalizado', 'Formación de pizarra abierta con colocación manual libre.', 'Flexibilidad absoluta adaptada al partido.', '[
  {"id": 1, "label": "POR", "x": 50, "y": 88, "notas_entrenador": ""},
  {"id": 2, "label": "LD", "x": 15, "y": 68, "notas_entrenador": ""},
  {"id": 3, "label": "DFC", "x": 38, "y": 74, "notas_entrenador": ""},
  {"id": 4, "label": "DFC", "x": 62, "y": 74, "notas_entrenador": ""},
  {"id": 5, "label": "LI", "x": 85, "y": 68, "notas_entrenador": ""},
  {"id": 6, "label": "MCD", "x": 50, "y": 55, "notas_entrenador": ""},
  {"id": 7, "label": "MC", "x": 30, "y": 44, "notas_entrenador": ""},
  {"id": 8, "label": "MC", "x": 70, "y": 44, "notas_entrenador": ""},
  {"id": 9, "label": "ED", "x": 18, "y": 22, "notas_entrenador": ""},
  {"id": 10, "label": "EI", "x": 82, "y": 22, "notas_entrenador": ""},
  {"id": 11, "label": "DC", "x": 50, "y": 15, "notas_entrenador": ""}
]'::jsonb) ON CONFLICT (nombre) DO UPDATE SET coordenadas_base = EXCLUDED.coordenadas_base;

-- ========================================================
-- MIGRACIÓN DE MATCHUPS INICIALES (3 combinaciones teóricas)
-- ========================================================

-- ID helper matching
DO $$
DECLARE
    id_14231 UUID;
    id_1433 UUID;
    id_1442 UUID;
BEGIN
    SELECT id INTO id_14231 FROM tactical_systems WHERE nombre = '1-4-2-3-1';
    SELECT id INTO id_1433 FROM tactical_systems WHERE nombre = '1-4-3-3';
    SELECT id INTO id_1442 FROM tactical_systems WHERE nombre = '1-4-4-2';

    -- 1. 1-4-2-3-1 vs 1-4-3-3
    IF id_14231 IS NOT NULL AND id_1433 IS NOT NULL THEN
        INSERT INTO tactical_matchups (system_own_id, system_rival_id, ventajas, desventajas, zona_conflicto, duelo_clave, tareas_lineas)
        VALUES (id_14231, id_1433, 
        'Superioridad táctica en la mediapunta: nuestro mediapunta central (MCO) flotará libre a la espalda de sus dos interiores, forzando a su único pivote defensivo a salir de zona. Extremos que ensanchan su última línea.',
        'Riesgo de emparejamiento desfavorable en bandas si sus extremos rápidos atacan el espacio exterior libre antes de las coberturas de nuestro doble pivote.',
        'La zona de la mediapunta interior (carril central entre línea de volantes rival y su defensa).',
        'Nuestro MCO contra el MCD organizador rival (fijación táctica).',
        'Portería: Salida en corto y apoyo a centrales. Defensas: Coberturas laterales rápidas. Medios: Doble pivote sostiene y MCO distribuye. Delantera: Fijar a centrales y diagonales al espacio.')
        ON CONFLICT ON CONSTRAINT unique_system_matchup DO NOTHING;
    END IF;

    -- 2. 1-4-2-3-1 vs 1-4-4-2
    IF id_14231 IS NOT NULL AND id_1442 IS NOT NULL THEN
        INSERT INTO tactical_matchups (system_own_id, system_rival_id, ventajas, desventajas, zona_conflicto, duelo_clave, tareas_lineas)
        VALUES (id_14231, id_1442, 
        'Superioridad numérica de 3 vs 2 en zona de mediocampo gracias al triángulo invertido formado por el doble pivote y el mediapunta central.',
        'Dificultad en basculación si sus dos delanteros fijan a nuestros dos centrales y sus laterales se proyectan con libertad.',
        'Espacio de construcción en zona media (interior central).',
        'Doble pivote propio frente a la línea de medios rival para dominar posesión.',
        'Portería: Reiniciar juego con pivotes. Defensa: Anticipar juego directo a sus dos puntas. Medios: Controlar tiempos de juego y circular. Delantera: MCO explota el carril central.')
        ON CONFLICT ON CONSTRAINT unique_system_matchup DO NOTHING;
    END IF;

    -- 3. 1-4-3-3 vs 1-4-4-2
    IF id_1433 IS NOT NULL AND id_1442 IS NOT NULL THEN
        INSERT INTO tactical_matchups (system_own_id, system_rival_id, ventajas, desventajas, zona_conflicto, duelo_clave, tareas_lineas)
        VALUES (id_1433, id_1442, 
        'Ocupación de espacios en amplitud. Extremos que aíslan a laterales, permitiendo crear superioridades en mediocampo de 3 contra 2 volantes.',
        'Sufrimiento en transiciones rápidas si el pivote propio queda superado por su doble delantero en zona de rebote.',
        'La franja de tres cuartos exterior y el pasillo interior de transición.',
        'Extremos propios vs Laterales rivales (desequilibrio individual).',
        'Portería: Actuar como jugador libre en construcción. Defensa: Progresión combinada por bandas. Medios: Rotaciones dinámicas para liberar carriles. Delantera: Extremos con libertad ofensiva.')
        ON CONFLICT ON CONSTRAINT unique_system_matchup DO NOTHING;
    END IF;
END $$;
