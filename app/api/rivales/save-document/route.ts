import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { verifyServerAuthorization } from '@/lib/auth-server';
import { downloadFileFromUrl, validateDocumentBuffer } from '@/lib/ai/document-parser';

export const maxDuration = 60; // 60s timeout for download and hashing

export async function POST(req: Request) {
  try {
    const authCheck = await verifyServerAuthorization(req);
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error || 'Acceso no autorizado para guardar documentos.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { clubId, clubSeasonId, nombre, url, tipo, fecha, comentario } = body;

    if (!clubId || !nombre || !url) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios (clubId, nombre, url).' },
        { status: 400 }
      );
    }

    // 1. Descargar archivo y calcular hash SHA-256
    let fileHash: string | null = null;
    try {
      const downloaded = await downloadFileFromUrl(url);
      validateDocumentBuffer(downloaded.buffer);
      fileHash = createHash('sha256').update(downloaded.buffer).digest('hex');
    } catch (dlErr: unknown) {
      const msg = dlErr instanceof Error ? dlErr.message : String(dlErr);
      console.warn('[save-document] Advertencia al descargar/calcular hash:', msg);
      // Si el archivo no se puede descargar ahora mismo (p.ej. enlace privado de drive sin bytes directos),
      // permitimos el registro pero sin file_hash para no bloquear la subida.
    }

    const supabaseServer = getSupabaseServerClient();

    // 2. Llamar a RPC PostgreSQL atómica `create_document_version`
    const { data: rpcRes, error: rpcErr } = await supabaseServer.rpc('create_document_version', {
      p_club_id: clubId,
      p_club_season_id: clubSeasonId || null,
      p_nombre: nombre,
      p_url: url,
      p_file_hash: fileHash,
      p_tipo: tipo || 'PDF',
      p_fecha: fecha || new Date().toISOString().split('T')[0],
      p_comentario: comentario || null,
    });

    if (rpcErr) {
      console.error('[save-document] Error en RPC create_document_version:', rpcErr);
      return NextResponse.json(
        { error: `Error al guardar documento en base de datos: ${rpcErr.message}` },
        { status: 500 }
      );
    }

    const result = rpcRes as {
      result: 'duplicate' | 'new_version' | 'new_document';
      existing_id?: string;
      existing_name?: string;
      id?: string;
      version?: number;
      group_id?: string;
    };

    if (result.result === 'duplicate') {
      return NextResponse.json({
        success: false,
        isDuplicate: true,
        message: `Este archivo ya existe en el rival como "${result.existing_name}" (v${result.version}). No se ha creado un duplicado.`,
      });
    }

    return NextResponse.json({
      success: true,
      documentId: result.id,
      version: result.version,
      isNewVersion: result.result === 'new_version',
      fileHash,
    });
  } catch (error: unknown) {
    console.error('Error en API save-document:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: msg || 'Error inesperado al guardar el documento.' },
      { status: 500 }
    );
  }
}
