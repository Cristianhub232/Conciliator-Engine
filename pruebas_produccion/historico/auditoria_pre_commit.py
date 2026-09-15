import oracledb
import json
import decimal
from datetime import datetime

class Encoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        if hasattr(obj, 'read'): # LOB objects usually have a read method
            return obj.read()
        return super(Encoder, self).default(obj)

def query_to_dict(cursor, query, params=None):
    if params:
        cursor.execute(query, params)
    else:
        cursor.execute(query)
    columns = [col[0] for col in cursor.description] if cursor.description else []
    cursor.rowfactory = lambda *args: dict(zip(columns, args))
    return cursor.fetchall()

def main():
    try:
        oracledb.init_oracle_client()
    except Exception as e:
        print("Thin mode")
        
    dsn = oracledb.makedsn("10.79.6.247", 1521, sid="sige1")
    conn = oracledb.connect(user="consulta", password="consulta", dsn=dsn)
    cursor = conn.cursor()
    
    estado_pre_commit = {}

    # 1. ORG_LIQ.TXT_SENIAT (El archivo bancario original)
    estado_pre_commit["TXT_SENIAT"] = query_to_dict(
        cursor,
        "SELECT * FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = '2490005226'"
    )

    # 2. ORG_LIQ.PLANILLA (La tabla donde supuestamente escribirá al conciliar)
    estado_pre_commit["PLANILLA"] = query_to_dict(
        cursor,
        "SELECT * FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = '2490005226'"
    )

    # 3. ORG_LIQ.LOTE (El lote 42 del exp 7638)
    estado_pre_commit["LOTE"] = query_to_dict(
        cursor,
        "SELECT * FROM ORG_LIQ.LOTE WHERE TRIM(EXPEDIENTE) = '7638' AND LOTE_ID = '42'"
    )

    # 4. WFE_WORKFLOW.WF_WORK_ITEM (La tarea de Nazareth Serrano)
    estado_pre_commit["WORK_ITEM"] = query_to_dict(
        cursor,
        "SELECT WI_ID, WFEX_EXP_ID, WFEV_EV_ID, WFUS_USERS_ID, WI_ESTADO, FECHA_INI, FECHA_MOD "
        "FROM WFE_WORKFLOW.WF_WORK_ITEM WHERE TRIM(WFEX_EXP_ID) = '7638' AND TRIM(WFUS_USERS_ID) = 'NAZARETHSERRANO'"
    )
    
    # 5. ORG_LIQ.MOVIMIENTOS / ORG_LIQ.HISTORICO_PLANILLAS (Tablas donde tal vez haya auditoría interna)
    # Vamos a buscar en tablas que contengan "PLANILLA" o "HIST" o "AUDIT" en ORG_LIQ que puedan guardar esta transacción
    tablas_auditoria = query_to_dict(
        cursor,
        "SELECT TABLE_NAME FROM ALL_TABLES WHERE OWNER = 'ORG_LIQ' AND (TABLE_NAME LIKE '%AUDIT%' OR TABLE_NAME LIKE '%HIST%' OR TABLE_NAME LIKE '%MOV%')"
    )
    estado_pre_commit["TABLAS_POTENCIALES_AUDITORIA"] = [t['TABLE_NAME'] for t in tablas_auditoria]

    print(json.dumps(estado_pre_commit, indent=2, cls=Encoder))

    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
