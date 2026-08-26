# Diferencias de Privilegios en Desarrollo (SIGECOF)

Este documento detalla las diferencias de visibilidad de objetos en la base de datos de desarrollo al cambiar del usuario anterior (`btcconfig`) al nuevo usuario (`GDES_DQUINTERO`).

## 1. Esquemas que desaparecieron (Sin acceso)
El usuario nuevo **perdió la visibilidad completa** de 16 esquemas que antes sí se veían. La mayoría de estos corresponden a esquemas del sistema o de otros módulos a los cuales este usuario no tiene permisos:

- `APISEG`
- `BTCCONFIG`
- `BTCMF2017`
- `BTCPAR2017`
- `CONTAB`
- `CONTAB_ADM`
- `DBSNMP`
- `FONDOS`
- `GDES_SR`
- `GESTION_INTERNA`
- `OOCP_PRES`
- `OUTLN`
- `PA_AWR_USER`
- `REMOTE_SCHEDULER_AGENT`
- `SIGECOF`
- `WFE_WORKFLOW`

## 2. Restricción en funciones y procedimientos del sistema
En los esquemas que sí logró ver, se nota una fuerte restricción sobre las funciones y procedimientos (casi todos correspondientes a esquemas core de Oracle o extensiones del sistema):

- **CTXSYS:** Perdió el acceso a 2 FUNCTIONs y 2 PROCEDUREs.
- **DVSYS:** Perdió el acceso a 26 FUNCTIONs y 2 PROCEDUREs.
- **GSMADMIN_INTERNAL:** Perdió el acceso a 1 PROCEDURE.
- **LBACSYS:** Perdió el acceso a 10 FUNCTIONs y 8 PROCEDUREs.
- **MDSYS:** Perdió el acceso a 39 FUNCTIONs y 7 PROCEDUREs.
- **SYSTEM:** Perdió el acceso a 6 FUNCTIONs.
- **WMSYS:** Perdió el acceso a 1 PROCEDURE.
- **XDB:** Perdió el acceso a 1 FUNCTION y 4 PROCEDUREs.

## 3. Nuevos accesos (Objetos Ganados)
El cambio más relevante a nivel funcional y de negocio ocurrió en el esquema **`ORG_LIQ`**:

- **Usuario Anterior (`btcconfig`):** Solo tenía visibilidad sobre 3 procedimientos en ese esquema, pero ninguna tabla.
- **Nuevo Usuario (`GDES_DQUINTERO`):** Ahora tiene acceso a **18 TABLEs** dentro del esquema `ORG_LIQ`. 

Esta nueva visibilidad es fundamental, ya que otorga acceso a los datos estructurados en tablas que antes estaban ocultos.
