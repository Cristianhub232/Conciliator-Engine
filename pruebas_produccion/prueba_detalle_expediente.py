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

    exp_id = '7666'

    print(f"Buscando Lotes para el expediente {exp_id}:")
    cursor.execute("SELECT ANHO, LOTE_SEQ, FECHA_RECAUDACION FROM ORG_LIQ.LOTE WHERE EXPEDIENTE = :1", [exp_id])
    lotes = cursor.fetchall()
    print(lotes)

    if lotes:
        print(f"\nTotal de planillas en ORG_LIQ.PLANILLA para este lote:")
        cursor.execute("""
            SELECT count(*) 
            FROM ORG_LIQ.PLANILLA P
            JOIN ORG_LIQ.LOTE L ON P.ANHO = L.ANHO AND P.LOTE_SEQ = L.LOTE_SEQ
            WHERE L.EXPEDIENTE = :1
        """, [exp_id])
        print(cursor.fetchone()[0])

        print(f"\nTotal de detalles conciliados en ORG_LIQ.DET_PLANILLA para este lote:")
        cursor.execute("""
            SELECT count(*) 
            FROM ORG_LIQ.DET_PLANILLA DP
            JOIN ORG_LIQ.LOTE L ON DP.ANHO = L.ANHO AND DP.LOTE_SEQ = L.LOTE_SEQ
            WHERE L.EXPEDIENTE = :1
        """, [exp_id])
        print(cursor.fetchone()[0])
    
    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
