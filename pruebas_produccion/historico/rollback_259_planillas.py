import oracledb
import sys

def main():
    dsn = oracledb.makedsn('10.79.6.247', 1521, sid='sige1')
    conn = oracledb.connect(user='ONT_SIR_BOT', password='bR4#mK9$L1pX!7v', dsn=dsn)
    cur = conn.cursor()

    try:
        print("=== INICIANDO ROLLBACK QUIRÚRGICO DE 259 PLANILLAS ===")
        print("Lote: Banco 134 | Fecha: 2024-04-11 | Agencia: 0800 | LOTE_SEQ: 33209 | Expediente: 1860\n")

        # 1. Eliminar de DET_PLANILLA
        print("Paso 1: Eliminando detalles en ORG_LIQ.DET_PLANILLA...")
        sql_det = """
            DELETE FROM ORG_LIQ.DET_PLANILLA
            WHERE ANHO = 2024 
              AND LOTE_SEQ = 33209 
              AND PLAN_SEQ >= 5265
        """
        cur.execute(sql_det)
        det_deleted = cur.rowcount
        print(f"  -> Filas eliminadas en DET_PLANILLA: {det_deleted} (esperadas: 743)")
        if det_deleted != 743:
            raise ValueError(f"Discrepancia en DET_PLANILLA: se esperaban 743 y se obtuvieron {det_deleted}")

        # 2. Eliminar de PLANILLA
        print("\nPaso 2: Eliminando planillas maestras en ORG_LIQ.PLANILLA...")
        sql_pln = """
            DELETE FROM ORG_LIQ.PLANILLA
            WHERE ANHO = 2024 
              AND LOTE_SEQ = 33209 
              AND PLAN_SEQ >= 5265
        """
        cur.execute(sql_pln)
        pln_deleted = cur.rowcount
        print(f"  -> Filas eliminadas en PLANILLA: {pln_deleted} (esperadas: 259)")
        if pln_deleted != 259:
            raise ValueError(f"Discrepancia en PLANILLA: se esperaban 259 y se obtuvieron {pln_deleted}")

        # 3. Resetear TXT_SENIAT
        print("\nPaso 3: Reseteando estados en ORG_LIQ.TXT_SENIAT...")
        sql_txt = """
            UPDATE ORG_LIQ.TXT_SENIAT
            SET ESTADO = NULL,
                LOTE_SEQ = NULL,
                PLAN_SEQ = NULL
            WHERE INFN_CODIGO = '134' 
              AND FECHA_RECAUDACION = TO_DATE('2024-04-11', 'YYYY-MM-DD')
              AND AGENCIA_CODIGO = '0800'
              AND LOTE_SEQ = 33209 
              AND PLAN_SEQ >= 5265
        """
        cur.execute(sql_txt)
        txt_updated = cur.rowcount
        print(f"  -> Filas reseteadas en TXT_SENIAT: {txt_updated} (esperadas: 254)")
        if txt_updated != 254:
            raise ValueError(f"Discrepancia en TXT_SENIAT: se esperaban 254 y se obtuvieron {txt_updated}")

        # 4. Commit si todo coincide
        print("\nTodos los conteos coinciden al 100%. Aplicando COMMIT...")
        conn.commit()
        print("  -> ¡COMMIT realizado exitosamente!\n")

        # 5. Auditoría post-rollback
        print("=== AUDITORÍA POST-ROLLBACK ===")
        cur.execute("""
            SELECT COUNT(*), MAX(PLAN_SEQ)
            FROM ORG_LIQ.PLANILLA
            WHERE ANHO = 2024 AND LOTE_SEQ = 33209
        """)
        total_p, max_seq = cur.fetchone()
        print(f"Total planillas en ORG_LIQ.PLANILLA para el lote 33209: {total_p} (esperadas: 5264)")
        print(f"Máximo PLAN_SEQ en el lote: {max_seq} (esperado: 5264)")

        cur.execute("""
            SELECT 
                COUNT(CASE WHEN ESTADO = 1 THEN 1 END) as conciliadas,
                COUNT(CASE WHEN ESTADO IS NULL THEN 1 END) as pendientes,
                COUNT(CASE WHEN ESTADO = -1 THEN 1 END) as depuradas
            FROM ORG_LIQ.TXT_SENIAT
            WHERE INFN_CODIGO = '134' 
              AND FECHA_RECAUDACION = TO_DATE('2024-04-11', 'YYYY-MM-DD')
              AND AGENCIA_CODIGO = '0800'
        """)
        c_1, c_null, c_dep = cur.fetchone()
        print(f"TXT_SENIAT -> Conciliadas (1): {c_1}, Pendientes (NULL): {c_null}, Depuradas (-1): {c_dep}")

    except Exception as e:
        print(f"\n[ERROR CRÍTICO] Falló el rollback: {e}")
        print("Ejecutando ROLLBACK de la transacción...")
        conn.rollback()
        sys.exit(1)
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    main()
