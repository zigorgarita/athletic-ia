import { NextResponse } from 'next/server';
import { verifyServerAuthorization } from '@/lib/auth-server';
import { getDieLigenToken } from '@/lib/die-ligen/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Hasta 60s en serverless si el tier lo permite

interface DownloadClipBody {
  trimStart: number;
  trimEnd: number;
  homeTeamName?: string;
  awayTeamName?: string;
  gameDate?: string;
  videoUrl: string;
  translatedEventName?: string;
  gameMinutes?: string;
}

export async function POST(req: Request) {
  try {
    // 1. Verificación de autorización de staff (patrón oficial de la aplicación)
    const staffPasskey =
      req.headers.get('x-staff-passkey')?.trim() ||
      req.headers.get('x-coach-staff-passkey')?.trim();
    const expectedPasskey = (
      process.env.COACH_STAFF_PASSKEY ||
      process.env.NEXT_PUBLIC_COACH_PASSKEY ||
      'indautxu2026'
    ).trim();

    let isAuthorized = Boolean(staffPasskey && staffPasskey === expectedPasskey);

    if (!isAuthorized) {
      const authCheck = await verifyServerAuthorization(req);
      isAuthorized = authCheck.authorized;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Acceso no autorizado en la aplicación. Clave de staff no válida.',
        },
        { status: 401 }
      );
    }

    // 2. Extraer y validar el payload
    const body: DownloadClipBody = await req.json();
    const {
      trimStart,
      trimEnd,
      homeTeamName,
      awayTeamName,
      gameDate,
      videoUrl,
      translatedEventName,
      gameMinutes,
    } = body;

    if (
      typeof trimStart !== 'number' ||
      typeof trimEnd !== 'number' ||
      trimEnd <= trimStart ||
      !videoUrl
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parámetros de recorte inválidos. Se requiere trimStart, trimEnd y videoUrl.',
        },
        { status: 400 }
      );
    }

    // 3. Obtener token de Die Ligue
    let token = await getDieLigenToken(false);

    // 4. Iniciar producción del clip: POST /api/event-download/produce-clip/
    const producePayload = {
      trim_start: trimStart,
      trim_end: trimEnd,
      home_team_name: homeTeamName || 'Local',
      away_team_name: awayTeamName || 'Visitante',
      game_date: gameDate || new Date().toISOString(),
      video_url: videoUrl,
      translated_event_name: translatedEventName || 'Clip',
      game_minutes: gameMinutes || '',
    };

    let produceRes = await fetch('https://coaches.ligen.football/api/event-download/produce-clip/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: '*/*',
      },
      body: JSON.stringify(producePayload),
      cache: 'no-store',
    });

    if (produceRes.status === 401) {
      token = await getDieLigenToken(true);
      produceRes = await fetch('https://coaches.ligen.football/api/event-download/produce-clip/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: '*/*',
        },
        body: JSON.stringify(producePayload),
        cache: 'no-store',
      });
    }

    if (!produceRes.ok) {
      const errText = await produceRes.text();
      throw new Error(`Die Ligue rechazó el inicio del clip (HTTP ${produceRes.status}): ${errText}`);
    }

    const rawJobId = await produceRes.text();
    const jobId = rawJobId.trim().replace(/^"|"$/g, '');

    if (!jobId) {
      throw new Error('Die Ligue no devolvió un identificador de tarea válido.');
    }

    // 5. Sondear estado del job: GET /api/common/download/check-job-status/${jobId}
    let downloadTicket: string | null = null;
    const maxAttempts = 20; // 20 intentos x 1.5s = ~30s máximo
    const pollInterval = 1500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const checkRes = await fetch(
        `https://coaches.ligen.football/api/common/download/check-job-status/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        }
      );

      if (checkRes.status === 200) {
        const data = await checkRes.json();
        if (data?.downloadTicket) {
          downloadTicket = data.downloadTicket;
          break;
        }
      } else if (checkRes.status === 202) {
        // En proceso de transcodificación
        continue;
      } else if (checkRes.status === 410) {
        throw new Error('La tarea de recorte expiró o fue eliminada por Die Ligue (HTTP 410).');
      } else {
        throw new Error(`Error en el estado de la tarea en Die Ligue (HTTP ${checkRes.status}).`);
      }
    }

    if (!downloadTicket) {
      throw new Error('Tiempo de espera agotado mientras Die Ligue transcodificaba el clip.');
    }

    // 6. Descargar el archivo transcodificado de Die Ligue
    const downloadUrl = `https://coaches.ligen.football/api/common/download/download-clip/mp4/${jobId}/${downloadTicket}`;
    const videoRes = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!videoRes.ok || !videoRes.body) {
      throw new Error(`Fallo al descargar el archivo MP4 desde Die Ligue (HTTP ${videoRes.status}).`);
    }

    // 7. Streaming del MP4 al cliente con cabeceras completas
    const contentType = videoRes.headers.get('content-type') || 'video/mp4';
    const contentLength = videoRes.headers.get('content-length');
    const contentDisposition =
      videoRes.headers.get('content-disposition') ||
      `attachment; filename="clip_${trimStart}_${trimEnd}.mp4"`;

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    headers.set('Content-Disposition', contentDisposition);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return new Response(videoRes.body, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al procesar el clip';
    console.error('Error en /api/die-ligen/download-clip:', err);
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  }
}
