# Reglas de Desarrollo del Proyecto Indautxu 26/27

Este archivo define las directrices y normas acordadas con el usuario para el desarrollo de la aplicación.

## Flujo de Trabajo y Commits

- **No realizar commit ni push automáticos**: Al terminar de implementar los cambios de un bloque o requerimiento, primero se debe presentar el resultado al usuario para su revisión visual e indicarle qué archivos se han modificado.
- **Esperar aprobación explícita**: No realizar confirmaciones en Git ni avanzar al siguiente bloque sin la validación previa del usuario.

## Principios de Diseño y UX

- **Tarjetas y Vistas Limpias**: Las tarjetas de partido (`MatchCard`) y componentes visuales deben mantenerse lo más simples y legibles posible.
- **Indicadores discretos**: Los iconos de estado (Informes, Vídeos, Fotos, Documentos, ABP, Eventos) deben ser discretos y no saturar visualmente el espacio, priorizando siempre la legibilidad.

## Arquitectura de Software

- **Escalabilidad**: Diseñar y construir componentes altamente reutilizables y fácilmente extensibles para dar soporte al futuro crecimiento de la aplicación con nuevos módulos y pestañas.
- **Pensar como Arquitecto antes que Desarrollador**: Cada decisión debe cumplir los siguientes principios:
  - Reutilizar componentes siempre que sea posible.
  - Evitar duplicar código.
  - Mantener una arquitectura modular.
  - Diseñar pensando en el crecimiento futuro de Athletic IA.
  - Si un componente puede servir para Liga, Amistosos, Copa, Torneos u otros módulos, diseñarlo para reutilizarse.
  - Separar la lógica de negocio de la presentación visual.
  - Priorizar el mantenimiento a largo plazo antes que una solución rápida.
- **Análisis previo obligatorio**: Antes de comenzar cada bloque, detallar brevemente:
  - Qué archivos se van a modificar.
  - Qué componentes nuevos se crearán.
  - Qué componentes se reutilizarán.
  - Qué partes de la aplicación NO se verán afectadas.
- **Extensión frente a Reemplazo**: Antes de modificar cualquier componente existente, evaluar siempre si es más conveniente extenderlo que reemplazarlo:
  - No se sustituirá un componente funcional únicamente por razones estéticas.
  - Priorizar: extender, reutilizar y encapsular antes que reescribir.
  - Solo se permitirá una reescritura completa cuando exista una justificación técnica clara y se apruebe previamente.

## Organización Documental de Rivales en Google Drive

- **Ruta Canónica Obligatoria:** A partir de la temporada 2026/27, cualquier trabajo documental de un rival debe guardarse bajo:
  `APP INDAUTXU - VIDEOS / 2026-27 / 02_RIVALES / <NOMBRE_RIVAL>/`
- **Carpeta de Plantilla:** Para trabajos de plantilla e informes de plantilla, utilizar o crear exclusivamente:
  `<NOMBRE_RIVAL>/PLANTILLA`
- **Reutilización y Cero Duplicados:** Reutilizar siempre las carpetas existentes antes de crear nuevas, evitando estrictamente crear estructuras paralelas o carpetas duplicadas.
- **Preservación e Inmutabilidad de Contenidos Existentes:** Respetar rigurosamente todo el contenido y archivos que ya existan. Está terminantemente prohibido borrar, sustituir, sobrescribir o reorganizar carpetas o documentos existentes sin autorización expresa previa del usuario.
- **Estándar Universal:** Esta jerarquía es el estándar oficial para todos los rivales de Juvenil División de Honor 2026/27.


