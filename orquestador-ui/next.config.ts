import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiBackend = process.env.API_BACKEND_URL || 'http://127.0.0.1:3010';
    const apiCatalogo = process.env.CATALOGO_API_URL || 'http://10.46.0.189:3000';
    return [
      {
        source: '/api/orquestador/:path*',
        destination: `${apiBackend}/api/:path*`,
      },
      {
        source: '/api/catalogo/:path*',
        destination: `${apiCatalogo}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

