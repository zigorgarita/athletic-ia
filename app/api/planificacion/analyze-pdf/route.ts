import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { isEditorSessionAuthorized, isEditorSessionAuthorizedFromRequest } from '@/lib/auth/session';
import { createProvider } from '@/lib/ai/provider';
import { downloadFileFromUrl, validateDocumentBuffer } from '@/lib/ai/document-parser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ──────────────────────────────────────────────────────────────────────────────
// TIPOS DE RESPUESTA — solo en memoria, 0 escrituras Supabase
// ──────────────────────────────────────────────────────────────────────────────
export type FieldConfianza = 'alta' | 'media' | 'baja' | 'no_detectado';

export interface DetectedField<T = string> {
  valor: T | null;
  confianza: FieldConfianza;
}

export interface GrupoJugadores {
  nombre: string;       // "ROJOS", "VERDES", "COMODINES · TAREA 1"
  color: string;        // "rojo", "verde", "amarillo", "azul", "neutro"
  jugadores: string[];
}

export interface PdfTaskDraft {
  numero_tarea: number;
  pagina_pdf?: DetectedField<number>;
  nombre: DetectedField<string>;
  tipo_tarea: DetectedField<string>;
  duracion_minutos: DetectedField<string>;     // texto libre literal: "20 min" | "4 series de 4-5 min"
  num_jugadores: DetectedField<string>;        // texto libre literal: "22" | "Grupos de 6-8 jugadores..."
  espacio: DetectedField<string>;
  objetivo: DetectedField<string>;
  organizacion: DetectedField<string>;
  desarrollo: DetectedField<string>;
  consignas: DetectedField<string[]>;
  transicion_tras_recuperacion: DetectedField<string>;
  transicion_tras_perdida: DetectedField<string>;
  conceptos_sugeridos: DetectedField<string[]>; // siempre confianza 'baja'
}

export interface PdfAnalysisResult {
  ok: true;
  titulo_sesion: string | null;
  num_tareas_detectadas: number;
  grupos_globales: GrupoJugadores[];
  tareas: PdfTaskDraft[];
}

export interface PdfAnalysisError {
  ok: false;
  error: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// PROMPT DE EXTRACCIÓN — JSON estricto, sin invención de datos
// ──────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres un asistente especializado en análisis de sesiones de entrenamiento de fútbol.
Recibirás un PDF de una sesión de entrenamiento. Tu única tarea es extraer la información estructurada que aparece EXPLÍCITAMENTE en el documento.

NORMAS ESTRICTAS:
- No inventes datos. Si un campo no aparece en el PDF, asigna confianza "no_detectado" y valor null.
- confianza "alta": el dato aparece textualmente en el PDF sin ambigüedad.
- confianza "media": el dato se puede inferir de forma razonada.
- confianza "baja": es una sugerencia basada en el contexto general, sin evidencia directa.
- Los conceptos_sugeridos SIEMPRE tendrán confianza "baja" aunque coincidan con el catálogo. Son sugerencias, no hechos.
- Para los grupos de jugadores de portada: extrae todos los equipos/grupos que aparezcan con sus listas de jugadores.
- Para tipo_tarea, usa únicamente: Calentamiento, Rondo, Posesión, Finalización, ABP, Técnica, Táctica, Físico, Partido condicionado, Juego Aéreo, Recuperación. Si no encaja exactamente, usa confianza "baja" con la opción más próxima.
- pagina_pdf: número de página física del PDF (1-indexed) donde comienza o se ubica esta tarea. Si no es determinable, valor null y confianza "no_detectado".
- duracion_minutos y num_jugadores: conserva el texto LITERAL EXACTO que aparece en el PDF (ej: "4 series de 4-5 minutos", "Grupos de 6-8 jugadores por repetición"). NUNCA fuerces ni reduzcas ese texto a un número único si hay series, rangos o grupos.
- Para consignas: extrae las consignas, reglas de provocación o normas del ejercicio que aparezcan en la tarea (ej: bajo encabezados "CONSIGNAS", "REGLAS", "NORMAS", etc.) como un array de strings. Cada elemento del array debe ser una consigna o regla individual.

Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta. Sin texto extra, sin markdown, sin comentarios:

{
  "titulo_sesion": string | null,
  "num_tareas_detectadas": number,
  "grupos_globales": [
    { "nombre": string, "color": string, "jugadores": string[] }
  ],
  "tareas": [
    {
      "numero_tarea": number,
      "pagina_pdf": { "valor": number | null, "confianza": "alta"|"media"|"baja"|"no_detectado" },
      "nombre": { "valor": string | null, "confianza": "alta"|"media"|"baja"|"no_detectado" },
      "tipo_tarea": { "valor": string | null, "confianza": "alta"|"media"|"baja"|"no_detectado" },
      "duracion_minutos": { "valor": string | null, "confianza": "alta"|"media"|"baja"|"no_detectado" },
      "num_jugadores": { "valor": string | null, "confianza": "alta"|"media"|"baja"|"no_detectado" },
      "espacio": { "valor": string | null, "confianza": "alta"|"media"|"baja"|"no_detectado" },
      "objetivo": { "valor": string | null, "confianza": "alta"|"media"|"baja"|"no_detectado" },
      "organizacion": { "valor": string | null, "confianza": "alta"|"media"|"baja"|"no_detectado" },
      "desarrollo": { "valor": string | null, "confianza": "alta"|"media"|"baja"|"no_detectado" },
      "consignas": { "valor": string[] | null, "confianza": "alta"|"media"|"baja"|"no_detectado" },
      "transicion_tras_recuperacion": { "valor": string | null, "confianza": "alta"|"media"|"baja"|"no_detectado" },
      "transicion_tras_perdida": { "valor": string | null, "confianza": "alta"|"media"|"baja"|"no_detectado" },
      "conceptos_sugeridos": { "valor": string[] | null, "confianza": "baja" }
    }
  ]
}`;

const USER_PROMPT = `Analiza este PDF de sesión de entrenamiento y extrae toda la información estructurada que puedas detectar. Sigue estrictamente las normas descritas. Devuelve solo el JSON.`;

// ──────────────────────────────────────────────────────────────────────────────
// HANDLER POST
// ──────────────────────────────────────────────────────────────────────────────
export async function POST(req: Request): Promise<NextResponse<PdfAnalysisResult | PdfAnalysisError>> {
  // 1. Autenticación
  try {
    const authorized =
      (await isCoachSessionAuthorized()) ||
      isCoachSessionAuthorizedFromRequest(req) ||
      (await isEditorSessionAuthorized()) ||
      isEditorSessionAuthorizedFromRequest(req);

    if (!authorized) {
      return NextResponse.json({ ok: false, error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'Error al verificar autorización.' }, { status: 500 });
  }

  // 2. Leer URL del PDF del body
  let pdfUrl: string;
  try {
    const body = await req.json();
    pdfUrl = typeof body?.pdf_url === 'string' ? body.pdf_url.trim() : '';
    if (!pdfUrl) {
      return NextResponse.json({ ok: false, error: 'pdf_url es requerido y no puede estar vacío.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'Body JSON inválido.' }, { status: 400 });
  }

  // 3. Descargar el PDF (usa downloadFileFromUrl de document-parser existente)
  let pdfBase64: string;
  let mimeType: string;
  try {
    const { buffer, contentType } = await downloadFileFromUrl(pdfUrl);
    const validated = validateDocumentBuffer(buffer, contentType || 'application/pdf');
    mimeType = validated.mimeType;
    pdfBase64 = buffer.toString('base64');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'No se pudo descargar el PDF.';
    console.error('[analyze-pdf] Error descargando PDF:', msg);
    return NextResponse.json({ ok: false, error: `Error al descargar el PDF: ${msg}` }, { status: 422 });
  }

  // 4. Llamar a Gemini con el PDF como inlineData — SIN escrituras Supabase
  let rawJson: Record<string, unknown>;
  try {
    const provider = createProvider();
    const response = await provider.chat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: USER_PROMPT,
          mediaParts: [{ mimeType, data: pdfBase64 }],
        },
      ],
      { temperature: 0.1, maxTokens: 16384, responseMimeType: 'application/json' }
    );

    if (response.finishReason === 'MAX_TOKENS') {
      throw new Error('El análisis del PDF excedió el límite máximo de tokens (MAX_TOKENS). La respuesta quedó incompleta.');
    }

    // Extraer JSON limpio de la respuesta
    const rawText = response.content.trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('La respuesta de Gemini no contiene un JSON válido.');
      }
      parsed = JSON.parse(jsonMatch[0]);
    }
    rawJson = parsed as Record<string, unknown>;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error en el análisis con Gemini.';
    console.error('[analyze-pdf] Error Gemini:', msg);
    return NextResponse.json({ ok: false, error: `Error al analizar el PDF: ${msg}` }, { status: 500 });
  }

  // 5. Normalizar y devolver — 0 escrituras Supabase
  try {
    const result: PdfAnalysisResult = {
      ok: true,
      titulo_sesion: typeof rawJson.titulo_sesion === 'string' ? rawJson.titulo_sesion : null,
      num_tareas_detectadas: typeof rawJson.num_tareas_detectadas === 'number' ? rawJson.num_tareas_detectadas : 0,
      grupos_globales: Array.isArray(rawJson.grupos_globales)
        ? (rawJson.grupos_globales as GrupoJugadores[])
        : [],
      tareas: Array.isArray(rawJson.tareas)
        ? (rawJson.tareas as PdfTaskDraft[]).map(t => {
            if (t?.consignas?.valor) {
              if (typeof t.consignas.valor === 'string') {
                t.consignas.valor = (t.consignas.valor as string)
                  .split(/\r?\n/)
                  .map(s => s.replace(/^[-•*–—\d+.)\s]+/, '').trim())
                  .filter(Boolean);
              } else if (Array.isArray(t.consignas.valor)) {
                t.consignas.valor = (t.consignas.valor as unknown[])
                  .map(s => String(s).replace(/^[-•*–—\d+.)\s]+/, '').trim())
                  .filter(Boolean);
              }
            }
            return t;
          })
        : [],
    };

    console.log(`[analyze-pdf] Análisis completado. Tareas detectadas: ${result.num_tareas_detectadas}. 0 escrituras Supabase.`);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al procesar la respuesta.';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
