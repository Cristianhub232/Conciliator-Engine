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

    cursor.execute("""
        SELECT column_name 
        FROM all_tab_columns 
        WHERE table_name = 'LOTE' AND owner = 'ORG_LIQ'
    """)
    print("Columnas en LOTE:", [r[0] for r in cursor.fetchall()])

    cursor.execute("""
        SELECT ANHO, LOTE_SEQ, LOTE_ID, INFN_CODIGO, TO_CHAR(FECHA_RECAUDACION, 'DD/MM/YYYY')
        FROM ORG_LIQ.LOTE
        WHERE EXPEDIENTE = :1
        AND ROWNUM <= 5
    """, [exp_id])
    print("\nMuestra Lotes Exp 7666:")
    for r in cursor.fetchall():
        print(r)

    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
