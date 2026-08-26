import oracledb

DB_USER = "consulta"
DB_PASSWORD = "pumyra1584"
DB_HOST = "10.79.6.247"
DB_PORT = "1521"
DB_SID = "sige1"

def main():
    dsn = oracledb.makedsn(DB_HOST, DB_PORT, sid=DB_SID)
    conexion = oracledb.connect(user=DB_USER, password=DB_PASSWORD, dsn=dsn)
    cursor = conexion.cursor()

    query = """
    SELECT W.WFUS_USERS_ID AS USUARIO_TRANSCRIPTOR,
           UT.USERS_NOMBRE_CORTO || ' ' || UT.USERS_NOMBRE_LARGO AS TRANSCRIPTOR,
           W.WI_ORIGEN AS USUARIO_ASIGNADOR,
           UA.USERS_NOMBRE_CORTO || ' ' || UA.USERS_NOMBRE_LARGO AS ASIGNADOR,
           W.WFEX_EXP_ID AS EXPEDIENTE,
           L.INFN_CODIGO AS BANCO,
           TO_CHAR(L.FECHA_RECAUDACION, 'DD/MM/YYYY') AS FECHA_LOTE,
           W.WI_ESTADO AS ESTADO_ASIGNACION,
           W.WI_FECHA_CREACION AS FECHA_ASIGNACION
    FROM WFE_WORKFLOW.WF_WORK_ITEM W
    JOIN WFE_WORKFLOW.WF_USERS UT 
      ON W.WFUS_USERS_ID = UT.USERS_ID
    LEFT JOIN WFE_WORKFLOW.WF_USERS UA 
      ON W.WI_ORIGEN = UA.USERS_ID
    JOIN (
        SELECT DISTINCT EXPEDIENTE, INFN_CODIGO, FECHA_RECAUDACION
        FROM ORG_LIQ.LOTE
        WHERE ANHO = 2024
    ) L 
      ON TRIM(W.WFEX_EXP_ID) = TRIM(L.EXPEDIENTE)
    WHERE UT.ORGA_ID IN ('093', '93')
    AND ROWNUM <= 5
    """
    cursor.execute(query)
    for row in cursor.fetchall():
        print(row)

    cursor.close()
    conexion.close()

if __name__ == "__main__":
    main()
