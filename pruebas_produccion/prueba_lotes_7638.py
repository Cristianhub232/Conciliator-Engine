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
    lote_id = 42

    query = """
    SELECT count(*)
    FROM ORG_LIQ.TXT_SENIAT T
    WHERE EXISTS (
        SELECT 1 
        FROM ORG_LIQ.PLANILLA P
        JOIN ORG_LIQ.LOTE L ON P.ANHO = L.ANHO AND P.LOTE_SEQ = L.LOTE_SEQ
        WHERE L.EXPEDIENTE = :1
          AND P.LOTE_ID = :2
          AND L.FECHA_RECAUDACION = T.FECHA_RECAUDACION
          AND L.INFN_CODIGO = T.INFN_CODIGO
          AND L.AGENCIA_CODIGO = T.AGENCIA_CODIGO
    )
    AND NOT EXISTS (
        SELECT 1 
        FROM ORG_LIQ.PLANILLA P2
        JOIN ORG_LIQ.LOTE L2 ON P2.ANHO = L2.ANHO AND P2.LOTE_SEQ = L2.LOTE_SEQ
        WHERE L2.FECHA_RECAUDACION = T.FECHA_RECAUDACION
          AND L2.INFN_CODIGO = T.INFN_CODIGO
          AND L2.AGENCIA_CODIGO = T.AGENCIA_CODIGO
          AND P2.PLANILLA_ID = T.PLANILLA
    )
    """
    cursor.execute(query, [exp_id, lote_id])
    print(f"Brecha faltante (Lote 42): {cursor.fetchone()[0]}")

    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
