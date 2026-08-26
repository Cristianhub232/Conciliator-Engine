PACKAGE              cg$WF_EXPEDIENTE IS


called_from_package BOOLEAN := FALSE;

--  Repository User-Defined Error Messages
WFEX_PK CONSTANT VARCHAR2(240) := '';
WFEX_EJOR_FK CONSTANT VARCHAR2(240) := '';

--  Column default prompts. Format PSEQNO_COL
P1EXP_ID CONSTANT VARCHAR2(240) := 'Exp Id';
P2ANHO CONSTANT VARCHAR2(240) := 'Anho';
P5ORGA_ID CONSTANT VARCHAR2(240) := 'Orga Id';
P20EXP_NOMBRE CONSTANT VARCHAR2(240) := 'Exp Nombre';
P30EXP_DESCRIPCION CONSTANT VARCHAR2(240) := 'Exp Descripcion';
P40EXP_OBSERVACION CONSTANT VARCHAR2(240) := 'Exp Observacion';
P50EXP_ESTADO CONSTANT VARCHAR2(240) := 'Exp Estado';
P60EXP_FECHA_CREACION CONSTANT VARCHAR2(240) := 'Exp Fecha Creacion';
P70EXP_FECHA_CIERRE CONSTANT VARCHAR2(240) := 'Exp Fecha Cierre';
P80WFPU_WFUS_USERS_ID CONSTANT VARCHAR2(240) := 'Users Id';
P90WFPU_WFPR_PROCESO_ID CONSTANT VARCHAR2(240) := 'Proceso Id';
P100INST_BPEL_ID CONSTANT VARCHAR2(240) := 'Inst Bpel Id';

cg$row WF_EXPEDIENTE%ROWTYPE;

--  WF_EXPEDIENTE row type variable
TYPE cg$row_type IS RECORD
(EXP_ID cg$row.EXP_ID%TYPE
,ANHO cg$row.ANHO%TYPE
,ORGA_ID cg$row.ORGA_ID%TYPE
,EXP_NOMBRE cg$row.EXP_NOMBRE%TYPE
,EXP_DESCRIPCION cg$row.EXP_DESCRIPCION%TYPE
,EXP_OBSERVACION cg$row.EXP_OBSERVACION%TYPE
,EXP_ESTADO cg$row.EXP_ESTADO%TYPE
,EXP_FECHA_CREACION cg$row.EXP_FECHA_CREACION%TYPE
,EXP_FECHA_CIERRE cg$row.EXP_FECHA_CIERRE%TYPE
,WFPU_WFUS_USERS_ID cg$row.WFPU_WFUS_USERS_ID%TYPE
,WFPU_WFPR_PROCESO_ID cg$row.WFPU_WFPR_PROCESO_ID%TYPE
,INST_BPEL_ID cg$row.INST_BPEL_ID%TYPE
,the_rowid ROWID)
;

--  WF_EXPEDIENTE indicator type variable
TYPE cg$ind_type IS RECORD
(EXP_ID BOOLEAN DEFAULT FALSE
,ANHO BOOLEAN DEFAULT FALSE
,ORGA_ID BOOLEAN DEFAULT FALSE
,EXP_NOMBRE BOOLEAN DEFAULT FALSE
,EXP_DESCRIPCION BOOLEAN DEFAULT FALSE
,EXP_OBSERVACION BOOLEAN DEFAULT FALSE
,EXP_ESTADO BOOLEAN DEFAULT FALSE
,EXP_FECHA_CREACION BOOLEAN DEFAULT FALSE
,EXP_FECHA_CIERRE BOOLEAN DEFAULT FALSE
,WFPU_WFUS_USERS_ID BOOLEAN DEFAULT FALSE
,WFPU_WFPR_PROCESO_ID BOOLEAN DEFAULT FALSE
,INST_BPEL_ID BOOLEAN DEFAULT FALSE);

cg$ind_true cg$ind_type;

--  WF_EXPEDIENTE primary key type variable
TYPE cg$pk_type IS RECORD
(ANHO cg$row.ANHO%TYPE
,ORGA_ID cg$row.ORGA_ID%TYPE
,EXP_ID cg$row.EXP_ID%TYPE
,the_rowid ROWID)
;

--  PL/SQL Table Type variable for triggers
TYPE cg$table_type IS TABLE OF WF_EXPEDIENTE%ROWTYPE
     INDEX BY BINARY_INTEGER;
cg$table cg$table_type;

TYPE cg$tableind_type IS TABLE OF cg$ind_type
     INDEX BY BINARY_INTEGER;
cg$tableind cg$tableind_type;
idx BINARY_INTEGER := 1;

PROCEDURE   ins(cg$rec IN OUT cg$row_type,
                cg$ind IN OUT cg$ind_type,
                do_ins IN BOOLEAN DEFAULT TRUE
               );
PROCEDURE   upd(cg$rec             IN OUT cg$row_type,
                cg$ind             IN OUT cg$ind_type,
                do_upd             IN BOOLEAN     DEFAULT TRUE,
                cg$pk              IN cg$row_type DEFAULT NULL
               );
PROCEDURE   del(cg$pk  IN cg$pk_type,
                do_del IN BOOLEAN DEFAULT TRUE
               );
PROCEDURE   lck(cg$old_rec  IN cg$row_type,
                cg$old_ind  IN cg$ind_type,
                nowait_flag IN BOOLEAN DEFAULT TRUE
               );
PROCEDURE   slct(cg$sel_rec IN OUT cg$row_type);

PROCEDURE   validate_arc(cg$rec IN OUT cg$row_type);

PROCEDURE   validate_domain(cg$rec IN OUT cg$row_type,
                            cg$ind IN cg$ind_type DEFAULT cg$ind_true);

PROCEDURE   validate_foreign_keys_ins(cg$rec IN cg$row_type);
PROCEDURE   validate_foreign_keys_upd(cg$rec IN cg$row_type,
                                      cg$old_rec IN cg$row_type,
                                      cg$ind IN cg$ind_type);
PROCEDURE   validate_foreign_keys_del(cg$rec IN cg$row_type);

PROCEDURE   validate_domain_cascade_delete(cg$old_rec IN cg$row_type);
PROCEDURE   validate_domain_cascade_update(cg$old_rec IN cg$row_type);

PROCEDURE   cascade_update(cg$new_rec IN OUT cg$row_type,
                           cg$old_rec IN cg$row_type );
PROCEDURE   domain_cascade_update(cg$new_rec IN OUT cg$row_type,
                                  cg$new_ind IN OUT cg$ind_type,
                                  cg$old_rec IN     cg$row_type);
PROCEDURE   domain_cascade_upd( cg$rec     IN OUT cg$row_type,
                                cg$ind     IN OUT cg$ind_type,
                                cg$old_rec IN     cg$row_type);

PROCEDURE   cascade_delete(cg$old_rec IN OUT cg$row_type);
PROCEDURE   domain_cascade_delete(cg$old_rec IN cg$row_type);

PROCEDURE   upd_denorm2( cg$rec IN cg$row_type,
                         cg$ind IN cg$ind_type );
PROCEDURE   upd_oper_denorm2( cg$rec IN cg$row_type,
                              cg$old_rec IN cg$row_type,
                              cg$ind IN cg$ind_type,
                              operation IN VARCHAR2 DEFAULT 'UPD' );
END cg$WF_EXPEDIENTE;
 