# ICHI — Agente flotante · guía de integración

Widget de agente conversacional para incrustar en la aplicación sin tocar el frontend existente. Se entrega como **web component aislado en Shadow DOM**: sus estilos no se filtran hacia tu app y los de tu app no lo afectan. No usa React, ni build, ni dependencias.

---

## 1. Archivos

| Archivo | Qué es | ¿Va al proyecto? |
|---|---|---|
| `ichi-agent.js` | El widget completo (marcado, estilos y lógica). 18 KB, sin minificar. | **Sí** |
| `ichi-demo.html` | Página vacía de prueba para verlo aislado. | No, solo referencia |
| `Motor Financiero ONT.dc.html` | La maqueta donde se diseñó, con las 4 pantallas. | No, solo referencia |

---

## 2. Instalación

Copia `ichi-agent.js` a tus estáticos (por ejemplo `public/vendor/ichi-agent.js`) y añade dos líneas al layout que envuelve la app, **al final del `<body>`**:

```html
<ichi-agent context="Conciliación Masiva · Exp 1889"></ichi-agent>
<script src="/vendor/ichi-agent.js"></script>
```

Eso es todo. El componente se posiciona solo (`position: fixed`, abajo a la derecha, `z-index: 2147483000`) y no participa del layout de la página: puedes ponerlo en cualquier punto del DOM.

### Tipografías

El script inyecta automáticamente un `<link>` a Google Fonts (Space Grotesk, Chakra Petch, IBM Plex Mono). Si tu app las auto-hospeda o el entorno no tiene salida a internet, desactívalo con `fonts="off"` y asegúrate de declarar esas familias por tu cuenta:

```html
<ichi-agent fonts="off"></ichi-agent>
```

### React / Vue / Angular

Es un elemento nativo, se usa como cualquier etiqueta:

```jsx
// React — carga el script una vez en index.html y usa la etiqueta
export function AgenteICHI({ pantalla }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.resolver = preguntar;          // ver §4
  }, []);
  return <ichi-agent ref={ref} context={pantalla} />;
}
```

> En React 18 los atributos de custom elements se pasan como strings; para objetos y funciones (como `resolver`) asigna la propiedad por `ref`, no por atributo.

---

## 3. Atributos

| Atributo | Por defecto | Para qué sirve |
|---|---|---|
| `context` | — | Texto que se anexa a la tira superior del panel. Actualízalo al navegar entre pantallas. |
| `model` | `Claude Sonnet 4.5 · Anthropic` | Nombre del LLM que se muestra en la tira. |
| `greeting` | Texto genérico | Primer mensaje del agente al montar. |
| `open` | ausente | Si está presente, el panel arranca abierto. |
| `fonts` | `on` | `off` desactiva la inyección de Google Fonts. |

Todos son reactivos salvo `greeting` y `open`, que se leen al montar.

---

## 4. Conectar el LLM real

Por defecto responde con un guion fijo por palabra clave (demo). Para conectarlo a tu backend, asigna la **propiedad** `resolver`: una función que recibe la pregunta y devuelve (o promete) `{ text, note }`.

```js
const agente = document.querySelector('ichi-agent');

agente.resolver = async (pregunta) => {
  const r = await fetch('/api/agente', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pregunta,
      pantalla: agente.getAttribute('context'),
      expediente: estadoActual.expediente,   // el contexto que quieras pasar
      lote: estadoActual.lote
    })
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const data = await r.json();
  return { text: data.respuesta, note: data.fuente };   // `note` es opcional
};
```

- `text` es el cuerpo de la respuesta.
- `note` es la línea monoespaciada bajo la burbuja: úsala para la trazabilidad (tabla consultada, fecha de corte, regla aplicada). Si la omites, no se dibuja.
- Mientras la promesa está pendiente el widget muestra los tres puntos y cambia el estado de la cabecera a "Consultando…".
- Si la promesa falla, el agente responde con un mensaje de error y el detalle en la nota. No hace falta que lo captures tú.

También puedes devolver un string simple: `agente.resolver = q => 'Respuesta';`

### Sugerencias

```js
agente.suggestions = ['¿Cuántas planillas quedan pendientes?', 'Resumen del lote'];
agente._renderChips();   // tras cambiarlas
```

Los chips se ocultan solos cuando la conversación pasa de tres mensajes.

---

## 5. API

```js
agente.open();              // abre el panel y enfoca el campo
agente.close();
agente.toggle();
agente.reset();             // limpia el hilo
agente.ask('pregunta');     // envía como si la hubiera escrito el usuario
agente.push('agent', 'texto', 'nota opcional');   // inserta un mensaje sin consultar
```

Eventos (burbujean, `detail` donde aplica):

| Evento | Cuándo |
|---|---|
| `ichi-open` / `ichi-close` | El panel se abre o cierra |
| `ichi-ask` | El usuario envía una pregunta · `detail.question` |

Ejemplo: notificar al agente desde la app.

```js
// Cuando el usuario ejecuta una búsqueda de lote
agente.setAttribute('context', `Lote ${lote} · Exp ${expediente}`);
agente.push('agent', `Cargué ${planillas.length} planillas del lote ${lote}. ¿Reviso las pendientes?`);
```

---

## 6. Comportamiento visual

- **Botón flotante** de 76 px: disco marino con la K vectorizada de Kaizen y el anillo celeste. En reposo emite un halo que late; al pasar el cursor crece, el anillo gira 300° y se despliega la etiqueta "Pregúntale a ICHI". El badge verde desaparece la primera vez que se abre.
- **Panel** de 468 px de ancho y hasta 684 px de alto, acotado a `min(684px, 100vh - 132px)` para que nunca desborde en pantallas bajas. El hilo tiene un piso de 190 px.
- **Avatar de la cabecera**: mientras el panel está abierto y el campo vacío, se inclina y rebota cada pocos segundos y el anillo orbita despacio. Se detiene en cuanto el usuario escribe.

---

## 7. Paleta y tipografía

| Token | Valor | Uso |
|---|---|---|
| Marino ICHI | `#0A1733` | Fondo del avatar y del botón |
| Marino cabecera | `#0C1E44` → `#0A1733` | Degradado de la cabecera |
| Celeste ICHI | `#7FC8EE` | K, anillo, acento del wordmark |
| Celeste apagado | `#A9CDEA` | Texto secundario sobre marino |
| Azul Datax | `#1E5C99` | Acentos, chips, puntos de escritura |
| Azul burbuja | `#0E2452` | Burbuja del usuario y botón de envío |
| Verde | `#8CC63F` | Punto de estado y badge |
| Gris fondo | `#F6F8FA` | Fondo del hilo |
| Borde | `#DCE3EC` / `#E1E7EE` | Panel y burbujas |

Tipografías: **Space Grotesk** (cuerpo del chat, 14 px / 1.6), **Chakra Petch** (wordmark ICHI y estados, con `letter-spacing` de 0.22em), **IBM Plex Mono** (tira del LLM y notas de fuente).

Para ajustar cualquiera de estos valores, edita el bloque `CSS` al inicio de `ichi-agent.js`: es una lista de reglas en orden de aparición.

---

## 8. Notas

- El widget guarda la conversación solo en memoria. Si quieres persistirla entre recargas, serializa desde tus propios handlers de `ichi-ask` y repón el hilo con `push()` al montar.
- No incluye autenticación: la llamada al LLM sale desde tu `resolver`, con las cookies o el token que ya use tu aplicación.
- Probado en Chrome, Edge, Firefox y Safari recientes. Usa Shadow DOM y custom elements v1, sin polyfills.
