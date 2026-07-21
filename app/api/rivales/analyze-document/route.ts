/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createProvider } from '@/lib/ai/provider';
import { supabase } from '@/lib/supabase';
import { FlexibleReportExtraction } from '@/types';

export const maxDuration = 60; // 60 segundos tiempo límite

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { documentId, rivalName, season, fileUrl, fileBase64, mimeType: providedMime } = body;

    if (!documentId && !fileUrl && !fileBase64) {
      return NextResponse.json({ error: 'Faltan parámetros del documento (documentId, fileUrl o fileBase64)' }, { status: 400 });
    }

    let targetUrl = fileUrl;
    let targetDocName = 'Documento de Scouting';
    let targetDocDate = new Date().toISOString().split('T')[0];

    if (documentId) {
      const { data: doc, error: docErr } = await supabase
        .from('club_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (!docErr && doc) {
        targetUrl = doc.url || fileUrl;
        targetDocName = doc.nombre || doc.tipo || targetDocName;
        targetDocDate = doc.fecha || targetDocDate;
      }
    }

    let fileBuffer: Buffer | null = null;
    let mimeType = providedMime || 'application/pdf';

    if (fileBase64) {
      fileBuffer = Buffer.from(fileBase64, 'base64');
    } else if (targetUrl) {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`No se pudo descargar el documento desde ${targetUrl}`);
      }
      const fetchedBuffer = await response.arrayBuffer();
      fileBuffer = Buffer.from(fetchedBuffer);
      const headerMime = response.headers.get('content-type');
      if (headerMime) {
        mimeType = headerMime.split(';')[0].trim();
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: 'No se pudo obtener el contenido del archivo' }, { status: 400 });
    }

    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: `El archivo supera el tamaño máximo permitido (25 MB)` }, { status: 400 });
    }

    // Normalizar MIME
    if (targetUrl?.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (targetUrl?.endsWith('.png')) mimeType = 'image/png';
    else if (targetUrl?.endsWith('.jpg') || targetUrl?.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (targetUrl?.endsWith('.webp')) mimeType = 'image/webp';

    if (!ALLOWED_MIME_TYPES.includes(mimeType) && !mimeType.startsWith('image/')) {
      mimeType = 'application/pdf'; // Fallback por defecto si es compatible
    }

    const provider = createProvider();

    const systemPrompt = `Tu misión es realizar la extracción técnica estructurada de un informe o documento de scouting sobre un rival deportivo (${rivalName || 'Rival'}).

INSTRUCCIONES DE EXTRACCIÓN:
1. Lee todo el contenido disponible (texto, tablas de alineaciones, datos de rendimiento, capturas o notas de pizarra).
2. EXTRAE SOLAMENTE INFORMACIÓN RESPALDADA DIRECTAMENTE EN EL DOCUMENTO. NUNCA INVENTES NADA QUE NO FIGURE EN ÉL.
3. Diferencia entre:
   - HECHOS Y COMPORTAMIENTOS DEL RIVAL (observacionesRival)
   - RECOMENDACIONES/PROPUESTAS DEL AUTOR DEL INFORME (propuestasDelAnalista)
   - AMENAZAS INDIVIDUALES DE JUGADORES RIVALES (amenazasJugadores)
4. Para cada observación extraída, asigna un nivel de confianza ('alta', 'media', 'baja') según la claridad de la evidencia del documento.
5. Para las amenazas de jugadores rivales:
   - Identifica dorsal, posición habitual, fortalezas específicas (ej. velocidad, desborde 1v1, juego aéreo, diagonal interior) y consigna sugerida.

DEVUELVE ÚNICAMENTE UN OBJETO JSON VÁLIDO CON ESTE ESQUEMA EXACTO:

{
  "metadatos": {
    "tipoInformeDetectado": ["completo" | "salida_balon" | "balon_parado" | "jugadores" | "audio_visual" | "notas_rapidas"],
    "temporada": "${season || '2026-27'}",
    "fechaInforme": "${targetDocDate}",
    "autorDocumento": "Desconocido",
    "partidosObservados": [],
    "seccionesDetectadas": [],
    "seccionesNoEncontradas": []
  },
  "observacionesRival": {
    "sistemaPrincipal": [{ "id": "obs_1", "contenido": "...", "fuente": "texto", "pagina": 1, "evidenciaOriginal": "...", "confianza": "alta", "estado": "pendiente", "prioridad": "normal", "categoria": "sistemaPrincipal", "esPropuestaAnalista": false }],
    "sistemasAlternativos": [],
    "salidaBalon": [],
    "construccion": [],
    "ataqueOrganizado": [],
    "ataqueBandas": [],
    "ataqueInterior": [],
    "finalizacion": [],
    "transicionOfensiva": [],
    "transicionDefensiva": [],
    "presion": [],
    "bloqueDefensivo": [],
    "fortalezas": [],
    "debilidades": [],
    "jugadoresClave": [],
    "balonParadoOfensivo": [],
    "balonParadoDefensivo": [],
    "saquesBanda": [],
    "tendenciasCompetitivas": []
  },
  "propuestasDelAnalista": {
    "queAtacar": [],
    "queProteger": [],
    "planPresion": [],
    "planOfensivo": [],
    "consignas": [],
    "aspectosPsicologicos": []
  },
  "amenazasJugadores": [
    {
      "nombre": "Nombre si figura",
      "dorsal": "17",
      "posicionHabitual": "Extremo derecho",
      "nivelPeligro": "alto",
      "fortalezas": ["Velocidad", "1v1 en banda", "Diagonal hacia dentro"],
      "movimientosFrecuentes": "Recibe perfilado en banda y busca diagonal a pierna cambiada",
      "observaciones": "Jugador muy desequilibrante en transiciones ofensivas",
      "nuestroPuestoAfectadoDirecto": "lateralIzquierdo",
      "nuestrosPuestosCobertura": ["extremoIzquierdo", "pivoteDefensivo", "centralIzquierdo"],
      "consignaEspecifica": "Mantener distancia de intervención, orientarlo hacia fuera y exigir cobertura del pivote del lado izquierdo"
    }
  ]
}`;

    const userPrompt = `Analiza el documento adjunto y devuelve el JSON de extracción estructurada para el equipo rival "${rivalName || 'Rival'}".`;

    const aiMessage = {
      role: 'user' as const,
      content: userPrompt,
      mediaParts: [
        {
          mimeType,
          data: fileBuffer.toString('base64'),
        },
      ],
    };

    const aiResponse = await provider.chat(
      [
        { role: 'system', content: systemPrompt },
        aiMessage,
      ],
      { temperature: 0.1 }
    );

    let extractedData: FlexibleReportExtraction;
    try {
      const cleanJson = aiResponse.content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      extractedData = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('Error parseando JSON de extracción:', parseErr, aiResponse.content);
      return NextResponse.json({
        error: 'No se pudo estructurar el documento táctico. Comprueba que el archivo contiene información deportiva comprensible.',
        rawText: aiResponse.content,
      }, { status: 422 });
    }

    // Asignar IDs únicos a cada observación
    let obsCounter = 1;
    if (extractedData.observacionesRival) {
      Object.keys(extractedData.observacionesRival).forEach(cat => {
        const items = extractedData.observacionesRival[cat];
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (!item.id) item.id = `obs_${Date.now()}_${obsCounter++}`;
            item.categoria = item.categoria || cat;
            item.documentId = documentId;
            item.documentName = targetDocName;
            item.documentDate = targetDocDate;
            item.estado = item.estado || 'pendiente';
            item.confianza = item.confianza || 'media';
            item.prioridad = item.prioridad || 'normal';
            item.esPropuestaAnalista = false;
          });
        }
      });
    }

    if (extractedData.propuestasDelAnalista) {
      Object.keys(extractedData.propuestasDelAnalista).forEach(cat => {
        const items = extractedData.propuestasDelAnalista![cat];
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (!item.id) item.id = `prop_${Date.now()}_${obsCounter++}`;
            item.categoria = item.categoria || cat;
            item.documentId = documentId;
            item.documentName = targetDocName;
            item.documentDate = targetDocDate;
            item.estado = item.estado || 'pendiente';
            item.confianza = item.confianza || 'media';
            item.prioridad = item.prioridad || 'normal';
            item.esPropuestaAnalista = true;
          });
        }
      });
    }

    // Guardar la versión RAW (extraccion_original) en Supabase de forma inmutable
    if (documentId) {
      try {
        const passkey = process.env.COACH_STAFF_PASSKEY;
        await supabase.rpc('exec_secure_upsert', {
          target_table: 'club_documents',
          payload: {
            id: documentId,
            estado_analisis: 'analizado',
            extraccion_json: extractedData,
          },
          conflict_columns: '{id}',
          staff_passkey: passkey,
        });
      } catch (dbErr) {
        console.warn('Advertencia al guardar RAW en club_documents:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      documentId,
      documentName: targetDocName,
      documentDate: targetDocDate,
      extraction: extractedData,
    });
  } catch (error: any) {
    console.error('Error en API analyze-document:', error);
    return NextResponse.json(
      { error: error.message || 'Error inesperado al procesar el documento' },
      { status: 500 }
    );
  }
}
