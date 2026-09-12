#!/bin/bash
set -e

echo "===================================================="
echo "📦 COMPILANDO SISTEMA ONT (BACKEND & FRONTEND)"
echo "===================================================="

echo ""
echo "1️⃣ Compilando Backend API (NestJS)..."
cd api_obtencion
npm install --legacy-peer-deps
npm run build
cd ..

echo ""
echo "2️⃣ Compilando Frontend UI (Next.js)..."
cd orquestador-ui
npm install --legacy-peer-deps
npm run build
cd ..


echo ""
echo "✅ COMPILACIÓN FINALIZADA CON ÉXITO."
echo "Para iniciar en producción con PM2:"
echo "   pm2 start ecosystem.config.js"
echo ""
