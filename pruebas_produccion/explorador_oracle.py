#!/usr/bin/env python3
"""
explorador_oracle.py - Herramienta integral de exploración de diccionario, código y usuarios en Producción SIGECOF.
Consolida y reemplaza:
  - explorar_det_planilla.py
  - explorar_auditoria.py
  - prueba_wf_users.py
  - explorar_organo.py
  - prueba_synonym.py
  - buscar_logica_transcriptor.py
  - buscar_txt_seniat.py
  - extract_code.py
  - extraer_expediente.py
  - extract_wfe_workflow.py
  - generar_md.py
"""

import sys
import os
import argparse
import conexionprod

def describir_tabla(cursor, table_spec: str):
    """Muestra columnas, tipos y restricciones de una tabla (ej. ORG_LIQ.PLANILLA)."""
    parts = table_spec.upper().split('.')
    if len(parts) == 2:
        owner, table_name = parts
    else:
        owner, table_name = None, parts[0]
        
    print(f"\n--- Estructura de Tabla: {table_spec.upper()} ---")
    sql = """
        SELECT 
            column_id,
            column_name,
            data_type,
            data_length,
            data_precision,
            data_scale,
            nullable
        FROM all_tab_columns
        WHERE table_name = :tbl
    """
    params = {"tbl": table_name}
    if owner:
        sql += " AND owner = :owner"
        params["owner"] = owner
    sql += " ORDER BY column_id"
    
    cursor.execute(sql, params)
    cols = cursor.fetchall()
    if not cols:
        print(f"  [!] No se encontró la tabla o no hay permisos sobre '{table_spec}'.")
        return
        
    print(f"  {'#':<4} {'COLUMNA':<30} {'TIPO':<15} {'NULO?':<6}")
    print("  " + "-" * 60)
    for c in cols:
        cid, cname, dtype, dlen, dprec, dscale, nll = c
        if dtype in ('NUMBER',):
            t_str = f"NUMBER({dprec or '*'},{dscale or 0})" if dprec else "NUMBER"
        elif dtype in ('VARCHAR2', 'CHAR'):
            t_str = f"{dtype}({dlen})"
        else:
            t_str = dtype
        print(f"  {str(cid):<4} {cname:<30} {t_str:<15} {nll:<6}")
    print(f"  Total: {len(cols)} columnas.")

def listar_usuarios(cursor, orga_id: str = "93"):
    """Lista usuarios y roles asociados a un órgano (por defecto ONT: 093 / 93)."""
    print(f"\n--- Usuarios en WFE_WORKFLOW.WF_USERS (Órgano: {orga_id}) ---")
    sql = """
        SELECT 
            USERS_ID,
            USERS_NOMBRE_CORTO || ' ' || USERS_NOMBRE_LARGO AS NOMBRE,
            USERS_STATUS,
            WFRO_ROLE_ID,
            ORGA_ID,
            CARGO
        FROM WFE_WORKFLOW.WF_USERS
        WHERE TRIM(LEADING '0' FROM ORGA_ID) = TRIM(LEADING '0' FROM :orga)
        ORDER BY USERS_STATUS ASC, USERS_ID ASC
    """
    cursor.execute(sql, {"orga": str(orga_id)})
    users = cursor.fetchall()
    if not users:
        print(f"  [!] No se encontraron usuarios para el órgano {orga_id}.")
        return
        
    print(f"  {'USUARIO_ID':<20} {'EST':<4} {'ROL':<18} {'CARGO / NOMBRE'}")
    print("  " + "-" * 75)
    for u in users:
        uid, nom, st, rol, org, cargo = u
        det = f"{nom} ({cargo})" if cargo else nom
        print(f"  {uid:<20} {st:<4} {str(rol or 'S/R'):<18} {det}")
    print(f"  Total: {len(users)} usuarios listados.")

def buscar_codigo(cursor, query_text: str, schema: str = None):
    """Busca ocurrencias de texto en paquetes, triggers y funciones (all_source)."""
    print(f"\n--- Búsqueda de '{query_text}' en código PL/SQL (all_source) ---")
    sql = """
        SELECT owner, name, type, line, text
        FROM all_source
        WHERE UPPER(text) LIKE UPPER(:query)
    """
    params = {"query": f"%{query_text}%"}
    if schema:
        sql += " AND owner = UPPER(:schema)"
        params["schema"] = schema
    sql += " ORDER BY owner, name, type, line"
    
    cursor.execute(sql, params)
    matches = cursor.fetchall()
    if not matches:
        print(f"  [!] No se encontraron coincidencias para '{query_text}'.")
        return
        
    print(f"  Se encontraron {len(matches)} coincidencias (mostrando primeras 30):")
    for m in matches[:30]:
        owner, name, otype, line, text = m
        print(f"  [{owner}.{name} ({otype}) L{line}]: {text.strip()}")
    if len(matches) > 30:
        print(f"  ... y {len(matches) - 30} coincidencias adicionales (truncado).")

def extraer_paquete(cursor, package_name: str, schema: str = "WFE_WORKFLOW"):
    """Descarga el código fuente de un paquete a un archivo .sql local."""
    package_name = package_name.upper()
    schema = schema.upper()
    out_file = f"{package_name}.sql"
    print(f"\n--- Extrayendo paquete {schema}.{package_name} a {out_file} ---")
    
    sql = """
        SELECT text 
        FROM all_source 
        WHERE owner = :schema AND name = :pkg 
        ORDER BY type, line
    """
    cursor.execute(sql, {"schema": schema, "pkg": package_name})
    lines = cursor.fetchall()
    if not lines:
        print(f"  [!] No se encontró código para {schema}.{package_name}.")
        return
        
    with open(out_file, "w", encoding="utf-8") as f:
        for (l,) in lines:
            f.write(l)
    print(f"  ✔ Código exportado exitosamente a: {out_file} ({len(lines)} líneas).")

def main():
    parser = argparse.ArgumentParser(description="Explorador integral de diccionario y código Oracle (Producción)")
    parser.add_argument("--describe", "-d", help="Describir columnas de una tabla (ej: ORG_LIQ.PLANILLA o WF_WORK_ITEM)")
    parser.add_argument("--users", "-u", nargs="?", const="93", help="Listar usuarios por órgano (default: 93 - ONT)")
    parser.add_argument("--search", "-s", help="Buscar texto en el código PL/SQL (all_source)")
    parser.add_argument("--schema", help="Filtrar por esquema en la búsqueda (ej: WFE_WORKFLOW, ORG_LIQ)")
    parser.add_argument("--extract", "-e", help="Extraer código de paquete PL/SQL a archivo .sql")
    
    args = parser.parse_args()
    
    if not any([args.describe, args.users, args.search, args.extract]):
        print("\n¿Qué deseas consultar en la Base de Datos?")
        print("1. Describir columnas de una tabla (--describe)")
        print("2. Listar usuarios y roles de la ONT / Órgano (--users)")
        print("3. Buscar texto en el código PL/SQL de la BD (--search)")
        print("4. Extraer código fuente de un paquete a archivo .sql (--extract)")
        print("5. Salir")
        op = input("Selecciona una opción (1-5): ").strip()
        
        if op == "1":
            tbl = input("Nombre de la tabla (ej. ORG_LIQ.DET_PLANILLA o WF_WORK_ITEM): ").strip()
            args.describe = tbl
        elif op == "2":
            org = input("Código de órgano (ENTER para 93 - ONT): ").strip()
            args.users = org or "93"
        elif op == "3":
            query = input("Texto a buscar en el código PL/SQL: ").strip()
            args.search = query
        elif op == "4":
            pkg = input("Nombre del paquete a exportar (ej: PK_WFE_USUARIO): ").strip()
            args.extract = pkg
        else:
            print("Operación cancelada.")
            return

    conn = conexionprod.conectar_consulta()
    cur = conn.cursor()
    try:
        if args.describe:
            describir_tabla(cur, args.describe)
        if args.users:
            listar_usuarios(cur, args.users)
        if args.search:
            buscar_codigo(cur, args.search, schema=args.schema)
        if args.extract:
            sch = args.schema or "WFE_WORKFLOW"
            extraer_paquete(cur, args.extract, schema=sch)
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
