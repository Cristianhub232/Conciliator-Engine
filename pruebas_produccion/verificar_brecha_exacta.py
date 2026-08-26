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
    
    # 1. Traemos todas las planillas de TXT_SENIAT para esa fecha/banco/agencia
    query_txt = """
        SELECT PLANILLA, ESTADO
        FROM ORG_LIQ.TXT_SENIAT
        WHERE FECHA_RECAUDACION = TO_DATE('22/04/2024', 'DD/MM/YYYY')
          AND INFN_CODIGO = '105'
          AND AGENCIA_CODIGO = '0800'
    """
    cursor.execute(query_txt)
    txt_seniat = cursor.fetchall()
    print(f"Total filas en TXT_SENIAT: {len(txt_seniat)}")
    
    # 2. Traemos todas las planillas de PLANILLA para ese Lote 42
    query_planilla = """
        SELECT P.PLANILLA_ID
        FROM ORG_LIQ.PLANILLA P
        JOIN ORG_LIQ.LOTE L ON P.ANHO = L.ANHO AND P.LOTE_SEQ = L.LOTE_SEQ
        WHERE L.ANHO = 2024 AND TRIM(L.EXPEDIENTE) = '7638' AND P.LOTE_ID = 42
    """
    cursor.execute(query_planilla)
    planilla_bd = cursor.fetchall()
    print(f"Total filas en PLANILLA (Conciliadas en BD): {len(planilla_bd)}")
    
    # Conjuntos para comparación rápida (evitando espacios en blanco molestos)
    set_planilla_bd = set([str(p[0]).strip() for p in planilla_bd if p[0]])
    
    # Filtrando las que faltan
    faltantes = []
    faltantes_distintas = set()
    estados = {}
    
    for row in txt_seniat:
        plan_txt = str(row[0]).strip()
        estado = row[1]
        
        if plan_txt not in set_planilla_bd:
            faltantes.append(plan_txt)
            faltantes_distintas.add(plan_txt)
            estados[estado] = estados.get(estado, 0) + 1
            
    print(f"\nFaltantes reales (Filas en TXT no presentes en PLANILLA): {len(faltantes)}")
    print(f"¿Cuántos Números de Planilla distintos faltan?: {len(faltantes_distintas)}")
    print(f"Desglose de los {len(faltantes)} faltantes por ESTADO en TXT_SENIAT: {estados}")

    conexion.close()

if __name__ == "__main__":
    main()
