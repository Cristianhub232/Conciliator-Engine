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

    objects = ['PLANILLA', 'LOTE', 'DET_PLANILLA']
    for obj in objects:
        cursor.execute(f"SELECT object_type, status FROM all_objects WHERE object_name = '{obj}' AND owner = 'ORG_LIQ'")
        rows = cursor.fetchall()
        print(f"{obj}: {rows}")

    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
