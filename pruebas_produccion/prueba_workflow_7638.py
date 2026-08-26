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

    cursor.execute("""
        SELECT DISTINCT WI_ESTADO 
        FROM WFE_WORKFLOW.WF_WORK_ITEM
    """)
    print("Estados posibles en WF_WORK_ITEM:", [r[0] for r in cursor.fetchall()])

    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
