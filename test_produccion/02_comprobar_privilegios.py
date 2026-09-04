#!/usr/bin/env python3
"""
Prueba 2: Comprobación de Privilegios (SELECT / DML) en Producción
Evalúa privilegios sobre los esquemas ORG_LIQ y WFE_WORKFLOW para ONT_SIR_BOT y ONT_SIR_BOT_AUDIT
"""

import sys
import oracledb

HOST = "10.79.6.247"
PORT = 1521
SID = "sige1"

USERS = [
    {"user": "ONT_SIR_BOT", "pass": "bR4#mK9$L1pX!7v", "tipo": "Operativo"},
    {"user": "ONT_SIR_BOT_AUDIT", "pass": "K#9xP$7mQ!2vW8z", "tipo": "Auditoría / MViews"}
]

# Tabla de DML esperado para ONT_SIR_BOT
DML_ESPERADO = [
    ("ORG_LIQ", "PLANILLA", ["INSERT", "DELETE"]),
    ("ORG_LIQ", "DET_PLANILLA", ["INSERT", "DELETE"]),
    ("ORG_LIQ", "TXT_SENIAT", ["UPDATE"]),
    ("WFE_WORKFLOW", "WF_WORK_ITEM", ["INSERT", "UPDATE"]),
    ("WFE_WORKFLOW", "WF_AUDITA_EXPEDIENTES", ["INSERT"]),
]

def verificar_privilegios_usuario(user_info):
    username = user_info["user"]
    password = user_info["pass"]
    dsn = oracledb.makedsn(HOST, PORT, sid=SID)

    print(f"\n==================================================")
    print(f" 🔍 Auditando Privilegios para: {username}")
    print(f"==================================================")

    try:
        conn = oracledb.connect(user=username, password=password, dsn=dsn)
        cur = conn.cursor()

        # 1. Privilegios concedidos en USER_TAB_PRIVS (o ALL_TAB_PRIVS)
        print("\n--- 1. Conteo de objetos con acceso SELECT por esquema ---")
        cur.execute("""
            SELECT owner, COUNT(DISTINCT table_name)
            FROM user_tab_privs
            WHERE privilege = 'SELECT'
            GROUP BY owner
            ORDER BY owner
        """)
        select_rows = cur.fetchall()
        if select_rows:
            for schema, count in select_rows:
                print(f"   • Esquema {schema}: {count} objetos con SELECT")
        else:
            print("   ⚠️ No se encontraron registros en USER_TAB_PRIVS para SELECT.")

        # 2. Privilegios DML específicos
        print("\n--- 2. Verificación de permisos DML requeridos ---")
        cur.execute("""
            SELECT owner, table_name, privilege
            FROM user_tab_privs
            WHERE privilege IN ('INSERT', 'UPDATE', 'DELETE')
            ORDER BY owner, table_name, privilege
        """)
        dml_rows = cur.fetchall()
        dml_map = {}
        for sch, tbl, priv in dml_rows:
            key = f"{sch}.{tbl}"
            dml_map.setdefault(key, set()).add(priv)

        if username == "ONT_SIR_BOT":
            for sch, tbl, privs_req in DML_ESPERADO:
                key = f"{sch}.{tbl}"
                privs_act = dml_map.get(key, set())
                faltantes = [p for p in privs_req if p not in privs_act]
                if not faltantes:
                    print(f"   ✅ {key}: Privilegios OK ({', '.join(privs_req)})")
                else:
                    print(f"   ❌ {key}: FALTAN PRIVILEGIOS! Requeridos: {privs_req} | Actuales: {list(privs_act)}")
        else:
            if dml_map:
                for obj, privs in dml_map.items():
                    print(f"   • {obj}: {', '.join(privs)}")
            else:
                print("   ℹ️ El usuario no posee permisos DML de escritura (Correcto para cuenta de auditoría).")

        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"   ❌ Error auditando privilegios para {username}: {e}")
        return False

def main():
    print("=" * 70)
    print(" 🛠️  PRUEBA 2: VERIFICACIÓN DE PRIVILEGIOS (SELECT Y DML)")
    print("=" * 70)

    for u in USERS:
        verificar_privilegios_usuario(u)

if __name__ == "__main__":
    main()
