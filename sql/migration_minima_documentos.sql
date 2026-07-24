-- ============================================================
-- MIGRACIÓN MÍNIMA Y TRANSACCIONAL: ESTADOS Y OBSERVACIONES
-- ============================================================

-- 1. Añadir 4 columnas esenciales a club_documents
ALTER TABLE club_documents
  ADD COLUMN IF NOT EXISTS estado_analisis TEXT DEFAULT 'sin_analizar',
  ADD COLUMN IF NOT EXISTS extraccion_json JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS file_hash TEXT DEFAULT NULL;

-- 2. Reconciliación inicial para documentos que ya tienen observaciones aprobadas
UPDATE club_documents cd
SET estado_analisis = 'analizado',
    analyzed_at = (
      SELECT MAX(approved_at)
      FROM club_report_observations
      WHERE document_id = cd.id AND status = 'aprobado'
    )
WHERE EXISTS (
  SELECT 1
  FROM club_report_observations
  WHERE document_id = cd.id AND status = 'aprobado'
)
AND (cd.estado_analisis IS NULL OR cd.estado_analisis = 'sin_analizar');

-- 3. RPC Transaccional: sustitución atómica de observaciones por documento
CREATE OR REPLACE FUNCTION replace_document_observations(
  p_document_id UUID,
  p_rows JSONB
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_inserted_count INTEGER := 0;
BEGIN
  IF p_document_id IS NULL THEN
    RAISE EXCEPTION 'p_document_id no puede ser NULL';
  END IF;

  -- Step 1: Eliminar observaciones anteriores asociadas a este documento
  DELETE FROM club_report_observations
  WHERE document_id = p_document_id;

  -- Step 2: Insertar nuevas observaciones si se proporcionan filas
  IF p_rows IS NOT NULL AND jsonb_array_length(p_rows) > 0 THEN
    INSERT INTO club_report_observations (
      document_id,
      club_id,
      club_season_id,
      document_name,
      document_date,
      rival_name,
      season,
      category,
      content,
      source_type,
      page,
      original_evidence,
      confidence,
      status,
      priority,
      is_analyst_proposal,
      rival_player_name,
      rival_player_dorsal,
      rival_player_position,
      rival_player_threat_level,
      observation_date,
      approved_at
    )
    SELECT
      NULLIF(elem->>'document_id', '')::UUID,
      NULLIF(elem->>'club_id', '')::UUID,
      NULLIF(elem->>'club_season_id', '')::UUID,
      COALESCE(elem->>'document_name', 'Documento de Scouting'),
      NULLIF(elem->>'document_date', '')::DATE,
      elem->>'rival_name',
      elem->>'season',
      COALESCE(elem->>'category', 'general'),
      COALESCE(elem->>'content', ''),
      COALESCE(elem->>'source_type', 'texto'),
      COALESCE((elem->>'page')::INTEGER, 1),
      elem->>'original_evidence',
      COALESCE(elem->>'confidence', 'alta'),
      'aprobado',
      COALESCE(elem->>'priority', 'normal'),
      COALESCE((elem->>'is_analyst_proposal')::BOOLEAN, false),
      elem->>'rival_player_name',
      elem->>'rival_player_dorsal',
      elem->>'rival_player_position',
      elem->>'rival_player_threat_level',
      NULLIF(elem->>'observation_date', '')::DATE,
      COALESCE(NULLIF(elem->>'approved_at', '')::TIMESTAMPTZ, timezone('utc', now()))
    FROM jsonb_array_elements(p_rows) AS elem;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  END IF;

  -- Step 3: Marcar documento como analizado dentro de la misma transacción
  UPDATE club_documents
  SET estado_analisis = 'analizado',
      analyzed_at = timezone('utc', now())
  WHERE id = p_document_id;

  RETURN v_inserted_count;
END;
$$;
