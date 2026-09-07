/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // Proxy para la API de Obtención/Conciliación (Localhost)
        source: '/api/orquestador/:path*',
        destination: 'http://127.0.0.1:3010/api/:path*',
      },
      {
        // Proxy para la API de Catálogo Forma->Partida (Servidor 10.46)
        source: '/api/catalogo/:path*',
        destination: 'http://10.46.0.189:3000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
