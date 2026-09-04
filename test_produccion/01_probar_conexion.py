#!/usr/bin/env python3
"""
Prueba 1: Verificación de Conexión a Base de Datos de Producción SIGECOF
Host: 10.79.6.247:1521 | SID/Service: sige1
Cuentas: ONT_SIR_BOT / ONT_SIR_BOT_AUDIT
"""

import sys
import oracledb

HOST = "10.79.6.247"
PORT = 1521
SID = "sige1"

USERS = [
    {"user": "ONT_SIR_BOT", "pass": "bR4#mK9$L1pX!7v", "tipo": "Operativo / Bot"},
    {"user": "ONT_SIR_BOT_AUDIT", "pass": "K#9xP$7mQ!2vW8z", "tipo": "Propietario Esquema / Auditoría"}
]

def probar_conexion_usuario(user_info):
    username = user_info["user"]
    password = user_info["pass"]
    tipo = user_info["tipo"]

    print(f"\n➔ Intentando conexión con '{username}' ({tipo})...")
    
    dsn = oracledb.makedsn(HOST, PORT, sid=SID)
    try:
        conn = oracledb.connect(user=username, password=password, dsn=dsn)
        cur = conn.cursor()

        # Consultar info de sesion y usuario
        cur.execute("SELECT USER, SYS_CONTEXT('USERENV', 'DB_NAME'), SYS_CONTEXT('USERENV', 'SERVER_HOST') FROM DUAL")
        db_user, db_name, server_host = cur.fetchone()
        
        print(f"  ✅ CONEXIÓN EXITOSA!")
        print(f"     - Usuario activo: {db_user}")
        print(f"     - Base de datos:  {db_name}")
        print(f"     - Server Host:    {server_host}")

        # Intentar consultar v$instance si tiene permiso
        try:
            cur.execute("SELECT instance_name, host_name, version, status FROM v$instance")
            inst, host, ver, status = cur.fetchone()
            print(f"     - Instancia:     {inst} (v{ver}) | Estado: {status}")
        except Exception:
            pass

        cur.close()
        conn.close()
        return True
    except Exception as e:
        print(f"  ❌ ERROR DE CONEXIÓN con '{username}': {e}")
        return False

def main():
    print("=" * 70)
    print(" 🛠️  PRUEBA 1: CONEXIÓN A PRODUCCIÓN SIGECOF (10.79.6.247:1521 / sige1)")
    print("=" * 70)

    resultados = []
    for u in USERS:
        ok = probar_conexion_usuario(u)
        resultados.append((u["user"], ok))

    print("\n" + "-" * 70)
    print("RESUMEN DE CONEXIONES:")
    todas_ok = True
    for user, ok in resultados:
        estado = "✅ OK" if ok else "❌ FALLÓ"
        print(f" - {user}: {estado}")
        if not ok:
            todas_ok = False

    return 0 if todas_ok else 1

if __name__ == "__main__":
    sys.exit(main())
