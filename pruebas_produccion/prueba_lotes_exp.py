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
    
    print("1. Buscando en tabla LOTE:")
    cursor.execute("""
        SELECT LOTE_ID, COUNT(*) 
        FROM ORG_LIQ.LOTE 
        WHERE TRIM(EXPEDIENTE) = :1 
        GROUP BY LOTE_ID
        ORDER BY LOTE_ID
    """, [exp_id])
    print(cursor.fetchall())

    print("\n2. Buscando en tabla PLANILLA:")
    cursor.execute("""
        SELECT LOTE_ID, COUNT(*) 
        FROM ORG_LIQ.PLANILLA 
        WHERE TRIM(EXPEDIENTE) = :1 
        GROUP BY LOTE_ID
        ORDER BY LOTE_ID
    """, [exp_id])
    print(cursor.fetchall())
    
    print("\n3. Buscando en tabla DET_PLANILLA:")
    cursor.execute("""
        SELECT LOTE_ID, COUNT(*) 
        FROM ORG_LIQ.DET_PLANILLA 
        WHERE TRIM(EXPEDIENTE) = :1 
        GROUP BY LOTE_ID
        ORDER BY LOTE_ID
    """, [exp_id])
    print(cursor.fetchall())

    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
