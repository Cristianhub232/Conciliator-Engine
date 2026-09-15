import oracledb
import xlrd

DB_USER = "consulta"
DB_PASSWORD = "pumyra1584"
DB_HOST = "10.79.6.247"
DB_PORT = "1521"
DB_SID = "sige1"
SCHEMA = "ORG_LIQ"

def main():
    print("1. Leyendo datos del Excel...")
    excel_path = '/home/estacion/Escritorio/contexto y procesos ONT/planillasSinConciliar_13082026091006.xls'
    wb = xlrd.open_workbook(excel_path)
    sheet = wb.sheet_by_index(0)
    
    excel_planillas = set()
    for row_idx in range(1, sheet.nrows):
        row = sheet.row_values(row_idx)
        # La columna PLANILLA es la índice 1
        planilla_id = str(row[1]).split('.')[0] # Por si viene como float
        excel_planillas.add(planilla_id)
        
    print(f"   -> Encontradas {len(excel_planillas)} planillas únicas en el Excel.")
    
    print("\n2. Ejecutando consulta en la Base de Datos (Oracle)...")
    dsn = oracledb.makedsn(DB_HOST, DB_PORT, sid=DB_SID)
    conexion = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=dsn)
    cursor = conexion.cursor()
    
    query = """
    SELECT p.PLANILLA_ID
    FROM ORG_LIQ.PLANILLA p
    WHERE TRUNC(p.FECHA_RECAUDACION) = TO_DATE('04/04/2026', 'DD/MM/YYYY') 
    AND p.INFN_CODIGO = '151'
    """
    cursor.execute(query)
    db_planillas = set(row[0] for row in cursor.fetchall())
    
    print(f"   -> Encontradas {len(db_planillas)} planillas en la BD para el banco 151 y 04/04/2026.")
    
    print("\n3. Conciliación:")
    if excel_planillas == db_planillas:
        print("   ✅ ¡ÉXITO! Las planillas del Excel coinciden EXACTAMENTE con el resultado de la Base de Datos.")
    else:
        print("   ❌ Hay diferencias:")
        en_excel_no_en_bd = excel_planillas - db_planillas
        en_bd_no_en_excel = db_planillas - excel_planillas
        
        print(f"   - Planillas en el Excel pero no en la BD: {len(en_excel_no_en_bd)}")
        if en_excel_no_en_bd: print(f"     Ejemplos: {list(en_excel_no_en_bd)[:5]}")
            
        print(f"   - Planillas en la BD pero no en el Excel: {len(en_bd_no_en_excel)}")
        if en_bd_no_en_excel: print(f"     Ejemplos: {list(en_bd_no_en_excel)[:5]}")

    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
