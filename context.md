# Levantamiento de Información: Auditoría de Portal y Automatización

**Fase:** Prueba Controlada (Fase 1) - Auditoría de Datos

## Objetivo Principal del Proyecto

El objetivo central de este proyecto es **automatizar el proceso manual** que actualmente realizan los transcriptores de la entidad mediante dos acciones clave:

1. **Auto-Conciliación (Asignación Automática):** Conciliar las planillas legítimas que estén huérfanas de partida asignándoles sus códigos presupuestarios respectivos.
2. **Depuración de Datos (Limpieza):** Eliminar automáticamente todas aquellas formas "basura" que no correspondan a la recaudación de la entidad.

## Recursos y Diseños

- **Diseño de Maquetación y Entregables (Claude):** [Ver diseño de Minuta y Reportes](https://claude.ai/design/p/91e9bf56-edbf-4562-865c-d40fe887d037?file=Minuta+12+Agosto.dc.html)

---

## 1. Accesos a Sistemas Web

### Sujetos de Prueba (Cuentas para Auditoría)

Para realizar validaciones en vivo del comportamiento del sistema y del demonio, contamos con los siguientes perfiles:

- **Transcriptor de Prueba 1:**
  - **Usuario:** `KARENGUEVARA`
  - **Contraseña:** `Miacampero123*`
  - **Rol:** Transcriptor (Receptor de asignaciones de expedientes).
  - **Estatus Inicial de Auditoría:**
    - **Pendientes:** 6 expedientes.
    - **Abiertas:** 12 expedientes.
    - **Cerradas:** ~2844 expedientes.
    - **Expediente Actual:** Está transcribiendo actualmente el Expediente `7666`.

### A. SIGECOF - Interfaz Negociadora WEB

* **Ruta de Acceso:** `10.79.6.100/InterfazNegociadoraWEB/inicio.jsp`
* **Descripción:** Portal principal para la gestión y conciliación de expedientes.

**Usuarios y Roles:**
*(Nota: El registro maestro de estos usuarios a nivel de base de datos se encuentra en la tabla `WFE_WORKFLOW.WF_USERS` de SIGECOF)*

| Rol                                                                    | Funciones Principales                                                                                        | Usuario             | Contraseña       |
| :--------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :------------------ | :---------------- |
| **Transcriptor** *(Analista Conciliador de Ingresos Fiscales)* | Gestión de tareas por estatus (Pendientes, Abiertas, Cerradas). Asignación de conceptos a los expedientes. | `ZUILINGCOLMENAR` | `Zxcv22**`      |
| **Administrador**                                                | Encargado de reasignar los expedientes entre los diferentes transcriptores.                                  | `ADM_JDORIA`      | *[Por definir]* |

### B. Reportes de la Oficina Nacional del Tesoro (ONT)

* **Ruta de Acceso:** `10.79.6.205:8443/ReportesTesoreriaWEB/`
* **Descripción:** Sistema de apoyo secundario (descrito como un "metabase antiguito"). Permite la visualización directa de los datos reflejados en la base de datos principal.

### C. Sistema ONT Service

* **Ruta de Acceso:** `http://10.78.30.6:8080/OntServices/index.action`
* **Descripción:** Sistema intermediario conectado a la base de datos principal.
* **Flujo Operativo (Proceso del Transcriptor):**
  1. El transcriptor (ej. `W Gutiérrez`) ingresa a ONT Service y busca un Lote asignado (ej. Lote 39, Banco 105).
  2. Descarga el lote y comienza a transcribir.
  3. Visualiza el código de la forma (`forma_codigo`) y le asigna manualmente la **partida presupuestaria** correspondiente.
  4. Aquellas planillas que no se pueden conciliar (formas excluidas) se dejan en el sistema para que un administrador ("Johnny") las elimine manualmente (Este es el proceso que se busca automatizar con el **Demonio Eliminador de Formas**).

> [!TIP]
> **Mapeo de Formas a Partidas Presupuestarias (Reglas de Negocio):**
>
> - **Forma `99044`:** Impuesto sobre la renta, persona jurídica (Es la más recurrente).
> - **Forma `99025`:** Impuesto sobre la renta, persona natural.
> - **Forma `99086`:** Jurídica (Aduanas).
>   *(También se mencionan las formas `99081`, `99080` y `9932` como parte del desglose operativo).*

> [!IMPORTANT]
> **Lógica de Negocio: Reporte de "Planillas Sin Conciliar"**
> Durante el análisis técnico se descubrió que el reporte de "Planillas Sin Conciliar" generado por ONT Service no se basa en el estado del Workflow (todas las planillas, conciliadas o no, pueden tener el mismo estado `WORKITEM = 1`).
> La lógica real consiste en una **Discrepancia Bancaria**. El sistema cruza la tabla de registros internos (`ORG_LIQ.PLANILLA`) contra los archivos de texto que envían los bancos (`ORG_LIQ.TXT_SENIAT`).
> Se considera una planilla como "Sin Conciliar" si existe una diferencia matemática entre el monto registrado en el sistema y el monto reportado por el banco (`SUM(monto_planilla) - SUM(MONTO_ELECTRONICO) <> 0`). Las fechas y bancos que se muestran en el reporte provienen del archivo de texto del banco, no de la fecha de registro original en el sistema.

**Usuarios y Accesos:**

| Usuario    | Contraseña |
| :--------- | :---------- |
| `JDORIA` | `JDORIA`  |

---

## 2. Casos de Prueba y Tareas Pendientes (Ejemplos)

Durante el levantamiento se evidenciaron los siguientes casos de usuarios y expedientes:

- **Usuario `KARENGUEVARA`:** Tiene pendiente el expediente `1819 102` de fecha `17/04/2024`.
- **Usuario `marbelyz`:** Expediente `1839`, Banco `134`.

---

## 3. Nuevos Requerimientos (Auditoría)

### Demonio de Automatización (Eliminación y Auto-Conciliación)

Durante la auditoría se detectó la necesidad de implementar una nueva solución a nivel de base de datos para automatizar el trabajo manual en SIGECOF:

- **Objetivos Principales:**
  1. **Eliminación:** Borrar automáticamente las formas incobrables o basuras que el transcriptor ignora.
  2. **Auto-Conciliación:** Asignar automáticamente las partidas presupuestarias (PLUC_ID) a aquellas planillas legítimas que estén "huérfanas" de partida, guardando el cambio en `DET_PLANILLA` sin intervención humana.
- **Arquitectura prevista:** Será un Script de Python, demonizado a través de `pm2` para su ejecución continua. (En fase de diseño, sin desarrollo actual).
- **Formas a Eliminar (Excluir de Pendientes por Conciliar):**
  Se debe implementar un mecanismo de eliminación/exclusión automática para las siguientes formas específicas:| ID | Nombre Forma                                     | Código Forma |
  | :- | :----------------------------------------------- | :------------ |
  | 13 | Tasa por Servicio de Aduana                      | `79084`     |
  | 46 | Liquidación de pago tasa aduanera               | `79984`     |
  | 58 | Derechos de registros (00084)                    | `84`        |
  | 62 | Disminución de cuentas por cobrar a corto plazo | `99008`     |
- **Estatus:** Documentación de formas completada. En fase de diseño del script de eliminación.

---

## 4. Trazabilidad de Conciliación Manual (Proceso del Transcriptor)

Cuando un transcriptor concilia manualmente una planilla "pendiente" desde la interfaz del sistema, los datos se registran en tres (3) niveles de arquitectura en la base de datos:

1. **Tabla de Registro Oficial (`ORG_LIQ.PLANILLA`)**:

   - Destino final y maestro. Al guardar la transacción, la planilla se inserta en esta tabla. En este instante, su estado funcional pasa de ser "Pendiente" a "Conciliada" de forma oficial.
   - **Tabla Hija (`ORG_LIQ.DET_PLANILLA`)**: En caso de que la planilla posea múltiples conceptos de pago (ej. multas, recargos), los montos detallados se segregan en esta tabla secundaria.
2. **Trazabilidad de Flujo (`WFE_WORKFLOW.WF_WORK_ITEM`)**:

   - Actúa como la bandeja de entrada del usuario. Al procesar la planilla, el sistema registra que la tarea está en curso y, una vez culminado todo el lote/expediente, el estado de la tarea (columna `WI_ESTADO`) transita de `PENDIENTE` o `ABIERTA` hacia `CERRADA`.
3. **Trazabilidad de Auditoría (`WFE_WORKFLOW.WF_AUDITORIA` / `WF_AUDITA_EXPEDIENTES`)**:

   - Tablas de seguridad que almacenan el historial inmutable del usuario. Dejan un rastro que documenta qué analista modificó/guardó el expediente, junto con la marca de tiempo exacta de la transacción. Esta información de autoría también suele reflejarse en columnas de registro a nivel individual dentro de la propia tabla `PLANILLA`.
