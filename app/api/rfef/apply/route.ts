/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ============================================================================
 * POST /api/rfef/apply
 * ============================================================================
 * Endpoint de ESCRITURA RFEF. Aplica una jornada completa a Supabase.
 *
 * REGLAS ABSOLUTAS:
 * - Requiere el mismo nivel de autorización que /api/rfef/preview.
 * - Requiere exactamente 8 actas en el body (las 8 o ninguna).
 * - Idempotente: codActa ya existente → YA_EXISTENTE_NO_DUPLICADA.
 * - Usa service_role (a través de getSupabaseServerClient).
 * - DIE LIGUE = NO TOCAR. Este endpoint no toca ningún archivo Die Ligue.
 * - NO crea/modifica schema SQL. NO ejecuta migraciones. NO toca permisos.
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyServerAuthorization } from '@/lib/auth-server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { applyJornadaRFEF, ActaInput } from '@/lib/rfef/applier';

export const dynamic = 'force-dynamic';

/**
 * POST /api/rfef/apply
 *
 * Body esperado:
 * {
 *   jornada: number,           // 3
 *   calendarHtml: string,      // HTML del calendario (ya obtenido por el bridge)
 *   actas: [                   // Exactamente 8 actas
 *     { codActa: number, actaHtml: string },
 *     ...
 *   ],
 *   dbMatchId: string          // UUID de public.matches para el partido Indautxu
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // =========================================================================
    // 1. Verificación de autorización (misma lógica que preview/route.ts)
    // =========================================================================
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
      const auth = await verifyServerAuthorization(req);
      isAuthorized = auth.authorized;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Acceso denegado: Se requiere autorización de staff o credenciales de editor válidas.' },
        { status: 401 }
      );
    }

    // =========================================================================
    // 2. Parsear y validar el body
    // =========================================================================
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Body inválido: Se esperaba JSON.' }, { status: 400 });
    }

    const { jornada, calendarHtml, actas, dbMatchId } = body || {};

    // Validar jornada
    const jornadaNum = typeof jornada === 'number' ? jornada : parseInt(String(jornada), 10);
    if (!jornadaNum || jornadaNum < 1 || jornadaNum > 30) {
      return NextResponse.json(
        { error: 'Parámetro jornada inválido. Debe ser un número entre 1 y 30.' },
        { status: 400 }
      );
    }

    // Validar calendarHtml
    if (typeof calendarHtml !== 'string' || calendarHtml.trim().length < 500) {
      return NextResponse.json(
        { error: 'calendarHtml inválido o ausente. Se necesita el HTML del calendario RFEF ya obtenido por el puente.' },
        { status: 400 }
      );
    }

    // Validar actas — exactamente 8
    if (!Array.isArray(actas)) {
      return NextResponse.json(
        { error: 'actas debe ser un array. J' + jornadaNum + ' = las 8 actas o ninguna.' },
        { status: 400 }
      );
    }
    if (actas.length !== 8) {
      return NextResponse.json(
        {
          error: `Se requieren exactamente 8 actas. Recibidas: ${actas.length}. J${jornadaNum} = las 8 actas o ninguna. ABORTADO.`,
          actasRecibidas: actas.length,
        },
        { status: 400 }
      );
    }
    for (const a of actas) {
      if (typeof a.codActa !== 'number' || typeof a.actaHtml !== 'string' || a.actaHtml.trim().length < 500) {
        return NextResponse.json(
          {
            error: `Acta malformada: codActa=${a.codActa}. Cada acta debe tener codActa (number) y actaHtml (string >= 500 chars).`,
          },
          { status: 400 }
        );
      }
    }

    // Validar dbMatchId
    if (typeof dbMatchId !== 'string' || !dbMatchId.trim()) {
      return NextResponse.json(
        { error: 'dbMatchId (UUID de public.matches del partido Indautxu) es obligatorio.' },
        { status: 400 }
      );
    }

    // =========================================================================
    // 3. Inicializar cliente Supabase (service_role vía getSupabaseServerClient)
    // =========================================================================
    const supabase = getSupabaseServerClient();

    // =========================================================================
    // 4. Ejecutar el apply
    // =========================================================================
    const actasInput: ActaInput[] = actas.map((a: any) => ({
      codActa: a.codActa,
      actaHtml: a.actaHtml,
    }));

    const result = await applyJornadaRFEF({
      supabase,
      jornada: jornadaNum,
      calendarHtml: calendarHtml.trim(),
      actas: actasInput,
      dbMatchId: dbMatchId.trim(),
    });

    // =========================================================================
    // 5. Respuesta estructurada
    // =========================================================================
    const httpStatus = result.ok ? 200 : result.abortReason ? 422 : 207;

    return NextResponse.json(
      {
        ok: result.ok,
        jornada: result.jornada,
        abortReason: result.abortReason || null,
        summary: {
          totalActas: result.actas.length,
          creadas: result.actas.filter((a) => a.status === 'CREADA').length,
          yaExistentes: result.actas.filter((a) => a.status === 'YA_EXISTENTE_NO_DUPLICADA').length,
          errores: result.actas.filter((a) => a.status === 'ERROR').length,
          totalStatsInserted: result.totalStatsInserted,
          totalPlayersCreated: result.totalPlayersCreated,
          indautxuMatchUpdated: result.indautxuMatchUpdated,
          indautxuStatsUpserted: result.indautxuStatsUpserted,
        },
        actas: result.actas,
        errors: result.errors,
      },
      { status: httpStatus }
    );
  } catch (err: any) {
    console.error('[rfef/apply] Error inesperado:', err);
    return NextResponse.json(
      {
        error: err?.message || 'Error interno del servidor en /api/rfef/apply.',
        ok: false,
      },
      { status: 500 }
    );
  }
}
