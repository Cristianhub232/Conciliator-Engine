#!/usr/bin/env python3
"""
Prueba 4: Comprobación de Vistas Materializadas en Producción
Verifica estado, fecha de último refresco y volumetría (COUNT) de:
 1. ONT_SIR_BOT_AUDIT.MV_PLANILLAS_SIN_CONCILIAR_2024
 2. ONT_SIR_BOT_AUDIT.MV_AUDIT_ASIGNACIONES_2024
Y verifica si ONT_SIR_BOT posee permisos SELECT y sinónimos sobre ambas.
"""

import sys
import oracledb

HOST = "10.79.6.247"
PORT = 1521
SID = "sige1"

# Conectar como AUDIT para auditar el objeto propietario y como BOT para validar acceso
USER_AUDIT = "ONT_SIR_BOT_AUDIT"
PASS_AUDIT = "K#9xP$7mQ!2vW8z"

USER_BOT = "ONT_SIR_BOT"
PASS_BOT = "bR4#mK9$L1pX!7v"

VISTAS = [
    ("ONT_SIR_BOT_AUDIT", "MV_PLANILLAS_SIN_CONCILIAR_2024"),
    ("ONT_SIR_BOT_AUDIT", "MV_AUDIT_ASIGNACIONES_2024")
]

def main():
    print("=" * 70)
    print(" 🛠️  PRUEBA 4: VERIFICACIÓN DE VISTAS MATERIALIZADAS Y VOLUMETRÍA")
    print("=" * 70)

    dsn = oracledb.makedsn(HOST, PORT, sid=SID)

    # 1. Auditar como ONT_SIR_BOT_AUDIT
    print(f"\n--- 1. Diagnóstico del Propietario ('{USER_AUDIT}') ---")
    try:
        conn = oracledb.connect(user=USER_AUDIT, password=PASS_AUDIT, dsn=dsn)
        cur = conn.cursor()

        for owner, mv_name in VISTAS:
            print(f"\n👉 Analizando Vista Materializada '{owner}.{mv_name}':")
            
            # Estatus del objeto
            cur.execute("""
                SELECT object_type, status, created, last_ddl_time
                FROM user_objects
                WHERE object_name = :mv_name
            """, [mv_name])
            objs = cur.fetchall()
            if objs:
                for o_type, o_status, o_created, o_ddl in objs:
                    est_str = "✅ VALID" if o_status == "VALID" else f"❌ {o_status}"
                    print(f"   • Tipo: {o_type:<20} | Estado: {est_str} | Creado: {o_created}")
            else:
                print(f"   ❌ Objeto '{mv_name}' NO encontrado en user_objects.")

            # Info de MView y refresco
            cur.execute("""
                SELECT refresh_mode, refresh_method, last_refresh_date
                FROM user_mviews
                WHERE mview_name = :mv_name
            """, [mv_name])
            mv_row = cur.fetchone()
            if mv_row:
                rmode, rmethod, rdate = mv_row
                print(f"   • Modo Refresco: {rmode} | Método: {rmethod} | Último Refresco: {rdate}")

            # Conteo de filas
            try:
                cur.execute(f"SELECT COUNT(*) FROM {owner}.{mv_name}")
                total_filas = cur.fetchone()[0]
                print(f"   📊 Volumetría actual: {total_filas:,} filas")
            except Exception as e_count:
                print(f"   ❌ Error contando filas en '{mv_name}': {e_count}")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error conectando como {USER_AUDIT}: {e}")

    # 2. Auditar como ONT_SIR_BOT (Cuenta operativa)
    print(f"\n--- 2. Verificación de Acceso Operativo ('{USER_BOT}') ---")
    try:
        conn_bot = oracledb.connect(user=USER_BOT, password=PASS_BOT, dsn=dsn)
        cur_bot = conn_bot.cursor()

        for owner, mv_name in VISTAS:
            # Probar si el sinónimo/vista responde desde la cuenta del bot
            try:
                cur_bot.execute(f"SELECT COUNT(*) FROM {mv_name} WHERE ROWNUM <= 1")
                print(f"   ✅ '{USER_BOT}' tiene acceso directo a '{mv_name}' (Sinónimo OK)")
            except Exception as e_bot:
                print(f"   🔴 ALERTA: '{USER_BOT}' NO pudo leer '{mv_name}': {e_bot}")

        cur_bot.close()
        conn_bot.close()
    except Exception as e:
        print(f"❌ Error conectando como {USER_BOT}: {e}")

if __name__ == "__main__":
    main()
