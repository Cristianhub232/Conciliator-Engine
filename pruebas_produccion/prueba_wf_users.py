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

    cursor.execute("""
        SELECT column_name 
        FROM all_tab_columns 
        WHERE table_name = 'WF_USERS' AND owner = 'WFE_WORKFLOW'
    """)
    print("Columnas en WF_USERS:", [r[0] for r in cursor.fetchall()])

    cursor.execute("""
        SELECT *
        FROM WFE_WORKFLOW.WF_USERS
        WHERE ROWNUM = 1
    """)
    print("Ejemplo de datos:", cursor.fetchone())

    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
