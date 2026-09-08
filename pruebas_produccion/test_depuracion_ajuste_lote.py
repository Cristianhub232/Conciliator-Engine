import conexionprod

def main():
    print("=== VERIFICACIÓN ESTADO LOTE 71 (EXPEDIENTE 1860) ===")
    conn = conexionprod.conectar_consulta()
    cur = conn.cursor()
    
    cur.execute("""
        SELECT LOTE_ID, LOTE_SEQ, ANHO, TOTAL_PLN, ESTADO, EXPEDIENTE, INFN_CODIGO, AGENCIA_CODIGO,
               TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA
        FROM ORG_LIQ.LOTE
        WHERE LOTE_SEQ = 33209 AND ANHO = 2024
    """)
    lote71 = cur.fetchone()
    print(f"Lote 71: {lote71}")
    assert lote71[3] == 5500, f"Error: TOTAL_PLN debería ser 5500 pero es {lote71[3]}"
    print("✅ Lote 71 tiene TOTAL_PLN = 5500 (3 unidades descontadas por la depuración previa de formas 79984).")
    
    print("\n=== VERIFICACIÓN ESCANEO DE LOTE 80 (EXPEDIENTE 1873 - 2024-04-17 BANCO 134) ===")
    cur.execute("""
        SELECT 
            T.PLANILLA AS PLANILLA_ID,
            T.FORMA_CODIGO AS FORMA,
            NVL(T.MONTO_EFECTIVO, 0) AS MONTO,
            T.INFN_CODIGO AS BANCO,
            T.AGENCIA_CODIGO AS AGENCIA,
            TO_CHAR(T.FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_RECAUDACION,
            T.IDENT_CNTB AS RIF,
            L.EXPEDIENTE,
            L.LOTE_ID,
            L.LOTE_SEQ,
            L.TOTAL_PLN
        FROM ORG_LIQ.TXT_SENIAT T
        LEFT JOIN ORG_LIQ.LOTE L 
            ON L.FECHA_RECAUDACION = T.FECHA_RECAUDACION 
           AND L.INFN_CODIGO = T.INFN_CODIGO 
           AND L.AGENCIA_CODIGO = T.AGENCIA_CODIGO
           AND L.ANHO = EXTRACT(YEAR FROM T.FECHA_RECAUDACION)
           AND (L.ESTADO = 'P' OR NOT EXISTS (
               SELECT 1 FROM ORG_LIQ.LOTE L_ACT 
               WHERE L_ACT.FECHA_RECAUDACION = T.FECHA_RECAUDACION 
                 AND L_ACT.INFN_CODIGO = T.INFN_CODIGO 
                 AND L_ACT.AGENCIA_CODIGO = T.AGENCIA_CODIGO 
                 AND L_ACT.ESTADO = 'P'
           ))
        WHERE T.FECHA_RECAUDACION = TO_DATE('2024-04-17', 'YYYY-MM-DD')
          AND T.INFN_CODIGO = '134'
          AND (T.ESTADO IS NULL OR T.ESTADO = 0)
          AND T.FORMA_CODIGO = '79984'
          AND L.EXPEDIENTE = 1873
    """)
    rows = cur.fetchall()
    print(f"Total planillas detectadas vinculadas a lote: {len(rows)}")
    for r in rows:
        print(f"  Planilla {r[0]} | Forma {r[1]} | Lote {r[8]} (Seq {r[9]}, Exp {r[7]}) | Total actual: {r[10]}")
    
    assert len(rows) == 10, f"Se esperaban 10 planillas, pero se encontraron {len(rows)}"
    for r in rows:
        assert r[8] == 80, f"Lote esperado 80, obtenido {r[8]}"
        assert r[9] == 33726, f"Lote_seq esperado 33726, obtenido {r[9]}"
        assert r[7] == 1873, f"Expediente esperado 1873, obtenido {r[7]}"
    
    print("✅ Todas las 10 planillas corresponden al Lote 80 (LOTE_SEQ=33726, EXPEDIENTE=1873, TOTAL_PLN=8375).")
    print("✅ Al depurarlas con el nuevo servicio, Lote 80 se ajustará de 8375 a 8365.")
    
    conn.close()

if __name__ == '__main__':
    main()
