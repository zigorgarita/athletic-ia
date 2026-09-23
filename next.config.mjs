/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@ffmpeg-installer/ffmpeg', '@ffmpeg-installer/linux-x64'],
    outputFileTracingIncludes: {
      '/api/die-ligen/merge-clips': [
        './node_modules/@ffmpeg-installer/**/*',
      ],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jdkshextphguyyiwwtyt.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
    ],
  },
};

export default nextConfig;
