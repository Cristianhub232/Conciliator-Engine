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
    
    print("Buscando paquetes relacionados a EXPEDIENTE y PARTIDA/CONCILIACION...")
    query = """
    SELECT DISTINCT owner, object_name, object_type
    FROM all_objects
    WHERE owner IN ('ORG_LIQ', 'WFE_WORKFLOW', 'SIGECOF')
    AND object_type IN ('PACKAGE')
    AND (object_name LIKE '%EXPEDIENTE%' 
         OR object_name LIKE '%CONCILIA%' 
         OR object_name LIKE '%TRANSCRIPT%')
    """
    cursor.execute(query)
    for r in cursor.fetchall():
        print(f"Paquete encontrado: {r[0]}.{r[1]}")

    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
