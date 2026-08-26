# Análisis de Diferencias: Desarrollo vs Producción (SIGECOF)

Este documento analiza las enormes diferencias de visibilidad, accesos y permisos entre el usuario de Desarrollo (`GDES_DQUINTERO`) y el usuario de Producción (`consulta`).

> [!IMPORTANT]
> **Conclusión general:** El usuario de Producción tiene un nivel de acceso inmensamente superior. Mientras que en Desarrollo el usuario está severamente restringido a unas pocas tablas en esquemas puntuales, en Producción el usuario `consulta` tiene visibilidad casi global de la base de datos, probablemente a través del privilegio `SELECT ANY TABLE`.

## 1. Volumen General de Esquemas
- **En Desarrollo:** Tienes acceso a visualizar objetos de **17 esquemas**.
- **En Producción:** Tienes acceso a visualizar objetos de **43 esquemas**.

## 2. Acceso a Esquemas Core de Negocio (Ausentes en DEV)
En Producción tienes acceso completo a esquemas modulares críticos del negocio que están totalmente invisibles en Desarrollo. Algunos de los más importantes incluyen:
- **`CONTAB`** (179 Tablas)
- **`OOCP_PRES`** (197 Tablas)
- **`SIGECOF`** (44 Tablas)
- **`CTA_UNICA`** (42 Tablas)
- **`FONDOS`** (31 Tablas)
- **`APISEG`** (21 Tablas)
- **`GESTION_INTERNA`** (19 Tablas)
- **`WFE_WORKFLOW`** (39 Tablas)
- **`APICOR`**, **`BTCCONFIG`**, **`BTCMF2017`**, **`BTCPAR2017`**

*En el ambiente de desarrollo (GDES_DQUINTERO), no puedes ver absolutamente nada de esto.*

## 3. Diferencia abismal en las tablas de `ORG_LIQ`
Uno de los descubrimientos más importantes de Desarrollo fue encontrar 18 tablas en `ORG_LIQ`. Sin embargo, al mirar Producción:
- **Desarrollo:** 18 Tablas.
- **Producción:** **70 Tablas** y 3 Procedimientos. 
*(Es decir, te faltan 52 tablas en desarrollo para poder hacer pruebas integrales de ese módulo).*

## 4. Visibilidad de Tablas del Sistema (`SYS` / `SYSTEM`)
- **Desarrollo (`SYS`):** 47 Tablas, 1827 Vistas.
- **Producción (`SYS`):** 1586 Tablas, 6992 Vistas.
- **Producción (`SYSTEM`):** 133 Tablas (vs 4 en DEV).

## Recomendaciones
> [!WARNING]
> Si los desarrollos o scripts que vas a construir necesitan consultar módulos como Contabilidad (`CONTAB`), Presupuesto (`OOCP_PRES`), Tesorería (`CTA_UNICA`) o Fondos (`FONDOS`), **no podrás probarlos en el ambiente de Desarrollo** actual porque el usuario `GDES_DQUINTERO` carece por completo de acceso a esas tablas.
> 
> Deberás pedir a DBA que le asigne los permisos necesarios (roles o grants de `SELECT`) al usuario de Desarrollo, o bien realizar las consultas de prueba estrictamente con cuidado en Producción.
