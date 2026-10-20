-- =============================================================================
-- PLANTILLA DE REFERENCIA · NUEVAS TABLAS EN SUPABASE (esquema public)
-- Athletic IA · Temporada 2026/27
--
-- Motivo: desde el 30/10/2026 Supabase ya NO concede permisos automáticos
-- (default privileges) a anon / authenticated / service_role sobre tablas y
-- secuencias nuevas del esquema public. Sin GRANT explícito, la Data API
-- (supabase-js / PostgREST) devuelve: 42501 permission denied for table ...
-- Fuente oficial:
-- https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
--
-- ⚠️  ESTO ES UNA PLANTILLA DOCUMENTAL. NO ES UNA MIGRACIÓN.
--   - NO ejecutar tal cual. Copiar a un script nuevo en sql/ y adaptar.
--   - NO aplicar sobre tablas existentes (conservan sus permisos actuales).
--   - Todo script lo ejecuta manualmente Zigor en el SQL Editor de Supabase.
--   - Prohibido DROP / TRUNCATE / borrados / recreación de tablas existentes.
-- =============================================================================

-- Salvaguarda: si alguien ejecuta este archivo por error, se detiene aquí
-- sin haber hecho ningún cambio.
DO $$
BEGIN
  RAISE EXCEPTION 'PLANTILLA DOCUMENTAL: no ejecutar. Copiar y adaptar en un script nuevo.';
END
$$;


-- =============================================================================
-- 0. CONTEXTO DE ACCESO EN ATHLETIC IA (leer antes de elegir perfil)
-- =============================================================================
-- | Capa                 | Cliente                    | Rol Postgres          |
-- |----------------------|----------------------------|-----------------------|
-- | Navegador (hooks)    | lib/supabase.ts (anon key) | anon                  |
-- | API Next.js (app/api)| lib/supabase-server.ts     | service_role          |
-- | RPC SECURITY DEFINER | supabase.rpc(...)          | propietario (postgres)|
--
-- Notas clave:
--   * El navegador NO inicia sesión en Supabase Auth: todas sus peticiones
--     llegan como "anon". El rol "authenticated" hoy NO se usa en la app.
--   * service_role se salta RLS, pero NO se salta los GRANT. Necesita GRANT.
--   * La seguridad de escritura vive en las rutas API (sesión de staff).
--     Por tanto, anon NUNCA debe recibir INSERT / UPDATE / DELETE.
--   * Hoy no usamos SERIAL / IDENTITY (todo UUID). Si se usaran, ver sección 5.


-- =============================================================================
-- 1. FICHA DE JUSTIFICACIÓN (obligatoria, rellenar en el script real)
-- =============================================================================
-- Tabla:                public.<nombre_tabla>
-- Módulo / funcionalidad: <Liga | Rivales | Plantilla | Planificación | ...>
-- ¿Quién lee?           <ruta API (service_role) | hook navegador (anon) | RPC>
-- ¿Quién escribe?       <ruta API (service_role) | RPC SECURITY DEFINER>
-- ¿Datos sensibles?     <sí/no> (médicos, multas, valoraciones, informes
--                        de rivales, datos personales => SÍ)
-- Perfil elegido:       <A | B | C | D>
-- Justificación de cada GRANT a anon/authenticated (si los hay):
--   - <qué hook/componente concreto lo necesita y por qué>


-- =============================================================================
-- 2. CREACIÓN DE LA TABLA (común a todos los perfiles)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.<nombre_tabla> (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ... columnas ...
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS SIEMPRE activado, sea cual sea el perfil.
ALTER TABLE public.<nombre_tabla> ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 3. PERFILES DE ACCESO (elegir UNO; borrar los demás en el script real)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PERFIL A · SOLO SERVIDOR  ✅ PERFIL POR DEFECTO RECOMENDADO
-- -----------------------------------------------------------------------------
-- Uso: lectura y escritura exclusivamente desde rutas app/api/** con
--      getSupabaseServerClient(). Referencia existente:
--      sql/fase_rivales_reports_schema.sql
-- Obligatorio para datos sensibles.
-- anon / authenticated: SIN PERMISOS.

REVOKE ALL ON TABLE public.<nombre_tabla> FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.<nombre_tabla> TO service_role;
-- Sin políticas RLS: RLS activo sin políticas = acceso denegado a anon/authenticated.
-- (service_role ignora RLS, por eso funciona desde el servidor.)


-- -----------------------------------------------------------------------------
-- PERFIL B · LECTURA DESDE NAVEGADOR + ESCRITURA POR SERVIDOR
-- -----------------------------------------------------------------------------
-- Uso: SOLO si un hook/componente lee la tabla directamente con
--      lib/supabase.ts (clave anon) y los datos NO son sensibles.
-- Requiere justificar en la ficha (sección 1) el hook concreto.
-- Alternativa preferente: exponer la lectura mediante una ruta API (Perfil A).
-- anon: SOLO SELECT. Nunca INSERT / UPDATE / DELETE.

REVOKE ALL ON TABLE public.<nombre_tabla> FROM anon, authenticated;
GRANT SELECT ON TABLE public.<nombre_tabla> TO anon;          -- justificado: <hook>
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.<nombre_tabla> TO service_role;

DROP POLICY IF EXISTS "Read <nombre_tabla>" ON public.<nombre_tabla>;
CREATE POLICY "Read <nombre_tabla>"
    ON public.<nombre_tabla>
    FOR SELECT
    TO anon
    USING (true);   -- restringir filas si procede (p. ej. solo registros activos)


-- -----------------------------------------------------------------------------
-- PERFIL C · USUARIOS AUTENTICADOS (Supabase Auth)  ⛔ HOY NO APLICA
-- -----------------------------------------------------------------------------
-- La app no usa sesiones de Supabase Auth en el navegador. Solo se usaría si
-- en el futuro se implanta login con Supabase Auth y se aprueba previamente.
-- Conceder únicamente las operaciones justificadas, con políticas por usuario.

-- REVOKE ALL ON TABLE public.<nombre_tabla> FROM anon, authenticated;
-- GRANT SELECT ON TABLE public.<nombre_tabla> TO authenticated;   -- justificado: <...>
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.<nombre_tabla> TO service_role;
-- CREATE POLICY "Own rows <nombre_tabla>"
--     ON public.<nombre_tabla> FOR SELECT TO authenticated
--     USING (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- PERFIL D · INTERNA (solo accesible vía RPC SECURITY DEFINER)
-- -----------------------------------------------------------------------------
-- Uso: tablas auxiliares que solo manipulan funciones atómicas
--      (patrón save_*_atomic). Ningún rol de la Data API accede a la tabla.
-- La función corre como su propietario y no necesita GRANT de tabla.
-- El permiso se concede sobre la FUNCIÓN, no sobre la tabla.

REVOKE ALL ON TABLE public.<nombre_tabla> FROM anon, authenticated, service_role;
-- Sin políticas.
-- En la función correspondiente:
-- REVOKE ALL ON FUNCTION public.<funcion>(<args>) FROM PUBLIC, anon, authenticated;
-- GRANT EXECUTE ON FUNCTION public.<funcion>(<args>) TO service_role;


-- =============================================================================
-- 4. ÍNDICES (si aplica)
-- =============================================================================
-- CREATE INDEX IF NOT EXISTS idx_<nombre_tabla>_<columna>
--     ON public.<nombre_tabla>(<columna>);


-- =============================================================================
-- 5. SECUENCIAS (solo si se usa SERIAL / BIGSERIAL / IDENTITY)
-- =============================================================================
-- Desde el 30/10/2026 las secuencias nuevas tampoco reciben permisos.
-- Conceder solo al rol que inserta (normalmente service_role):
-- GRANT USAGE, SELECT ON SEQUENCE public.<nombre_tabla>_id_seq TO service_role;


-- =============================================================================
-- 6. VERIFICACIÓN POSTERIOR (solo lectura, tras ejecutar el script real)
-- =============================================================================
-- 6.1 Permisos efectivos por rol sobre la tabla nueva:
-- SELECT grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privilegios
-- FROM information_schema.role_table_grants
-- WHERE table_schema = 'public' AND table_name = '<nombre_tabla>'
--   AND grantee IN ('anon', 'authenticated', 'service_role')
-- GROUP BY grantee;
--
-- 6.2 RLS activado:
-- SELECT relname, relrowsecurity FROM pg_class
-- WHERE oid = 'public.<nombre_tabla>'::regclass;
--
-- 6.3 Políticas:
-- SELECT policyname, roles, cmd, qual, with_check
-- FROM pg_policies WHERE schemaname = 'public' AND tablename = '<nombre_tabla>';
--
-- Resultado esperado según perfil:
--   A: service_role = DELETE, INSERT, SELECT, UPDATE · anon/authenticated = (nada)
--   B: service_role = CRUD · anon = SELECT · authenticated = (nada)
--   D: ningún rol de la Data API con permisos sobre la tabla
-- =============================================================================
