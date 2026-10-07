-- ==============================================================================
-- MIGRACIÓN ADITIVA: ACTIVACIÓN DE CONCEPTOS TÁCTICOS AUDITADOS (PASO 1)
-- Athletic IA - Temporada 2026/27
--
-- REGLAS ESTRICTAS DE SEGURIDAD:
-- 1. SOLO INSERT sobre planning_task_library_concepts.
-- 2. CERO UPDATE. CERO DELETE. CERO modificación sobre planning_task_library.
-- 3. 51 tareas aprobadas objetivo: 50 con conceptos canónicos auditados
--    y 1 tarea aprobada pendiente de contexto (2026-09-03_T2 '11 VS 11', sin conceptos asignados).
-- 4. Exclusión estricta de borradores (aprobada = false).
-- 5. Resolución determinista: sesion_origen_id + numero_tarea_pdf (NUNCA por nombre).
-- 6. Fuente única canónica: AUDITED_51_TASK_CONCEPTS (Diccionario Táctico V2).
-- 7. Auditoría: aprobado_por = 'Aitor'.
-- 8. 100% IDEMPOTENTE: ON CONFLICT (library_id, categoria, concepto) DO NOTHING.
-- ==============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 1: CONSULTAS DE VERIFICACIÓN PREVIA (SOLO LECTURA)
-- ──────────────────────────────────────────────────────────────────────────────

-- 1.1. Verificar que existen exactamente 51 tareas aprobadas con origen trazable
SELECT 
  COUNT(*) AS total_tareas_aprobadas_objetivo,
  COUNT(DISTINCT sesion_origen_id) AS sesiones_origen_distintas
FROM public.planning_task_library
WHERE aprobada = true
  AND sesion_origen_id IS NOT NULL
  AND numero_tarea_pdf IS NOT NULL;
-- RESULTADO ESPERADO: total_tareas_aprobadas_objetivo = 51, sesiones_origen_distintas = 16


-- 1.2. Verificar que ningún borrador (aprobada = false) se incluye como objetivo
SELECT 
  COUNT(*) AS borradores_detectados
FROM public.planning_task_library
WHERE aprobada = false;
-- RESULTADO ESPERADO: borradores_detectados = 1 (borrador nº 52 '5 CONTRA 5 + 1 COMODÍN' debe quedar fuera)


-- 1.3. Pre-validación de cruce: verificar 50 tareas con conceptos, 168 relaciones y 61 conceptos canónicos
WITH audited_data (fecha, numero_tarea_pdf, categoria, concepto) AS (
  VALUES
    ('2026-08-03'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-08-03'::date, 1, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-08-03'::date, 1, 'DEFENSA', 'Acoso'),
    ('2026-08-03'::date, 2, 'ATAQUE', 'Ataque Posicional'),
    ('2026-08-03'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-03'::date, 2, 'ATAQUE', 'Amplitud'),
    ('2026-08-03'::date, 2, 'ATAQUE', 'Profundidad'),
    ('2026-08-03'::date, 3, 'ATAQUE', 'Ataque Posicional'),
    ('2026-08-03'::date, 3, 'DEFENSA', 'Basculación'),
    ('2026-08-03'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-08-03'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-03'::date, 3, 'DEFENSA', 'Achicar Espacios'),
    ('2026-08-04'::date, 1, 'DEFENSA', 'Duelo 1v1'),
    ('2026-08-04'::date, 1, 'ATAQUE', 'Conservación de Balón'),
    ('2026-08-04'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Cierre de Líneas de Pase'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Basculación'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Bloque Defensivo'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Interceptación'),
    ('2026-08-04'::date, 3, 'DEFENSA', 'Bloque Defensivo'),
    ('2026-08-04'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-08-04'::date, 3, 'DEFENSA', 'Basculación'),
    ('2026-08-04'::date, 3, 'DEFENSA', 'Bloque Bajo'),
    ('2026-08-05'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-08-05'::date, 1, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-08-05'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-05'::date, 2, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-08-05'::date, 2, 'TRANSICIONES', 'Contraataque'),
    ('2026-08-05'::date, 2, 'TRANSICIONES', 'Repliegue'),
    ('2026-08-06'::date, 1, 'DEFENSA', 'Basculación'),
    ('2026-08-06'::date, 1, 'ATAQUE', 'Juego Interior'),
    ('2026-08-06'::date, 2, 'ABP', 'Despeje Aéreo (Defensivo)'),
    ('2026-08-06'::date, 2, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-08-06'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-06'::date, 2, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Amplitud'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Superioridad Ofensiva'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Cambio de Orientación'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Juego Interior'),
    ('2026-08-07'::date, 1, 'MENTAL', 'Velocidad de Reacción'),
    ('2026-08-07'::date, 1, 'MENTAL', 'Toma de Decisiones'),
    ('2026-08-07'::date, 1, 'MENTAL', 'Cohesión Grupal'),
    ('2026-08-07'::date, 2, 'ABP', 'Juego Aéreo'),
    ('2026-08-07'::date, 2, 'ATAQUE', 'Remate de Cabeza (Ofensivo)'),
    ('2026-08-07'::date, 2, 'ABP', 'Despeje Aéreo (Defensivo)'),
    ('2026-08-07'::date, 2, 'MENTAL', 'Coordinación'),
    ('2026-08-07'::date, 3, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-08-07'::date, 3, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-08-07'::date, 3, 'ATAQUE', 'Centros al Área'),
    ('2026-08-07'::date, 4, 'ATAQUE', 'Llegada de Segunda Línea'),
    ('2026-08-07'::date, 4, 'ATAQUE', 'Ocupación de Zonas de Remate'),
    ('2026-08-07'::date, 4, 'ATAQUE', 'Centros al Área'),
    ('2026-08-07'::date, 5, 'DEFENSA', 'Presión Alta'),
    ('2026-09-03'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-03'::date, 3, 'ATAQUE', 'Amplitud'),
    ('2026-09-03'::date, 3, 'ATAQUE', 'Profundidad'),
    ('2026-09-03'::date, 3, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-03'::date, 3, 'DEFENSA', 'Bloque Medio'),
    ('2026-09-03'::date, 3, 'ATAQUE', 'Salida de Balón'),
    ('2026-09-08'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-08'::date, 1, 'ATAQUE', 'Cambio de Orientación'),
    ('2026-09-08'::date, 1, 'DEFENSA', 'Reducción de Intervalos'),
    ('2026-09-08'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-08'::date, 2, 'ATAQUE', 'Amplitud'),
    ('2026-09-08'::date, 2, 'DEFENSA', 'Basculación'),
    ('2026-09-08'::date, 2, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-09-08'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-08'::date, 3, 'ABP', 'Segunda Jugada'),
    ('2026-09-08'::date, 3, 'ATAQUE', 'Juego Directo'),
    ('2026-09-08'::date, 3, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-08'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-09-10'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-10'::date, 1, 'ATAQUE', 'Amplitud'),
    ('2026-09-10'::date, 1, 'ATAQUE', 'Estructura Posicional'),
    ('2026-09-10'::date, 1, 'DEFENSA', 'Basculación'),
    ('2026-09-10'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-10'::date, 2, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-09-10'::date, 2, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-10'::date, 2, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-10'::date, 3, 'ABP', 'Juego Aéreo'),
    ('2026-09-10'::date, 3, 'ABP', 'Segunda Jugada'),
    ('2026-09-10'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-09-10'::date, 3, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-10'::date, 4, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-10'::date, 4, 'DEFENSA', 'Basculación'),
    ('2026-09-10'::date, 4, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-10'::date, 4, 'ATAQUE', 'Líneas de Pase'),
    ('2026-09-11'::date, 1, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-11'::date, 1, 'ATAQUE', 'Combinación Rápida'),
    ('2026-09-11'::date, 1, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-11'::date, 2, 'ATAQUE', 'Llegada de Segunda Línea'),
    ('2026-09-11'::date, 2, 'ATAQUE', 'Centros al Área'),
    ('2026-09-11'::date, 2, 'ATAQUE', 'Ocupación de Zonas de Remate'),
    ('2026-09-15'::date, 1, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-15'::date, 1, 'MENTAL', 'Toma de Decisiones'),
    ('2026-09-15'::date, 2, 'DEFENSA', 'Presión'),
    ('2026-09-15'::date, 2, 'ATAQUE', 'Conservación de Balón'),
    ('2026-09-15'::date, 3, 'DEFENSA', 'Presión'),
    ('2026-09-15'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-15'::date, 3, 'ATAQUE', 'Finalización'),
    ('2026-09-15'::date, 4, 'ATAQUE', 'Finalización'),
    ('2026-09-15'::date, 4, 'ATAQUE', 'Progresión'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Conservación de Balón'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Amplitud'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-17'::date, 2, 'ATAQUE', 'Ataque Posicional'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Desdoblamiento'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Finalización'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Centros al Área'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-09-17'::date, 4, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-17'::date, 4, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-17'::date, 4, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-17'::date, 4, 'DEFENSA', 'Bloque Defensivo'),
    ('2026-09-18'::date, 1, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-18'::date, 1, 'ATAQUE', 'Finalización'),
    ('2026-09-18'::date, 1, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-09-18'::date, 2, 'ATAQUE', 'Centros al Área'),
    ('2026-09-18'::date, 2, 'ATAQUE', 'Llegada de Segunda Línea'),
    ('2026-09-18'::date, 2, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-22'::date, 1, 'ATAQUE', 'Ocupación de Espacios'),
    ('2026-09-22'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-22'::date, 1, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-22'::date, 2, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-22'::date, 2, 'ATAQUE', 'Amplitud'),
    ('2026-09-22'::date, 2, 'ATAQUE', 'Movilidad'),
    ('2026-09-22'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-22'::date, 3, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-09-22'::date, 4, 'ATAQUE', 'Estructura de Juego'),
    ('2026-09-22'::date, 4, 'ATAQUE', 'Ocupación de Espacios'),
    ('2026-09-22'::date, 4, 'ATAQUE', 'Relaciones entre Líneas'),
    ('2026-09-24'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-24'::date, 1, 'ATAQUE', 'Atracción por Posesión'),
    ('2026-09-24'::date, 1, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-24'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-24'::date, 2, 'ABP', 'Duelo Aéreo'),
    ('2026-09-24'::date, 2, 'DEFENSA', 'Defensa de Centros'),
    ('2026-09-24'::date, 2, 'ABP', 'Segunda Jugada'),
    ('2026-09-24'::date, 2, 'DEFENSA', 'Temporización Defensiva'),
    ('2026-09-24'::date, 3, 'ATAQUE', 'Salida de Balón'),
    ('2026-09-24'::date, 3, 'DEFENSA', 'Bloque Bajo'),
    ('2026-09-24'::date, 3, 'DEFENSA', 'Bloque Medio'),
    ('2026-09-24'::date, 3, 'DEFENSA', 'Presión Alta'),
    ('2026-09-24'::date, 3, 'ATAQUE', 'Amplitud'),
    ('2026-09-24'::date, 3, 'ATAQUE', 'Profundidad'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Centros al Área'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Remate de Cabeza (Ofensivo)'),
    ('2026-09-25'::date, 1, 'ABP', 'Despeje Aéreo (Defensivo)'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Ocupación de Zonas de Remate'),
    ('2026-09-25'::date, 2, 'MENTAL', 'Competición'),
    ('2026-09-25'::date, 2, 'MENTAL', 'Toma de Decisiones'),
    ('2026-09-25'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-25'::date, 2, 'CONDICIONAL', 'Juego Reducido'),
    ('2026-09-29'::date, 1, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-29'::date, 2, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-29'::date, 2, 'ATAQUE', 'Cambio de Orientación'),
    ('2026-09-29'::date, 2, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-29'::date, 2, 'DEFENSA', 'Perfilación Defensiva'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Contraataque'),
    ('2026-09-29'::date, 4, 'CONDICIONAL', 'Partido Real'),
    ('2026-09-29'::date, 4, 'DEFENSA', 'Presión Colectiva')
),
target_tasks AS (
  SELECT 
    ptl.id AS library_id,
    ptl.nombre AS task_nombre,
    ps.fecha,
    ptl.numero_tarea_pdf
  FROM public.planning_task_library ptl
  JOIN public.planning_sessions ps ON ps.id = ptl.sesion_origen_id
  WHERE ptl.aprobada = true
    AND ptl.sesion_origen_id IS NOT NULL
    AND ptl.numero_tarea_pdf IS NOT NULL
)
SELECT
  COUNT(DISTINCT tt.library_id) AS tareas_con_conceptos_auditados,
  COUNT(ad.concepto) AS relaciones_a_insertar,
  COUNT(DISTINCT ad.concepto) AS conceptos_canonicos_cubiertos
FROM target_tasks tt
JOIN audited_data ad 
  ON ad.fecha = tt.fecha 
 AND ad.numero_tarea_pdf = tt.numero_tarea_pdf;
-- RESULTADOS ESPERADOS:
-- tareas_con_conceptos_auditados = 50 (de 51 aprobadas; 1 tarea queda pendiente de contexto)
-- relaciones_a_insertar = 168
-- conceptos_canonicos_cubiertos = 61 (de 63 totales)


-- 1.4. Verificar tarea aprobada pendiente de contexto y sin conceptos (debe ser exactamente 1: 2026-09-03_T2)
WITH audited_data (fecha, numero_tarea_pdf, categoria, concepto) AS (
  VALUES
    ('2026-08-03'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-08-03'::date, 1, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-08-03'::date, 1, 'DEFENSA', 'Acoso'),
    ('2026-08-03'::date, 2, 'ATAQUE', 'Ataque Posicional'),
    ('2026-08-03'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-03'::date, 2, 'ATAQUE', 'Amplitud'),
    ('2026-08-03'::date, 2, 'ATAQUE', 'Profundidad'),
    ('2026-08-03'::date, 3, 'ATAQUE', 'Ataque Posicional'),
    ('2026-08-03'::date, 3, 'DEFENSA', 'Basculación'),
    ('2026-08-03'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-08-03'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-03'::date, 3, 'DEFENSA', 'Achicar Espacios'),
    ('2026-08-04'::date, 1, 'DEFENSA', 'Duelo 1v1'),
    ('2026-08-04'::date, 1, 'ATAQUE', 'Conservación de Balón'),
    ('2026-08-04'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Cierre de Líneas de Pase'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Basculación'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Bloque Defensivo'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Interceptación'),
    ('2026-08-04'::date, 3, 'DEFENSA', 'Bloque Defensivo'),
    ('2026-08-04'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-08-04'::date, 3, 'DEFENSA', 'Basculación'),
    ('2026-08-04'::date, 3, 'DEFENSA', 'Bloque Bajo'),
    ('2026-08-05'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-08-05'::date, 1, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-08-05'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-05'::date, 2, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-08-05'::date, 2, 'TRANSICIONES', 'Contraataque'),
    ('2026-08-05'::date, 2, 'TRANSICIONES', 'Repliegue'),
    ('2026-08-06'::date, 1, 'DEFENSA', 'Basculación'),
    ('2026-08-06'::date, 1, 'ATAQUE', 'Juego Interior'),
    ('2026-08-06'::date, 2, 'ABP', 'Despeje Aéreo (Defensivo)'),
    ('2026-08-06'::date, 2, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-08-06'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-06'::date, 2, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Amplitud'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Superioridad Ofensiva'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Cambio de Orientación'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Juego Interior'),
    ('2026-08-07'::date, 1, 'MENTAL', 'Velocidad de Reacción'),
    ('2026-08-07'::date, 1, 'MENTAL', 'Toma de Decisiones'),
    ('2026-08-07'::date, 1, 'MENTAL', 'Cohesión Grupal'),
    ('2026-08-07'::date, 2, 'ABP', 'Juego Aéreo'),
    ('2026-08-07'::date, 2, 'ATAQUE', 'Remate de Cabeza (Ofensivo)'),
    ('2026-08-07'::date, 2, 'ABP', 'Despeje Aéreo (Defensivo)'),
    ('2026-08-07'::date, 2, 'MENTAL', 'Coordinación'),
    ('2026-08-07'::date, 3, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-08-07'::date, 3, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-08-07'::date, 3, 'ATAQUE', 'Centros al Área'),
    ('2026-08-07'::date, 4, 'ATAQUE', 'Llegada de Segunda Línea'),
    ('2026-08-07'::date, 4, 'ATAQUE', 'Ocupación de Zonas de Remate'),
    ('2026-08-07'::date, 4, 'ATAQUE', 'Centros al Área'),
    ('2026-08-07'::date, 5, 'DEFENSA', 'Presión Alta'),
    ('2026-09-03'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-03'::date, 3, 'ATAQUE', 'Amplitud'),
    ('2026-09-03'::date, 3, 'ATAQUE', 'Profundidad'),
    ('2026-09-03'::date, 3, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-03'::date, 3, 'DEFENSA', 'Bloque Medio'),
    ('2026-09-03'::date, 3, 'ATAQUE', 'Salida de Balón'),
    ('2026-09-08'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-08'::date, 1, 'ATAQUE', 'Cambio de Orientación'),
    ('2026-09-08'::date, 1, 'DEFENSA', 'Reducción de Intervalos'),
    ('2026-09-08'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-08'::date, 2, 'ATAQUE', 'Amplitud'),
    ('2026-09-08'::date, 2, 'DEFENSA', 'Basculación'),
    ('2026-09-08'::date, 2, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-09-08'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-08'::date, 3, 'ABP', 'Segunda Jugada'),
    ('2026-09-08'::date, 3, 'ATAQUE', 'Juego Directo'),
    ('2026-09-08'::date, 3, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-08'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-09-10'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-10'::date, 1, 'ATAQUE', 'Amplitud'),
    ('2026-09-10'::date, 1, 'ATAQUE', 'Estructura Posicional'),
    ('2026-09-10'::date, 1, 'DEFENSA', 'Basculación'),
    ('2026-09-10'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-10'::date, 2, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-09-10'::date, 2, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-10'::date, 2, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-10'::date, 3, 'ABP', 'Juego Aéreo'),
    ('2026-09-10'::date, 3, 'ABP', 'Segunda Jugada'),
    ('2026-09-10'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-09-10'::date, 3, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-10'::date, 4, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-10'::date, 4, 'DEFENSA', 'Basculación'),
    ('2026-09-10'::date, 4, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-10'::date, 4, 'ATAQUE', 'Líneas de Pase'),
    ('2026-09-11'::date, 1, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-11'::date, 1, 'ATAQUE', 'Combinación Rápida'),
    ('2026-09-11'::date, 1, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-11'::date, 2, 'ATAQUE', 'Llegada de Segunda Línea'),
    ('2026-09-11'::date, 2, 'ATAQUE', 'Centros al Área'),
    ('2026-09-11'::date, 2, 'ATAQUE', 'Ocupación de Zonas de Remate'),
    ('2026-09-15'::date, 1, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-15'::date, 1, 'MENTAL', 'Toma de Decisiones'),
    ('2026-09-15'::date, 2, 'DEFENSA', 'Presión'),
    ('2026-09-15'::date, 2, 'ATAQUE', 'Conservación de Balón'),
    ('2026-09-15'::date, 3, 'DEFENSA', 'Presión'),
    ('2026-09-15'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-15'::date, 3, 'ATAQUE', 'Finalización'),
    ('2026-09-15'::date, 4, 'ATAQUE', 'Finalización'),
    ('2026-09-15'::date, 4, 'ATAQUE', 'Progresión'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Conservación de Balón'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Amplitud'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-17'::date, 2, 'ATAQUE', 'Ataque Posicional'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Desdoblamiento'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Finalización'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Centros al Área'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-09-17'::date, 4, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-17'::date, 4, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-17'::date, 4, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-17'::date, 4, 'DEFENSA', 'Bloque Defensivo'),
    ('2026-09-18'::date, 1, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-18'::date, 1, 'ATAQUE', 'Finalización'),
    ('2026-09-18'::date, 1, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-09-18'::date, 2, 'ATAQUE', 'Centros al Área'),
    ('2026-09-18'::date, 2, 'ATAQUE', 'Llegada de Segunda Línea'),
    ('2026-09-18'::date, 2, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-22'::date, 1, 'ATAQUE', 'Ocupación de Espacios'),
    ('2026-09-22'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-22'::date, 1, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-22'::date, 2, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-22'::date, 2, 'ATAQUE', 'Amplitud'),
    ('2026-09-22'::date, 2, 'ATAQUE', 'Movilidad'),
    ('2026-09-22'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-22'::date, 3, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-09-22'::date, 4, 'ATAQUE', 'Estructura de Juego'),
    ('2026-09-22'::date, 4, 'ATAQUE', 'Ocupación de Espacios'),
    ('2026-09-22'::date, 4, 'ATAQUE', 'Relaciones entre Líneas'),
    ('2026-09-24'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-24'::date, 1, 'ATAQUE', 'Atracción por Posesión'),
    ('2026-09-24'::date, 1, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-24'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-24'::date, 2, 'ABP', 'Duelo Aéreo'),
    ('2026-09-24'::date, 2, 'DEFENSA', 'Defensa de Centros'),
    ('2026-09-24'::date, 2, 'ABP', 'Segunda Jugada'),
    ('2026-09-24'::date, 2, 'DEFENSA', 'Temporización Defensiva'),
    ('2026-09-24'::date, 3, 'ATAQUE', 'Salida de Balón'),
    ('2026-09-24'::date, 3, 'DEFENSA', 'Bloque Bajo'),
    ('2026-09-24'::date, 3, 'DEFENSA', 'Bloque Medio'),
    ('2026-09-24'::date, 3, 'DEFENSA', 'Presión Alta'),
    ('2026-09-24'::date, 3, 'ATAQUE', 'Amplitud'),
    ('2026-09-24'::date, 3, 'ATAQUE', 'Profundidad'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Centros al Área'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Remate de Cabeza (Ofensivo)'),
    ('2026-09-25'::date, 1, 'ABP', 'Despeje Aéreo (Defensivo)'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Ocupación de Zonas de Remate'),
    ('2026-09-25'::date, 2, 'MENTAL', 'Competición'),
    ('2026-09-25'::date, 2, 'MENTAL', 'Toma de Decisiones'),
    ('2026-09-25'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-25'::date, 2, 'CONDICIONAL', 'Juego Reducido'),
    ('2026-09-29'::date, 1, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-29'::date, 2, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-29'::date, 2, 'ATAQUE', 'Cambio de Orientación'),
    ('2026-09-29'::date, 2, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-29'::date, 2, 'DEFENSA', 'Perfilación Defensiva'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Contraataque'),
    ('2026-09-29'::date, 4, 'CONDICIONAL', 'Partido Real'),
    ('2026-09-29'::date, 4, 'DEFENSA', 'Presión Colectiva')
),
target_tasks AS (
  SELECT 
    ptl.id AS library_id,
    ptl.nombre,
    ps.fecha,
    ptl.numero_tarea_pdf
  FROM public.planning_task_library ptl
  JOIN public.planning_sessions ps ON ps.id = ptl.sesion_origen_id
  WHERE ptl.aprobada = true
    AND ptl.sesion_origen_id IS NOT NULL
    AND ptl.numero_tarea_pdf IS NOT NULL
)
SELECT 
  tt.library_id,
  tt.nombre,
  tt.fecha,
  tt.numero_tarea_pdf
FROM target_tasks tt
LEFT JOIN audited_data ad
  ON ad.fecha = tt.fecha
 AND ad.numero_tarea_pdf = tt.numero_tarea_pdf
WHERE ad.concepto IS NULL;
-- RESULTADO ESPERADO: Exactamente 1 fila:
-- library_id = 'e5be2d44-3d87-4642-a238-ac0913d94444'
-- nombre = '11 VS 11'
-- fecha = '2026-09-03'
-- numero_tarea_pdf = 2
-- (Tarea 2026-09-03_T2 auditada con 'pendiente_contexto' y 0 conceptos canónicos asignados)


-- 1.5. Verificar claves auditadas huérfanas (debe ser 0)
WITH audited_data (fecha, numero_tarea_pdf, categoria, concepto) AS (
  VALUES
    ('2026-08-03'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-08-03'::date, 1, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-08-03'::date, 1, 'DEFENSA', 'Acoso'),
    ('2026-08-03'::date, 2, 'ATAQUE', 'Ataque Posicional'),
    ('2026-08-03'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-03'::date, 2, 'ATAQUE', 'Amplitud'),
    ('2026-08-03'::date, 2, 'ATAQUE', 'Profundidad'),
    ('2026-08-03'::date, 3, 'ATAQUE', 'Ataque Posicional'),
    ('2026-08-03'::date, 3, 'DEFENSA', 'Basculación'),
    ('2026-08-03'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-08-03'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-03'::date, 3, 'DEFENSA', 'Achicar Espacios'),
    ('2026-08-04'::date, 1, 'DEFENSA', 'Duelo 1v1'),
    ('2026-08-04'::date, 1, 'ATAQUE', 'Conservación de Balón'),
    ('2026-08-04'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Cierre de Líneas de Pase'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Basculación'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Bloque Defensivo'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Interceptación'),
    ('2026-08-04'::date, 3, 'DEFENSA', 'Bloque Defensivo'),
    ('2026-08-04'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-08-04'::date, 3, 'DEFENSA', 'Basculación'),
    ('2026-08-04'::date, 3, 'DEFENSA', 'Bloque Bajo'),
    ('2026-08-05'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-08-05'::date, 1, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-08-05'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-05'::date, 2, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-08-05'::date, 2, 'TRANSICIONES', 'Contraataque'),
    ('2026-08-05'::date, 2, 'TRANSICIONES', 'Repliegue'),
    ('2026-08-06'::date, 1, 'DEFENSA', 'Basculación'),
    ('2026-08-06'::date, 1, 'ATAQUE', 'Juego Interior'),
    ('2026-08-06'::date, 2, 'ABP', 'Despeje Aéreo (Defensivo)'),
    ('2026-08-06'::date, 2, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-08-06'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-06'::date, 2, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Amplitud'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Superioridad Ofensiva'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Cambio de Orientación'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Juego Interior'),
    ('2026-08-07'::date, 1, 'MENTAL', 'Velocidad de Reacción'),
    ('2026-08-07'::date, 1, 'MENTAL', 'Toma de Decisiones'),
    ('2026-08-07'::date, 1, 'MENTAL', 'Cohesión Grupal'),
    ('2026-08-07'::date, 2, 'ABP', 'Juego Aéreo'),
    ('2026-08-07'::date, 2, 'ATAQUE', 'Remate de Cabeza (Ofensivo)'),
    ('2026-08-07'::date, 2, 'ABP', 'Despeje Aéreo (Defensivo)'),
    ('2026-08-07'::date, 2, 'MENTAL', 'Coordinación'),
    ('2026-08-07'::date, 3, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-08-07'::date, 3, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-08-07'::date, 3, 'ATAQUE', 'Centros al Área'),
    ('2026-08-07'::date, 4, 'ATAQUE', 'Llegada de Segunda Línea'),
    ('2026-08-07'::date, 4, 'ATAQUE', 'Ocupación de Zonas de Remate'),
    ('2026-08-07'::date, 4, 'ATAQUE', 'Centros al Área'),
    ('2026-08-07'::date, 5, 'DEFENSA', 'Presión Alta'),
    ('2026-09-03'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-03'::date, 3, 'ATAQUE', 'Amplitud'),
    ('2026-09-03'::date, 3, 'ATAQUE', 'Profundidad'),
    ('2026-09-03'::date, 3, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-03'::date, 3, 'DEFENSA', 'Bloque Medio'),
    ('2026-09-03'::date, 3, 'ATAQUE', 'Salida de Balón'),
    ('2026-09-08'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-08'::date, 1, 'ATAQUE', 'Cambio de Orientación'),
    ('2026-09-08'::date, 1, 'DEFENSA', 'Reducción de Intervalos'),
    ('2026-09-08'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-08'::date, 2, 'ATAQUE', 'Amplitud'),
    ('2026-09-08'::date, 2, 'DEFENSA', 'Basculación'),
    ('2026-09-08'::date, 2, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-09-08'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-08'::date, 3, 'ABP', 'Segunda Jugada'),
    ('2026-09-08'::date, 3, 'ATAQUE', 'Juego Directo'),
    ('2026-09-08'::date, 3, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-08'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-09-10'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-10'::date, 1, 'ATAQUE', 'Amplitud'),
    ('2026-09-10'::date, 1, 'ATAQUE', 'Estructura Posicional'),
    ('2026-09-10'::date, 1, 'DEFENSA', 'Basculación'),
    ('2026-09-10'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-10'::date, 2, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-09-10'::date, 2, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-10'::date, 2, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-10'::date, 3, 'ABP', 'Juego Aéreo'),
    ('2026-09-10'::date, 3, 'ABP', 'Segunda Jugada'),
    ('2026-09-10'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-09-10'::date, 3, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-10'::date, 4, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-10'::date, 4, 'DEFENSA', 'Basculación'),
    ('2026-09-10'::date, 4, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-10'::date, 4, 'ATAQUE', 'Líneas de Pase'),
    ('2026-09-11'::date, 1, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-11'::date, 1, 'ATAQUE', 'Combinación Rápida'),
    ('2026-09-11'::date, 1, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-11'::date, 2, 'ATAQUE', 'Llegada de Segunda Línea'),
    ('2026-09-11'::date, 2, 'ATAQUE', 'Centros al Área'),
    ('2026-09-11'::date, 2, 'ATAQUE', 'Ocupación de Zonas de Remate'),
    ('2026-09-15'::date, 1, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-15'::date, 1, 'MENTAL', 'Toma de Decisiones'),
    ('2026-09-15'::date, 2, 'DEFENSA', 'Presión'),
    ('2026-09-15'::date, 2, 'ATAQUE', 'Conservación de Balón'),
    ('2026-09-15'::date, 3, 'DEFENSA', 'Presión'),
    ('2026-09-15'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-15'::date, 3, 'ATAQUE', 'Finalización'),
    ('2026-09-15'::date, 4, 'ATAQUE', 'Finalización'),
    ('2026-09-15'::date, 4, 'ATAQUE', 'Progresión'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Conservación de Balón'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Amplitud'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-17'::date, 2, 'ATAQUE', 'Ataque Posicional'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Desdoblamiento'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Finalización'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Centros al Área'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-09-17'::date, 4, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-17'::date, 4, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-17'::date, 4, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-17'::date, 4, 'DEFENSA', 'Bloque Defensivo'),
    ('2026-09-18'::date, 1, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-18'::date, 1, 'ATAQUE', 'Finalización'),
    ('2026-09-18'::date, 1, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-09-18'::date, 2, 'ATAQUE', 'Centros al Área'),
    ('2026-09-18'::date, 2, 'ATAQUE', 'Llegada de Segunda Línea'),
    ('2026-09-18'::date, 2, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-22'::date, 1, 'ATAQUE', 'Ocupación de Espacios'),
    ('2026-09-22'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-22'::date, 1, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-22'::date, 2, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-22'::date, 2, 'ATAQUE', 'Amplitud'),
    ('2026-09-22'::date, 2, 'ATAQUE', 'Movilidad'),
    ('2026-09-22'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-22'::date, 3, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-09-22'::date, 4, 'ATAQUE', 'Estructura de Juego'),
    ('2026-09-22'::date, 4, 'ATAQUE', 'Ocupación de Espacios'),
    ('2026-09-22'::date, 4, 'ATAQUE', 'Relaciones entre Líneas'),
    ('2026-09-24'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-24'::date, 1, 'ATAQUE', 'Atracción por Posesión'),
    ('2026-09-24'::date, 1, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-24'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-24'::date, 2, 'ABP', 'Duelo Aéreo'),
    ('2026-09-24'::date, 2, 'DEFENSA', 'Defensa de Centros'),
    ('2026-09-24'::date, 2, 'ABP', 'Segunda Jugada'),
    ('2026-09-24'::date, 2, 'DEFENSA', 'Temporización Defensiva'),
    ('2026-09-24'::date, 3, 'ATAQUE', 'Salida de Balón'),
    ('2026-09-24'::date, 3, 'DEFENSA', 'Bloque Bajo'),
    ('2026-09-24'::date, 3, 'DEFENSA', 'Bloque Medio'),
    ('2026-09-24'::date, 3, 'DEFENSA', 'Presión Alta'),
    ('2026-09-24'::date, 3, 'ATAQUE', 'Amplitud'),
    ('2026-09-24'::date, 3, 'ATAQUE', 'Profundidad'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Centros al Área'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Remate de Cabeza (Ofensivo)'),
    ('2026-09-25'::date, 1, 'ABP', 'Despeje Aéreo (Defensivo)'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Ocupación de Zonas de Remate'),
    ('2026-09-25'::date, 2, 'MENTAL', 'Competición'),
    ('2026-09-25'::date, 2, 'MENTAL', 'Toma de Decisiones'),
    ('2026-09-25'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-25'::date, 2, 'CONDICIONAL', 'Juego Reducido'),
    ('2026-09-29'::date, 1, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-29'::date, 2, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-29'::date, 2, 'ATAQUE', 'Cambio de Orientación'),
    ('2026-09-29'::date, 2, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-29'::date, 2, 'DEFENSA', 'Perfilación Defensiva'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Contraataque'),
    ('2026-09-29'::date, 4, 'CONDICIONAL', 'Partido Real'),
    ('2026-09-29'::date, 4, 'DEFENSA', 'Presión Colectiva')
),
target_tasks AS (
  SELECT 
    ptl.id AS library_id,
    ps.fecha,
    ptl.numero_tarea_pdf
  FROM public.planning_task_library ptl
  JOIN public.planning_sessions ps ON ps.id = ptl.sesion_origen_id
  WHERE ptl.aprobada = true
    AND ptl.sesion_origen_id IS NOT NULL
    AND ptl.numero_tarea_pdf IS NOT NULL
)
SELECT DISTINCT ad.fecha, ad.numero_tarea_pdf
FROM audited_data ad
LEFT JOIN target_tasks tt
  ON tt.fecha = ad.fecha
 AND tt.numero_tarea_pdf = ad.numero_tarea_pdf
WHERE tt.library_id IS NULL;
-- RESULTADO ESPERADO: 0 filas


-- ──────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 2: EJECUCIÓN DEL INSERT 100% ADITIVO E IDEMPOTENTE
-- ──────────────────────────────────────────────────────────────────────────────

WITH audited_data (fecha, numero_tarea_pdf, categoria, concepto) AS (
  VALUES
    ('2026-08-03'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-08-03'::date, 1, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-08-03'::date, 1, 'DEFENSA', 'Acoso'),
    ('2026-08-03'::date, 2, 'ATAQUE', 'Ataque Posicional'),
    ('2026-08-03'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-03'::date, 2, 'ATAQUE', 'Amplitud'),
    ('2026-08-03'::date, 2, 'ATAQUE', 'Profundidad'),
    ('2026-08-03'::date, 3, 'ATAQUE', 'Ataque Posicional'),
    ('2026-08-03'::date, 3, 'DEFENSA', 'Basculación'),
    ('2026-08-03'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-08-03'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-03'::date, 3, 'DEFENSA', 'Achicar Espacios'),
    ('2026-08-04'::date, 1, 'DEFENSA', 'Duelo 1v1'),
    ('2026-08-04'::date, 1, 'ATAQUE', 'Conservación de Balón'),
    ('2026-08-04'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Cierre de Líneas de Pase'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Basculación'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Bloque Defensivo'),
    ('2026-08-04'::date, 2, 'DEFENSA', 'Interceptación'),
    ('2026-08-04'::date, 3, 'DEFENSA', 'Bloque Defensivo'),
    ('2026-08-04'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-08-04'::date, 3, 'DEFENSA', 'Basculación'),
    ('2026-08-04'::date, 3, 'DEFENSA', 'Bloque Bajo'),
    ('2026-08-05'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-08-05'::date, 1, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-08-05'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-05'::date, 2, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-08-05'::date, 2, 'TRANSICIONES', 'Contraataque'),
    ('2026-08-05'::date, 2, 'TRANSICIONES', 'Repliegue'),
    ('2026-08-06'::date, 1, 'DEFENSA', 'Basculación'),
    ('2026-08-06'::date, 1, 'ATAQUE', 'Juego Interior'),
    ('2026-08-06'::date, 2, 'ABP', 'Despeje Aéreo (Defensivo)'),
    ('2026-08-06'::date, 2, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-08-06'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-08-06'::date, 2, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Amplitud'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Superioridad Ofensiva'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Cambio de Orientación'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-08-06'::date, 3, 'ATAQUE', 'Juego Interior'),
    ('2026-08-07'::date, 1, 'MENTAL', 'Velocidad de Reacción'),
    ('2026-08-07'::date, 1, 'MENTAL', 'Toma de Decisiones'),
    ('2026-08-07'::date, 1, 'MENTAL', 'Cohesión Grupal'),
    ('2026-08-07'::date, 2, 'ABP', 'Juego Aéreo'),
    ('2026-08-07'::date, 2, 'ATAQUE', 'Remate de Cabeza (Ofensivo)'),
    ('2026-08-07'::date, 2, 'ABP', 'Despeje Aéreo (Defensivo)'),
    ('2026-08-07'::date, 2, 'MENTAL', 'Coordinación'),
    ('2026-08-07'::date, 3, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-08-07'::date, 3, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-08-07'::date, 3, 'ATAQUE', 'Centros al Área'),
    ('2026-08-07'::date, 4, 'ATAQUE', 'Llegada de Segunda Línea'),
    ('2026-08-07'::date, 4, 'ATAQUE', 'Ocupación de Zonas de Remate'),
    ('2026-08-07'::date, 4, 'ATAQUE', 'Centros al Área'),
    ('2026-08-07'::date, 5, 'DEFENSA', 'Presión Alta'),
    ('2026-09-03'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-03'::date, 3, 'ATAQUE', 'Amplitud'),
    ('2026-09-03'::date, 3, 'ATAQUE', 'Profundidad'),
    ('2026-09-03'::date, 3, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-03'::date, 3, 'DEFENSA', 'Bloque Medio'),
    ('2026-09-03'::date, 3, 'ATAQUE', 'Salida de Balón'),
    ('2026-09-08'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-08'::date, 1, 'ATAQUE', 'Cambio de Orientación'),
    ('2026-09-08'::date, 1, 'DEFENSA', 'Reducción de Intervalos'),
    ('2026-09-08'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-08'::date, 2, 'ATAQUE', 'Amplitud'),
    ('2026-09-08'::date, 2, 'DEFENSA', 'Basculación'),
    ('2026-09-08'::date, 2, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-09-08'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-08'::date, 3, 'ABP', 'Segunda Jugada'),
    ('2026-09-08'::date, 3, 'ATAQUE', 'Juego Directo'),
    ('2026-09-08'::date, 3, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-08'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-09-10'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-10'::date, 1, 'ATAQUE', 'Amplitud'),
    ('2026-09-10'::date, 1, 'ATAQUE', 'Estructura Posicional'),
    ('2026-09-10'::date, 1, 'DEFENSA', 'Basculación'),
    ('2026-09-10'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-10'::date, 2, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-09-10'::date, 2, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-10'::date, 2, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-10'::date, 3, 'ABP', 'Juego Aéreo'),
    ('2026-09-10'::date, 3, 'ABP', 'Segunda Jugada'),
    ('2026-09-10'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-09-10'::date, 3, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-10'::date, 4, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-10'::date, 4, 'DEFENSA', 'Basculación'),
    ('2026-09-10'::date, 4, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-10'::date, 4, 'ATAQUE', 'Líneas de Pase'),
    ('2026-09-11'::date, 1, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-11'::date, 1, 'ATAQUE', 'Combinación Rápida'),
    ('2026-09-11'::date, 1, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-11'::date, 2, 'ATAQUE', 'Llegada de Segunda Línea'),
    ('2026-09-11'::date, 2, 'ATAQUE', 'Centros al Área'),
    ('2026-09-11'::date, 2, 'ATAQUE', 'Ocupación de Zonas de Remate'),
    ('2026-09-15'::date, 1, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-15'::date, 1, 'MENTAL', 'Toma de Decisiones'),
    ('2026-09-15'::date, 2, 'DEFENSA', 'Presión'),
    ('2026-09-15'::date, 2, 'ATAQUE', 'Conservación de Balón'),
    ('2026-09-15'::date, 3, 'DEFENSA', 'Presión'),
    ('2026-09-15'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-15'::date, 3, 'ATAQUE', 'Finalización'),
    ('2026-09-15'::date, 4, 'ATAQUE', 'Finalización'),
    ('2026-09-15'::date, 4, 'ATAQUE', 'Progresión'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Conservación de Balón'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Amplitud'),
    ('2026-09-17'::date, 1, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-17'::date, 2, 'ATAQUE', 'Ataque Posicional'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Desdoblamiento'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Finalización'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Centros al Área'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-17'::date, 3, 'ATAQUE', 'Superioridad Numérica'),
    ('2026-09-17'::date, 4, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-17'::date, 4, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-17'::date, 4, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-17'::date, 4, 'DEFENSA', 'Bloque Defensivo'),
    ('2026-09-18'::date, 1, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-18'::date, 1, 'ATAQUE', 'Finalización'),
    ('2026-09-18'::date, 1, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-09-18'::date, 2, 'ATAQUE', 'Centros al Área'),
    ('2026-09-18'::date, 2, 'ATAQUE', 'Llegada de Segunda Línea'),
    ('2026-09-18'::date, 2, 'ATAQUE', 'Tiro a Puerta'),
    ('2026-09-22'::date, 1, 'ATAQUE', 'Ocupación de Espacios'),
    ('2026-09-22'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-22'::date, 1, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-22'::date, 2, 'ATAQUE', 'Desmarques de Apoyo'),
    ('2026-09-22'::date, 2, 'ATAQUE', 'Amplitud'),
    ('2026-09-22'::date, 2, 'ATAQUE', 'Movilidad'),
    ('2026-09-22'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-22'::date, 3, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-09-22'::date, 4, 'ATAQUE', 'Estructura de Juego'),
    ('2026-09-22'::date, 4, 'ATAQUE', 'Ocupación de Espacios'),
    ('2026-09-22'::date, 4, 'ATAQUE', 'Relaciones entre Líneas'),
    ('2026-09-24'::date, 1, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-24'::date, 1, 'ATAQUE', 'Atracción por Posesión'),
    ('2026-09-24'::date, 1, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-24'::date, 1, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-24'::date, 2, 'ABP', 'Duelo Aéreo'),
    ('2026-09-24'::date, 2, 'DEFENSA', 'Defensa de Centros'),
    ('2026-09-24'::date, 2, 'ABP', 'Segunda Jugada'),
    ('2026-09-24'::date, 2, 'DEFENSA', 'Temporización Defensiva'),
    ('2026-09-24'::date, 3, 'ATAQUE', 'Salida de Balón'),
    ('2026-09-24'::date, 3, 'DEFENSA', 'Bloque Bajo'),
    ('2026-09-24'::date, 3, 'DEFENSA', 'Bloque Medio'),
    ('2026-09-24'::date, 3, 'DEFENSA', 'Presión Alta'),
    ('2026-09-24'::date, 3, 'ATAQUE', 'Amplitud'),
    ('2026-09-24'::date, 3, 'ATAQUE', 'Profundidad'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Centros al Área'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Remate de Cabeza (Ofensivo)'),
    ('2026-09-25'::date, 1, 'ABP', 'Despeje Aéreo (Defensivo)'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Desmarques de Ruptura'),
    ('2026-09-25'::date, 1, 'ATAQUE', 'Ocupación de Zonas de Remate'),
    ('2026-09-25'::date, 2, 'MENTAL', 'Competición'),
    ('2026-09-25'::date, 2, 'MENTAL', 'Toma de Decisiones'),
    ('2026-09-25'::date, 2, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-25'::date, 2, 'CONDICIONAL', 'Juego Reducido'),
    ('2026-09-29'::date, 1, 'DEFENSA', 'Duelo 1v1'),
    ('2026-09-29'::date, 2, 'ATAQUE', 'Tercer Hombre'),
    ('2026-09-29'::date, 2, 'ATAQUE', 'Cambio de Orientación'),
    ('2026-09-29'::date, 2, 'TRANSICIONES', 'Presión Tras Pérdida (PTP)'),
    ('2026-09-29'::date, 2, 'DEFENSA', 'Perfilación Defensiva'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Transición Ofensiva'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Transición Defensiva'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Repliegue'),
    ('2026-09-29'::date, 3, 'TRANSICIONES', 'Contraataque'),
    ('2026-09-29'::date, 4, 'CONDICIONAL', 'Partido Real'),
    ('2026-09-29'::date, 4, 'DEFENSA', 'Presión Colectiva')
),
resolved_relations AS (
  SELECT
    tt.id AS library_id,
    ad.categoria,
    ad.concepto,
    'Aitor' AS aprobado_por,
    '2026-10-06 12:59:00+00'::timestamptz AS aprobado_at,
    now() AS created_at
  FROM audited_data ad
  JOIN public.planning_sessions ps 
    ON ps.fecha = ad.fecha
  JOIN public.planning_task_library tt 
    ON tt.sesion_origen_id = ps.id
   AND tt.numero_tarea_pdf = ad.numero_tarea_pdf
  WHERE tt.aprobada = true  -- EXCLUSIÓN ESTRICTA: Solo tareas aprobadas
)
INSERT INTO public.planning_task_library_concepts (
  library_id,
  categoria,
  concepto,
  aprobado_por,
  aprobado_at,
  created_at
)
SELECT
  library_id,
  categoria,
  concepto,
  aprobado_por,
  aprobado_at,
  created_at
FROM resolved_relations
ON CONFLICT (library_id, categoria, concepto) DO NOTHING;


-- ──────────────────────────────────────────────────────────────────────────────
-- SECCIÓN 3: CONSULTAS DE COMPROBACIÓN POSTERIOR (AUDITORÍA FINAL)
-- ──────────────────────────────────────────────────────────────────────────────

-- 3.1. Total de relaciones insertadas en planning_task_library_concepts
SELECT 
  COUNT(*) AS total_relaciones_actuales
FROM public.planning_task_library_concepts;
-- RESULTADO ESPERADO: 168


-- 3.2. Número de tareas distintas con conceptos aprobados
SELECT 
  COUNT(DISTINCT library_id) AS tareas_con_conceptos
FROM public.planning_task_library_concepts;
-- RESULTADO ESPERADO: 50


-- 3.3. Número de conceptos canónicos distintos cubiertos
SELECT 
  COUNT(DISTINCT concepto) AS conceptos_distintos_cubiertos,
  COUNT(DISTINCT categoria) AS categorias_cubiertas
FROM public.planning_task_library_concepts;
-- RESULTADO ESPERADO: conceptos_distintos_cubiertos = 61, categorias_cubiertas = 6


-- 3.4. Distribución por categoría taxonómica
SELECT 
  categoria,
  COUNT(*) AS num_relaciones,
  COUNT(DISTINCT concepto) AS conceptos_en_categoria
FROM public.planning_task_library_concepts
GROUP BY categoria
ORDER BY num_relaciones DESC;
-- RESULTADO ESPERADO:
-- ATAQUE:        80 relaciones
-- TRANSICIONES:  37 relaciones
-- DEFENSA:       33 relaciones
-- ABP:            9 relaciones
-- MENTAL:         7 relaciones
-- CONDICIONAL:    2 relaciones


-- 3.5. Comprobación de seguridad 1: tareas aprobadas sin conceptos (debe ser exactamente 1: 2026-09-03_T2)
SELECT 
  ptl.id AS library_id,
  ptl.nombre,
  ps.fecha,
  ptl.numero_tarea_pdf
FROM public.planning_task_library ptl
JOIN public.planning_sessions ps ON ps.id = ptl.sesion_origen_id
LEFT JOIN public.planning_task_library_concepts ptlc ON ptlc.library_id = ptl.id
WHERE ptl.aprobada = true
  AND ptlc.id IS NULL;
-- RESULTADO ESPERADO: Exactamente 1 fila:
-- library_id = 'e5be2d44-3d87-4642-a238-ac0913d94444'
-- nombre = '11 VS 11'
-- fecha = '2026-09-03'
-- numero_tarea_pdf = 2
-- (La única tarea aprobada sin conceptos debe ser 2026-09-03_T2 '11 VS 11')


-- 3.6. Comprobación de seguridad 2: borradores con conceptos (DEBE SEGUIR SIENDO 0)
SELECT 
  ptl.id,
  ptl.nombre,
  COUNT(ptlc.id) AS conceptos_asociados
FROM public.planning_task_library ptl
JOIN public.planning_task_library_concepts ptlc ON ptlc.library_id = ptl.id
WHERE ptl.aprobada = false
GROUP BY ptl.id, ptl.nombre;
-- RESULTADO ESPERADO: 0 filas (el borrador nº 52 sigue con 0 conceptos y sin tocar)
