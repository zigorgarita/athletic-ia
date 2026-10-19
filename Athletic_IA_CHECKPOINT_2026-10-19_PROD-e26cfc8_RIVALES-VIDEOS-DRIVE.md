# Athletic IA — Punto de Recuperación y Checkpoint de Producción
**Fecha:** 19 de Octubre de 2026  
**Entorno:** Producción (`main`)  
**Commit SHA Funcional Integrado:** `e26cfc8629caea5ec65aebcf405cce2ff1758c5a` (`e26cfc8`)  
**URL Canónica de Producción:** [https://athletic-ia.vercel.app](https://athletic-ia.vercel.app)  
**URL Despliegue Vercel:** `https://athletic-9dcvd3uab-zigorgaritas-projects.vercel.app`  
**Estado Vercel:** `● Ready` (Production) — Código HTTP `200 OK`

---

## 1. Resumen Ejecutivo del Bloque: Rivales — Guardado Canónico de Vídeos en Google Drive

Se ha integrado y promovido a Producción el ajuste mínimo y retrocompatible para la organización documental canónica de vídeos de rivales:

1. **Ruta Canónica de Destino para Nuevos Vídeos y Cortes:**
   - A partir de este ajuste, cualquier nuevo vídeo subido desde la pestaña de vídeos del rival se aloja automáticamente en:
     `APP INDAUTXU - VIDEOS / 2026-27 / 02_RIVALES / <RIVAL> / Videos`
   - El árbol canónico de un rival en Google Drive queda formalizado como:
     ```text
     02_RIVALES/
     └── <RIVAL>/
         ├── Informes/      <-- Informes tácticos, PDFs y análisis
         ├── Videos/        <-- NUEVOS vídeos y cortes tácticos
         └── PLANTILLA/     <-- Hojas de partido, convocatorias, OCR
     ```

2. **Inmutabilidad de Material Histórico:**
   - **Vídeos históricos:** Se mantienen intactos en la raíz del rival sin mover, renombrar ni alterar, y siguen reproduciéndose con total normalidad a través de su `drive_file_id` mediante el endpoint de streaming.
   - **Informes y PDFs históricos:** Intactos en `Informes` y en `public.club_documents`.
   - **Enlaces externos:** Enlaces a plataformas de vídeo externas (YouTube, Veo) continúan 100% operativos.
   - **Cero borrados:** Cumplimiento riguroso de la directriz *"SIEMPRE SUMAR. NUNCA BORRAR. NUNCA PERDER DATOS"*.

3. **Cero SQL:**
   - No se ha requerido ninguna modificación de esquema ni ejecución de sentencias SQL en base de datos.

4. **Componente Modificado:**
   - [VideosTab.tsx](file:///c:/Users/zigor/Desktop/indautxu-26-27/components/rivales/tabs/VideosTab.tsx): Se añadió `subCategory: 'Videos'` al `uploadContext` del incorporador universal `VideoUploader`.

---

## 2. Verificaciones Técnicas y Calidad de Software

- **Compilación TypeScript (`tsc --noEmit`):** 0 errores (`exit code 0`).
- **Build Local de Producción (`next build`):** 0 errores (`exit code 0`), 46 páginas estáticas y dinámicas optimizadas.
- **Despliegue Vercel:** Estado `● Ready` (Production) — Código HTTP `200 OK`.
- **SQL Adicional:** Cero scripts ejecutados en este despliegue.

---

*Athletic Club / SD Indautxu Juvenil DH 2026/27 — SIEMPRE SUMAR. NUNCA BORRAR. NUNCA PERDER DATOS.*
