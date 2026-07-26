import { NextResponse } from 'next/server';
import { uploadVideoBufferToDrive } from '@/lib/google-drive';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se ha adjuntado ningún archivo de vídeo.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await uploadVideoBufferToDrive(buffer, file.name, file.type);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: unknown) {
    console.warn('[google-drive/upload] Error:', error);
    const msg = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: msg || 'Error al procesar la subida del vídeo a Google Drive.' },
      { status: 500 }
    );
  }
}
