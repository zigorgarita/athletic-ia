import { NextResponse } from 'next/server';
import { createProvider, AIMessage } from '@/lib/ai/provider';

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 15; // Max 15 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitData = rateLimitMap.get(ip);

  if (!limitData || now > limitData.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + LIMIT_WINDOW_MS });
    return true;
  }

  if (limitData.count >= MAX_REQUESTS) {
    return false;
  }

  limitData.count += 1;
  return true;
}

export async function POST(request: Request) {
  // 1. Rate limiting
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Límite de peticiones excedido (máximo 15 por minuto). Por favor, espera.' },
      { status: 429 }
    );
  }

  // 2. Validate passkey
  const staffPasskey = request.headers.get('x-staff-passkey');
  const expectedPasskey = process.env.NEXT_PUBLIC_COACH_PASSKEY || 'indautxu2026';
  
  if (staffPasskey !== expectedPasskey) {
    return NextResponse.json(
      { error: 'No autorizado. Contraseña de staff incorrecta.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { 
      rivalName, 
      sistemaPropio, 
      sistemaRival, 
      onceInicial, 
      nodosRival 
    } = body as {
      rivalName: string;
      sistemaPropio: string;
      sistemaRival: string;
      onceInicial: Array<{
        id: string;
        nombre: string;
        apellidos: string;
        dorsal: number;
        demarcacion: string;
        label_posicion: string; // The label of the node they occupy (e.g. 'LD', 'DFC')
        x: number;
        y: number;
      }>;
      nodosRival: Array<{
        id: string;
        label: string;
        x: number;
        y: number;
      }>;
    };

    // Validations
    if (!sistemaPropio || !sistemaRival) {
      return NextResponse.json(
        { error: 'Falta configurar el sistema propio o el sistema rival.' },
        { status: 400 }
      );
    }

    if (!onceInicial || onceInicial.length !== 11) {
      return NextResponse.json(
        { error: 'El una alineación inicial debe contar con exactamente 11 jugadores.' },
        { status: 400 }
      );
    }

    // 3. Compile prompt
    const onceInicialList = onceInicial
      .map(p => `- Dorsal ${p.dorsal}: ${p.nombre} ${p.apellidos} en posición [${p.label_posicion}] (X: ${p.x}, Y: ${p.y}) - Demarcación original: ${p.demarcacion}`)
      .join('\n');

    const nodosRivalList = nodosRival
      .map(n => `- Posición [${n.label}] (X: ${n.x}, Y: ${n.y})`)
      .join('\n');

    const systemInstruction = `Eres el Analista Táctico de Inteligencia Artificial del S.D. Indautxu Juvenil A (División de Honor Nacional 2026-27).
Tu misión es analizar exclusivamente el enfrentamiento estructural y posicional entre nuestro sistema propio y el sistema rival esperado para un partido, basándote en la disposición del once inicial en la pizarra y el dibujo rival.
Idioma: Habla siempre en español con tono profesional, analítico y directo, propio de un analista o segundo entrenador de élite.
Adapta tus análisis tácticos a la categoría de División de Honor Juvenil (la categoría más alta de fútbol juvenil en España).`;

    const compiledPrompt = `
TAREA: Realiza un análisis crítico y geométrico del enfrentamiento estructural entre nuestro sistema propio y el del rival.
Hemos asignado los jugadores a las posiciones indicadas. Debes responder estrictamente con un objeto JSON.

DATOS DEL PARTIDO Y DIBUJO ESTRUCTURAL:
- Rival: ${rivalName || 'Rival Desconocido'}
- Sistema Propio: ${sistemaPropio}
- Sistema Rival: ${sistemaRival}

NUESTRO ONCE INICIAL Y POSICIONAMIENTO EN PIZARRA:
${onceInicialList}

POSICIONAMIENTO RIVAL EN PIZARRA:
${nodosRivalList}

METODOLOGÍA DE ANÁLISIS:
1. Mapeo Espacial: Analiza el campo considerando 5 carriles verticales (Exterior Izquierdo, Interior Izquierdo, Carril Central, Interior Derecho, Exterior Derecho) y 3 alturas (Defensa, Mediocampo, Delantera). Determina dónde se generan superioridades numéricas (2v1, 3v2) o inferioridades.
2. Ventajas del Sistema: Identifica dónde tenemos ventaja natural de espacio, apoyos o progresiones limpias (ej. salida de balón holgada, superioridad en zona media).
3. Desventajas / Riesgos: Advierte sobre los riesgos del emparejamiento estructural, carriles expuestos sin cobertura defensiva, o desajustes ante su dibujo.
4. Zona de Conflicto Clave: Elige un carril geográfico principal de conflicto táctico del partido. Debe ser EXACTAMENTE uno de los siguientes valores: "central", "interior" o "exterior" (escrito en minúsculas).
5. Duelo Táctico Principal: Destaca el duelo clave del partido basándote en nuestro once inicial (por ejemplo, el central que debe contener al punta rival, o el mediocentro expuesto ante su mediapunta).
6. Tareas por Líneas: Proporciona consignas tácticas aplicables para Defensa, Mediocampo y Delantera.

FORMATO DE RESPUESTA:
Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin bloques de código Markdown (NO uses triple backticks ni \`\`\`json), sin introducciones, explicaciones externas ni saludos.
El JSON debe tener exactamente la siguiente estructura:
{
  "ventajas": "Análisis en formato texto/lista de las ventajas tácticas...",
  "desventajas": "Análisis de desventajas estructurales y riesgos...",
  "zona_conflicto": "central" | "interior" | "exterior",
  "duelo_clave": "Descripción del duelo clave entre jugadores...",
  "tareas_lineas": "Defensa: (instrucciones)\\nMedios: (instrucciones)\\nDelantera: (instrucciones)"
}
`;

    const messagesForAI: AIMessage[] = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: compiledPrompt }
    ];

    // 4. Call Gemini
    const provider = createProvider();
    const aiResponse = await provider.chat(messagesForAI, {
      temperature: 0.1, // Low temperature for more structured, factual outputs
    });

    let rawContent = aiResponse.content.trim();

    // Sanitize response to extract clean JSON if model returned markdown block
    if (rawContent.startsWith('```')) {
      rawContent = rawContent.replace(/^```json\s*/i, '');
      rawContent = rawContent.replace(/^```\s*/, '');
      rawContent = rawContent.replace(/```$/, '');
      rawContent = rawContent.trim();
    }

    // 5. Parse and validate JSON
    let parsedData;
    try {
      parsedData = JSON.parse(rawContent);
    } catch {
      console.error('Error parsing Gemini output as JSON:', rawContent);
      return NextResponse.json(
        { error: 'La IA no devolvió un formato de informe válido. Por favor, vuelve a intentarlo.' },
        { status: 500 }
      );
    }

    // Verify fields
    const { ventajas, desventajas, zona_conflicto, duelo_clave, tareas_lineas } = parsedData;
    if (!ventajas || !desventajas || !zona_conflicto || !duelo_clave || !tareas_lineas) {
      return NextResponse.json(
        { error: 'El informe táctico devuelto por la IA está incompleto.' },
        { status: 500 }
      );
    }

    // Normalize and validate zone
    const normalizedZone = zona_conflicto.toLowerCase().trim();
    const validZones = ['central', 'interior', 'exterior'];
    const finalZone = validZones.includes(normalizedZone) ? normalizedZone : 'central';

    return NextResponse.json({
      ventajas,
      desventajas,
      zona_conflicto: finalZone,
      duelo_clave,
      tareas_lineas
    });

  } catch (error: unknown) {
    console.error('Error in tactical analyst API route:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: errorMessage || 'Error interno del servidor al procesar el análisis.' },
      { status: 500 }
    );
  }
}
