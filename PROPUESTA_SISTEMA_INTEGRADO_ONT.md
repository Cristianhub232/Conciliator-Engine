# PROPUESTA DE SERVICIOS TECNOLÓGICOS: SISTEMA INTEGRADO DE INFORMACIÓN PARA LAS DIRECCIONES DE LA OFICINA NACIONAL DEL TESORO (ONT)

**Alcance Funcional, Arquitectura de Servicios Modulares y Propuesta Técnica Unificada**

---

## 1. PRESENTACIÓN Y ENFOQUE ESTRATÉGICO

La presente propuesta técnica contempla el diseño, desarrollo, despliegue y puesta en marcha del **Sistema Integrado de Información de la Oficina Nacional del Tesoro (ONT)**. Su propósito fundamental es interconectar a las distintas Direcciones Generales que componen la ONT a través de una plataforma tecnológica única, moderna y estructurada, garantizando el flujo oportuno, consistente y seguro de la información requerida para sus procesos misionales: registro, control, seguimiento, flujo de caja, conciliación contable-financiera, reporte institucional y apoyo a la toma de decisiones del Despacho del Tesorero Nacional.

La solución se concibe bajo un modelo de **Servicios Tecnológicos Modulares**, lo que permite a la institución implementar la plataforma de forma integral o por fases independientes de alto impacto. 

Como primer caso de implementación prioritaria, la propuesta incorpora la modernización y automatización de los procesos de la **Dirección de Recaudación de Ingresos Fiscales**, dada su función neurálgica en la determinación y cierre de la Cuenta General de Recursos del Tesoro Nacional y su interacción directa con el **Sistema Integrado de Gestión y Control de las Finanzas Públicas (SIGECOF)**.

---

## 2. FINALIDAD Y OBJETIVOS

### 2.1. Finalidad Institucional
Disponer de un ecosistema de información centralizado y confiable que conecte las funciones operativas de las direcciones de la ONT, sustituyendo la remisión informal y fragmentada de reportes por correo electrónico por un canal institucional automatizado, asegurando la consistencia contable con SIGECOF y suministrando analíticas ejecutivas en tiempo real al Tesorero Nacional.

### 2.2. Objetivos Específicos
- **Sustitución de silos operativos:** Centralizar el intercambio de datos entre direcciones mediante publicaciones estructuradas y trazables, eliminando la dispersión en hojas de cálculo y correos.
- **Interconexión transaccional con SIGECOF:** Rediseñar la interacción con la interfaz negociadora de SIGECOF y ONT Service para agilizar la carga de lotes, planillas y asientos de recaudación tributaria (SENIAT) y no tributaria.
- **Optimización de consultas críticas:** Refactorizar sentencias SQL e índices en bases de datos para resolver cuellos de botella históricos, tiempos de espera (*timeouts*) y bloqueos en reportes de alta demanda contable (Reporte 95 y Reporte 5).
- **Conciliación y auditoría con asistencia inteligente:** Integrar algoritmos deterministas de balance junto con modelos de aprendizaje y correspondencia difusa (*fuzzy matching*) como apoyo al analista para la detección temprana de inconsistencias, duplicidades y patrones anómalos.
- **Canal ejecutivo para la Alta Gerencia:** Proveer al Despacho del Tesorero Nacional un tablero de control en tiempo real y un canal ágil de alertas y consultas automatizadas mediante mensajería segura (con autenticación 2FA) o notificaciones web directas.

---

## 3. MATRIZ DE INTERCAMBIO FUNCIONAL ENTRE DIRECCIONES

A continuación, se define el mapa de dependencias operativas entre las distintas direcciones de la ONT. Este inventario conforma el catálogo de fuentes, estructuras de datos y políticas de acceso del sistema:

### 3.1. Dirección General de Planificación y Análisis Financiero
Responsable del flujo de caja diario, proyecciones, programación de ingresos/egresos y asignación de cuotas de desembolso para órdenes de pago y ejecución presupuestaria.

| Dirección Proveedora | Información Requerida por Planificación |
| :--- | :--- |
| **Dirección General de Ingresos** | Reporte detallado de ingresos diarios en la cuenta principal (Recaudación SENIAT, Traspasos, Petroleros, Dominio Minero, etc.) para el cuadre exacto del flujo de caja. |
| **Dirección General de Egresos** | Reporte detallado de adelantos financieros y pagos en cuenta principal (Gastos de Personal, Funcionamiento, Seguridad y Defensa, Situado Constitucional, etc.). |
| **Dirección de Cuenta Única** | Reporte de operaciones y movimientos de tesorería reflejados en la cuenta principal. |
| **Dirección de Inversiones y Valores** | Movimientos de existencia por operaciones de inversión y valores con impacto en liquidez diaria. |
| **Dirección General de TI (DGTIC)** | Vistas y consultas detalladas de bases de datos operativas (SIGECOF, ONT Service, almacenes de datos). |

### 3.2. Dirección General de Cuenta Única
Responsable del registro contable, conciliación, control y reporte de fondos del Tesoro Nacional y de terceros bajo custodia, emisión de estadísticas oficiales para entes rectores (BCV, ONAPRE, ONCOP, SENIAT) y cumplimiento del enteramiento de retenciones impositivas.

| Dirección Proveedora | Información Requerida por Cuenta Única |
| :--- | :--- |
| **Planificación y Análisis Financiero** | Relación de enteramiento de fondos custodiados 70-30 y flujo de caja diario consolidado. |
| **Recaudación de Ingresos Fiscales** | Relación de recaudación y liquidación de fondos custodiados 70-30. |
| **Análisis de Ingresos Fiscales** | Recaudación por operaciones de crédito público y Letras del Tesoro Nacional. |
| **Ingresos Fiscales** | Relación e informe discriminado de recaudación de recursos ordinarios y extraordinarios. |
| **Inversiones y Valores** | Incremento / liquidación de inversiones, compra/venta de títulos valores y operaciones con impacto patrimonial. |
| **Egresos en Moneda Nacional** | Relación de órdenes de pago asociadas a enteramientos a entes parafiscales, actas de transferencia y soportes de cuentas movilizadas bajo control de DCE. |
| **Dirección General de Egresos** | Órdenes de pago imputadas por IVA, pagos ejecutados discriminados por concepto y balances de egreso. |
| **Egresos en Moneda Extranjera** | Registro de operaciones cambiarias y compra de divisas. |
| **Egresos / Ingresos Fiscales** | Órdenes de pago asociadas al rescate y refinanciamiento de Bonos DPN y Letras del Tesoro. |
| **Tecnología de la Información (DGTIC)** | Extracciones automatizadas de datas especiales, parafiscales y retenciones de impuestos. |

### 3.3. Dirección de Egresos en Moneda Nacional
Supervisa, registra, ejecuta y concilia órdenes de pago y transferencias en bolívares, gestionando rechazos bancarios, devoluciones y estadísticas financieras.

| Dirección Proveedora | Información Requerida |
| :--- | :--- |
| **Ingresos Fiscales** | Recaudación mensual de embajadas y consulados de la República y reversos/reintegros a bancos. |
| **Cuenta Única** | Reporte consolidado de pagos por concepto de impuestos regionales. |

### 3.4. Dirección de Egresos en Moneda Extranjera
Ejecuta los egresos a través de cuentas en el exterior en divisas para servicio de deuda externa, pagos internacionales y rescate de títulos de la República.

| Dirección Proveedora | Información Requerida |
| :--- | :--- |
| **Ingresos Fiscales** | Recaudación en divisas proveniente de sedes diplomáticas, consulados y operaciones de retorno bancario. |

### 3.5. Dirección de Inversiones y Valores
Administra los fondos no comprometidos del Tesoro Nacional, la custodia de títulos valores, inversiones en moneda nacional/extranjera y preservación de capital con alta liquidez.
- **Comportamiento operativo:** No requiere insumos de otras direcciones para su gestión primaria, pero es **proveedora crítica** de información patrimonial para Planificación, Cuenta Única y Análisis de Ingresos.

### 3.6. Dirección General de Administración
Gestiona los recursos presupuestarios, humanos y materiales de la ONT para el cumplimiento del Plan Operativo Anual (POA).
- Consolida el avance del POA solicitando información estructurada periódica a todas las direcciones de la ONT.

### 3.7. Dirección General de Recursos Humanos
Planifica y administra el talento humano, asistencias, evaluaciones y bienestar institucional.
- Publica para cada dirección reportes trimestrales de desempeño, certificaciones y avisos oficiales, eliminando el envío masivo por correo.

### 3.8. Dirección General de Tecnología de la Información (DGTIC)
Garantiza el funcionamiento de plataformas, servidores, conectividad y seguridad de la información.
- **Relación con el sistema:** Actúa como socio técnico estratégico, autorizando y facilitando los accesos transaccionales a bases de datos (SIGECOF, ONT Service, réplicas locales) y validando las políticas de ciberseguridad institucional.

### 3.9. Dirección de Análisis de Ingresos Fiscales
Realiza el control de ingresos públicos y verifica su correlación con la Ley de Presupuesto y Ley Especial de Endeudamiento.

| Dirección Proveedora | Información Requerida |
| :--- | :--- |
| **Inversiones y Valores** | Ejecución de pagarés, operaciones cambiarias, rendimientos e intereses de inversiones del Tesoro. |
| **Dirección General de Egresos** | Notificación formal de devoluciones de órdenes de pago o reintegros presupuestarios. |

### 3.10. Dirección de Recaudación de Ingresos Fiscales
Eje operativo del registro, conciliación diaria y cierre anual de la Cuenta General de Recursos del Tesoro Nacional en SIGECOF y ONT Service. Recibe planillas bancarias, notas de crédito del SENIAT, rentas no tributarias y emite certificaciones de ingresos (Decreto 4.278).

---

## 4. CATÁLOGO DE SERVICIOS MODULARES PROPUESTOS

Para responder con máxima flexibilidad a las prioridades y capacidades de despliegue de la ONT, el sistema se estructura en **5 Servicios Especializados**:

```
+-------------------------------------------------------------------------------------------------+
|                         SISTEMA INTEGRADO DE INFORMACIÓN (ONT)                                  |
+-------------------------------------------------------------------------------------------------+
   |                                 |                                 |
   v                                 v                                 v
[ SERVICIO 1 ]                 [ SERVICIO 2 ]                    [ SERVICIO 3 ]
Portal Web & Ecosistema        Motor Transaccional               Optimización de Base de
de Intercambio Inter-          de Conciliación & Cierre          Datos & Refactorización
Direcciones (Hub de Datos)     de Lotes (SIGECOF / SENIAT)       (Reportes 95 y 5)
   |                                 |                                 |
   +---------------------------------+---------------------------------+
   |                                 |
   v                                 v
[ SERVICIO 4 ]                 [ SERVICIO 5 ]
Módulo de Recaudación          Tablero Ejecutivo para el
Especial No-SENIAT &           Tesorero Nacional & Asistente
Auditoría Preventiva con IA    de Consultas Automatizado
```

---

### SERVICIO 1: Portal Web y Ecosistema de Intercambio Inter-Direcciones (Hub de Datos)
**Objetivo:** Eliminar la dependencia del correo electrónico y unificar la entrega de reportes mediante un portal institucional seguro y estructurado.

* **Portal institucional centralizado:** Interfaz web con diseño sobrio y moderno (UI reactiva) adaptada a los estándares de la administración pública.
* **Módulo de Publicación y Descarga:** Cada dirección publica sus cortes operativos y relaciones de datos en formatos nativos estructurados (JSON, CSV, Excel validado), evitando documentos planos no procesables.
* **Control de acceso basado en roles (RBAC):** Permisos estrictos por usuario y dirección según la Matriz de Intercambio Funcional.
* **Trazabilidad y firma de entrega:** Registro de auditoría digital con fecha, hora, usuario y dirección de procedencia de cada reporte cargado o consultado.

---

### SERVICIO 2: Motor Transaccional de Automatización y Conciliación Fiscal (SIGECOF / SENIAT)
**Objetivo:** Automatizar la ingesta de notas de crédito del SENIAT y la conciliación determinista de planillas y movimientos bancarios.

* **Depurador inteligente de Notas de Crédito:** Filtro previo que valida número de control, vigencia, RIF, monto y estampa digital antes de tocar la base de datos central. Las notas con inconsistencias se aíslan en una bandeja de excepciones.
* **Conciliador Determinista de Lotes y Planillas:** Motor de balance contable que concilia al céntimo las planillas físicas/electrónicas contra las cabeceras bancarias y los registros de `ORG_LIQ.TXT_SENIAT`.
* **Cierre y Reasignación Operativa In-Situ:** Módulos de reasignación balanceada de expedientes y cierre formal de lotes en estado `'V'`, eliminando duplicidades de tareas en Workflow (`WFE_WORKFLOW.WF_WORK_ITEM`).
* **Sincronización Transaccional Segura:** Inserción y actualización controlada mediante procedimientos almacenados y paquetes nativos de SIGECOF.

---

### SERVICIO 3: Optimización de Base de Datos y Refactorización de Consultas Críticas
**Objetivo:** Eliminar los bloqueos de concurrencia y los tiempos de espera (*timeouts*) en la generación de los balances oficiales.

* **Reingeniería del Reporte 95:** Rediseño y optimización del plan de ejecución SQL para la consulta del Reporte 95 (ejecución presupuestaria detallada de ingresos), incorporando índices específicos sobre tablas transaccionales e históricas.
* **Reingeniería del Reporte 5:** Optimización de la extracción consolidada de cuentas de recaudación, eliminando escaneos completos de tablas (*full table scans*).
* **Generador Automatizado de Balances:** Módulo que realiza el cruce algorítmico entre el Reporte 95 y el Reporte 5, generando la hoja de balance oficial sin manipulación manual externa.

---

### SERVICIO 4: Módulo de Recaudación Especial No-SENIAT y Asistente de Auditoría Preventiva
**Objetivo:** Centralizar la captura de ingresos no tributarios e incorporar modelos analíticos para la detección temprana de desvíos.

* **Gestión de Rubros Especiales:** Módulo parametrizable para el registro y validación de ingresos por:
  - Sector minero y regalías.
  - Especie en oro.
  - Tasas consulares y servicios en el exterior.
  - Multas y sanciones administrativas.
* **Integración con Sistemas Auxiliares:** Conectores ETL para sincronizar bases de datos satélites con el esquema contable de la República.
* **Asistente de Auditoría Preventiva (IA como apoyo al analista):**
  - Modelos de correspondencia difusa (*fuzzy matching*) para identificar referencias bancarias truncadas o con errores tipográficos menores.
  - Algoritmos de detección de anomalías (valores atípicos, duplicidades transaccionales y desfases atípicos entre fecha de recaudación y fecha valor).
  > **Nota de Gobernanza:** Los modelos de IA operan exclusivamente en rol de alerta y asistencia; **toda decisión contable, asiento o balance final se rige por reglas deterministas y aprobación de analistas**, garantizando el cumplimiento de la normativa de ONCOP y Contraloría.

---

### SERVICIO 5: Tablero Ejecutivo para el Tesorero Nacional y Asistente de Consultas
**Objetivo:** Brindar a la máxima autoridad acceso inmediato a la posición de caja, métricas de recaudación y alertas institucionales.

* **Dashboard Gerencial en Tiempo Real:** Visualización gráfica de ingresos tributarios y no tributarios, egresos ejecutados, saldos de la cuenta principal y porcentaje de avance de conciliaciones.
* **Asistente de Consultas Automatizadas:** Canal directo para directores y el Tesorero Nacional que responde a consultas clave (`/ingresos_hoy`, `/saldo_tesoro`, `/cierre_lotes`) generando gráficos comparativos inmediatos.
* **Seguridad y Alternativas de Canal:**
  - Integración mediante Telegram con vinculación de número institucional y segundo factor de autenticación (2FA).
  - Como alternativa interna para cumplimiento de políticas de seguridad de estado, se dispondrá de un panel de alertas directas en la interfaz web del sistema o vía mensajería autohospedada institucional.

---

## 5. ARQUITECTURA TÉCNICA DE REFERENCIA

La solución se implementa bajo una arquitectura desacoplada, escalable y de alta disponibilidad:

```
[ FRONTEND / PORTAL ]          [ CANAL EJECUTIVO ]
Next.js / React / Tailwind     Bot Seguro (2FA) / Notificaciones
         │                               │
         └───────────────┬───────────────┘
                         ▼
             [ API GATEWAY & SEGURIDAD ]
             Fastify / NestJS / JWT / RBAC
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
[ MOTOR DE NEGOCIO & ETL ]     [ MOTOR DE AUDITORÍA & IA ]
Orquestador de Conciliación    Correspondencia Difusa /
Validación de Notas de Crédito Detección de Anomalías
         │                               │
         ├───────────────────────────────┤
         ▼                               ▼
[ CAPA DE ACCESO A DATOS ]     [ REPOSITORIO LOCAL SEGURO ]
Conector Oracle (SIGECOF)      PostgreSQL (Snapshots,
Pool Lectura / Escritura       Auditoría, Históricos)
```

---

## 6. PLAN DE EJECUCIÓN POR ETAPAS

Se propone un cronograma de implantación modular y progresivo:

| Etapa | Servicio Asociado | Entregables Principales |
| :---: | :--- | :--- |
| **Etapa 1** | **Servicio 1 (Plataforma Base)** | Despliegue del Portal Web, autenticación RBAC, catálogo de reportes inter-direcciones y módulo de carga/descarga trazable. |
| **Etapa 2** | **Servicio 2 (Recaudación & SENIAT)** | Motor de notas de crédito, conciliador de planillas bancarias, saneamiento de expedientes y cierre de lotes en SIGECOF. |
| **Etapa 3** | **Servicio 3 (Optimización BD)** | Refactorización de queries de Reporte 95 y Reporte 5, indexación en Oracle y generador automatizado de balances. |
| **Etapa 4** | **Servicio 4 (No-SENIAT & Auditoría)** | Ingesta de minería, oro y consulados; integración con sistema auxiliar y asistente de auditoría preventiva. |
| **Etapa 5** | **Servicio 5 (Tablero & Canal Ejecutivo)** | Dashboard gerencial en tiempo real, configuración del asistente de consultas ejecutivas y módulo de alertas al Tesorero. |

---

## 7. FACTORES CLAVE Y COORDINACIÓN CON DGTIC

Para garantizar el éxito operativo de la propuesta, se contemplan los siguientes compromisos técnicos:

1. **Gobernanza de Accesos a Base de Datos (SIGECOF):**
   - Trabajo coordinado con el equipo de DBA de la Dirección General de Tecnología de la Información para la asignación de privilegios DML y SELECT puntuales (o uso de procedimientos empaquetados autorizados) sobre los esquemas `WFE_WORKFLOW` y `ORG_LIQ`.
2. **Seguridad y Soberanía Tecnológica:**
   - La base de datos analítica y los servicios de orquestación residirán en infraestructura propia de la institución (servidores locales bajo control de la ONT).
3. **Respaldo Preventivo y Rollback Inmediato:**
   - Todo proceso automatizado contará con mecanismos de snapshot en PostgreSQL previo a la ejecución de cambios, garantizando reversibilidad al 100% ante cualquier eventualidad.

---

## 8. IMPACTO Y BENEFICIOS INSTITUCIONALES

* **Agilidad decisional:** El Tesorero Nacional dispondrá de cifras consolidadas de caja y recaudación en minutos, sin esperar cierres semanales manuales.
* **Cero cuellos de botella:** Reducción sustancial de tiempos de procesamiento en los cierres de ejercicio y periodos de alta recaudación tributaria.
* **Seguridad y cuadre fiscal estricto:** Eliminación de duplicidades y errores de digitación en la determinación de los recursos del Tesoro.
* **Ahorro de horas-hombre:** Liberación de carga operativa de transcriptores y analistas, reorientándolos a labores de fiscalización y análisis financiero.
* **Escalabilidad institucional:** Una plataforma diseñada modularmente para crecer e incorporar nuevas direcciones o fuentes financieras en el futuro.
