module.exports = {
  apps: [
    {
      name: 'ont-backend-api',
      cwd: './api_obtencion',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3010
      }
    },
    {
      name: 'ont-frontend-ui',
      cwd: './orquestador-ui',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002 -H 0.0.0.0',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        API_BACKEND_URL: 'http://localhost:3010',
        CATALOGO_API_URL: 'http://10.46.0.189:3000'
      }
    }
  ]
};
