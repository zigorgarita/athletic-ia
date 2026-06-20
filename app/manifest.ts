import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'indautxu_26_27 - Gestión Deportiva',
    short_name: 'indautxu_26_27',
    description: 'Aplicación premium de gestión de plantilla de fútbol, evaluaciones y videoanálisis táctico',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#CC0E21',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
