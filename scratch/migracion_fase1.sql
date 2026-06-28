BEGIN;

-- 1. Crear Enums si no existen (Idempotente)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'Director Deportivo', 'Entrenador', 'Segundo Entrenador', 
        'Analista', 'Preparador Físico', 'Delegado', 'Jugador', 'Invitado'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE library_type AS ENUM (
        'Drill', 'ABP', 'SessionTemplate', 'Video', 'PDF', 'Article', 'Book', 'AI_Generated'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Crear Tablas Maestras (Idempotente)
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    categoria TEXT,
    escudo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Crear Perfiles de Usuario (Idempotente)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    apellidos TEXT,
    rol user_role NOT NULL DEFAULT 'Invitado',
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Crear Biblioteca IA Básica (Idempotente)
CREATE TABLE IF NOT EXISTS ia_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo library_type NOT NULL,
    titulo TEXT NOT NULL,
    subtitulo TEXT,
    contenido TEXT,
    categoria TEXT,
    tags TEXT[],
    url_recurso TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Crear Versionado de Sesiones (Idempotente)
CREATE TABLE IF NOT EXISTS planning_session_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES planning_sessions(id) ON DELETE CASCADE,
    version_numero INTEGER NOT NULL,
    datos_sesion JSONB NOT NULL,
    cambiado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    motivo_cambio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_session_version UNIQUE (session_id, version_numero)
);

-- 6. Crear Logs de Auditoría (Idempotente)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    accion TEXT NOT NULL,
    tabla_afectada TEXT NOT NULL,
    registro_id UUID,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Modificar tabla existente planning_sessions (Columnas Nullable, Idempotente)
ALTER TABLE planning_sessions 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS valoracion_entrenador TEXT,
ADD COLUMN IF NOT EXISTS valoracion_media_jugadores NUMERIC(2,1);

-- 8. Crear Índices (Idempotente)
CREATE INDEX IF NOT EXISTS idx_user_profiles_rol ON user_profiles(rol);
CREATE INDEX IF NOT EXISTS idx_ia_library_tipo ON ia_library(tipo);
CREATE INDEX IF NOT EXISTS idx_planning_session_versions_sid ON planning_session_versions(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- 9. Habilitar RLS (Idempotente)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_session_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 10. Políticas de Seguridad RLS (Limpieza y creación idempotente)
DROP POLICY IF EXISTS "Public Read Teams" ON teams;
CREATE POLICY "Public Read Teams" ON teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Seasons" ON seasons;
CREATE POLICY "Public Read Seasons" ON seasons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Profiles" ON user_profiles;
CREATE POLICY "Public Read Profiles" ON user_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Library" ON ia_library;
CREATE POLICY "Public Read Library" ON ia_library FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff Modify Library" ON ia_library;
CREATE POLICY "Staff Modify Library" ON ia_library FOR ALL USING (true);

DROP POLICY IF EXISTS "Staff Modify Teams" ON teams;
CREATE POLICY "Staff Modify Teams" ON teams FOR ALL USING (true);

DROP POLICY IF EXISTS "Staff Modify Seasons" ON seasons;
CREATE POLICY "Staff Modify Seasons" ON seasons FOR ALL USING (true);

DROP POLICY IF EXISTS "Staff Modify Profiles" ON user_profiles;
CREATE POLICY "Staff Modify Profiles" ON user_profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Staff Read Logs" ON audit_logs;
CREATE POLICY "Staff Read Logs" ON audit_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "System Insert Logs" ON audit_logs;
CREATE POLICY "System Insert Logs" ON audit_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Staff Modify Versions" ON planning_session_versions;
CREATE POLICY "Staff Modify Versions" ON planning_session_versions FOR ALL USING (true);

COMMIT;
