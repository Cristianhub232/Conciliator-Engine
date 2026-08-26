import oracledb

DB_USER = "consulta"
DB_PASSWORD = "pumyra1584"
DB_HOST = "10.79.6.247"
DB_PORT = "1521"
DB_SID = "sige1"

def extract_package(cursor, owner, name):
    cursor.execute(f"SELECT text FROM all_source WHERE owner = '{owner}' AND name = '{name}' ORDER BY type, line")
    source = cursor.fetchall()
    if source:
        with open(f"/home/estacion/Escritorio/contexto y procesos ONT/pruebas_produccion/{name}.sql", "w") as f:
            for line in source:
                f.write(line[0])
        print(f"Extraído: {name}.sql")
    else:
        print(f"No se encontró código para: {name}")

def main():
    dsn = oracledb.makedsn(DB_HOST, DB_PORT, sid=DB_SID)
    conexion = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=dsn)
    cursor = conexion.cursor()
    extract_package(cursor, 'WFE_WORKFLOW', 'CG$WF_EXPEDIENTE')
    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
