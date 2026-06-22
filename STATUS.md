# Estado del Proyecto - Punto de Restauración Estable

Documentación del estado del proyecto tras completar la mejora del Módulo ABP.

## 📌 Identificación de la Versión
- **Último Commit**: `3784138` (feat: mejora modulo abp - jugadores al lado del campo)
- **Etiqueta Git (Tag)**: `ABP_DRAG_DROP_V1`
- **Fecha**: 2026-06-22
- **Estado**: Estable y verificado funcionalmente.

## 💻 Funcionalidades Verificadas (Módulo ABP)
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

## ☁️ Estado de los Servicios
- **Base de Datos (Supabase)**: Conexión activa. La tabla `abp_player_roles` almacena correctamente la información posicionada.
- **Despliegue (Vercel)**: Compilado correctamente y sincronizado a partir de la rama `main` en la etiqueta `ABP_DRAG_DROP_V1`.
