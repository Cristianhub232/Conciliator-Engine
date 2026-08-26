import oracledb

DB_USER = "consulta"
DB_PASSWORD = "pumyra1584"
DB_HOST = "10.79.6.247"
DB_PORT = "1521"
DB_SID = "sige1"
SCHEMA = "WFE_WORKFLOW"

def main():
    print("Conectando para extraer código de PK_WFE_USUARIO...")
    dsn = oracledb.makedsn(DB_HOST, DB_PORT, sid=DB_SID)
    conexion = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=dsn)
    cursor = conexion.cursor()
    
    cursor.execute(f"SELECT text FROM all_source WHERE owner = '{SCHEMA}' AND name = 'PK_WFE_USUARIO' AND type = 'PACKAGE' ORDER BY line")
    lineas = cursor.fetchall()
    
    with open("codigo_seguridad.md", "w") as f:
        f.write("# PK_WFE_USUARIO (PACKAGE SPECIFICATION)\n```sql\n")
        for (linea,) in lineas:
            f.write(linea)
        f.write("```\n")
            
    print("Extracción completada.")
    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
