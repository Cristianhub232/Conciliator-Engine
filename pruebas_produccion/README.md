# Herramientas de Pruebas y Diagnóstico en Producción (SIGECOF `sige1`)

Este directorio contiene la suite oficial y consolidada de herramientas de diagnóstico, auditoría y consulta para la base de datos de Producción de SIGECOF.

---

## 1. Conexión y Salud de Base de Datos
- **[`conexionprod.py`](conexionprod.py)**: Módulo central de conexión con soporte para usuarios `consulta`, `ONT_SIR_BOT` y `ONT_SIR_BOT_AUDIT`.
  - **Prueba rápida de conectividad:**
    ```bash
    python3 conexionprod.py --test
    ```
  - **Modo interactivo (resumen y exploración de esquemas):**
    ```bash
    python3 conexionprod.py
    ```

---

## 2. Auditoría de Permisos DBA
- **[`verificar_permisos_sige1.py`](verificar_permisos_sige1.py)**: Script automatizado oficial para que el DBA audite los privilegios (SELECT, UPDATE, INSERT, EXECUTE) requeridos en `sige1` antes del pase a producción.
  ```bash
  python3 verificar_permisos_sige1.py
  ```

---

## 3. Inspección Integral de Expedientes y Workflow
- **[`inspeccionar_expediente.py`](inspeccionar_expediente.py)**: Diagnóstico 360° de cualquier expediente en SIGECOF Producción. Muestra: estado actual de workflow, transcriptor asignado, histórico de workitems, lotes asociados, resumen de planillas declaradas vs registradas, y auditoría.
  ```bash
  # Inspeccionar expediente específico (ej. 7638)
  python3 inspeccionar_expediente.py 7638

  # Filtrar por año y órgano ONT (093)
  python3 inspeccionar_expediente.py 7638 --anho 2024 --orga 93

  # Ver detalle individual de las planillas
  python3 inspeccionar_expediente.py 7638 --anho 2024 --verbose

  # Incluir auditoría histórica (escaneo en WF_AUDITA_EXPEDIENTES)
  python3 inspeccionar_expediente.py 7638 --anho 2024 --auditoria
  ```

---

## 4. Explorador de Diccionario, Código PL/SQL y Usuarios
- **[`explorador_oracle.py`](explorador_oracle.py)**: Herramienta de consulta del catálogo de datos de Oracle.
  ```bash
  # Describir columnas y tipos de datos de cualquier tabla
  python3 explorador_oracle.py --describe ORG_LIQ.PLANILLA
  python3 explorador_oracle.py --describe WFE_WORKFLOW.WF_WORK_ITEM

  # Listar todos los usuarios activos e inactivos de la ONT (093)
  python3 explorador_oracle.py --users 93

  # Buscar texto o nombres de tablas dentro del código PL/SQL (all_source)
  python3 explorador_oracle.py --search TXT_SENIAT --schema ORG_LIQ

  # Extraer especificación y cuerpo de un paquete PL/SQL a archivo .sql
  python3 explorador_oracle.py --extract PK_WFE_USUARIO --schema WFE_WORKFLOW
  ```

---

## 5. Auditoría de Planillas y Conciliación
- **[`auditar_planillas.py`](auditar_planillas.py)**: Rastreo multi-tabla y análisis de brechas.
  ```bash
  # Rastrear una o varias planillas en PLANILLA, DET_PLANILLA y TXT_SENIAT
  python3 auditar_planillas.py --buscar 2600558628 2600534878

  # Auditar brecha entre archivo bancario (TXT_SENIAT) y base de datos (PLANILLA) para un lote
  python3 auditar_planillas.py --brecha --lote-seq 132164

  # Consultar planillas huérfanas (sin lote asignado)
  python3 auditar_planillas.py --huerfanas --anho 2024
  ```

---

## 6. Cliente Metabase API
- **[`metabase_client.py`](metabase_client.py)**: Permite ejecutar consultas SQL sobre la base de producción a través de la API de Metabase cuando no haya acceso directo por puerto 1521.
  ```bash
  python3 metabase_client.py --sql "SELECT SYSDATE FROM DUAL"
  python3 metabase_client.py --snapshot 2490005226
  ```

---

## 7. Carpeta Histórica
- **[`historico/`](historico/)**: Almacena scripts de incidentes anteriores resueltos (ej. borrado manual quirúrgico del incidente de las 259 planillas, snapshots previos a commits, etc.) para mantener la trazabilidad forense sin sobrecargar el entorno operativo.
