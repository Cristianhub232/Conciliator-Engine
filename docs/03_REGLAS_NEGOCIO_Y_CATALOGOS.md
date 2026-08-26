# 03 — Reglas de Negocio, Catálogos Tributarios y Asignación de Partidas

**Sistema:** Motor de Mapeo Tributario y Catálogos ONT  
**Esquema Central:** `ONT_SIR_BOT_AUDIT` / `ORG_LIQ`  
**Microservicio de Catálogos:** `http://10.46.0.189:3000/api/v1/`  
**Versión:** 2.0 (Consolidada)

---

## 1. Núcleo Cognitivo del Proceso de Conciliación

El proceso manual de los transcriptores requería decidir, planilla por planilla:
> *Dada una forma de pago SENIAT, ¿a cuál partida presupuestaria de ingreso fiscal (PLUC_ID) debe liquidarse el monto?*

El motor de conciliación automatiza esta decisión convirtiéndola en un **catálogo de reglas explícito, formal y auditable**.

---

## 2. Taxonomía de Resolución de Formas Tributarias

Se identificaron **96 formas tributarias catalogadas** agrupadas en 5 modalidades de resolución:

| Tipo | Cantidad | Mecanismo de Resolución | Requiere Segundo Paso |
|:---|:---:|:---|:---:|
| **`DIRECTA`** | 70 | Partida única presupuestaria predefinida en la tabla maestra. | **NO** |
| **`BIYECTIVA`** | 14 | Monopartida única que además no es compartida por ninguna otra forma tributaria. | **NO** |
| **`ANCLADA`** | 5 | Históricamente tenía múltiples partidas; la ONT fijó una sola como oficial vigente. | **NO** |
| **`PRORRATEO`** | 4 | El monto total se divide porcentualmente entre múltiples partidas presupuestarias. | **SÍ** |
| **`RIF`** | 3 | La partida depende de la letra inicial del RIF del contribuyente (Natural `V/E` vs Jurídico `J/G`). | **SÍ** |
| **TOTAL** | **96** | *(El 92.7% de las formas se resuelven en un solo paso de lectura)* | |

---

## 3. Matriz de Formas Tributarias Más Recurrentes

| Forma | Denominación Tributaria | Tipo | Partida(s) Asignada(s) | Porcentaje / Regla |
|:---|:---|:---:|:---|:---:|
| **`99225`** | ISLR — Personas Naturales | `DIRECTA` | `301010200` (*ISLR Personas Naturales*) | 100.00% |
| **`99044`** | ISLR — Personas Jurídicas | `DIRECTA` | `301010101` (*ISLR Personas Jurídicas*) | 100.00% |
| **`99030`** | IVA — Declaración y Pago | `DIRECTA` | `301020200` (*Impuesto al Valor Agregado*) | 100.00% |
| **`99035`** | IVA — Retenciones | `DIRECTA` | `301020200` (*Impuesto al Valor Agregado*) | 100.00% |
| **`99025`** | ISLR — Anticipos | `DIRECTA` | `301010200` (*ISLR Personas Naturales*) | 100.00% |
| **`99074`** | IGTF — Grandes Transacciones Financieras | `DIRECTA` | `301020800` (*IGTF*) | 100.00% |
| **`99086`** | Declaración Única de Aduanas | **`PRORRATEO`** | `301020101` (Aduana)<br/>`301020320` (Tasa)<br/>`301032500` (Conexas) | **52.00%**<br/>**42.00%**<br/>**6.00%** |
| **`99228`** | Sucesiones y Donaciones | `RIF` | `301010400` / `301010500` | Según letra RIF |

---

## 4. Regla Especial de Prorrateo: Forma 99086 (Aduanas)

Para las planillas de aduana (Forma `99086`), cada planilla inserta **1 cabecera en `PLANILLA`** y **3 registros en `DET_PLANILLA`** mediante el siguiente algoritmo exacto al céntimo:

$$\text{Monto Partida 1 } (301020101) = \text{ROUND}(\text{Monto Total} \times 0.52, 2)$$
$$\text{Monto Partida 2 } (301020320) = \text{ROUND}(\text{Monto Total} \times 0.42, 2)$$
$$\text{Monto Partida 3 } (301032500) = \text{Monto Total} - (\text{Monto Partida 1} + \text{Monto Partida 2})$$

> **Garantía de Cuadre:** El cálculo del tercer componente por sustracción directa garantiza que la sumatoria de las partidas coincida exactamente con el monto total de la cabecera, con **Diferencia = 0.00 Bs**.

---

## 5. Exclusión y Omisión de Formas no Registradas en SIGECOF

Durante la validación transaccional se identificó que ciertas formas bancarias (ej. `99001` u `84`) no existen en la tabla de catálogo maestro `ORG_LIQ.FORMA_IMPUESTO`.
- **Comportamiento del Sistema:** El backend mantiene una lista en memoria (`validFormasCache: Set<string>`). Si una planilla posee una forma no registrada en SIGECOF, el sistema la **omite con un mensaje descriptivo** y continúa procesando el resto del lote sin interrumpir la operación ni bloquear la base de datos.

---

## 6. Lógica de Detección de Planillas Pendientes

Una planilla se clasifica como **Pendiente por Conciliar** si cumple las siguientes condiciones simultáneas:
1. Existe en el archivo bancario `ORG_LIQ.TXT_SENIAT` con `ESTADO IS NULL` o `ESTADO = 0`.
2. El lote correspondiente en `ORG_LIQ.LOTE` posee `ESTADO = 'P'` (Pendiente).
3. **No existe registro previo** en `ORG_LIQ.PLANILLA` para el mismo `(ANHO, LOTE_SEQ, PLANILLA_ID)`.
4. El expediente no está bloqueado por otro usuario con tarea activa en `WFE_WORKFLOW.WF_WORK_ITEM`.

---

## 7. Contratos de la API de Catálogos (`http://10.46.0.189:3000/api/v1/`)

El microservicio de catálogos expone los siguientes endpoints para consulta y resolución:

- **`GET /api/v1/formas`**: Retorna el catálogo completo de las 96 formas tributarias con su tipo de resolución (`DIRECTA`, `BIYECTIVA`, `ANCLADA`, `PRORRATEO`, `RIF`) y partidas asociadas.
- **`GET /api/v1/formas/:id`**: Retorna el detalle individual de una forma tributaria específica.
- **`POST /api/v1/formas/:id/resolver`**: Simula y calcula la distribución exacta en bolívares de un monto dado para una forma tributaria y RIF.
  - **Payload:** `{ "monto": 1000.00, "rif_contribuyente": "J401045375" }`
  - **Respuesta:** `{ "cod_forma": "99086", "tipo_resolucion": "PRORRATEO", "monto_declarado": 1000.00, "asignaciones": [ ... ], "total_asignado": 1000.00, "version": 1 }`
- **`GET /api/v1/partidas`**: Retorna el catálogo oficial de las 39 partidas presupuestarias de ingreso fiscal.

