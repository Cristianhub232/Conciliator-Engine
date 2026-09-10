# Documentación — API de Bancos (SIRONT)

> Endpoints para consultar y administrar el catálogo de **bancos afiliados al sistema**.
> Última actualización: 2026-09-10

---

## 1. Resumen

La API expone operaciones CRUD sobre la tabla `public.bancos` (base de datos XMLS).
Todos los endpoints responden en formato **JSON**.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET`  | `/api/bancos` | Listar todos los bancos (con filtros opcionales) |
| `POST` | `/api/bancos` | Crear un nuevo banco |
| `GET`  | `/api/bancos/{id}` | Obtener un banco por ID |
| `PUT`  | `/api/bancos/{id}` | Actualizar un banco |
| `DELETE` | `/api/bancos/{id}` | Eliminar un banco |
| `GET`  | `/api/notas-credito/bancos` | Listar bancos (solo `nombre_banco` y `codigo_banco`) |

---

## 2. Autenticación

⚠️ **Estos endpoints NO requieren autenticación.**

- Ninguna de las rutas de `/api/bancos*` valida token ni cookie.
- El `middleware.ts` de la aplicación **solo** protege las rutas `/api/admin/*`.
- Las demás rutas de `/api/*` quedan públicas a menos que internamente verifiquen token (las rutas de bancos **no** lo hacen).

Esto significa que cualquier cliente (incluida una aplicación lateral) puede consumirlas
directamente sin credenciales, tanto desde servidor como desde navegador (ver sección 6 sobre CORS).

---

## 3. Estructura del recurso `Banco`

```json
{
  "id": 1,
  "codigo_banco": "0102",
  "nombre_banco": "Banco de Venezuela",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `number` | Identificador único (auto-incremental) |
| `codigo_banco` | `string` | Código del banco (obligatorio, único) |
| `nombre_banco` | `string` | Nombre del banco (obligatorio) |
| `createdAt` | `string (ISO)` | Fecha de creación |
| `updatedAt` | `string (ISO)` | Fecha de última actualización |

---

## 4. Detalle de endpoints

### 4.1 `GET /api/bancos`

Lista todos los bancos ordenados alfabéticamente por `nombre_banco` (ASC).

**Query params (opcionales):**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `nombre` | `string` | Filtra por nombre parcial (búsqueda `ILIKE`, no sensible a mayúsculas) |
| `codigo` | `string` | Filtra por código parcial (búsqueda `ILIKE`) |

- Si se envían ambos filtros, se combinan con **OR**.

**Respuesta `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "codigo_banco": "0102",
      "nombre_banco": "Banco de Venezuela",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

**Ejemplos:**
```
GET /api/bancos
GET /api/bancos?nombre=Venezuela
GET /api/bancos?codigo=0102
GET /api/bancos?nombre=Venezuela&codigo=0102
```

**Errores:**
```json
{ "success": false, "error": "Error interno del servidor", "details": "..." }
```
con código `500`.

---

### 4.2 `POST /api/bancos`

Crea un nuevo banco.

**Body (JSON):**
```json
{
  "codigo_banco": "0151",
  "nombre_banco": "Banco Nuevo"
}
```

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `codigo_banco` | Sí | Código del banco (debe ser único) |
| `nombre_banco` | Sí | Nombre del banco |

**Respuestas:**

- `200` (creado):
```json
{
  "success": true,
  "data": {
    "id": 99,
    "codigo_banco": "0151",
    "nombre_banco": "Banco Nuevo",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  },
  "message": "Banco creado exitosamente"
}
```
- `400` — faltan datos obligatorios:
```json
{ "success": false, "error": "Código y nombre del banco son requeridos" }
```
- `409` — ya existe un banco con el mismo `codigo_banco`:
```json
{ "success": false, "error": "Ya existe un banco con este código" }
```
- `500` — error interno.

---

### 4.3 `GET /api/bancos/{id}`

Obtiene un banco por su `id`.

**Respuestas:**
- `200` — el objeto `Banco` (ver sección 3), **sin** envoltura `{ success, data }`:
```json
{
  "id": 1,
  "codigo_banco": "0102",
  "nombre_banco": "Banco de Venezuela",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```
- `400` — `{ "error": "ID de banco inválido" }`
- `404` — `{ "error": "Banco no encontrado" }`
- `500` — `{ "error": "Error interno del servidor" }`

---

### 4.4 `PUT /api/bancos/{id}`

Actualiza parcialmente un banco. Solo se actualizan los campos enviados.

**Body (JSON, ambos opcionales):**
```json
{
  "codigo_banco": "0102",
  "nombre_banco": "Banco de Venezuela, S.A."
}
```

**Respuestas:**
- `200` — el objeto `Banco` actualizado (sin envoltura).
- `400` — `{ "error": "ID de banco inválido" }`
- `404` — `{ "error": "Banco no encontrado" }`
- `409` — `{ "error": "Ya existe un banco con ese nombre" }` (si el nuevo nombre ya está en uso por otro banco)
- `500` — `{ "error": "Error interno del servidor" }`

---

### 4.5 `DELETE /api/bancos/{id}`

Elimina un banco por su `id`.

**Respuestas:**
- `200` — `{ "message": "Banco eliminado exitosamente" }`
- `400` — `{ "error": "ID de banco inválido" }`
- `404` — `{ "error": "Banco no encontrado" }`
- `500` — `{ "error": "Error interno del servidor" }`

---

### 4.6 `GET /api/notas-credito/bancos`

Lista reducida de bancos, pensada para filtros/selectores.
Devuelve solo `nombre_banco` y `codigo_banco` (sin `id`, `createdAt`, `updatedAt`)
y excluye registros con `nombre_banco` nulo o vacío.

**Respuesta `200`:**
```json
{
  "success": true,
  "bancos": [
    { "nombre_banco": "Banco de Venezuela", "codigo_banco": "0102" }
  ]
}
```

**Errores:**
```json
{ "error": "Error obteniendo bancos" }
```
con código `500`.

---

## 5. Ejemplos con `curl`

```bash
# Listar todos los bancos
curl http://TU_HOST/api/bancos

# Listar filtrando por nombre
curl "http://TU_HOST/api/bancos?nombre=Venezuela"

# Obtener un banco por ID
curl http://TU_HOST/api/bancos/1

# Crear un banco
curl -X POST http://TU_HOST/api/bancos \
  -H "Content-Type: application/json" \
  -d '{"codigo_banco": "0151", "nombre_banco": "Banco Nuevo"}'

# Actualizar un banco
curl -X PUT http://TU_HOST/api/bancos/1 \
  -H "Content-Type: application/json" \
  -d '{"nombre_banco": "Banco de Venezuela, S.A."}'

# Eliminar un banco
curl -X DELETE http://TU_HOST/api/bancos/1

# Lista reducida (para selectores)
curl http://TU_HOST/api/notas-credito/bancos
```

---

## 6. Consideraciones para una aplicación lateral

1. **Sin autenticación**: los endpoints son públicos. Si la aplicación lateral se conecta
   desde el **servidor** (backend a backend), no hay ninguna restricción.

2. **CORS (importante si llamas desde navegador)**: el proyecto **no** agrega cabeceras
   CORS a estas rutas. Si la aplicación lateral corre en un dominio distinto y consume la
   API desde JavaScript en el navegador, el navegador bloqueará las peticiones.
   Opciones:
   - Consumir la API desde el backend de la aplicación lateral (recomendado).
   - Agregar cabeceras `Access-Control-Allow-Origin` en estas rutas (requiere editar el proyecto SIRONT).
   - Usar un proxy/reverse-proxy que añada las cabeceras CORS.

3. **Formato de respuesta inconsistente**: tenlo en cuenta al integrar:
   - `GET/POST /api/bancos` → envuelven el dato en `{ success, data }`.
   - `GET/PUT/DELETE /api/bancos/{id}` → devuelven el objeto o mensaje **sin** envoltura.
   - `GET /api/notas-credito/bancos` → envuelve en `{ success, bancos }`.

4. **Fuente de datos**: la información proviene de la tabla `public.bancos` de la base
   de datos XMLS (conexión `xmlsSequelize` en `src/lib/db.ts`).

5. **Modo solo lectura**: si la aplicación lateral solo necesita leer el catálogo, se
   recomienda usar únicamente `GET /api/bancos` o `GET /api/notas-credito/bancos` y no
   exponer las operaciones de escritura (`POST`, `PUT`, `DELETE`), ya que estas no tienen
   ningún control de autenticación/autorización.

---

## 7. Archivos relacionados (código fuente)

| Archivo | Descripción |
|---------|-------------|
| `src/app/api/bancos/route.ts` | `GET` y `POST` de `/api/bancos` |
| `src/app/api/bancos/[id]/route.ts` | `GET`, `PUT` y `DELETE` de `/api/bancos/{id}` |
| `src/app/api/notas-credito/bancos/route.ts` | `GET` de `/api/notas-credito/bancos` |
| `src/models/Banco.ts` | Modelo Sequelize de la tabla `public.bancos` |
| `src/types/banco.ts` | Tipos TypeScript del recurso |
| `src/middleware.ts` | Middleware global (solo protege `/api/admin/*`) |
