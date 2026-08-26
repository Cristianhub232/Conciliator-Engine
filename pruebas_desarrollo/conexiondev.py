import oracledb
import sys

# --- Configuración de Conexión (Desarrollo SIGECOF) ---
# Reemplaza estos valores con las credenciales de tu base de datos de desarrollo
DB_USER = "GDES_DQUINTERO"
DB_PASSWORD = "gdes_dquintero12345"
DB_HOST = "172.21.65.90"
DB_PORT = "1521"
DB_SID = "cert_rep"

def conectar():
    dsn = oracledb.makedsn(DB_HOST, DB_PORT, sid=DB_SID)
    return oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=dsn)

def resumen_esquemas(cursor):
    # Consulta para contar la cantidad de tablas, vistas, etc. por esquema
    consulta_sql = """
        SELECT owner, object_type, count(*) 
        FROM all_objects 
        WHERE object_type IN ('TABLE', 'VIEW', 'PROCEDURE', 'FUNCTION')
        GROUP BY owner, object_type
        ORDER BY owner, object_type
    """
    print("\nObteniendo resumen de objetos por esquema (esto puede tardar unos segundos)...")
    cursor.execute(consulta_sql)
    resultados = cursor.fetchall()
    
    esquemas = {}
    for owner, obj_type, count in resultados:
        if owner not in esquemas:
            esquemas[owner] = {}
        esquemas[owner][obj_type] = count

    print("\n--- Resumen de Información por Esquema (solo esquemas con objetos) ---")
    for owner, objetos in esquemas.items():
        resumen = ", ".join([f"{count} {obj_type}s" for obj_type, count in objetos.items()])
        print(f"- {owner}: {resumen}")

def explorar_esquema(cursor, schema_name):
    # Consulta para listar las tablas y vistas de un esquema específico
    schema_name = schema_name.upper()
    consulta_sql = """
        SELECT object_name, object_type 
        FROM all_objects 
        WHERE owner = :schema_name AND object_type IN ('TABLE', 'VIEW')
        ORDER BY object_type, object_name
    """
    print(f"\nObteniendo tablas y vistas del esquema {schema_name}...")
    cursor.execute(consulta_sql, schema_name=schema_name)
    resultados = cursor.fetchall()
    
    if not resultados:
        print(f"\nNo se encontraron tablas o vistas accesibles para el esquema: {schema_name}")
        return

    print(f"\n--- Objetos en el esquema {schema_name} ---")
    current_type = None
    for obj_name, obj_type in resultados:
        if obj_type != current_type:
            print(f"\n[{obj_type}S]")
            current_type = obj_type
        print(f"  - {obj_name}")
    print(f"\nTotal de objetos listados: {len(resultados)}")

def exportar_todos_esquemas(cursor):
    print("\nObteniendo tablas y vistas de todos los esquemas (esto puede tardar unos segundos)...")
    consulta_sql = """
        SELECT owner, object_type, object_name 
        FROM all_objects 
        WHERE object_type IN ('TABLE', 'VIEW')
        ORDER BY owner, object_type, object_name
    """
    cursor.execute(consulta_sql)
    resultados = cursor.fetchall()
    
    if not resultados:
        print("No se encontraron tablas ni vistas accesibles.")
        return

    nombre_archivo = "detalles_todos_esquemas_dev.md"
    try:
        with open(nombre_archivo, "w", encoding="utf-8") as f:
            f.write("# Detalles de Objetos por Esquema (Desarrollo SIGECOF)\n\n")
            current_owner = None
            current_type = None
            
            for owner, obj_type, obj_name in resultados:
                if owner != current_owner:
                    f.write(f"\n## Esquema: {owner}\n")
                    current_owner = owner
                    current_type = None
                    
                if obj_type != current_type:
                    f.write(f"\n### [{obj_type}S]\n")
                    current_type = obj_type
                    
                f.write(f"- {obj_name}\n")
        
        print(f"\n¡Exportación completada! Se guardaron los detalles de {len(resultados)} objetos en el archivo: {nombre_archivo}")
    except Exception as e:
        print(f"\n[Error al escribir el archivo]: {e}")

def main():
    conexion = None
    cursor = None
    try:
        print(f"\n[ENTORNO: DESARROLLO - SIGECOF]")
        print(f"Intentando conectar a {DB_HOST}:{DB_PORT} (SID: {DB_SID})...")
        conexion = conectar()
        print("Conexión establecida con éxito.\n")
        cursor = conexion.cursor()

        while True:
            print("\n¿Qué deseas hacer?")
            print("1. Ver resumen de objetos (cantidad de tablas/vistas) por esquema")
            print("2. Explorar tablas y vistas de un esquema específico")
            print("3. Exportar el detalle de TODAS las tablas y vistas de todos los esquemas a un archivo")
            print("4. Salir")
            opcion = input("Elige una opción (1/2/3/4): ").strip()

            if opcion == '1':
                resumen_esquemas(cursor)
            elif opcion == '2':
                esquema = input("Introduce el nombre del esquema (ej. BTCCONFIG o SYSTEM): ").strip()
                if esquema:
                    explorar_esquema(cursor, esquema)
            elif opcion == '3':
                exportar_todos_esquemas(cursor)
            elif opcion == '4':
                break
            else:
                print("Opción no válida. Intenta de nuevo.")

    except oracledb.DatabaseError as error:
        error_obj, = error.args
        print(f"\n[Error de Base de Datos]: {error_obj.message}")
    except Exception as e:
        print(f"\n[Error Inesperado]: {e}")
    finally:
        if cursor:
            cursor.close()
        if conexion:
            conexion.close()
            print("\nConexión cerrada correctamente.")

if __name__ == "__main__":
    main()
