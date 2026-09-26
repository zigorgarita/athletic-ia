import { NextResponse } from 'next/server';
import { isCoachSessionAuthorized, isCoachSessionAuthorizedFromRequest } from '@/lib/auth/staff-session';
import { isEditorSessionAuthorized, isEditorSessionAuthorizedFromRequest, verifySessionToken } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Extrae la identidad verificada del staff a partir de la cookie de sesión staff_session (Zigor, Aitor, etc.)
 * Si no hay sesión nominal de editor, utiliza el nombre provisto o recurre al genérico "Cuerpo Técnico".
 */
function resolveStaffIdentity(req: Request, clientProvidedName?: string | null): string {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/(?:^|;\s*)staff_session=([^;]+)/);
    if (match) {
      const session = verifySessionToken(match[1]);
      if (session?.name?.trim()) {
        return session.name.trim();
      }
    }
  } catch {}
  return clientProvidedName?.trim() || 'Cuerpo Técnico';
}

// ──────────────────────────────────────────────────────────────────────────────
// DELETE — Eliminar tarea de biblioteca (existente, no modificado)
// ──────────────────────────────────────────────────────────────────────────────
export async function DELETE(req: Request) {
  try {
    const authorized =
      (await isCoachSessionAuthorized()) ||
      isCoachSessionAuthorizedFromRequest(req) ||
      (await isEditorSessionAuthorized()) ||
      isEditorSessionAuthorizedFromRequest(req);

    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id')?.trim();

    if (!id) {
      const body = await req.json().catch(() => null);
      if (body && typeof body === 'object' && typeof body.id === 'string') {
        id = body.id.trim();
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'ID de tarea requerido para eliminación.' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServerClient();

    const { error: deleteError } = await supabaseServer
      .from('planning_task_library')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[API /api/planificacion/library DELETE] Error:', deleteError);
      return NextResponse.json({ error: `Error eliminando tarea de biblioteca: ${deleteError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedId: id
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/planificacion/library DELETE] Excepción inesperada:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// POST — Guardar borrador de tarea desde PDF (NUEVO · Fase 2)
// Semántica aprobada: NULL=legado · FALSE=borrador PDF · TRUE=aprobada
// 0 modificaciones sobre sesiones existentes
// 0 modificaciones sobre PDFs existentes
// Conceptos solo se insertan si el usuario los aprobó explícitamente
// ──────────────────────────────────────────────────────────────────────────────
export interface LibraryPostPayload {
  // Campos obligatorios
  nombre: string;
  tipo_tarea: string;
  creado_por: string;
  // Campos de contenido (opcionales pero enriquecidos desde PDF)
  minutos_defecto?: number | null;
  jugadores_defecto?: number | null;
  duracion_texto_pdf?: string | null;
  jugadores_texto_pdf?: string | null;
  espacio_defecto?: string | null;
  objetivo?: string | null;
  descripcion?: string | null;         // campo libre, no prerellenado desde PDF
  observaciones?: string | null;
  desarrollo?: string | null;          // NUEVO · separado de descripcion
  organizacion?: string | null;
  consignas?: string[] | null;
  transicion_rec?: string | null;
  transicion_perd?: string | null;
  // Trazabilidad de origen
  fuente_pdf_url?: string | null;
  sesion_origen_id?: string | null;
  numero_tarea_pdf?: number | null;
  pagina_pdf?: number | null;
  confianza_global?: 'alta' | 'media' | 'baja' | null;
  // Conceptos aprobados explícitamente por el usuario
  conceptos_aprobados?: Array<{
    categoria: 'ATAQUE' | 'DEFENSA' | 'TRANSICIONES' | 'ABP' | 'CONDICIONAL' | 'MENTAL';
    concepto: string;
  }>;
}

export async function POST(req: Request) {
  try {
    // 1. Autenticación
    const authorized =
      (await isCoachSessionAuthorized()) ||
      isCoachSessionAuthorizedFromRequest(req) ||
      (await isEditorSessionAuthorized()) ||
      isEditorSessionAuthorizedFromRequest(req);

    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    // 2. Validar body
    let payload: LibraryPostPayload;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: 'Body JSON inválido.' }, { status: 400 });
    }

    if (!payload.nombre?.trim()) {
      return NextResponse.json({ error: 'El campo nombre es obligatorio.' }, { status: 400 });
    }
    if (!payload.tipo_tarea?.trim()) {
      return NextResponse.json({ error: 'El campo tipo_tarea es obligatorio.' }, { status: 400 });
    }
    if (!payload.creado_por?.trim()) {
      return NextResponse.json({ error: 'El campo creado_por es obligatorio.' }, { status: 400 });
    }

    const staffIdentity = resolveStaffIdentity(req, payload.creado_por);

    const supabaseServer = getSupabaseServerClient();

    // 3. INSERT en planning_task_library
    // aprobada = FALSE → borrador visible solo para staff, NO en biblioteca activa
    // Nunca se modifica ningún dato existente
    const insertData = {
      nombre:             payload.nombre.trim(),
      tipo_tarea:         payload.tipo_tarea.trim(),
      creado_por:         staffIdentity,
      minutos_defecto:    payload.minutos_defecto ?? null,
      jugadores_defecto:  payload.jugadores_defecto ?? null,
      duracion_texto_pdf: payload.duracion_texto_pdf ?? null,
      jugadores_texto_pdf: payload.jugadores_texto_pdf ?? null,
      espacio_defecto:    payload.espacio_defecto ?? null,
      objetivo:           payload.objetivo ?? null,
      descripcion:        payload.descripcion ?? '',  // campo libre, puede estar vacío
      observaciones:      payload.observaciones ?? null,
      // Fase 2: contenido enriquecido
      desarrollo:         payload.desarrollo ?? null,
      organizacion:       payload.organizacion ?? null,
      consignas:          payload.consignas ?? null,
      transicion_rec:     payload.transicion_rec ?? null,
      transicion_perd:    payload.transicion_perd ?? null,
      // Trazabilidad
      fuente_pdf_url:     payload.fuente_pdf_url ?? null,
      sesion_origen_id:   payload.sesion_origen_id ?? null,
      numero_tarea_pdf:   payload.numero_tarea_pdf ?? null,
      pagina_pdf:         payload.pagina_pdf ?? null,
      confianza_global:   payload.confianza_global ?? null,
      // Estado: siempre FALSE para borradores desde PDF
      aprobada:           false,
    };

    const { data: insertedTask, error: insertError } = await supabaseServer
      .from('planning_task_library')
      .insert(insertData)
      .select('id')
      .single();

    if (insertError || !insertedTask) {
      console.error('[API /api/planificacion/library POST] Error INSERT:', insertError);
      return NextResponse.json(
        { error: `Error guardando tarea en biblioteca: ${insertError?.message ?? 'sin respuesta'}` },
        { status: 500 }
      );
    }

    const libraryId = insertedTask.id;

    // 4. INSERT conceptos aprobados (solo los que el usuario aprobó explícitamente)
    const conceptosAprobados = payload.conceptos_aprobados ?? [];
    if (conceptosAprobados.length > 0) {
      const conceptRows = conceptosAprobados.map(c => ({
        library_id:   libraryId,
        categoria:    c.categoria,
        concepto:     c.concepto,
        aprobado_por: staffIdentity,
      }));

      const { error: conceptError } = await supabaseServer
        .from('planning_task_library_concepts')
        .insert(conceptRows);

      if (conceptError) {
        // No es bloqueante: la tarea ya está guardada. Solo logueamos el error.
        console.error('[API /api/planificacion/library POST] Error INSERT conceptos:', conceptError);
      }
    }

    console.log(
      `[API /api/planificacion/library POST] Borrador guardado: ${libraryId} | ` +
      `Creador/Aprobador: ${staffIdentity} | Conceptos: ${conceptosAprobados.length} | aprobada=FALSE`
    );

    return NextResponse.json({
      ok: true,
      id: libraryId,
      conceptos_guardados: conceptosAprobados.length,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/planificacion/library POST] Excepción inesperada:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// PATCH — Aprobar borrador de tarea e incorporarlo a la biblioteca activa
// Solo cambia aprobada = TRUE, revisada_por, revisada_at en esa única fila
// 0 borrados, 0 fusiones, no modifica ninguna otra tarea
// ──────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: Request) {
  try {
    const authorized =
      (await isCoachSessionAuthorized()) ||
      isCoachSessionAuthorizedFromRequest(req) ||
      (await isEditorSessionAuthorized()) ||
      isEditorSessionAuthorizedFromRequest(req);

    if (!authorized) {
      return NextResponse.json({ error: 'No autorizado: Sesión de cuerpo técnico requerida.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const id = typeof body?.id === 'string' ? body.id.trim() : '';

    if (!id) {
      return NextResponse.json({ error: 'ID de tarea requerido para aprobar.' }, { status: 400 });
    }

    const revisadaPor = resolveStaffIdentity(req, body?.revisada_por);
    const supabaseServer = getSupabaseServerClient();

    const { data: updatedTask, error: updateError } = await supabaseServer
      .from('planning_task_library')
      .update({
        aprobada: true,
        revisada_por: revisadaPor,
        revisada_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('[API /api/planificacion/library PATCH] Error actualizando borrador:', updateError);
      return NextResponse.json({ error: `Error aprobando tarea: ${updateError.message}` }, { status: 500 });
    }

    console.log(
      `[API /api/planificacion/library PATCH] Tarea aprobada: ${id} | ` +
      `Revisada por: ${revisadaPor} | aprobada=TRUE`
    );

    return NextResponse.json({
      ok: true,
      task: updatedTask,
      mensaje: 'Tarea aprobada e incorporada a la biblioteca activa.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error interno del servidor.';
    console.error('[API /api/planificacion/library PATCH] Excepción inesperada:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
