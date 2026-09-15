#!/usr/bin/env python3
"""
inspeccionar_expediente.py - Herramienta unificada de inspección de expedientes en Producción SIGECOF.
Consolida y reemplaza:
  - prueba_workflow_7638.py
  - prueba_detalle_expediente.py
  - prueba_lotes_7638.py
  - prueba_lotes_7666.py
  - prueba_lotes_exp.py
  - prueba_query_auditoria.py
  - prueba_query_final.py
  - prueba_listados.py
"""

import sys
import argparse
import conexionprod

def inspeccionar(exp_id: str, anho: int = None, orga: str = None, verbose: bool = False, auditoria: bool = False, txt: bool = False):
    print(f"\n================================================================================")
    print(f"               INSPECCIÓN DE EXPEDIENTE #{exp_id} (SIGECOF PRODUCCIÓN)           ")
    print(f"================================================================================")
    
    conn = conexionprod.conectar_consulta()
    cur = conn.cursor()
    
    try:
        # 1. INFORMACIÓN DE WORKFLOW (WF_WORK_ITEM / WF_USERS)
        print("\n--- [1/4] ESTADO EN WORKFLOW (WFE_WORKFLOW.WF_WORK_ITEM) ---")
        sql_wf = """
            SELECT 
                W.WORKITEM,
                W.WI_ESTADO,
                W.WFUS_USERS_ID,
                NVL(U.USERS_NOMBRE_CORTO || ' ' || U.USERS_NOMBRE_LARGO, 'DESCONOCIDO') AS TRANSCRIPTOR,
                NVL(U.USERS_STATUS, 'N/A') AS ESTADO_USUARIO,
                TO_CHAR(W.WI_FECHA_CREACION, 'YYYY-MM-DD HH24:MI:SS') AS FECHA_CREA,
                TO_CHAR(W.WI_FECHA_CIERRE, 'YYYY-MM-DD HH24:MI:SS') AS FECHA_FIN,
                W.WI_OBSERVACION,
                NVL(U.WFRO_ROLE_ID, 'N/A') AS ROL_USUARIO,
                W.ORGA_ID,
                W.ANHO
            FROM WFE_WORKFLOW.WF_WORK_ITEM W
            LEFT JOIN WFE_WORKFLOW.WF_USERS U ON W.WFUS_USERS_ID = U.USERS_ID
            WHERE W.WFEX_EXP_ID = :exp_id
        """
        params_wf = {"exp_id": int(exp_id)}
        if anho:
            sql_wf += " AND W.ANHO = :anho"
            params_wf["anho"] = anho
        if orga:
            sql_wf += " AND TRIM(LEADING '0' FROM W.ORGA_ID) = TRIM(LEADING '0' FROM :orga)"
            params_wf["orga"] = str(orga)
        sql_wf += " ORDER BY W.ANHO DESC, W.WORKITEM DESC"
        
        cur.execute(sql_wf, params_wf)
        wf_rows = cur.fetchall()
        
        if not wf_rows:
            print(f"  [!] No se encontraron registros de Workflow para el expediente #{exp_id}.")
        else:
            for r in wf_rows:
                workitem, estado, uid, nombre, ustatus, f_asig, f_fin, obs, role, orga, r_anho = r
                print(f"  Año: {r_anho} | Workitem: {workitem} | Órgano: {orga} | Rol: {role}")
                print(f"  Estado: {estado} | Usuario: {uid} ({nombre}) [Status: {ustatus}]")
                print(f"  Asignación: {f_asig} | Finalización: {f_fin or 'En curso'}")
                print(f"  Observación: {obs or 'Sin observación'}")
                print("  " + "-" * 60)

        # 2. LOTES ASOCIADOS (ORG_LIQ.LOTE)
        print("\n--- [2/4] LOTES ASOCIADOS (ORG_LIQ.LOTE) ---")
        sql_lotes = """
            SELECT 
                LOTE_ID,
                LOTE_SEQ,
                ANHO,
                INFN_CODIGO,
                AGENCIA_CODIGO,
                TOTAL_PLN,
                ESTADO,
                TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD') AS FECHA_REC
            FROM ORG_LIQ.LOTE
            WHERE EXPEDIENTE = :exp_id
        """
        params_lotes = {"exp_id": str(exp_id)}
        if anho:
            sql_lotes += " AND ANHO = :anho"
            params_lotes["anho"] = anho
        sql_lotes += " ORDER BY ANHO DESC, LOTE_ID ASC"
        
        cur.execute(sql_lotes, params_lotes)
        lote_rows = cur.fetchall()
        
        lote_seqs = []
        if not lote_rows:
            print(f"  [!] No se encontraron lotes asociados al expediente #{exp_id}.")
        else:
            print(f"  {'LOTE_ID':<8} {'LOTE_SEQ':<10} {'AÑO':<6} {'BANCO':<6} {'AGENCIA':<8} {'TOTAL_PLN':<10} {'ESTADO':<10} {'FECHA_REC'}")
            print("  " + "-" * 75)
            for l in lote_rows:
                lid, lseq, lanho, bco, agc, tpln, lest, frec = l
                lote_seqs.append(lseq)
                print(f"  {str(lid):<8} {str(lseq):<10} {str(lanho):<6} {str(bco):<6} {str(agc):<8} {str(tpln):<10} {str(lest):<10} {str(frec)}")

        # 3. RESUMEN DE PLANILLAS Y RECAUDACIÓN
        print("\n--- [3/4] RESUMEN DE PLANILLAS (PLANILLA / LOTE / TXT_SENIAT) ---")
        if not lote_seqs:
            print("  [!] Sin lotes para consultar detalle de planillas.")
        else:
            total_declarado_lotes = sum(l[5] for l in lote_rows if l[5] is not None)
            anho_filter = f"AND ANHO = {anho}" if anho else ""
            seq_list = ",".join(map(str, lote_seqs))
            
            # Consultar conteo real en PLANILLA
            cur.execute(f"SELECT COUNT(*), NVL(SUM(MONTO_EFECTIVO), 0) FROM ORG_LIQ.PLANILLA WHERE LOTE_SEQ IN ({seq_list}) {anho_filter}")
            cnt_pln, sum_pln = cur.fetchone()
            
            print(f"  • Planillas declaradas en Lotes (ORG_LIQ.LOTE):     {total_declarado_lotes:>6} planillas")
            print(f"  • Planillas registradas (ORG_LIQ.PLANILLA):        {cnt_pln:>6} registros | Monto: {sum_pln:,.2f}")
            
            # Consultar en TXT_SENIAT solo si se solicita --txt
            if txt:
                print("  Consultando TXT_SENIAT (puede demorar unos segundos)...")
                cur.execute(f"SELECT COUNT(*), NVL(SUM(MONTO_EFECTIVO), 0) FROM ORG_LIQ.TXT_SENIAT WHERE LOTE_SEQ IN ({seq_list})")
                cnt_txt, sum_txt = cur.fetchone()
                print(f"  • Archivo bancario (ORG_LIQ.TXT_SENIAT):           {cnt_txt:>6} registros | Monto: {sum_txt:,.2f}")
            else:
                print("  • TXT_SENIAT: (Omitido para respuesta inmediata. Use --txt para escanear)")
            
            if verbose and cnt_pln > 0:
                print("\n  [Detalle de Planillas en ORG_LIQ.PLANILLA]:")
                sql_det_pln = f"""
                    SELECT PLANILLA_ID, FORMA_CODIGO, MONTO_EFECTIVO, TO_CHAR(FECHA_RECAUDACION, 'YYYY-MM-DD')
                    FROM ORG_LIQ.PLANILLA
                    WHERE LOTE_SEQ IN ({seq_list}) {anho_filter}
                    FETCH FIRST 50 ROWS ONLY
                """
                cur.execute(sql_det_pln)
                for pid, fcod, mef, frec in cur.fetchall():
                    print(f"    - Nro: {pid:<12} Forma: {fcod:<6} Monto: {mef:>12,.2f} Fecha: {frec}")
                if cnt_pln > 50:
                    print(f"    ... y {cnt_pln - 50} planillas adicionales (truncado a 50).")

        # 4. AUDITORÍA HISTÓRICA (WFE_WORKFLOW.WF_AUDITA_EXPEDIENTES)
        if auditoria:
            print("\n--- [4/4] HISTORIAL DE AUDITORÍA (WFE_WORKFLOW.WF_AUDITA_EXPEDIENTES) ---")
            try:
                sql_aud = """
                    SELECT 
                        EXPEDIENTE_ID,
                        ORGANISMO_ID,
                        USUARIO_APLICATIVO,
                        USUARIO_ORACLE,
                        TO_CHAR(FECHA_HORA, 'YYYY-MM-DD HH24:MI:SS') AS FECHA
                    FROM WFE_WORKFLOW.WF_AUDITA_EXPEDIENTES
                    WHERE EXPEDIENTE_ID = :exp_id
                    ORDER BY FECHA_HORA DESC
                """
                cur.execute(sql_aud, {"exp_id": str(exp_id)})
                aud_rows = cur.fetchall()
                if not aud_rows:
                    print(f"  (Sin eventos registrados en auditoría para el expediente #{exp_id})")
                else:
                    for a in aud_rows:
                        eid, org, u_app, u_ora, f_aud = a
                        print(f"  Expediente: {eid} | Órgano: {org} | App User: {u_app} | Oracle: {u_ora} | Fecha: {f_aud}")
            except Exception as e:
                print(f"  [!] No se pudo consultar WF_AUDITA_EXPEDIENTES: {e}")
        else:
            print("\n--- [4/4] HISTORIAL DE AUDITORÍA ---")
            print("  (Omitido por rendimiento. Use --auditoria para escanear historial en WF_AUDITA_EXPEDIENTES)")

        print(f"\n================================================================================\n")

    finally:
        cur.close()
        conn.close()

def main():
    parser = argparse.ArgumentParser(description="Inspección integral de Expediente en SIGECOF Producción")
    parser.add_argument("expediente", nargs="?", help="Número de expediente a inspeccionar (ej: 7638)")
    parser.add_argument("--anho", type=int, default=None, help="Año del expediente (ej: 2024)")
    parser.add_argument("--orga", type=str, default=None, help="Código de órgano (ej: 093 o 93)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Mostrar listado detallado de planillas")
    parser.add_argument("--auditoria", "-a", action="store_true", help="Escanear historial en WF_AUDITA_EXPEDIENTES")
    parser.add_argument("--txt", "-t", action="store_true", help="Escanear totales en TXT_SENIAT")
    
    args = parser.parse_args()
    
    exp_id = args.expediente
    if not exp_id:
        exp_id = input("Introduce el número de expediente a inspeccionar (ej: 7638): ").strip()
    
    if not exp_id:
        print("Error: Debe especificar un número de expediente.")
        sys.exit(1)
        
    inspeccionar(exp_id, anho=args.anho, orga=args.orga, verbose=args.verbose, auditoria=args.auditoria, txt=args.txt)

if __name__ == "__main__":
    main()
