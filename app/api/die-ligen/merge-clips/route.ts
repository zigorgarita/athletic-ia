import { NextResponse } from 'next/server';
import { verifyServerAuthorization } from '@/lib/auth-server';
import { getDieLigenToken } from '@/lib/die-ligen/client';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Hasta 60s en Vercel Serverless

interface MergeClipItem {
  id?: string;
  trimStart: number;
  trimEnd: number;
  homeTeamName?: string;
  awayTeamName?: string;
  gameDate?: string;
  videoUrl: string;
  translatedEventName?: string;
  gameMinutes?: string;
}

interface MergeRequestBody {
  clips: MergeClipItem[];
}

function findFFmpegBinary(): string | null {
  // 1. Si ya se copió a /tmp y es ejecutable
  const tmpBinary = path.join('/tmp', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  if (fs.existsSync(tmpBinary)) {
    return tmpBinary;
  }

  // 2. Intentar require dinámico
  try {
    const req = module.require || eval('require');
    const ffmpegInstaller = req('@ffmpeg-installer/ffmpeg');
    if (ffmpegInstaller?.path && fs.existsSync(ffmpegInstaller.path)) {
      return ffmpegInstaller.path;
    }
  } catch (e) {
    console.warn('Could not resolve @ffmpeg-installer/ffmpeg via dynamic require:', e);
  }

  // 3. Rutas conocidas según plataforma
  const platformFolder = process.platform === 'win32' ? 'win32-x64' : 'linux-x64';
  const binName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

  const candidatePaths = [
    path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', platformFolder, binName),
    path.join('/var/task', 'node_modules', '@ffmpeg-installer', platformFolder, binName),
    path.join('/var/task', '.next', 'server', 'node_modules', '@ffmpeg-installer', platformFolder, binName),
    path.join(__dirname, '..', '..', '..', 'node_modules', '@ffmpeg-installer', platformFolder, binName),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return null;
}

async function prepareFFmpegExecutable(): Promise<string> {
  const binary = findFFmpegBinary();
  if (!binary) {
    throw new Error('No se encontró el binario FFmpeg en el runtime de Vercel.');
  }

  if (process.platform === 'win32') {
    return binary;
  }

  const destPath = '/tmp/ffmpeg';
  if (binary !== destPath) {
    try {
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(binary, destPath);
      }
      fs.chmodSync(destPath, 0o755);
      return destPath;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Error al copiar/chmod a /tmp/ffmpeg:', msg);
      return binary;
    }
  }

  return destPath;
}

async function produceAndDownloadSingleClip(
  clip: MergeClipItem,
  index: number,
  token: string,
  destFilePath: string
): Promise<void> {
  const producePayload = {
    trim_start: clip.trimStart,
    trim_end: clip.trimEnd,
    home_team_name: clip.homeTeamName || 'Local',
    away_team_name: clip.awayTeamName || 'Visitante',
    game_date: clip.gameDate || new Date().toISOString(),
    video_url: clip.videoUrl,
    translated_event_name: clip.translatedEventName || `Clip ${index + 1}`,
    game_minutes: clip.gameMinutes || '',
  };

  const produceRes = await fetch('https://coaches.ligen.football/api/event-download/produce-clip/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: '*/*',
    },
    body: JSON.stringify(producePayload),
    cache: 'no-store',
  });

  if (!produceRes.ok) {
    const errText = await produceRes.text();
    throw new Error(`Die Ligue rechazó la generación del clip #${index + 1}: ${errText}`);
  }

  const rawJobId = await produceRes.text();
  const jobId = rawJobId.trim().replace(/^"|"$/g, '');
  if (!jobId) {
    throw new Error(`Die Ligue no devolvió identificador de tarea para clip #${index + 1}.`);
  }

  // Sondear estado del trabajo en Die Ligue
  let downloadTicket: string | null = null;
  const maxAttempts = 20;
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
      continue;
    } else if (checkRes.status === 410) {
      throw new Error(`La tarea del clip #${index + 1} expiró en Die Ligue.`);
    } else {
      throw new Error(`Error de estado en Die Ligue (clip #${index + 1}, HTTP ${checkRes.status}).`);
    }
  }

  if (!downloadTicket) {
    throw new Error(`Tiempo de espera agotado transcodificando clip #${index + 1}.`);
  }

  // Descargar el archivo transcodificado y guardarlo en el archivo temporal
  const downloadUrl = `https://coaches.ligen.football/api/common/download/download-clip/mp4/${jobId}/${downloadTicket}`;
  const videoRes = await fetch(downloadUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!videoRes.ok || !videoRes.body) {
    throw new Error(`Fallo al descargar el archivo MP4 del clip #${index + 1} desde Die Ligue.`);
  }

  const arrayBuffer = await videoRes.arrayBuffer();
  fs.writeFileSync(destFilePath, Buffer.from(arrayBuffer));
}

export async function POST(req: Request) {
  const tmpFilesToClean: string[] = [];
  const tmpDir = process.platform === 'win32' ? path.join(process.cwd(), 'scratch') : '/tmp';

  try {
    // 1. Verificación de autorización de staff
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
    const body: MergeRequestBody = await req.json();
    const clips = body?.clips;

    if (!Array.isArray(clips) || clips.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requieren al menos 2 clips válidos para crear un vídeo recopilatorio.',
        },
        { status: 400 }
      );
    }

    for (let i = 0; i < clips.length; i++) {
      const c = clips[i];
      if (
        typeof c.trimStart !== 'number' ||
        typeof c.trimEnd !== 'number' ||
        c.trimEnd <= c.trimStart ||
        !c.videoUrl
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `El clip #${i + 1} tiene parámetros de recorte inválidos.`,
          },
          { status: 400 }
        );
      }
    }

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // 3. Preparar binario FFmpeg
    const ffmpegBin = await prepareFFmpegExecutable();

    // 4. Obtener token de Die Ligue
    let token = await getDieLigenToken(false);

    // 5. Descargar cada clip en paralelo a /tmp
    const batchId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const clipFilePaths: string[] = [];

    for (let i = 0; i < clips.length; i++) {
      const filePath = path.join(tmpDir, `merge_${batchId}_part_${i}.mp4`);
      clipFilePaths.push(filePath);
      tmpFilesToClean.push(filePath);
    }

    // Descargar en paralelo con control de reintento de token si hiciera falta
    try {
      await Promise.all(
        clips.map((clip, i) =>
          produceAndDownloadSingleClip(clip, i, token, clipFilePaths[i])
        )
      );
    } catch (clipErr: unknown) {
      const msg = clipErr instanceof Error ? clipErr.message : String(clipErr);
      if (msg.includes('401')) {
        token = await getDieLigenToken(true);
        await Promise.all(
          clips.map((clip, i) =>
            produceAndDownloadSingleClip(clip, i, token, clipFilePaths[i])
          )
        );
      } else {
        throw clipErr;
      }
    }

    // 6. Escribir lista de concatenación en /tmp respetando exactamente el orden del array
    const concatListPath = path.join(tmpDir, `concat_${batchId}.txt`);
    tmpFilesToClean.push(concatListPath);

    const concatContent = clipFilePaths
      .map((p) => `file '${p.replace(/\\/g, '/')}'`)
      .join('\n') + '\n';

    fs.writeFileSync(concatListPath, concatContent, 'utf8');

    // 7. Ejecutar FFmpeg con -c copy
    const outputPath = path.join(tmpDir, `merged_final_${batchId}.mp4`);
    tmpFilesToClean.push(outputPath);

    await execFileAsync(ffmpegBin, [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
      '-c', 'copy',
      outputPath,
    ]);

    if (!fs.existsSync(outputPath)) {
      throw new Error('El proceso FFmpeg finalizó pero el archivo de salida no fue creado.');
    }

    const outputStats = fs.statSync(outputPath);
    const finalBuffer = fs.readFileSync(outputPath);

    // Preparar nombre descriptivo de archivo
    const homeName = (clips[0].homeTeamName || 'Local').replace(/[^a-zA-Z0-9_-]/g, '_');
    const awayName = (clips[0].awayTeamName || 'Visitante').replace(/[^a-zA-Z0-9_-]/g, '_');
    const finalFilename = `recopilatorio_${homeName}_vs_${awayName}_${clips.length}_clips.mp4`;

    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Content-Length', outputStats.size.toString());
    headers.set('Content-Disposition', `attachment; filename="${finalFilename}"`);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return new Response(finalBuffer, {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido al crear vídeo recopilatorio.';
    console.error('Error en /api/die-ligen/merge-clips:', err);
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 500 }
    );
  } finally {
    // 8. Limpiar rigurosamente todos los temporales en /tmp
    for (const f of tmpFilesToClean) {
      try {
        if (fs.existsSync(f)) {
          fs.unlinkSync(f);
        }
      } catch (cleanErr) {
        console.warn('No se pudo borrar temporal:', f, cleanErr);
      }
    }
  }
}
