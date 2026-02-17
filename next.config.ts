import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/mapa.html',
        destination: '/mapa.html',
      },
    ];
  },
};

export default nextConfig;
 