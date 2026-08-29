-- ============================================================================
-- SCRIPT TRANSACCIONAL E IDEMPOTENTE: INSERCIÓN DE PRECEDENTES DE AITOR (Q96 - Q107)
-- Tabla destino: public.knowledge_entries
-- Transacción atómica: BEGIN ... COMMIT
-- Idempotencia reforzada: metadata->>'tipo' = 'precedente_entrenador'
--                         AND metadata->>'question_id' = 'Q...'
--                         AND metadata->>'version' = 'Modelo Juego V1'
-- ============================================================================

BEGIN;

-- Q96: Min 70, empate, rival físicamente superior y llegamos tarde a la presión -> 1-4-1-3-2
INSERT INTO knowledge_entries (
  titulo,
  categoria,
  sistema_asociado,
  principio_clave,
  descripcion,
  consignas,
  metadata,
  creado_por,
  temporada,
  activo,
  created_at,
  updated_at
)
SELECT
  'Q96: Fatiga y presión tardía (Min 70)',
  'Casos Míster',
  '1-4-2-3-1',
  'Rival físicamente superior y llegamos tarde a la presión -> 1-4-1-3-2',
  'Minuto 70 con empate. El rival es físicamente superior y llegamos tarde a la presión. Decisión: 1-4-1-3-2.',
  ARRAY['1-4-1-3-2'],
  jsonb_build_object(
    'tipo', 'precedente_entrenador',
    'question_id', 'Q96',
    'minuto', 70,
    'marcador', 'empate',
    'condiciones', 'Rival físicamente superior y llegamos tarde a la presión',
    'decision_entrenador', '1-4-1-3-2',
    'coach_text', '1-4-1-3-2',
    'status', 'VALIDADO',
    'version', 'Modelo Juego V1'
  ),
  'Aitor',
  '2026-27',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM knowledge_entries 
  WHERE metadata->>'tipo' = 'precedente_entrenador'
    AND metadata->>'question_id' = 'Q96'
    AND metadata->>'version' = 'Modelo Juego V1'
);

-- Q97: Min 80, ganamos 1-0 y el rival acumula jugadores arriba -> 1-5-4-1
INSERT INTO knowledge_entries (
  titulo,
  categoria,
  sistema_asociado,
  principio_clave,
  descripcion,
  consignas,
  metadata,
  creado_por,
  temporada,
  activo,
  created_at,
  updated_at
)
SELECT
  'Q97: Protección de ventaja ante acumulación rival (Min 80)',
  'Casos Míster',
  '1-4-2-3-1',
  'Ganamos 1-0 y el rival acumula jugadores arriba -> 1-5-4-1',
  'Minuto 80 ganando 1-0. El rival acumula jugadores arriba. Decisión: 1-5-4-1.',
  ARRAY['1-5-4-1'],
  jsonb_build_object(
    'tipo', 'precedente_entrenador',
    'question_id', 'Q97',
    'minuto', 80,
    'marcador', '1-0',
    'condiciones', 'Ganamos 1-0 y el rival acumula jugadores arriba',
    'decision_entrenador', '1-5-4-1',
    'coach_text', '1-5-4-1',
    'status', 'VALIDADO',
    'version', 'Modelo Juego V1'
  ),
  'Aitor',
  '2026-27',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM knowledge_entries 
  WHERE metadata->>'tipo' = 'precedente_entrenador'
    AND metadata->>'question_id' = 'Q97'
    AND metadata->>'version' = 'Modelo Juego V1'
);

-- Q98: Min 60, perdemos 0-1 y rival en bloque bajo -> Mover el balón rápido y muchos centros
INSERT INTO knowledge_entries (
  titulo,
  categoria,
  sistema_asociado,
  principio_clave,
  descripcion,
  consignas,
  metadata,
  creado_por,
  temporada,
  activo,
  created_at,
  updated_at
)
SELECT
  'Q98: Ataque ante rival en bloque bajo (Min 60)',
  'Casos Míster',
  '1-4-2-3-1',
  'Perdemos 0-1 y rival en bloque bajo -> Mover el balón rápido y muchos centros',
  'Minuto 60 perdiendo 0-1 con el rival en bloque bajo. Decisión: Mover el balón rápido y muchos centros.',
  ARRAY['Mover el balón rápido y muchos centros'],
  jsonb_build_object(
    'tipo', 'precedente_entrenador',
    'question_id', 'Q98',
    'minuto', 60,
    'marcador', '0-1',
    'condiciones', 'Perdemos 0-1 y rival en bloque bajo',
    'decision_entrenador', 'Mover el balón rápido y muchos centros',
    'coach_text', 'Mover el balón rápido y muchos centros',
    'status', 'VALIDADO',
    'version', 'Modelo Juego V1'
  ),
  'Aitor',
  '2026-27',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM knowledge_entries 
  WHERE metadata->>'tipo' = 'precedente_entrenador'
    AND metadata->>'question_id' = 'Q98'
    AND metadata->>'version' = 'Modelo Juego V1'
);

-- Q99: Min 75, empate, nuestro lateral tiene amarilla y se enfrenta a extremo peligroso -> Sustitución
INSERT INTO knowledge_entries (
  titulo,
  categoria,
  sistema_asociado,
  principio_clave,
  descripcion,
  consignas,
  metadata,
  creado_por,
  temporada,
  activo,
  created_at,
  updated_at
)
SELECT
  'Q99: Lateral amonestado frente a extremo peligroso (Min 75)',
  'Casos Míster',
  '1-4-2-3-1',
  'Lateral con amarilla frente a extremo peligroso -> Sustitución',
  'Minuto 75 con empate. Nuestro lateral tiene amarilla y se enfrenta a un extremo peligroso. Decisión: Sustitución.',
  ARRAY['Sustitución'],
  jsonb_build_object(
    'tipo', 'precedente_entrenador',
    'question_id', 'Q99',
    'minuto', 75,
    'marcador', 'empate',
    'condiciones', 'Nuestro lateral tiene amarilla y se enfrenta a un extremo peligroso',
    'decision_entrenador', 'Sustitución',
    'coach_text', 'Sustitución',
    'status', 'VALIDADO',
    'version', 'Modelo Juego V1'
  ),
  'Aitor',
  '2026-27',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM knowledge_entries 
  WHERE metadata->>'tipo' = 'precedente_entrenador'
    AND metadata->>'question_id' = 'Q99'
    AND metadata->>'version' = 'Modelo Juego V1'
);

-- Q100: Min 65, ganamos 2-0 y sufrimos pérdidas interiores en salida -> Jugar largo
INSERT INTO knowledge_entries (
  titulo,
  categoria,
  sistema_asociado,
  principio_clave,
  descripcion,
  consignas,
  metadata,
  creado_por,
  temporada,
  activo,
  created_at,
  updated_at
)
SELECT
  'Q100: Pérdidas interiores en salida (Min 65)',
  'Casos Míster',
  '1-4-2-3-1',
  'Ganamos 2-0 y sufrimos pérdidas interiores en salida -> Jugar largo',
  'Minuto 65 ganando 2-0. Estamos sufriendo muchas pérdidas interiores en salida. Decisión: Jugar largo.',
  ARRAY['Jugar largo'],
  jsonb_build_object(
    'tipo', 'precedente_entrenador',
    'question_id', 'Q100',
    'minuto', 65,
    'marcador', '2-0',
    'condiciones', 'Ganamos 2-0 y estamos sufriendo muchas pérdidas interiores en salida',
    'decision_entrenador', 'Jugar largo',
    'coach_text', 'Jugar largo',
    'status', 'VALIDADO',
    'version', 'Modelo Juego V1'
  ),
  'Aitor',
  '2026-27',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM knowledge_entries 
  WHERE metadata->>'tipo' = 'precedente_entrenador'
    AND metadata->>'question_id' = 'Q100'
    AND metadata->>'version' = 'Modelo Juego V1'
);

-- Q101: Min 50, perdemos 0-1, atacamos bien pero amenazan a la contra -> Llegar vivos al minuto 80
INSERT INTO knowledge_entries (
  titulo,
  categoria,
  sistema_asociado,
  principio_clave,
  descripcion,
  consignas,
  metadata,
  creado_por,
  temporada,
  activo,
  created_at,
  updated_at
)
SELECT
  'Q101: Gestión de partido bajo amenaza a la contra (Min 50)',
  'Casos Míster',
  '1-4-2-3-1',
  'Perdemos 0-1, atacamos bien pero amenazan a la contra -> Llegar vivos al minuto 80',
  'Minuto 50 perdiendo 0-1. Estamos atacando bien pero el rival nos amenaza a la contra. Decisión: Llegar vivos al minuto 80 (continuar como máximo a un gol de distancia).',
  ARRAY['Llegar vivos al minuto 80'],
  jsonb_build_object(
    'tipo', 'precedente_entrenador',
    'question_id', 'Q101',
    'minuto', 50,
    'marcador', '0-1',
    'condiciones', 'Perdemos 0-1, estamos atacando bien pero el rival nos amenaza a la contra',
    'decision_entrenador', 'Llegar vivos al minuto 80',
    'coach_text', 'Llegar vivos al minuto 80 (continuar como máximo a un gol de distancia)',
    'status', 'VALIDADO',
    'version', 'Modelo Juego V1'
  ),
  'Aitor',
  '2026-27',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM knowledge_entries 
  WHERE metadata->>'tipo' = 'precedente_entrenador'
    AND metadata->>'question_id' = 'Q101'
    AND metadata->>'version' = 'Modelo Juego V1'
);

-- Q102: Min 85, perdemos 0-1 y rival defiende con cinco -> Dos delanteros + más centros
INSERT INTO knowledge_entries (
  titulo,
  categoria,
  sistema_asociado,
  principio_clave,
  descripcion,
  consignas,
  metadata,
  creado_por,
  temporada,
  activo,
  created_at,
  updated_at
)
SELECT
  'Q102: Ataque ante defensa de cinco (Min 85)',
  'Casos Míster',
  '1-4-2-3-1',
  'Perdemos 0-1 y rival defiende con cinco -> Dos delanteros + más centros',
  'Minuto 85 perdiendo 0-1. El rival defiende con cinco. Decisión: Dos delanteros + más centros (el segundo delantero puede incluso ser un central).',
  ARRAY['Dos delanteros + más centros'],
  jsonb_build_object(
    'tipo', 'precedente_entrenador',
    'question_id', 'Q102',
    'minuto', 85,
    'marcador', '0-1',
    'condiciones', 'Perdemos 0-1 y rival defiende con cinco',
    'decision_entrenador', 'Dos delanteros + más centros',
    'coach_text', 'Dos delanteros + más centros (el segundo delantero puede incluso ser un central)',
    'status', 'VALIDADO',
    'version', 'Modelo Juego V1'
  ),
  'Aitor',
  '2026-27',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM knowledge_entries 
  WHERE metadata->>'tipo' = 'precedente_entrenador'
    AND metadata->>'question_id' = 'Q102'
    AND metadata->>'version' = 'Modelo Juego V1'
);

-- Q103: Min 85, ganamos 1-0, rival juega con dos delanteros y muchos centros -> Acumular gente y 1-5-4-1
INSERT INTO knowledge_entries (
  titulo,
  categoria,
  sistema_asociado,
  principio_clave,
  descripcion,
  consignas,
  metadata,
  creado_por,
  temporada,
  activo,
  created_at,
  updated_at
)
SELECT
  'Q103: Defensa ante dos delanteros y centros (Min 85)',
  'Casos Míster',
  '1-4-2-3-1',
  'Ganamos 1-0, rival juega con dos delanteros y muchos centros -> Acumular gente y 1-5-4-1',
  'Minuto 85 ganando 1-0. El rival juega con dos delanteros y muchos centros. Decisión: Acumular gente y 1-5-4-1.',
  ARRAY['Acumular gente y 1-5-4-1'],
  jsonb_build_object(
    'tipo', 'precedente_entrenador',
    'question_id', 'Q103',
    'minuto', 85,
    'marcador', '1-0',
    'condiciones', 'Ganamos 1-0, rival juega con dos delanteros y muchos centros',
    'decision_entrenador', 'Acumular gente y 1-5-4-1',
    'coach_text', 'Acumular gente y 1-5-4-1',
    'status', 'VALIDADO',
    'version', 'Modelo Juego V1'
  ),
  'Aitor',
  '2026-27',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM knowledge_entries 
  WHERE metadata->>'tipo' = 'precedente_entrenador'
    AND metadata->>'question_id' = 'Q103'
    AND metadata->>'version' = 'Modelo Juego V1'
);

-- Q104: Min 30, empate, rival supera repetidamente nuestra presión alta -> 1-4-1-3-2
INSERT INTO knowledge_entries (
  titulo,
  categoria,
  sistema_asociado,
  principio_clave,
  descripcion,
  consignas,
  metadata,
  creado_por,
  temporada,
  activo,
  created_at,
  updated_at
)
SELECT
  'Q104: Presión alta superada (Min 30)',
  'Casos Míster',
  '1-4-2-3-1',
  'El rival supera repetidamente nuestra presión alta -> 1-4-1-3-2',
  'Minuto 30 con empate. El rival supera repetidamente nuestra presión alta. Decisión: 1-4-1-3-2.',
  ARRAY['1-4-1-3-2'],
  jsonb_build_object(
    'tipo', 'precedente_entrenador',
    'question_id', 'Q104',
    'minuto', 30,
    'marcador', 'empate',
    'condiciones', 'El rival supera repetidamente nuestra presión alta',
    'decision_entrenador', '1-4-1-3-2',
    'coach_text', '1-4-1-3-2',
    'status', 'VALIDADO',
    'version', 'Modelo Juego V1'
  ),
  'Aitor',
  '2026-27',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM knowledge_entries 
  WHERE metadata->>'tipo' = 'precedente_entrenador'
    AND metadata->>'question_id' = 'Q104'
    AND metadata->>'version' = 'Modelo Juego V1'
);

-- Q105: Min 70, empate, rival en bloque bajo y nuestra circulación es estéril -> Muchos centros y esperar que pase algo
INSERT INTO knowledge_entries (
  titulo,
  categoria,
  sistema_asociado,
  principio_clave,
  descripcion,
  consignas,
  metadata,
  creado_por,
  temporada,
  activo,
  created_at,
  updated_at
)
SELECT
  'Q105: Circulación estéril ante bloque bajo (Min 70)',
  'Casos Míster',
  '1-4-2-3-1',
  'Rival en bloque bajo y nuestra circulación es estéril -> Muchos centros y esperar que pase algo',
  'Minuto 70 con empate. El rival está en bloque bajo y nuestra circulación es estéril. Decisión: Muchos centros y esperar que pase algo.',
  ARRAY['Muchos centros y esperar que pase algo'],
  jsonb_build_object(
    'tipo', 'precedente_entrenador',
    'question_id', 'Q105',
    'minuto', 70,
    'marcador', 'empate',
    'condiciones', 'Rival en bloque bajo y nuestra circulación es estéril',
    'decision_entrenador', 'Muchos centros y esperar que pase algo',
    'coach_text', 'Muchos centros y esperar que pase algo',
    'status', 'VALIDADO',
    'version', 'Modelo Juego V1'
  ),
  'Aitor',
  '2026-27',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM knowledge_entries 
  WHERE metadata->>'tipo' = 'precedente_entrenador'
    AND metadata->>'question_id' = 'Q105'
    AND metadata->>'version' = 'Modelo Juego V1'
);

-- Q106: Min 60, ganamos 1-0, nuestro central tiene amarilla y se enfrenta a delantero fuerte en duelo -> Mantener al central y mantener el mismo plan
INSERT INTO knowledge_entries (
  titulo,
  categoria,
  sistema_asociado,
  principio_clave,
  descripcion,
  consignas,
  metadata,
  creado_por,
  temporada,
  activo,
  created_at,
  updated_at
)
SELECT
  'Q106: Central amonestado en duelo (Min 60)',
  'Casos Míster',
  '1-4-2-3-1',
  'Central con amarilla frente a delantero fuerte en duelo -> Mantener al central y mantener el mismo plan',
  'Minuto 60 ganando 1-0. Nuestro central tiene amarilla y se enfrenta a un delantero fuerte en duelo. Decisión: Mantener al central y mantener el mismo plan (la amarilla por sí sola no provoca cambio).',
  ARRAY['Mantener al central y mantener el mismo plan'],
  jsonb_build_object(
    'tipo', 'precedente_entrenador',
    'question_id', 'Q106',
    'minuto', 60,
    'marcador', '1-0',
    'condiciones', 'Ganamos 1-0, nuestro central tiene amarilla y se enfrenta a un delantero fuerte en duelo',
    'decision_entrenador', 'Mantener al central y mantener el mismo plan',
    'coach_text', 'Mantener al central y mantener el mismo plan (la amarilla por sí sola no provoca cambio)',
    'status', 'VALIDADO',
    'version', 'Modelo Juego V1'
  ),
  'Aitor',
  '2026-27',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM knowledge_entries 
  WHERE metadata->>'tipo' = 'precedente_entrenador'
    AND metadata->>'question_id' = 'Q106'
    AND metadata->>'version' = 'Modelo Juego V1'
);

-- Q107: Min 75, perdemos 0-1, tenemos superioridad interior pero no profundidad -> Llevar balón fuera y centrar
INSERT INTO knowledge_entries (
  titulo,
  categoria,
  sistema_asociado,
  principio_clave,
  descripcion,
  consignas,
  metadata,
  creado_por,
  temporada,
  activo,
  created_at,
  updated_at
)
SELECT
  'Q107: Superioridad interior sin profundidad (Min 75)',
  'Casos Míster',
  '1-4-2-3-1',
  'Superioridad interior pero sin profundidad -> Llevar balón fuera y centrar',
  'Minuto 75 perdiendo 0-1. Tenemos superioridad interior pero no profundidad. Decisión: Llevar balón fuera y centrar.',
  ARRAY['Llevar balón fuera y centrar'],
  jsonb_build_object(
    'tipo', 'precedente_entrenador',
    'question_id', 'Q107',
    'minuto', 75,
    'marcador', '0-1',
    'condiciones', 'Perdemos 0-1, tenemos superioridad interior pero no profundidad',
    'decision_entrenador', 'Llevar balón fuera y centrar',
    'coach_text', 'Llevar balón fuera y centrar',
    'status', 'VALIDADO',
    'version', 'Modelo Juego V1'
  ),
  'Aitor',
  '2026-27',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM knowledge_entries 
  WHERE metadata->>'tipo' = 'precedente_entrenador'
    AND metadata->>'question_id' = 'Q107'
    AND metadata->>'version' = 'Modelo Juego V1'
);

COMMIT;
