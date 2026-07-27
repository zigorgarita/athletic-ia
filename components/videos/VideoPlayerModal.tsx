'use client';

import React from 'react';
import { VideoPlayerModal as UnifiedVideoPlayerModal } from '@/components/liga/VideoPlayerModal';
import { MatchVideo } from '@/types';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  videoUrl?: string | null;
  tipoOrigen?: 'Enlace' | 'Archivo';
  driveFileId?: string | null;
  video?: MatchVideo | null;
}

export function VideoPlayerModal({
  isOpen,
  onClose,
  title,
  videoUrl,
  tipoOrigen = 'Enlace',
  driveFileId,
  video,
}: VideoPlayerModalProps) {
  const displayTitle = title || video?.titulo || 'Vídeo de Partido';
  const displayUrl = videoUrl || video?.video_url || null;
  const displayOrigen = tipoOrigen || video?.tipo_origen || 'Enlace';
  const displayDriveId = driveFileId || video?.drive_file_id || null;

  return (
    <UnifiedVideoPlayerModal
      isOpen={isOpen}
      onClose={onClose}
      title={displayTitle}
      videoUrl={displayUrl}
      tipoOrigen={displayOrigen}
      driveFileId={displayDriveId}
    />
  );
}
