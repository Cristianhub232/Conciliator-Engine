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
    cursor = conexion.cursor()
    
    planillas = ['2600558628', '2600534878', '2600436026', '2600554338', '2600554214']
    in_clause = "','".join(planillas)
    
    print(f"Rastreando las 5 planillas del Excel en toda la base de datos...\n")
    
    # 1. Buscar en PLANILLA (con ANHO=2026 para que sea rápido)
    print("--- 1. Búsqueda en ORG_LIQ.PLANILLA ---")
    query_planilla = f"""
    SELECT PLANILLA_ID, TO_CHAR(FECHA_RECAUDACION, 'DD/MM/YYYY HH24:MI:SS'), INFN_CODIGO, EXPEDIENTE, LOTE_ID, ANHO, MONTO_EFECTIVO, WORKITEM
    FROM ORG_LIQ.PLANILLA 
    WHERE ANHO = 2026 AND PLANILLA_ID IN ('{in_clause}')
    """
    cursor.execute(query_planilla)
    resultados = cursor.fetchall()
    
    if resultados:
        for r in resultados:
            print(f"  ✓ PLANILLA_ID: {r[0]} | FECHA: {r[1]} | BANCO: {r[2]} | EXPEDIENTE: {r[3]} | WORKITEM: {r[7]} | MONTO: {r[6]}")
    else:
        print("  ✗ No se encontró NINGUNA de estas planillas en la tabla maestra PLANILLA para el año 2026.")
        
    # 1.b Buscar en PLANILLA (con ANHO=2024 por si acaso la fecha de recaudacion 2026 fue un error de Excel)
    print("\n--- 1.b Búsqueda en ORG_LIQ.PLANILLA (Año 2024) ---")
    query_planilla_2024 = f"""
    SELECT PLANILLA_ID, TO_CHAR(FECHA_RECAUDACION, 'DD/MM/YYYY HH24:MI:SS'), INFN_CODIGO, EXPEDIENTE, LOTE_ID, ANHO, MONTO_EFECTIVO, WORKITEM
    FROM ORG_LIQ.PLANILLA 
    WHERE ANHO = 2024 AND PLANILLA_ID IN ('{in_clause}')
    """
    cursor.execute(query_planilla_2024)
    resultados_2024 = cursor.fetchall()
    if resultados_2024:
        for r in resultados_2024:
            print(f"  ✓ PLANILLA_ID: {r[0]} | FECHA: {r[1]} | BANCO: {r[2]} | EXPEDIENTE: {r[3]} | WORKITEM: {r[7]} | MONTO: {r[6]}")
    else:
        print("  ✗ No están en 2024.")
    
    # 2. Buscar en DET_PLANILLA (a veces el detalle entra pero el maestro no)
    print("\n--- 2. Búsqueda en ORG_LIQ.DET_PLANILLA ---")
    query_det = f"""
    SELECT PLANILLA_ID, DET_PLN_ID, PLUC_ID, MONTO
    FROM ORG_LIQ.DET_PLANILLA
    WHERE ANHO IN (2024, 2026) AND PLANILLA_ID IN ('{in_clause}')
    """
    cursor.execute(query_det)
    resultados_det = cursor.fetchall()
    if resultados_det:
        for r in resultados_det:
            print(f"  ✓ DETALLE -> PLANILLA: {r[0]} | LINEA: {r[1]} | CONCEPTO: {r[2]} | MONTO: {r[3]}")
    else:
        print("  ✗ No están en DET_PLANILLA.")
        
    # 3. Buscar en CONF_PLANILLAS_AUT
    print("\n--- 3. Búsqueda en ORG_LIQ.CONF_PLANILLAS_AUT ---")
    try:
        query_conf = f"SELECT * FROM ORG_LIQ.CONF_PLANILLAS_AUT WHERE PLANILLA_ID IN ('{in_clause}')"
        cursor.execute(query_conf)
        cols = [col[0] for col in cursor.description]
        print(f"  Columnas: {cols}")
        for r in cursor.fetchall():
            print(f"  ✓ {r}")
    except Exception as e:
        print("  ✗ Error consultando CONF_PLANILLAS_AUT o no se encontraron.")
        
    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
