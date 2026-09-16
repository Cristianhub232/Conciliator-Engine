#!/usr/bin/env python3
"""
Auditoría Exhaustiva de Anomalías, Conflictos y Planillas Problemáticas - Abril 2024
Ambiente: Producción SIGECOF (sige1)
"""
import sys
import os

# Asegurar import de conexionprod
sys.path.append("/home/estacion/Escritorio/contexto y procesos ONT/pruebas_produccion")
import conexionprod

def ejecutar_auditoria():
    print("================================================================================")
    print("      AUDITORÍA DE CONFLICTOS Y PLANILLAS PROBLEMÁTICAS - ABRIL 2024           ")
    print("================================================================================")
    
    conn = conexionprod.conectar("consulta")
    cur = conn.cursor()
    
    # -------------------------------------------------------------------------
    # 0. UNIVERSO DE EXPEDIENTES Y LOTES EN ABRIL 2024
    # -------------------------------------------------------------------------
    print("\n--- [0] UNIVERSO DE LOTES Y EXPEDIENTES (ABRIL 2024) ---")
    cur.execute("""
        SELECT 
            COUNT(DISTINCT L.EXPEDIENTE) as total_expedientes,
            COUNT(*) as total_lotes,
            SUM(CASE WHEN L.ESTADO = 'P' THEN 1 ELSE 0 END) as lotes_p,
            SUM(CASE WHEN L.ESTADO = 'V' THEN 1 ELSE 0 END) as lotes_v,
            NVL(SUM(L.TOTAL_PLN), 0) as total_planillas_declaradas
        FROM ORG_LIQ.LOTE L
        WHERE L.ANHO = 2024 
          AND L.FECHA_RECAUDACION BETWEEN DATE '2024-04-01' AND DATE '2024-04-30'
    """)
    univ = cur.fetchone()
    print(f"  • Total Expedientes en Lotes: {univ[0]}")
    print(f"  • Total Lotes: {univ[1]}")
    print(f"  • Lotes Pendientes ('P'): {univ[2]}")
    print(f"  • Lotes Validados/Cerrados ('V'): {univ[3]}")
    print(f"  • Total Planillas Declaradas (TOTAL_PLN): {univ[4]:,}")

    # -------------------------------------------------------------------------
    # 1. EXPEDIENTES Y WORKITEMS SIN USUARIO ASIGNADO O HUÉRFANOS DE WORKFLOW
    # -------------------------------------------------------------------------
    print("\n--- [1] EXPEDIENTES / WORKITEMS SIN USUARIO ASIGNADO O HUÉRFANOS (ABRIL 2024) ---")
    
    # 1.1 Expedientes en Lote de Abril 2024 que NO tienen ningún WorkItem en WF_WORK_ITEM
    cur.execute("""
        SELECT DISTINCT L.EXPEDIENTE, COUNT(L.LOTE_SEQ) as cant_lotes, SUM(L.TOTAL_PLN) as pln
        FROM ORG_LIQ.LOTE L
        WHERE L.ANHO = 2024 
          AND L.FECHA_RECAUDACION BETWEEN DATE '2024-04-01' AND DATE '2024-04-30'
          AND NOT EXISTS (
              SELECT 1 FROM WFE_WORKFLOW.WF_WORK_ITEM W 
              WHERE W.WFEX_EXP_ID = L.EXPEDIENTE AND W.ANHO = L.ANHO
          )
        GROUP BY L.EXPEDIENTE
        ORDER BY L.EXPEDIENTE
    """)
    huerfanos_wf = cur.fetchall()
    print(f"  • Expedientes de Abril 2024 SIN REGISTRO EN WF_WORK_ITEM: {len(huerfanos_wf)}")
    for h in huerfanos_wf[:10]:
        print(f"    - Exp #{h[0]}: {h[1]} lotes, {h[2]} planillas declaradas")
    if len(huerfanos_wf) > 10:
        print(f"    ... y {len(huerfanos_wf) - 10} más.")

    # 1.2 WorkItems de Abril 2024 donde WFUS_USERS_ID es NULL o vacío
    cur.execute("""
        SELECT W.WFEX_EXP_ID, W.WORKITEM, W.WI_ESTADO, W.WFTA_TAREA_ID, W.ORGA_ID,
               TO_CHAR(W.WI_FECHA_CREACION, 'YYYY-MM-DD') as f_crea
        FROM WFE_WORKFLOW.WF_WORK_ITEM W
        WHERE W.ANHO = 2024
          AND (W.WFUS_USERS_ID IS NULL OR TRIM(W.WFUS_USERS_ID) IS NULL)
          AND EXISTS (
              SELECT 1 FROM ORG_LIQ.LOTE L 
              WHERE L.EXPEDIENTE = W.WFEX_EXP_ID AND L.ANHO = W.ANHO
                AND L.FECHA_RECAUDACION BETWEEN DATE '2024-04-01' AND DATE '2024-04-30'
          )
        ORDER BY W.WFEX_EXP_ID, W.WORKITEM
    """)
    wi_sin_user = cur.fetchall()
    print(f"  • WorkItems con WFUS_USERS_ID NULL o vacío en Abril 2024: {len(wi_sin_user)}")
    for w in wi_sin_user[:10]:
        print(f"    - Exp #{w[0]} | WI {w[1]} | Estado: {w[2]} | Tarea: {w[3]} | Creado: {w[5]}")

    # -------------------------------------------------------------------------
    # 2. DOBLES ASIGNACIONES / MÚLTIPLES WORKITEMS ABIERTOS SIMULTÁNEOS
    # -------------------------------------------------------------------------
    print("\n--- [2] DOBLES ASIGNACIONES / MÚLTIPLES WORKITEMS ABIERTOS SIMULTÁNEOS ---")
    cur.execute("""
        SELECT 
            W.WFEX_EXP_ID, 
            COUNT(W.WORKITEM) as cant_abiertas,
            LISTAGG(W.WORKITEM, ', ') WITHIN GROUP (ORDER BY W.WORKITEM) as workitems,
            LISTAGG(NVL(W.WFUS_USERS_ID, 'SIN_USER'), ', ') WITHIN GROUP (ORDER BY W.WORKITEM) as usuarios,
            LISTAGG(W.WFTA_TAREA_ID, ', ') WITHIN GROUP (ORDER BY W.WORKITEM) as tareas
        FROM WFE_WORKFLOW.WF_WORK_ITEM W
        WHERE W.ANHO = 2024
          AND UPPER(W.WI_ESTADO) = 'ABIERTA'
          AND EXISTS (
              SELECT 1 FROM ORG_LIQ.LOTE L 
              WHERE L.EXPEDIENTE = W.WFEX_EXP_ID AND L.ANHO = W.ANHO
                AND L.FECHA_RECAUDACION BETWEEN DATE '2024-04-01' AND DATE '2024-04-30'
          )
        GROUP BY W.WFEX_EXP_ID
        HAVING COUNT(W.WORKITEM) > 1
        ORDER BY W.WFEX_EXP_ID
    """)
    dobles_wi = cur.fetchall()
    print(f"  • Expedientes de Abril 2024 con 2 o más WorkItems ABIERTOS a la vez: {len(dobles_wi)}")
    for d in dobles_wi:
        print(f"    - Exp #{d[0]}: {d[1]} WIs abiertos! WorkItems: [{d[2]}] | Usuarios: [{d[3]}] | Tareas: [{d[4]}]")

    # -------------------------------------------------------------------------
    # 3. EXPEDIENTES O LOTES SIN CERRAR A PESAR DE NO TENER PENDIENTES
    # -------------------------------------------------------------------------
    print("\n--- [3] LOTES / EXPEDIENTES SIN CERRAR SIN PLANILLAS PENDIENTES ---")
    
    # 3.1 Lotes en estado 'P' donde ya se conciliaron todas las planillas (o TXT_SENIAT pendientes = 0)
    cur.execute("""
        SELECT 
            L.EXPEDIENTE, L.LOTE_ID, L.LOTE_SEQ, L.TOTAL_PLN, L.INFN_CODIGO,
            TO_CHAR(L.FECHA_RECAUDACION, 'YYYY-MM-DD') as f_rec,
            (SELECT COUNT(*) FROM ORG_LIQ.PLANILLA P WHERE P.LOTE_SEQ = L.LOTE_SEQ AND P.ANHO = L.ANHO) as pln_conciliadas,
            (SELECT COUNT(*) FROM ORG_LIQ.TXT_SENIAT T WHERE T.LOTE_SEQ = L.LOTE_SEQ AND (T.ESTADO IS NULL OR T.ESTADO = 0)) as txt_pendientes
        FROM ORG_LIQ.LOTE L
        WHERE L.ANHO = 2024
          AND L.FECHA_RECAUDACION BETWEEN DATE '2024-04-01' AND DATE '2024-04-30'
          AND L.ESTADO = 'P'
        ORDER BY L.EXPEDIENTE, L.LOTE_ID
    """)
    lotes_p_analisis = cur.fetchall()
    lotes_listos_para_cerrar = []
    lotes_sin_datos = []
    lotes_con_pendientes_reales = []

    for lp in lotes_p_analisis:
        exp, lid, lseq, tpln, bco, frec, conc, pend = lp
        if pend == 0 and conc >= tpln and tpln > 0:
            lotes_listos_para_cerrar.append(lp)
        elif tpln == 0 and conc == 0 and pend == 0:
            lotes_sin_datos.append(lp)
        else:
            lotes_con_pendientes_reales.append(lp)

    print(f"  • Total Lotes en estado 'P' en Abril 2024: {len(lotes_p_analisis)}")
    print(f"    - Lotes 100% conciliados que DEBERÍAN ESTAR EN 'V' (Listos para cerrar): {len(lotes_listos_para_cerrar)}")
    for ll in lotes_listos_para_cerrar[:10]:
        print(f"      * Exp #{ll[0]} | Lote {ll[1]} (Seq {ll[2]}) | Banco {ll[4]} | Fecha: {ll[5]} | Total: {ll[3]} | Conciliadas: {ll[6]} | Pendientes TXT: {ll[7]}")
    if len(lotes_listos_para_cerrar) > 10:
        print(f"      ... y {len(lotes_listos_para_cerrar) - 10} más.")

    print(f"    - Lotes con TOTAL_PLN = 0 y 0 registros (Lotes vacíos atascados en 'P'): {len(lotes_sin_datos)}")
    for ls in lotes_sin_datos[:5]:
        print(f"      * Exp #{ls[0]} | Lote {ls[1]} (Seq {ls[2]}) | Banco {ls[4]} | Fecha: {ls[5]}")

    # 3.2 Expedientes con WorkItem ABIERTA donde TODOS los lotes están en 'V' (o cero lotes 'P')
    cur.execute("""
        SELECT 
            W.WFEX_EXP_ID, W.WORKITEM, W.WFUS_USERS_ID, W.WFTA_TAREA_ID,
            COUNT(L.LOTE_SEQ) as total_lotes,
            SUM(CASE WHEN L.ESTADO = 'P' THEN 1 ELSE 0 END) as lotes_p,
            SUM(CASE WHEN L.ESTADO = 'V' THEN 1 ELSE 0 END) as lotes_v,
            NVL(SUM(L.TOTAL_PLN), 0) as total_pln
        FROM WFE_WORKFLOW.WF_WORK_ITEM W
        JOIN ORG_LIQ.LOTE L ON L.EXPEDIENTE = W.WFEX_EXP_ID AND L.ANHO = W.ANHO
        WHERE W.ANHO = 2024
          AND UPPER(W.WI_ESTADO) = 'ABIERTA'
          AND L.FECHA_RECAUDACION BETWEEN DATE '2024-04-01' AND DATE '2024-04-30'
        GROUP BY W.WFEX_EXP_ID, W.WORKITEM, W.WFUS_USERS_ID, W.WFTA_TAREA_ID
        HAVING SUM(CASE WHEN L.ESTADO = 'P' THEN 1 ELSE 0 END) = 0
        ORDER BY W.WFEX_EXP_ID
    """)
    exp_atascados_abiertos = cur.fetchall()
    print(f"\n  • Expedientes ABIERTOS en Workflow cuyos Lotes YA ESTÁN 100% VALIDADOS ('V'): {len(exp_atascados_abiertos)}")
    for ea in exp_atascados_abiertos[:15]:
        print(f"    - Exp #{ea[0]} | WI {ea[1]} | Usuario: {ea[2]} | Tarea: {ea[3]} | Total Lotes 'V': {ea[6]} | Total Planillas: {ea[7]}")
    if len(exp_atascados_abiertos) > 15:
        print(f"    ... y {len(exp_atascados_abiertos) - 15} más.")

    # -------------------------------------------------------------------------
    # 4. DUPLICADOS EN TXT_SENIAT Y PLANILLA EN ABRIL 2024
    # -------------------------------------------------------------------------
    print("\n--- [4] DUPLICADOS EN TXT_SENIAT Y PLANILLA (ABRIL 2024) ---")

    # 4.1 Planillas duplicadas en TXT_SENIAT
    cur.execute("""
        SELECT T.PLANILLA, T.INFN_CODIGO, TO_CHAR(T.FECHA_RECAUDACION, 'YYYY-MM-DD') as f_rec,
               COUNT(*) as repeticiones,
               LISTAGG(T.ESTADO, ', ') WITHIN GROUP (ORDER BY T.ROWID) as estados,
               LISTAGG(NVL(TO_CHAR(T.LOTE_SEQ), 'NULL'), ', ') WITHIN GROUP (ORDER BY T.ROWID) as lotes
        FROM ORG_LIQ.TXT_SENIAT T
        WHERE T.ANHO = 2024
          AND T.FECHA_RECAUDACION BETWEEN DATE '2024-04-01' AND DATE '2024-04-30'
        GROUP BY T.PLANILLA, T.INFN_CODIGO, TO_CHAR(T.FECHA_RECAUDACION, 'YYYY-MM-DD')
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
    """)
    dups_txt = cur.fetchall()
    print(f"  • Planillas repetidas en ORG_LIQ.TXT_SENIAT en Abril 2024: {len(dups_txt)}")
    for dt in dups_txt[:10]:
        print(f"    - Planilla {dt[0]} | Banco {dt[1]} | Fecha {dt[2]} | Repeticiones: {dt[3]} | Estados: [{dt[4]}] | LoteSeqs: [{dt[5]}]")
    if len(dups_txt) > 10:
        print(f"    ... y {len(dups_txt) - 10} más.")

    # 4.2 Planillas duplicadas en ORG_LIQ.PLANILLA
    cur.execute("""
        SELECT P.PLANILLA_ID, COUNT(*) as repeticiones,
               LISTAGG(P.LOTE_SEQ, ', ') WITHIN GROUP (ORDER BY P.LOTE_SEQ) as lotes,
               LISTAGG(P.EXPEDIENTE, ', ') WITHIN GROUP (ORDER BY P.EXPEDIENTE) as expedientes,
               LISTAGG(P.MONTO, ', ') WITHIN GROUP (ORDER BY P.PLANILLA_ID) as montos
        FROM ORG_LIQ.PLANILLA P
        WHERE P.ANHO = 2024
          AND P.FECHA_RECAUDACION BETWEEN DATE '2024-04-01' AND DATE '2024-04-30'
        GROUP BY P.PLANILLA_ID
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC
    """)
    dups_pln = cur.fetchall()
    print(f"  • Planillas repetidas en ORG_LIQ.PLANILLA en Abril 2024: {len(dups_pln)}")
    for dp in dups_pln[:10]:
        print(f"    - Planilla {dp[0]} | Repeticiones: {dp[1]} | Lotes: [{dp[2]}] | Expedientes: [{dp[3]}] | Montos: [{dp[4]}]")
    if len(dups_pln) > 10:
        print(f"    ... y {len(dups_pln) - 10} más.")

    # -------------------------------------------------------------------------
    # 5. DISCREPANCIAS Y BRECHAS (TXT_SENIAT vs PLANILLA vs LOTE)
    # -------------------------------------------------------------------------
    print("\n--- [5] DESCUADRES Y BRECHAS EN LOTES (TOTAL_PLN vs REGISTROS REALES) ---")
    cur.execute("""
        SELECT 
            L.EXPEDIENTE, L.LOTE_ID, L.LOTE_SEQ, L.INFN_CODIGO, L.ESTADO,
            TO_CHAR(L.FECHA_RECAUDACION, 'YYYY-MM-DD') as f_rec,
            L.TOTAL_PLN,
            NVL(P_CNT.CANT, 0) as pln_conciliadas,
            NVL(T_CNT.CANT, 0) as txt_total,
            NVL(T_PEND.CANT, 0) as txt_pendientes
        FROM ORG_LIQ.LOTE L
        LEFT JOIN (
            SELECT LOTE_SEQ, COUNT(*) as CANT FROM ORG_LIQ.PLANILLA WHERE ANHO = 2024 GROUP BY LOTE_SEQ
        ) P_CNT ON P_CNT.LOTE_SEQ = L.LOTE_SEQ
        LEFT JOIN (
            SELECT LOTE_SEQ, COUNT(*) as CANT FROM ORG_LIQ.TXT_SENIAT WHERE ANHO = 2024 GROUP BY LOTE_SEQ
        ) T_CNT ON T_CNT.LOTE_SEQ = L.LOTE_SEQ
        LEFT JOIN (
            SELECT LOTE_SEQ, COUNT(*) as CANT FROM ORG_LIQ.TXT_SENIAT WHERE ANHO = 2024 AND (ESTADO IS NULL OR ESTADO = 0) GROUP BY LOTE_SEQ
        ) T_PEND ON T_PEND.LOTE_SEQ = L.LOTE_SEQ
        WHERE L.ANHO = 2024
          AND L.FECHA_RECAUDACION BETWEEN DATE '2024-04-01' AND DATE '2024-04-30'
          AND (
              L.TOTAL_PLN != NVL(T_CNT.CANT, 0)
              OR (L.ESTADO = 'V' AND NVL(P_CNT.CANT, 0) < L.TOTAL_PLN)
              OR (L.ESTADO = 'P' AND NVL(T_PEND.CANT, 0) = 0 AND L.TOTAL_PLN > 0)
          )
        ORDER BY L.EXPEDIENTE, L.LOTE_SEQ
    """)
    descuadres = cur.fetchall()
    print(f"  • Total Lotes con descuadre o inconsistencia en Abril 2024: {len(descuadres)}")
    for d in descuadres[:15]:
        exp, lid, lseq, bco, est, frec, tpln, pln_c, txt_t, txt_p = d
        print(f"    - Exp #{exp} | Lote {lid} (Seq {lseq}) | Bco {bco} | Est {est} | Declaradas: {tpln} | Conciliadas: {pln_c} | TXT Total: {txt_t} | TXT Pend: {txt_p}")
    if len(descuadres) > 15:
        print(f"    ... y {len(descuadres) - 15} más.")

    # -------------------------------------------------------------------------
    # 6. DISTRIBUCIÓN DE USUARIOS EN EXPEDIENTES DE ABRIL 2024
    # -------------------------------------------------------------------------
    print("\n--- [6] DISTRIBUCIÓN DE USUARIOS CON WORKITEMS ABIERTOS (ABRIL 2024) ---")
    cur.execute("""
        SELECT NVL(W.WFUS_USERS_ID, 'SIN_ASIGNAR') as usuario, COUNT(DISTINCT W.WFEX_EXP_ID) as expedientes, COUNT(W.WORKITEM) as workitems
        FROM WFE_WORKFLOW.WF_WORK_ITEM W
        WHERE W.ANHO = 2024
          AND UPPER(W.WI_ESTADO) = 'ABIERTA'
          AND EXISTS (
              SELECT 1 FROM ORG_LIQ.LOTE L 
              WHERE L.EXPEDIENTE = W.WFEX_EXP_ID AND L.ANHO = W.ANHO
                AND L.FECHA_RECAUDACION BETWEEN DATE '2024-04-01' AND DATE '2024-04-30'
          )
        GROUP BY W.WFUS_USERS_ID
        ORDER BY COUNT(DISTINCT W.WFEX_EXP_ID) DESC
    """)
    dist_users = cur.fetchall()
    for u in dist_users:
        print(f"  • Usuario: {u[0]:<25} -> {u[1]} expedientes ({u[2]} workitems abiertos)")

    conn.close()
    print("\n================================================================================")
    print("                    FIN DE LA AUDITORÍA DE ABRIL 2024                           ")
    print("================================================================================\n")

if __name__ == "__main__":
    ejecutar_auditoria()
