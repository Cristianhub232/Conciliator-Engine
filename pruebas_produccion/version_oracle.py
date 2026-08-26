import oracledb

# Configuración de Producción
DB_USER = "consulta"
DB_PASSWORD = "pumyra1584"
DB_HOST = "10.79.6.247"
DB_PORT = "1521"
DB_SID = "sige1"

def main():
    try:
        print("\nConectando a la base de datos de Producción...")
        dsn = oracledb.makedsn(DB_HOST, DB_PORT, sid=DB_SID)
        conexion = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=dsn)
        
        print(f"\n[+] Conexión exitosa.")
        print(f"[+] Versión cruda reportada por el cliente: {conexion.version}")
        
        cursor = conexion.cursor()
        
        # Intentamos consultar v$version (suele ser accesible para la mayoría de usuarios)
        try:
            cursor.execute("SELECT banner FROM v$version")
            resultados = cursor.fetchall()
            
            print("\n--- Detalles de la Versión (Banner Completo) ---")
            for (banner,) in resultados:
                print(f"- {banner}")
        except oracledb.DatabaseError as e:
            print(f"\n[-] No se pudo consultar v$version (posible falta de permisos). Error: {e}")
            
        cursor.close()
        conexion.close()
    except Exception as e:
        print(f"\n[-] Error conectando a la base de datos: {e}")

if __name__ == "__main__":
    main()
