#!/usr/bin/env bash
# ==============================================================================
# SISTEMA SIRONT / CONCILIATOR-ENGINE — VALIDACIÓN POST-ACTUALIZACIÓN
# Script de Smoke Test, Chequeo de Salud y Verificación de Integridad
# ==============================================================================

set -e

# Colores para salida de terminal
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}🔍 INICIANDO PROTOCOLO DE VALIDACIÓN POST-ACTUALIZACIÓN SIRONT${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

# ------------------------------------------------------------------------------
# 1. VERIFICACIÓN DE PROCESOS PM2
# ------------------------------------------------------------------------------
echo -e "${YELLOW}[1/5] Verificando estado de los procesos en PM2...${NC}"
PID_BACKEND=$(npx pm2 pid ont-backend-api 2>/dev/null || true)
PID_FRONTEND=$(npx pm2 pid ont-frontend-ui 2>/dev/null || true)

if [ -n "$PID_BACKEND" ] && [ "$PID_BACKEND" != "0" ] && [ "$PID_BACKEND" != "" ]; then
  echo -e "  ${GREEN}✔ Proceso 'ont-backend-api' ONLINE (PID: $PID_BACKEND)${NC}"
else
  echo -e "  ${YELLOW}⚠ 'ont-backend-api' no detectado en PM2.${NC}"
fi

if [ -n "$PID_FRONTEND" ] && [ "$PID_FRONTEND" != "0" ] && [ "$PID_FRONTEND" != "" ]; then
  echo -e "  ${GREEN}✔ Proceso 'ont-frontend-ui' ONLINE (PID: $PID_FRONTEND)${NC}"
else
  echo -e "  ${YELLOW}⚠ 'ont-frontend-ui' no detectado en PM2.${NC}"
fi


# ------------------------------------------------------------------------------
# 2. VERIFICACIÓN DE API BACKEND (PUERTO 3010)
# ------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[2/5] Verificando salud de la API Backend NestJS (Puerto 3010)...${NC}"
BACKEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3010/api/configuracion/env || echo "000")

if [ "$BACKEND_CODE" -eq 200 ]; then
  echo -e "  ${GREEN}✔ API Backend operativa en http://localhost:3010 (HTTP 200 OK)${NC}"
else
  echo -e "  ${RED}✖ Error: Backend API respondió con código HTTP $BACKEND_CODE${NC}"
  exit 1
fi

# ------------------------------------------------------------------------------
# 3. VERIFICACIÓN DE SWAGGER OPENAPI 3.0
# ------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[3/5] Verificando documentación Swagger OpenAPI 3.0...${NC}"
SWAGGER_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3010/docs-api/ || echo "000")

if [ "$SWAGGER_CODE" -eq 200 ]; then
  echo -e "  ${GREEN}✔ Swagger UI accesible en http://localhost:3010/docs-api (HTTP 200 OK)${NC}"
else
  echo -e "  ${RED}✖ Error: Swagger UI no responde (HTTP $SWAGGER_CODE)${NC}"
  exit 1
fi

# ------------------------------------------------------------------------------
# 4. VERIFICACIÓN DE FRONTEND WEB (PUERTO 3002)
# ------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[4/5] Verificando interfaz web Next.js (Puerto 3002)...${NC}"
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/ || echo "000")

if [ "$FRONTEND_CODE" -eq 200 ] || [ "$FRONTEND_CODE" -eq 307 ] || [ "$FRONTEND_CODE" -eq 308 ]; then
  echo -e "  ${GREEN}✔ Frontend UI operativo en http://localhost:3002 (HTTP $FRONTEND_CODE)${NC}"
else
  echo -e "  ${RED}✖ Error: Frontend UI respondió con código HTTP $FRONTEND_CODE${NC}"
  exit 1
fi

# ------------------------------------------------------------------------------
# 5. VERIFICACIÓN DE INTEGRIDAD Y ESTADO DEL MOTOR
# ------------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[5/5] Verificando estado del motor de conciliación y conectores...${NC}"
PIPELINE_RES=$(curl -s http://localhost:3010/api/pipeline/estado || echo "{}")

if echo "$PIPELINE_RES" | grep -q "Motor en reposo\|lote de conciliación"; then
  echo -e "  ${GREEN}✔ Motor de conciliación listo: $PIPELINE_RES${NC}"
else
  echo -e "  ${RED}✖ Error al consultar estado del pipeline: $PIPELINE_RES${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}🎉 VALIDACIÓN POST-ACTUALIZACIÓN FINALIZADA CON ÉXITO (100% OK)${NC}"
echo -e "${GREEN}   - Backend API:       http://localhost:3010${NC}"
echo -e "${GREEN}   - Swagger OpenAPI:   http://localhost:3010/docs-api${NC}"
echo -e "${GREEN}   - Frontend Web UI:   http://localhost:3002${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo ""
exit 0
