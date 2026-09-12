# F—04 Respaldo, pruebas de integridad y validación post-actualización de la plataforma

## 1. Resumen Ejecutivo

El presente documento formaliza el protocolo operacional de **Respaldo, Pruebas de Integridad de Datos y Validación Post-Actualización** para la plataforma **SIRONT / Conciliator-Engine**.

Este protocolo establece los mecanismos automáticos e institucionales que garantizan que cualquier actualización, despliegue o parche aplicado sobre el sistema (backend NestJS o frontend Next.js) mantenga la integridad contable, la consistencia referencial con la base de datos Oracle SIGECOF y la disponibilidad continua de los servicios en el servidor de producción.

---

## 2. Pruebas de Integridad de Datos y Consistencia Contable

El sistema cuenta con una batería de validaciones automáticas que impiden inconsistencias en las tablas presupuestarias de Oracle (`sige1`) y el Data Lake de PostgreSQL (`xmls` / `motor_app`).

### 2.1. Validación de la Ecuación Presupuestaria Fundamental
Toda operación de conciliación o cierre de expediente debe satisfacer de forma estricta:

$$\text{Monto Total del Lote} = \sum_{i=1}^{n} \text{Monto Planilla}_i = \sum_{j=1}^{m} \text{Monto Asignado Movimiento Bancario}_j$$

- **Control de Brechas**: Si la diferencia $\Delta \ne 0.00$, el sistema bloquea el cierre del lote y la reasignación del expediente.
- **Caso de Prueba CP-016**: Cuadre exacto entre la cabecera del lote y la suma de partidas presupuestarias.

### 2.2. Garantía de Transaccionalidad ACID y Rollback (CP-018)
- Toda conciliación se ejecuta dentro de una transacción atómica en el pool de Oracle.
- En caso de interrupción de red, fallo de clave foránea o excepción en la base de datos, se ejecuta automáticamente un `ROLLBACK`, retornando el estado de la planilla y los movimientos bancarios a su estado original sin dejar registros inconsistentes.

### 2.3. Prevención de Duplicados e Integridad de Claves Únicas (CP-019)
- **Constraint `PLA_UK`**: Impide la duplicidad de inserción de planillas con igual serial, banco y fecha.
- **Detección Previa de Duplicados en TXT**: Endpoint `GET /api/planillas/duplicados-txt` que detecta y aísla transmisiones repetidas antes de la conciliación masiva.

### 2.4. Detección de Atributos Críticos en NULL
- Escaneo de campos obligatorios en planillas (ej. Forma `99044` sin número de serial o con incongruencia de agencia bancaria) mediante `GET /api/planillas/detectar-atributos-null`.

### 2.5. Reversión Atómica y Restauración de Estados (CP-022 y CP-023)
- Mecanismo certificado para deshacer conciliaciones erróneas mediante `POST /api/planillas/revertir`, liberando los movimientos bancarios y devolviendo la planilla a estado pendiente de manera instantánea.

---

## 3. Respaldo de Configuración, Auditoría y Código

### 3.1. Respaldo Inmutable de Auditoría (`auditoria.json`)
- Cada evento de conciliación, reversión y depuración se almacena en el volumen local `api_obtencion/auditoria.json`.
- Este archivo se preserva durante las actualizaciones y reinicios de PM2 y Docker, sirviendo como bitácora de respaldo en texto plano auditable.

### 3.2. Respaldo de Variables de Entorno y Credenciales Seguras
- Las variables de entorno de producción están respaldadas en los archivos `.env` (backend) y `.env.example` (plantilla institucional).
- Cumplimiento de la regla de seguridad: contraseñas con caracteres especiales (`#`, `$`, `!`, `@`) se encuentran protegidas entre comillas dobles (`"..."`) para evitar pérdidas de conexión tras los reinicios.

### 3.3. Trazabilidad de Versiones en Git
- Todo cambio en el código fuente, dependencias (`package-lock.json`) y DTOs cuenta con confirmaciones (*commits*) fechados y sincronizados con el repositorio oficial de GitHub (`Cristianhub232/Conciliator-Engine`).

---

## 4. Protocolo Automatizado de Validación Post-Actualización

Para verificar la salud del sistema tras cualquier despliegue o actualización en el servidor `189`, se implementó el script de validación automatizado:

📂 **`scripts/validar_post_actualizacion.sh`**

### 4.1. Ejecución del Script de Validación
```bash
cd "/home/estacion/Escritorio/contexto y procesos ONT"
./scripts/validar_post_actualizacion.sh
```

### 4.2. Puntos de Verificación Ejecutados en Tiempo Real
El script realiza 5 comprobaciones automatizadas en menos de 5 segundos:

1. **Chequeo de Procesos PM2**:
   - Inspecciona los PIDs activos de `ont-backend-api` y `ont-frontend-ui`, confirmando que están en estado `online`.
2. **Chequeo de Salud del Backend NestJS (Puerto 3010)**:
   - Consulta `GET /api/configuracion/env`, verificando que el servidor responde con código `HTTP 200 OK` y que el pool de conexiones a Oracle DB está inicializado.
3. **Chequeo de Swagger OpenAPI 3.0**:
   - Consulta `GET /docs-api/`, verificando que la interfaz interactiva de documentación técnica está disponible y en línea.
4. **Chequeo de la Interfaz Web Next.js (Puerto 3002)**:
   - Consulta `GET /`, confirmando que el servidor de renderizado de la UI responde con código `HTTP 200 OK`.
5. **Chequeo del Motor de Conciliación**:
   - Consulta `GET /api/pipeline/estado`, confirmando que el motor de conciliación masiva se encuentra en estado reposo y listo para operar.

### 4.3. Evidencia de Ejecución Exitosa
```text
======================================================================
🔍 INICIANDO PROTOCOLO DE VALIDACIÓN POST-ACTUALIZACIÓN SIRONT
======================================================================

[1/5] Verificando estado de los procesos en PM2...
  ✔ Proceso 'ont-backend-api' ONLINE (PID: 10952)
  ✔ Proceso 'ont-frontend-ui' ONLINE (PID: 10953)

[2/5] Verificando salud de la API Backend NestJS (Puerto 3010)...
  ✔ API Backend operativa en http://localhost:3010 (HTTP 200 OK)

[3/5] Verificando documentación Swagger OpenAPI 3.0...
  ✔ Swagger UI accesible en http://localhost:3010/docs-api (HTTP 200 OK)

[4/5] Verificando interfaz web Next.js (Puerto 3002)...
  ✔ Frontend UI operativo en http://localhost:3002 (HTTP 200)

[5/5] Verificando estado del motor de conciliación y conectores...
  ✔ Motor de conciliación listo: {"running":false,"mensaje":"Motor en reposo, listo para procesar"}

======================================================================
🎉 VALIDACIÓN POST-ACTUALIZACIÓN FINALIZADA CON ÉXITO (100% OK)
   - Backend API:       http://localhost:3010
   - Swagger OpenAPI:   http://localhost:3010/docs-api
   - Frontend Web UI:   http://localhost:3002
======================================================================
```

---

## 5. Plan de Contingencia y Reversión (Rollback)

En caso de que el script de validación post-actualización reporte un fallo crítico (`HTTP 500`, caída de procesos o desconexión con Oracle):

1. **Revisión de Logs en Tiempo Real**:
   ```bash
   npx pm2 logs ont-backend-api --lines 50
   ```
2. **Reversión de Código a Versión Anterior**:
   ```bash
   git log -n 5 --oneline
   git checkout <COMMIT_ANTERIOR_ESTABLE>
   cd api_obtencion && npm run build
   npx pm2 restart ont-backend-api
   ```
3. **Re-ejecución del Chequeo de Salud**:
   ```bash
   ./scripts/validar_post_actualizacion.sh
   ```
