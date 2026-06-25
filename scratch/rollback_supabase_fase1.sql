-- =========================================================================
-- PLAN DE ROLLBACK FASE 1: RESTAURAR ACCESO PÚBLICO COMPLETO (DESARROLLO)
-- =========================================================================

-- 1. Eliminar políticas de "solo lectura pública"
DROP POLICY IF EXISTS "Public SELECT only" ON players;
DROP POLICY IF EXISTS "Public SELECT only" ON detailed_evaluations;
DROP POLICY IF EXISTS "Public SELECT only" ON observaciones;
DROP POLICY IF EXISTS "Public SELECT only" ON player_injuries;
DROP POLICY IF EXISTS "Public SELECT only" ON training_attendance;
DROP POLICY IF EXISTS "Public SELECT only" ON training_evaluations;
DROP POLICY IF EXISTS "Public SELECT only" ON matches;
DROP POLICY IF EXISTS "Public SELECT only" ON match_player_stats;
DROP POLICY IF EXISTS "Public SELECT only" ON gps_sessions;
DROP POLICY IF EXISTS "Public SELECT only" ON gps_data;
DROP POLICY IF EXISTS "Public SELECT only" ON abp_plays;
DROP POLICY IF EXISTS "Public SELECT only" ON abp_player_roles;
DROP POLICY IF EXISTS "Public SELECT only" ON tactical_lineups;
DROP POLICY IF EXISTS "Public SELECT only" ON match_abp_plays;
DROP POLICY IF EXISTS "Public SELECT only" ON match_abp_player_roles;
DROP POLICY IF EXISTS "Public SELECT only" ON match_full_videos;
DROP POLICY IF EXISTS "Public SELECT only" ON match_video_clips;
DROP POLICY IF EXISTS "Public SELECT only" ON match_strategic_actions;
DROP POLICY IF EXISTS "Public SELECT only" ON match_custom_videos;
DROP POLICY IF EXISTS "Public SELECT only" ON match_documents;
DROP POLICY IF EXISTS "Public SELECT only" ON planning_periods;
DROP POLICY IF EXISTS "Public SELECT only" ON planning_sessions;
DROP POLICY IF EXISTS "Public SELECT only" ON planning_concepts;
DROP POLICY IF EXISTS "Public SELECT only" ON planning_tasks;
DROP POLICY IF EXISTS "Public SELECT only" ON planning_session_players;
DROP POLICY IF EXISTS "Public SELECT only" ON planning_documents;
DROP POLICY IF EXISTS "Public SELECT only" ON planning_task_library;
DROP POLICY IF EXISTS "Public SELECT only" ON match_videos;

-- 2. Volver a crear políticas públicas abiertas para todas las operaciones (con base en el esquema v2)
CREATE POLICY "Public Read" ON players FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON players FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON players FOR DELETE USING (true);

CREATE POLICY "Public Read" ON detailed_evaluations FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON detailed_evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON detailed_evaluations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON detailed_evaluations FOR DELETE USING (true);

CREATE POLICY "Public Read" ON observaciones FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON observaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON observaciones FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON observaciones FOR DELETE USING (true);

CREATE POLICY "Public Read Injuries" ON player_injuries FOR SELECT USING (true);
CREATE POLICY "Public Insert Injuries" ON player_injuries FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Injuries" ON player_injuries FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Injuries" ON player_injuries FOR DELETE USING (true);

CREATE POLICY "Public Read Attendance" ON training_attendance FOR SELECT USING (true);
CREATE POLICY "Public Insert Attendance" ON training_attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Attendance" ON training_attendance FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Attendance" ON training_attendance FOR DELETE USING (true);

CREATE POLICY "Public Read Training Evaluations" ON training_evaluations FOR SELECT USING (true);
CREATE POLICY "Public Insert Training Evaluations" ON training_evaluations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Training Evaluations" ON training_evaluations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Training Evaluations" ON training_evaluations FOR DELETE USING (true);

CREATE POLICY "Public Read" ON matches FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON matches FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON matches FOR DELETE USING (true);

CREATE POLICY "Public Read" ON match_player_stats FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON match_player_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON match_player_stats FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON match_player_stats FOR DELETE USING (true);

CREATE POLICY "Public Read" ON gps_sessions FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON gps_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON gps_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON gps_sessions FOR DELETE USING (true);

CREATE POLICY "Public Read" ON gps_data FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON gps_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON gps_data FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON gps_data FOR DELETE USING (true);

CREATE POLICY "Public Read" ON abp_plays FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON abp_plays FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON abp_plays FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON abp_plays FOR DELETE USING (true);

CREATE POLICY "Public Read" ON abp_player_roles FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON abp_player_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON abp_player_roles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON abp_player_roles FOR DELETE USING (true);

CREATE POLICY "Public Read" ON tactical_lineups FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON tactical_lineups FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON tactical_lineups FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON tactical_lineups FOR DELETE USING (true);

CREATE POLICY "Public Read Match ABP" ON match_abp_plays FOR SELECT USING (true);
CREATE POLICY "Public Write Match ABP" ON match_abp_plays FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Match ABP" ON match_abp_plays FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Match ABP" ON match_abp_plays FOR DELETE USING (true);

CREATE POLICY "Public Read Match ABP Roles" ON match_abp_player_roles FOR SELECT USING (true);
CREATE POLICY "Public Write Match ABP Roles" ON match_abp_player_roles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Match ABP Roles" ON match_abp_player_roles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Match ABP Roles" ON match_abp_player_roles FOR DELETE USING (true);

CREATE POLICY "Public Read Match Full Videos" ON match_full_videos FOR SELECT USING (true);
CREATE POLICY "Public Write Match Full Videos" ON match_full_videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Match Full Videos" ON match_full_videos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Match Full Videos" ON match_full_videos FOR DELETE USING (true);

CREATE POLICY "Public Read Match Video Clips" ON match_video_clips FOR SELECT USING (true);
CREATE POLICY "Public Write Match Video Clips" ON match_video_clips FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Match Video Clips" ON match_video_clips FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Match Video Clips" ON match_video_clips FOR DELETE USING (true);

CREATE POLICY "Public Read Match Strategic" ON match_strategic_actions FOR SELECT USING (true);
CREATE POLICY "Public Write Match Strategic" ON match_strategic_actions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Match Strategic" ON match_strategic_actions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Match Strategic" ON match_strategic_actions FOR DELETE USING (true);

CREATE POLICY "Public Read Match Custom" ON match_custom_videos FOR SELECT USING (true);
CREATE POLICY "Public Write Match Custom" ON match_custom_videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Match Custom" ON match_custom_videos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Match Custom" ON match_custom_videos FOR DELETE USING (true);

CREATE POLICY "Public Read Match Documents" ON match_documents FOR SELECT USING (true);
CREATE POLICY "Public Write Match Documents" ON match_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Match Documents" ON match_documents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Match Documents" ON match_documents FOR DELETE USING (true);

CREATE POLICY "Public Read" ON planning_periods FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON planning_periods FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON planning_periods FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON planning_periods FOR DELETE USING (true);

CREATE POLICY "Public Read" ON planning_sessions FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON planning_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON planning_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON planning_sessions FOR DELETE USING (true);

CREATE POLICY "Public Read" ON planning_concepts FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON planning_concepts FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON planning_concepts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON planning_concepts FOR DELETE USING (true);

CREATE POLICY "Public Read" ON planning_tasks FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON planning_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON planning_tasks FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON planning_tasks FOR DELETE USING (true);

CREATE POLICY "Public Read" ON planning_session_players FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON planning_session_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON planning_session_players FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON planning_session_players FOR DELETE USING (true);

CREATE POLICY "Public Read" ON planning_documents FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON planning_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update" ON planning_documents FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete" ON planning_documents FOR DELETE USING (true);

CREATE POLICY "Public Read Task Library" ON planning_task_library FOR SELECT USING (true);
CREATE POLICY "Public Insert Task Library" ON planning_task_library FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Task Library" ON planning_task_library FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Task Library" ON planning_task_library FOR DELETE USING (true);

CREATE POLICY "Acceso público de lectura para videos" ON match_videos FOR SELECT USING (true);
CREATE POLICY "Permitir inserción de videos" ON match_videos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualización de videos" ON match_videos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Permitir eliminación de videos" ON match_videos FOR DELETE USING (true);

-- 3. Limpieza de funciones RPC para dejar la base de datos limpia si se vuelve atrás
DROP FUNCTION IF EXISTS exec_secure_delete(TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS exec_secure_upsert(TEXT, JSONB, TEXT[], TEXT);
DROP FUNCTION IF EXISTS exec_secure_bulk_upsert(TEXT, JSONB, TEXT[], TEXT);
DROP FUNCTION IF EXISTS delete_match_player_stats_secure(UUID, TEXT);
DROP FUNCTION IF EXISTS exec_secure_delete_by_col(TEXT, TEXT, UUID, TEXT);
