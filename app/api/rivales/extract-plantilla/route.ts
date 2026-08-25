import { NextResponse } from 'next/server';
import { createProvider } from '@/lib/ai/provider';
import { verifyServerAuthorization } from '@/lib/auth-server';
import { validateDocumentBuffer } from '@/lib/ai/document-parser';

export const maxDuration = 120;

export async function POST(req: Request) {
  try {
    const authCheck = await verifyServerAuthorization(req);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error || 'Acceso no autorizado a extracción de plantilla.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { fileBase64, mimeType: providedMime, rivalName } = body;

    if (!fileBase64) {
      return NextResponse.json({ error: 'No se ha proporcionado el archivo (fileBase64 requerido).' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(fileBase64, 'base64');
    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: 'El archivo subido está vacío.' }, { status: 400 });
    }

    const validated = validateDocumentBuffer(fileBuffer, providedMime || 'image/jpeg');
    const mimeType = validated.mimeType;

    const provider = createProvider();

    const systemPrompt = `Eres un asistente de digitalización técnica deportiva para el cuerpo técnico de fútbol.
Tu única misión es transcribir fielmente los nombres y dorsales de los jugadores que aparezcan en la fotografía o documento de alineación/convocatoria del equipo rival (${rivalName || 'Rival'}).

REGLAS ESTRICTAS DE EXTRACCIÓN:
1. Extrae ÚNICAMENTE la información que sea visible de forma clara en el documento.
2. NO inventes ningún nombre, apellido ni dorsal.
3. Si solo aparece el dorsal y el nombre, extrae únicamente el dorsal y el nombre.
4. Si el dorsal no es legible o no aparece, asígnalo como null.
5. Si la posición NO aparece explícitamente en el documento, asígnala obligatoriamente como null.
   - Solo asigna posición si el documento lo indica con claridad (ej. "POR", "P", "GK" -> "Portero", "DEF" -> "Defensa Central", "DEL" -> "Delantero Centro", etc.).
6. Normaliza los nombres con mayúsculas y minúsculas adecuadas (ej. "AITOR GARCÍA" -> "Aitor García").
7. Devuelve ÚNICAMENTE un JSON válido con la siguiente estructura:

{
  "players": [
    {
      "dorsal": 1,
      "nombre": "Nombre Apellido",
      "posicion": "Portero"
    },
    {
      "dorsal": 9,
      "nombre": "Nombre Delantero",
      "posicion": null
    }
  ]
}`;

    const userPrompt = `Extrae la lista de jugadores (dorsal, nombre, posición si está explícita) del documento adjunto del equipo ${rivalName || 'rival'}. Devuelve únicamente el JSON.`;

    const aiMessage = {
      role: 'user' as const,
      content: userPrompt,
      mediaParts: [
        {
          mimeType: mimeType,
          data: fileBuffer.toString('base64'),
        },
      ],
    };

    const aiResponse = await provider.chat(
      [
        { role: 'system', content: systemPrompt },
        aiMessage,
      ],
      { temperature: 0.0 }
    );

    let rawJson: { players?: Array<{ dorsal?: number | null; nombre?: string; posicion?: string | null }> } = {};
    try {
      const cleanJson = aiResponse.content
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      rawJson = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('Error parseando JSON de extracción de plantilla:', parseErr, aiResponse.content);
      return NextResponse.json({
        error: 'No se pudo estructurar el listado de jugadores. Asegúrate de que la fotografía sea legible y contenga nombres.',
        rawText: aiResponse.content,
      }, { status: 422 });
    }

    const rawPlayers = Array.isArray(rawJson.players) ? rawJson.players : [];

    // Limpieza y validación de tipos
    const sanitizedPlayers = rawPlayers
      .filter(p => p && typeof p.nombre === 'string' && p.nombre.trim().length > 0)
      .map(p => ({
        dorsal: typeof p.dorsal === 'number' && !isNaN(p.dorsal) ? p.dorsal : (p.dorsal ? parseInt(String(p.dorsal), 10) || null : null),
        nombre: p.nombre!.trim(),
        posicion: p.posicion && typeof p.posicion === 'string' && p.posicion.trim().length > 0 ? p.posicion.trim() : null,
      }));

    return NextResponse.json({
      success: true,
      count: sanitizedPlayers.length,
      players: sanitizedPlayers,
    });
  } catch (error: unknown) {
    console.error('Error en API extract-plantilla:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: msg || 'Error inesperado al extraer la plantilla' },
      { status: 500 }
    );
  }
}
