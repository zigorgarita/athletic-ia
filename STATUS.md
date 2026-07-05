# Estado del Proyecto - Punto de Restauración Estable

Documentación del estado del proyecto tras completar las mejoras.

## 📌 Identificación de la Versión
- **Último Commit**: `1c9478e` — Bloque 3 cerrado: Control de Asistencia validado y desplegado
- **Fecha**: 2026-07-02
- **Rama**: `main` → `github.com/zigorgarita/athletic-ia`
- **Producción**: https://athletic-ia.vercel.app
- **Estado**: Estable. Sin tareas pendientes. Listo para el Bloque 4.

## 💻 Funcionalidades Verificadas (Bloque 3 - Asistencia)
1. **Control de Presencia por Sesión**:
   - Selección de sesiones planificadas existentes por fecha.
   - Cambio de estado por jugador: Asiste, No asiste, Lesionado, Duda, Sancionado, Baja temporal.
   - Estado inicial inteligente: jugadores con estado "Lesionado" o "Duda" en ficha se pre-cargan automáticamente.
2. **Motivos de Ausencia**:
   - 11 motivos disponibles: Lesión, Enfermedad, Estudios, Trabajo, Permiso, Selección, Viaje, Decisión técnica, Motivo personal, Sin justificar, Otro.
   - Campo obligatorio cuando el estado es "No asiste".
   - Constraint actualizado en Supabase para incluir Permiso y Selección.
3. **Valoraciones de Entrenamiento**:
   - 6 métricas evaluables (Actitud, Intensidad, Comprensión Táctica, Ejecución Técnica, Compromiso Defensivo, Compromiso Ofensivo).
   - Media global calculada automáticamente.
   - Se guardan solo para jugadores con estado "Asiste".
4. **Persistencia Segura (Supabase + RPC)**:
   - Guardado via RPC `exec_secure_bulk_upsert` con passkey de staff.
   - Upsert idempotente: re-guardar la misma sesión actualiza los registros existentes.
   - Backups de nombre y dorsal preservados en histórico.
   - Test RPC exitoso: `exec_secure_bulk_upsert` en `training_evaluations` retorna `true`.
5. **Resumen de Plantilla (Pestaña "Resumen Semanal")**:
   - Tabla de estadísticas históricas de asistencia por jugador.
   - % de asistencia (excluyendo Lesionados y Bajas temporales del denominador).
   - Media de valoración global por jugador.
   - Filtros por búsqueda de nombre, demarcación y rango de asistencia.
   - Ordenación por nombre, total, asistencias o valoración.
6. **UI en Solo Lectura**:
   - Todos los controles de asistencia y evaluación respetan el modo de solo lectura global.

## 💻 Funcionalidades Verificadas (Bloque 2 - Planificación)
1. **Unificación de Lógica de Fechas y Timezone**:
   - Centralizado el cálculo de calendarios semanal y mensual en [dateUtils.ts](file:///c:/Users/zigor/Desktop/indautxu-26-27/lib/dateUtils.ts) operando localmente para evitar desplazamientos por diferencia de zona horaria (UTC/Local).
2. **Editor Completo de Ejercicios**:
   - Pestaña interactiva de Ejercicios en tiempo real que permite crear, editar minutos/jugadores/espacio/staff/descripción, eliminar y reordenar el listado de tareas de la sesión con flechas de ordenación física.
   - Integrado el modal táctico real [BibliotecaTareasModal.tsx](file:///c:/Users/zigor/Desktop/indautxu-26-27/components/planificacion/BibliotecaTareasModal.tsx) para importar ejercicios permanentes.
3. **Gestión e Integración de PDFs**:
   - Carga directa de archivos PDF en Supabase Storage (bucket `match-videos`, subcarpeta `planning-pdfs`).
   - Asociación permanente de la URL pública del PDF a la sesión dentro del campo `evaluacion_observaciones`.
   - Visor/botón para abrir el documento directamente desde cualquier dispositivo.
4. **Resumen de Conceptos en Calendario**:
   - Registro estructurado de conceptos (Ataque, Defensa, Transiciones, ABP, Condicional, Mental) en la tabla `planning_concepts`.
   - Visualización abreviada (máximo 3) en cada celda del calendario mensual y en su tooltip flotante.
5. **Permisos de UI en Solo Lectura**:
   - Desactivación de todos los campos interactivos de datos básicos, editor de tareas y evaluaciones cuando el Modo Edición está apagado.

## 💻 Funcionalidades Verificadas (Bloque 1 - Plantilla 360º)
1. **Posición Secundaria Unificada**:
   - Selector `<Select>` unificado con las opciones de la posición principal en el formulario de jugador y edición inline.
   - Compatibilidad hacia atrás incorporada que detecta y respeta valores de texto libre históricos agregando la opción `Otros: [Valor]`.
2. **Visualización de Demarcaciones**:
   - Mayor contraste y saturación en badges de posiciones en modo oscuro.
   - Integración visual de la posición secundaria directamente en el listado general de plantilla.
3. **Estadísticas Independientes**:
   - Separación estricta de medias de rendimiento para Entrenamientos, Partidos Oficiales (Liga/Copa) y Partidos Amistosos.
   - Selector estructurado para tipo de competición al registrar nuevas observaciones para evitar errores de tipeo.
4. **Módulo de Reuniones (Hub 360º)**:
   - Nueva pestaña "Reuniones" en el detalle de jugador con feed cronológico.
   - Formulario de registro en modo edición con campos extensibles preparados para crecimiento (participantes, adjuntos, firmas, recordatorios).
   - *(Pendiente de ejecución de script SQL `create_meetings_table.sql` para habilitar el guardado final).*
5. **Agrupamiento en Pizarras**:
   - Clasificación y ordenamiento automático por demarcaciones en las barras laterales de selección en el módulo ABP y Pizarra Táctica (Porteros, Laterales, Centrales, Centrocampistas, Mediapuntas, Extremos, Delanteros) ordenados por dorsal.

## 💻 Funcionalidades Verificadas (Módulo ABP previo)
1. **Distribución Visual en 3 Columnas**:
   - Pizarra táctica del campo a la izquierda.
   - Lista/Sidebar de jugadores fija al lado del campo en el centro.
   - Panel de puestos y roles a la derecha.
   - Instrucciones y vídeo desplazados a la parte inferior.
2. **Plantilla de Jugadores Lateral**:
   - Visualización con foto, nombre, dorsal, demarcación y estado de disponibilidad.
   - Búsqueda textual y filtro por posición.
   - Pestañas de filtrado: TODOS, LIBRES y USADOS.
3. **Mecanismo de Drag & Drop**:
   - Arrastrar desde la barra lateral al campo (crea un puesto en coordenadas x/y si cae en vacío, o asigna si cae sobre ficha existente).
   - Mover fichas dentro del campo reposicionándolas libremente.
   - Arrastrar fichas de vuelta a la barra de jugadores para liberar al jugador.
   - Botón "X" en la ficha del campo para desasignar rápidamente.
4. **Sincronización y Roles**:
   - Selector directo de rol desde la ficha del campo con los 13 roles de juego activos.
   - Sincronización bidireccional entre la ficha del campo y el panel derecho.
5. **Persistencia (Supabase)**:
   - Guardado correcto de posiciones x/y, roles asignados, jugadores y comentarios al presionar "Guardar Cambios".

## 🗺️ Hoja de Ruta

| Bloque | Módulo | Estado |
|---|---|---|
| Bloque 1 | Plantilla 360º | ✅ Cerrado |
| Bloque 2 | Planificación | ✅ Cerrado |
| Bloque 3 | Asistencia | ✅ Cerrado |
| Bloque 4 | Evaluaciones, Biblioteca Táctica + IA | ✅ Cerrado |
| **Bloque 5** | **Perfil del Jugador & Ficha Profesional (5A y 5B)** | **✅ Cerrado** |
| Bloque 6 | Liga / Centro de Partidos | ⏳ Pendiente |

## ☁️ Estado de los Servicios
- **Base de Datos (Supabase)**: Conexión activa. Tablas de asistencia, evaluaciones y perfil de jugador completamente actualizadas.
- **Despliegue (Vercel)**: Producción activa en https://athletic-ia.vercel.app y https://indautxu2026.vercel.app
