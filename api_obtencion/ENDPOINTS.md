# Documentación de Endpoints - API Obtención y Conciliación

Esta API es el núcleo del Orquestador de Conciliación. Está dividida en tres componentes principales:
1. **Obtención:** Recupera planillas huérfanas/asignadas desde Oracle de manera optimizada.
2. **Conciliación (Inserción Atómica):** Inserta en la Base de Datos las asignaciones presupuestarias definidas por el Catálogo, sellando la planilla.
3. **Reversión (Rollback Atómico):** Deshace una conciliación errónea restaurando el estado original de la planilla.

---

## 1. Obtener Planillas Pendientes

Retorna un listado paginado de las planillas (huérfanas o asignadas) que no han sido conciliadas en el sistema legado.

* **URL:** `/api/planillas/pendientes`
* **Método:** `GET`

### Parámetros de Consulta (Query Params)

| Parámetro | Tipo | Obligatorio | Descripción |
| :--- | :--- | :--- | :--- |
| `fecha` | `YYYY-MM-DD` | **Sí** | Fecha exacta de la recaudación de la planilla. |
| `banco` | `String` | **Sí** | Código numérico del Banco (Ej: `105` para Mercantil). |
| `estado_asignacion`| `String` | No | Filtra por `ASIGNADAS` o `HUERFANAS`. Por defecto trae ambas. |
| `expediente` | `String` | No | Filtrar planillas pertenecientes a un expediente de flujo específico. |
| `limit` | `Number` | No | Límite de registros por página (Defecto: 1000). |
| `offset` | `Number` | No | Paginación (Defecto: 0). |

### Respuesta de Ejemplo (`200 OK`)
```json
{
  "data": [
    {
      "ESTADO_ASIGNACION": "SIN_ASIGNAR",
      "EXPEDIENTE": 7638,
      "LOTE_ID": 42,
      "LOTE_SEQ": 132164,
      "NRO_PLANILLA_FALTANTE": "2490005226",
      "FORMA": "99086",
      "MONTO_EFECTIVO": 3768.67,
      "BANCO": "105",
      "AGENCIA": "0800",
      "FECHA_RECAUDACION": "2024-04-15T00:00:00.000Z"
    }
  ],
  "pagination": { "limit": 5, "offset": 0, "count": 1 }
}
```

---

## 2. Inserción Atómica (Conciliar Planilla)

Realiza el registro transaccional (ACID) de la planilla en el sistema legado. 

* **URL:** `/api/planillas/conciliar`
* **Método:** `POST`
* **Headers:** `Content-Type: application/json`

### Reglas de Negocio (Validaciones)
1. **Transaccionalidad:** Realiza bloqueos de Commit/Rollback. Los 3 SQL (`DET_PLANILLA`, `PLANILLA`, `TXT_SENIAT`) se ejecutan o fracasan juntos.
2. **Formas Excluidas:** Si el atributo `forma` está dentro de las formas excluidas (`00000`, `99999`), se rechaza la petición con `422 Unprocessable Entity`.
3. **Multipresupuestaria:** Itera sobre `asignaciones` insertando filas múltiples en `DET_PLANILLA`.

### Payload Esperado (`JSON`)
```json
{
  "expediente": 7638,
  "lote_id": 42,
  "lote_seq": 132164,
  "planilla_id": "2490005226",
  "forma": "99086",
  "monto": 1234.57,
  "banco": "105",
  "agencia": "0800",
  "fecha_recaudacion": "2024-04-15",
  "asignaciones": [
    { "partida": "301020101", "monto": 641.98 },
    { "partida": "301020320", "monto": 518.52 }
  ]
}
```

### Respuesta de Ejemplo (`200 OK`)
```json
{
  "status": 200,
  "message": "Conciliación ejecutada exitosamente",
  "data": {
    "planilla": "2490005226",
    "plan_seq_asignado": 3125,
    "partidas_asignadas": 2
  }
}
```

---

## 3. Reversión Atómica (Deshacer Conciliación)

Deshace de manera íntegra y transaccional una conciliación ejecutada por error. Elimina el rastro en `DET_PLANILLA` y `PLANILLA`, y devuelve los valores del `TXT_SENIAT` (`ESTADO`, `LOTE_SEQ`, `PLAN_SEQ`, `ANHO`) a `NULL`.

* **URL:** `/api/planillas/revertir`
* **Método:** `POST`
* **Headers:** `Content-Type: application/json`

### Payload Esperado (`JSON`)
Se requiere el número de la planilla y sus credenciales de fecha y banco para ubicarla inequívocamente en `TXT_SENIAT`.
```json
{
  "planilla_id": "2490005226",
  "banco": "105",
  "fecha_recaudacion": "2024-04-15"
}
```

### Respuesta de Ejemplo (`200 OK`)
```json
{
  "status": 200,
  "message": "Planilla revertida y desvinculada exitosamente",
  "data": {
    "planilla": "2490005226"
  }
}
```

### Respuestas de Error
* **`400 Bad Request`:** Faltan parámetros en el JSON.
* **`500 Internal Server Error`:** Falló el Commit o no se encontró el registro en `TXT_SENIAT`. Se ejecuta un Rollback inmediato.
