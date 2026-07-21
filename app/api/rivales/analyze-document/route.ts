import { NextResponse } from 'next/server';
import { createProvider } from '@/lib/ai/provider';
import { supabase } from '@/lib/supabase';
import { FlexibleReportExtraction } from '@/types';
import { downloadFileFromUrl, validateDocumentBuffer } from '@/lib/ai/document-parser';

export const maxDuration = 60; // 60 segundos tiempo límite

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { documentId, rivalName, season, fileUrl, fileBase64, mimeType: providedMime } = body;
    const targetSeason = season || '2026/2027';

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
    let initialMime = providedMime || 'application/pdf';

    if (fileBase64) {
      fileBuffer = Buffer.from(fileBase64, 'base64');
    } else if (targetUrl) {
      const downloaded = await downloadFileFromUrl(targetUrl);
      fileBuffer = downloaded.buffer;
      if (downloaded.contentType) {
        initialMime = downloaded.contentType.split(';')[0].trim();
      }
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: 'No se pudo obtener el contenido del archivo' }, { status: 400 });
    }

    // Validación rigurosa de Bytes, Tamaño y Firma de Formato (%PDF-)
    const validated = validateDocumentBuffer(fileBuffer, initialMime);
    const mimeType = validated.mimeType;

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
    "tituloDocumento": "${targetDocName}",
    "fechaInforme": "${targetDocDate}",
    "autor": "Analista / Cuerpotécnico",
    "rivalAnalizado": "${rivalName || 'Rival'}",
    "temporada": "${targetSeason}",
    "sistemaRivalObservado": "1-4-3-3",
    "partidosObservados": ["Último partido vs Rival"],
    "resumenEjecutivo": "Breve resumen de 2 frases"
  },
  "observacionesRival": {
    "salidaBalon": [
      {
        "id": "obs_1",
        "categoria": "salidaBalon",
        "contenido": "Descripción concreta del comportamiento observado",
        "fuente": "texto",
        "pagina": 1,
        "evidenciaOriginal": "Cita exacta o contexto",
        "confianza": "alta",
        "estado": "pendiente",
        "prioridad": "alta"
      }
    ],
    "transicionDefensiva": [],
    "balonParadoOfensivo": [],
    "balonParadoDefensivo": []
  },
  "propuestasDelAnalista": {
    "planAtaque": [
      {
        "id": "prop_1",
        "categoria": "planAtaque",
        "contenido": "Propuesta táctica recomendada por el analista",
        "fuente": "texto",
        "pagina": 1,
        "confianza": "alta",
        "estado": "pendiente",
        "prioridad": "alta",
        "esPropuestaAnalista": true
      }
    ]
  },
  "amenazasJugadores": [
    {
      "dorsal": "17",
      "nombre": "Extremo Derecho",
      "posicionHabitual": "extremoDerecho",
      "nivelPeligro": "critico",
      "fortalezas": ["1v1", "velocidad", "diagonal interior"],
      "observaciones": "Jugador más desequilibrante en banda derecha",
      "movimientosFrecuentes": "Recibe al pie abierto en banda e inicia diagonal hacia dentro buscando disparo o pase filtrado",
      "nuestrosPuestosDirectos": ["lateralIzquierdo"],
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
  } catch (error: unknown) {
    console.error('Error en API analyze-document:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: msg || 'Error inesperado al procesar el documento' },
      { status: 400 }
    );
  }
}
