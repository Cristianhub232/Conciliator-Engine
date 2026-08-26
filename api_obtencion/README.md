# API de Obtención y Conciliación Atómica (ONT)

Este proyecto en NestJS constituye el microservicio base para el motor de Orquestación de la ONT. Se encarga de conectarse de forma segura a la base de datos transaccional de Oracle para extraer las planillas pendientes y registrar (sellar) las conciliaciones.

## Características Principales
* **Búsqueda Optimizada:** Recupera planillas huérfanas o asignadas mediante una sola consulta que cruza `TXT_SENIAT`, `LOTE`, `PLANILLA` y `WF_WORK_ITEM`.
* **Transaccionalidad ACID:** Endpoint de conciliación que ejecuta 3 operaciones en cadena (`PLANILLA`, `DET_PLANILLA`, `TXT_SENIAT`) con bloqueos de Commit y Rollback.
* **Soporte Multipresupuestario:** Capacidad de inyectar múltiples partidas presupuestarias por planilla si es un caso de prorrateo (basado en el Catálogo de Formas).
* **Validaciones y Reglas:** Bloqueo de formas excluidas a nivel de controlador.
* **Manejo de Pool Oracle:** Gestión automatizada de conexiones concurrentes para evitar ahogamiento del servidor (`NJS-500`).

---

## 🚀 Despliegue en Producción (Docker / PM2)

El proyecto está dockerizado y preparado para correr de forma persistente.

### 1. Variables de Entorno (`.env`)
En el servidor de despliegue debes crear el archivo `.env` en la raíz del proyecto con la conexión a Oracle:
```env
ORACLE_USER=ONT_SIR_BOT
ORACLE_PASSWORD=ONT_SIR_BOT123456
ORACLE_HOST=172.21.65.90
ORACLE_PORT=1521
ORACLE_SID=estatal
PORT=3010
```

### 2. Despliegue usando Docker (Recomendado)
Para compilar y correr el demonio en background asegurando reinicios automáticos si el servidor se apaga:
```bash
docker-compose up --build -d
```
Para ver los logs en vivo:
```bash
docker-compose logs -f
```

### 3. Despliegue Alternativo usando Node + PM2
Si el servidor no tiene Docker, puedes compilarlo e instalar el gestor de procesos PM2:
```bash
npm install
npm run build
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
```

---

## 🛠 Comandos de Desarrollo (Local)

```bash
# Instalar dependencias
$ npm install

# Iniciar servidor en modo desarrollo (Watch mode)
$ npm run start:dev

# Compilar proyecto a JavaScript
$ npm run build
```

## 📖 Documentación de Endpoints
Por favor, revisa el archivo [ENDPOINTS.md](./ENDPOINTS.md) para ver la especificación técnica completa de las rutas, los JSON esperados y los errores HTTP que arroja el microservicio.
