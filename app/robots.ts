import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/'],
    },
    sitemap: 'https://indautxu-ia.vercel.app/sitemap.xml', // Ajustar al dominio final estimado o genérico
  };
}
