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

    query = """
        SELECT P.PLANILLA_ID AS NRO_PLANILLA,
               P.FORMA_CODIGO AS FORMA,
               P.MONTO AS MONTO_TOTAL,
               TO_CHAR(P.FECHA_RECAUDACION, 'DD/MM/YYYY') AS FECHA_RECAUDACION,
               L.EXPEDIENTE,
               L.INFN_CODIGO AS BANCO
        FROM ORG_LIQ.PLANILLA P
        JOIN ORG_LIQ.LOTE L 
          ON P.ANHO = L.ANHO 
         AND P.LOTE_SEQ = L.LOTE_SEQ
        WHERE L.EXPEDIENTE = '7666'
          AND NOT EXISTS (
              SELECT 1 
              FROM ORG_LIQ.DET_PLANILLA DP 
              WHERE DP.ANHO = P.ANHO 
                AND DP.LOTE_SEQ = P.LOTE_SEQ
                AND DP.PLAN_SEQ = P.PLAN_SEQ
          )
        ORDER BY P.MONTO DESC
    """
    
    try:
        cursor.execute(query)
        rows = cursor.fetchall()
        print(f"Éxito. Filas devueltas: {len(rows)}")
    except Exception as e:
        print(f"Error: {e}")

    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
