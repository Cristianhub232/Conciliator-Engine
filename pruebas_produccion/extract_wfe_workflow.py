import oracledb
import json

DB_USER = "consulta"
DB_PASSWORD = "pumyra1584"
DB_HOST = "10.79.6.247"
DB_PORT = "1521"
DB_SID = "sige1"
SCHEMA = "WFE_WORKFLOW"

def main():
    print(f"Conectando a {DB_HOST} para extraer el esquema {SCHEMA}...")
    dsn = oracledb.makedsn(DB_HOST, DB_PORT, sid=DB_SID)
    
    try:
        conexion = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=dsn)
        cursor = conexion.cursor()
        
        # 1. Extraer todas las tablas y su cantidad de registros aproximada
        cursor.execute(f"""
            SELECT table_name, num_rows
            FROM all_tables 
            WHERE owner = '{SCHEMA}'
            ORDER BY table_name
        """)
        tablas = cursor.fetchall()
        
        # 2. Extraer vistas
        cursor.execute(f"""
            SELECT view_name 
            FROM all_views 
            WHERE owner = '{SCHEMA}'
            ORDER BY view_name
        """)
        vistas = cursor.fetchall()
        
        # 3. Extraer Procedimientos, Funciones y Paquetes
        cursor.execute(f"""
            SELECT object_name, object_type 
            FROM all_objects 
            WHERE owner = '{SCHEMA}' 
              AND object_type IN ('PROCEDURE', 'FUNCTION', 'PACKAGE', 'PACKAGE BODY')
            ORDER BY object_type, object_name
        """)
        codigo = cursor.fetchall()
        
        # 4. Extraer Relaciones (Foreign Keys) para entender cómo se conectan
        cursor.execute(f"""
            SELECT a.table_name, a.column_name, a.constraint_name, 
                   c_pk.table_name r_table_name, b.column_name r_column_name
            FROM all_cons_columns a
            JOIN all_constraints c ON a.owner = c.owner AND a.constraint_name = c.constraint_name
            JOIN all_constraints c_pk ON c.r_owner = c_pk.owner AND c.r_constraint_name = c_pk.constraint_name
            JOIN all_cons_columns b ON c_pk.owner = b.owner AND c_pk.constraint_name = b.constraint_name AND a.position = b.position
            WHERE c.constraint_type = 'R' AND a.owner = '{SCHEMA}'
        """)
        relaciones = cursor.fetchall()
        
        # Formatear la salida para escribirla en un archivo temporal
        with open("wfe_data.json", "w") as f:
            data = {
                "tables": [{"name": t[0], "rows": t[1]} for t in tablas],
                "views": [v[0] for v in vistas],
                "code": [{"name": c[0], "type": c[1]} for c in codigo],
                "relations": [{"table": r[0], "column": r[1], "fk_name": r[2], "ref_table": r[3], "ref_column": r[4]} for r in relaciones]
            }
            json.dump(data, f, indent=4)
            
        print("¡Extracción completada! Datos guardados en wfe_data.json")
        cursor.close()
        conexion.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
