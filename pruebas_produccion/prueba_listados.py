import oracledb

DB_USER = "consulta"
DB_PASSWORD = "pumyra1584"
DB_HOST = "10.79.6.247"
DB_PORT = "1521"
DB_SID = "sige1"

def main():
    dsn = oracledb.makedsn(DB_HOST, DB_PORT, sid=DB_SID)
    conexion = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=dsn)
    cursor = conexion.cursor()

    exp_id = '7638'
    anho = 2024
    lote_id = 42

    print("Verificando Query 1 (CONCILIADAS):")
    query_conciliadas = """
    SELECT COUNT(*)
    FROM ORG_LIQ.PLANILLA P
    JOIN ORG_LIQ.LOTE L ON P.ANHO = L.ANHO AND P.LOTE_SEQ = L.LOTE_SEQ
    WHERE TRIM(L.EXPEDIENTE) = :1 AND L.ANHO = :2 AND P.LOTE_ID = :3
    """
    cursor.execute(query_conciliadas, [exp_id, anho, lote_id])
    print(f"Total Conciliadas encontradas: {cursor.fetchone()[0]}")

    print("\nVerificando Query 2 (FALTANTES/PENDIENTES):")
    query_faltantes = """
    SELECT COUNT(*)
    FROM ORG_LIQ.TXT_SENIAT T
    WHERE EXISTS (
        SELECT 1 
        FROM ORG_LIQ.PLANILLA P
        JOIN ORG_LIQ.LOTE L ON P.ANHO = L.ANHO AND P.LOTE_SEQ = L.LOTE_SEQ
        WHERE TRIM(L.EXPEDIENTE) = :1 AND L.ANHO = :2 AND P.LOTE_ID = :3
          AND L.FECHA_RECAUDACION = T.FECHA_RECAUDACION
          AND L.INFN_CODIGO = T.INFN_CODIGO
          AND L.AGENCIA_CODIGO = T.AGENCIA_CODIGO
    )
    AND NOT EXISTS (
        SELECT 1 
        FROM ORG_LIQ.PLANILLA P2
        JOIN ORG_LIQ.LOTE L2 ON P2.ANHO = L2.ANHO AND P2.LOTE_SEQ = L2.LOTE_SEQ
        WHERE TRIM(L2.EXPEDIENTE) = :1 AND L2.ANHO = :2 AND P2.LOTE_ID = :3
          AND P2.PLANILLA_ID = T.PLANILLA
    )
    AND T.ESTADO IS NULL 
    """
    cursor.execute(query_faltantes, [exp_id, anho, lote_id])
    print(f"Total Faltantes encontradas: {cursor.fetchone()[0]}")

    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
