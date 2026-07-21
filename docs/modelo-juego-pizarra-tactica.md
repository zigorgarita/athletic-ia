# Especificación del Modelo de Juego en Pizarra Táctica
**S.D. Indautxu Juvenil A — División de Honor (2026-27)**

---

## 1. Objetivo de la Nueva Capa

Incorporar una **segunda capa de análisis táctico** en la pestaña *Pizarra Táctica* llamada **"Análisis según nuestro Modelo de Juego"**, que analice los partidos desde la identidad y doctrina de juego del S.D. Indautxu (1-4-2-3-1).

### ⚠️ Obligación Inviolable
- **Mantener intacta la IA genérica actual**: Toda la funcionalidad, comparador táctico actual (`TacticalAnalysisPanel`), briefing y acciones del asistente inteligente IA actual permanecen exactamente igual. No se modifica ni sustituye ningún análisis preexistente.

---

## 2. Arquitectura de Comprensión y Jerarquía

### Arquitectura de Comprensión
El modelo de juego no se procesa como un PDF dinámico e impredecible en tiempo de ejecución. Se codifica de forma determinista y estructurada en una ontología TypeScript (`lib/ai/gameModel.ts`). Esta estructura alimenta el motor de prompts (`lib/ai/prompts.ts`) y la abstracción de IA del proyecto (`lib/ai/provider.ts`), independizando el razonamiento de cualquier proveedor o modelo externo concreto.

```
[Documento PDF] -> [Ontología Estructurada (lib/ai/gameModel.ts)] -> [Prompt Engine (lib/ai/prompts.ts)] -> [Provider IA (lib/ai/provider.ts)] -> [GameModelAnalysisPanel.tsx]
```

### Jerarquía Inviolable de Prioridades

1. 🥇 **Prioridad 1 (Máxima)**: Instrucciones manuales introducidas por el Entrenador.
2. 🥈 **Prioridad 2**: Doctrina del Modelo de Juego Indautxu DH 1-4-2-3-1.
3. 🥉 **Prioridad 3**: Adaptación táctica al Matchup (Sistema propio vs Sistema rival).
4. 🏅 **Prioridad 4**: Conocimiento táctico genérico de la IA (solo para coherencia sintáctica sin contradecir a 1, 2 ni 3).

---

## 3. Matices Tácticos Fundamentales Corregidos

1. **Estructura en Repliegue**: La formación base permanente del equipo es el **1-4-2-3-1**. Dibujos como el 4-4-1-1 o 4-4-2 son **comportamientos adaptativos o variantes contextuales** según la altura del mediapunta y basculación de extremos, jamás un sustituto axiomático.
2. **Ventana de 6-8 Segundos Condicionada**: La presión tras pérdida durante 6-8'' es un marco de referencia. Solo se activa si se dan desencadenantes de **cercanía, coberturas activas, protección del carril interior y profundidad propia vigilada**. Si la presión es superada o no hay condiciones, se abandona la persecución e inmediatamente se repliega al bloque compacto.
3. **Ventajas Potenciales vs. Hechos Garantizados**: El 4v3 en inicio, el hallazgo del 3º hombre o la falta táctica son **ventajas potenciales a provocar o recursos contextuales**, no consecuencias automáticas ni respuestas garantizadas. Su eficacia depende de la colocación rival y ejecución técnica.

---

## 4. Ontología del Modelo de Juego Indautxu DH (1-4-2-3-1)

### 🔄 Las 4 Fases del Juego

#### A. Ataque Posicional
- *Premisa*: Iniciar para progresar rápido hacia portería (Mantener para progresar → Progresar para finalizar).
- *Principios*: Cambios de orientación y ritmo, equilibrio defensivo a través de soporte cercano, Cuadrado de Superioridad (Centrales + Pivotes), superioridad a la espalda del mediocampo rival.
- *Sub-subprincipios*:
  - **3º Hombre**: Superioridad numérica, socioafectiva, reconocer Hombre Libre (HL), presión de impares, dividir.
  - **Dividir**: Fijar rivales para liberar compañero, acumulación con relevo y descarga. Ante defensa zonal: juntar y girar, repetir y girar.

#### B. Transición Ataque-Defensa (Tras Pérdida)
- Presión tras pérdida condicional **6'' - 8''**.
- *Campo propio*: Obligar a jugar fuera.
- *Campo contrario*: Obligar a jugar dentro, lejos de portería.
- *Escape fácil rival*: Falta táctica contextual.
- *Repliegue*: Si no hay condiciones o pasaron 8'', repliegue aposicional e intensivo para recuperar posiciones de presión ordenadas en máximo 40m en estructura 1-4-2-3-1 (con comportamiento adaptativo compacto).

#### C. Defensa Posicional
- *Aspectos*: Agresivos en juego aéreo/terrestre, equipo junto no más de 40m, 4 líneas claras, pivotes en diagonal, siempre un jugador libre para coberturas. Marcaje y defensa mixta. Presión alta.
- *Pressing en Campo Rival*:
  - DC: entre 2 DFCs rivales, 2m por detrás.
  - EXT: entre DFC y lateral tapando ambas líneas de pase.
  - MCO: 8m detrás del DC, ajustando posición.
  - MCDs: emparejados con sus mediocentros.
  - DFCs: fijar al punta y librar uno para cobertura.
  - LAT: preparados para saltar a sus laterales.

#### D. Transición Defensa-Ataque (Tras Recuperación)
- **Criterio**: Contraataque si hay superioridad o igualdad hacia adelante; Mantener para progresar si hay inferioridad.
- **Zonas de Robo**:
  - *Iniciación*: Temporizar ataque según espacio y presión rival.
  - *Creación*: Acumular en banda de robo y buscar carril contrario/interior (soporte + desmarque de ruptura).
  - *Finalización*: Ataque directo y finalización rápida.

---

## 5. Roles por Puesto

- **Portero (POR)**: Valiente con los pies, fuera de portería. Mando directo sobre el equipo.
- **Centrales (DFC)**: Amplios en líneas dentro del área. Fijar y dividir para jugar lejos. En defensa: fijar delantero y librar uno.
- **Laterales (LD/LI)**: Altos y orientados para dar salida. Ofensivos, desdoblamientos. En defensa: duelo 1v1 y salto a laterales rivales.
- **Pivotes (MCD)**: Diferentes alturas. Apoyo diagonal en salida entre centrales. Alternancia defensivo/ofensivo.
- **Mediapunta (MCO)**: Triángulo con pivotes. Juego a la espalda de medios rivales. Venir para atraer.
- **Extremos (ED/EI)**: Amplios viniendo para atraer. Diferenciar cuándo jugar dentro y cuándo fuera.
- **Delantero (DC)**: Fijar centrales. Venir para descargar por dentro o fuera e irse.

---

## 6. Casos de Validación Estructurados

### 1. Matchup vs 1-4-3-3 (1 Punta)
- **Plan Colectivo**: Provocar superioridad en inicio con cuadrado DFCs+MCDs. MCO busca el 3º hombre a la espalda de sus interiores. Presión "no suelto" sobre su pivote único para que no gire.
- **Por Líneas**: POR salida limpia; DFCs 2v1 sobre DC rival; MCDs dominan centro; MCO fija a pivote rival; EXT tapan pasillo interior; DC orienta hacia banda.
- **Instrucciones Individuales**:
  - POR: *"Manda y vigila la espalda."*
  - DFC: *"Fija antes de pasar; un central libre para cobertura."*
  - LAT: *"Salto agresivo a su lateral si salta el balón."*
  - MCD: *"Escalonados; prohibido filtrar balones interiores."*
  - MCO: *"Pegado a su pivote, que no gire."*
  - EXT: *"Cierra pasillo interior y salta a banda."*
  - DC: *"Orienta salida entre sus dos centrales."*

### 2. Matchup vs 1-4-2-3-1 (Espejo)
- **Plan Colectivo**: Superioridad socioafectiva e incidir en fijar para dividir. Juntar en banda para girar al MCO libre. Duelos 1v1 en todas las líneas.
- **Por Líneas**: DFCs 2v2 atentos a desmarques del DC rival; MCDs escalonados a distintas alturas; MCO flota a la espalda del doble pivote rival; EXT alternan juego interior/exterior.
- **Instrucciones Individuales**:
  - POR: *"Salida en corto con DFC amplio."*
  - DFC: *"Un DFC fija a su punta; el otro libre para coberturas."*
  - LAT: *"Duelo 1v1 con su extremo."*
  - MCD: *"Emparejar con sus mediocentros."*
  - MCO: *"Triángulo con pivotes y recibir entre líneas."*
  - EXT: *"Atraer por fuera o romper por dentro."*
  - DC: *"Fija centrales y descarga al MCO."*

### 3. Matchup vs 1-3-5-2 (3 Centrales + 2 Carrileros + 2 Puntas)
- **Plan Colectivo**: Generar desequilibrio en las esquinas a la espalda de sus carrileros. Repetir y girar para mover su línea de 5 medios. En defensa, vigilancia del pivote defensivo sobre la caída de sus 2 puntas.
- **Por Líneas**: DFCs 2v2 fijando a sus puntas; MCDs emparejados con interiores rivales con un pivote en cobertura constante; MCO entre líneas a la espalda de sus medios; EXT a media altura entre central exterior y carrilero.
- **Instrucciones Individuales**:
  - POR: *"Domina envíos aéreos de sus carrileros."*
  - DFC: *"Fijad a sus dos puntas, comunicación total."*
  - LAT: *"Cierra carril interior y vigila su carrilero."*
  - MCD: *"Un pivote en vigilancia constante de coberturas."*
  - MCO: *"Busca pasillo interior entre sus 3 medios."*
  - EXT: *"Ataca la espalda de su carrilero."*
  - DC: *"Fija al central central y condiciona su salida."*

---

## 7. Persistencia y Actualización Futura

- **Persistencia**: El análisis del modelo de juego se almacena dentro de la columna `analisis_modelo_juego` (o `orientaciones_individuales` / `notas` tipado como JSON/Objeto) en la tabla `tactical_lineups` de Supabase a través del RPC `exec_secure_upsert`.
- **Mantenimiento**: Si se cambian principios en el futuro, solo se actualiza `lib/ai/gameModel.ts` o las entradas de la tabla `knowledge_entries`.

---

## 8. Mapeo de Archivos del Proyecto

| Rol | Archivo |
| :--- | :--- |
| **Ontología Fija** | `lib/ai/gameModel.ts` |
| **Motor de Prompts** | `lib/ai/prompts.ts` |
| **Componente Visual** | `components/tactica/analysis/GameModelAnalysisPanel.tsx` |
| **Tipos y Persistencia** | `types/index.ts`, `components/tactica/TacticaClient.tsx`, `app/api/tactical-ai/route.ts`, `hooks/useTacticalAI.ts` |
| **Pruebas de Validación** | `scratch/test_game_model_matchups.js` |
| **Extractor de Informes** | `app/api/rivales/analyze-document/route.ts` |
| **Revisión Humana** | `components/rivales/modals/ReviewExtractedReportModal.tsx` |
| **Tabla Observaciones** | `club_report_observations` (Supabase) |

---

## 9. Integración Flexible de Informes de Scouting del Rival

### A. Jerarquía Inviolable de Prioridades Definitiva
1. 🥇 **Prioridad 1 (Máxima)**: Instrucciones directas del Entrenador.
2. 🥈 **Prioridad 2**: Doctrina del Modelo de Juego Indautxu DH 1-4-2-3-1 (`lib/ai/gameModel.ts`).
3. 🥉 **Prioridad 3**: Contexto Actual del Partido (Nuestro sistema, sistema rival seleccionado en la Pizarra, alineación, posiciones y roles).
4. 🏅 **Prioridad 4**: Información Validada de los Informes Seleccionados para el Partido (`status = 'aprobado'`).
5. 🎖️ **Prioridad 5**: Conocimiento Táctico General de la IA (únicamente como complemento sintáctico).

> *Ejemplo*: Si un informe indica sistema 1-4-3-3 pero el entrenador selecciona el 1-4-4-2 para el partido, la IA analiza sobre el **1-4-4-2 elegido** y advierte que el informe contiene datos observados bajo un dibujo diferente. El informe jamás puede cambiar el sistema rival seleccionado para el partido.

### B. Esquema DDL Definitivo y Relaciones en Supabase

#### 1. Tabla de Observaciones (`club_report_observations`)
```sql
CREATE TABLE IF NOT EXISTS club_report_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES club_documents(id) ON DELETE SET NULL,
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  club_season_id UUID REFERENCES club_seasons(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_date DATE,
  rival_name TEXT,
  season TEXT,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('texto', 'imagen', 'tabla', 'nota')),
  page INTEGER,
  original_evidence TEXT,
  confidence TEXT NOT NULL CHECK (confidence IN ('alta', 'media', 'baja')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('baja', 'normal', 'alta', 'clave')),
  is_analyst_proposal BOOLEAN DEFAULT false,
  observed_match_id UUID REFERENCES scouting_matches(id) ON DELETE SET NULL,
  observation_date DATE,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. Tabla Relacional de Selección de Informes por Pizarra (`tactical_lineup_report_selections`)
```sql
CREATE TABLE IF NOT EXISTS tactical_lineup_report_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tactical_lineup_id UUID NOT NULL REFERENCES tactical_lineups(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES club_reports(id) ON DELETE CASCADE,
  selected BOOLEAN NOT NULL DEFAULT true,
  selected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  selected_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tactical_lineup_id, report_id)
);
```

### C. Almacenamiento de Versiones y Regla de Filtrado
1. `extraction_original`: RAW e inmutable entregado por la IA en la primera lectura (almacenado en `club_documents.extraccion_json`).
2. `version_revisada`: Ediciones realizadas por el cuerpo técnico en el modal de revisión.
3. `club_report_observations`: Observaciones individuales aprobadas.
4. **Regla de Filtrado en Pizarra**: `analyzeGameModel` lee **exclusivamente** observaciones con `status = 'aprobado'` de los informes vinculados con `selected = true` en `tactical_lineup_report_selections`. Nunca se inyectan datos RAW ni no aprobados.


