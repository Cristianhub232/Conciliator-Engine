import urllib.request
import urllib.error
import json
import sys

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
            
            # Formatear la salida de Metabase
            if 'error' in result:
                print(f"Error en BD: {result['error']}")
                return
                
            if 'data' in result and 'rows' in result['data']:
                rows = result['data']['rows']
                cols = [col['name'] for col in result['data']['cols']]
                
                if not rows:
                    print("La consulta no devolvió ningún resultado.")
                    return
                
                # Imprimir nombres de columnas
                print(" | ".join(cols))
                print("-" * (len(" | ".join(cols))))
                
                for row in rows:
                    print(" | ".join([str(val) for val in row]))
            else:
                print("Estructura de respuesta desconocida:", result)
                
    except urllib.error.HTTPError as e:
        print(f"Error {e.code}: {e.reason}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"Error conectando a {url}: {e}")

if __name__ == "__main__":
    query1 = """
    SELECT USERS_ID, USERS_NOMBRE_CORTO, USERS_NOMBRE_LARGO, USERS_USUARIO, USERS_STATUS, WFRO_ROLE_ID, CARGO
    FROM WFE_WORKFLOW.WF_USERS
    WHERE UPPER(USERS_ID) LIKE '%ZUILING%' 
       OR UPPER(USERS_NOMBRE_CORTO) LIKE '%ZUILING%'
       OR UPPER(USERS_NOMBRE_LARGO) LIKE '%ZUILING%'
       OR UPPER(USERS_USUARIO) LIKE '%ZUILING%'
    """
    print(f"--- Buscando a ZUILINGCOLMENAR en WFE_WORKFLOW.WF_USERS ---")
    run_query(query1)
    
    query2 = """
    SELECT * 
    FROM WFE_WORKFLOW.WF_USERS
    WHERE ROWNUM <= 2
    """
    print(f"\n--- Muestra de WFE_WORKFLOW.WF_USERS ---")
    run_query(query2)
