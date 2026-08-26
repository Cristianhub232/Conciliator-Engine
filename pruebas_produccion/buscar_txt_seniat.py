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
    
    print("Buscando 'TXT_SENIAT' en todos los paquetes...")
    query = """
    SELECT owner, name, type, line, text
    FROM all_source
    WHERE owner IN ('ORG_LIQ', 'WFE_WORKFLOW', 'SIGECOF')
    AND UPPER(text) LIKE '%TXT_SENIAT%'
    """
    cursor.execute(query)
    for r in cursor.fetchall():
        print(f"[{r[0]}.{r[1]}] (L{r[3]}): {r[4].strip()}")

    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
