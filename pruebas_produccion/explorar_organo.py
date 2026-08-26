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

    print("ORGA_ID de KARENGUEVARA:")
    cursor.execute("SELECT ORGA_ID FROM WFE_WORKFLOW.WF_USERS WHERE USERS_ID = 'KARENGUEVARA'")
    for row in cursor.fetchall():
        print(f"  - {row[0]}")

    print("\n¿Existen usuarios con ORGA_ID = '093'?")
    cursor.execute("SELECT COUNT(*) FROM WFE_WORKFLOW.WF_USERS WHERE ORGA_ID = '093'")
    for row in cursor.fetchall():
        print(f"  - {row[0]}")

    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
