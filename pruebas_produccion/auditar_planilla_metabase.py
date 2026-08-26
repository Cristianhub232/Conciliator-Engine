import urllib.request
import urllib.error
import json
import decimal
from datetime import datetime

class Encoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, datetime):
            return obj.strftime('%Y-%m-%d %H:%M:%S')
        return super(Encoder, self).default(obj)

HOST = "http://10.78.30.63:3000"
TOKEN = "mb_LQvLCtYDiQRzbuRMaF4rLemlYcgAid3gXUGQjHvDZ50="
DB_ID = 33 # SIGECOF-PROD

headers = {
    "x-api-key": TOKEN,
    "Content-Type": "application/json"
}

def run_query(sql_query):
    endpoint = "/api/dataset"
    url = f"{HOST}{endpoint}"
    
    payload = {
        "database": DB_ID,
        "type": "native",
        "native": {
            "query": sql_query
        }
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            if 'error' in result:
                return {"error": result['error']}
            if 'data' in result and 'rows' in result['data']:
                rows = result['data']['rows']
                cols = [col['name'] for col in result['data']['cols']]
                
                output = []
                for row in rows:
                    output.append(dict(zip(cols, row)))
                return output
            return []
    except Exception as e:
        return {"error": str(e)}

def main():
    print("Iniciando auditoria pre-commit...")
    
    planilla_id = '2490005226'
    expediente_id = '7638'
    lote_id = '42'
    usuario = 'NAZARETHSERRANO'

    estado_pre_commit = {}

    print("1. Consultando TXT_SENIAT...")
    estado_pre_commit["TXT_SENIAT"] = run_query(f"SELECT * FROM ORG_LIQ.TXT_SENIAT WHERE PLANILLA = '{planilla_id}'")

    print("2. Consultando PLANILLA...")
    estado_pre_commit["PLANILLA"] = run_query(f"SELECT * FROM ORG_LIQ.PLANILLA WHERE PLANILLA_ID = '{planilla_id}'")

    print("3. Consultando LOTE...")
    estado_pre_commit["LOTE"] = run_query(f"SELECT * FROM ORG_LIQ.LOTE WHERE TRIM(EXPEDIENTE) = '{expediente_id}' AND LOTE_ID = '{lote_id}'")

    print("4. Consultando WF_WORK_ITEM...")
    estado_pre_commit["WORK_ITEM"] = run_query(f"SELECT WI_ID, WFEX_EXP_ID, WFEV_EV_ID, WFUS_USERS_ID, WI_ESTADO, FECHA_INI, FECHA_MOD FROM WFE_WORKFLOW.WF_WORK_ITEM WHERE TRIM(WFEX_EXP_ID) = '{expediente_id}' AND TRIM(WFUS_USERS_ID) = '{usuario}'")

    print("5. Consultando MOVIMIENTOS y AUDITORIAS potenciales...")
    # Asumamos que puede haber una tabla HISTORICO_PLANILLAS o similares. 
    # Consultaremos los nombres primero y luego si existen en la BD.
    # Pero como no sabemos cuales son, traeremos las de los dueños probables.
    estado_pre_commit["MOVIMIENTO_LOTE"] = run_query(f"SELECT * FROM ORG_LIQ.MOVIMIENTO_LOTE WHERE LOTE_SEQ IN (SELECT LOTE_SEQ FROM ORG_LIQ.LOTE WHERE TRIM(EXPEDIENTE) = '{expediente_id}' AND LOTE_ID = '{lote_id}')")

    print("6. Consultando ESTADOS_PLANILLA (si existe)...")
    estado_pre_commit["ESTADOS_PLANILLA"] = run_query(f"SELECT * FROM ORG_LIQ.ESTADOS_PLANILLA WHERE PLANILLA_ID = '{planilla_id}'")

    import os
    with open('estado_pre_commit.json', 'w') as f:
        json.dump(estado_pre_commit, f, indent=2, cls=Encoder)
        
    print("Guardado en estado_pre_commit.json con exito.")

if __name__ == "__main__":
    main()
