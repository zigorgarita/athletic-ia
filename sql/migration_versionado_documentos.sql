BEGIN;

-- ============================================================
-- MIGRACIÓN DE VERSIONADO DE DOCUMENTOS (BLOQUE 3)
-- Archivo: sql/migration_versionado_documentos.sql
-- ESTADO: PREPARADO - NO EJECUTADO
-- ============================================================

-- 1. Añadir columnas de versionado a `public.club_documents` sin valor por defecto inicial
ALTER TABLE public.club_documents
  ADD COLUMN IF NOT EXISTS document_group_id UUID,
  ADD COLUMN IF NOT EXISTS version INTEGER,
  ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES public.club_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_current_version BOOLEAN;

-- 2. Inicializar documentos preexistentes ("Prueba Alavés" y otros)
-- Asigna a cada documento su propio `id` como `document_group_id`, `version = 1`, `is_current_version = true`
UPDATE public.club_documents
SET document_group_id = id
WHERE document_group_id IS NULL;

UPDATE public.club_documents
SET version = 1
WHERE version IS NULL;

UPDATE public.club_documents
SET is_current_version = true
WHERE is_current_version IS NULL;

-- 3. Establecer valores DEFAULT para inserciones futuras
ALTER TABLE public.club_documents
  ALTER COLUMN document_group_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN version SET DEFAULT 1,
  ALTER COLUMN is_current_version SET DEFAULT true;

-- 4. Definir restricciones NOT NULL explícitas
ALTER TABLE public.club_documents
  ALTER COLUMN document_group_id SET NOT NULL,
  ALTER COLUMN version SET NOT NULL,
  ALTER COLUMN is_current_version SET NOT NULL;

-- 5. Restricción CHECK para versión (versión debe ser mayor o igual a 1)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint WHERE conname = 'chk_club_documents_version'
  ) THEN
    ALTER TABLE public.club_documents
      ADD CONSTRAINT chk_club_documents_version CHECK (version >= 1);
  END IF;
END $$;

-- 6. Creación de Índices e Índices Únicos Parciales
-- Índice por rival y temporada para búsquedas de ámbito
CREATE INDEX IF NOT EXISTS idx_club_documents_club_season ON public.club_documents(club_id, club_season_id);

-- Índice por document_group_id para búsquedas de grupos de versiones
CREATE INDEX IF NOT EXISTS idx_club_documents_group_id ON public.club_documents(document_group_id);

-- Índice por parent_document_id para navegar la genealogía de versiones
CREATE INDEX IF NOT EXISTS idx_club_documents_parent_id ON public.club_documents(parent_document_id);

-- Índice por file_hash para acelerar la detección de duplicados por contenido SHA-256
CREATE INDEX IF NOT EXISTS idx_club_documents_file_hash ON public.club_documents(file_hash) WHERE (file_hash IS NOT NULL);

-- Restricción ÚNICA: Impide dos versiones con el mismo número dentro de un mismo grupo
CREATE UNIQUE INDEX IF NOT EXISTS uq_club_documents_group_version ON public.club_documents (document_group_id, version);

-- Restricción ÚNICA parcial: Impide dos versiones marcadas como actuales dentro del mismo grupo
CREATE UNIQUE INDEX IF NOT EXISTS uq_club_documents_current_version ON public.club_documents (document_group_id) WHERE (is_current_version = true);

-- Restricción ÚNICA parcial: Impide dos grupos distintos con el mismo nombre activo dentro de la misma temporada y rival
CREATE UNIQUE INDEX IF NOT EXISTS uq_club_documents_active_name ON public.club_documents (club_id, COALESCE(club_season_id, '00000000-0000-0000-0000-000000000000'::uuid), nombre) WHERE (is_current_version = true);

-- 7. RPC Atómica create_document_version con Firma Exacta y Máxima Seguridad (search_path = '')
CREATE OR REPLACE FUNCTION public.create_document_version(
  p_club_id UUID,
  p_club_season_id UUID DEFAULT NULL,
  p_nombre TEXT DEFAULT NULL,
  p_url TEXT DEFAULT NULL,
  p_file_hash TEXT DEFAULT NULL,
  p_tipo TEXT DEFAULT 'PDF',
  p_fecha DATE DEFAULT CURRENT_DATE,
  p_comentario TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing_id UUID;
  v_existing_name TEXT;
  v_existing_version INT;
  v_parent_id UUID;
  v_group_id UUID;
  v_current_version INT;
  v_new_version INT;
  v_new_doc_id UUID;
BEGIN
  -- Validaciones de parámetros obligatorios
  IF p_club_id IS NULL THEN
    RAISE EXCEPTION 'El parámetro p_club_id no puede ser NULL';
  END IF;
  IF p_nombre IS NULL OR pg_catalog.btrim(p_nombre) = '' THEN
    RAISE EXCEPTION 'El parámetro p_nombre no puede estar vacío';
  END IF;
  IF p_url IS NULL OR pg_catalog.btrim(p_url) = '' THEN
    RAISE EXCEPTION 'El parámetro p_url no puede estar vacío';
  END IF;

  -- ------------------------------------------------------------
  -- REGLA DE SEGURIDAD ANTE CONCURRENCIA: Bloqueo Consultivo Transaccional
  -- Serializa peticiones simultáneas dentro del ámbito exacto de (club_id, club_season_id)
  -- ------------------------------------------------------------
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('doc_scope:' || p_club_id::text || ':' || COALESCE(p_club_season_id::text, 'no_season'))
  );

  -- ------------------------------------------------------------
  -- REGLA 1 & 2: Detección de Duplicados en el mismo RIVAL Y TEMPORADA
  -- (Utiliza IS NOT DISTINCT FROM para tratar correctamente el valor NULL en club_season_id)
  -- ------------------------------------------------------------
  IF p_file_hash IS NOT NULL AND pg_catalog.btrim(p_file_hash) <> '' THEN
    -- Detectar duplicado por hash SHA-256 en el mismo rival y temporada (mismo o diferente nombre)
    SELECT id, nombre, version
    INTO v_existing_id, v_existing_name, v_existing_version
    FROM public.club_documents
    WHERE club_id = p_club_id
      AND club_season_id IS NOT DISTINCT FROM p_club_season_id
      AND file_hash = p_file_hash
    ORDER BY version DESC, created_at DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN pg_catalog.jsonb_build_object(
        'result', 'duplicate',
        'existing_id', v_existing_id,
        'existing_name', v_existing_name,
        'version', v_existing_version
      );
    END IF;
  ELSE
    -- Si no hay hash, detectar duplicado por nombre y URL idénticos en el mismo rival y temporada
    SELECT id, nombre, version
    INTO v_existing_id, v_existing_name, v_existing_version
    FROM public.club_documents
    WHERE club_id = p_club_id
      AND club_season_id IS NOT DISTINCT FROM p_club_season_id
      AND nombre = p_nombre
      AND url = p_url
      AND is_current_version = true
    ORDER BY version DESC, created_at DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN pg_catalog.jsonb_build_object(
        'result', 'duplicate',
        'existing_id', v_existing_id,
        'existing_name', v_existing_name,
        'version', v_existing_version
      );
    END IF;
  END IF;

  -- ------------------------------------------------------------
  -- REGLA 3: Detección de Nueva Versión (Mismo Nombre, Distinto Hash) en el mismo RIVAL Y TEMPORADA
  -- Bloqueo FOR UPDATE para control de concurrencia de nivel de fila
  -- ------------------------------------------------------------
  SELECT id, document_group_id, version
  INTO v_parent_id, v_group_id, v_current_version
  FROM public.club_documents
  WHERE club_id = p_club_id
    AND club_season_id IS NOT DISTINCT FROM p_club_season_id
    AND nombre = p_nombre
    AND is_current_version = true
  ORDER BY version DESC, created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    v_group_id := COALESCE(v_group_id, v_parent_id);
    v_new_version := COALESCE(v_current_version, 1) + 1;

    -- Desmarcar versión anterior dentro del mismo grupo
    UPDATE public.club_documents
    SET is_current_version = false
    WHERE document_group_id = v_group_id
      AND is_current_version = true;

    -- Insertar la nueva versión
    INSERT INTO public.club_documents (
      club_id,
      club_season_id,
      nombre,
      tipo,
      url,
      comentario,
      fecha,
      file_hash,
      document_group_id,
      version,
      parent_document_id,
      is_current_version,
      estado_analisis
    ) VALUES (
      p_club_id,
      p_club_season_id,
      p_nombre,
      COALESCE(p_tipo, 'PDF'),
      p_url,
      p_comentario,
      COALESCE(p_fecha, CURRENT_DATE),
      p_file_hash,
      v_group_id,
      v_new_version,
      v_parent_id,
      true,
      'sin_analizar'
    )
    RETURNING id INTO v_new_doc_id;

    RETURN pg_catalog.jsonb_build_object(
      'result', 'new_version',
      'id', v_new_doc_id,
      'version', v_new_version,
      'group_id', v_group_id
    );
  END IF;

  -- ------------------------------------------------------------
  -- REGLA 4: Documento Completamente Nuevo (v1) en este RIVAL Y TEMPORADA
  -- ------------------------------------------------------------
  v_group_id := gen_random_uuid();
  v_new_version := 1;

  INSERT INTO public.club_documents (
    club_id,
    club_season_id,
    nombre,
    tipo,
    url,
    comentario,
    fecha,
    file_hash,
    document_group_id,
    version,
    parent_document_id,
    is_current_version,
    estado_analisis
  ) VALUES (
    p_club_id,
    p_club_season_id,
    p_nombre,
    COALESCE(p_tipo, 'PDF'),
    p_url,
    p_comentario,
    COALESCE(p_fecha, CURRENT_DATE),
    p_file_hash,
    v_group_id,
    v_new_version,
    NULL,
    true,
    'sin_analizar'
  )
  RETURNING id INTO v_new_doc_id;

  RETURN pg_catalog.jsonb_build_object(
    'result', 'new_document',
    'id', v_new_doc_id,
    'version', 1,
    'group_id', v_group_id
  );

END;
$$;

-- 8. Seguridad y Permisos Restringidos Exclusivamente a service_role
REVOKE ALL ON FUNCTION public.create_document_version(UUID, UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_document_version(UUID, UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT) TO service_role;

COMMIT;
