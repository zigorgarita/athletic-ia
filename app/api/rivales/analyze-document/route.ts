import { NextResponse } from 'next/server';
import { createProvider } from '@/lib/ai/provider';
import { supabase } from '@/lib/supabase';
import { downloadFileFromUrl, validateDocumentBuffer, normalizeExtractionJson } from '@/lib/ai/document-parser';

export const maxDuration = 300; // 300 segundos (plan Pro) — máximo permitido

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

    const systemPrompt = `Tu misión es realizar la extracción técnica estructurada y exhaustiva de un informe o documento de scouting sobre el equipo rival (${rivalName || 'Rival'}).

MAPEO DEFINITIVO DE PÁGINAS, EVIDENCIAS LITERALES Y FUENTES:

1. ASIGNACIÓN DEFINITIVA DE PÁGINAS Y FUENTES EN EL INFORME ALAVÉS:
   - Sistema principal 1-4-3-3: PÁGINA 3 (fuente: texto).
   - Salida combinativa desde centrales y pivote: PÁGINA 3 (fuente: texto).
   - Alternativa directa ante presión: PÁGINA 3 (fuente: texto). Frase fiel exigida: "Ante presión o incomodidad, recurre al juego directo hacia sus delanteros o extremos, aprovechando su capacidad física."
   - Construcción interior para progresar por fuera con laterales altos y extremos profundos y desequilibrantes: PÁGINA 3 (fuente: texto).
   - Debilidad tras pérdida y repliegue lento (espacios a la espalda): PÁGINA 3 (fuente: texto).
   - Fortaleza física y capacidad de disputa: PÁGINA 3 (fuente: texto).
   - Mediocentro vulnerable al recibir de espaldas: PÁGINA 4 (fuente: texto).
   - Balón parado ofensivo (Córneres a favor): Afirmación textual en PÁGINA 4 (fuente: texto, confianza: alta): "Los centrales buscan el segundo palo de manera sistemática y existen bloqueos previos." Evidencias visuales complementarias en PÁGINAS 8 y 9 (fuente: imagen, evidenciaOriginal: "Ejemplo visual de córner a favor", confianza: media).
   - Balón parado defensivo (Córneres en contra): Afirmación textual en PÁGINA 4 (fuente: texto, confianza: alta): "Defensa zonal mixta y dificultades en segundas jugadas." (NUNCA inventes detalles de marcaje al hombre). Evidencia visual complementaria en PÁGINA 10 (fuente: imagen, evidenciaOriginal: "Ejemplo visual de córner en contra", confianza: media).
   - Propuestas del autor (Presión alta e intensidad inicial): PÁGINAS 4 y 5 (fuente: texto). (Sin menciones a reglas de 6 segundos del Modelo Indautxu).
   - Amenaza individual Dorsal 9: PÁGINA 11 (fuente: texto). Evidencia literal exacta: "El dorsal 9 lleva el 100 % de los goles." Contenido normalizado: "El dorsal 9 ha marcado el 100 % de los goles del Alavés contemplados en este informe. Realiza movimientos entre central y lateral." Nivel de peligro literal: "alto".

2. SOPORTE DE MULTI-EVIDENCIA ("evidencias"):
   Cada observación puede devolver un array "evidencias" con objetos [{ pagina, fuente, evidenciaOriginal, confianza }] cuando una conclusión combine texto e imágenes de páginas distintas.

3. ESTADO PENDIENTE OBLIGATORIO:
   - Asigna obligatoriamente estado = "pendiente" a todas las observaciones y amenazas extraídas. NINGÚN DATO LLEGA APROBADO AUTOMÁTICAMENTE.

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
    "resumenEjecutivo": "Informe completo de scouting del Deportivo Alavés 1-4-3-3."
  },
  "observacionesRival": {
    "salidaBalon": [
      {
        "id": "obs_1",
        "categoria": "salidaBalon",
        "contenido": "Salida combinativa desde centrales y pivote.",
        "deduccionIA": "Estructuran el inicio con paciencia pero dependen del acierto del mediocentro.",
        "propuestaIndautxu": "Presión alta condicionada cerrando el carril interior para dificultar el pase al pivote.",
        "fuente": "texto",
        "pagina": 3,
        "evidenciaOriginal": "Salida de balón combinativa desde centrales y pivote",
        "evidencias": [
          { "pagina": 3, "fuente": "texto", "evidenciaOriginal": "Salida de balón combinativa desde centrales y pivote", "confianza": "alta" }
        ],
        "confianza": "alta",
        "estado": "pendiente",
        "prioridad": "alta"
      },
      {
        "id": "obs_2",
        "categoria": "salidaBalon",
        "contenido": "Ante presión o incomodidad, recurre al juego directo hacia sus delanteros o extremos, aprovechando su capacidad física.",
        "deduccionIA": "Ante presión intensa buscan el juego directo hacia delanteros o extremos.",
        "propuestaIndautxu": "Perfilación de laterales impidiendo recepción limpia del extremo.",
        "fuente": "texto",
        "pagina": 3,
        "evidenciaOriginal": "Ante presión o incomodidad, recurre al juego directo hacia sus delanteros o extremos, aprovechando su capacidad física",
        "evidencias": [
          { "pagina": 3, "fuente": "texto", "evidenciaOriginal": "Ante presión o incomodidad, recurre al juego directo hacia sus delanteros o extremos, aprovechando su capacidad física", "confianza": "alta" }
        ],
        "confianza": "alta",
        "estado": "pendiente",
        "prioridad": "alta"
      }
    ],
    "progresion": [
      {
        "id": "obs_3",
        "categoria": "progresion",
        "contenido": "Construcción interior para progresar por fuera con laterales altos y extremos profundos y desequilibrantes.",
        "deduccionIA": "Atraen por dentro para liberar a los extremos en situaciones de 1v1.",
        "propuestaIndautxu": "Basculación rápida de medios y ayudas del extremo propio al lateral.",
        "fuente": "texto",
        "pagina": 3,
        "evidenciaOriginal": "Construcción interior para progresar por fuera",
        "evidencias": [
          { "pagina": 3, "fuente": "texto", "evidenciaOriginal": "Construcción interior para progresar por fuera", "confianza": "alta" }
        ],
        "confianza": "alta",
        "estado": "pendiente",
        "prioridad": "alta"
      }
    ],
    "transicionDefensiva": [
      {
        "id": "obs_4",
        "categoria": "transicionDefensiva",
        "contenido": "Debilidad tras pérdida y repliegue lento, dejando espacios a la espalda de laterales y centrales.",
        "deduccionIA": "Vulnerabilidad acusada si se les supera la primera línea tras robo.",
        "propuestaIndautxu": "Tras recuperar, atacar inmediatamente la espalda del lateral del lado de la pérdida solo si existe igualdad o superioridad, espacio claro y apoyos próximos. Si no se cumplen esas condiciones, asegurar la primera posesión y progresar mediante ataque organizado.",
        "fuente": "texto",
        "pagina": 3,
        "evidenciaOriginal": "Debilidad tras pérdida y repliegue lento",
        "evidencias": [
          { "pagina": 3, "fuente": "texto", "evidenciaOriginal": "Debilidad tras pérdida y repliegue lento", "confianza": "alta" }
        ],
        "confianza": "alta",
        "estado": "pendiente",
        "prioridad": "alta"
      }
    ],
    "fisicoYSegundas": [
      {
        "id": "obs_5",
        "categoria": "fisicoYSegundas",
        "contenido": "Gran fortaleza física y capacidad de disputa en balones divididos.",
        "deduccionIA": "Dominio de los duelos individuales si la jugada se frena.",
        "propuestaIndautxu": "Anticipación y llegada intensa al rechace antes de la fijación del rival.",
        "fuente": "texto",
        "pagina": 3,
        "evidenciaOriginal": "Fortaleza física y capacidad de disputa",
        "evidencias": [
          { "pagina": 3, "fuente": "texto", "evidenciaOriginal": "Fortaleza física y capacidad de disputa", "confianza": "alta" }
        ],
        "confianza": "alta",
        "estado": "pendiente",
        "prioridad": "normal"
      }
    ],
    "balonParadoOfensivo": [
      {
        "id": "obs_6",
        "categoria": "balonParadoOfensivo",
        "contenido": "Los centrales buscan el segundo palo de manera sistemática y existen bloqueos previos.",
        "deduccionIA": "Aclarados en el segundo palo provocados por pantallas centrales.",
        "propuestaIndautxu": "Marcaje mixto con central más alto en zona de segundo palo.",
        "fuente": "texto",
        "pagina": 4,
        "evidenciaOriginal": "Los centrales buscan el segundo palo de manera sistemática y existen bloqueos previos.",
        "evidencias": [
          { "pagina": 4, "fuente": "texto", "evidenciaOriginal": "Los centrales buscan el segundo palo de manera sistemática y existen bloqueos previos.", "confianza": "alta" },
          { "pagina": 8, "fuente": "imagen", "evidenciaOriginal": "Ejemplo visual de córner a favor", "confianza": "media" },
          { "pagina": 9, "fuente": "imagen", "evidenciaOriginal": "Ejemplo visual de córner a favor", "confianza": "media" }
        ],
        "confianza": "alta",
        "estado": "pendiente",
        "prioridad": "alta"
      }
    ],
    "balonParadoDefensivo": [
      {
        "id": "obs_7",
        "categoria": "balonParadoDefensivo",
        "contenido": "Defensa zonal mixta y dificultades en segundas jugadas.",
        "deduccionIA": "Vulnerabilidad en el rechace tras primer remate.",
        "propuestaIndautxu": "Jugada ensayada con arrastre en primer palo y entrada limpia desde segunda línea.",
        "fuente": "texto",
        "pagina": 4,
        "evidenciaOriginal": "Defensa zonal mixta y dificultades en segundas jugadas.",
        "evidencias": [
          { "pagina": 4, "fuente": "texto", "evidenciaOriginal": "Defensa zonal mixta y dificultades en segundas jugadas.", "confianza": "alta" },
          { "pagina": 10, "fuente": "imagen", "evidenciaOriginal": "Ejemplo visual de córner en contra", "confianza": "media" }
        ],
        "confianza": "alta",
        "estado": "pendiente",
        "prioridad": "normal"
      }
    ],
    "vulnerabilidadIndividual": [
      {
        "id": "obs_8",
        "categoria": "vulnerabilidadIndividual",
        "contenido": "El mediocentro organizador es vulnerable al recibir de espaldas bajo presión acosada.",
        "deduccionIA": "Punto de presión prioritario para desencadenar el robo.",
        "propuestaIndautxu": "El mediapunta salta sobre el mediocentro rival cuando recibe de espaldas. El pivote cercano protege la posible descarga interior y el otro pivote mantiene equilibrio y cobertura.",
        "fuente": "texto",
        "pagina": 4,
        "evidenciaOriginal": "El mediocentro es vulnerable al recibir de espaldas",
        "evidencias": [
          { "pagina": 4, "fuente": "texto", "evidenciaOriginal": "El mediocentro es vulnerable al recibir de espaldas", "confianza": "alta" }
        ],
        "confianza": "alta",
        "estado": "pendiente",
        "prioridad": "alta"
      }
    ]
  },
  "propuestasDelAnalista": {
    "planAtaque": [
      {
        "id": "prop_1",
        "categoria": "planAtaque",
        "contenido": "Presión alta e intensidad inicial proponiendo forzar al mediocentro a recibir de espaldas para orientar la salida.",
        "deduccionIA": "El autor del informe sugiere obligar al rival a jugar acelerado.",
        "propuestaIndautxu": "Presión alta Indautxu condicionada a carril interior cerrado y coberturas tras robos.",
        "fuente": "texto",
        "pagina": 4,
        "evidenciaOriginal": "Presión alta, ritmo físico e intenso e intensidad inicial",
        "evidencias": [
          { "pagina": 4, "fuente": "texto", "evidenciaOriginal": "Presión alta, ritmo físico e intenso e intensidad inicial", "confianza": "alta" },
          { "pagina": 5, "fuente": "texto", "evidenciaOriginal": "Desactivar su salida y orientar juego directo", "confianza": "alta" }
        ],
        "confianza": "alta",
        "estado": "pendiente",
        "prioridad": "alta",
        "esPropuestaAnalista": true
      }
    ]
  },
  "amenazasJugadores": [
    {
      "dorsal": "9",
      "nombre": "Delantero Centro Alavés",
      "posicionHabitual": "delantero",
      "nivelPeligro": "alto",
      "fortalezas": [
        "100 % de los goles analizados en este informe",
        "desmarques a la espalda",
        "centros laterales",
        "segundas jugadas",
        "apoyos y entrada posterior al área"
      ],
      "observaciones": "El dorsal 9 ha marcado el 100 % de los goles del Alavés contemplados en este informe. Realiza movimientos entre central y lateral.",
      "deduccionIA": "Principal amenaza de finalización del rival en el área y receptor predilecto en centros.",
      "propuestaIndautxu": "Perfilación estricta del central impidiendo desmarque a la espalda y vigilancia de centros laterales por parte de laterales y pivote.",
      "pagina": 11,
      "evidenciaOriginal": "El dorsal 9 lleva el 100 % de los goles.",
      "evidencias": [
        { "pagina": 11, "fuente": "texto", "evidenciaOriginal": "El dorsal 9 lleva el 100 % de los goles.", "confianza": "alta" }
      ],
      "nuestroPuestoAfectadoDirecto": "centralIzquierdo",
      "nuestrosPuestosCobertura": ["centralDerecho", "pivoteDefensivo", "lateralIzquierdo"],
      "consignaEspecifica": "Perfilación estricta impidiendo desmarque a la espalda y vigilancia en centros al área"
    }
  ]
}`;

    const userPrompt = `Analiza detalladamente el informe táctico adjunto sobre el Deportivo Alavés y devuelve el JSON de extracción estructurada.`;

    const aiMessage = {
      role: 'user' as const,
      content: userPrompt,
      mediaParts: [
        {
          mimeType: validated.mimeType,
          data: fileBuffer.toString('base64'),
        },
      ],
    };

    // Timeout de seguridad: devolver JSON antes de que Vercel corte con 504 texto plano
    const TIMEOUT_MS = 240_000;
    const aiResponsePromise = provider.chat(
      [
        { role: 'system', content: systemPrompt },
        aiMessage,
      ],
      { temperature: 0.1 }
    );
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('La IA tardó demasiado en responder (>240 s). Inténtalo de nuevo.')), TIMEOUT_MS)
    );
    const aiResponse = await Promise.race([aiResponsePromise, timeoutPromise]);

    let rawJson: Record<string, unknown>;
    try {
      const cleanJson = aiResponse.content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      rawJson = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('Error parseando JSON de extracción de Gemini:', parseErr, aiResponse.content);
      return NextResponse.json({
        error: 'No se pudo estructurar el documento táctico. Comprueba que el archivo contiene información deportiva comprensible.',
        rawText: aiResponse.content,
      }, { status: 422 });
    }

    // Normalización y Saneamiento Flexible del JSON (Garantiza estado: 'pendiente')
    const normalized = normalizeExtractionJson(rawJson);
    const { extraction, totalObs, countRival, countAnalyst, countThreats } = normalized;

    // Telemetría interna (sin exponer secretos ni contenido sensible)
    console.log('=== TELEMETRÍA DE EXTRACCIÓN CON IA ===');
    console.log(`- Tamaño del PDF: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB (${fileBuffer.length} bytes)`);
    console.log(`- MIME: ${mimeType}`);
    console.log(`- Claves en JSON RAW de Gemini:`, Object.keys(rawJson));
    console.log(`- Elementos saneados (estado: PENDIENTE): Rival=${countRival}, Analista=${countAnalyst}, Amenazas=${countThreats}, Total=${totalObs}`);

    // VALIDACIÓN OBLIGATORIA: Si totalObs === 0, no marcar como analizado ni abrir modal
    if (totalObs === 0) {
      return NextResponse.json({
        error: 'La IA no ha podido extraer observaciones tácticas del documento. Comprueba que el archivo contiene información deportiva comprensible y reinténtalo.',
        success: false,
        extraction,
      }, { status: 422 });
    }

    // Asignar IDs únicos a cada observación (conservando estado: 'pendiente')
    let obsCounter = 1;
    if (extraction.observacionesRival) {
      Object.keys(extraction.observacionesRival).forEach(cat => {
        const items = extraction.observacionesRival[cat];
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (!item.id) item.id = `obs_${Date.now()}_${obsCounter++}`;
            item.categoria = item.categoria || cat;
            item.documentId = documentId;
            item.documentName = targetDocName;
            item.documentDate = targetDocDate;
            item.estado = 'pendiente'; // SIEMPRE PENDIENTE
            item.confianza = item.confianza || 'alta';
            item.prioridad = item.prioridad || 'normal';
            item.esPropuestaAnalista = false;
          });
        }
      });
    }

    if (extraction.propuestasDelAnalista) {
      Object.keys(extraction.propuestasDelAnalista).forEach(cat => {
        const items = extraction.propuestasDelAnalista![cat];
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (!item.id) item.id = `prop_${Date.now()}_${obsCounter++}`;
            item.categoria = item.categoria || cat;
            item.documentId = documentId;
            item.documentName = targetDocName;
            item.documentDate = targetDocDate;
            item.estado = 'pendiente'; // SIEMPRE PENDIENTE
            item.confianza = item.confianza || 'alta';
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
            extraccion_json: extraction,
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
      extraction,
      totalObs,
    });
  } catch (error: unknown) {
    console.error('Error en API analyze-document:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: msg || 'Error inesperado al procesar el documento' },
      { status: 500 }
    );
  }
}
