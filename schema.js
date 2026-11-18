/* 디비빅SQL — 실습 스키마 (SCOTT 스키마 + DBBIG 2노드 RAC 가상 딕셔너리 뷰)
   모든 값은 학습용 가상 데이터입니다. 시간 값은 앱을 연 시각(SYSDATE) 기준으로 생성됩니다. */
(function (root) {
  "use strict";
  function build(db, ctx, H) {
    var now = ctx.now, dv = H.dv, DAY = 1, HR = 1 / 24, MIN = 1 / 1440;
    var day0 = Math.floor(now);                   // 오늘 00:00
    function T(rel) { return Math.round((now + rel) * 86400) / 86400; }
    function ins(table, cols, rows) {
      var q = "INSERT INTO " + table + " (" + cols.map(function (c) { return /#|^LIMIT$/.test(c) ? '"' + c + '"' : c; }).join(",") + ") VALUES (" + cols.map(function () { return "?"; }).join(",") + ")";
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

    /* ═════════ v0.1.1 실습 뷰 추가 — 리두·아카이브·FRA·복원지점·Undo·TEMP·휴지통·인덱스·제약조건·통계·리소스 한도 ═════════ */
    function rnd(i) { var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }
    function hod(v) { return (v - Math.floor(v)) * 24; }
    function sec(v) { return Math.round(v * 86400) / 86400; }
    function p2(n) { return (n < 10 ? "0" : "") + n; }
    function fts(v) { var d = new Date(Math.round((v - H.D0) * 86400000)); return d.getUTCFullYear() + "-" + p2(d.getUTCMonth() + 1) + "-" + p2(d.getUTCDate()) + ":" + p2(d.getUTCHours()) + ":" + p2(d.getUTCMinutes()) + ":" + p2(d.getUTCSeconds()); }
    function ymd(v) { return fts(v).slice(0, 10).replace(/-/g, "_"); }

    /* ── 리두 멤버 ── */
    db.run("CREATE TABLE V$LOGFILE (\"GROUP#\" INTEGER, STATUS VARCHAR2(7), TYPE VARCHAR2(7), MEMBER VARCHAR2(513), IS_RECOVERY_DEST_FILE VARCHAR2(3), CON_ID INTEGER)");
    var LF = [], g;
    for (g = 1; g <= 8; g++) LF.push([g, null, "ONLINE", "+DATAC1/DBBIG/ONLINELOG/group_" + g + "." + (270 + g) + ".11631004" + g, "NO", 0]);
    LF.push([3, "INVALID", "ONLINE", "+RECOC1/DBBIG/ONLINELOG/group_3.301.1185012345", "YES", 0]);
    for (g = 11; g <= 20; g++) LF.push([g, null, "STANDBY", "+DATAC1/DBBIG/ONLINELOG/group_" + g + "." + (280 + g) + ".1163100" + (50 + g), "NO", 0]);
    ins("V$LOGFILE", ["GROUP#", "STATUS", "TYPE", "MEMBER", "IS_RECOVERY_DEST_FILE", "CON_ID"], LF);
    db.run("UPDATE V$LOG SET MEMBERS = 2 WHERE \"GROUP#\" = 3");

    /* ── 아카이브 로그 (최근 7일, 로컬 DEST 1 + Standby DEST 2) ── */
    db.run("CREATE TABLE V$ARCHIVED_LOG (RECID INTEGER, NAME VARCHAR2(513), DEST_ID INTEGER, \"THREAD#\" INTEGER, \"SEQUENCE#\" INTEGER, FIRST_TIME DATE, NEXT_TIME DATE, BLOCKS INTEGER, BLOCK_SIZE INTEGER, STANDBY_DEST VARCHAR2(3), ARCHIVED VARCHAR2(3), APPLIED VARCHAR2(9), DELETED VARCHAR2(3), STATUS VARCHAR2(1), COMPLETION_TIME DATE, BACKUP_COUNT INTEGER)");
    var LOGBLK = 4 * G / 512;
    function thr(th, anchors, gap) {
      var out = anchors.slice(), last = anchors[anchors.length - 1], s = last[0], f = last[1], n = 0;
      while (f > now - 7) { var nf = sec(f - gap(hod(f - 0.004), s + n++)); s--; out.push([s, nf, f]); f = nf; }
      return out;
    }
    var TH1 = thr(1, [[48213, T(-58 * MIN), T(-21 * MIN)], [48212, T(-2 * HR), T(-58 * MIN)], [48211, T(-3 * HR), T(-2 * HR)]], function (h, i) {
      return (h >= 1 && h < 4 ? 12 + rnd(i) * 6 : h >= 9 && h < 18 ? 40 + rnd(i) * 30 : 70 + rnd(i) * 40) * MIN; });
    var TH2 = thr(2, [[9312, T(-3.5 * HR), T(-80 * MIN)], [9311, T(-6 * HR), T(-3.5 * HR)], [9310, T(-9 * HR), T(-6 * HR)]], function (h, i) {
      return (h >= 1 && h < 4 ? 20 + rnd(i + 500) * 10 : 150 + rnd(i + 500) * 50) * MIN; });
    var AL = [];
    [[1, TH1, 48211], [2, TH2, 9312]].forEach(function (t) {
      t[1].forEach(function (r) {
        var seqn = r[0], blocks = Math.round(LOGBLK * (0.9 + 0.09 * rnd(seqn * t[0]))), comp = sec(r[2] + (20 + rnd(seqn) * 60) / 86400);
        var del = r[1] < now - 1.5, bc = comp < now - 6 * HR ? (comp < now - 1.5 ? 2 : 1) : 0;
        AL.push([0, del ? null : "+RECOC1/DBBIG/ARCHIVELOG/" + ymd(r[2]) + "/thread_" + t[0] + "_seq_" + seqn + "." + (400 + seqn % 997) + ".1185" + (100000 + seqn % 89999), 1, t[0], seqn, r[1], r[2], blocks, 512, "NO", "YES", "NO", del ? "YES" : "NO", del ? "D" : "A", comp, bc]);
        AL.push([0, "DBBIG_STBY", 2, t[0], seqn, r[1], r[2], blocks, 512, "YES", "YES", seqn >= t[2] ? "NO" : "YES", "NO", "A", sec(comp + 2 / 86400), 0]);
      });
    });
    AL.sort(function (a, b) { return a[14] - b[14] || a[2] - b[2]; });
    AL.forEach(function (r, i) { r[0] = 301200 + i; });
    ins("V$ARCHIVED_LOG", ["RECID", "NAME", "DEST_ID", "THREAD#", "SEQUENCE#", "FIRST_TIME", "NEXT_TIME", "BLOCKS", "BLOCK_SIZE", "STANDBY_DEST", "ARCHIVED", "APPLIED", "DELETED", "STATUS", "COMPLETION_TIME", "BACKUP_COUNT"], AL);

    /* ── FRA / 복원 지점 ── */
    var archUsed = 0, archRec = 0, archN = 0;
    AL.forEach(function (r) { if (r[2] === 1 && r[13] === "A") { var b = r[7] * 512; archUsed += b; archN++; if (r[15] >= 1) archRec += b; } });
    var FRA_LIMIT = 3298534883328, ctlB = 268435456, redoB = 4 * G, bpB = Math.round(2.94 * G), bpRec = Math.round(2.31 * G);
    var fbB = Math.max(40 * G, Math.round(0.97 * 471552 * M) - archUsed - ctlB - redoB - bpB), fbN = Math.ceil(fbB / G);
    var fraUsed = archUsed + ctlB + redoB + bpB + fbB;
    db.run("CREATE TABLE V$RECOVERY_FILE_DEST (NAME VARCHAR2(513), SPACE_LIMIT INTEGER, SPACE_USED INTEGER, SPACE_RECLAIMABLE INTEGER, NUMBER_OF_FILES INTEGER, CON_ID INTEGER)");
    ins("V$RECOVERY_FILE_DEST", ["NAME", "SPACE_LIMIT", "SPACE_USED", "SPACE_RECLAIMABLE", "NUMBER_OF_FILES", "CON_ID"], [["+RECOC1", FRA_LIMIT, fraUsed, archRec + bpRec, archN + 1 + 1 + 14 + fbN, 0]]);
    var pc = function (x) { return Math.round(x / FRA_LIMIT * 10000) / 100; };
    db.run("CREATE TABLE V$RECOVERY_AREA_USAGE (FILE_TYPE VARCHAR2(23), PERCENT_SPACE_USED NUMBER, PERCENT_SPACE_RECLAIMABLE NUMBER, NUMBER_OF_FILES INTEGER, CON_ID INTEGER)");
    ins("V$RECOVERY_AREA_USAGE", ["FILE_TYPE", "PERCENT_SPACE_USED", "PERCENT_SPACE_RECLAIMABLE", "NUMBER_OF_FILES", "CON_ID"], [
      ["CONTROL FILE", pc(ctlB), 0, 1, 0], ["REDO LOG", pc(redoB), 0, 1, 0], ["ARCHIVED LOG", pc(archUsed), pc(archRec), archN, 0], ["BACKUP PIECE", pc(bpB), pc(bpRec), 14, 0],
      ["IMAGE COPY", 0, 0, 0, 0], ["FLASHBACK LOG", pc(fbB), 0, fbN, 0], ["FOREIGN ARCHIVED LOG", 0, 0, 0, 0], ["AUXILIARY DATAFILE COPY", 0, 0, 0, 0]]);
    db.run("CREATE TABLE V$RESTORE_POINT (SCN INTEGER, \"DATABASE_INCARNATION#\" INTEGER, GUARANTEE_FLASHBACK_DATABASE VARCHAR2(3), STORAGE_SIZE INTEGER, TIME DATE, PRESERVED VARCHAR2(3), NAME VARCHAR2(128), PDB_RESTORE_POINT VARCHAR2(3), CON_ID INTEGER)");
    ins("V$RESTORE_POINT", ["SCN", "DATABASE_INCARNATION#", "GUARANTEE_FLASHBACK_DATABASE", "STORAGE_SIZE", "TIME", "PRESERVED", "NAME", "PDB_RESTORE_POINT", "CON_ID"], [
      [98021344512, 2, "YES", fbB, dv(2024, 9, 28, 2, 31, 44), "YES", "BEFORE_RU_1924", "NO", 0],
      [118837265001, 2, "NO", 0, T(-3 * DAY - 2 * HR), "NO", "BEFORE_BATCH_FIX", "NO", 0]]);
    db.run("UPDATE V$DATABASE SET FLASHBACK_ON = 'RESTORE POINT ONLY'");

    /* ── 리소스 한도 ── */
    db.run("CREATE TABLE GV$RESOURCE_LIMIT (INST_ID INTEGER, RESOURCE_NAME VARCHAR2(30), CURRENT_UTILIZATION INTEGER, MAX_UTILIZATION INTEGER, INITIAL_ALLOCATION VARCHAR2(10), LIMIT_VALUE VARCHAR2(10), CON_ID INTEGER)");
    var lp = function (x) { return ("          " + x).slice(-10); };
    ins("GV$RESOURCE_LIMIT", ["INST_ID", "RESOURCE_NAME", "CURRENT_UTILIZATION", "MAX_UTILIZATION", "INITIAL_ALLOCATION", "LIMIT_VALUE", "CON_ID"], [
      [1, "processes", 1712, 1846, lp(2000), lp(2000), 0], [1, "sessions", 1745, 1903, lp(3022), lp(3022), 0], [1, "enqueue_locks", 412, 1688, lp(36296), lp(36296), 0],
      [1, "transactions", 210, 655, lp(3324), lp("UNLIMITED"), 0], [1, "parallel_max_servers", 16, 64, lp(320), lp(32767), 0],
      [2, "processes", 934, 1210, lp(2000), lp(2000), 0], [2, "sessions", 951, 1236, lp(3022), lp(3022), 0], [2, "enqueue_locks", 280, 1102, lp(36296), lp(36296), 0],
      [2, "transactions", 96, 402, lp(3324), lp("UNLIMITED"), 0], [2, "parallel_max_servers", 8, 32, lp(320), lp(32767), 0]]);
    db.run("CREATE VIEW V$RESOURCE_LIMIT AS SELECT RESOURCE_NAME, CURRENT_UTILIZATION, MAX_UTILIZATION, INITIAL_ALLOCATION, LIMIT_VALUE, CON_ID FROM GV$RESOURCE_LIMIT WHERE INST_ID = 1");

    /* ── Undo 통계 (1번 인스턴스, 10분 × 144 = 최근 24시간) ── */
    db.run("CREATE TABLE V$UNDOSTAT (BEGIN_TIME DATE, END_TIME DATE, UNDOTSN INTEGER, UNDOBLKS INTEGER, TXNCOUNT INTEGER, MAXQUERYLEN INTEGER, MAXQUERYID VARCHAR2(13), MAXCONCURRENCY INTEGER, UNXPSTEALCNT INTEGER, EXPSTEALCNT INTEGER, SSOLDERRCNT INTEGER, NOSPACEERRCNT INTEGER, ACTIVEBLKS INTEGER, UNEXPIREDBLKS INTEGER, EXPIREDBLKS INTEGER, TUNED_UNDORETENTION INTEGER)");
    var US = [], b10 = sec(Math.floor(now * 144) / 144), peakDone = false, QIDS = ["3ab9wz1kq0c5d", "9cz0d4k2tf1nb", "8f2kx7m1qz9ab", "5h7tq0wz3k2ma", "7yq2mm4h0p8xs", "6mm1n0b8v7c2x"];
    for (var k = 143; k >= 0; k--) {
      var bt = sec(b10 - k / 144), et = sec(bt + 600 / 86400), hh = hod(bt), batch = hh >= 1 && hh < 4, work = hh >= 9 && hh < 18, err = k === 30 || k === 31;
      var ub = Math.round(batch ? 52000 + rnd(k) * 37000 : work ? 6000 + rnd(k) * 5000 : 1500 + rnd(k) * 2500);
      if (batch && !peakDone) { ub = 90123; peakDone = true; }
      var mq = err ? 14520 - (k - 30) * 600 : Math.round(batch ? 2400 + rnd(k + 7) * 1800 : work ? 300 + rnd(k + 7) * 900 : 120 + rnd(k + 7) * 600);
      var tuned = err ? (k === 31 ? 9120 : 9840) : Math.max(10800, mq + 300 + Math.round(rnd(k + 3) * 900));
      var act = Math.round(ub * (batch ? 2.2 : 0.4)), expd = err ? 0 : Math.round(600000 + rnd(k + 11) * 400000);
      US.push([bt, et, 2, ub, Math.round(batch ? 900 + rnd(k) * 600 : work ? 25000 + rnd(k) * 15000 : 4000 + rnd(k) * 3000), mq, err ? "b7r2kq9wd1x3n" : QIDS[k % QIDS.length],
        Math.round(batch ? 12 + rnd(k) * 28 : work ? 30 + rnd(k) * 50 : 5 + rnd(k) * 10), err ? (k === 31 ? 14 : 22) : 0, 0, err ? (k === 31 ? 1 : 2) : 0, 0, act, 3932160 - expd - act - 50000, expd, tuned]);
    }
    ins("V$UNDOSTAT", ["BEGIN_TIME", "END_TIME", "UNDOTSN", "UNDOBLKS", "TXNCOUNT", "MAXQUERYLEN", "MAXQUERYID", "MAXCONCURRENCY", "UNXPSTEALCNT", "EXPSTEALCNT", "SSOLDERRCNT", "NOSPACEERRCNT", "ACTIVEBLKS", "UNEXPIREDBLKS", "EXPIREDBLKS", "TUNED_UNDORETENTION"], US);

    /* ── TEMP 사용 ── */
    db.run("CREATE TABLE GV$TEMPSEG_USAGE (INST_ID INTEGER, USERNAME VARCHAR2(128), SESSION_ADDR VARCHAR2(16), SESSION_NUM INTEGER, SQL_ID VARCHAR2(13), TABLESPACE VARCHAR2(31), CONTENTS VARCHAR2(9), SEGTYPE VARCHAR2(9), EXTENTS INTEGER, BLOCKS INTEGER, CON_ID INTEGER)");
    var sessAt = {};
    db.exec("SELECT INST_ID, SID, SADDR, \"SERIAL#\", USERNAME, SQL_ID FROM GV$SESSION")[0].values.forEach(function (r) { sessAt[r[0] + ":" + r[1]] = r; });
    var TU = [[2, 266, "SORT", 5242880], [1, 902, "HASH", 1572864], [2, 377, "HASH", 786432], [1, 801, "SORT", 262144], [1, 801, "HASH", 393216], [1, 845, "SORT", 128]];
    ins("GV$TEMPSEG_USAGE", ["INST_ID", "USERNAME", "SESSION_ADDR", "SESSION_NUM", "SQL_ID", "TABLESPACE", "CONTENTS", "SEGTYPE", "EXTENTS", "BLOCKS", "CON_ID"], TU.map(function (t) {
      var s = sessAt[t[0] + ":" + t[1]]; return [t[0], s[4], s[2], s[3], s[5], "TEMP", "TEMPORARY", t[2], Math.max(1, t[3] / 128), t[3], 0]; }));
    db.run("CREATE VIEW V$TEMPSEG_USAGE AS SELECT USERNAME, SESSION_ADDR, SESSION_NUM, SQL_ID, TABLESPACE, CONTENTS, SEGTYPE, EXTENTS, BLOCKS, CON_ID FROM GV$TEMPSEG_USAGE WHERE INST_ID = 1");

    /* ── 휴지통 ── */
    db.run("CREATE TABLE DBA_RECYCLEBIN (OWNER VARCHAR2(128), OBJECT_NAME VARCHAR2(128), ORIGINAL_NAME VARCHAR2(128), OPERATION VARCHAR2(9), TYPE VARCHAR2(25), TS_NAME VARCHAR2(30), CREATETIME VARCHAR2(19), DROPTIME VARCHAR2(19), DROPSCN INTEGER, PARTITION_NAME VARCHAR2(128), CAN_UNDROP VARCHAR2(3), CAN_PURGE VARCHAR2(3), RELATED INTEGER, BASE_OBJECT INTEGER, PURGE_OBJECT INTEGER, SPACE INTEGER)");
    var RB = [ // owner, bin name, original, type, ts, created, dropped, undrop, related/base, purge_obj, blocks
      ["APP_OWNER", "BIN$Kx1zQ0pTRk6bVw2d8mN4aQ==$0", "ORDERS_BAK_20241101", "TABLE", "APP_DATA", dv(2024, 11, 1, 22, 10, 5), T(-40 * DAY - 3 * HR), "YES", 91201, 91201, 196608],
      ["APP_OWNER", "BIN$Pq8rT2vYQ0Gm3c1x7kL9bA==$0", "IX_ORDERS_BAK_01", "NORMAL INDEX", "APP_DATA", dv(2024, 11, 1, 22, 31, 40), T(-40 * DAY - 3 * HR), "NO", 91201, 91202, 32768],
      ["APP_OWNER", "BIN$Zr4mW8nXR2ukP1s6aT0hcQ==$0", "ORDER_ITEMS_TMP", "TABLE", "APP_DATA", T(-6 * DAY - 5 * HR), T(-0.2 * DAY), "YES", 93310, 93310, 32768],
      ["APP_OWNER", "BIN$Hn2qL5yVS9eJ4d7b0wR3fg==$0", "PK_ORDER_ITEMS_TMP", "NORMAL INDEX", "APP_DATA", T(-6 * DAY - 5 * HR), T(-0.2 * DAY), "NO", 93310, 93311, 8192],
      ["ETL_USER", "BIN$Ab3cD4eFG5hI6jK7lM8nOw==$0", "STG_ORDERS", "TABLE", "HIST_DATA", T(-0.9 * DAY), T(-0.5 * DAY), "YES", 95120, 95120, 393216],
      ["ETL_USER", "BIN$Qw1eR2tYU3iO4pA5sD6fGg==$0", "STG_ORDERS", "TABLE", "HIST_DATA", T(-1.9 * DAY), T(-1.5 * DAY), "YES", 95044, 95044, 380928],
      ["ETL_USER", "BIN$Zx9cV8bNM7lK6jH5gF4dSa==$0", "STG_ORDERS", "TABLE", "HIST_DATA", T(-2.9 * DAY), T(-2.5 * DAY), "YES", 94970, 94970, 401408],
      ["HR", "BIN$Lp0oK9iJU8hY7gT6fR5eDw==$0", "EMP_BACKUP", "TABLE", "USERS", dv(2025, 3, 2, 10, 0, 0), T(-200 * DAY), "YES", 88012, 88012, 1024]];
    ins("DBA_RECYCLEBIN", ["OWNER", "OBJECT_NAME", "ORIGINAL_NAME", "OPERATION", "TYPE", "TS_NAME", "CREATETIME", "DROPTIME", "DROPSCN", "PARTITION_NAME", "CAN_UNDROP", "CAN_PURGE", "RELATED", "BASE_OBJECT", "PURGE_OBJECT", "SPACE"],
      RB.map(function (r, i) { return [r[0], r[1], r[2], "DROP", r[3], r[4], fts(r[5]), fts(r[6]), 118800000000 + Math.round((r[6] - dv(2026, 1, 1)) * 2.1e5) + i, null, r[7], "YES", r[8], r[8], r[9], r[10]]; }));

    /* ── 인덱스 · 제약조건 · 통계 (APP_OWNER) ── */
    ins("DBA_SEGMENTS", ["OWNER", "SEGMENT_NAME", "PARTITION_NAME", "SEGMENT_TYPE", "TABLESPACE_NAME", "BYTES", "BLOCKS", "EXTENTS"], [
      ["APP_OWNER", "PK_CUSTOMERS", null, "INDEX", "APP_DATA", 192 * M, 192 * 128, 24], ["APP_OWNER", "PK_PRODUCTS", null, "INDEX", "APP_DATA", 2 * M, 256, 1]]);
    db.run("CREATE TABLE DBA_INDEXES (OWNER VARCHAR2(128), INDEX_NAME VARCHAR2(128), INDEX_TYPE VARCHAR2(27), TABLE_OWNER VARCHAR2(128), TABLE_NAME VARCHAR2(128), UNIQUENESS VARCHAR2(9), TABLESPACE_NAME VARCHAR2(30), STATUS VARCHAR2(8), PARTITIONED VARCHAR2(3), VISIBILITY VARCHAR2(9), BLEVEL INTEGER, LEAF_BLOCKS INTEGER, DISTINCT_KEYS INTEGER, CLUSTERING_FACTOR INTEGER, NUM_ROWS INTEGER, LAST_ANALYZED DATE)");
    var IX = [ // name, table, unique, ts, status, blevel, leaf, distinct, cf, rows, analyzed(rel days), cols
      ["PK_ORDERS", "ORDERS", "UNIQUE", "APP_IDX", "VALID", 3, 540000, 180000000, 2701330, 180000000, -9, ["ORDER_ID"]],
      ["IX_ORDERS_01", "ORDERS", "NONUNIQUE", "APP_IDX", "VALID", 3, 720000, 179500000, 160233871, 180000000, -9, ["CUST_ID", "ORDER_DT"]],
      ["PK_ORDER_ITEMS", "ORDER_ITEMS", "UNIQUE", "APP_IDX", "VALID", 3, 1100000, 520000000, 5208771, 520000000, -2, ["ORDER_ID", "ITEM_NO"]],
      ["IX_ORDER_ITEMS_01", "ORDER_ITEMS", "NONUNIQUE", "APP_IDX", "VALID", 3, 1350000, 48000, 410552013, 520000000, -2, ["PRODUCT_ID"]],
      ["IX_PAYMENTS_01", "PAYMENTS", "NONUNIQUE", "APP_IDX", "VALID", 2, 180000, 95000000, 1702210, 95000000, -120, ["PAY_DT", "ORDER_ID"]],
      ["PK_CUSTOMERS", "CUSTOMERS", "UNIQUE", "APP_DATA", "VALID", 2, 21000, 12000000, 380412, 12000000, -2, ["CUST_ID"]],
      ["PK_PRODUCTS", "PRODUCTS", "UNIQUE", "APP_DATA", "VALID", 1, 120, 48000, 2911, 48000, -30, ["PRODUCT_ID"]],
      ["IX_ORDERS_HIST_G01", "ORDERS_HIST", "NONUNIQUE", "HIST_DATA", "UNUSABLE", 3, 2100000, 1520000000, 30110222, 1520000000, -1, ["ORDER_ID"]],
      ["IX_BATCH_LOG_01", "BATCH_LOG", "NONUNIQUE", "USERS", "UNUSABLE", 1, 60, 15000, 15210, 15000, -200, ["RUN_DT"]]];
    ins("DBA_INDEXES", ["OWNER", "INDEX_NAME", "INDEX_TYPE", "TABLE_OWNER", "TABLE_NAME", "UNIQUENESS", "TABLESPACE_NAME", "STATUS", "PARTITIONED", "VISIBILITY", "BLEVEL", "LEAF_BLOCKS", "DISTINCT_KEYS", "CLUSTERING_FACTOR", "NUM_ROWS", "LAST_ANALYZED"],
      IX.map(function (x) { return ["APP_OWNER", x[0], "NORMAL", "APP_OWNER", x[1], x[2], x[3], x[4], "NO", "VISIBLE", x[5], x[6], x[7], x[8], x[9], sec(day0 + x[10] + 22 * HR + 7 * MIN)]; }));
    db.run("CREATE TABLE DBA_IND_COLUMNS (INDEX_OWNER VARCHAR2(128), INDEX_NAME VARCHAR2(128), TABLE_OWNER VARCHAR2(128), TABLE_NAME VARCHAR2(128), COLUMN_NAME VARCHAR2(4000), COLUMN_POSITION INTEGER, DESCEND VARCHAR2(4))");
    var IC = [];
    IX.forEach(function (x) { x[11].forEach(function (c, i) { IC.push(["APP_OWNER", x[0], "APP_OWNER", x[1], c, i + 1, "ASC"]); }); });
    ins("DBA_IND_COLUMNS", ["INDEX_OWNER", "INDEX_NAME", "TABLE_OWNER", "TABLE_NAME", "COLUMN_NAME", "COLUMN_POSITION", "DESCEND"], IC);
    db.run("CREATE TABLE DBA_CONSTRAINTS (OWNER VARCHAR2(128), CONSTRAINT_NAME VARCHAR2(128), CONSTRAINT_TYPE VARCHAR2(1), TABLE_NAME VARCHAR2(128), R_OWNER VARCHAR2(128), R_CONSTRAINT_NAME VARCHAR2(128), DELETE_RULE VARCHAR2(9), STATUS VARCHAR2(8), VALIDATED VARCHAR2(13), INDEX_NAME VARCHAR2(128))");
    db.run("CREATE TABLE DBA_CONS_COLUMNS (OWNER VARCHAR2(128), CONSTRAINT_NAME VARCHAR2(128), TABLE_NAME VARCHAR2(128), COLUMN_NAME VARCHAR2(4000), POSITION INTEGER)");
    var CN = [ // name, type, table, r_cons, delete_rule, index, cols
      ["PK_ORDERS", "P", "ORDERS", null, null, "PK_ORDERS", ["ORDER_ID"]], ["PK_ORDER_ITEMS", "P", "ORDER_ITEMS", null, null, "PK_ORDER_ITEMS", ["ORDER_ID", "ITEM_NO"]],
      ["PK_CUSTOMERS", "P", "CUSTOMERS", null, null, "PK_CUSTOMERS", ["CUST_ID"]], ["PK_PRODUCTS", "P", "PRODUCTS", null, null, "PK_PRODUCTS", ["PRODUCT_ID"]],
      ["FK_ORDERS_CUST", "R", "ORDERS", "PK_CUSTOMERS", "NO ACTION", null, ["CUST_ID"]], ["FK_ITEMS_ORDER", "R", "ORDER_ITEMS", "PK_ORDERS", "CASCADE", null, ["ORDER_ID"]],
      ["FK_ITEMS_PROD", "R", "ORDER_ITEMS", "PK_PRODUCTS", "NO ACTION", null, ["PRODUCT_ID"]], ["FK_PAY_ORDER", "R", "PAYMENTS", "PK_ORDERS", "NO ACTION", null, ["ORDER_ID"]],
      ["FK_HIST_CUST", "R", "ORDERS_HIST", "PK_CUSTOMERS", "NO ACTION", null, ["CUST_ID"]],
      ["CK_ORDERS_STATUS", "C", "ORDERS", null, null, null, ["STATUS"]], ["SYS_C0012871", "C", "ORDERS", null, null, null, ["ORDER_DT"]], ["SYS_C0012904", "C", "PAYMENTS", null, null, null, ["ORDER_ID"]]];
    ins("DBA_CONSTRAINTS", ["OWNER", "CONSTRAINT_NAME", "CONSTRAINT_TYPE", "TABLE_NAME", "R_OWNER", "R_CONSTRAINT_NAME", "DELETE_RULE", "STATUS", "VALIDATED", "INDEX_NAME"],
      CN.map(function (c) { return ["APP_OWNER", c[0], c[1], c[2], c[3] ? "APP_OWNER" : null, c[3], c[4], "ENABLED", "VALIDATED", c[5]]; }));
    var CC = [];
    CN.forEach(function (c) { c[6].forEach(function (col, i) { CC.push(["APP_OWNER", c[0], c[2], col, c[1] === "C" ? null : i + 1]); }); });
    ins("DBA_CONS_COLUMNS", ["OWNER", "CONSTRAINT_NAME", "TABLE_NAME", "COLUMN_NAME", "POSITION"], CC);
    db.run("CREATE TABLE DBA_TAB_STATISTICS (OWNER VARCHAR2(128), TABLE_NAME VARCHAR2(128), PARTITION_NAME VARCHAR2(128), PARTITION_POSITION INTEGER, OBJECT_TYPE VARCHAR2(12), NUM_ROWS INTEGER, BLOCKS INTEGER, AVG_ROW_LEN INTEGER, LAST_ANALYZED DATE, STALE_STATS VARCHAR2(7), STATTYPE_LOCKED VARCHAR2(5))");
    var TSx = [ // owner, table, part, pos, type, rows, blocks, avglen, analyzed(rel days|null), stale, locked
      ["APP_OWNER", "ORDERS", null, null, "TABLE", 180000000, 2752512, 112, -9, "YES", null], ["APP_OWNER", "ORDER_ITEMS", null, null, "TABLE", 520000000, 4980736, 70, -2, "NO", null],
      ["APP_OWNER", "CUSTOMERS", null, null, "TABLE", 12000000, 393216, 210, -2, "NO", null], ["APP_OWNER", "PAYMENTS", null, null, "TABLE", null, null, null, null, null, null],
      ["APP_OWNER", "PRODUCTS", null, null, "TABLE", 48000, 32768, 380, -30, "NO", null], ["APP_OWNER", "ORDERS_HIST", null, null, "TABLE", 1520000000, 58720256, 260, -1, "NO", null],
      ["APP_OWNER", "ORDERS_HIST", "P202409", 1, "PARTITION", 290000000, 11796480, 258, -1, "NO", null], ["APP_OWNER", "ORDERS_HIST", "P202410", 2, "PARTITION", 310000000, 12582912, 259, -1, "NO", null],
      ["APP_OWNER", "ORDERS_HIST", "P202411", 3, "PARTITION", 322000000, 13107200, 260, -1, "NO", null], ["APP_OWNER", "ORDERS_HIST", "P202412", 4, "PARTITION", 351000000, 14286848, 261, -1, "NO", null],
      ["APP_OWNER", "ORDERS_HIST", "P202501", 5, "PARTITION", 98000000, 6946816, 262, -31, "YES", null], ["APP_OWNER", "BATCH_LOG", null, null, "TABLE", 15000, 15360, 96, -200, "YES", "ALL"],
      ["HR", "EMPLOYEES", null, null, "TABLE", 107, 5, 69, -60, "NO", null]];
    ins("DBA_TAB_STATISTICS", ["OWNER", "TABLE_NAME", "PARTITION_NAME", "PARTITION_POSITION", "OBJECT_TYPE", "NUM_ROWS", "BLOCKS", "AVG_ROW_LEN", "LAST_ANALYZED", "STALE_STATS", "STATTYPE_LOCKED"],
      TSx.map(function (t) { return [t[0], t[1], t[2], t[3], t[4], t[5], t[6], t[7], t[8] === null ? null : sec(day0 + t[8] + 22 * HR + 14 * MIN), t[9], t[10]]; }));

    /* ═════════ v0.1.3 실습 뷰 추가 — 알림 로그·스케줄러·Data Pump·장기 작업·대기 이벤트·프로파일·감사·ASM 디스크·AWR ═════════ */
    function q1(sql) { var r = db.exec(sql); return r.length ? r[0].values : []; }

    /* ── 알림 로그 (V$DIAG_ALERT_EXT, 1번 인스턴스) ── */
    db.run("CREATE TABLE V$DIAG_ALERT_EXT (RECORD_ID INTEGER, ORIGINATING_TIMESTAMP DATE, COMPONENT_ID VARCHAR2(64), HOST_ID VARCHAR2(64), MESSAGE_TYPE INTEGER, MESSAGE_LEVEL INTEGER, PROBLEM_KEY VARCHAR2(550), MESSAGE_TEXT VARCHAR2(2048), CON_ID INTEGER)");
    var AX = [], TR = "/u01/app/oracle/diag/rdbms/dbbig/DBBIG1/trace/";
    function ax(t, typ, lvl, txt, pk) { AX.push([0, sec(t), "rdbms", "dbadm01", typ, lvl, pk || null, txt, 0]); }
    q1("SELECT \"SEQUENCE#\", FIRST_TIME FROM V$ARCHIVED_LOG WHERE DEST_ID = 1 AND \"THREAD#\" = 1 AND FIRST_TIME >= " + (now - 2) + " ORDER BY 1").forEach(function (r, i) {
      var h = hod(r[1]);
      if (h >= 1 && h < 4 && i % 4 === 1) { ax(r[1] - 40 / 86400, 5, 16, "Thread 1 cannot allocate new log, sequence " + (r[0] + 1)); ax(r[1] - 40 / 86400, 5, 16, "Checkpoint not complete"); }
      ax(r[1] + 1 / 86400, 5, 16, "Thread 1 advanced to log sequence " + (r[0] + 1) + " (LGWR switch)");
    });
    q1("SELECT BEGIN_TIME, MAXQUERYLEN FROM V$UNDOSTAT WHERE SSOLDERRCNT > 0 ORDER BY 1").forEach(function (r, i) {
      ax(r[0] + 7 * MIN, 3, 1, "ORA-01555 caused by SQL statement below (SQL ID: b7r2kq9wd1x3n, Query Duration=" + r[1] + " sec, SCN: 0x00000001bd4c2" + (2 + i) + "f1):");
    });
    ax(T(-7 * HR), 3, 1, "ORA-00060: Deadlock detected. See Note 60.1 at My Oracle Support for Troubleshooting ORA-60 Errors. More info in file " + TR + "DBBIG1_ora_28817.trc.");
    ax(day0 - 3 + 5 * HR + 12 * MIN + 31 / 86400, 3, 1, "ORA-00060: Deadlock detected. See Note 60.1 at My Oracle Support for Troubleshooting ORA-60 Errors. More info in file " + TR + "DBBIG1_ora_11402.trc.");
    var y1652 = day0 - 1 + 2 * HR + 41 * MIN + 5 / 86400;
    ax(y1652, 3, 1, "ORA-1652: unable to extend temp segment by 128 in tablespace TEMP");
    ax(y1652 + 2 / 86400, 3, 1, "Errors in file " + TR + "DBBIG1_j001_40112.trc:");
    ax(y1652 + 2 / 86400, 3, 1, "ORA-12012: error on auto execute of job \"ETL_USER\".\"JOB_LOAD_ORDERS\"");
    ax(y1652 + 2 / 86400, 3, 1, "ORA-01652: unable to extend temp segment by 128 in tablespace TEMP");
    ax(day0 - 4 + 2 * HR + 37 * MIN + 12 / 86400, 3, 1, "ORA-1652: unable to extend temp segment by 128 in tablespace TEMP");
    var t600 = T(-30 * HR);
    ax(t600, 2, 1, "Errors in file " + TR + "DBBIG1_ora_19934.trc  (incident=48121):", "ORA 600 [kdsgrp1]");
    ax(t600, 2, 1, "ORA-00600: internal error code, arguments: [kdsgrp1], [], [], [], [], [], [], [], [], [], [], []", "ORA 600 [kdsgrp1]");
    ax(t600 + 1 / 86400, 2, 1, "Incident details in: /u01/app/oracle/diag/rdbms/dbbig/DBBIG1/incident/incdir_48121/DBBIG1_ora_19934_i48121.trc", "ORA 600 [kdsgrp1]");
    [T(-26 * HR), T(-5 * HR - 13 * MIN)].forEach(function (t, i) {
      ax(t, 5, 16, "Resize operation completed for file# 11, fname +DATAC1/DBBIG/DATAFILE/hist_data.266.1163187109, old size " + (838860800 + i * 131072) + "K, new size " + (838991872 + i * 131072) + "K");
    });
    AX.sort(function (a, b) { return a[1] - b[1]; });
    AX.forEach(function (r, i) { r[0] = 880100 + i; });
    ins("V$DIAG_ALERT_EXT", ["RECORD_ID", "ORIGINATING_TIMESTAMP", "COMPONENT_ID", "HOST_ID", "MESSAGE_TYPE", "MESSAGE_LEVEL", "PROBLEM_KEY", "MESSAGE_TEXT", "CON_ID"], AX);

    /* ── 스케줄러 잡 실행 이력 ── */
    db.run("CREATE TABLE DBA_SCHEDULER_JOB_RUN_DETAILS (LOG_ID INTEGER, LOG_DATE DATE, OWNER VARCHAR2(128), JOB_NAME VARCHAR2(261), STATUS VARCHAR2(30), \"ERROR#\" INTEGER, REQ_START_DATE DATE, ACTUAL_START_DATE DATE, RUN_DURATION VARCHAR2(20), INSTANCE_ID INTEGER, SESSION_ID VARCHAR2(128), ADDITIONAL_INFO VARCHAR2(4000))");
    function dur(m) { var s = Math.round(m * 60), h = Math.floor(s / 3600), mi = Math.floor(s % 3600 / 60), ss = s % 60; return "+000 " + p2(h) + ":" + p2(mi) + ":" + p2(ss); }
    var JR = [];
    function jr(owner, name, start, mins, status, err, inst, sess, info) {
      var st = sec(start), end = sec(start + mins * MIN);
      if (end < now) JR.push([0, end, owner, name, status, err, sec(st - 2 / 86400), st, dur(mins), inst, sess, info || null]);
    }
    for (var dd = 8; dd >= 0; dd--) {
      var base = day0 - dd;
      jr("ETL_USER", "JOB_LOAD_ORDERS", base + 2 * HR + 3 / 86400, dd === 1 ? 41 : 38 + rnd(dd + 40) * 8, dd === 1 ? "FAILED" : "SUCCEEDED", dd === 1 ? 1652 : 0, 1, (1180 + dd) + "," + (30470 + dd),
        dd === 1 ? "ORA-01652: unable to extend temp segment by 128 in tablespace TEMP" : null);
      jr("APP_OWNER", "JOB_DAILY_SETTLE", base + 5 * HR + 1 / 86400, dd === 3 ? 12.5 : 10 + rnd(dd + 60) * 5, dd === 3 ? "FAILED" : "SUCCEEDED", dd === 3 ? 60 : 0, 1, (700 + dd) + "," + (11000 + dd),
        dd === 3 ? "ORA-00060: deadlock detected while waiting for resource" : null);
      [0, 6, 12, 18].forEach(function (hh) { jr("APP_OWNER", "JOB_PURGE_LOG", base + hh * HR + 2 / 86400, 1.5 + rnd(dd * 4 + hh) * 2, "SUCCEEDED", 0, 1, (650 + hh) + "," + (9000 + dd), null); });
      jr("SYS", "ORA$AT_OS_OPT_SY_" + (11200 + 8 - dd), base - 2 * HR + 4 / 86400, dd === 2 ? 240 : 25 + rnd(dd + 80) * 35, dd === 2 ? "STOPPED" : "SUCCEEDED", 0, 1, (330 + dd) + "," + (5100 + dd),
        dd === 2 ? "REASON=\"Stop job called because associated window was closed\"" : null);
    }
    JR.sort(function (a, b) { return a[1] - b[1]; });
    JR.forEach(function (r, i) { r[0] = 1904100 + i; });
    ins("DBA_SCHEDULER_JOB_RUN_DETAILS", ["LOG_ID", "LOG_DATE", "OWNER", "JOB_NAME", "STATUS", "ERROR#", "REQ_START_DATE", "ACTUAL_START_DATE", "RUN_DURATION", "INSTANCE_ID", "SESSION_ID", "ADDITIONAL_INFO"], JR);

    /* ── Data Pump 작업 + 마스터 테이블 ── */
    db.run("CREATE TABLE DBA_DATAPUMP_JOBS (OWNER_NAME VARCHAR2(128), JOB_NAME VARCHAR2(128), OPERATION VARCHAR2(128), JOB_MODE VARCHAR2(128), STATE VARCHAR2(30), DEGREE INTEGER, ATTACHED_SESSIONS INTEGER, DATAPUMP_SESSIONS INTEGER)");
    ins("DBA_DATAPUMP_JOBS", ["OWNER_NAME", "JOB_NAME", "OPERATION", "JOB_MODE", "STATE", "DEGREE", "ATTACHED_SESSIONS", "DATAPUMP_SESSIONS"], [
      ["SYSTEM", "SYS_EXPORT_SCHEMA_01", "EXPORT", "SCHEMA", "NOT RUNNING", 0, 0, 0], ["SYSTEM", "SYS_EXPORT_FULL_01", "EXPORT", "FULL", "NOT RUNNING", 0, 0, 0],
      ["SYSTEM", "SYS_EXPORT_SCHEMA_02", "EXPORT", "SCHEMA", "IDLING", 8, 1, 1], ["ETL_USER", "SYS_IMPORT_TABLE_01", "IMPORT", "TABLE", "EXECUTING", 4, 1, 6]]);
    ins("DBA_OBJECTS", ["OWNER", "OBJECT_NAME", "OBJECT_TYPE", "STATUS", "CREATED", "LAST_DDL_TIME"], [
      ["SYSTEM", "SYS_EXPORT_SCHEMA_01", "TABLE", "VALID", dv(2025, 9, 14, 21, 3, 11), dv(2025, 9, 14, 21, 40, 2)], ["SYSTEM", "SYS_EXPORT_FULL_01", "TABLE", "VALID", dv(2026, 3, 2, 23, 10, 45), dv(2026, 3, 3, 1, 2, 9)],
      ["SYSTEM", "SYS_EXPORT_SCHEMA_02", "TABLE", "VALID", T(-6 * HR), T(-5 * HR)], ["ETL_USER", "SYS_IMPORT_TABLE_01", "TABLE", "VALID", T(-95 * MIN), T(-3 * MIN)]]);

    /* ── 장기 작업 진행률 (1번 인스턴스) ── */
    db.run("CREATE TABLE V$SESSION_LONGOPS (SID INTEGER, \"SERIAL#\" INTEGER, OPNAME VARCHAR2(64), TARGET VARCHAR2(64), TARGET_DESC VARCHAR2(32), SOFAR INTEGER, TOTALWORK INTEGER, UNITS VARCHAR2(32), START_TIME DATE, LAST_UPDATE_TIME DATE, TIME_REMAINING INTEGER, ELAPSED_SECONDS INTEGER, MESSAGE VARCHAR2(512), SQL_ID VARCHAR2(13))");
    var LO = [ // sid, serial, opname, target, desc, sofar, total, units, startRelMin, remainSec, sql_id
      [1203, 41107, "RMAN: aggregate input", "backup", "Set Count 50211", 15728640, 25456000, "Blocks", -52, 1980, "4zu9mmr7kq1t0"],
      [1203, 41107, "RMAN: aggregate output", "backup", "Set Count 50211", 3102400, 3102400, "Blocks", -52, 0, "4zu9mmr7kq1t0"],
      [1210, 52219, "RMAN: full datafile backup", "Set Count 50211", "datafile", 4128768, 6656000, "Blocks", -50, 1844, "gd7g0a2t9kx1s"],
      [1217, 50310, "RMAN: full datafile backup", "Set Count 50212", "datafile", 2621440, 6400000, "Blocks", -50, 4330, "gd7g0a2t9kx1s"],
      [1224, 47781, "RMAN: full datafile backup", "Set Count 50209", "datafile", 5242880, 5242880, "Blocks", -50, 0, "gd7g0a2t9kx1s"],
      [1231, 48802, "RMAN: full datafile backup", "Set Count 50213", "datafile", 5632000, 6400000, "Blocks", -50, 410, "gd7g0a2t9kx1s"],
      [1290, 22091, "SYS_IMPORT_TABLE_01", "ETL_USER", "IMPORT", 18234, 40960, "MB", -95, 7020, "9pq2x0wmb4r7c"],
      [902, 1201, "Table Scan", "APP_OWNER.ORDERS_HIST", "table", 2100000, 6000000, "Blocks", -18, 2010, "5h7tq0wz3k2ma"],
      [902, 1201, "Hash Join", null, null, 120000, 120000, "Blocks", -25, 0, "5h7tq0wz3k2ma"]];
    ins("V$SESSION_LONGOPS", ["SID", "SERIAL#", "OPNAME", "TARGET", "TARGET_DESC", "SOFAR", "TOTALWORK", "UNITS", "START_TIME", "LAST_UPDATE_TIME", "TIME_REMAINING", "ELAPSED_SECONDS", "MESSAGE", "SQL_ID"], LO.map(function (o) {
      var st = T(o[8] * MIN), done = o[5] === o[6], el = Math.round((now - st) * 86400) - (done ? 300 : 0);
      return [o[0], o[1], o[2], o[3], o[4], o[5], o[6], o[7], st, done ? T(-5 * MIN) : T(-3 / 1440 / 20), o[9], el, o[2] + ": " + (o[3] ? o[3] + ": " : "") + o[5] + " out of " + o[6] + " " + o[7] + " done", o[10]]; }));

    /* ── 대기 이벤트 누적 (1번 인스턴스, 기동 이후) ── */
    db.run("CREATE TABLE V$SYSTEM_EVENT (EVENT VARCHAR2(64), TOTAL_WAITS INTEGER, TOTAL_TIMEOUTS INTEGER, TIME_WAITED INTEGER, AVERAGE_WAIT NUMBER, TIME_WAITED_MICRO INTEGER, WAIT_CLASS VARCHAR2(64))");
    var SE = [ // event, waits, avg_ms, class
      ["SQL*Net message from client", 9.8e9, 4.1, "Idle"], ["rdbms ipc message", 2.2e9, 290, "Idle"], ["Space Manager: slave idle wait", 1.6e7, 5000, "Idle"], ["pmon timer", 1.7e6, 3000, "Idle"],
      ["cell single block physical read", 1.9e9, 0.28, "User I/O"], ["log file sync", 3.1e8, 0.9, "Commit"], ["cell multiblock physical read", 2.2e8, 1.0, "User I/O"],
      ["log file parallel write", 2.9e8, 0.6, "System I/O"], ["enq: TX - row lock contention", 2.1e5, 820, "Application"], ["gc cr block 2-way", 1.1e9, 0.12, "Cluster"],
      ["resmgr:cpu quantum", 4.1e6, 24, "Scheduler"], ["db file parallel write", 1.2e8, 0.8, "System I/O"], ["gc current block 2-way", 6.0e8, 0.15, "Cluster"],
      ["cell smart table scan", 4.2e7, 2.1, "User I/O"], ["direct path read", 3.3e7, 1.1, "User I/O"], ["direct path write temp", 9.8e6, 2.3, "User I/O"],
      ["cursor: pin S wait on X", 1.1e5, 12, "Concurrency"], ["library cache: mutex X", 2.5e6, 0.5, "Concurrency"], ["log file switch (checkpoint incomplete)", 1240, 820, "Configuration"],
      ["control file sequential read", 5.4e7, 0.21, "System I/O"]];
    ins("V$SYSTEM_EVENT", ["EVENT", "TOTAL_WAITS", "TOTAL_TIMEOUTS", "TIME_WAITED", "AVERAGE_WAIT", "TIME_WAITED_MICRO", "WAIT_CLASS"], SE.map(function (e, i) {
      var w = Math.round(e[1] * (1 + rnd(i + 900) * 0.05)), micro = Math.round(w * e[2] * 1000 * (1 + rnd(i + 950) * 0.04)), cs = Math.round(micro / 10000);
      return [e[0], w, e[3] === "Idle" ? Math.round(w * 0.3) : 0, cs, Math.round(cs / w * 100) / 100, micro, e[3]]; }));

    /* ── 프로파일 ── */
    db.run("CREATE TABLE DBA_PROFILES (PROFILE VARCHAR2(128), RESOURCE_NAME VARCHAR2(32), RESOURCE_TYPE VARCHAR2(8), \"LIMIT\" VARCHAR2(128), COMMON VARCHAR2(3))");
    var RES = [["COMPOSITE_LIMIT", "KERNEL"], ["SESSIONS_PER_USER", "KERNEL"], ["CPU_PER_SESSION", "KERNEL"], ["CPU_PER_CALL", "KERNEL"], ["LOGICAL_READS_PER_SESSION", "KERNEL"], ["LOGICAL_READS_PER_CALL", "KERNEL"],
      ["IDLE_TIME", "KERNEL"], ["CONNECT_TIME", "KERNEL"], ["PRIVATE_SGA", "KERNEL"], ["FAILED_LOGIN_ATTEMPTS", "PASSWORD"], ["PASSWORD_LIFE_TIME", "PASSWORD"], ["PASSWORD_REUSE_TIME", "PASSWORD"],
      ["PASSWORD_REUSE_MAX", "PASSWORD"], ["PASSWORD_VERIFY_FUNCTION", "PASSWORD"], ["PASSWORD_LOCK_TIME", "PASSWORD"], ["PASSWORD_GRACE_TIME", "PASSWORD"], ["INACTIVE_ACCOUNT_TIME", "PASSWORD"], ["PASSWORD_ROLLOVER_TIME", "PASSWORD"]];
    var PDEF = { FAILED_LOGIN_ATTEMPTS: "10", PASSWORD_LIFE_TIME: "180", PASSWORD_VERIFY_FUNCTION: "NULL", PASSWORD_LOCK_TIME: "1", PASSWORD_GRACE_TIME: "7", PASSWORD_ROLLOVER_TIME: "0" };
    var PROF = { DEFAULT: PDEF, APP_PROFILE: { FAILED_LOGIN_ATTEMPTS: "5", PASSWORD_VERIFY_FUNCTION: "ORA12C_VERIFY_FUNCTION" }, MON_PROFILE: { SESSIONS_PER_USER: "5", IDLE_TIME: "30", PASSWORD_LIFE_TIME: "UNLIMITED" } };
    var PR = [];
    Object.keys(PROF).forEach(function (p) { RES.forEach(function (r) { PR.push([p, r[0], r[1], PROF[p][r[0]] || (p === "DEFAULT" ? "UNLIMITED" : "DEFAULT"), "NO"]); }); });
    ins("DBA_PROFILES", ["PROFILE", "RESOURCE_NAME", "RESOURCE_TYPE", "LIMIT", "COMMON"], PR);

    /* ── 통합 감사 (로그온 실패·보안 설정 변경) ── */
    db.run("CREATE TABLE UNIFIED_AUDIT_TRAIL (EVENT_TIMESTAMP DATE, DBUSERNAME VARCHAR2(128), OS_USERNAME VARCHAR2(128), USERHOST VARCHAR2(128), CLIENT_PROGRAM_NAME VARCHAR2(48), ACTION_NAME VARCHAR2(64), RETURN_CODE INTEGER, OBJECT_SCHEMA VARCHAR2(128), OBJECT_NAME VARCHAR2(128), UNIFIED_AUDIT_POLICIES VARCHAR2(4000), INSTANCE_ID INTEGER)");
    var lockT = q1("SELECT LOCK_DATE FROM DBA_USERS WHERE USERNAME = 'BATCH_USER'")[0][0], UA = [], k2;
    function ua(t, u, os, host, prog, act, rc, oname, pol, inst) { UA.push([sec(t), u, os, host, prog, act, rc, oname ? "SYS" : null, oname, pol, inst]); }
    for (k2 = 4; k2 >= 0; k2--) ua(lockT - k2 * MIN - 7 / 86400, "BATCH_USER", "batch", "batch02", "sqlplus@batch02 (TNS V1-V3)", "LOGON", 1017, null, "ORA_LOGON_FAILURES", 1);
    for (k2 = 1; lockT + k2 * 10 * MIN < now; k2++) ua(lockT + k2 * 10 * MIN, "BATCH_USER", "batch", "batch02", "sqlplus@batch02 (TNS V1-V3)", "LOGON", 28000, null, "ORA_LOGON_FAILURES", 1);
    [-22, -16.5, -9, -4.2, -2.1, -0.6].forEach(function (h, i) { ua(T(h * HR), "REPORT_USER", "rptsvc", "rpt01", "JDBC Thin Client", "LOGON", 28001, null, "ORA_LOGON_FAILURES", i % 2 + 1); });
    [0, 1, 2].forEach(function (i) { ua(T(-12 * HR + i * 4 / 86400), "SCOTT", "unknown", "10.20.30.44", "python3", "LOGON", 1017, null, "ORA_LOGON_FAILURES", 2); });
    [0, 1].forEach(function (i) { ua(T(-20 * HR + i * 30 / 86400), "APP_USER", "wasadm", "wasap03", "JDBC Thin Client", "LOGON", 1017, null, "ORA_LOGON_FAILURES", 1); });
    ua(T(-2 * DAY - 3 * HR), "SYSTEM", "oracle", "dbadm01", "sqlplus@dbadm01 (TNS V1-V3)", "ALTER USER", 0, "ETL_USER", "ORA_SECURECONFIG", 1);
    ua(T(-30 * HR), "SYSTEM", "oracle", "dbadm01", "sqlplus@dbadm01 (TNS V1-V3)", "GRANT", 0, null, "ORA_SECURECONFIG", 1);
    ua(T(-3 * DAY), "BATCH_USER", "batch", "batch02", "sqlplus@batch02 (TNS V1-V3)", "LOGON", 1017, null, "ORA_LOGON_FAILURES", 1);
    UA.forEach(function (r) { if (r[5] !== "ALTER USER") r[7] = null; });
    UA.sort(function (a, b) { return a[0] - b[0]; });
    ins("UNIFIED_AUDIT_TRAIL", ["EVENT_TIMESTAMP", "DBUSERNAME", "OS_USERNAME", "USERHOST", "CLIENT_PROGRAM_NAME", "ACTION_NAME", "RETURN_CODE", "OBJECT_SCHEMA", "OBJECT_NAME", "UNIFIED_AUDIT_POLICIES", "INSTANCE_ID"], UA);

    /* ── ASM 디스크 (Exadata 셀 3대 × 12 그리드 디스크) ── */
    db.run("CREATE TABLE V$ASM_DISK (GROUP_NUMBER INTEGER, DISK_NUMBER INTEGER, NAME VARCHAR2(30), PATH VARCHAR2(256), FAILGROUP VARCHAR2(30), MOUNT_STATUS VARCHAR2(7), HEADER_STATUS VARCHAR2(12), MODE_STATUS VARCHAR2(7), STATE VARCHAR2(8), TOTAL_MB INTEGER, FREE_MB INTEGER, REPAIR_TIMER INTEGER)");
    var ADK = [];
    q1("SELECT GROUP_NUMBER, NAME, TOTAL_MB, FREE_MB FROM V$ASM_DISKGROUP ORDER BY 1").forEach(function (g) {
      var n = 36, tb = Math.floor(g[2] / n), fb = Math.floor(g[3] / n), dn = 0;
      for (var c = 1; c <= 3; c++) for (var d = 0; d < 12; d++) {
        var cell = "celadm0" + c, nm = g[1] + "_CD_" + p2(d) + "_" + cell.toUpperCase(), off = c === 3 && d === 5, last = dn === n - 1;
        var tot = tb + (last ? g[2] - tb * n : 0), fr = fb + (last ? g[3] - fb * n : 0);
        ADK.push([g[0], dn++, nm, "o/192.168.136." + (3 + c * 2) + ";192.168.136." + (4 + c * 2) + "/" + g[1] + "_CD_" + p2(d) + "_" + cell, cell.toUpperCase(),
          off ? "MISSING" : "CACHED", off ? "UNKNOWN" : "MEMBER", off ? "OFFLINE" : "ONLINE", "NORMAL", tot, fr, off ? 9360 : 0]);
      }
    });
    ins("V$ASM_DISK", ["GROUP_NUMBER", "DISK_NUMBER", "NAME", "PATH", "FAILGROUP", "MOUNT_STATUS", "HEADER_STATUS", "MODE_STATUS", "STATE", "TOTAL_MB", "FREE_MB", "REPAIR_TIMER"], ADK);
    db.run("UPDATE V$ASM_DISKGROUP SET OFFLINE_DISKS = 1");

    /* ── AWR (8일, 1시간 스냅샷, 2개 인스턴스) — Diagnostics Pack 필요 ── */
    db.run("CREATE TABLE DBA_HIST_SNAPSHOT (SNAP_ID INTEGER, DBID INTEGER, INSTANCE_NUMBER INTEGER, STARTUP_TIME DATE, BEGIN_INTERVAL_TIME DATE, END_INTERVAL_TIME DATE)");
    db.run("CREATE TABLE DBA_HIST_SQLSTAT (SNAP_ID INTEGER, DBID INTEGER, INSTANCE_NUMBER INTEGER, SQL_ID VARCHAR2(13), PLAN_HASH_VALUE INTEGER, EXECUTIONS_DELTA INTEGER, ELAPSED_TIME_DELTA INTEGER, CPU_TIME_DELTA INTEGER, BUFFER_GETS_DELTA INTEGER, DISK_READS_DELTA INTEGER, ROWS_PROCESSED_DELTA INTEGER)");
    var DBID = q1("SELECT DBID FROM V$DATABASE")[0][0], startT = q1("SELECT STARTUP_TIME FROM V$INSTANCE")[0][0];
    var lastEnd = Math.floor(now * 24) / 24, SN = [], SQ = [], NS = 8 * 24, chg3ab = day0 - 3 + 14 * HR, chg6mm = day0 - 5 + 12 * HR;
    function sqs(sid, inst, sql, plan, ex, avgMs, gets, reads, rowsPer) {
      if (ex <= 0) return; var el = Math.round(ex * avgMs * 1000);
      SQ.push([sid, DBID, inst, sql, plan, ex, el, Math.round(el * 0.78), Math.round(ex * gets), Math.round(ex * reads), Math.round(ex * rowsPer)]); }
    for (var s2 = NS - 1; s2 >= 0; s2--) {
      var endH = lastEnd - s2 * HR, snap = 52000 + (NS - 1 - s2), hh = Math.round(hod(endH)) % 24, work = hh >= 9 && hh <= 20;
      for (var inst = 1; inst <= 2; inst++) {
        var e2 = sec(endH + (2 + inst + rnd(s2 + inst) * 3) / 86400), b2 = sec(endH - HR + (2 + inst + rnd(s2 + inst + 1) * 3) / 86400);
        SN.push([snap, DBID, inst, startT, b2, e2]);
        var r0 = rnd(s2 * 7 + inst);
        sqs(snap, inst, "3ab9wz1kq0c5d", e2 < chg3ab ? 2117650911 : 4180217753, Math.round((work ? 9000 : 1200) + r0 * (work ? 6000 : 1800)), (e2 < chg3ab ? 1.8 : 21) * (0.9 + r0 * 0.2), e2 < chg3ab ? 6 : 1450, e2 < chg3ab ? 0.4 : 3, 1);
        sqs(snap, inst, "9cz0d4k2tf1nb", 1388734953, Math.round((work ? 20000 : 3000) + r0 * (work ? 20000 : 3000)), 0.6 * (0.9 + r0 * 0.2), 4, 0.1, 1);
        if (inst === 1 && work) sqs(snap, 1, "5h7tq0wz3k2ma", 3045678120, 1 + Math.floor(r0 * 3), 640000 * (0.9 + r0 * 0.2), 9.2e6, 8.1e6, 1200);
        if (inst === 2 && (hh === 2 || hh === 3)) sqs(snap, 2, "6mm1n0b8v7c2x", e2 < chg6mm ? 1022893411 : 2856319044, 1, (e2 < chg6mm ? 2400000 : 1500000) * (0.9 + r0 * 0.2), 4.1e7, 3.6e7, 2.4e6);
        if (inst === 1 && hh >= 2 && hh <= 4) sqs(snap, 1, "7yq2mm4h0p8xs", 991827364, 3 + Math.floor(r0 * 4), 300000 * (0.9 + r0 * 0.2), 1.2e6, 9.0e5, 15000);
      }
    }
    var errSnap = q1("SELECT MIN(BEGIN_TIME) FROM V$UNDOSTAT WHERE SSOLDERRCNT > 0")[0][0];
    var sB = SN.filter(function (r) { return r[2] === 1 && r[5] >= errSnap + 30 * MIN; }).sort(function (a, b) { return a[5] - b[5]; })[0];
    if (sB) SQ.push([sB[0], DBID, 1, "b7r2kq9wd1x3n", 3721194550, 1, 13920 * 1e6, Math.round(13920 * 1e6 * 0.3), 9.8e7, 8.7e7, 340]);
    ins("DBA_HIST_SNAPSHOT", ["SNAP_ID", "DBID", "INSTANCE_NUMBER", "STARTUP_TIME", "BEGIN_INTERVAL_TIME", "END_INTERVAL_TIME"], SN);
    ins("DBA_HIST_SQLSTAT", ["SNAP_ID", "DBID", "INSTANCE_NUMBER", "SQL_ID", "PLAN_HASH_VALUE", "EXECUTIONS_DELTA", "ELAPSED_TIME_DELTA", "CPU_TIME_DELTA", "BUFFER_GETS_DELTA", "DISK_READS_DELTA", "ROWS_PROCESSED_DELTA"], SQ);
  }
  root.DBBIG_SCHEMA = build;
})(typeof window !== "undefined" ? window : globalThis);
