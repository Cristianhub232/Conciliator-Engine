import oracledb

DB_USER = "consulta"
DB_PASSWORD = "pumyra1584"
DB_HOST = "10.79.6.247"
DB_PORT = "1521"
DB_SID = "sige1"
SCHEMA = "ORG_LIQ"

def main():
    dsn = oracledb.makedsn(DB_HOST, DB_PORT, sid=DB_SID)
    conexion = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=dsn)
    
    query = """
    SELECT 
        TO_CHAR(p.FECHA_RECAUDACION, 'DD/MM/YYYY') AS FECHA,
        p.INFN_CODIGO AS BANCO,
        p.PLANILLA_ID AS NUM_PLANILLA,
        p.FORMA_CODIGO,
        p.MONTO AS TOTAL,
        d.PLUC_ID AS CONCEPTO,
        d.MONTO AS DETALLE,
        NVL(TO_CHAR(p.EXPEDIENTE), 'SIN EXPEDIENTE') AS EXPEDIENTE
    FROM 
        ORG_LIQ.PLANILLA p
    LEFT JOIN 
        ORG_LIQ.DET_PLANILLA d 
        ON p.ANHO = d.ANHO 
        AND p.LOTE_ID = d.LOTE_ID 
        AND p.PLANILLA_ID = d.PLANILLA_ID
    WHERE 
        TRUNC(p.FECHA_RECAUDACION) = TO_DATE('04/04/2026', 'DD/MM/YYYY') 
        AND p.INFN_CODIGO = '151' 
        AND (p.EXPEDIENTE IS NULL OR p.EXPEDIENTE = 0)
    ORDER BY 
        p.PLANILLA_ID, d.DET_PLN_ID
    """
    
    print("Ejecutando consulta de planillas sin conciliar (Banco 151, Fecha 04/04/2026)...")
    cursor = conexion.cursor()
    cursor.execute(query)
    resultados = cursor.fetchall()
    
    if not resultados:
        print("\nNo se encontraron planillas huérfanas para estos criterios.")
    else:
        print(f"\nSe encontraron {len(resultados)} registros de detalles huérfanos.")
        print("Mostrando los primeros 20 resultados:\n")
        
        # Imprimir cabeceras
        headers = [desc[0] for desc in cursor.description]
        print(" | ".join(headers))
        print("-" * 100)
        
        # Imprimir datos
        for fila in resultados[:20]:
            print(" | ".join(str(val) for val in fila))
            
    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
