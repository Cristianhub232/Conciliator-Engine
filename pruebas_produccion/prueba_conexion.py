import oracledb

DB_USER = "consulta"
DB_PASSWORD = "pumyra1584"
DB_HOST = "10.79.6.247"
DB_PORT = "1521"

print("Test 1: SID = sige1")
try:
    dsn1 = oracledb.makedsn(DB_HOST, DB_PORT, sid="sige1")
    conn1 = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=dsn1)
    print("Test 1 exitoso")
    conn1.close()
except Exception as e:
    print(f"Test 1 falló: {e}")

print("\nTest 2: SID = sige-scan")
try:
    dsn2 = oracledb.makedsn(DB_HOST, DB_PORT, sid="sige-scan")
    conn2 = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=dsn2)
    print("Test 2 exitoso")
    conn2.close()
except Exception as e:
    print(f"Test 2 falló: {e}")

print("\nTest 3: Service Name = sige-scan")
try:
    dsn3 = oracledb.makedsn(DB_HOST, DB_PORT, service_name="sige-scan")
    conn3 = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=dsn3)
    print("Test 3 exitoso")
    conn3.close()
except Exception as e:
    print(f"Test 3 falló: {e}")

