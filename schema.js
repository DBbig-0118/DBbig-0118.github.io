/* 디비빅SQL — 실습 스키마 (SCOTT 스키마 + DBBIG 2노드 RAC 가상 딕셔너리 뷰)
   모든 값은 학습용 가상 데이터입니다. 시간 값은 앱을 연 시각(SYSDATE) 기준으로 생성됩니다. */
(function (root) {
  "use strict";
  function build(db, ctx, H) {
    var now = ctx.now, dv = H.dv, DAY = 1, HR = 1 / 24, MIN = 1 / 1440;
    var day0 = Math.floor(now);                   // 오늘 00:00
    function T(rel) { return Math.round((now + rel) * 86400) / 86400; }
    function ins(table, cols, rows) {
      var q = "INSERT INTO " + table + " (" + cols.map(function (c) { return /#/.test(c) ? '"' + c + '"' : c; }).join(",") + ") VALUES (" + cols.map(function () { return "?"; }).join(",") + ")";
      var st = db.prepare(q);
      rows.forEach(function (r) { st.run(r.map(function (v) { return v === undefined ? null : v; })); });
      st.free();
    }
    var S = [];
    /* ── SCOTT ── */
    S.push("CREATE TABLE DEPT (DEPTNO INTEGER PRIMARY KEY, DNAME VARCHAR2(14), LOC VARCHAR2(13))");
    S.push("CREATE TABLE EMP (EMPNO INTEGER PRIMARY KEY, ENAME VARCHAR2(10), JOB VARCHAR2(9), MGR INTEGER, HIREDATE DATE, SAL NUMBER(7,2), COMM NUMBER(7,2), DEPTNO INTEGER REFERENCES DEPT(DEPTNO))");
    S.push("CREATE TABLE SALGRADE (GRADE INTEGER, LOSAL INTEGER, HISAL INTEGER)");
    S.push("CREATE TABLE DUAL (DUMMY VARCHAR2(1))");
    S.forEach(function (s) { db.run(s); }); S = [];
    db.run("INSERT INTO DUAL VALUES ('X')");
    ins("DEPT", ["DEPTNO", "DNAME", "LOC"], [[10, "ACCOUNTING", "NEW YORK"], [20, "RESEARCH", "DALLAS"], [30, "SALES", "CHICAGO"], [40, "OPERATIONS", "BOSTON"]]);
    var E = [
      [7369, "SMITH", "CLERK", 7902, [1980, 12, 17], 800, null, 20],
      [7499, "ALLEN", "SALESMAN", 7698, [1981, 2, 20], 1600, 300, 30],
      [7521, "WARD", "SALESMAN", 7698, [1981, 2, 22], 1250, 500, 30],
      [7566, "JONES", "MANAGER", 7839, [1981, 4, 2], 2975, null, 20],
      [7654, "MARTIN", "SALESMAN", 7698, [1981, 9, 28], 1250, 1400, 30],
      [7698, "BLAKE", "MANAGER", 7839, [1981, 5, 1], 2850, null, 30],
      [7782, "CLARK", "MANAGER", 7839, [1981, 6, 9], 2450, null, 10],
      [7788, "SCOTT", "ANALYST", 7566, [1987, 4, 19], 3000, null, 20],
      [7839, "KING", "PRESIDENT", null, [1981, 11, 17], 5000, null, 10],
      [7844, "TURNER", "SALESMAN", 7698, [1981, 9, 8], 1500, 0, 30],
      [7876, "ADAMS", "CLERK", 7788, [1987, 5, 23], 1100, null, 20],
      [7900, "JAMES", "CLERK", 7698, [1981, 12, 3], 950, null, 30],
      [7902, "FORD", "ANALYST", 7566, [1981, 12, 3], 3000, null, 20],
      [7934, "MILLER", "CLERK", 7782, [1982, 1, 23], 1300, null, 10]
    ].map(function (r) { r[4] = dv(r[4][0], r[4][1], r[4][2]); return r; });
    ins("EMP", ["EMPNO", "ENAME", "JOB", "MGR", "HIREDATE", "SAL", "COMM", "DEPTNO"], E);
    ins("SALGRADE", ["GRADE", "LOSAL", "HISAL"], [[1, 700, 1200], [2, 1201, 1400], [3, 1401, 2000], [4, 2001, 3000], [5, 3001, 9999]]);

    /* ── 인스턴스 / DB ── */
    db.run("CREATE TABLE GV$INSTANCE (INST_ID INTEGER, INSTANCE_NUMBER INTEGER, INSTANCE_NAME VARCHAR2(16), HOST_NAME VARCHAR2(64), VERSION VARCHAR2(17), VERSION_FULL VARCHAR2(17), STARTUP_TIME DATE, STATUS VARCHAR2(12), ARCHIVER VARCHAR2(7), LOGINS VARCHAR2(10), DATABASE_STATUS VARCHAR2(17), INSTANCE_ROLE VARCHAR2(18))");
    ins("GV$INSTANCE", ["INST_ID", "INSTANCE_NUMBER", "INSTANCE_NAME", "HOST_NAME", "VERSION", "VERSION_FULL", "STARTUP_TIME", "STATUS", "ARCHIVER", "LOGINS", "DATABASE_STATUS", "INSTANCE_ROLE"], [
      [1, 1, "DBBIG1", "dbbigdb01", "19.0.0.0.0", "19.24.0.0.0", T(-23 * DAY - 5 * HR), "OPEN", "STARTED", "ALLOWED", "ACTIVE", "PRIMARY_INSTANCE"],
      [2, 2, "DBBIG2", "dbbigdb02", "19.0.0.0.0", "19.24.0.0.0", T(-2 * DAY - 7 * HR), "OPEN", "STARTED", "ALLOWED", "ACTIVE", "PRIMARY_INSTANCE"]]);
    db.run("CREATE VIEW V$INSTANCE AS SELECT INSTANCE_NUMBER, INSTANCE_NAME, HOST_NAME, VERSION, VERSION_FULL, STARTUP_TIME, STATUS, ARCHIVER, LOGINS, DATABASE_STATUS, INSTANCE_ROLE FROM GV$INSTANCE WHERE INST_ID = 1");
    db.run("CREATE TABLE V$DATABASE (DBID INTEGER, NAME VARCHAR2(9), DB_UNIQUE_NAME VARCHAR2(30), CREATED DATE, LOG_MODE VARCHAR2(12), OPEN_MODE VARCHAR2(20), DATABASE_ROLE VARCHAR2(16), FORCE_LOGGING VARCHAR2(39), FLASHBACK_ON VARCHAR2(18), PLATFORM_NAME VARCHAR2(101), CDB VARCHAR2(3))");
    ins("V$DATABASE", ["DBID", "NAME", "DB_UNIQUE_NAME", "CREATED", "LOG_MODE", "OPEN_MODE", "DATABASE_ROLE", "FORCE_LOGGING", "FLASHBACK_ON", "PLATFORM_NAME", "CDB"], [[3456789012, "DBBIG", "DBBIG", dv(2024, 3, 11, 14, 22, 7), "ARCHIVELOG", "READ WRITE", "PRIMARY", "YES", "NO", "Linux x86 64-bit", "NO"]]);

    /* ── 파라미터 ── */
    db.run("CREATE TABLE V$PARAMETER (NAME VARCHAR2(80), VALUE VARCHAR2(4000), ISDEFAULT VARCHAR2(9), ISSES_MODIFIABLE VARCHAR2(5), ISSYS_MODIFIABLE VARCHAR2(9))");
    ins("V$PARAMETER", ["NAME", "VALUE", "ISDEFAULT", "ISSES_MODIFIABLE", "ISSYS_MODIFIABLE"], [
      ["processes", "2000", "FALSE", "FALSE", "FALSE"], ["sga_target", "64424509440", "FALSE", "FALSE", "IMMEDIATE"], ["sga_max_size", "64424509440", "FALSE", "FALSE", "FALSE"],
      ["pga_aggregate_target", "17179869184", "FALSE", "FALSE", "IMMEDIATE"], ["pga_aggregate_limit", "34359738368", "FALSE", "FALSE", "IMMEDIATE"],
      ["use_large_pages", "ONLY", "FALSE", "FALSE", "FALSE"], ["db_block_size", "8192", "FALSE", "FALSE", "FALSE"], ["compatible", "19.0.0", "FALSE", "FALSE", "FALSE"],
      ["cluster_database", "TRUE", "FALSE", "FALSE", "FALSE"], ["undo_retention", "10800", "FALSE", "FALSE", "IMMEDIATE"], ["open_cursors", "1000", "FALSE", "FALSE", "IMMEDIATE"],
      ["optimizer_mode", "ALL_ROWS", "TRUE", "TRUE", "IMMEDIATE"], ["cursor_sharing", "EXACT", "TRUE", "TRUE", "IMMEDIATE"], ["statistics_level", "TYPICAL", "TRUE", "TRUE", "IMMEDIATE"],
      ["db_file_multiblock_read_count", "128", "TRUE", "TRUE", "IMMEDIATE"], ["sort_area_size", "65536", "TRUE", "TRUE", "DEFERRED"], ["job_queue_processes", "80", "FALSE", "FALSE", "IMMEDIATE"],
      ["db_recovery_file_dest", "+RECOC1", "FALSE", "FALSE", "IMMEDIATE"], ["db_recovery_file_dest_size", "3298534883328", "FALSE", "FALSE", "IMMEDIATE"],
      ["remote_login_passwordfile", "EXCLUSIVE", "TRUE", "FALSE", "FALSE"], ["audit_trail", "DB", "FALSE", "FALSE", "FALSE"], ["control_management_pack_access", "DIAGNOSTIC+TUNING", "TRUE", "FALSE", "IMMEDIATE"]]);

    /* ── 테이블스페이스 / 데이터파일 / 여유공간 ── */
    db.run("CREATE TABLE DBA_TABLESPACES (TABLESPACE_NAME VARCHAR2(30), BLOCK_SIZE INTEGER, STATUS VARCHAR2(9), CONTENTS VARCHAR2(21), LOGGING VARCHAR2(9), EXTENT_MANAGEMENT VARCHAR2(10), SEGMENT_SPACE_MANAGEMENT VARCHAR2(6), BIGFILE VARCHAR2(3))");
    var TS = [["SYSTEM", "PERMANENT", "MANUAL", "NO"], ["SYSAUX", "PERMANENT", "AUTO", "NO"], ["UNDOTBS1", "UNDO", "MANUAL", "NO"], ["UNDOTBS2", "UNDO", "MANUAL", "NO"], ["TEMP", "TEMPORARY", "MANUAL", "NO"], ["USERS", "PERMANENT", "AUTO", "NO"], ["APP_DATA", "PERMANENT", "AUTO", "NO"], ["APP_IDX", "PERMANENT", "AUTO", "NO"], ["HIST_DATA", "PERMANENT", "AUTO", "YES"]];
    ins("DBA_TABLESPACES", ["TABLESPACE_NAME", "BLOCK_SIZE", "STATUS", "CONTENTS", "LOGGING", "EXTENT_MANAGEMENT", "SEGMENT_SPACE_MANAGEMENT", "BIGFILE"], TS.map(function (t) { return [t[0], 8192, "ONLINE", t[1], t[1] === "TEMPORARY" ? "NOLOGGING" : "LOGGING", "LOCAL", t[2], t[3]]; }));
    db.run("CREATE TABLE DBA_DATA_FILES (FILE_NAME VARCHAR2(513), FILE_ID INTEGER, TABLESPACE_NAME VARCHAR2(30), BYTES INTEGER, BLOCKS INTEGER, STATUS VARCHAR2(9), AUTOEXTENSIBLE VARCHAR2(3), MAXBYTES INTEGER, INCREMENT_BY INTEGER, ONLINE_STATUS VARCHAR2(7))");
    var G = 1073741824, MAXS = 34359721984;
    var DF = [ // [id, ts, GB, autoext, maxbytes]
      [1, "SYSTEM", 4, "YES", MAXS], [2, "SYSAUX", 12, "YES", MAXS], [3, "UNDOTBS1", 30, "YES", MAXS], [4, "UNDOTBS2", 30, "YES", MAXS], [5, "USERS", 1, "YES", MAXS],
      [6, "APP_DATA", 32, "NO", 0], [7, "APP_DATA", 32, "NO", 0], [8, "APP_DATA", 24, "YES", MAXS], [9, "APP_IDX", 16, "NO", 0], [10, "APP_IDX", 16, "NO", 0], [11, "HIST_DATA", 800, "YES", 4398046511104]];
    var seq = 256;
    ins("DBA_DATA_FILES", ["FILE_NAME", "FILE_ID", "TABLESPACE_NAME", "BYTES", "BLOCKS", "STATUS", "AUTOEXTENSIBLE", "MAXBYTES", "INCREMENT_BY", "ONLINE_STATUS"], DF.map(function (f) {
      var b = f[2] * G; return ["+DATAC1/DBBIG/DATAFILE/" + f[1].toLowerCase() + "." + (seq++) + ".1163" + (100000 + f[0] * 7919), f[0], f[1], b, b / 8192, "AVAILABLE", f[3], f[4], f[3] === "YES" ? 131072 : 0, f[0] === 1 ? "SYSTEM" : "ONLINE"];
    }));
    db.run("CREATE TABLE DBA_FREE_SPACE (TABLESPACE_NAME VARCHAR2(30), FILE_ID INTEGER, BLOCK_ID INTEGER, BYTES INTEGER, BLOCKS INTEGER)");
    var M = 1048576, FS = [ // [ts, file, MB]  — APP_IDX 는 여유공간 행이 하나도 없음(완전 소진)
      ["SYSTEM", 1, 1180], ["SYSAUX", 2, 2210], ["SYSAUX", 2, 640], ["UNDOTBS1", 3, 21504], ["UNDOTBS2", 4, 27650], ["USERS", 5, 870],
      ["APP_DATA", 6, 410], ["APP_DATA", 7, 1250], ["APP_DATA", 8, 3200], ["APP_DATA", 8, 960], ["HIST_DATA", 11, 286720], ["HIST_DATA", 11, 51200]];
    ins("DBA_FREE_SPACE", ["TABLESPACE_NAME", "FILE_ID", "BLOCK_ID", "BYTES", "BLOCKS"], FS.map(function (f, i) { return [f[0], f[1], 128 + i * 40960, f[2] * M, f[2] * M / 8192]; }));

    /* ── 사용자 / 권한 ── */
    db.run("CREATE TABLE DBA_USERS (USERNAME VARCHAR2(128), USER_ID INTEGER, ACCOUNT_STATUS VARCHAR2(32), LOCK_DATE DATE, EXPIRY_DATE DATE, DEFAULT_TABLESPACE VARCHAR2(30), TEMPORARY_TABLESPACE VARCHAR2(30), PROFILE VARCHAR2(128), CREATED DATE, ORACLE_MAINTAINED VARCHAR2(1))");
    var cre = dv(2024, 3, 11, 14, 30);
    ins("DBA_USERS", ["USERNAME", "USER_ID", "ACCOUNT_STATUS", "LOCK_DATE", "EXPIRY_DATE", "DEFAULT_TABLESPACE", "TEMPORARY_TABLESPACE", "PROFILE", "CREATED", "ORACLE_MAINTAINED"], [
      ["SYS", 0, "OPEN", null, null, "SYSTEM", "TEMP", "DEFAULT", cre, "Y"], ["SYSTEM", 9, "OPEN", null, null, "SYSTEM", "TEMP", "DEFAULT", cre, "Y"],
      ["DBSNMP", 64, "EXPIRED & LOCKED", cre, cre, "SYSAUX", "TEMP", "DEFAULT", cre, "Y"], ["AUDSYS", 8, "LOCKED", cre, null, "USERS", "TEMP", "DEFAULT", cre, "Y"],
      ["APP_OWNER", 110, "OPEN", null, null, "APP_DATA", "TEMP", "APP_PROFILE", dv(2024, 3, 12, 10), "N"],
      ["APP_USER", 111, "OPEN", null, T(152 * DAY), "APP_DATA", "TEMP", "APP_PROFILE", dv(2024, 3, 12, 10, 5), "N"],
      ["BATCH_USER", 112, "LOCKED(TIMED)", T(-3 * HR), null, "APP_DATA", "TEMP", "APP_PROFILE", dv(2024, 4, 2, 9), "N"],
      ["REPORT_USER", 113, "EXPIRED", null, T(-5 * DAY), "USERS", "TEMP", "DEFAULT", dv(2024, 5, 20, 16), "N"],
      ["ETL_USER", 114, "EXPIRED(GRACE)", null, T(4 * DAY), "HIST_DATA", "TEMP", "DEFAULT", dv(2024, 6, 1, 11), "N"],
      ["OLD_DEV", 115, "LOCKED", T(-210 * DAY), null, "USERS", "TEMP", "DEFAULT", dv(2024, 3, 20, 13), "N"],
      ["MON_USER", 116, "OPEN", null, T(40 * DAY), "USERS", "TEMP", "DEFAULT", dv(2025, 1, 7, 15), "N"],
      ["HR", 117, "OPEN", null, null, "USERS", "TEMP", "DEFAULT", dv(2024, 3, 11, 15), "N"]]);
    db.run("CREATE TABLE DBA_ROLE_PRIVS (GRANTEE VARCHAR2(128), GRANTED_ROLE VARCHAR2(128), ADMIN_OPTION VARCHAR2(3), DEFAULT_ROLE VARCHAR2(3))");
    ins("DBA_ROLE_PRIVS", ["GRANTEE", "GRANTED_ROLE", "ADMIN_OPTION", "DEFAULT_ROLE"], [
      ["SYS", "DBA", "YES", "YES"], ["SYSTEM", "DBA", "NO", "YES"], ["APP_OWNER", "RESOURCE", "NO", "YES"], ["APP_OWNER", "CONNECT", "NO", "YES"], ["APP_USER", "CONNECT", "NO", "YES"],
      ["APP_USER", "APP_RW_ROLE", "NO", "YES"], ["BATCH_USER", "APP_RW_ROLE", "NO", "YES"], ["REPORT_USER", "APP_RO_ROLE", "NO", "YES"], ["OLD_DEV", "DBA", "NO", "YES"],
      ["MON_USER", "SELECT_CATALOG_ROLE", "NO", "YES"], ["ETL_USER", "DBA", "NO", "YES"], ["HR", "CONNECT", "NO", "YES"]]);
    db.run("CREATE TABLE DBA_SYS_PRIVS (GRANTEE VARCHAR2(128), PRIVILEGE VARCHAR2(40), ADMIN_OPTION VARCHAR2(3))");
    ins("DBA_SYS_PRIVS", ["GRANTEE", "PRIVILEGE", "ADMIN_OPTION"], [
      ["APP_OWNER", "CREATE TABLE", "NO"], ["APP_OWNER", "CREATE VIEW", "NO"], ["APP_OWNER", "CREATE SEQUENCE", "NO"], ["APP_OWNER", "UNLIMITED TABLESPACE", "NO"],
      ["APP_USER", "CREATE SESSION", "NO"], ["BATCH_USER", "CREATE SESSION", "NO"], ["BATCH_USER", "SELECT ANY TABLE", "NO"], ["REPORT_USER", "CREATE SESSION", "NO"],
      ["ETL_USER", "CREATE ANY TABLE", "NO"], ["ETL_USER", "DROP ANY TABLE", "NO"], ["ETL_USER", "INSERT ANY TABLE", "NO"], ["MON_USER", "CREATE SESSION", "NO"], ["MON_USER", "SELECT ANY DICTIONARY", "NO"]]);

    /* ── 세그먼트 / 객체 ── */
    db.run("CREATE TABLE DBA_SEGMENTS (OWNER VARCHAR2(128), SEGMENT_NAME VARCHAR2(128), PARTITION_NAME VARCHAR2(128), SEGMENT_TYPE VARCHAR2(18), TABLESPACE_NAME VARCHAR2(30), BYTES INTEGER, BLOCKS INTEGER, EXTENTS INTEGER)");
    var SEG = [["APP_OWNER", "ORDERS", null, "TABLE", "APP_DATA", 21504], ["APP_OWNER", "ORDER_ITEMS", null, "TABLE", "APP_DATA", 38912], ["APP_OWNER", "CUSTOMERS", null, "TABLE", "APP_DATA", 3072],
      ["APP_OWNER", "PAYMENTS", null, "TABLE", "APP_DATA", 14336], ["APP_OWNER", "PRODUCTS", null, "TABLE", "APP_DATA", 256], ["APP_OWNER", "PK_ORDERS", null, "INDEX", "APP_IDX", 4608],
      ["APP_OWNER", "IX_ORDERS_01", null, "INDEX", "APP_IDX", 6144], ["APP_OWNER", "PK_ORDER_ITEMS", null, "INDEX", "APP_IDX", 9216], ["APP_OWNER", "IX_ORDER_ITEMS_01", null, "INDEX", "APP_IDX", 11264],
      ["APP_OWNER", "IX_PAYMENTS_01", null, "INDEX", "APP_IDX", 1536], ["APP_OWNER", "ORDERS_HIST", "P202409", "TABLE PARTITION", "HIST_DATA", 92160], ["APP_OWNER", "ORDERS_HIST", "P202410", "TABLE PARTITION", "HIST_DATA", 98304],
      ["APP_OWNER", "ORDERS_HIST", "P202411", "TABLE PARTITION", "HIST_DATA", 102400], ["APP_OWNER", "ORDERS_HIST", "P202412", "TABLE PARTITION", "HIST_DATA", 111616], ["APP_OWNER", "ORDERS_HIST", "P202501", "TABLE PARTITION", "HIST_DATA", 54272],
      ["APP_OWNER", "BATCH_LOG", null, "TABLE", "USERS", 120], ["HR", "EMPLOYEES", null, "TABLE", "USERS", 2], ["SYS", "AUD$UNIFIED", "SYS_P1782", "TABLE PARTITION", "SYSAUX", 1408], ["SYS", "WRH$_ACTIVE_SESSION_HISTORY", "WRH$_ACTIVE_3456789012_0", "TABLE PARTITION", "SYSAUX", 2304]];
    ins("DBA_SEGMENTS", ["OWNER", "SEGMENT_NAME", "PARTITION_NAME", "SEGMENT_TYPE", "TABLESPACE_NAME", "BYTES", "BLOCKS", "EXTENTS"], SEG.map(function (s) { return [s[0], s[1], s[2], s[3], s[4], s[5] * M, s[5] * 128, Math.max(1, Math.round(s[5] / 8))]; }));
    db.run("CREATE TABLE DBA_OBJECTS (OWNER VARCHAR2(128), OBJECT_NAME VARCHAR2(128), OBJECT_TYPE VARCHAR2(23), STATUS VARCHAR2(7), CREATED DATE, LAST_DDL_TIME DATE)");
    var OB = [["APP_OWNER", "ORDERS", "TABLE", "VALID"], ["APP_OWNER", "ORDER_ITEMS", "TABLE", "VALID"], ["APP_OWNER", "CUSTOMERS", "TABLE", "VALID"], ["APP_OWNER", "PAYMENTS", "TABLE", "VALID"], ["APP_OWNER", "PRODUCTS", "TABLE", "VALID"],
      ["APP_OWNER", "ORDERS_HIST", "TABLE", "VALID"], ["APP_OWNER", "PK_ORDERS", "INDEX", "VALID"], ["APP_OWNER", "IX_ORDERS_01", "INDEX", "VALID"], ["APP_OWNER", "V_ORDER_SUMMARY", "VIEW", "INVALID"], ["APP_OWNER", "V_DAILY_SALES", "VIEW", "VALID"],
      ["APP_OWNER", "PKG_ORDER", "PACKAGE", "VALID"], ["APP_OWNER", "PKG_ORDER", "PACKAGE BODY", "INVALID"], ["APP_OWNER", "PKG_PAYMENT", "PACKAGE", "VALID"], ["APP_OWNER", "PKG_PAYMENT", "PACKAGE BODY", "VALID"], ["APP_OWNER", "TRG_ORDERS_AUD", "TRIGGER", "INVALID"],
      ["APP_OWNER", "SEQ_ORDER", "SEQUENCE", "VALID"], ["APP_OWNER", "FN_GET_PRICE", "FUNCTION", "INVALID"], ["APP_USER", "SYN_ORDERS", "SYNONYM", "VALID"], ["APP_USER", "SYN_OLD_REPORT", "SYNONYM", "INVALID"], ["HR", "EMPLOYEES", "TABLE", "VALID"],
      ["HR", "PRC_RAISE", "PROCEDURE", "INVALID"], ["SYS", "DBMS_STATS", "PACKAGE", "VALID"], ["PUBLIC", "DUAL", "SYNONYM", "VALID"]];
    ins("DBA_OBJECTS", ["OWNER", "OBJECT_NAME", "OBJECT_TYPE", "STATUS", "CREATED", "LAST_DDL_TIME"], OB.map(function (o, i) { return [o[0], o[1], o[2], o[3], dv(2024, 3, 12, 10) + i * 0.37, o[3] === "INVALID" ? T(-1 * DAY - i * MIN * 7) : dv(2025, 6, 2, 22) + i * 0.11]; }));

    /* ── 세션 ── */
    db.run("CREATE TABLE GV$SESSION (INST_ID INTEGER, SADDR VARCHAR2(16), SID INTEGER, \"SERIAL#\" INTEGER, PADDR VARCHAR2(16), USERNAME VARCHAR2(128), STATUS VARCHAR2(8), OSUSER VARCHAR2(128), MACHINE VARCHAR2(64), PROGRAM VARCHAR2(84), MODULE VARCHAR2(64), TYPE VARCHAR2(10), SERVICE_NAME VARCHAR2(64), SQL_ID VARCHAR2(13), PREV_SQL_ID VARCHAR2(13), EVENT VARCHAR2(64), WAIT_CLASS VARCHAR2(64), STATE VARCHAR2(19), SECONDS_IN_WAIT INTEGER, LAST_CALL_ET INTEGER, BLOCKING_INSTANCE INTEGER, BLOCKING_SESSION INTEGER, FINAL_BLOCKING_INSTANCE INTEGER, FINAL_BLOCKING_SESSION INTEGER, LOGON_TIME DATE)");
    var SS = [ // inst, sid, serial, user, status, osuser, machine, program, module, type, svc, sql_id, prev, event, class, state, siw, lce, bi, bs, logon(rel days)
      [1, 2, 11, null, "ACTIVE", "oracle", "dbbigdb01", "oracle@dbbigdb01 (PMON)", null, "BACKGROUND", "SYS$BACKGROUND", null, null, "pmon timer", "Idle", "WAITING", 3, 0, null, null, -23],
      [1, 4, 17, null, "ACTIVE", "oracle", "dbbigdb01", "oracle@dbbigdb01 (DBW0)", null, "BACKGROUND", "SYS$BACKGROUND", null, null, "rdbms ipc message", "Idle", "WAITING", 1, 0, null, null, -23],
      [1, 6, 21, null, "ACTIVE", "oracle", "dbbigdb01", "oracle@dbbigdb01 (LGWR)", null, "BACKGROUND", "SYS$BACKGROUND", null, null, "rdbms ipc message", "Idle", "WAITING", 0, 0, null, null, -23],
      [1, 8, 9, null, "ACTIVE", "oracle", "dbbigdb01", "oracle@dbbigdb01 (LMS0)", null, "BACKGROUND", "SYS$BACKGROUND", null, null, "gcs remote message", "Idle", "WAITING", 0, 0, null, null, -23],
      [1, 245, 30117, "APP_USER", "INACTIVE", "was01", "wasap01", "JDBC Thin Client", "OrderService", "USER", "APP_SVC", null, "8f2kx7m1qz9ab", "SQL*Net message from client", "Idle", "WAITING", 1820, 1820, null, null, -0.9],
      [1, 512, 4410, "APP_USER", "ACTIVE", "was01", "wasap01", "JDBC Thin Client", "OrderService", "USER", "APP_SVC", "3ab9wz1kq0c5d", "3ab9wz1kq0c5d", "enq: TX - row lock contention", "Application", "WAITING", 1460, 1460, 1, 245, -0.7],
      [1, 733, 18802, "APP_USER", "ACTIVE", "was02", "wasap02", "JDBC Thin Client", "OrderService", "USER", "APP_SVC", "3ab9wz1kq0c5d", "3ab9wz1kq0c5d", "enq: TX - row lock contention", "Application", "WAITING", 905, 905, 1, 245, -0.6],
      [1, 801, 52133, "BATCH_USER", "ACTIVE", "batch", "batchsvr01", "sqlplus@batchsvr01 (TNS V1-V3)", "SETTLE_DAILY", "USER", "BATCH_SVC", "7yq2mm4h0p8xs", "7yq2mm4h0p8xs", "cell smart table scan", "User I/O", "WAITING", 0, 2710, null, null, -0.12],
      [1, 845, 7765, "APP_USER", "ACTIVE", "was01", "wasap01", "JDBC Thin Client", "OrderService", "USER", "APP_SVC", "9cz0d4k2tf1nb", "9cz0d4k2tf1nb", "cell single block physical read", "User I/O", "WAITING", 0, 1, null, null, -0.3],
      [1, 902, 1201, "REPORT_USER", "ACTIVE", "rpt", "rptsvr01", "Toad.exe", "TOAD background query session", "USER", "DBBIG", "5h7tq0wz3k2ma", "5h7tq0wz3k2ma", "cell multiblock physical read", "User I/O", "WAITED SHORT TIME", 0, 640, null, null, -0.05],
      [1, 913, 3374, "SYS", "ACTIVE", "oracle", "dbbigdb01", "sqlplus@dbbigdb01 (TNS V1-V3)", "sqlplus@dbbigdb01 (TNS V1-V3)", "USER", "SYS$USERS", "a1b2c3d4e5f6g", null, "SQL*Net message to client", "Network", "WAITED SHORT TIME", 0, 0, null, null, -0.01],
      [1, 977, 60211, "APP_USER", "INACTIVE", "was02", "wasap02", "JDBC Thin Client", "OrderService", "USER", "APP_SVC", null, "9cz0d4k2tf1nb", "SQL*Net message from client", "Idle", "WAITING", 12, 12, null, null, -0.4],
      [1, 1012, 881, "MON_USER", "INACTIVE", "zabbix", "monsvr01", "python3@monsvr01", "dbmon", "USER", "DBBIG", null, "f0g1h2j3k4l5m", "SQL*Net message from client", "Idle", "WAITING", 55, 55, null, null, -6],
      [1, 1100, 2240, "APP_USER", "ACTIVE", "was01", "wasap01", "JDBC Thin Client", "PaymentService", "USER", "APP_SVC", "2kq8x0v5n3r7p", "2kq8x0v5n3r7p", "log file sync", "Commit", "WAITING", 0, 0, null, null, -0.2],
      [2, 3, 15, null, "ACTIVE", "oracle", "dbbigdb02", "oracle@dbbigdb02 (PMON)", null, "BACKGROUND", "SYS$BACKGROUND", null, null, "pmon timer", "Idle", "WAITING", 2, 0, null, null, -2.3],
      [2, 7, 25, null, "ACTIVE", "oracle", "dbbigdb02", "oracle@dbbigdb02 (LGWR)", null, "BACKGROUND", "SYS$BACKGROUND", null, null, "rdbms ipc message", "Idle", "WAITING", 0, 0, null, null, -2.3],
      [2, 9, 13, null, "ACTIVE", "oracle", "dbbigdb02", "oracle@dbbigdb02 (LMS0)", null, "BACKGROUND", "SYS$BACKGROUND", null, null, "gcs remote message", "Idle", "WAITING", 0, 0, null, null, -2.3],
      [2, 88, 41250, "APP_USER", "ACTIVE", "was03", "wasap03", "JDBC Thin Client", "OrderService", "USER", "APP_SVC", "3ab9wz1kq0c5d", "3ab9wz1kq0c5d", "enq: TX - row lock contention", "Application", "WAITING", 610, 610, 1, 245, -0.5],
      [2, 140, 9932, "APP_USER", "ACTIVE", "was03", "wasap03", "JDBC Thin Client", "OrderService", "USER", "APP_SVC", "9cz0d4k2tf1nb", "9cz0d4k2tf1nb", "gc buffer busy acquire", "Cluster", "WAITING", 0, 0, null, null, -0.5],
      [2, 155, 1771, "APP_USER", "ACTIVE", "was04", "wasap04", "JDBC Thin Client", "OrderService", "USER", "APP_SVC", "9cz0d4k2tf1nb", "9cz0d4k2tf1nb", "gc cr block 2-way", "Cluster", "WAITING", 0, 0, null, null, -0.45],
      [2, 210, 5521, "APP_USER", "ACTIVE", "was04", "wasap04", "JDBC Thin Client", "PaymentService", "USER", "APP_SVC", "2kq8x0v5n3r7p", "2kq8x0v5n3r7p", "log file sync", "Commit", "WAITING", 0, 0, null, null, -0.3],
      [2, 266, 30480, "ETL_USER", "ACTIVE", "etl", "etlsvr01", "ODI Agent", "LOAD_HIST", "USER", "BATCH_SVC", "6mm1n0b8v7c2x", "6mm1n0b8v7c2x", "direct path write temp", "User I/O", "WAITING", 0, 4120, null, null, -0.15],
      [2, 301, 14477, "APP_USER", "INACTIVE", "was03", "wasap03", "JDBC Thin Client", "OrderService", "USER", "APP_SVC", null, "8f2kx7m1qz9ab", "SQL*Net message from client", "Idle", "WAITING", 3, 3, null, null, -0.5],
      [2, 377, 820, "REPORT_USER", "ACTIVE", "rpt", "rptsvr01", "Toad.exe", "TOAD background query session", "USER", "DBBIG", "5h7tq0wz3k2ma", "5h7tq0wz3k2ma", "cell smart table scan", "User I/O", "WAITING", 0, 380, null, null, -0.04],
      [2, 402, 6680, "HR", "INACTIVE", "hruser", "hrpc12", "SQL Developer", "SQL Developer", "USER", "DBBIG", null, "p9o8i7u6y5t4r", "SQL*Net message from client", "Idle", "WAITING", 7300, 7300, null, null, -0.3]];
    ins("GV$SESSION", ["INST_ID", "SADDR", "SID", "SERIAL#", "PADDR", "USERNAME", "STATUS", "OSUSER", "MACHINE", "PROGRAM", "MODULE", "TYPE", "SERVICE_NAME", "SQL_ID", "PREV_SQL_ID", "EVENT", "WAIT_CLASS", "STATE", "SECONDS_IN_WAIT", "LAST_CALL_ET", "BLOCKING_INSTANCE", "BLOCKING_SESSION", "FINAL_BLOCKING_INSTANCE", "FINAL_BLOCKING_SESSION", "LOGON_TIME"],
      SS.map(function (s) {
        var hex = function (n) { return ("00000000A" + (n * 7477 + 1).toString(16).toUpperCase()).slice(-16); };
        return [s[0], hex(s[0] * 10000 + s[1]), s[1], s[2], hex(s[0] * 20000 + s[1]), s[3], s[4], s[5], s[6], s[7], s[8], s[9], s[10], s[11], s[12], s[13], s[14], s[15], s[16], s[17], s[18], s[19], s[18], s[19], T(s[20] * DAY)];
      }));
    db.run("CREATE VIEW V$SESSION AS SELECT SADDR, SID, \"SERIAL#\", PADDR, USERNAME, STATUS, OSUSER, MACHINE, PROGRAM, MODULE, TYPE, SERVICE_NAME, SQL_ID, PREV_SQL_ID, EVENT, WAIT_CLASS, STATE, SECONDS_IN_WAIT, LAST_CALL_ET, BLOCKING_INSTANCE, BLOCKING_SESSION, FINAL_BLOCKING_INSTANCE, FINAL_BLOCKING_SESSION, LOGON_TIME FROM GV$SESSION WHERE INST_ID = 1");
    db.run("CREATE TABLE GV$PROCESS (INST_ID INTEGER, ADDR VARCHAR2(16), PID INTEGER, SPID VARCHAR2(24), PNAME VARCHAR2(5), PROGRAM VARCHAR2(84))");
    var procRows = db.exec("SELECT INST_ID, PADDR, SID, PROGRAM FROM GV$SESSION")[0].values.map(function (r, i) {
      var pn = (String(r[3]).match(/\((\w{4})\)$/) || [])[1] || null;
      return [r[0], r[1], 20 + i, String(184000 + r[2] * 13 + r[0] * 977), pn, r[3]];
    });
    ins("GV$PROCESS", ["INST_ID", "ADDR", "PID", "SPID", "PNAME", "PROGRAM"], procRows);
    db.run("CREATE VIEW V$PROCESS AS SELECT ADDR, PID, SPID, PNAME, PROGRAM FROM GV$PROCESS WHERE INST_ID = 1");

    /* ── SQL ── */
    db.run("CREATE TABLE V$SQL (SQL_ID VARCHAR2(13), CHILD_NUMBER INTEGER, PLAN_HASH_VALUE INTEGER, PARSING_SCHEMA_NAME VARCHAR2(128), MODULE VARCHAR2(64), EXECUTIONS INTEGER, ELAPSED_TIME INTEGER, CPU_TIME INTEGER, BUFFER_GETS INTEGER, DISK_READS INTEGER, ROWS_PROCESSED INTEGER, IO_CELL_OFFLOAD_ELIGIBLE_BYTES INTEGER, IO_INTERCONNECT_BYTES INTEGER, SQL_TEXT VARCHAR2(1000))");
    ins("V$SQL", ["SQL_ID", "CHILD_NUMBER", "PLAN_HASH_VALUE", "PARSING_SCHEMA_NAME", "MODULE", "EXECUTIONS", "ELAPSED_TIME", "CPU_TIME", "BUFFER_GETS", "DISK_READS", "ROWS_PROCESSED", "IO_CELL_OFFLOAD_ELIGIBLE_BYTES", "IO_INTERCONNECT_BYTES", "SQL_TEXT"], [
      ["3ab9wz1kq0c5d", 0, 1293847561, "APP_USER", "OrderService", 182340, 412830000, 98200000, 1823400, 1200, 182340, 0, 0, "UPDATE ORDERS SET STATUS = :B1, UPD_DT = SYSDATE WHERE ORDER_ID = :B2"],
      ["9cz0d4k2tf1nb", 0, 3829104455, "APP_USER", "OrderService", 2450110, 1984500000, 1203300000, 98004400, 4410200, 2450110, 0, 0, "SELECT * FROM ORDER_ITEMS WHERE ORDER_ID = :B1"],
      ["9cz0d4k2tf1nb", 1, 2210938471, "APP_USER", "OrderService", 3120, 2841200000, 402100000, 51230000, 9820000, 3120, 0, 0, "SELECT * FROM ORDER_ITEMS WHERE ORDER_ID = :B1"],
      ["7yq2mm4h0p8xs", 0, 774512093, "BATCH_USER", "SETTLE_DAILY", 1, 2710400000, 640200000, 3502100, 128800400, 15330210, 412000000000, 23800000000, "SELECT /*+ PARALLEL(8) */ ... FROM ORDERS_HIST WHERE ORDER_DT >= TRUNC(SYSDATE)-1"],
      ["5h7tq0wz3k2ma", 0, 1928374650, "REPORT_USER", "TOAD background query session", 3, 1920300000, 1104500000, 22004300, 18200300, 92, 286000000000, 9100000000, "SELECT CUST_ID, SUM(AMOUNT) FROM ORDERS_HIST GROUP BY CUST_ID"],
      ["2kq8x0v5n3r7p", 0, 0, "APP_USER", "PaymentService", 960220, 288100000, 140500000, 4802200, 2300, 960220, 0, 0, "INSERT INTO PAYMENTS VALUES (:B1,:B2,:B3,:B4,SYSDATE)"],
      ["6mm1n0b8v7c2x", 0, 3001928374, "ETL_USER", "LOAD_HIST", 1, 4120700000, 1530200000, 8820100, 33004500, 28800000, 0, 0, "INSERT /*+ APPEND */ INTO ORDERS_HIST SELECT ... ORDER BY ORDER_DT"],
      ["8f2kx7m1qz9ab", 0, 2093847112, "APP_USER", "OrderService", 412300, 98200000, 60100000, 2061500, 900, 412300, 0, 0, "SELECT STATUS FROM ORDERS WHERE ORDER_ID = :B1 FOR UPDATE"],
      ["f0g1h2j3k4l5m", 0, 1772093845, "MON_USER", "dbmon", 86400, 64200000, 61000000, 259200, 0, 1728000, 0, 0, "SELECT INST_ID, COUNT(*) FROM GV$SESSION GROUP BY INST_ID"],
      ["p9o8i7u6y5t4r", 0, 912837465, "HR", "SQL Developer", 12, 3300000, 1200000, 4400, 120, 1320, 0, 0, "SELECT * FROM EMPLOYEES"]]);

    /* ── 리두 로그 ── */
    db.run("CREATE TABLE V$LOG (\"GROUP#\" INTEGER, \"THREAD#\" INTEGER, \"SEQUENCE#\" INTEGER, BYTES INTEGER, MEMBERS INTEGER, ARCHIVED VARCHAR2(3), STATUS VARCHAR2(16), FIRST_TIME DATE)");
    ins("V$LOG", ["GROUP#", "THREAD#", "SEQUENCE#", "BYTES", "MEMBERS", "ARCHIVED", "STATUS", "FIRST_TIME"], [
      [1, 1, 48211, 4 * G, 1, "YES", "INACTIVE", T(-3 * HR)], [2, 1, 48212, 4 * G, 1, "YES", "INACTIVE", T(-2 * HR)], [3, 1, 48213, 4 * G, 1, "YES", "ACTIVE", T(-58 * MIN)], [4, 1, 48214, 4 * G, 1, "NO", "CURRENT", T(-21 * MIN)],
      [5, 2, 9310, 4 * G, 1, "YES", "INACTIVE", T(-9 * HR)], [6, 2, 9311, 4 * G, 1, "YES", "INACTIVE", T(-6 * HR)], [7, 2, 9312, 4 * G, 1, "YES", "INACTIVE", T(-3.5 * HR)], [8, 2, 9313, 4 * G, 1, "NO", "CURRENT", T(-80 * MIN)]]);

    /* ── ASM ── */
    db.run("CREATE TABLE V$ASM_DISKGROUP (GROUP_NUMBER INTEGER, NAME VARCHAR2(30), STATE VARCHAR2(11), TYPE VARCHAR2(6), ALLOCATION_UNIT_SIZE INTEGER, TOTAL_MB INTEGER, FREE_MB INTEGER, REQUIRED_MIRROR_FREE_MB INTEGER, USABLE_FILE_MB INTEGER, OFFLINE_DISKS INTEGER)");
    var dg = function (no, name, total, free, req, off) { return [no, name, "MOUNTED", "HIGH", 4194304, total, free, req, Math.floor((free - req) / 3), off]; };
    ins("V$ASM_DISKGROUP", ["GROUP_NUMBER", "NAME", "STATE", "TYPE", "ALLOCATION_UNIT_SIZE", "TOTAL_MB", "FREE_MB", "REQUIRED_MIRROR_FREE_MB", "USABLE_FILE_MB", "OFFLINE_DISKS"], [
      dg(1, "DATAC1", 7340032, 2902016, 611669, 0), dg(2, "RECOC1", 1835008, 420352, 509132, 0), dg(3, "SPARSEC1", 734003, 650112, 61167, 0)]);

    /* ── RMAN 백업 이력 (최근 14일) ── */
    db.run("CREATE TABLE V$RMAN_BACKUP_JOB_DETAILS (SESSION_KEY INTEGER, INPUT_TYPE VARCHAR2(13), STATUS VARCHAR2(23), START_TIME DATE, END_TIME DATE, ELAPSED_SECONDS INTEGER, INPUT_BYTES INTEGER, OUTPUT_BYTES INTEGER, OUTPUT_DEVICE_TYPE VARCHAR2(17), COMPRESSION_RATIO NUMBER)");
    var bk = [], key = 81200;
    for (var d = 14; d >= 0; d--) {
      var base = day0 - d;
      var dow = new Date(Math.round((base - H.D0) * 86400000)).getUTCDay();
      var isL0 = dow === 0, st = base + 1 * HR + 2 * MIN;
      if (st < now) {
        var el = isL0 ? 15840 + (d % 3) * 420 : 3120 + (d % 5) * 240, status = "COMPLETED";
        if (d === 4) { status = "FAILED"; el = 1490; }
        if (d === 5) status = "COMPLETED WITH WARNINGS";
        var inb = (isL0 ? 9.3e12 : 6.1e11) + d * 3.1e9, outb = status === "FAILED" ? 1.9e11 : Math.round(inb / (isL0 ? 3.2 : 2.6));
        bk.push([key++, "DB INCR", status, st, st + el / 86400, el, Math.round(inb), outb, "SBT_TAPE", Math.round(inb / outb * 100) / 100]);
      }
      [7, 13, 19].forEach(function (h) {
        var s2 = base + h * HR;
        if (s2 < now) {
          var e2 = 380 + ((d * h) % 7) * 35, st2 = (d === 1 && h === 13) ? "FAILED" : "COMPLETED";
          var ib = 1.2e11 + ((d * h) % 9) * 7e9;
          bk.push([key++, "ARCHIVELOG", st2, s2, s2 + e2 / 86400, e2, Math.round(ib), Math.round(ib / 2.1), "SBT_TAPE", 2.1]);
        }
      });
    }
    if (bk.length) {
      var lastArch = bk.filter(function (b) { return b[1] === "ARCHIVELOG"; }).pop();
      if (lastArch && now - lastArch[3] < 6 * HR) { lastArch[2] = "RUNNING"; lastArch[4] = null; lastArch[5] = Math.round((now - lastArch[3]) * 86400); lastArch[7] = null; lastArch[9] = null; }
    }
    ins("V$RMAN_BACKUP_JOB_DETAILS", ["SESSION_KEY", "INPUT_TYPE", "STATUS", "START_TIME", "END_TIME", "ELAPSED_SECONDS", "INPUT_BYTES", "OUTPUT_BYTES", "OUTPUT_DEVICE_TYPE", "COMPRESSION_RATIO"], bk);

    /* ── 패치 이력 ── */
    db.run("CREATE TABLE DBA_REGISTRY_SQLPATCH (INSTALL_ID INTEGER, PATCH_ID INTEGER, PATCH_TYPE VARCHAR2(10), ACTION VARCHAR2(15), STATUS VARCHAR2(25), ACTION_TIME DATE, DESCRIPTION VARCHAR2(100), SOURCE_VERSION VARCHAR2(15), TARGET_VERSION VARCHAR2(15))");
    ins("DBA_REGISTRY_SQLPATCH", ["INSTALL_ID", "PATCH_ID", "PATCH_TYPE", "ACTION", "STATUS", "ACTION_TIME", "DESCRIPTION", "SOURCE_VERSION", "TARGET_VERSION"], [
      [1, 35943157, "RU", "APPLY", "SUCCESS", dv(2024, 3, 11, 15, 2), "Database Release Update : 19.22.0.0.240116", "19.1.0.0.0", "19.22.0.0.0"],
      [2, 36233263, "RU", "APPLY", "WITH ERRORS", dv(2024, 6, 15, 2, 41), "Database Release Update : 19.23.0.0.240416", "19.22.0.0.0", "19.23.0.0.0"],
      [3, 36233263, "RU", "APPLY", "SUCCESS", dv(2024, 6, 15, 3, 18), "Database Release Update : 19.23.0.0.240416", "19.22.0.0.0", "19.23.0.0.0"],
      [4, 36582781, "RU", "APPLY", "SUCCESS", dv(2024, 9, 28, 2, 55), "Database Release Update : 19.24.0.0.240716", "19.23.0.0.0", "19.24.0.0.0"],
      [4, 36414915, "INTERIM", "APPLY", "SUCCESS", dv(2024, 9, 28, 2, 58), "OJVM RELEASE UPDATE: 19.24.0.0.240716", "19.24.0.0.0", "19.24.0.0.0"]]);
  }
  root.DBBIG_SCHEMA = build;
})(typeof window !== "undefined" ? window : globalThis);
