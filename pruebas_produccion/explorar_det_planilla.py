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

    print("Columnas en ORG_LIQ.DET_PLANILLA:")
    cursor.execute("""
        SELECT column_name 
        FROM all_tab_columns 
        WHERE table_name = 'DET_PLANILLA' AND owner = 'ORG_LIQ'
    """)
    for row in cursor.fetchall():
        print(f"  - {row[0]}")

    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
