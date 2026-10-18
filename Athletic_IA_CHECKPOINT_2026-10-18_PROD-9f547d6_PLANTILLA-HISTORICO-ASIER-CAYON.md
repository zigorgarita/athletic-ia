# Athletic IA — Punto de Recuperación y Checkpoint de Producción
**Fecha:** 18 de Octubre de 2026  
**Entorno:** Producción (`main`)  
**Commit SHA:** `9f547d60e6f6a7ae4fa6a1ea034d65be0a0aaae3` (`9f547d6`)  
**URL Canónica de Producción:** [https://athletic-ia.vercel.app](https://athletic-ia.vercel.app)  
**URL Despliegue Vercel:** `https://athletic-rlr2uiaut-zigorgaritas-projects.vercel.app`  

---

## 1. Resumen Ejecutivo del Bloque

Se ha implementado e integrado en Producción la arquitectura definitiva de gestión de plantilla, bajas lógicas y archivo histórico (V1):
1. **Columna `activo` en base de datos:**  
   Se incorporó `activo BOOLEAN NOT NULL DEFAULT true` en la tabla `public.players`.
2. **Plantilla Activa segregada:**  
   La vista principal muestra exclusivamente a los futbolistas activos (`activo = true`), alcanzando un total de **26 jugadores** (incluyendo el alta de Asier Cayón).
3. **Pestaña secundaria Histórico / Bajas:**  
   Pestaña no activa por defecto que lista únicamente los futbolistas con `activo = false` (**6 futbolistas**), permitiendo acceder a sus fichas históricas completas con todas sus evaluaciones, partidos y métricas preservadas.
4. **Baja lógica segura en API:**  
   La ruta `DELETE /api/players` transforma cualquier eliminación en una baja lógica (`activo: false`, `estado: 'Baja temporal'`), erradicando de forma definitiva cualquier borrado físico desde el flujo normal de la app.
5. **Restauración histórica de los 6 jugadores confirmados:**  
   - **Markel Arroyo** (`f4b19a54-2483-4469-a91d-e182353a4696`) — #1, Portero, DH, RFEF ID: `24521512`.
   - **Ibón Robles** (`5d37735a-b197-4664-8910-a1110706cd94`) — #3, Centrocampista, DH.
   - **Urko Chocarro** (`7787d8ad-3b56-49d9-b281-0a554cb646e8`) — #23, Defensa, Juvenil B.
   - **Aritz Fonseca** (`a8a582ec-c67a-48d9-a83c-d1d745a4492f`) — #24, Extremo, Juvenil B.
   - **Geovani Raigosa** (`53f1aa52-f7a0-4814-8f90-8f45031b6636`) — #25, Portero (corrección confirmada por Zigor), Juvenil B.
   - **Diego Tubia** (`fa5f3955-ee32-4cca-98a4-83894a44abf1`) — #27, Lateral, Juvenil B.
6. **Casos excluidos y preservados sin alterar:**  
   - **Neev Mogre:** Registros históricos y evaluaciones conservados intactos sin inventar fechas ficticias ni alterar restricciones NOT NULL.
   - **Jugador Torneo Leioa:** Pendiente y excluido.
7. **Alta oficial de Asier Cayón:**  
   - **Dorsal:** #30 (sin colisiones).
   - **Demarcación:** Portero.
   - **Equipo:** DH.
   - **Estado:** Disponible (activo = true).
   - **Fecha de nacimiento:** 2010-01-05.
   - **Pierna dominante:** Diestro (confirmado por Zigor).
   - **Foto oficial:** Alojada en `player-photos/asier_cayon.jpg` (`https://jdkshextphguyyiwwtyt.supabase.co/storage/v1/object/public/player-photos/asier_cayon.jpg`).

---

## 2. Auditoría del Estado de la Base de Datos

- **Total Jugadores en BD:** 32 futbolistas.
- **Total Jugadores Activos:** 26 futbolistas.
- **Total Jugadores en Histórico / Bajas:** 6 futbolistas.
- **Cero borrados físicos:** Cumplido 100%.

---

## 3. Verificaciones de Calidad de Software

- **Compilación TypeScript (`tsc --noEmit`):** 0 errores (`exit code 0`).
- **Build de Producción (`next build`):** 0 errores (`exit code 0`), 46 páginas estáticas optimizadas.
- **Despliegue Vercel:** Estado `● Ready`.
- **Respuesta HTTP Producción (`/plantilla`):** `200 OK`.

---

*Athletic Club / SD Indautxu Juvenil DH 2026/27 — SIEMPRE SUMAR. NUNCA BORRAR. NUNCA PERDER DATOS.*
