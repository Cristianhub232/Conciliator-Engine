import oracledb
import sys

# Configuración de Producción SIGECOF
DB_HOST = "10.79.6.247"
DB_PORT = 1521
DB_SID = "sige1"
DB_USER = "ONT_SIR_BOT"
DB_PASS = "bR4#mK9$L1pX!7v"

MATRIZ_REQUERIDA = {
    ("WFE_WORKFLOW", "WF_WORK_ITEM"): ["SELECT", "UPDATE", "INSERT"],
    ("WFE_WORKFLOW", "WF_EXPEDIENTE"): ["SELECT", "UPDATE"],
    ("WFE_WORKFLOW", "WF_USERS"): ["SELECT"],
    ("WFE_WORKFLOW", "WF_AUDITA_EXPEDIENTES"): ["INSERT", "SELECT"],
    ("WFE_WORKFLOW", "CG$WF_WORK_ITEM"): ["EXECUTE"],
    ("WFE_WORKFLOW", "CG$ERRORS"): ["EXECUTE"],
    ("ORG_LIQ", "LOTE"): ["SELECT", "UPDATE"],
    ("ORG_LIQ", "PLANILLA"): ["SELECT", "INSERT", "DELETE"],
    ("ORG_LIQ", "DET_PLANILLA"): ["SELECT", "INSERT", "DELETE"],
    ("ORG_LIQ", "TXT_SENIAT"): ["SELECT", "UPDATE"],
}

def main():
    print("=" * 80)
    print("  VERIFICACIÓN AUTOMATIZADA DE PERMISOS DML EN PRODUCCIÓN SIGECOF (sige1)")
    print("=" * 80)
    print(f"Host: {DB_HOST}:{DB_PORT} | SID: {DB_SID} | Usuario: {DB_USER}\n")

    dsn = oracledb.makedsn(DB_HOST, DB_PORT, sid=DB_SID)
    try:
        conn = oracledb.connect(user=DB_USER, password=DB_PASS, dsn=dsn)
        print("✅ Conexión establecida con éxito en Producción.\n")
    except Exception as e:
        print(f"❌ Error al conectar a Producción: {e}")
        sys.exit(1)

    cur = conn.cursor()

    # Consultar privilegios activos
    cur.execute("""
        SELECT OWNER, TABLE_NAME, PRIVILEGE 
        FROM USER_TAB_PRIVS 
        WHERE OWNER IN ('WFE_WORKFLOW', 'ORG_LIQ')
        ORDER BY OWNER, TABLE_NAME, PRIVILEGE
    """)
    privs_activos = set()
    for owner, tabla, priv in cur.fetchall():
        privs_activos.add((owner.upper(), tabla.upper(), priv.upper()))

    print(f"{'OBJETO / TABLA':<42} | {'PRIVILEGIO':<12} | {'ESTADO':<10}")
    print("-" * 75)

    todos_aprobados = True
    faltantes = []

    for (owner, tabla), privs_lista in MATRIZ_REQUERIDA.items():
        for priv in privs_lista:
            objeto_str = f"{owner}.{tabla}"
            if (owner, tabla, priv) in privs_activos:
                print(f"{objeto_str:<42} | {priv:<12} | ✅ OK")
            else:
                print(f"{objeto_str:<42} | {priv:<12} | ❌ FALTANTE")
                todos_aprobados = False
                faltantes.append((owner, tabla, priv))

    print("-" * 75)
    if todos_aprobados:
        print("\n🎉 TODOS LOS PRIVILEGIOS REQUERIDOS ESTÁN ACTIVOS EN PRODUCCIÓN.")
    else:
        print(f"\n⚠️ SE DETECTARON {len(faltantes)} PRIVILEGIO(S) PENDIENTES POR OTORGAR EN PRODUCCIÓN.")
        print("\nSentencias SQL requeridas al DBA de Producción:")
        
        # Agrupar sentencias para el DBA
        grants_sql = {}
        for owner, tabla, priv in faltantes:
            key = (owner, tabla)
            if key not in grants_sql:
                grants_sql[key] = []
            grants_sql[key].append(priv)
            
        for (owner, tabla), privs in grants_sql.items():
            privs_str = ", ".join(privs)
            if "EXECUTE" in privs:
                print(f"  GRANT EXECUTE ON {owner}.{tabla} TO {DB_USER};")
            else:
                print(f"  GRANT {privs_str} ON {owner}.{tabla} TO {DB_USER};")

    conn.close()

if __name__ == "__main__":
    main()
