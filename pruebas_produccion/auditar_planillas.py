#!/usr/bin/env python3
"""
auditar_planillas.py - Herramienta integral de rastreo y auditoría de planillas y brechas en Producción SIGECOF.
Consolida y reemplaza:
  - rastreo_planillas.py
  - verificar_brecha_14.py
  - verificar_brecha_exacta.py
  - query_planillas_huerfanas.py
  - test_depuracion_ajuste_lote.py
"""

import sys
import argparse
import conexionprod

def rastrear_planillas(cursor, planillas: list):
    """Busca una o varias planillas en PLANILLA, DET_PLANILLA y TXT_SENIAT."""
    print(f"\n================================================================================")
    print(f"             RASTREO DE PLANILLAS EN BASE DE DATOS ({len(planillas)} solicitadas)       ")
    print(f"================================================================================")
    
    in_clause = ",".join([f"'{p.strip()}'" for p in planillas if p.strip()])
    if not in_clause:
        print("  [!] No se proporcionaron números de planilla válidos.")
        return

    # 1. ORG_LIQ.PLANILLA
    print("\n--- [1/3] REGISTRO MAESTRO (ORG_LIQ.PLANILLA) ---")
    sql_pln = f"""
        SELECT 
            PLANILLA_ID,
            ANHO,
            LOTE_ID,
            LOTE_SEQ,
            EXPEDIENTE,
            FORMA_CODIGO,
            MONTO_EFECTIVO,
            TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_REC,
            WORKITEM
        FROM ORG_LIQ.PLANILLA
        WHERE PLANILLA_ID IN ({in_clause})
        ORDER BY PLANILLA_ID
    """
    cursor.execute(sql_pln)
    rows_pln = cursor.fetchall()
    if not rows_pln:
        print("  [!] Ninguna de las planillas está registrada en ORG_LIQ.PLANILLA.")
    else:
        print(f"  {'PLANILLA_ID':<15} {'AÑO':<6} {'LOTE_ID':<8} {'EXP':<8} {'FORMA':<6} {'MONTO':>14} {'FECHA_REC':<12} {'WORKITEM'}")
        print("  " + "-" * 75)
        for r in rows_pln:
            pid, anho, lid, lseq, exp, fcod, mef, frec, wi = r
            print(f"  {pid:<15} {str(anho):<6} {str(lid):<8} {str(exp):<8} {str(fcod):<6} {mef:>14,.2f} {str(frec):<12} {str(wi)}")
        print(f"  Total encontradas: {len(rows_pln)}")

    # 2. ORG_LIQ.DET_PLANILLA
    print("\n--- [2/3] DETALLE DE CONCEPTOS (ORG_LIQ.DET_PLANILLA) ---")
    if not rows_pln:
        print("  [!] Omitido (no se encontraron planillas maestras en ORG_LIQ.PLANILLA).")
    else:
        lseqs = [str(r[3]) for r in rows_pln if r[3]]
        anhos = [str(r[1]) for r in rows_pln if r[1]]
        lseq_filter = f"AND LOTE_SEQ IN ({','.join(set(lseqs))})" if lseqs else ""
        anho_filter = f"AND ANHO IN ({','.join(set(anhos))})" if anhos else ""
        
        sql_det = f"""
            SELECT 
                PLANILLA_ID,
                DET_PLN_ID,
                PLUC_ID,
                MONTO,
                MONTO_EFECTIVO,
                LOTE_SEQ
            FROM ORG_LIQ.DET_PLANILLA
            WHERE PLANILLA_ID IN ({in_clause}) {lseq_filter} {anho_filter}
            ORDER BY PLANILLA_ID, DET_PLN_ID
        """
        cursor.execute(sql_det)
        rows_det = cursor.fetchall()
        if not rows_det:
            print("  [!] Sin registros de detalle en ORG_LIQ.DET_PLANILLA.")
        else:
            print(f"  {'PLANILLA_ID':<15} {'#':<4} {'PARTIDA/PLUC':<14} {'MONTO':>14} {'MONTO_EFECTIVO':>16} {'LOTE_SEQ'}")
            print("  " + "-" * 75)
            for r in rows_det:
                pid, did, pluc, mto, mef, lseq = r
                print(f"  {pid:<15} {str(did):<4} {str(pluc):<14} {mto:>14,.2f} {mef:>16,.2f} {str(lseq)}")
            print(f"  Total conceptos: {len(rows_det)}")

    # 3. ORG_LIQ.TXT_SENIAT
    print("\n--- [3/3] ARCHIVO BANCARIO (ORG_LIQ.TXT_SENIAT) ---")
    sql_txt = f"""
        SELECT 
            PLANILLA,
            INFN_CODIGO,
            AGENCIA_CODIGO,
            FORMA_CODIGO,
            MONTO_EFECTIVO,
            ESTADO,
            LOTE_SEQ,
            TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_REC
        FROM ORG_LIQ.TXT_SENIAT
        WHERE PLANILLA IN ({in_clause})
        ORDER BY PLANILLA
    """
    cursor.execute(sql_txt)
    rows_txt = cursor.fetchall()
    if not rows_txt:
        print("  [!] Ninguna de las planillas se encuentra en ORG_LIQ.TXT_SENIAT.")
    else:
        print(f"  {'PLANILLA':<15} {'BANCO':<6} {'AGENCIA':<8} {'FORMA':<6} {'MONTO':>14} {'ESTADO':<8} {'LOTE_SEQ':<10} {'FECHA_REC'}")
        print("  " + "-" * 80)
        for r in rows_txt:
            pln, bco, agc, fma, mef, est, lseq, frec = r
            print(f"  {pln:<15} {str(bco):<6} {str(agc):<8} {str(fma):<6} {mef:>14,.2f} {str(est or 'N/A'):<8} {str(lseq or 'N/A'):<10} {str(frec)}")
        print(f"  Total encontradas: {len(rows_txt)}")
    print(f"\n================================================================================\n")

def auditar_brecha_lote(cursor, lote_seq: int, anho: int = 2024):
    """Compara exactamente qué planillas existen en TXT_SENIAT vs PLANILLA para un lote específico."""
    print(f"\n================================================================================")
    print(f"             AUDITORÍA DE BRECHA TXT_SENIAT vs PLANILLA (LOTE_SEQ: {lote_seq})      ")
    print(f"================================================================================")
    
    # Datos del Lote
    cursor.execute("""
        SELECT LOTE_ID, ANHO, TOTAL_PLN, ESTADO, EXPEDIENTE, INFN_CODIGO, AGENCIA_CODIGO,
               TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA
        FROM ORG_LIQ.LOTE
        WHERE LOTE_SEQ = :lseq
    """, {"lseq": lote_seq})
    lote = cursor.fetchone()
    if not lote:
        print(f"  [!] No existe el lote con LOTE_SEQ = {lote_seq}.")
        return
        
    lid, lanho, tpln, lest, exp, bco, agc, frec = lote
    print(f"  Lote ID: {lid} | Secuencia: {lote_seq} | Año: {lanho} | Expediente: {exp}")
    print(f"  Banco: {bco} | Agencia: {agc} | Fecha: {frec} | Estado Lote: {lest} | Declaradas: {tpln}")
    print("  " + "-" * 75)

    # Planillas en PLANILLA
    cursor.execute("""
        SELECT PLANILLA_ID, MONTO_EFECTIVO
        FROM ORG_LIQ.PLANILLA
        WHERE LOTE_SEQ = :lseq AND ANHO = :anho
    """, {"lseq": lote_seq, "anho": lanho})
    planillas_db = {r[0]: r[1] for r in cursor.fetchall()}

    # Planillas en TXT_SENIAT para ese lote
    cursor.execute("""
        SELECT PLANILLA, MONTO_EFECTIVO, ESTADO
        FROM ORG_LIQ.TXT_SENIAT
        WHERE LOTE_SEQ = :lseq
    """, {"lseq": lote_seq})
    planillas_txt = {r[0]: (r[1], r[2]) for r in cursor.fetchall()}

    print(f"\n  • Total en ORG_LIQ.PLANILLA:   {len(planillas_db)} registros")
    print(f"  • Total en ORG_LIQ.TXT_SENIAT: {len(planillas_txt)} registros")
    print(f"  • Declaradas en LOTE:          {tpln} planillas")

    # Identificar discrepancias
    faltan_en_db = set(planillas_txt.keys()) - set(planillas_db.keys())
    faltan_en_txt = set(planillas_db.keys()) - set(planillas_txt.keys())

    if not faltan_en_db and not faltan_en_txt and len(planillas_db) == tpln:
        print("\n  ✔ CONCILIACIÓN PERFECTA: Cero discrepancias entre LOTE, TXT_SENIAT y PLANILLA.")
    else:
        if faltan_en_db:
            print(f"\n  ⚠ Planillas en TXT_SENIAT que NO están en PLANILLA ({len(faltan_en_db)}):")
            for p in sorted(list(faltan_en_db))[:20]:
                mto, est = planillas_txt[p]
                print(f"    - {p} | Monto: {mto:,.2f} | Estado TXT: {est}")
            if len(faltan_en_db) > 20:
                print(f"    ... y {len(faltan_en_db) - 20} más.")
                
        if faltan_en_txt:
            print(f"\n  ⚠ Planillas en PLANILLA que NO están asociadas en TXT_SENIAT ({len(faltan_en_txt)}):")
            for p in sorted(list(faltan_en_txt))[:20]:
                print(f"    - {p} | Monto: {planillas_db[p]:,.2f}")
            if len(faltan_en_txt) > 20:
                print(f"    ... y {len(faltan_en_txt) - 20} más.")

    print(f"\n================================================================================\n")

def consultar_huerfanas(cursor, anho: int = 2024, limit: int = 50):
    """Consulta planillas que no tienen LOTE_SEQ asignado o presentan inconsistencia de lote."""
    print(f"\n--- PLANILLAS HUÉRFANAS / SIN LOTE (AÑO: {anho}) ---")
    sql = """
        SELECT 
            PLANILLA_ID,
            FORMA_CODIGO,
            EXPEDIENTE,
            MONTO_EFECTIVO,
            TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA
        FROM ORG_LIQ.PLANILLA
        WHERE ANHO = :anho AND (LOTE_SEQ IS NULL OR LOTE_SEQ = 0)
        FETCH FIRST :lim ROWS ONLY
    """
    cursor.execute(sql, {"anho": anho, "lim": limit})
    rows = cursor.fetchall()
    if not rows:
        print(f"  ✔ Cero planillas huérfanas encontradas en el año {anho}.")
    else:
        print(f"  Se encontraron registros huérfanos (mostrando hasta {limit}):")
        for r in rows:
            pid, fcod, exp, mef, frec = r
            print(f"    - Planilla: {pid:<12} Forma: {fcod:<6} Exp: {str(exp):<8} Monto: {mef:>12,.2f} Fecha: {frec}")

def main():
    parser = argparse.ArgumentParser(description="Auditoría y Rastreo de Planillas y Brechas (Producción SIGECOF)")
    parser.add_argument("--buscar", "-b", nargs="+", help="Rastrear una o más planillas (ej: --buscar 2600558628 2600534878)")
    parser.add_argument("--brecha", action="store_true", help="Auditar brecha entre TXT_SENIAT y PLANILLA para un lote")
    parser.add_argument("--lote-seq", type=int, help="Secuencia del lote a auditar (ej: 132164 o 33209)")
    parser.add_argument("--huerfanas", action="store_true", help="Listar planillas sin lote asignado")
    parser.add_argument("--anho", type=int, default=2024, help="Año de consulta (default: 2024)")
    
    args = parser.parse_args()
    
    if not any([args.buscar, args.brecha, args.huerfanas]):
        print("\n¿Qué deseas auditar?")
        print("1. Rastrear números de planillas (--buscar)")
        print("2. Auditar brecha TXT_SENIAT vs PLANILLA de un lote (--brecha)")
        print("3. Consultar planillas huérfanas / sin lote (--huerfanas)")
        print("4. Salir")
        op = input("Selecciona una opción (1-4): ").strip()
        
        if op == "1":
            raw = input("Introduce los números de planilla separados por espacio: ").strip()
            args.buscar = raw.split()
        elif op == "2":
            lseq = input("Introduce el LOTE_SEQ a auditar (ej. 132164): ").strip()
            args.brecha = True
            args.lote_seq = int(lseq) if lseq else None
        elif op == "3":
            args.huerfanas = True
        else:
            print("Operación cancelada.")
            return

    conn = conexionprod.conectar_consulta()
    cur = conn.cursor()
    try:
        if args.buscar:
            rastrear_planillas(cur, args.buscar)
        if args.brecha:
            if not args.lote_seq:
                print("Error: Debe especificar --lote-seq para auditar la brecha.")
            else:
                auditar_brecha_lote(cur, args.lote_seq, anho=args.anho)
        if args.huerfanas:
            consultar_huerfanas(cur, anho=args.anho)
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
