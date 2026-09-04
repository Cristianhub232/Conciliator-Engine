#!/usr/bin/env python3
"""
Prueba 3: Comprobación de Índices de Optimización en Producción
Verifica la existencia, tablespace, estado y grado de paralelismo de los índices:
 1. ORG_LIQ.IDX_TXT_OPT_HUERFANAS
 2. ORG_LIQ.IDX_PLANILLA_LOTE_ID
 3. WFE_WORKFLOW.IDX_WFE_EXP_ESTADO
"""

import sys
import oracledb

HOST = "10.79.6.247"
PORT = 1521
SID = "sige1"
USER = "ONT_SIR_BOT"
PASS = "bR4#mK9$L1pX!7v"

INDICES_OBJETIVO = [
    ("ORG_LIQ", "IDX_TXT_OPT_HUERFANAS", "TXT_SENIAT"),
    ("ORG_LIQ", "IDX_PLANILLA_LOTE_ID", "PLANILLA"),
    ("WFE_WORKFLOW", "IDX_WFE_EXP_ESTADO", "WF_WORK_ITEM")
]

def main():
    print("=" * 70)
    print(" 🛠️  PRUEBA 3: VERIFICACIÓN DE ÍNDICES DE OPTIMIZACIÓN EN PRODUCCIÓN")
    print("=" * 70)

    dsn = oracledb.makedsn(HOST, PORT, sid=SID)
    try:
        conn = oracledb.connect(user=USER, password=PASS, dsn=dsn)
        cur = conn.cursor()

        print(f"\nConectado como '{USER}'. Consultando diccionario ALL_INDEXES / ALL_IND_COLUMNS...\n")

        for owner, idx_name, table_name in INDICES_OBJETIVO:
            print(f"👉 Auditando índice '{owner}.{idx_name}' (Tabla: {table_name}):")
            
            cur.execute("""
                SELECT owner, index_name, table_name, tablespace_name, status, degree
                FROM all_indexes
                WHERE owner = :owner AND index_name = :idx_name
            """, [owner, idx_name])

            row = cur.fetchone()
            if row:
                i_owner, i_name, i_tbl, i_ts, i_status, i_degree = row
                estado_str = "✅ VALID" if i_status == "VALID" else f"❌ {i_status}"
                print(f"   • Estatus:     {estado_str}")
                print(f"   • Tablespace:  {i_ts}")
                print(f"   • Paralelismo: {i_degree} (Deseado: 1 / NOPARALLEL)")

                # Consultar columnas del índice
                cur.execute("""
                    SELECT column_name, column_position
                    FROM all_ind_columns
                    WHERE index_owner = :owner AND index_name = :idx_name
                    ORDER BY column_position
                """, [owner, idx_name])
                cols = [f"{c[0]}" for c in cur.fetchall()]
                print(f"   • Columnas:    ({', '.join(cols)})")
            else:
                print(f"   ❌ ERROR: El índice '{owner}.{idx_name}' NO EXISTE en la base de datos.")
            print("-" * 50)

        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error ejecutando prueba de índices: {e}")

if __name__ == "__main__":
    main()
