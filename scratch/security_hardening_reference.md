# Referencia de Seguridad: Fase de Endurecimiento RLS (Supabase)

Este documento sirve como referencia para la futura fase de endurecimiento de seguridad al finalizar la versión 1.0 de Athletic IA. Detalla el orden de prioridad y las políticas RLS recomendadas para las 7 tablas detectadas con políticas públicas permisivas de escritura.

---

## Plan de Implementación de Seguridad (Fase RLS)

### 1. `player_injuries` (Lesiones de Jugadores)
*   **Prioridad:** **Crítica**
*   **Uso:** Historial clínico y lesiones de los jugadores.
*   **Riesgo actual:** Modificación/borrado público de diagnósticos e información médica sensible de menores.
*   **Política recomendada:**
    *   `SELECT`: Permitir lectura pública (`USING (true)`).
    *   `INSERT`, `UPDATE`, `DELETE`: Sin políticas públicas. Escritura exclusivamente vía RPC proxy seguro (`exec_secure_bulk_upsert`).
*   **Impacto en la app:** Nulo. El hook `usePlayerInjuries.ts` ya utiliza la función RPC.

### 2. `user_profiles` (Perfiles de Usuario)
*   **Prioridad:** **Alta**
*   **Uso:** Asignación de roles al personal del Staff.
*   **Riesgo actual:** Elevación de privilegios de usuario (hacerse pasar por Administrador o Entrenador).
*   **Política recomendada:**
    *   `SELECT`: Filtrado por ID del usuario autenticado (`auth.uid() = id`).
    *   `INSERT`, `UPDATE`, `DELETE`: Sin políticas públicas directas (restringido a RPC).

### 3. `audit_logs` (Registro de Auditoría)
*   **Prioridad:** **Alta**
*   **Uso:** Trazabilidad automática de cambios realizados por el staff.
*   **Riesgo actual:** Borrado de huellas de accesos/acciones maliciosas; saturación de espacio por inserción de logs basura.
*   **Política recomendada:**
    *   `SELECT`: Lectura privada (sólo Admin).
    *   `INSERT`: Permitir inserción automática controlada mediante un disparador de base de datos (`SECURITY DEFINER`).
    *   `UPDATE`, `DELETE`: Denegar completamente para todos (logs inmutables).

### 4. `planning_session_versions` (Versionado de Sesiones)
*   **Prioridad:** **Media**
*   **Uso:** Historial de versiones y copias de seguridad de entrenamientos.
*   **Riesgo actual:** Pérdida de integridad de los respaldos de sesiones; restauración de configuraciones de entrenamiento inválidas.
*   **Política recomendada:**
    *   `SELECT`: Lectura pública.
    *   `INSERT`, `UPDATE`, `DELETE`: Canalizar a través de llamadas seguras RPC proxy.

### 5. `ia_library` (Biblioteca de Ejercicios IA)
*   **Prioridad:** **Media**
*   **Uso:** Ejercicios y contenido táctico sugerido por Inteligencia Artificial.
*   **Riesgo actual:** Vandalismo o eliminación del conocimiento táctico compartido del staff.
*   **Política recomendada:**
    *   `SELECT`: Lectura pública (`USING (true)`).
    *   `INSERT`, `UPDATE`, `DELETE`: Modificaciones restringidas a RPC seguro con clave staff.

### 6. `teams` (Equipos)
*   **Prioridad:** **Baja**
*   **Uso:** Configuración básica de equipos (nombre, escudo).
*   **Riesgo actual:** Edición pública no autorizada del nombre del club, categoría o imágenes del escudo del equipo.
*   **Política recomendada:**
    *   `SELECT`: Lectura pública (`USING (true)`).
    *   `INSERT`, `UPDATE`, `DELETE`: Sin políticas de modificación pública directa (exclusivo vía RPC proxy).

### 7. `seasons` (Temporadas)
*   **Prioridad:** **Baja**
*   **Uso:** Configuración de temporadas de juego (ej. "2026/27").
*   **Riesgo actual:** Modificación o desconfiguración de las fechas de la temporada activa.
*   **Política recomendada:**
    *   `SELECT`: Lectura pública (`USING (true)`).
    *   `INSERT`, `UPDATE`, `DELETE`: Modificaciones restringidas a RPC seguro con clave staff.
