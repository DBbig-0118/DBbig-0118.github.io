/* 디비빅SQL — 학습 콘텐츠 (Oracle 19c 기준)
   블록 형식: ["p",텍스트] ["ul",[항목]] ["code",언어,코드] ["tip",텍스트] ["warn",텍스트] ["tbl",[[헤더],[행]...]] */
window.DBBIG_CONTENT = [
/* ───────────────────────── 1. 아키텍처 ───────────────────────── */
{ id:"arch", name:"아키텍처", icon:"🏛️", desc:"인스턴스·메모리·프로세스·CDB",
lessons:[
{ id:"arch-1", title:"인스턴스 vs 데이터베이스", min:4, body:[
 ["p","인스턴스(Instance)는 메모리(SGA)와 백그라운드 프로세스의 집합이고, 데이터베이스(Database)는 디스크에 있는 파일의 집합입니다. 하나의 데이터베이스를 여러 인스턴스가 동시에 여는 구조가 RAC입니다."],
 ["tbl",[["구분","구성요소"],["데이터베이스 필수 파일","데이터파일, 컨트롤파일, 온라인 리두로그"],["부수 파일","파라미터파일(spfile/pfile), 패스워드파일, 아카이브 로그, Alert/Trace"],["SGA","Shared Pool, Buffer Cache, Redo Log Buffer, Large/Java/Streams Pool, (옵션) In-Memory Area"],["PGA","세션별 전용 메모리 — 정렬·해시 작업 영역"]]],
 ["ul",["Shared Pool = Library Cache(SQL·실행계획) + Data Dictionary Cache","AMM(MEMORY_TARGET)은 Linux HugePages와 함께 쓸 수 없음(19c Linux 관리 가이드 명시) → 운영계·Exadata는 ASMM(SGA_TARGET + PGA_AGGREGATE_TARGET) + HugePages가 표준","PGA_AGGREGATE_LIMIT(12c+)는 PGA 총량의 하드 리밋 — 초과 시 세션이 종료될 수 있음"]],
 ["code","sql","-- SGA 구성 확인\nSELECT name, ROUND(bytes/1024/1024) AS mb\n  FROM v$sgainfo ORDER BY bytes DESC;\n\n-- PGA 사용량\nSELECT name, ROUND(value/1024/1024) AS mb\n  FROM v$pgastat\n WHERE name IN ('aggregate PGA target parameter','total PGA allocated','maximum PGA allocated');"],
 ["code","bash","# HugePages 설정 확인 (OS)\ngrep -i huge /proc/meminfo\n\n# 인스턴스 기동 시 HugePages 사용 여부는 alert log의\n# 'Large Pages Information' 섹션에서 확인"],
 ["tip","운영 DB 메모리 증설 요청을 받으면 SGA만이 아니라 HugePages 개수(vm.nr_hugepages)도 같이 늘려야 합니다. USE_LARGE_PAGES=TRUE(기본)에서는 HugePages가 모자라면 SGA 일부가 일반 4K 페이지로 올라가 성능이 떨어지고, ONLY로 설정했다면 아예 기동에 실패합니다. 19c에는 AUTO_ONLY 값이 추가됐고 온프레미스 Exadata의 기본값입니다."]
]},
{ id:"arch-2", title:"백그라운드 프로세스", min:5, body:[
 ["p","장애 분석의 절반은 '어떤 프로세스가 무엇을 하다 멈췄나'를 아는 데서 시작합니다. 핵심 프로세스의 역할을 정확히 기억해 두세요."],
 ["tbl",[["프로세스","역할"],["DBWn","Buffer Cache의 dirty 블록을 데이터파일에 기록"],["LGWR","Redo Log Buffer → 온라인 리두로그 기록 (커밋 시, 로그 스위치 시, 마지막 기록 후 3초, 버퍼 1/3 또는 1MB 찼을 때, DBWn이 쓰기 전)"],["CKPT","컨트롤파일·데이터파일 헤더에 체크포인트 정보(SCN 등) 갱신, DBWn에 쓰기 신호. 데이터 블록 자체는 쓰지 않음"],["SMON","인스턴스 복구(기동 시, RAC에서는 다른 인스턴스의 복구도 수행), 미사용 임시 세그먼트 정리"],["PMON","다른 프로세스의 비정상 종료 감지. 19c에서 실제 정리 작업은 CLMN(정리 메인)과 CLnn(헬퍼)에 위임"],["LREG","리스너에 서비스 등록 (12c+, 이전에는 PMON 담당)"],["ARCn","리두로그 스위치 후 아카이브 로그 생성"],["MMON/MMNL","AWR 스냅샷, 메트릭 수집"],["RECO","분산 트랜잭션 장애 자동 정리"]]],
 ["p","RAC 전용 프로세스: LMS(GCS — Cache Fusion 블록 전송), LMD(GES — 글로벌 enqueue), LMON(글로벌 리소스 재구성), LCK0, DIAG."],
 ["code","bash","# 인스턴스 백그라운드 프로세스 확인\nps -ef | grep ora_ | grep -v grep\n\n# LMS 프로세스만 (RAC)\nps -ef | grep ora_lms | grep -v grep"],
 ["code","sql","SELECT pname, spid, program\n  FROM v$process\n WHERE pname IS NOT NULL\n ORDER BY pname;"],
 ["tip","'log file sync' 대기가 높다 = 커밋 시 LGWR 기록을 기다리는 시간이 길다는 뜻. 원인은 커밋 과다(애플리케이션) 또는 리두 디스크 I/O 지연입니다. 'log file parallel write'와 함께 비교하세요."]
]},
{ id:"arch-3", title:"기동·종료 단계 (NOMOUNT/MOUNT/OPEN)", min:5, body:[
 ["tbl",[["단계","읽는 것","이 단계에서 하는 작업"],["NOMOUNT","파라미터 파일","SGA 할당, 백그라운드 기동 / DB 생성, 컨트롤파일 재생성, RMAN 컨트롤파일 복원"],["MOUNT","컨트롤파일","아카이브 모드 변경, 데이터파일 rename, 전체 DB 복구, Flashback Database"],["OPEN","데이터파일·리두로그","정상 서비스"]]],
 ["p","파라미터 파일 탐색 순서($ORACLE_HOME/dbs): spfile<SID>.ora → spfile.ora → init<SID>.ora (STARTUP에 SPFILE/PFILE을 지정하면 그 파일 사용). RAC는 보통 ASM에 spfile을 두고 init<SID>.ora에 SPFILE='+DATA/...' 한 줄만 둡니다."],
 ["tbl",[["SHUTDOWN 옵션","신규 접속","기존 세션","트랜잭션","다음 기동 시 복구"],["NORMAL","차단","끝날 때까지 대기","대기","불필요"],["TRANSACTIONAL","차단","트랜잭션 끝나면 종료","완료 대기","불필요"],["IMMEDIATE","차단","즉시 종료","롤백","불필요"],["ABORT","차단","즉시 종료","롤백 안 함","인스턴스 복구 필요"]]],
 ["code","sql","-- 단계별 기동\nSTARTUP NOMOUNT;\nALTER DATABASE MOUNT;\nALTER DATABASE OPEN;\n\nSELECT instance_name, status, database_status FROM v$instance;"],
 ["code","bash","# RAC는 srvctl로 관리 (grid 또는 oracle 계정)\n/u01/app/oracle/product/19.0.0/dbhome_1/bin/srvctl status database -db DBBIG\n/u01/app/oracle/product/19.0.0/dbhome_1/bin/srvctl stop database -db DBBIG -stopoption immediate\n/u01/app/oracle/product/19.0.0/dbhome_1/bin/srvctl start database -db DBBIG\n\n# 특정 인스턴스만\nsrvctl stop instance -db DBBIG -instance DBBIG2 -stopoption immediate"],
 ["warn","RAC에서 sqlplus로 SHUTDOWN 하면 Clusterware가 '사용자 의도 종료'로 인식은 하지만, 서비스 재배치·정책 관리가 꼬일 수 있습니다. RAC는 srvctl로 기동/종료하는 것이 원칙입니다."]
]},
{ id:"arch-4", title:"멀티테넌트 (CDB/PDB)", min:4, body:[
 ["p","CDB는 CDB$ROOT(공통 메타데이터), PDB$SEED(PDB 생성 템플릿), 사용자 PDB로 구성됩니다. 21c부터는 non-CDB가 지원되지 않으므로 신규 구축은 CDB가 기본입니다."],
 ["ul",["19c부터 사용자 PDB 3개까지는 Multitenant 옵션 라이선스 없이 사용 가능","공통 사용자(Common User)는 C## 접두어, 로컬 사용자는 PDB 안에서만 존재","CDB 재기동 후 PDB가 MOUNTED로 남는다면 SAVE STATE 누락 여부 확인"]],
 ["code","sql","SHOW CON_NAME\nSHOW PDBS\n\nSELECT con_id, name, open_mode, restricted FROM v$pdbs;\n\nALTER SESSION SET CONTAINER = PDB1;\nALTER PLUGGABLE DATABASE PDB1 OPEN INSTANCES=ALL;\nALTER PLUGGABLE DATABASE PDB1 SAVE STATE INSTANCES=ALL;"],
 ["tip","PDB가 RESTRICTED=YES로 열리면 대부분 PDB_PLUG_IN_VIOLATIONS에 원인이 있습니다(패치 후 datapatch 미적용이 단골)."],
 ["code","sql","SELECT name, cause, type, message, status\n  FROM pdb_plug_in_violations\n WHERE status <> 'RESOLVED';"]
]}
],
quiz:[
 {q:"인스턴스 기동 시 컨트롤파일을 읽는 단계는?",o:["NOMOUNT","MOUNT","OPEN","STARTUP UPGRADE"],a:1,e:"NOMOUNT는 파라미터 파일만 읽어 SGA를 할당하고, MOUNT에서 컨트롤파일을 엽니다. OPEN에서 데이터파일과 리두로그를 엽니다."},
 {q:"다음 중 아카이브 로그 모드 변경(ALTER DATABASE ARCHIVELOG)이 가능한 상태는?",o:["NOMOUNT","MOUNT","OPEN READ WRITE","OPEN READ ONLY"],a:1,e:"아카이브 모드 변경은 컨트롤파일 정보를 바꾸는 작업이라 MOUNT 상태에서만 가능합니다."},
 {q:"리스너에 서비스를 동적 등록하는 프로세스(12c 이후)는?",o:["PMON","SMON","LREG","MMON"],a:2,e:"12c부터 서비스 등록은 LREG가 담당합니다. 11g까지는 PMON이 했습니다."},
 {q:"Linux 운영 DB에서 HugePages를 쓰려면 피해야 하는 메모리 관리 방식은?",o:["ASMM (SGA_TARGET)","AMM (MEMORY_TARGET)","수동 SGA 설정","PGA_AGGREGATE_LIMIT 설정"],a:1,e:"AMM(MEMORY_TARGET)은 /dev/shm 기반이라 HugePages와 호환되지 않습니다. 그래서 운영계는 ASMM + HugePages 조합을 씁니다."},
 {q:"SHUTDOWN ABORT 후 다음 기동 시 자동으로 수행되는 것은?",o:["미디어 복구","인스턴스 복구 (SMON)","RESETLOGS","Flashback"],a:1,e:"ABORT는 체크포인트 없이 종료하므로 다음 기동 시 SMON이 리두를 적용(roll forward)하고 미커밋 트랜잭션을 롤백하는 인스턴스 복구를 합니다."},
 {q:"RAC에서 Cache Fusion으로 블록을 다른 인스턴스로 전송하는 프로세스는?",o:["LMON","LMS","LMD","LCK0"],a:1,e:"LMS(Global Cache Service Process)가 인스턴스 간 블록 전송을 처리합니다. LMD는 글로벌 enqueue, LMON은 재구성을 담당합니다."},
 {q:"19c에서 Multitenant 옵션 없이 만들 수 있는 사용자 PDB의 최대 개수는?",o:["1개","3개","5개","252개"],a:1,e:"19c부터 CDB당 사용자 PDB 3개까지는 Multitenant 옵션 없이 쓸 수 있습니다."}
]},
/* ───────────────────────── 2. 공간관리 ───────────────────────── */
{ id:"space", name:"공간관리", icon:"💾", desc:"테이블스페이스·UNDO·TEMP·HWM",
lessons:[
{ id:"space-1", title:"테이블스페이스와 데이터파일", min:5, body:[
 ["p","논리 구조는 블록 → 익스텐트 → 세그먼트 → 테이블스페이스 순으로 커집니다. 기본 블록 크기는 8KB입니다."],
 ["ul",["Smallfile 테이블스페이스: 파일 하나당 최대 4M 블록 → 8K 블록 기준 약 32GB","Bigfile 테이블스페이스: 파일 1개, 최대 4G 블록 → 8K 기준 32TB","LMT(로컬 관리) + ASSM(자동 세그먼트 공간 관리)이 표준"]],
 ["code","sql","-- 테이블스페이스 사용률 (MAXSIZE 기준 메트릭)\nSELECT tablespace_name,\n       ROUND(used_space*8192/1024/1024/1024,1)      AS used_gb,\n       ROUND(tablespace_size*8192/1024/1024/1024,1) AS max_gb,\n       ROUND(used_percent,1)                        AS pct\n  FROM dba_tablespace_usage_metrics\n ORDER BY used_percent DESC;"],
 ["code","sql","-- 데이터파일 추가 (ASM)\nALTER TABLESPACE users ADD DATAFILE '+DATAC1'\n  SIZE 10G AUTOEXTEND ON NEXT 1G MAXSIZE 32767M;\n\n-- 기존 파일 확장\nALTER DATABASE DATAFILE 5 RESIZE 20G;"],
 ["tip","DBA_TABLESPACE_USAGE_METRICS는 블록 단위이고 AUTOEXTEND MAXSIZE 기준 사용률입니다. '현재 할당 크기 기준' 사용률은 DBA_DATA_FILES − DBA_FREE_SPACE로 계산하세요(SQL 실습 문제 참고)."]
]},
{ id:"space-2", title:"UNDO와 ORA-01555", min:5, body:[
 ["p","UNDO는 롤백, 읽기 일관성, Flashback Query에 쓰입니다. ORA-01555(snapshot too old)는 긴 쿼리가 필요로 하는 과거 이미지를 다른 트랜잭션이 덮어써서 발생합니다."],
 ["tbl",[["UNDO 익스텐트 상태","의미"],["ACTIVE","진행 중 트랜잭션이 사용 — 재사용 불가"],["UNEXPIRED","커밋됐지만 UNDO_RETENTION 이내 — 공간 부족 시 재사용될 수 있음"],["EXPIRED","재사용 가능"]]],
 ["code","sql","SELECT tablespace_name, status, ROUND(SUM(bytes)/1024/1024) AS mb\n  FROM dba_undo_extents\n GROUP BY tablespace_name, status\n ORDER BY 1, 2;\n\n-- 가장 길었던 쿼리 시간(초)과 자동 튜닝된 보존시간\nSELECT MAX(maxquerylen) AS max_query_sec,\n       MAX(tuned_undoretention) AS tuned_retention\n  FROM v$undostat;"],
 ["ul",["대응: UNDO 테이블스페이스 확장, UNDO_RETENTION 상향(MAXQUERYLEN 이상), 장시간 쿼리 튜닝","커서 fetch 도중 같은 테이블을 커밋하는 로직(fetch across commit)은 01555의 단골 원인","RETENTION GUARANTEE는 DML 실패를 감수하고 보존을 강제 — 운영계에서는 신중히"]]
]},
{ id:"space-3", title:"TEMP 사용량 추적", min:4, body:[
 ["p","정렬·해시 조인·인덱스 생성이 PGA를 넘으면 TEMP를 씁니다. ORA-01652(unable to extend temp segment)가 나면 '누가' 쓰는지부터 찾습니다."],
 ["code","sql","SELECT s.inst_id, s.sid, s.username, u.sql_id, u.segtype,\n       ROUND(u.blocks*8192/1024/1024) AS mb\n  FROM gv$session s\n  JOIN gv$tempseg_usage u\n    ON s.saddr = u.session_addr AND s.inst_id = u.inst_id\n ORDER BY u.blocks DESC;"],
 ["code","sql","SELECT tablespace_name,\n       ROUND(tablespace_size/1024/1024) AS size_mb,\n       ROUND(free_space/1024/1024)      AS free_mb\n  FROM dba_temp_free_space;\n\n-- 과도하게 커진 TEMP 축소\nALTER TABLESPACE temp SHRINK SPACE KEEP 4G;"],
 ["tip","블록 크기 8K 가정입니다. 실제 값은 SELECT value FROM v$parameter WHERE name='db_block_size'로 확인하세요."]
]},
{ id:"space-4", title:"HWM과 공간 회수", min:5, body:[
 ["p","High Water Mark(HWM)는 세그먼트에서 한 번이라도 사용된 블록의 경계입니다. DELETE로 데이터를 지워도 HWM은 내려가지 않아 Full Scan은 여전히 HWM까지 읽습니다."],
 ["tbl",[["방법","HWM","특징"],["DELETE","유지","공간 반환 안 됨"],["TRUNCATE","초기화","롤백 불가, DDL"],["SHRINK SPACE","낮춤","ASSM 필요, ROW MOVEMENT 활성화, 온라인"],["MOVE (ONLINE)","재구성","12.2+ ONLINE이면 DML 허용·인덱스 VALID 유지(UPDATE INDEXES 명시 가능). ONLINE 없이 MOVE하면 인덱스 UNUSABLE → REBUILD 필요"]]],
 ["code","sql","ALTER TABLE app.orders ENABLE ROW MOVEMENT;\nALTER TABLE app.orders SHRINK SPACE CASCADE;\n\n-- 12.2+\nALTER TABLE app.orders MOVE ONLINE TABLESPACE app_data;\n\n-- UNUSABLE 인덱스 확인\nSELECT owner, index_name, status FROM dba_indexes WHERE status = 'UNUSABLE';"],
 ["warn","데이터파일을 HWM 아래로 RESIZE 하려 하면 ORA-03297이 납니다. 파일 끝부분에 있는 세그먼트를 먼저 옮겨야 합니다."]
]}
],
quiz:[
 {q:"8KB 블록 Smallfile 테이블스페이스에서 데이터파일 1개의 최대 크기는 약?",o:["8GB","16GB","32GB","128GB"],a:2,e:"Smallfile 데이터파일은 최대 약 4M(2^22) 블록이므로 8KB × 4M ≈ 32GB입니다."},
 {q:"대량 DELETE 후에도 Full Table Scan 시간이 줄지 않는 이유는?",o:["통계정보가 오래돼서","HWM이 내려가지 않아서","UNDO가 커서","인덱스가 깨져서"],a:1,e:"DELETE는 HWM을 낮추지 않습니다. Full Scan은 HWM까지 모든 블록을 읽으므로 SHRINK/MOVE/TRUNCATE로 재구성해야 합니다."},
 {q:"ORA-01555의 직접적인 원인은?",o:["TEMP 부족","읽기 일관성에 필요한 UNDO 이미지가 덮어써짐","아카이브 공간 부족","락 경합"],a:1,e:"긴 쿼리가 시작 시점 기준 이미지를 만들려는데 필요한 UNDO가 재사용되어 사라진 경우입니다."},
 {q:"ALTER TABLE ... SHRINK SPACE 사전 조건으로 맞는 것은?",o:["MSSM 테이블스페이스","ROW MOVEMENT 활성화 + ASSM","테이블 오프라인","NOLOGGING 설정"],a:1,e:"SHRINK는 ASSM 세그먼트에서만 가능하고, 행 이동이 일어나므로 ENABLE ROW MOVEMENT가 필요합니다."},
 {q:"세션별 TEMP 사용량을 보기 위해 V$SESSION과 조인하는 뷰는?",o:["V$TEMPFILE","V$TEMPSEG_USAGE","DBA_TEMP_FILES","V$SORT_SEGMENT"],a:1,e:"V$TEMPSEG_USAGE(구 V$SORT_USAGE)의 SESSION_ADDR을 V$SESSION.SADDR과 조인합니다."},
 {q:"데이터파일을 사용 중인 범위(HWM)보다 작게 RESIZE하면 발생하는 에러는?",o:["ORA-01652","ORA-03297","ORA-01653","ORA-00376"],a:1,e:"ORA-03297: file contains used data beyond requested RESIZE value."}
]},
/* ───────────────────────── 3. 백업/복구 ───────────────────────── */
{ id:"rman", name:"백업·복구", icon:"🛟", desc:"아카이브·RMAN·복구 시나리오·Data Pump",
lessons:[
{ id:"rman-1", title:"아카이브 로그 모드와 FRA", min:4, body:[
 ["code","sql","-- 단일 인스턴스\nSHUTDOWN IMMEDIATE\nSTARTUP MOUNT\nALTER DATABASE ARCHIVELOG;\nALTER DATABASE OPEN;\nARCHIVE LOG LIST"],
 ["code","bash","# RAC: 전 인스턴스 종료 → 한 인스턴스만 MOUNT\nsrvctl stop database -db DBBIG -stopoption immediate\nsqlplus / as sysdba <<EOF\nstartup mount\nalter database archivelog;\nshutdown immediate\nEOF\nsrvctl start database -db DBBIG"],
 ["p","FRA(Fast Recovery Area)는 DB_RECOVERY_FILE_DEST / DB_RECOVERY_FILE_DEST_SIZE로 지정합니다. 가득 차면 아카이브가 멈추고 ORA-00257(Archiver error)로 신규 트랜잭션이 막힙니다."],
 ["code","sql","SELECT name, ROUND(space_limit/1024/1024/1024) AS limit_gb,\n       ROUND(space_used/1024/1024/1024) AS used_gb\n  FROM v$recovery_file_dest;\n\nSELECT file_type, percent_space_used, percent_space_reclaimable\n  FROM v$recovery_area_usage;"],
 ["tip","FRA를 OS에서 rm으로 지우면 안 됩니다. RMAN이 모르는 파일이 되어 공간이 반환되지 않습니다. RMAN> DELETE ARCHIVELOG ... 또는 백업 후 DELETE INPUT을 쓰세요."]
]},
{ id:"rman-2", title:"RMAN 백업 전략", min:6, body:[
 ["ul",["Level 0 = 전체 기준 백업, Level 1 = 변경분 (기본 Differential, CUMULATIVE 지정 시 L0 이후 누적)","Block Change Tracking(BCT)을 켜면 Level 1이 전체 스캔 없이 변경 블록만 읽음","보존정책: RECOVERY WINDOW(기간 보장) vs REDUNDANCY(개수 보장)"]],
 ["code","rman","rman target /\n\nCONFIGURE RETENTION POLICY TO RECOVERY WINDOW OF 7 DAYS;\nCONFIGURE CONTROLFILE AUTOBACKUP ON;\nCONFIGURE DEVICE TYPE DISK PARALLELISM 4;\n\nBACKUP INCREMENTAL LEVEL 0 DATABASE PLUS ARCHIVELOG;\nBACKUP INCREMENTAL LEVEL 1 DATABASE PLUS ARCHIVELOG;\n\nCROSSCHECK BACKUP;\nDELETE NOPROMPT EXPIRED BACKUP;\nDELETE NOPROMPT OBSOLETE;"],
 ["code","sql","ALTER DATABASE ENABLE BLOCK CHANGE TRACKING USING FILE '+DATAC1';\nSELECT status, filename FROM v$block_change_tracking;\n\n-- 최근 백업 결과\nSELECT session_key, input_type, status,\n       TO_CHAR(start_time,'YYYY-MM-DD HH24:MI') AS started,\n       ROUND(elapsed_seconds/60) AS min,\n       output_bytes_display\n  FROM v$rman_backup_job_details\n ORDER BY start_time DESC;"],
 ["warn","EXPIRED = 카탈로그엔 있는데 실제 파일이 없음(CROSSCHECK 결과). OBSOLETE = 보존정책상 더 이상 필요 없음. 둘을 헷갈리면 필요한 백업을 지울 수 있습니다."]
]},
{ id:"rman-3", title:"복구 시나리오별 명령", min:7, body:[
 ["p","① 일반 데이터파일 손상 (DB는 OPEN 유지)"],
 ["code","rman","ALTER DATABASE DATAFILE 7 OFFLINE;\nRESTORE DATAFILE 7;\nRECOVER DATAFILE 7;\nALTER DATABASE DATAFILE 7 ONLINE;"],
 ["p","② SYSTEM/UNDO 데이터파일 손상 → MOUNT에서 복구"],
 ["code","rman","STARTUP FORCE MOUNT;\nRESTORE DATAFILE 1;\nRECOVER DATAFILE 1;\nALTER DATABASE OPEN;"],
 ["p","③ 컨트롤파일 포함 전체 손실"],
 ["code","rman","SET DBID 1234567890;\nSTARTUP NOMOUNT;\nRESTORE CONTROLFILE FROM AUTOBACKUP;\nALTER DATABASE MOUNT;\nRESTORE DATABASE;\nRECOVER DATABASE;\nALTER DATABASE OPEN RESETLOGS;"],
 ["p","④ 블록 손상 — 파일 전체를 복구할 필요 없음"],
 ["code","rman","-- V$DATABASE_BLOCK_CORRUPTION 에 기록된 블록 일괄 복구\nRECOVER CORRUPTION LIST;\n\n-- 특정 블록\nRECOVER DATAFILE 7 BLOCK 1234;"],
 ["p","⑤ 특정 시점 복구 (PITR)"],
 ["code","rman","RUN {\n  SET UNTIL TIME \"TO_DATE('2026-11-17 09:00:00','YYYY-MM-DD HH24:MI:SS')\";\n  RESTORE DATABASE;\n  RECOVER DATABASE;\n}\nALTER DATABASE OPEN RESETLOGS;"],
 ["tip","실제 복구 전에 RESTORE DATABASE PREVIEW; 와 RESTORE DATABASE VALIDATE; 로 필요한 백업셋이 다 있는지 먼저 확인하세요. DBID는 평소 RMAN 접속 화면에서 기록해 두는 습관이 중요합니다."],
 ["warn","블록 복구는 물리적 손상에만 쓸 수 있고 논리적 손상은 복구하지 못합니다. 또 LIST/ADVISE/REPAIR FAILURE(Data Recovery Advisor)는 19c부터 deprecated라 위처럼 명시적인 RMAN 명령을 익혀 두는 게 좋습니다."]
]},
{ id:"rman-4", title:"Data Pump (expdp/impdp)", min:5, body:[
 ["code","sql","CREATE OR REPLACE DIRECTORY dp_dir AS '/backup/dp';\nGRANT READ, WRITE ON DIRECTORY dp_dir TO system;"],
 ["code","bash","# 스키마 export (일관성 시점 지정)\nexpdp system DIRECTORY=dp_dir DUMPFILE=hr_%U.dmp LOGFILE=hr_exp.log \\\n  SCHEMAS=HR PARALLEL=4 FLASHBACK_TIME=SYSTIMESTAMP\n\n# 다른 스키마/테이블스페이스로 import\nimpdp system DIRECTORY=dp_dir DUMPFILE=hr_%U.dmp LOGFILE=hr_imp.log \\\n  REMAP_SCHEMA=HR:HR_TEST REMAP_TABLESPACE=USERS:HR_DATA \\\n  TABLE_EXISTS_ACTION=REPLACE EXCLUDE=STATISTICS\n\n# 메타데이터만\nexpdp system DIRECTORY=dp_dir DUMPFILE=meta.dmp SCHEMAS=HR CONTENT=METADATA_ONLY"],
 ["code","bash","# 실행 중인 작업 제어\nexpdp system ATTACH=SYS_EXPORT_SCHEMA_01\nExport> STATUS\nExport> STOP_JOB=IMMEDIATE\nExport> KILL_JOB"],
 ["code","sql","SELECT owner_name, job_name, operation, state, degree\n  FROM dba_datapump_jobs;"],
 ["tip","RAC에서 PARALLEL을 주면 다른 노드에서도 워커가 뜰 수 있습니다. 덤프 디렉터리가 공유 스토리지가 아니면 CLUSTER=N을 지정하세요."]
]}
],
quiz:[
 {q:"RMAN Level 1 증분 백업에서 CUMULATIVE를 지정하지 않으면 기준이 되는 백업은?",o:["가장 최근 Level 0만","가장 최근 Level 0 또는 Level 1","가장 최근 전체(FULL) 백업","아카이브 로그"],a:1,e:"기본값인 Differential Level 1은 직전 Level 1 또는 Level 0 이후 변경분을 백업합니다. CUMULATIVE는 직전 Level 0 이후 전체 변경분입니다."},
 {q:"CROSSCHECK 결과 '카탈로그에는 있지만 실제 파일이 없는' 백업의 상태는?",o:["OBSOLETE","EXPIRED","AVAILABLE","UNAVAILABLE"],a:1,e:"CROSSCHECK가 실물을 찾지 못하면 EXPIRED로 표시합니다. OBSOLETE는 보존정책 기준으로 불필요해진 백업입니다."},
 {q:"컨트롤파일까지 모두 손실된 경우 RESTORE CONTROLFILE FROM AUTOBACKUP을 실행하는 인스턴스 상태는?",o:["NOMOUNT","MOUNT","OPEN","SHUTDOWN"],a:0,e:"컨트롤파일이 없으므로 MOUNT할 수 없습니다. NOMOUNT에서 복원한 뒤 MOUNT합니다. 이때 DBID가 필요할 수 있습니다."},
 {q:"V$DATABASE_BLOCK_CORRUPTION에 기록된 손상 블록을 한 번에 복구하는 RMAN 명령은?",o:["BLOCKRECOVER ALL","RECOVER CORRUPTION LIST","REPAIR FAILURE","VALIDATE DATABASE"],a:1,e:"RECOVER CORRUPTION LIST가 해당 뷰에 등록된 모든 손상 블록을 복구합니다."},
 {q:"FRA가 가득 차서 아카이브가 멈췄을 때 주로 보는 에러는?",o:["ORA-01555","ORA-00257","ORA-04031","ORA-01652"],a:1,e:"ORA-00257: Archiver error. 신규 트랜잭션이 리두를 쓸 수 없어 사실상 DB가 멈춥니다."},
 {q:"Data Pump export에서 일관된 시점의 데이터를 받기 위한 파라미터는?",o:["CONSISTENT=Y","FLASHBACK_TIME","CONTENT=ALL","QUERY"],a:1,e:"Data Pump에서는 FLASHBACK_TIME 또는 FLASHBACK_SCN을 씁니다. CONSISTENT=Y는 구버전 exp의 레거시 파라미터입니다."},
 {q:"RESETLOGS로 OPEN 해야 하는 경우는?",o:["데이터파일 1개 완전 복구 후","불완전 복구(PITR) 또는 백업 컨트롤파일 사용 후","인스턴스 복구 후","TEMP 파일 재생성 후"],a:1,e:"불완전 복구나 백업 컨트롤파일로 복구한 뒤에는 리두 시퀀스를 새로 시작해야 하므로 OPEN RESETLOGS가 필요합니다."}
]},
/* ───────────────────────── 4. RAC / Grid ───────────────────────── */
{ id:"rac", name:"RAC·Grid", icon:"🔗", desc:"Clusterware·Cache Fusion·서비스·Eviction",
lessons:[
{ id:"rac-1", title:"Clusterware 구성요소와 점검 명령", min:6, body:[
 ["tbl",[["구성요소","역할"],["OCR","클러스터 리소스 구성 정보 저장"],["Voting Disk","노드 멤버십 판단, Split-brain 방지"],["Private Interconnect","노드 간 heartbeat, Cache Fusion 트래픽"],["VIP","노드 장애 시 다른 노드로 넘어가 클라이언트에 빠른 연결 실패 통보"],["SCAN","클러스터 단일 접속명 (보통 IP 3개 + SCAN 리스너 3개)"]]],
 ["code","bash","# grid 계정, GI 홈 기준\nexport GRID_HOME=/u01/app/19.0.0/grid\n\n$GRID_HOME/bin/crsctl check cluster -all\n$GRID_HOME/bin/crsctl stat res -t\n$GRID_HOME/bin/crsctl stat res -t -init      # 로컬 하위 스택(ohasd 관리)\n$GRID_HOME/bin/crsctl query css votedisk\n$GRID_HOME/bin/olsnodes -n -s -t\n$GRID_HOME/bin/oifcfg getif\n$GRID_HOME/bin/srvctl config scan\n$GRID_HOME/bin/srvctl status scan_listener\n\n# root\n$GRID_HOME/bin/ocrcheck\n$GRID_HOME/bin/ocrconfig -showbackup"],
 ["tip","crsctl stat res -t 에서 OFFLINE인데 TARGET이 ONLINE인 리소스가 있으면 '살아나야 하는데 못 살아난' 상태입니다. 해당 리소스의 agent 로그부터 보세요."]
]},
{ id:"rac-2", title:"Cache Fusion과 gc 대기 이벤트", min:5, body:[
 ["p","RAC에서 다른 인스턴스가 가진 블록이 필요하면 디스크가 아니라 인터커넥트로 받아옵니다(Cache Fusion). 이 과정의 대기가 gc 이벤트입니다."],
 ["tbl",[["이벤트","의미"],["gc cr block 2-way / 3-way","CR 블록을 2개/3개 노드를 거쳐 받음"],["gc current block busy","보유 노드가 블록을 넘겨주기 전 작업(리두 flush 등) 중"],["gc buffer busy acquire/release","같은 블록을 여러 세션이 동시에 요청 — 핫 블록"],["gc cr/current request","요청 후 응답 대기 — 인터커넥트·LMS 지연 의심"]]],
 ["ul",["대책 1: 서비스로 업무를 노드별로 분리 (같은 데이터는 같은 노드에서)","대책 2: 시퀀스 CACHE 크게 + NOORDER","대책 3: 우측 증가 인덱스 핫블록 → Reverse key 또는 Hash 파티션 인덱스"]],
 ["code","sql","SELECT inst_id, event, COUNT(*) AS cnt\n  FROM gv$session\n WHERE wait_class <> 'Idle'\n GROUP BY inst_id, event\n ORDER BY cnt DESC;\n\nALTER SEQUENCE app.seq_order CACHE 1000 NOORDER;"]
]},
{ id:"rac-3", title:"서비스 관리 (srvctl)", min:4, body:[
 ["code","bash","# 서비스 생성: 1번 노드 선호, 2번 노드 가용\nsrvctl add service -db DBBIG -service APP_SVC -preferred DBBIG1 -available DBBIG2\nsrvctl start service -db DBBIG -service APP_SVC\nsrvctl status service -db DBBIG\nsrvctl config service -db DBBIG -service APP_SVC\n\n# 작업 전 서비스 이동\nsrvctl relocate service -db DBBIG -service APP_SVC -oldinst DBBIG1 -newinst DBBIG2\n\n# 19c(19.3+): preferred 인스턴스가 돌아오면 자동 복귀\nsrvctl add service -db DBBIG -service BATCH_SVC -preferred DBBIG1 -available DBBIG2 -failback YES\n\n# 계획 정비: 노드의 서비스를 드레인하며 이동\nsrvctl relocate service -db DBBIG -oldinst DBBIG1 -newinst DBBIG2 -drain_timeout 300 -stopoption IMMEDIATE"],
 ["p","패치·점검 시 노드별 롤링 작업 순서: ① 서비스 relocate → ② 해당 인스턴스 세션 drain 확인 → ③ 인스턴스/CRS 중지 → 작업 → ④ 기동 → ⑤ 서비스 원복."],
 ["code","sql","SELECT inst_id, service_name, COUNT(*)\n  FROM gv$session\n WHERE type = 'USER'\n GROUP BY inst_id, service_name\n ORDER BY 1, 2;"],
 ["tip","SYS$USERS 서비스로 붙은 세션은 서비스 relocate로 옮겨지지 않습니다. 애플리케이션이 전용 서비스명으로 접속하는지 꼭 확인하세요."],
 ["warn","19c에서 srvctl relocate service는 -newinst 값을 검증하지 않아(MOS 3030680.1) 인스턴스명을 잘못 써도 에러 없이 다른 available 인스턴스로 옮겨질 수 있습니다. 실행 후 srvctl status service로 실제 위치를 꼭 확인하세요."],
 ["p","19c 이전에는 서비스가 available 인스턴스로 넘어간 뒤 preferred가 살아나도 자동 복귀하지 않아 수동 relocate가 필요했습니다. 19.3부터 -failback YES를 주면 자동으로 돌아옵니다."]
]},
{ id:"rac-4", title:"노드 Eviction 원인 분석", min:6, body:[
 ["ul",["네트워크 heartbeat 실패: CSS misscount(11g 이후 Linux 기본 30초, MOS 294430.1) 초과","디스크 heartbeat 실패: Voting Disk I/O가 disktimeout(기본 200초) 초과","리소스 고갈: 메모리 부족·스왑, CPU 포화로 ocssd가 스케줄링 못 받음","OS hang, 커널 패닉"]],
 ["code","bash","$GRID_HOME/bin/crsctl get css misscount\n$GRID_HOME/bin/crsctl get css disktimeout\n$GRID_HOME/bin/crsctl get css reboottime\n\n# 19c GI 로그 (ADR)\ncd $ORACLE_BASE/diag/crs/$(hostname -s)/crs/trace\nls -lt alert.log ocssd.trc crsd.trc\n\n# OS 로그\ngrep -iE 'oom|hung|reboot' /var/log/messages"],
 ["code","bash","# AHF(TFA)로 로그 일괄 수집 — SR 첨부용\ntfactl diagcollect -last 4h\ntfactl summary"],
 ["tip","Eviction 직전 ocssd.trc의 'heartbeat fatal' / 'Disk HB' 메시지, OSWatcher의 vmstat(run queue, free memory)를 시간축으로 맞춰 보면 원인이 대부분 갈립니다."]
]}
],
quiz:[
 {q:"클러스터 노드 멤버십을 판단하고 Split-brain을 막는 데 쓰이는 것은?",o:["OCR","Voting Disk","SCAN","GNS"],a:1,e:"Voting Disk는 노드들의 디스크 heartbeat를 기록해 멤버십을 판단합니다. OCR은 리소스 구성 정보 저장소입니다."},
 {q:"Linux에서 CSS misscount(네트워크 heartbeat 타임아웃) 기본값은?",o:["10초","30초","60초","200초"],a:1,e:"Linux 기본 misscount는 30초, disktimeout은 200초입니다."},
 {q:"다음 중 'gc buffer busy acquire'의 대표적 원인은?",o:["Redo 디스크 지연","여러 세션의 같은 블록 동시 요청(핫 블록)","통계정보 오래됨","TEMP 부족"],a:1,e:"같은 블록을 여러 세션이 동시에 요청할 때 나타납니다. 우측 증가 인덱스, 작은 테이블 집중 갱신 등이 원인입니다."},
 {q:"서비스를 1번에서 2번 인스턴스로 옮기는 명령은?",o:["srvctl modify service","srvctl relocate service","srvctl move service","crsctl relocate resource"],a:1,e:"srvctl relocate service -db <db> -service <svc> -oldinst <i1> -newinst <i2>"},
 {q:"OCR 무결성 점검 명령(root)은?",o:["ocrcheck","crsctl query css votedisk","olsnodes","oifcfg getif"],a:0,e:"ocrcheck는 OCR 위치, 용량, 무결성을 확인합니다."},
 {q:"RAC에서 시퀀스 관련 gc 경합을 줄이는 일반적인 설정은?",o:["NOCACHE ORDER","CACHE 크게 + NOORDER","CYCLE","INCREMENT BY -1"],a:1,e:"ORDER는 노드 간 순서 보장을 위해 동기화가 필요합니다. 큰 CACHE와 NOORDER가 경합을 최소화합니다."}
]},
/* ───────────────────────── 5. ASM ───────────────────────── */
{ id:"asm", name:"ASM", icon:"🧱", desc:"디스크그룹·리밸런스·asmcmd",
lessons:[
{ id:"asm-1", title:"디스크그룹과 이중화", min:5, body:[
 ["tbl",[["Redundancy","미러","비고"],["EXTERNAL","없음","스토리지 RAID에 의존"],["NORMAL","2-way","Failure Group 최소 2개"],["HIGH","3-way","Failure Group 최소 3개 — Exadata 운영 권장"],["FLEX / EXTENDED","파일그룹별","12.2+"]]],
 ["p","Exadata는 스토리지 셀 하나가 하나의 Failure Group입니다. 셀 1대가 내려가도 미러가 다른 셀에 있으므로 서비스가 유지됩니다."],
 ["code","bash","asmcmd lsdg"],
 ["code","sql","SELECT name, type, total_mb, free_mb,\n       required_mirror_free_mb, usable_file_mb, offline_disks\n  FROM v$asm_diskgroup;"],
 ["tip","USABLE_FILE_MB = (FREE_MB − REQUIRED_MIRROR_FREE_MB) ÷ 미러수(NORMAL 2, HIGH 3). 이 값이 음수면 '디스크(셀) 하나 장애 시 재미러링할 공간이 없다'는 뜻입니다. FREE_MB만 보고 여유 있다고 판단하면 안 됩니다. FLEX/EXTENDED 디스크그룹은 두 컬럼이 0(값 없음)으로 나옵니다."],
 ["warn","19.16 GI RU부터 REQUIRED_MIRROR_FREE_MB 계산 방식이 바뀌어(MOS 2932395.1) 패치 후 USABLE_FILE_MB가 갑자기 줄어 보일 수 있습니다. 모니터링 임계값 알람이 터지면 이 변경부터 확인하세요."]
]},
{ id:"asm-2", title:"리밸런스와 디스크 장애", min:5, body:[
 ["code","sql","-- 디스크 추가 + 리밸런스 파워 지정\nALTER DISKGROUP datac1 ADD DISK '/dev/mapper/asmdisk05' REBALANCE POWER 8;\n\n-- 진행 상황\nSELECT group_number, operation, pass, state, power,\n       sofar, est_work, est_minutes\n  FROM v$asm_operation;\n\n-- 정상 아닌 디스크\nSELECT name, path, mode_status, state, failgroup, repair_timer\n  FROM v$asm_disk\n WHERE mode_status <> 'ONLINE' OR state <> 'NORMAL';"],
 ["ul",["디스크가 OFFLINE 되면 DISK_REPAIR_TIME(일반적인 기본값 3.6시간) 타이머가 돌고, 만료되면 자동 DROP → 리밸런스. Exadata 문서는 기본값이 ASM 버전에 따라 다를 수 있다고 하니 V$ASM_ATTRIBUTE로 실제 값을 확인","Failure Group 전체 장애 시에는 FAILGROUP_REPAIR_TIME(기본 24시간)이 적용","일시 장애라면 타이머 내에 ONLINE 시키면 변경분만 재동기화(빠름)","Exadata는 셀 디스크 교체 시 ASM 디스크 drop/add가 자동 처리됨"]],
 ["code","sql","ALTER DISKGROUP datac1 ONLINE DISK DATAC1_CD_05_CELADM01;\nALTER DISKGROUP datac1 SET ATTRIBUTE 'disk_repair_time' = '8.5h';\n\n-- 현재 설정 확인\nSELECT dg.name, a.name, a.value\n  FROM v$asm_attribute a JOIN v$asm_diskgroup dg ON a.group_number = dg.group_number\n WHERE a.name IN ('disk_repair_time','failgroup_repair_time');"]
]},
{ id:"asm-3", title:"asmcmd 실무 명령", min:4, body:[
 ["code","bash","# grid 계정, ORACLE_SID=+ASM1\nasmcmd lsdg                      # 디스크그룹 용량\nasmcmd lsdsk -k -G DATAC1         # 디스크 상세\nasmcmd du +DATAC1/DBBIG           # 디렉터리 사용량(MB)\nasmcmd ls -l +RECOC1/DBBIG/ARCHIVELOG\nasmcmd find --type DATAFILE +DATAC1/DBBIG '*'\nasmcmd lsop                      # 진행 중 리밸런스\nasmcmd lsct                      # 접속 중인 DB 클라이언트\nasmcmd iostat -t                 # 디스크 I/O\nasmcmd spget                     # ASM spfile 위치\nasmcmd pwget --dbuniquename DBBIG  # DB 패스워드파일 위치"],
 ["code","bash","# ASM ↔ OS 파일 복사\nasmcmd cp +DATAC1/DBBIG/PARAMETERFILE/spfile.123.456789 /tmp/spfile_dbbig.bak"],
 ["tip","아카이브 로그를 asmcmd rm으로 지우면 RMAN 카탈로그와 어긋납니다. 삭제는 RMAN으로 하고, asmcmd는 조회·복사 위주로 쓰세요."]
]}
],
quiz:[
 {q:"HIGH redundancy 디스크그룹의 미러링 방식은?",o:["미러 없음","2-way","3-way","4-way"],a:2,e:"HIGH는 3-way 미러이며 Failure Group이 최소 3개 필요합니다."},
 {q:"V$ASM_DISKGROUP에서 USABLE_FILE_MB가 음수라는 의미는?",o:["디스크그룹이 꽉 참","디스크 장애 시 재미러링 공간이 부족","리밸런스 중","디스크가 OFFLINE"],a:1,e:"REQUIRED_MIRROR_FREE_MB를 확보하지 못한 상태로, Failure Group 하나가 장애 나면 완전한 이중화로 복구할 수 없습니다."},
 {q:"OFFLINE된 ASM 디스크가 자동 DROP 되기까지의 시간을 정하는 속성은?",o:["au_size","disk_repair_time","compatible.asm","content.type"],a:1,e:"disk_repair_time(기본 3.6h)이 지나면 디스크가 자동 DROP되고 리밸런스가 시작됩니다."},
 {q:"리밸런스 진행률을 확인하는 뷰는?",o:["V$ASM_DISK","V$ASM_OPERATION","V$ASM_FILE","V$ASM_CLIENT"],a:1,e:"V$ASM_OPERATION의 SOFAR, EST_WORK, EST_MINUTES로 진행률과 남은 시간을 봅니다."},
 {q:"Exadata에서 ASM Failure Group의 단위는?",o:["디스크 1개","스토리지 셀 1대","랙 1개","DB 서버 1대"],a:1,e:"Exadata는 셀 단위로 Failure Group을 구성해 셀 1대 전체 장애에도 데이터가 보호됩니다."}
]},
/* ───────────────────────── 6. 패치 ───────────────────────── */
{ id:"patch", name:"패치", icon:"🩹", desc:"RU·OPatch·opatchauto·datapatch·Exadata",
lessons:[
{ id:"patch-1", title:"19c 패치 체계 이해", min:5, body:[
 ["ul",["RU(Release Update): 1·4·7·10월 셋째 화요일에 나오는 누적 패치. 19.24.0.0.240716 = 19c 24번째 RU, 2024-07-16 릴리스","버전 셋째 자리는 RUR 번호였지만 RUR은 2023년 1월(19.16.2)을 끝으로 중단","MRP(Monthly Recommended Patches): 2022년 10월(19.17)부터 Linux x86-64 전용으로 RU마다 최대 6개가 매월 제공. MRP를 적용해도 RU 버전 번호는 바뀌지 않음","패치 정보 출발점: MOS 888.1(Proactive Patch 프로그램), 555.1(19c 권장 원오프), 2898740.1(MRP FAQ)","GI RU에는 DB RU가 포함되어 GI 홈·DB 홈을 함께 패치 가능","OJVM은 별도 패치 — Combo 패치로 같이 받을 수 있음","작업 전 OPatch(패치 6880880) 최신화가 사실상 필수"]],
 ["code","bash","# 현재 상태 확인\n$ORACLE_HOME/OPatch/opatch version\n$ORACLE_HOME/OPatch/opatch lspatches\n$ORACLE_HOME/OPatch/opatch lsinventory | grep -i 'patch description'\n\n# GI 패치 레벨 (grid)\n$GRID_HOME/bin/crsctl query crs activeversion -f\n$GRID_HOME/bin/crsctl query crs softwarepatch\n$GRID_HOME/bin/crsctl query crs releasepatch"],
 ["code","sql","SELECT patch_id, patch_type, action, status,\n       TO_CHAR(action_time,'YYYY-MM-DD HH24:MI') AS action_time,\n       description\n  FROM dba_registry_sqlpatch\n ORDER BY action_time DESC;"]
]},
{ id:"patch-2", title:"GI RU 적용 절차 (In-place, Rolling)", min:7, body:[
 ["p","◎ 각 노드에서 순서대로 (1번 노드 → 2번 노드). <GI_RU> 부분은 실제 패치 번호 디렉터리로 바꿉니다."],
 ["code","bash","# STEP 1. OPatch 교체 (grid/oracle 홈 모두, 소유자 계정)\nmv /u01/app/19.0.0/grid/OPatch /u01/app/19.0.0/grid/OPatch_bak_$(date +%Y%m%d)\nunzip -q /u01/patch/p6880880_190000_Linux-x86-64.zip -d /u01/app/19.0.0/grid\n\n# STEP 2. 충돌 검사 (각 하위 패치 디렉터리별)\n/u01/app/19.0.0/grid/OPatch/opatch prereq CheckConflictAgainstOHWithDetail \\\n  -phBaseDir /u01/patch/<GI_RU>/<하위패치번호>\n\n# STEP 3. 사전 분석 (root)\n/u01/app/19.0.0/grid/OPatch/opatchauto apply /u01/patch/<GI_RU> -analyze\n\n# STEP 4. 적용 (root) — 해당 노드의 GI + DB 홈, CRS 자동 중지/기동\n/u01/app/19.0.0/grid/OPatch/opatchauto apply /u01/patch/<GI_RU>\n\n# STEP 5. 모든 노드 완료 후 1회 (oracle, 한 노드에서)\n/u01/app/oracle/product/19.0.0/dbhome_1/OPatch/datapatch -verbose"],
 ["ul",["opatchauto는 DB 홈까지 함께 패치하려면 해당 홈의 DB가 클러스터에 등록되어 있어야 함","Rolling 중엔 crsctl query crs activeversion -f 결과에 ROLLING PATCH 상태가 보임","datapatch 후 DBA_REGISTRY_SQLPATCH STATUS = SUCCESS, PDB 포함 확인","INVALID 객체: @?/rdbms/admin/utlrp.sql"]],
 ["warn","충돌(conflict)이 나오는 인터림 패치가 있으면 반드시 MOS에서 머지 패치(merge patch) 또는 대상 RU용 재빌드 버전을 확인하세요. 롤백 후 적용하면 해당 버그 수정이 빠집니다."]
]},
{ id:"patch-3", title:"Out-of-place 패치와 롤백", min:5, body:[
 ["p","Out-of-place는 새 홈을 만들어 패치한 뒤 전환하는 방식입니다. 다운타임이 짧고 롤백이 '이전 홈으로 되돌리기'라 안전합니다. 2단계 방식은 prepare-clone을 모든 노드에서 끝낸 뒤 switch-clone을 노드별로 실행하고, 복제된 홈은 switch 전에 절대 수정하면 안 됩니다."],
 ["code","bash","# 19c opatchauto out-of-place (root)\n/u01/app/19.0.0/grid/OPatch/opatchauto apply /u01/patch/<GI_RU> -outofplace\n\n# 2단계 분리 실행\n/u01/app/19.0.0/grid/OPatch/opatchauto apply /u01/patch/<GI_RU> -prepare-clone\n/u01/app/19.0.0/grid/OPatch/opatchauto apply -switch-clone"],
 ["code","bash","# Out-of-place 전환 되돌리기 (root) — 원래 홈으로 복귀\n/u01/app/19.0.0/grid/OPatch/opatchauto rollback -switch-clone\n\n# In-place 롤백 (root)\n/u01/app/19.0.0/grid/OPatch/opatchauto rollback /u01/patch/<GI_RU>\n\n# 단일 인터림 패치 롤백 (oracle, 해당 홈 DB 중지 후)\n$ORACLE_HOME/OPatch/opatch rollback -id <패치번호>\n\n# SQL 레벨은 datapatch가 홈 상태에 맞춰 자동 rollback/apply\n$ORACLE_HOME/OPatch/datapatch -verbose"],
 ["tip","작업계획서에는 '롤백 판단 기준'(예: 기동 실패, datapatch 실패, 서비스 미기동 30분 지속)과 '롤백 소요시간'을 꼭 넣으세요. 고객 승인 때 가장 먼저 묻는 항목입니다."]
]},
{ id:"patch-4", title:"Exadata 이미지 패치 개요", min:6, body:[
 ["tbl",[["대상","도구","비고"],["Storage Cell","patchmgr --cells","Rolling 가능 (셀 단위)"],["DB Server","patchmgr --dbnodes","다른 노드에서 실행 권장"],["RoCE/IB 스위치","patchmgr --roceswitches / --ibswitches","모델별 상이"],["GI / DB","opatchauto / datapatch","Exadata Image와 별개"]]],
 ["code","bash","# 버전 확인\nimageinfo\nimagehistory\ndcli -g ~/cell_group -l root imageinfo -ver\n\n# 셀: 사전점검 → 적용 (패치 디렉터리에서, root)\n./patchmgr --cells ~/cell_group --patch_check_prereq --rolling\n./patchmgr --cells ~/cell_group --patch --rolling\n\n# DB 서버: 사전점검 → 업그레이드 (패치 대상이 아닌 서버에서 실행)\n./patchmgr --dbnodes ~/dbs_group --precheck \\\n  --repo /u01/iso/<DB서버_ISO.zip> --target_version <대상버전>\n./patchmgr --dbnodes ~/dbs_group --upgrade \\\n  --repo /u01/iso/<DB서버_ISO.zip> --target_version <대상버전> --rolling\n# 구버전 patchmgr는 --repo 대신 --iso_repo 옵션을 씁니다 (README 확인)"],
 ["ul",["지원 버전 조합: KB153930(구 MOS 888828.1) 반드시 확인","patchmgr는 자기 자신이 대상 목록에 들어간 DB 서버에서 실행할 수 없음 — 다른 노드나 별도 서버에서 실행","셀 rolling 전 모든 griddisk의 asmdeactivationoutcome = Yes 확인","DR(Standby)에 먼저 적용 → 안정화 → 운영 적용 순서가 일반적"]]
]}
],
quiz:[
 {q:"19.24.0.0.240716 표기에서 '240716'이 의미하는 것은?",o:["패치 번호","RU 릴리스 날짜","OPatch 버전","빌드 번호"],a:1,e:"마지막 자리는 RU 릴리스 날짜(YYMMDD)입니다. 2024-07-16에 나온 19.24 RU라는 뜻입니다."},
 {q:"OPatch 최신 버전을 받기 위한 패치 번호는?",o:["6880880","888828","1188080","2118136"],a:0,e:"OPatch는 MOS 패치 6880880으로 배포됩니다."},
 {q:"RU 적용 후 SQL 레벨 변경(딕셔너리 등)을 DB에 반영하는 도구는?",o:["opatchauto","datapatch","catctl.pl","utlrp.sql"],a:1,e:"datapatch가 바이너리 패치에 대응하는 SQL 변경을 DB(및 모든 PDB)에 적용합니다."},
 {q:"패치 적용 이력을 DB 안에서 확인하는 딕셔너리 뷰는?",o:["DBA_REGISTRY","DBA_REGISTRY_SQLPATCH","V$PATCHES","DBA_PATCH_HISTORY"],a:1,e:"DBA_REGISTRY_SQLPATCH에 PATCH_ID, ACTION, STATUS, ACTION_TIME, DESCRIPTION이 남습니다."},
 {q:"Out-of-place 패치의 가장 큰 장점은?",o:["디스크 사용량 감소","다운타임 단축과 쉬운 롤백","datapatch 불필요","OPatch 불필요"],a:1,e:"새 홈에 미리 패치해 두고 전환만 하므로 다운타임이 짧고, 문제가 생기면 이전 홈으로 되돌리면 됩니다."},
 {q:"Exadata 소프트웨어 지원 버전 조합을 확인하는 문서는?",o:["KB153930 (구 Doc ID 888828.1)","Doc ID 153788.1","Doc ID 1188080.1","Doc ID 2550798.1"],a:0,e:"Exadata 지원 버전 마스터 노트는 KB153930(구 MOS 888828.1)입니다. 153788.1은 ORA-600 조회 도구입니다."},
 {q:"충돌 검사를 하는 opatch 명령으로 올바른 것은?",o:["opatch check conflict","opatch prereq CheckConflictAgainstOHWithDetail","opatch lsinventory -conflict","opatchauto -conflict"],a:1,e:"opatch prereq CheckConflictAgainstOHWithDetail -phBaseDir <패치디렉터리>"}
]},
/* ───────────────────────── 7. 성능튜닝 ───────────────────────── */
{ id:"perf", name:"성능튜닝", icon:"⚡", desc:"대기이벤트·AWR/ASH·실행계획·통계·락",
lessons:[
{ id:"perf-1", title:"대기 이벤트 읽는 법", min:6, body:[
 ["p","DB Time = DB CPU + Non-idle Wait. 느리다는 신고가 오면 '지금 세션들이 무엇을 기다리는가'부터 봅니다."],
 ["tbl",[["이벤트","의미 / 의심 포인트"],["db file sequential read","단일 블록 읽기(주로 인덱스). Exadata에선 cell single block physical read"],["db file scattered read","멀티블록 읽기(Full Scan, 버퍼 캐시 경유)"],["direct path read","버퍼 캐시 우회 Full Scan. Exadata에선 cell smart table scan"],["log file sync","커밋 대기 — 커밋 과다 또는 리두 쓰기 지연"],["enq: TX - row lock contention","행 락 대기 — 블로킹 세션 확인"],["enq: TM - contention","FK 컬럼에 인덱스가 없을 때 흔함"],["library cache: mutex X","하드파싱 과다, 리터럴 SQL"]]],
 ["code","sql","-- 지금 이 순간\nSELECT event, wait_class, COUNT(*) AS sessions\n  FROM v$session\n WHERE wait_class <> 'Idle'\n GROUP BY event, wait_class\n ORDER BY sessions DESC;\n\n-- 최근 30분 ASH (Diagnostics Pack 필요)\nSELECT NVL(event,'ON CPU') AS event, COUNT(*) AS samples\n  FROM v$active_session_history\n WHERE sample_time > SYSDATE - 30/1440\n GROUP BY NVL(event,'ON CPU')\n ORDER BY samples DESC\n FETCH FIRST 10 ROWS ONLY;"],
 ["warn","AWR·ASH·ADDM 사용은 Diagnostics Pack 라이선스 대상입니다. 고객사 라이선스를 확인하고, 없으면 Statspack을 씁니다."]
]},
{ id:"perf-2", title:"AWR / ASH / ADDM 리포트", min:5, body:[
 ["code","sql","-- 리포트 생성 스크립트 (sqlplus / as sysdba)\n@?/rdbms/admin/awrrpt.sql      -- 현재 인스턴스\n@?/rdbms/admin/awrrpti.sql     -- 특정 DB/인스턴스 지정\n@?/rdbms/admin/awrgrpt.sql     -- RAC 전체(Global)\n@?/rdbms/admin/awrddrpt.sql    -- 두 구간 비교\n@?/rdbms/admin/ashrpt.sql\n@?/rdbms/admin/addmrpt.sql\n\n-- 수동 스냅샷, 보존기간 30일/간격 30분\nEXEC DBMS_WORKLOAD_REPOSITORY.CREATE_SNAPSHOT;\nEXEC DBMS_WORKLOAD_REPOSITORY.MODIFY_SNAPSHOT_SETTINGS(retention => 43200, interval => 30);"],
 ["p","기본값은 1시간 간격 스냅샷, 8일 보관입니다. MODIFY_SNAPSHOT_SETTINGS의 retention·interval은 '분' 단위라 43200 = 30일입니다. AWR 데이터는 SYSAUX에 쌓이므로 보관기간을 늘릴 땐 SYSAUX 여유도 같이 확인하세요."],
 ["ul",["① Load Profile: 평소 대비 초당 트랜잭션·Redo·논리읽기가 튀었나","② Top 10 Foreground Events: 무엇이 DB Time을 먹었나","③ SQL ordered by Elapsed Time / Gets / Reads: 범인 SQL","④ RAC면 Global Cache 섹션, 인터커넥트 지연"]],
 ["tip","장애 보고서에는 '문제 구간 AWR'과 '같은 요일·시간대 정상 구간 AWR'을 awrddrpt로 비교해서 넣으면 설득력이 확 올라갑니다."]
]},
{ id:"perf-3", title:"실행계획 확인 (DBMS_XPLAN)", min:6, body:[
 ["code","sql","-- 실제 실행 통계 포함 (해당 SQL에 힌트 추가 후 실행)\nSELECT /*+ gather_plan_statistics */ ...;\n\nSELECT *\n  FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR('&sql_id', NULL, 'ALLSTATS LAST +PEEKED_BINDS'));\n\n-- AWR에 남은 과거 계획\nSELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_AWR('&sql_id'));\n\n-- 계획 변경 여부\nSELECT sql_id, plan_hash_value, executions,\n       ROUND(elapsed_time/GREATEST(executions,1)/1000) AS avg_ms\n  FROM v$sql\n WHERE sql_id = '&sql_id';"],
 ["ul",["읽는 순서: 같은 레벨에선 위→아래, 자식이 부모보다 먼저 실행","E-Rows(예상)와 A-Rows(실제)가 크게 다르면 통계·카디널리티 문제","Buffers(논리 I/O)가 큰 단계가 실제 비용 지점","Plan Hash Value가 바뀌며 느려졌다면 SQL Plan Baseline/Profile로 고정 검토"]]
]},
{ id:"perf-4", title:"옵티마이저 통계 관리", min:5, body:[
 ["code","sql","BEGIN\n  DBMS_STATS.GATHER_TABLE_STATS(\n    ownname          => 'APP',\n    tabname          => 'ORDERS',\n    estimate_percent => DBMS_STATS.AUTO_SAMPLE_SIZE,\n    method_opt       => 'FOR ALL COLUMNS SIZE AUTO',\n    cascade          => TRUE,\n    degree           => 4,\n    no_invalidate    => DBMS_STATS.AUTO_INVALIDATE);\nEND;\n/\n\n-- 오래된(stale) 통계\nEXEC DBMS_STATS.FLUSH_DATABASE_MONITORING_INFO;\nSELECT owner, table_name, last_analyzed, stale_stats\n  FROM dba_tab_statistics\n WHERE stale_stats = 'YES' AND owner = 'APP';\n\n-- 통계 되돌리기 / 고정\nEXEC DBMS_STATS.RESTORE_TABLE_STATS('APP','ORDERS', SYSTIMESTAMP - INTERVAL '1' DAY);\nEXEC DBMS_STATS.LOCK_TABLE_STATS('APP','ORDERS');"],
 ["tip","통계 수집 직후 성능이 나빠졌다면 RESTORE_TABLE_STATS로 바로 이전 통계로 되돌릴 수 있습니다(기본 31일 보관). 원인 분석은 그다음입니다."]
]},
{ id:"perf-5", title:"락과 블로킹 세션 처리", min:5, body:[
 ["code","sql","-- 블로킹 트리\nSELECT inst_id, sid, serial#, username, event, seconds_in_wait,\n       blocking_instance, blocking_session, final_blocking_session, sql_id\n  FROM gv$session\n WHERE blocking_session IS NOT NULL\n ORDER BY seconds_in_wait DESC;\n\n-- 원인 세션 정보\nSELECT s.inst_id, s.sid, s.serial#, s.username, s.machine, s.program,\n       s.status, s.prev_sql_id, p.spid\n  FROM gv$session s\n  JOIN gv$process p ON p.addr = s.paddr AND p.inst_id = s.inst_id\n WHERE s.sid = &blocker_sid AND s.inst_id = &blocker_inst;"],
 ["code","sql","-- 세션 종료 (RAC는 @인스턴스번호)\nALTER SYSTEM KILL SESSION '123,45678,@2' IMMEDIATE;"],
 ["code","bash","# KILL 후에도 KILLED 상태로 남으면 OS 프로세스 정리 (고객 승인 후)\nkill -9 <spid>"],
 ["warn","블로커가 INACTIVE인데 락을 쥐고 있다면 대부분 '커밋 안 한 채 방치된 세션'입니다. 무작정 KILL 하지 말고 담당자에게 롤백 영향(대량 트랜잭션이면 롤백도 오래 걸림)을 먼저 공유하세요."]
]}
],
quiz:[
 {q:"인덱스를 통한 단일 블록 읽기 대기 이벤트는?",o:["db file scattered read","db file sequential read","direct path read","log file sync"],a:1,e:"sequential read는 한 번에 한 블록(주로 인덱스→테이블 액세스), scattered read는 멀티블록 Full Scan입니다. 이름이 직관과 반대라 자주 헷갈립니다."},
 {q:"'enq: TM - contention'의 대표적 원인은?",o:["FK 컬럼에 인덱스 없음","하드파싱 과다","Redo 디스크 지연","TEMP 부족"],a:0,e:"부모 테이블 변경 시 자식 테이블 FK에 인덱스가 없으면 자식 테이블 전체에 TM 락이 걸려 경합이 생깁니다."},
 {q:"RAC 전체(Global) AWR 리포트 스크립트는?",o:["awrrpt.sql","awrrpti.sql","awrgrpt.sql","awrddrpt.sql"],a:2,e:"awrgrpt.sql이 RAC Global 리포트입니다. awrddrpt.sql은 두 구간 비교 리포트입니다."},
 {q:"실행계획에서 E-Rows와 A-Rows가 크게 다를 때 먼저 의심할 것은?",o:["인터커넥트 지연","옵티마이저 통계/카디널리티 추정 오류","UNDO 부족","리두 크기"],a:1,e:"예상 행수와 실제 행수의 큰 차이는 통계 부정확, 히스토그램 부재, 상관된 조건 등 카디널리티 추정 문제의 신호입니다."},
 {q:"RAC 2번 인스턴스의 SID 123, SERIAL# 45678 세션을 종료하는 올바른 구문은?",o:["ALTER SYSTEM KILL SESSION '123,45678' INSTANCE 2;","ALTER SYSTEM KILL SESSION '123,45678,@2' IMMEDIATE;","ALTER SYSTEM DISCONNECT '123:45678@2';","KILL SESSION 123 45678 2;"],a:1,e:"'sid,serial#,@inst_id' 형식입니다. IMMEDIATE는 즉시 반환을 요청합니다."},
 {q:"AWR/ASH를 조회·사용하려면 필요한 라이선스는?",o:["Tuning Pack만","Diagnostics Pack","Partitioning","추가 라이선스 불필요"],a:1,e:"AWR, ASH, ADDM은 Diagnostics Pack 대상입니다. SQL Tuning Advisor, SQL Monitor는 Tuning Pack(Diagnostics Pack 전제)입니다."},
 {q:"통계 수집 후 성능이 나빠졌을 때 즉시 이전 통계로 되돌리는 프로시저는?",o:["DBMS_STATS.DELETE_TABLE_STATS","DBMS_STATS.RESTORE_TABLE_STATS","DBMS_STATS.UNLOCK_TABLE_STATS","DBMS_STATS.IMPORT_TABLE_STATS"],a:1,e:"RESTORE_TABLE_STATS(owner, table, as_of_timestamp)로 보관된 과거 통계를 복원합니다. 기본 보관 기간은 31일입니다."}
]},
/* ───────────────────────── 8. 보안·계정 ───────────────────────── */
{ id:"sec", name:"보안·계정", icon:"🔐", desc:"사용자·프로파일·권한·감사",
lessons:[
{ id:"sec-1", title:"사용자와 프로파일", min:5, body:[
 ["code","sql","CREATE USER app_user IDENTIFIED BY \"Str0ng#Pwd\"\n  DEFAULT TABLESPACE app_data\n  TEMPORARY TABLESPACE temp\n  QUOTA UNLIMITED ON app_data\n  PROFILE app_profile;\n\nALTER USER app_user ACCOUNT UNLOCK;\nALTER USER app_user IDENTIFIED BY \"N3w#Pwd\";   -- EXPIRED 해제"],
 ["tbl",[["DEFAULT 프로파일 항목","19c 기본값"],["FAILED_LOGIN_ATTEMPTS","10"],["PASSWORD_LOCK_TIME","1 (일)"],["PASSWORD_LIFE_TIME","180 (일)"],["PASSWORD_GRACE_TIME","7 (일)"]]],
 ["code","sql","SELECT username, account_status, lock_date, expiry_date, profile\n  FROM dba_users\n WHERE oracle_maintained = 'N'\n ORDER BY username;\n\nSELECT resource_name, limit\n  FROM dba_profiles\n WHERE profile = 'DEFAULT' AND resource_type = 'PASSWORD';"],
 ["tip","애플리케이션 계정이 PASSWORD_LIFE_TIME 만료로 갑자기 접속 장애가 나는 사례가 많습니다. 서비스 계정은 전용 프로파일(LIFE_TIME UNLIMITED 등 정책 협의)로 분리하세요."]
]},
{ id:"sec-2", title:"권한과 롤", min:5, body:[
 ["tbl",[["옵션","대상","REVOKE 시"],["WITH ADMIN OPTION","시스템 권한·롤","재부여한 권한은 회수되지 않음(비전파)"],["WITH GRANT OPTION","객체 권한","재부여한 권한도 연쇄 회수(cascade)"]]],
 ["code","sql","-- 사용자에게 직접/롤로 부여된 시스템 권한\nSELECT grantee, privilege, admin_option FROM dba_sys_privs WHERE grantee = 'APP_USER';\nSELECT grantee, granted_role, admin_option, default_role FROM dba_role_privs WHERE grantee = 'APP_USER';\n\n-- 위험한 ANY 권한 보유자\nSELECT grantee, privilege\n  FROM dba_sys_privs\n WHERE privilege LIKE '%ANY%'\n   AND grantee NOT IN (SELECT username FROM dba_users WHERE oracle_maintained = 'Y')\n ORDER BY grantee;\n\n-- PUBLIC 실행 권한 점검 (보안 진단 단골)\nSELECT table_name, privilege FROM dba_tab_privs\n WHERE grantee = 'PUBLIC' AND table_name IN ('UTL_FILE','UTL_TCP','UTL_HTTP','UTL_SMTP','DBMS_RANDOM');"],
 ["tip","보안 진단 조치로 PUBLIC 권한을 회수할 때는 먼저 해당 패키지를 쓰는 애플리케이션 계정에 직접 GRANT 한 뒤 REVOKE 해야 장애가 안 납니다."]
]},
{ id:"sec-3", title:"Unified Auditing", min:5, body:[
 ["code","sql","-- 순수 Unified Auditing 여부 (FALSE면 Mixed Mode)\nSELECT value FROM v$option WHERE parameter = 'Unified Auditing';\n\n-- 정책 생성/활성화\nCREATE AUDIT POLICY dbbig_ddl_pol ACTIONS CREATE TABLE, ALTER TABLE, DROP TABLE;\nAUDIT POLICY dbbig_ddl_pol;\n\nSELECT policy_name, enabled_option, entity_name FROM audit_unified_enabled_policies;\n\n-- 조회\nSELECT event_timestamp, dbusername, action_name, object_schema, object_name, return_code\n  FROM unified_audit_trail\n ORDER BY event_timestamp DESC\n FETCH FIRST 20 ROWS ONLY;"],
 ["ul",["DBCA로 만든 19c DB의 기본 활성 정책: ORA_SECURECONFIG, ORA_LOGON_FAILURES (구버전에서 업그레이드·리모트 클론한 PDB는 빠져 있을 수 있으니 AUDIT_UNIFIED_ENABLED_POLICIES로 확인)","19c 기본값은 Mixed Mode(전통 감사 + Unified 공존)","감사 레코드는 AUDSYS 스키마(SYSAUX)에 쌓임 → DBMS_AUDIT_MGMT로 주기적 정리","RETURN_CODE ≠ 0 이면 실패한 시도 (예: 1017 = 비밀번호 오류)"]]
]}
],
quiz:[
 {q:"19c DEFAULT 프로파일의 FAILED_LOGIN_ATTEMPTS 기본값은?",o:["3","5","10","UNLIMITED"],a:2,e:"기본값은 10회이며, 초과 시 PASSWORD_LOCK_TIME(기본 1일) 동안 잠깁니다."},
 {q:"REVOKE 시 연쇄 회수(cascade)가 일어나는 것은?",o:["WITH ADMIN OPTION으로 받은 시스템 권한","WITH GRANT OPTION으로 받은 객체 권한","롤","프로파일"],a:1,e:"객체 권한은 GRANT OPTION으로 재부여한 것까지 연쇄 회수됩니다. 시스템 권한(ADMIN OPTION)은 연쇄 회수되지 않습니다."},
 {q:"계정이 'EXPIRED' 상태일 때 해결 방법은?",o:["ACCOUNT UNLOCK","비밀번호 재설정(IDENTIFIED BY)","프로파일 삭제","DB 재기동"],a:1,e:"EXPIRED는 비밀번호 만료 상태이므로 ALTER USER ... IDENTIFIED BY 로 새 비밀번호를 설정합니다. LOCKED는 ACCOUNT UNLOCK으로 풉니다."},
 {q:"Unified Auditing 감사 기록을 조회하는 뷰는?",o:["DBA_AUDIT_TRAIL","UNIFIED_AUDIT_TRAIL","SYS.AUD$","V$AUDIT"],a:1,e:"UNIFIED_AUDIT_TRAIL입니다. DBA_AUDIT_TRAIL·AUD$는 전통적 감사 방식의 저장소입니다."},
 {q:"Oracle이 기본 제공하는 계정을 제외하고 사용자만 조회하는 DBA_USERS 컬럼 조건은?",o:["DEFAULT_USER='N'","ORACLE_MAINTAINED='N'","COMMON='NO'","AUTHENTICATION_TYPE='PASSWORD'"],a:1,e:"12c부터 ORACLE_MAINTAINED 컬럼으로 오라클 내장 계정을 구분합니다."}
]},
/* ───────────────────────── 9. Data Guard ───────────────────────── */
{ id:"dg", name:"Data Guard", icon:"🛡️", desc:"전송·적용·브로커·Gap",
lessons:[
{ id:"dg-1", title:"구성과 프로세스", min:6, body:[
 ["ul",["Primary의 리두를 Standby로 전송(ASYNC/SYNC) → Standby의 RFS가 수신 → SRL(Standby Redo Log)에 기록 → MRP0가 적용","Real-time apply가 기본 (SRL에 들어오는 즉시 적용)","Active Data Guard: Standby를 READ ONLY로 열고 동시에 적용 — 별도 옵션 라이선스","SRL은 온라인 리두와 같은 크기, 스레드(인스턴스)마다 (온라인 그룹 수 + 1)개가 전통적 권장. 성능을 위해 그룹당 멤버 1개","V$MANAGED_STANDBY는 12.2부터 deprecated → V$DATAGUARD_PROCESS 사용"]],
 ["tbl",[["보호 모드","전송","특징"],["Maximum Performance","ASYNC","기본값, Primary 성능 영향 최소"],["Maximum Availability","SYNC/FASTSYNC","Standby 장애 시 일시적으로 성능 모드처럼 동작"],["Maximum Protection","SYNC","Standby에 기록 못 하면 Primary 중지"]]],
 ["code","sql","-- SRL 추가 예 (스레드 지정 필수)\nALTER DATABASE ADD STANDBY LOGFILE THREAD 1 GROUP 11 SIZE 4G;\nSELECT group#, thread#, bytes/1024/1024/1024 AS gb FROM v$standby_log;\n\n-- Standby에서\nSELECT name, value, time_computed\n  FROM v$dataguard_stats\n WHERE name IN ('transport lag','apply lag');\n\nSELECT name, role, action, thread#, sequence#\n  FROM v$dataguard_process\n ORDER BY name;\n\n-- 적용 시작/중지\nALTER DATABASE RECOVER MANAGED STANDBY DATABASE DISCONNECT FROM SESSION;\nALTER DATABASE RECOVER MANAGED STANDBY DATABASE CANCEL;"]
]},
{ id:"dg-2", title:"DGMGRL 브로커 운영", min:5, body:[
 ["code","bash","dgmgrl sys@DBBIG\n\nDGMGRL> SHOW CONFIGURATION;\nDGMGRL> SHOW DATABASE 'DBBIG_STBY';\nDGMGRL> VALIDATE DATABASE 'DBBIG_STBY';\n\n# 계획된 역할 전환\nDGMGRL> SWITCHOVER TO 'DBBIG_STBY';\n\n# 장애 시 (Primary 사용 불가)\nDGMGRL> FAILOVER TO 'DBBIG_STBY';\n# 구 Primary 복구 후 Standby로 재편입 (Flashback Database 필요)\nDGMGRL> REINSTATE DATABASE 'DBBIG';\n\n# 적용 일시 중지/재개\nDGMGRL> EDIT DATABASE 'DBBIG_STBY' SET STATE='APPLY-OFF';\nDGMGRL> EDIT DATABASE 'DBBIG_STBY' SET STATE='APPLY-ON';"],
 ["tip","Switchover 전에는 VALIDATE DATABASE 결과의 'Ready for Switchover: Yes'를 확인하세요. 브로커 구성에서는 SQL*Plus로 파라미터를 직접 바꾸지 말고 EDIT ... SET PROPERTY를 써야 설정이 덮어써지지 않습니다."]
]},
{ id:"dg-3", title:"아카이브 Gap 해소", min:4, body:[
 ["code","sql","-- Standby에서 Gap 확인\nSELECT thread#, low_sequence#, high_sequence# FROM v$archive_gap;\n\n-- Primary와 Standby의 마지막 적용 시퀀스 비교\nSELECT thread#, MAX(sequence#) FROM v$archived_log WHERE applied = 'YES' GROUP BY thread#;"],
 ["ul",["보통은 FAL_SERVER 설정으로 자동 해소","Primary에서 아카이브가 이미 지워졌다면: 18c+ RMAN 한 줄 명령 RECOVER STANDBY DATABASE FROM SERVICE 로 증분 roll-forward (MOS 2431311.1)","실행 전 MRP를 반드시 중지 — 안 그러면 RMAN-05150 발생. 명령이 끝나면 Standby가 재기동됨"]],
 ["code","rman","-- Standby에서 (MRP 중지 후, MOUNT 상태)\nrman target /\nRECOVER STANDBY DATABASE FROM SERVICE dbbig_prim;"]
]}
],
quiz:[
 {q:"Standby에서 수신한 리두를 실제로 적용하는 프로세스는?",o:["RFS","MRP0","LGWR","ARCn"],a:1,e:"RFS는 리두를 수신해 SRL/아카이브에 쓰고, MRP0(Managed Recovery Process)가 적용합니다."},
 {q:"Data Guard의 기본 보호 모드는?",o:["Maximum Protection","Maximum Availability","Maximum Performance","Maximum Security"],a:2,e:"기본값은 ASYNC 전송의 Maximum Performance입니다."},
 {q:"Failover 후 구 Primary를 Standby로 재편입하는 DGMGRL 명령에 필요한 기능은?",o:["Block Change Tracking","Flashback Database","Force Logging","Supplemental Logging"],a:1,e:"REINSTATE는 구 Primary를 Flashback Database로 failover 시점 이전으로 되돌린 뒤 Standby로 전환합니다."},
 {q:"Standby의 전송/적용 지연을 확인하는 뷰는?",o:["V$DATAGUARD_STATS","V$ARCHIVE_DEST","V$LOG","V$DATABASE"],a:0,e:"V$DATAGUARD_STATS의 'transport lag', 'apply lag'로 확인합니다."},
 {q:"Standby Redo Log 권장 개수는?",o:["온라인 리두 그룹 수와 동일","스레드당 온라인 리두 그룹 수 + 1","항상 2개","스레드당 1개"],a:1,e:"스레드(인스턴스)마다 온라인 리두 그룹 수보다 1개 많게, 크기는 동일하게 만듭니다."}
]},
/* ───────────────────────── 10. Exadata (X11M-Z 기준) ───────────────────────── */
{ id:"exa", name:"Exadata", icon:"🚀", desc:"X11M-Z·Smart Scan·XRMEM·CellCLI·점검",
lessons:[
{ id:"exa-0", title:"X11M-Z 하드웨어 한눈에", min:6, body:[
 ["p","X11M은 RoCE 기반 Exadata의 4번째 세대로, 5세대 AMD EPYC CPU, DDR5 6400MT/s 메모리, 스토리지 서버의 PCIe Gen5 플래시를 씁니다. X11M-Z는 소규모 애플리케이션·DB용으로 나온 'Z' 서버(DB 서버-Z, 스토리지 HC-Z)입니다."],
 ["tbl",[["구분","X11M-Z DB 서버","X11M HC-Z 스토리지 서버"],["CPU","1 x 32코어 AMD EPYC 9J15 (2.95GHz, 최대 4.4GHz)","1 x 32코어 AMD EPYC 9J15"],["메모리","DDR5 768GB(12x64GB) 또는 1152GB(12x96GB)","768GB DDR5 — 이 중 512GB가 XRMEM 캐시"],["저장장치","NVMe 2 x 3.84TB (최대 4개로 확장)","Flash 2 x 6.8TB + HDD 6 x 22TB, 시스템용 NVMe 2 x 480GB"],["RDMA 패브릭","CX7 듀얼포트 2 x 100Gb/s active-active","동일 (CX7 2 x 100Gb/s)"],["클라이언트망","CX6-LX(10/25GbE 2포트) 2장 기본, 옵션 100GbE·10GBASE-T","—"],["관리망","1GbE 관리 포트 + ILOM 1GbE","동일"],["필요 SW","—","Exadata System Software 25.1.0 이상"]]],
 ["ul",["X11M 계열은 모두 유연 구성(flexible configuration)이며 최소 DB 서버 2대 + 스토리지 서버 3대부터 시작","고정 Eighth Rack 구성은 더 이상 제공되지 않음 — X11M-Z가 그 자리를 대체","나중에 X11M-Z 서버를 더 넣거나 상위 X11M 서버로 확장 가능","HC-Z 셀 1대 raw 용량 = 22TB x 6 = 132TB (X11M HC는 12 x 22TB = 264TB)"]],
 ["code","bash","# 모델·이미지 확인\ncellcli -e list cell attributes name,makeModel,status\ndbmcli -e list dbserver detail\nimageinfo -ver\n\n# 셀 디스크 구성 확인 (HC-Z: HardDisk 6, FlashDisk 2)\ncellcli -e list physicaldisk attributes name,diskType,physicalSize,status\ncellcli -e list flashcache detail\n\n# 전체 셀 한 번에 (DB 서버에서, root)\ndcli -g ~/cell_group -l root \"cellcli -e list cell attributes name,makeModel\""],
 ["tip","스토리지 서버가 5대 미만인데 HIGH redundancy로 구성하면, Voting file을 둘 Failure Group이 모자라 DB 서버 쪽에 quorum disk를 둡니다(OEDA가 구성). 셀 3대인 X11M-Z 최소 구성에서 lsdg·crsctl query css votedisk 결과에 quorum disk가 보이는 이유입니다."],
 ["tip","지원 버전 조합(Exadata SW·GI·DB)은 KB153930(구 MOS 888828.1)에서 확인합니다. MOS 문서 번호가 KB 체계로 바뀌었습니다."]
]},
{ id:"exa-1", title:"Exadata 핵심 기능 (X11M 기준)", min:7, body:[
 ["tbl",[["기능","핵심"],["Smart Scan","필터·컬럼 선택을 셀에서 처리해 필요한 데이터만 DB 서버로 전송. 조건: Full Scan + Direct Path Read"],["Storage Index","셀 메모리에 영역별 min/max를 자동 유지 — 조건에 안 맞는 영역은 읽지 않음"],["HCC","Hybrid Columnar Compression: QUERY LOW/HIGH, ARCHIVE LOW/HIGH"],["Smart Flash Cache / Flash Log","플래시를 캐시와 리두 쓰기 가속에 사용"],["XRMEM","Exadata RDMA Memory — DB 버퍼캐시와 Flash Cache 사이 캐시 계층. X11M HC·EF·HC-Z 스토리지에 탑재"],["RoCE 패브릭","X8M부터 RDMA over Converged Ethernet. X11M-Z는 서버당 2 x 100Gb/s"],["IORM","DB/카테고리별 I/O 자원 배분"],["Exascale","ESS 24.1부터. 스토리지 관리를 DB 서버(ASM)에서 스토리지 서버 쪽으로 분리. RoCE 장비(X8M-2 이후, 8소켓 제외)에서 동작, 신규 배포 시 ASM 대신 선택 가능"]]],
 ["code","sql","SELECT name, ROUND(value/1024/1024/1024,1) AS gb\n  FROM v$sysstat\n WHERE name IN ('cell physical IO bytes eligible for predicate offload',\n                'cell physical IO interconnect bytes returned by smart scan',\n                'cell physical IO bytes saved by storage index');\n\n-- SQL별 오프로드 여부\nSELECT sql_id, io_cell_offload_eligible_bytes, io_interconnect_bytes\n  FROM v$sql\n WHERE sql_id = '&sql_id';"],
 ["ul",["eligible for predicate offload = Smart Scan의 입력(오프로드 대상 바이트)","interconnect bytes returned by smart scan = Smart Scan의 출력(DB 서버로 돌아온 바이트)","saved by storage index = Storage Index 덕분에 아예 읽지 않은 바이트","eligible ÷ physical read total bytes 가 낮으면 Smart Scan을 못 타는 읽기가 많다는 뜻"]],
 ["tip","Smart Scan이 안 된다면: 버퍼 캐시 경유 읽기(작은 테이블·serial direct read 미발생), 인덱스 액세스, 오프로드 불가 함수 사용 여부를 확인하세요. 실행계획에 TABLE ACCESS STORAGE FULL이 보여도 실제 오프로드는 통계로 확인해야 합니다."]
]},
{ id:"exa-2", title:"CellCLI / dcli 점검", min:6, body:[
 ["code","bash","# 셀 1대에서\ncellcli -e list cell detail\ncellcli -e list physicaldisk where status != normal\ncellcli -e list celldisk attributes name,status,size\ncellcli -e list griddisk attributes name,status,asmmodestatus,asmdeactivationoutcome\ncellcli -e list flashcache detail\ncellcli -e list alerthistory\n\n# 전체 셀 동시 (DB 서버에서, root)\ndcli -g ~/cell_group -l root \"cellcli -e list cell attributes name,status\"\ndcli -g ~/cell_group -l root \"cellcli -e list physicaldisk where status != normal\""],
 ["p","셀 1대를 점검 목적으로 내릴 때 순서:"],
 ["code","bash","# 1) Yes가 아닌 griddisk가 하나도 없어야 함 (출력이 비어야 정상)\ncellcli -e \"list griddisk attributes name where asmdeactivationoutcome != 'Yes'\"\n# 2) 비활성화 (10분 이상 걸릴 수 있음) 후 확인\ncellcli -e alter griddisk all inactive\ncellcli -e \"list griddisk where status != 'inactive'\"   # 출력 없으면 안전\n# 3) 작업 / 재기동 후 활성화\ncellcli -e alter griddisk all active\n# 4) asmmodestatus 가 SYNCING → ONLINE(또는 UNUSED) 될 때까지 대기 후 다음 셀\ncellcli -e list griddisk attributes name,asmmodestatus"],
 ["warn","asmdeactivationoutcome이 Yes가 아닌 griddisk가 하나라도 있으면 셀을 내리면 안 됩니다. 디스크그룹이 dismount되어 DB가 비정상 종료됩니다. 이 상태에서 비활성화를 시도하면 CELL-01548 에러가 나는데, 이때는 다른 셀의 재동기화(redundancy 복구)가 끝난 뒤 재시도합니다."]
]},
{ id:"exa-3", title:"하드웨어·헬스체크·SW 버전", min:6, body:[
 ["code","bash","# 이미지/버전\nimageinfo\nimagehistory\n\n# DB 서버 상태\ndbmcli -e list dbserver detail\ndbmcli -e list alerthistory\n\n# 하드웨어/펌웨어 프로파일 점검\n/opt/oracle.SupportTools/CheckHWnFWProfile\n\n# ILOM 장애 내역 (DB 서버에서 로컬 ILOM 조회)\nipmitool sunoem cli \"show /SP/faultmgmt\"\n\n# AHF: exachk 헬스체크, 진단 수집\nahfctl version\nahfctl statusahf\nexachk\ntfactl diagcollect -last 4h\n# SR 번호를 붙여 바로 업로드 (업로드 설정 필요)\ntfactl diagcollect -last 4h -sr <SR번호>"],
 ["tbl",[["Exadata System Software","포인트"],["24.1","Exascale 도입. 2025년 12월 24.1.19가 마지막 업데이트"],["25.1 (2024.12)","X11M 지원 시작. X11M-Z HC 스토리지는 25.1.0 이상 필요. 2026년 7월 25.1.19가 마지막 업데이트"],["25.2 (2025.7)","X11M XT 스토리지, AI Smart Scan 강화, 신규 설치 시 SELinux 기본 적용 등"],["26.x","2026년 26.1·26.2 릴리스 진행 중 — 최신 권장 버전은 Exadata 블로그·KB153930 확인"]]],
 ["ul",["X11M DB 서버는 미사용 CPU 코어 끄기, 전력 목표 지정, 야간·주말 저전력 모드 같은 전력 관리 기능을 지원","패치 계획 시 '대상 이미지가 하드웨어 모델을 지원하는가'와 'GI/DB 최소 버전'을 KB153930에서 같이 확인"]],
 ["tip","ILOM에 남은 과거 fault가 이미 조치됐다면 ILOM faultmgmt shell에서 clear해야 알람이 사라집니다. 하드웨어 교체 건은 SR에 ILOM snapshot을 첨부하는 것이 표준입니다."]
]}
],
quiz:[
 {q:"Smart Scan이 동작하기 위한 기본 조건은?",o:["인덱스 Range Scan","Full Scan + Direct Path Read","버퍼 캐시 경유 읽기","Nested Loop 조인"],a:1,e:"Smart Scan은 Full Table/Index Fast Full Scan이 Direct Path Read로 수행될 때 셀로 오프로드됩니다."},
 {q:"셀을 내리기 전 모든 griddisk에서 반드시 Yes여야 하는 속성은?",o:["asmmodestatus","asmdeactivationoutcome","status","cachingPolicy"],a:1,e:"asmdeactivationoutcome = Yes 이면 해당 griddisk를 비활성화해도 ASM 미러가 다른 셀에 온전하다는 뜻입니다."},
 {q:"Storage Index에 대한 설명으로 옳은 것은?",o:["DBA가 CREATE로 생성","셀 메모리에 영역별 min/max를 자동 유지","DB 서버 SGA에 저장","HCC 테이블에만 동작"],a:1,e:"Storage Index는 셀 소프트웨어가 자동으로 만들고 메모리에 유지합니다. DBA가 생성하지 않습니다."},
 {q:"여러 셀에 같은 명령을 동시에 실행하는 도구는?",o:["cellcli","dcli","dbmcli","asmcmd"],a:1,e:"dcli -g <그룹파일> -l <계정> \"명령\" 형태로 여러 노드에 병렬 실행합니다."},
 {q:"HCC 압축 레벨이 아닌 것은?",o:["QUERY LOW","ARCHIVE HIGH","OLTP","QUERY HIGH"],a:2,e:"HCC는 QUERY LOW/HIGH, ARCHIVE LOW/HIGH 4단계입니다. OLTP(Advanced Row Compression)는 HCC가 아닙니다."},
 {q:"셀 griddisk를 비활성화하다 CELL-01548이 났다. 올바른 대응은?",o:["IGNORE REDUNDANCY로 강제 진행", "다른 셀의 재동기화가 끝나 redundancy가 복구된 뒤 재시도", "ASM 인스턴스 재기동", "griddisk DROP"],a:1,e:"Exadata 문서: CELL-01548이 나면 ASM 디스크그룹 redundancy를 먼저 복구한 뒤 다시 시도하라고 안내합니다."},
 {q:"X11M-Z 데이터베이스 서버의 CPU 구성은?",o:["2 x 32코어 AMD EPYC","1 x 32코어 AMD EPYC 9J15","2 x 24코어 Intel Xeon","1 x 64코어 AMD EPYC"],a:1,e:"Exadata 문서: X11M-Z DB 서버는 1 x 32코어 AMD EPYC 9J15(2.95GHz, 최대 4.4GHz) 단일 소켓입니다."},
 {q:"X11M HC-Z 스토리지 서버 1대의 하드디스크 구성은?",o:["12 x 22TB","6 x 22TB","8 x 18TB","4 x 30.72TB NVMe"],a:1,e:"HC-Z는 6 x 22TB HDD + 2 x 6.8TB 플래시입니다. 일반 X11M HC는 12 x 22TB입니다."},
 {q:"X11M 계열 시스템의 최소 구성은?",o:["DB 1대 + 셀 2대","DB 2대 + 셀 3대","고정 Eighth Rack","DB 2대 + 셀 7대"],a:1,e:"X11M은 모두 유연 구성으로 최소 DB 서버 2대 + 스토리지 서버 3대부터 시작하며, 고정 Eighth Rack은 더 이상 제공되지 않습니다."},
 {q:"X11M HC-Z 스토리지 서버의 768GB 메모리 중 XRMEM 캐시로 쓰이는 양은?",o:["128GB","256GB","512GB","768GB 전부"],a:2,e:"Exadata 기술 아키텍처 문서: HC-Z는 768GB DDR5 중 512GB가 XRMEM 캐시 전용입니다."},
 {q:"Exadata Exascale이 처음 도입된 Exadata System Software 릴리스는?",o:["23.1","24.1","25.1","25.2"],a:1,e:"Exascale은 24.1.0에서 도입됐고 RoCE 기반(X8M-2 이후) 하드웨어에서 동작합니다(8소켓 모델 제외)."}
]},
/* ───────────────────────── 11. ZFS Storage (ZS11-2) ───────────────────────── */
{ id:"zfs", name:"ZFS Storage", icon:"🗄️", desc:"ZS11-2·풀·쉐어·RMAN 백업·클러스터",
lessons:[
{ id:"zfs-1", title:"ZS11-2 하드웨어와 아키텍처", min:5, body:[
 ["tbl",[["항목","ZS11-2 컨트롤러"],["구성","컨트롤러 1대 또는 2대(클러스터) + 디스크 셸프 1~48대"],["CPU","2 x 32코어 2.95GHz (AMD EPYC 9J15)"],["메모리","512GB / 1.0TB / 1.5TB / 2.25TB 중 선택"],["시스템 디스크","2.5인치 3.84TB NVMe SSD 2개 (전면 4슬롯 중 2개 사용)"],["PCIe","Gen5 9슬롯 (전용 3, 가용 6)"],["전원","핫스왑 PSU 2개, N+N 이중화"],["디스크 셸프","DE3-24P(플래시·성능형), DE3-24C(용량형)"],["소프트웨어","Oracle ZFS Storage OS 8.8.x"]]],
 ["ul",["DRAM 중심(DRAM-centric) 아키텍처 — 읽기는 DRAM(ARC) → 읽기 캐시 SSD(L2ARC) → HDD 순으로 처리","동기 쓰기는 log 장치(ZIL용 SSD)가 받아 지연을 줄임","관리 인터페이스: BUI(웹), CLI(ssh), REST API","DTrace Analytics로 디스크·플래시·CPU·네트워크·프로토콜을 실시간 세밀하게 분석","NAS(NFS/SMB)·SAN(iSCSI/FC)·오브젝트 스토리지 지원, 스냅샷·클론·씬 프로비저닝·압축·복제 제공"]],
 ["code","bash","# 컨트롤러에 ssh 접속 (CLI = aksh)\nssh root@zfssa-a\n\nzfssa-a:> maintenance hardware show      # 컨트롤러·셸프·디스크 상태\nzfssa-a:> maintenance problems show      # 활성 장애(fault) 목록\nzfssa-a:> configuration storage show     # 풀 상태\nzfssa-a:> configuration cluster show     # 클러스터 상태"],
 ["tip","CLI는 컨텍스트 이동 방식이라 각 단계에서 'help'나 Tab 키로 가능한 명령을 확인하는 습관이 안전합니다. OS 8.8 마이크로 버전에 따라 일부 속성명이 다를 수 있습니다."]
]},
{ id:"zfs-2", title:"스토리지 풀과 데이터 프로파일", min:6, body:[
 ["tbl",[["프로파일","특징 / 용도"],["Mirrored","용량 절반, 높은 신뢰성·성능 — 공간 여유가 있고 성능이 중요할 때(DB 스토리지)"],["Triple mirrored","3중 미러, IOPS·보호 수준 최고. 확장 셸프 없는 컨트롤러에는 비권장"],["Double parity RAID","미러보다 대용량. 백업 같은 순차 처리 위주 또는 랜덤 읽기가 적은 대용량 데이터"],["Single parity RAID","비핵심 용도. 순수 스트리밍이면 double parity가 용량·처리량 모두 유리"],["Striped","중복 없음 — 운영 데이터에 사용 금지"]]],
 ["ul",["Log 장치: striped 또는 mirrored만 가능 — striped는 이중 장애 시 log 데이터 유실 가능하므로 mirrored 강력 권장","Cache(읽기 캐시) 장치: 항상 striped. 클러스터에서는 해당 풀을 import한 노드만 cache를 사용","풀에 한 번 넣은 데이터 디스크는 풀을 통째로 지우지 않고는 뺄 수 없음 — 디스크 추가 전 반드시 재확인","권장 운영 방식은 단일 풀. 중복성·성능 특성이 크게 다를 때만(예: mirror 풀 + RAID 풀) 여러 풀","NSPF(No Single Point of Failure) 프로파일은 디스크 셸프 하나가 통째로 죽어도 데이터 유지","All-Flash 풀은 데이터 SSD + 선택적 log 장치로 구성(read cache·meta 장치 없음)"]],
 ["code","bash","zfssa-a:> configuration storage show\nzfssa-a:> configuration storage\nzfssa-a:configuration storage> show      # 선택된 풀의 프로파일·용량·장치 구성"],
 ["warn","풀 생성·디스크 추가는 되돌릴 수 없는 작업입니다. 운영 장비에서는 BUI의 Verify & Allocate 화면에서 셸프별 배치를 눈으로 확인한 뒤 Commit 하세요."]
]},
{ id:"zfs-3", title:"프로젝트·쉐어 CLI 실무", min:6, body:[
 ["p","Project는 쉐어의 묶음이자 기본 속성(recordsize, logbias, 압축, 할당량 등)을 물려주는 단위입니다. Share는 파일시스템(NFS/SMB) 또는 LUN(iSCSI/FC)입니다."],
 ["code","bash","# RMAN 백업용 프로젝트 생성\nzfssa-a:> shares\nzfssa-a:shares> project rman_bkp\nzfssa-a:shares rman_bkp (uncommitted)> set recordsize=1M\nzfssa-a:shares rman_bkp (uncommitted)> set logbias=throughput\nzfssa-a:shares rman_bkp (uncommitted)> set compression=lz4\nzfssa-a:shares rman_bkp (uncommitted)> commit\n\n# 프로젝트 안에 파일시스템 쉐어 생성\nzfssa-a:shares> select rman_bkp\nzfssa-a:shares rman_bkp> filesystem bkp01\nzfssa-a:shares rman_bkp/bkp01 (uncommitted)> commit\nzfssa-a:shares rman_bkp> show\n\n# 프로젝트 단위 스냅샷 (패치·이관 전)\nzfssa-a:shares rman_bkp> snapshots\nzfssa-a:shares rman_bkp snapshots> snapshot before_patch_20261117"],
 ["ul",["쉐어는 프로젝트 속성을 상속 — 개별 변경 시 그 쉐어만 덮어씀","takeover·failback 시간은 쉐어/LUN 개수에 비례 — 수천 개 이하로 유지 권장","스냅샷은 사실상 무제한, 클론으로 테스트 DB를 빠르게 생성 가능"]]
]},
{ id:"zfs-4", title:"Oracle DB 백업 연계 (dNFS·RMAN)", min:7, body:[
 ["ul",["백업 전용 Project를 분리하고 쉐어 여러 개에 RMAN 채널을 나눠 병렬 처리","백업 쉐어 권장 속성: Database record size 1M, Synchronous write bias = Throughput (구버전 Exadata 연계 문서에는 128K 권장도 있으니 장비·버전별 백서 확인)","압축은 LZ4가 공간 절약과 CPU 비용의 균형점","최대 처리량이 필요하면 Oracle Direct NFS(dNFS) 사용","OISP(Oracle Intelligent Storage Protocol): 12.2 이상 dNFS 클라이언트가 I/O 요청에 속성 힌트를 실어 보내(NFSv4.0/4.1) 어플라이언스가 캐싱·write bias를 최적화"]],
 ["code","bash","# STEP 1. dNFS 활성화 (oracle 계정, 해당 홈 DB 중지 후)\ncd $ORACLE_HOME/rdbms/lib\nmake -f ins_rdbms.mk dnfs_on\n\n# STEP 2. $ORACLE_HOME/dbs/oranfstab 작성 (다중 경로 예)\nserver: zfssa-a\nlocal: 192.168.10.11 path: 192.168.10.101\nlocal: 192.168.10.12 path: 192.168.10.102\nexport: /export/rman_bkp/bkp01 mount: /zfssa/bkp01\n\n# STEP 3. DB 기동 후 alert log 확인\ngrep -i \"Direct NFS\" $ORACLE_BASE/diag/rdbms/dbbig/DBBIG1/trace/alert_DBBIG1.log\n# → Oracle instance running with ODM: Oracle Direct NFS ODM Library Version ..."],
 ["code","sql","-- 백업이 돌고 있을 때 확인 (파일 접근 전에는 0행이 정상)\nSELECT svrname, dirname, nfsversion FROM gv$dnfs_servers;\nSELECT inst_id, COUNT(*) FROM gv$dnfs_channels GROUP BY inst_id;"],
 ["code","rman","RUN {\n  ALLOCATE CHANNEL c1 DEVICE TYPE DISK FORMAT '/zfssa/bkp01/%U';\n  ALLOCATE CHANNEL c2 DEVICE TYPE DISK FORMAT '/zfssa/bkp02/%U';\n  ALLOCATE CHANNEL c3 DEVICE TYPE DISK FORMAT '/zfssa/bkp03/%U';\n  ALLOCATE CHANNEL c4 DEVICE TYPE DISK FORMAT '/zfssa/bkp04/%U';\n  BACKUP INCREMENTAL LEVEL 0 SECTION SIZE 64G DATABASE\n    PLUS ARCHIVELOG;\n}"],
 ["tip","v$dnfs_servers가 비어 있다고 dNFS가 실패한 게 아닙니다. 데이터베이스가 해당 NFS 경로의 파일을 실제로 열어야 행이 나타납니다. 백업을 돌리는 중에 조회하세요."]
]},
{ id:"zfs-5", title:"클러스터·복제·장애 대응", min:6, body:[
 ["ul",["2대 컨트롤러 클러스터는 active-active — 풀마다 소유 컨트롤러를 지정","피어 장애가 감지되면 takeover는 자동으로 시도되고, 점검용으로 수동 실행도 가능","failback은 절대 자동으로 일어나지 않음 — 관리자가 직접 수행","takeover 후 상태: 살아있는 쪽 OWNER(Active, takeover completed) / 상대 STRIPPED(Ready, waiting for failback) → failback 하면 CLUSTERED-CLUSTERED(active-active)로 복귀","takeover·failback 동안 클라이언트가 스토리지에 접근 못 하는 구간이 있고, 보통 failback이 takeover보다 오래 걸림","복제(Replication)는 프로젝트/쉐어 단위로 원격 장비에 전송, 재해 시 대상 쪽에서 reverse 해 서비스 전환"]],
 ["code","bash","# 클러스터 상태\nzfssa-a:> configuration cluster\nzfssa-a:configuration cluster> show\n#   state = AKCS_CLUSTERED  ← 정상(active-active)\n\n# 계획된 점검: B 노드 작업 전 A가 takeover\nzfssa-a:configuration cluster> takeover\n#   state = AKCS_OWNER / peer_state = AKCS_STRIPPED\n\n# B 노드 작업 완료·기동 확인 후 수동 failback\nzfssa-a:configuration cluster> failback\n\n# 장애 확인\nzfssa-a:> maintenance problems show\nzfssa-a:> maintenance hardware show"],
 ["warn","점검이 끝났는데 failback을 잊으면 한 컨트롤러가 모든 풀을 계속 서비스합니다. 성능도 떨어지고 그 상태에서 남은 노드가 죽으면 서비스가 멈춥니다. 작업계획서 마지막 STEP에 failback과 AKCS_CLUSTERED 확인을 꼭 넣으세요."],
 ["tip","DB 서버 쪽에서는 takeover 구간에 NFS I/O가 잠시 멈췄다가 재개됩니다. 백업 작업 시간과 점검 시간이 겹치지 않게 스케줄을 조정하세요."]
]}
],
quiz:[
 {q:"ZS11-2 클러스터에서 failback에 대한 설명으로 옳은 것은?",o:["피어가 살아나면 자동으로 failback 된다","failback은 자동으로 일어나지 않고 관리자가 수행한다","takeover와 failback 모두 수동만 가능하다","failback은 REST API로만 가능하다"],a:1,e:"문서: takeover는 피어 장애 감지 시 자동 시도되지만, failback은 절대 자동으로 일어나지 않습니다."},
 {q:"ZS11-2 시스템이 지원하는 디스크 셸프 수 범위는?",o:["1~12대","1~24대","1~48대","1~96대"],a:2,e:"ZS11-2는 컨트롤러 1~2대와 디스크 셸프 1~48대로 구성됩니다."},
 {q:"백업처럼 순차 처리 위주 대용량 워크로드에 문서가 권장하는 데이터 프로파일은?",o:["Mirrored","Triple mirrored","Double parity RAID","Striped"],a:2,e:"Double parity RAID는 미러보다 용량이 크고 백업 같은 고처리량 순차 워크로드용으로 설명됩니다."},
 {q:"Log 장치에 설정할 수 있는 프로파일은?",o:["striped 또는 mirrored","double parity만","triple mirrored만","항상 striped"],a:0,e:"Log 장치는 striped 또는 mirrored만 가능하며, 이중 장애 대비로 mirrored가 강력 권장됩니다. 항상 striped인 것은 cache 장치입니다."},
 {q:"Oracle dNFS를 활성화하는 명령은?",o:["srvctl enable dnfs","make -f ins_rdbms.mk dnfs_on","ALTER SYSTEM SET dnfs=TRUE","relink dnfs"],a:1,e:"$ORACLE_HOME/rdbms/lib 에서 make -f ins_rdbms.mk dnfs_on 을 실행합니다(비활성화는 dnfs_off)."},
 {q:"OISP(Oracle Intelligent Storage Protocol)의 역할은?",o:["ZFS 간 복제 프로토콜","dNFS 클라이언트가 I/O 요청 속성 힌트를 어플라이언스에 전달","RMAN 카탈로그 동기화","ILOM 모니터링"],a:1,e:"OISP는 Oracle dNFS 클라이언트가 I/O 요청에 속성을 실어 보내 어플라이언스가 캐싱·write bias를 최적화하게 합니다(NFSv4.0/4.1)."},
 {q:"RMAN 백업 쉐어의 Synchronous write bias(logbias) 권장값은?",o:["Latency","Throughput","Off","Mirror"],a:1,e:"백업 셋 처리에는 Throughput이 권장됩니다. Latency는 지연에 민감한 동기 쓰기용입니다."},
 {q:"ZFSSA 풀에 이미 추가한 데이터 디스크를 빼려면?",o:["CLI에서 remove disk","풀을 통째로 삭제해야만 가능","takeover 후 제거","재부팅 후 제거"],a:1,e:"문서 경고: 한 번 풀에 추가한 데이터 디스크는 풀을 파괴하고 데이터를 잃지 않고서는 제거할 수 없습니다."}
]},
/* ───────────────────────── 12. 장애대응 ───────────────────────── */
{ id:"trouble", name:"장애대응", icon:"🚨", desc:"Alert log·ADR·에러별 대처·SR",
lessons:[
{ id:"tr-1", title:"Alert log와 ADRCI", min:5, body:[
 ["code","bash","# Alert log 위치\n# $ORACLE_BASE/diag/rdbms/<db_unique_name 소문자>/<SID>/trace/alert_<SID>.log\ntail -200f /u01/app/oracle/diag/rdbms/dbbig/DBBIG1/trace/alert_DBBIG1.log\n\nadrci\nadrci> show homes\nadrci> set home diag/rdbms/dbbig/DBBIG1\nadrci> show alert -tail 100\nadrci> show problem\nadrci> show incident\n# SR용 인시던트 패키지 (논리 패키지 생성 → 물리 zip 생성)\nadrci> ips create package problem 3 correlate all\nadrci> ips generate package 1 in /tmp\n# 한 번에: 인시던트 번호로 바로 zip 생성\nadrci> ips pack incident <인시던트번호> in /tmp"],
 ["code","sql","SELECT name, value FROM v$diag_info;"],
 ["tip","장애 시간대 alert log를 볼 때는 '첫 번째 에러'를 찾는 게 핵심입니다. 뒤따르는 에러 대부분은 연쇄 결과입니다."]
]},
{ id:"tr-2", title:"자주 만나는 ORA 에러 대처", min:7, body:[
 ["tbl",[["에러","의미","1차 대응"],["ORA-00257","Archiver error","FRA/아카이브 공간 확보(RMAN 백업 후 삭제)"],["ORA-01555","snapshot too old","UNDO 확장·retention 조정, 장시간 쿼리 튜닝"],["ORA-01652","TEMP 확장 불가","TEMP 사용 세션 확인, TEMP 파일 추가"],["ORA-01653/01654","테이블/인덱스 익스텐트 확장 불가","테이블스페이스 데이터파일 추가"],["ORA-04031","Shared Pool 할당 실패","하드파싱·리터럴 SQL 확인, Shared Pool 증설"],["ORA-00060","Deadlock","trace의 deadlock graph로 애플리케이션 로직 수정"],["ORA-00020","processes 초과","세션 누수 점검, PROCESSES 상향(재기동)"],["ORA-01000","열린 커서 초과","애플리케이션 커서 미close 점검"],["ORA-12514","리스너가 서비스를 모름","서비스 기동·등록 상태, lsnrctl status"],["ORA-12541","리스너 없음","리스너 기동 여부, 포트"],["ORA-28000","계정 잠김","실패 원인 확인 후 ACCOUNT UNLOCK"],["ORA-01017","잘못된 계정/비밀번호","대소문자, 패스워드파일(원격 SYSDBA)"]]],
 ["code","bash","lsnrctl status\nlsnrctl services\n# RAC SCAN 리스너 (grid)\nsrvctl status scan_listener\nlsnrctl status LISTENER_SCAN1"]
]},
{ id:"tr-3", title:"ORA-00600 / ORA-07445", min:4, body:[
 ["ul",["둘 다 Oracle 내부 오류 — 대부분 버그이므로 SR 대상","ORA-00600의 첫 번째 인자(argument[])가 오류 위치를 식별하는 핵심 키","MOS Doc ID 153788.1 (ORA-600/ORA-7445 Lookup Tool)로 인자 검색 → 알려진 버그·패치 확인","트레이스·인시던트는 ADR incident 디렉터리에 생성 → adrci ips로 패키징"]],
 ["code","bash","adrci> show incident -mode detail -p \"problem_key like '%ORA 600%'\""],
 ["tip","SR 올리기 전에 '최근 변경사항(패치·파라미터·OS·애플리케이션 배포)'을 정리해 두세요. 엔지니어가 가장 먼저 묻는 질문입니다."]
]},
{ id:"tr-4", title:"SR 작성 템플릿", min:4, body:[
 ["code","text","[제목] <제품/버전> <핵심 증상> (예: 19.24 RAC node2 instance crash with ORA-00600 [kcbz_check_objd_typ])\n\n1. 증상 (Problem Description)\n   - 발생 일시 / 지속 시간 / 재현 여부\n2. 영향도 (Business Impact)\n   - 서비스 중단 여부, 영향 사용자 범위\n3. 환경 (Environment)\n   - DB/GI 버전 + RU, OS, Exadata 이미지, RAC 여부, 노드 수\n4. 최근 변경사항 (Recent Changes)\n5. 수행한 조치 (Actions Taken)\n6. 첨부 (Attachments)\n   - alert log, trace, AHF diagcollect, AWR(전·후)\n7. 요청 사항 (Request)\n   - 원인 분석 / 재발 방지 / 패치 권고"],
 ["ul",["Severity 1은 24x7 대응 — 담당자가 계속 연락 가능해야 함","영문 작성 시 시간대(KST, UTC+9)를 명시"]]
]}
],
quiz:[
 {q:"ORA-00600 분석 시 가장 먼저 확인할 정보는?",o:["세션 수","첫 번째 인자(argument)","SGA 크기","리스너 로그"],a:1,e:"첫 번째 인자가 내부 오류 위치를 식별하며, Doc ID 153788.1 Lookup Tool에서 이 값으로 알려진 이슈를 검색합니다."},
 {q:"ORA-12514의 의미는?",o:["리스너가 없음","리스너가 요청한 서비스를 모름","비밀번호 오류","계정 잠김"],a:1,e:"리스너는 떠 있지만 해당 서비스가 등록되어 있지 않은 상태입니다. 서비스 기동·LREG 등록 상태를 확인합니다."},
 {q:"SR용으로 인시던트 관련 파일을 묶는 ADRCI 명령은?",o:["show incident","ips create package","purge","show alert"],a:1,e:"ips create package → ips generate package 순서로 인시던트 관련 트레이스를 zip으로 만듭니다."},
 {q:"ORA-04031이 반복될 때 우선 점검할 것은?",o:["리두 로그 크기","하드파싱·리터럴 SQL","UNDO 보존시간","아카이브 공간"],a:1,e:"바인드 변수 미사용 리터럴 SQL로 인한 하드파싱 과다와 Shared Pool 단편화가 대표 원인입니다."},
 {q:"ORA-00020 maximum number of processes exceeded 해결을 위해 늘리는 파라미터는?",o:["SESSIONS","PROCESSES","OPEN_CURSORS","JOB_QUEUE_PROCESSES"],a:1,e:"PROCESSES는 정적 파라미터라 SCOPE=SPFILE로 변경 후 재기동이 필요합니다. 세션 누수 여부도 함께 점검하세요."}
]}
];

/* ───────── 레슨별 근거 문서 (v0.0.2, Oracle 19c 공식 문서·MOS 기준 대조) ───────── */
(function () {
  var D = "https://docs.oracle.com/en/database/oracle/oracle-database/19/";
  var X = "https://docs.oracle.com/en/engineered-systems/exadata-database-machine/";
  var Z = "https://docs.oracle.com/en/storage/zfs-storage/zfs-appliance/os8-8-x/";
  var REFS = {
    "arch-1": [["Database Concepts 19c · Memory Architecture", D + "cncpt/memory-architecture.html"], ["Administrator's Reference 19c · Administering Oracle Database on Linux (HugePages/AMM)", D + "unxar/administering-oracle-database-on-linux.html"]],
    "arch-2": [["Database Concepts 19c · Process Architecture", D + "cncpt/process-architecture.html"], ["Database Reference 19c · V$BGPROCESS", D + "refrn/V-BGPROCESS.html"]],
    "arch-3": [["Database Concepts 19c · Oracle Database Instance", D + "cncpt/oracle-database-instance.html"]],
    "arch-4": [["Licensing Information 19c (사용자 PDB 3개)", D + "dblic/Licensing-Information.html"], ["Database Concepts 19c · Introduction (CDB)", D + "cncpt/introduction-to-oracle-database.html"]],
    "space-1": [["Database Reference 19c · Physical Database Limits", D + "refrn/physical-database-limits.html"], ["Database Concepts 19c · Logical Storage Structures", D + "cncpt/logical-storage-structures.html"]],
    "space-2": [["Database Concepts 19c · Logical Storage Structures (Undo)", D + "cncpt/logical-storage-structures.html"]],
    "space-3": [["Database Concepts 19c · Logical Storage Structures (Temp)", D + "cncpt/logical-storage-structures.html"]],
    "space-4": [["Database Reference 19c · Physical Database Limits", D + "refrn/physical-database-limits.html"]],
    "rman-3": [["Backup and Recovery User's Guide 19c · Performing Block Media Recovery", D + "bradv/rman-block-media-recovery.html"], ["Backup and Recovery Reference 19c · RECOVER", D + "rcmrf/RECOVER.html"]],
    "rac-1": [["Clusterware Administration and Deployment Guide 19c", D + "cwadd"], ["CRS-04185 · crsctl get css 파라미터", "https://docs.oracle.com/en/error-help/db/crs-04185/"]],
    "rac-3": [["RAC Administration 19c · Server Control Utility Reference", D + "racad/server-control-utility-reference.html"]],
    "zfs-1": [["ZFSSA OS8.8 · ZS11-2 Configuration Options", Z + "service-manual/oracle-zfs-storage-zs11-2-configuration-options.html"], ["ZFSSA OS8.8 · ZS11-2 Configuration Options (설치 가이드)", Z + "install-guide/oracle-zfs-storage-zs11-2-configuration-optionsig.html"]],
    "zfs-2": [["ZFSSA OS8.8 · Data Profiles for Storage Pools", Z + "admin-guide/data-profiles-storage-pools.html"], ["ZFSSA OS8.8 · Storage Pool Concepts", Z + "admin-guide/storage-pool-concepts.html"], ["ZFSSA OS8.8 · Creating a Storage Pool (CLI)", Z + "admin-guide/creating-storage-pool-cli.html"]],
    "zfs-3": [["ZFSSA OS8.8 · Administration Guide 목차", Z + "admin-guide/toc.htm"]],
    "zfs-4": [["Database 19c · Enabling and Disabling Direct NFS Client", D + "axdbi/enabling-and-disabling-direct-nfs-client-control-of-nfs.html"], ["ZFSSA OS8.8 · Oracle Intelligent Storage Protocol", "https://docs.oracle.com/cd/E91275_01/html/E91291/golex.html"]],
    "zfs-5": [["ZFSSA OS8.8 · Cluster Configuration BUI View", Z + "admin-guide/cluster-configuration-bui-view.html"], ["ZFSSA OS8.8 · Shutting Down a Clustered Configuration (CLI)", Z + "admin-guide/shutting-down-clustered-configuration-cli.html"], ["ZFSSA OS8.8 · RESTful API · Cluster", Z + "restful-api-guide/cluster.html"]],
    "rac-4": [["Clusterware Administration and Deployment Guide 19c", D + "cwadd"], ["AHF · tfactl diagcollect", "https://docs.oracle.com/en/engineered-systems/health-diagnostics/autonomous-health-framework/ahfug/tfactl-diagcollect.html"]],
    "asm-1": [["ASM Administrator's Guide 19c · Managing Capacity in Disk Groups", D + "ostmg/capacity-diskgroups.html"]],
    "asm-2": [["ASM Administrator's Guide 19c · Managing Disk Group Attributes", D + "ostmg/manage-diskgroup-attributes.html"], ["Exadata · Setting the Oracle ASM Disk Repair Timer", X + "sagug/setting-oracle-asm-disk-repair-timer.html"]],
    "asm-3": [["ASM Administrator's Guide 19c · ASMCMD Instance Management Commands", D + "ostmg/asmcmd-instance-commands.html"]],
    "patch-1": [["Database Patch Maintenance 19c (RU·MRP·RUR)", D + "dbptc/index.html"]],
    "patch-2": [["Database Patch Maintenance 19c", D + "dbptc/index.html"]],
    "patch-3": [["Database Patch Maintenance 19c (In-place/Out-of-place)", D + "dbptc/index.html"]],
    "patch-4": [["Exadata · Patchmgr Syntax for Storage Servers", X + "dbmmn/patchmgr-syntax-storage-servers.html"], ["Exadata · Patchmgr Syntax for Database Servers", X + "dbmmn/patchmgr-syntax-database-servers.html"]],
    "perf-2": [["Database Performance Tuning Guide 19c · Gathering Database Statistics (AWR)", D + "tgdba/gathering-database-statistics.html"]],
    "perf-4": [["SQL Tuning Guide 19c · Managing Historical Optimizer Statistics", D + "tgsql/managing-historical-optimizer-statistics.html"]],
    "sec-1": [["Security Guide 19c · Configuring Authentication (프로파일 기본값)", D + "dbseg/configuring-authentication.html"]],
    "sec-3": [["Security Guide 19c · Provisioning Audit Policies", D + "dbseg/configuring-audit-policies.html"]],
    "dg-1": [["Database Reference 19c · V$DATAGUARD_PROCESS", D + "refrn/V-DATAGUARD_PROCESS.html"], ["Data Guard Concepts and Administration 19c · Changes in This Release", D + "sbydb/release-changes.html"]],
    "dg-2": [["Data Guard Broker 19c · Changes in This Release", D + "dgbkr/release-changes.html"]],
    "dg-3": [["Refresh a Physical Standby (RECOVER STANDBY DATABASE FROM SERVICE)", D + "spmss/refresh-a-physical-standby-db.html"]],
    "exa-0": [["Exadata · Database Server X11M-Z Hardware Components", X + "dbmso/oracle-exadata-database-server-x11m-z-hardware-components.html"], ["Exadata · Storage Server X11M-Z HC Hardware Components", X + "dbmso/x11m-z-high-capacity-exadata-storage-server-components.html"], ["Exadata · Oracle Exadata X11M Support (25.1)", X + "dbmso/x11m-hardware.html"]],
    "exa-1": [["Exadata · Monitoring Smart I/O Using Database Statistics and Wait Events", X + "sagug/monitoring-smart-io-using-db-stats-and-wait-events.html"], ["Exadata · Oracle Exadata Exascale (24.1)", X + "dbmso/exascale.html"], ["Exadata Technical Architecture · HC Storage (XRMEM)", X + "edbid/exadata_storage_hc.html"]],
    "exa-2": [["Exadata · Shutting Down Exadata Storage Server", X + "dbmmn/shutting-exadata-storage-server.html"]],
    "exa-3": [["Exadata · What's New in System Software 25.2", X + "dbmso/whats-new-oracle-exadata-system-software-release-25.2.html"], ["AHF · On-Demand Diagnostic Collections", "https://docs.oracle.com/en/engineered-systems/health-diagnostics/autonomous-health-framework/ahfug/ondemand-diagnostic-collection.html"]]
  };
  window.DBBIG_CONTENT.forEach(function (c) { c.lessons.forEach(function (l) { if (REFS[l.id]) l.ref = REFS[l.id]; }); });

  /* v0.0.2 추가 퀴즈 */
  var ADD = {
    arch: [{ q: "19c 문서 기준, 비정상 종료된 프로세스의 '정리(cleanup) 작업'을 실제로 수행하는 프로세스는?", o: ["PMON 단독", "CLMN과 CLnn 헬퍼", "SMON", "LREG"], a: 1, e: "19c Concepts에 따르면 PMON은 비정상 종료 감지를 맡고, 정리 작업은 CLMN에 위임하며 CLMN은 다시 CLnn 헬퍼에 일을 나눕니다." },
           { q: "LGWR가 리두를 기록하는 시점으로 19c Concepts에 '없는' 것은?", o: ["커밋 시", "온라인 리두 로그 스위치 시", "SMON이 임시 세그먼트를 정리할 때", "리두 버퍼가 1/3 또는 1MB 찼을 때"], a: 2, e: "커밋, 로그 스위치, 마지막 기록 후 3초, 버퍼 1/3 또는 1MB, DBW가 쓰기 전 — 이 다섯 가지가 문서에 나온 시점입니다." }],
    asm: [{ q: "Failure Group 전체가 장애일 때 적용되는 FAILGROUP_REPAIR_TIME의 기본값은?", o: ["3.6시간", "8.5시간", "12시간", "24시간"], a: 3, e: "19c ASM 가이드: FAILGROUP_REPAIR_TIME 기본값은 24h입니다. 개별 디스크는 DISK_REPAIR_TIME을 따릅니다." }],
    patch: [{ q: "19c RUR(Release Update Revision)에 대한 설명으로 옳은 것은?", o: ["지금도 분기마다 2개씩 나온다", "2023년 1월 19.16.2를 마지막으로 중단됐다", "MRP와 같은 것이다", "Windows 전용이다"], a: 1, e: "RUR은 19.17(2022년 10월)부터 더 나오지 않았고, 19.16.2(2023년 1월)가 마지막입니다. 대신 Linux x86-64용 MRP가 도입됐습니다." },
            { q: "최신 Exadata patchmgr로 DB 서버를 업그레이드할 때 ISO zip 경로를 지정하는 옵션은?", o: ["--iso_repo", "--repo", "--image", "--zip"], a: 1, e: "현재 문서의 구문은 --repo { base_URL | zipped_iso_file } 입니다. 구버전에서는 -iso_repo를 썼습니다." }],
    rman: [{ q: "19c에서 deprecated된 RMAN 기능은?", o: ["RECOVER ... BLOCK", "Data Recovery Advisor (LIST/ADVISE/REPAIR FAILURE)", "CROSSCHECK", "Block Change Tracking"], a: 1, e: "Backup and Recovery 문서: Data Recovery Advisor는 19c부터 deprecated입니다." }],
    dg: [{ q: "RECOVER STANDBY DATABASE FROM SERVICE 실행 전 MRP를 멈추지 않으면 나는 에러는?", o: ["ORA-16000", "RMAN-05150", "ORA-01110", "RMAN-06054"], a: 1, e: "MOS 2431311.1 예시처럼 managed recovery가 돌고 있으면 RMAN-05150으로 실패합니다." }]
  };
  window.DBBIG_CONTENT.forEach(function (c) { if (ADD[c.id]) c.quiz = c.quiz.concat(ADD[c.id]); });
})();

/* ───────── v0.0.7 아키텍처 보강: UPDATE 한 건의 여행 (사용자 학습 노트 기반, 19c 문서 대조) ───────── */
(function () {
  var D = "https://docs.oracle.com/en/database/oracle/oracle-database/19/";
  var arch = window.DBBIG_CONTENT.filter(function (c) { return c.id === "arch"; })[0];
  if (!arch) return;
  var L = [
{ id:"arch-5", title:"UPDATE 한 건의 여행 ① 등장인물", min:4, body:[
 ["p","오라클이 UPDATE 한 건을 처리하는 과정을 사무실에 비유해 보면 등장인물이 한눈에 들어옵니다. 이 노선의 다음 역들은 모두 이 비유를 바탕으로 이어집니다."],
 ["tbl",[["사무실 비유","오라클 구성요소"],
  ["창고 (원본 장부 보관, 느림)","데이터파일 (디스크)"],
  ["내 책상 (지금 작업 중인 장부 페이지)","DB Buffer Cache (SGA 메모리)"],
  ["\"수정 전에는 이랬음\" 복사본 메모","Undo (언두 세그먼트)"],
  ["업무일지 초안 메모지 (책상 위)","Redo Log Buffer (SGA 메모리)"],
  ["업무일지 노트 (금고, 확실한 기록)","온라인 Redo Log File (디스크)"],
  ["내 전담 직원","서버 프로세스 (세션마다 하나)"],
  ["일지 담당 비서","LGWR"],
  ["창고 정리 담당 직원","DBWn"],
  ["업무 처리 매뉴얼 모음집","Library Cache (Shared Pool)"],
  ["사내 규정집·인명부","Dictionary Cache (Shared Pool)"]]],
 ["p","핵심 아이디어는 세 줄입니다."],
 ["ul",["창고(디스크)에 매번 가서 고치면 느리니까 책상(메모리)에서 빠르게 고친다.","\"무엇을 고쳤는지\"는 업무일지(Redo)에 확실하게 적어 둔다 — 이것만 디스크에 안전하게 남으면 커밋 완료.","창고 정리(데이터파일 반영)는 나중에 천천히 한다 — DBWn이 따로 처리."]],
 ["tip","\"커밋 = 데이터파일에 저장\"이 아닙니다. 커밋은 Redo가 온라인 Redo Log File에 기록됐다는 뜻이고, 데이터파일 반영은 별개의 일입니다. 이 차이를 이해하면 log file sync, 체크포인트, 인스턴스 복구가 모두 한 줄로 이어집니다."]
]},
{ id:"arch-6", title:"UPDATE 한 건의 여행 ② STEP별 내부 동작", min:7, body:[
 ["p","예제: 홍길동의 월급을 300에서 350으로 바꾸고 확정합니다."],
 ["code","sql","UPDATE emp SET salary = 350 WHERE name = '홍길동';\nCOMMIT;"],
 ["p","**STEP 1. 파싱 (요청 접수)** — 서버 프로세스가 Library Cache에서 똑같은 SQL의 공유 SQL 영역을 찾습니다. 있으면 소프트 파싱으로 실행계획을 재사용하고, 없으면 하드 파싱으로 실행계획을 새로 만듭니다. 테이블·컬럼·권한 같은 메타데이터는 Dictionary Cache에서 확인합니다."],
 ["p","**STEP 2. 블록 확보** — 대상 행이 든 블록이 Buffer Cache에 있으면 그대로 씁니다(논리적 읽기). 없으면 서버 프로세스가 데이터파일에서 읽어 Buffer Cache에 올립니다(물리적 읽기). 데이터파일에서 읽어 오는 것은 DBWn이 아니라 **서버 프로세스**입니다."],
 ["p","**STEP 3. 잠금** — 바꿀 행에 행 잠금(TX)을 걸고, 테이블에는 다른 세션이 DDL로 구조를 바꾸지 못하게 테이블 잠금(TM)을 겁니다. 다른 세션이 같은 행을 UPDATE하려 하면 커밋·롤백 때까지 기다립니다(대기 이벤트 'enq: TX - row lock contention')."],
 ["p","**STEP 4. Undo·Redo 생성** — 변경 전 값(300)을 Undo 블록에 기록합니다. 그리고 \"Undo 블록을 이렇게 바꿨다\"와 \"데이터 블록을 이렇게 바꿨다\"는 변경 내용(Redo 엔트리)을 서버 프로세스가 Redo Log Buffer에 씁니다. Undo 자체의 변경도 Redo로 보호된다는 점이 핵심입니다. Redo Log Buffer를 채우는 것은 LGWR가 아니라 **서버 프로세스**입니다."],
 ["p","**STEP 5. 블록 수정** — Buffer Cache의 블록을 350으로 고칩니다. 이 블록은 디스크와 내용이 달라진 '더티 버퍼'가 됩니다. 데이터파일(디스크)에는 아직 300이 들어 있습니다."],
 ["p","**STEP 6. COMMIT** — 트랜잭션에 커밋 SCN이 정해지고, 커밋 레코드가 Redo Log Buffer에 들어갑니다. LGWR가 Redo Log Buffer의 내용을 온라인 Redo Log File에 기록하는 동안 서버 프로세스는 'log file sync'로 기다립니다. 기록이 끝나면 잠금이 풀리고 사용자에게 \"Commit complete\"가 돌아갑니다."],
 ["p","**STEP 7. 나중에 DBWn이 반영** — 더티 블록은 체크포인트, 빈 버퍼 부족 같은 별도 조건이 생길 때 DBWn이 데이터파일에 씁니다. COMMIT과는 직접 연결되지 않습니다."],
 ["tbl",[["누가","무엇을"],["서버 프로세스","파싱, 데이터파일 → Buffer Cache 읽기, 잠금, Undo 생성, Redo Log Buffer 기록, 블록 수정"],["LGWR","Redo Log Buffer → 온라인 Redo Log File 기록 (커밋을 확정시키는 쪽)"],["DBWn","더티 버퍼(Buffer Cache) → 데이터파일 기록"],["CKPT","체크포인트 정보(SCN)를 컨트롤파일·데이터파일 헤더에 기록, DBWn에 쓰기 신호"]]],
 ["tip","\"커밋이 느려요\"라는 문의를 받으면 AWR에서 'log file sync'와 'log file parallel write'(LGWR의 실제 쓰기 시간)를 같이 보세요. 둘 다 높으면 Redo 디스크 I/O, 'log file sync'만 높으면 커밋 횟수가 너무 많은 애플리케이션을 의심합니다."]
]},
{ id:"arch-7", title:"SELECT와 읽기 일관성", min:5, body:[
 ["p","SELECT도 STEP 1(파싱)과 STEP 2(블록 확보)는 UPDATE와 같습니다. 다른 점은 데이터를 바꾸지 않는다는 것, 그리고 '쿼리를 시작한 시점'의 데이터를 보여준다는 것입니다."],
 ["ul",["쿼리가 시작될 때의 SCN이 기준점이 됩니다.","블록에 그 이후의 변경이나 아직 커밋되지 않은 변경이 있으면, Undo를 거꾸로 적용해 기준 시점의 블록 복사본(CR 블록)을 만들어 읽습니다.","그래서 다른 세션이 UPDATE 중이어도 SELECT는 기다리지 않고 커밋된 예전 값을 봅니다 — 읽기는 쓰기를 막지 않고, 쓰기도 읽기를 막지 않습니다.","SELECT는 행 잠금을 걸지 않습니다 (SELECT ... FOR UPDATE는 예외)."]],
 ["p","변경이 없으니 SELECT는 보통 Redo도, 더티 버퍼도 만들지 않습니다. 다만 대량 UPDATE 직후에 SELECT를 하면 앞선 트랜잭션의 흔적을 블록에서 정리하는 '지연 블록 정리(delayed block cleanout)' 때문에 SELECT가 약간의 Redo를 만들 수도 있습니다."],
 ["warn","쿼리가 오래 걸리는 동안 필요한 Undo가 다른 트랜잭션에 덮어써지면 CR 블록을 만들 수 없어 ORA-01555(snapshot too old)가 납니다. UNDO_RETENTION과 Undo 테이블스페이스 크기, 그리고 쿼리 자체의 수행 시간을 함께 봐야 합니다."]
]},
{ id:"arch-8", title:"정전이 나면? 인스턴스 복구와 Write-Ahead", min:5, body:[
 ["p","상황: COMMIT 직후, DBWn이 데이터파일에 반영하기 전에 서버 전원이 나갔습니다."],
 ["ul",["메모리(Buffer Cache)의 350은 사라집니다.","데이터파일에는 아직 300입니다.","하지만 온라인 Redo Log File에는 \"300 → 350, 커밋됨\"이 남아 있습니다."]],
 ["p","다음 기동 때 오라클은 인스턴스 복구를 자동으로 합니다. 단일 인스턴스는 SMON이, RAC에서는 살아 있는 인스턴스가 죽은 인스턴스의 복구를 맡습니다."],
 ["p","**STEP 1. Roll Forward (캐시 복구)** — 마지막 체크포인트 이후의 Redo를 모두 다시 적용합니다. 이때는 커밋 여부와 상관없이 전부 적용하므로, 커밋 안 된 변경과 그 변경의 Undo까지 되살아납니다."],
 ["p","**STEP 2. OPEN** — Roll Forward가 끝나면 데이터베이스를 엽니다. 사용자는 이 시점부터 접속할 수 있습니다."],
 ["p","**STEP 3. Roll Back (트랜잭션 복구)** — 커밋되지 않았던 트랜잭션은 Undo로 되돌립니다. 이 작업은 OPEN 이후 백그라운드에서 진행되고, 어떤 세션이 그 행에 접근하면 그 부분부터 먼저 되돌립니다."],
 ["tip","**Write-Ahead 규칙**: 변경된 블록이 데이터파일에 써지기 전에, 그 변경에 대한 Redo가 먼저 온라인 Redo Log File에 써져 있어야 합니다. DBWn은 쓰려는 버퍼의 Redo가 아직 디스크에 없으면 LGWR에게 먼저 쓰라고 신호하고 기다립니다. 그래서 데이터파일에 커밋 안 된 값이 들어가 있어도 Redo와 Undo로 언제든 되돌릴 수 있습니다."],
 ["p","복구 시간은 '마지막 체크포인트 이후 쌓인 Redo 양'에 비례합니다. FAST_START_MTTR_TARGET으로 목표 복구 시간을 정하면 오라클이 체크포인트를 그에 맞게 진행합니다."]
]},
{ id:"arch-9", title:"캐시 3종: Buffer·Library·Dictionary Cache", min:5, body:[
 ["tbl",[["캐시","위치","담는 것","못 찾으면(Miss)"],["Buffer Cache","SGA","데이터 블록","데이터파일에서 디스크 읽기"],["Library Cache","Shared Pool","파싱된 SQL·PL/SQL, 실행계획","하드 파싱"],["Dictionary Cache (Row Cache)","Shared Pool","테이블·컬럼·권한 등 메타데이터","딕셔너리 테이블 조회 (재귀 SQL)"]]],
 ["p","메타데이터는 '데이터에 대한 데이터'입니다. 테이블 구조, 컬럼 타입, 인덱스, 사용자 권한 같은 정보가 여기에 해당합니다."],
 ["ul",["Library Cache·Dictionary Cache 적중률은 높을수록 좋습니다. 하드 파싱이 많으면 바인드 변수를 쓰지 않고 값을 SQL에 직접 넣는(리터럴) 애플리케이션을 먼저 의심합니다.","Buffer Cache 적중률은 높다고 무조건 좋은 게 아닙니다. 비효율적인 SQL이 같은 블록을 수백만 번 읽어도 적중률은 99%로 나옵니다. 대기 이벤트와 논리적 읽기(consistent gets) 양을 같이 봐야 합니다."]],
 ["code","sql","-- Library Cache (SQL 영역)\nSELECT namespace, gets, gethits, ROUND(gethitratio*100,2) AS gethit_pct,\n       pins, pinhits, ROUND(pinhitratio*100,2) AS pinhit_pct, reloads, invalidations\nFROM   v$librarycache\nWHERE  namespace = 'SQL AREA';\n\n-- Dictionary Cache\nSELECT ROUND((1 - SUM(getmisses)/SUM(gets))*100, 2) AS dict_hit_pct FROM v$rowcache;\n\n-- Buffer Cache 관련 누적 통계\nSELECT name, value FROM v$sysstat\nWHERE  name IN ('db block gets','consistent gets','physical reads');"],
 ["tip","reloads·invalidations가 계속 늘면 Shared Pool이 부족하거나 객체가 자주 재컴파일되는 상황입니다. 적중률 한 숫자보다 이런 변화량이 더 많은 걸 알려줍니다."]
]},
{ id:"arch-10", title:"더티 버퍼와 DBWn·LGWR의 쓰기 시점", min:5, body:[
 ["p","더티 버퍼는 Buffer Cache에서 수정됐지만 아직 DBWn이 데이터파일에 쓰지 않은 블록입니다."],
 ["ul",["COMMIT을 했어도 더티 상태일 수 있습니다 — Redo는 이미 온라인 Redo Log File에 있으니 안전합니다.","반대로 COMMIT 전의 변경을 DBWn이 데이터파일에 먼저 쓸 수도 있습니다 — Undo가 있으니 롤백할 수 있습니다.","DBWn이 쓰고 나면 클린 버퍼가 되어 캐시에서 밀려나도 문제없습니다."]],
 ["p","**LGWR가 Redo Log Buffer를 파일에 쓰는 시점** (19c Concepts 기준)"],
 ["ul",["사용자가 COMMIT할 때","온라인 Redo Log 스위치가 일어날 때","마지막 기록 후 3초가 지났을 때","Redo Log Buffer가 1/3 찼거나 1MB가 쌓였을 때","DBWn이 더티 버퍼를 쓰기 전 (Write-Ahead)"]],
 ["p","그래서 커밋하지 않은 변경의 Redo도 위 조건에 걸리면 파일에 먼저 기록될 수 있습니다."],
 ["p","**DBWn이 더티 버퍼를 쓰는 대표적인 시점**"],
 ["ul",["서버 프로세스가 빈(재사용 가능한) 버퍼를 일정 개수 이상 찾지 못했을 때","체크포인트를 진행시켜야 할 때 (로그 스위치, FAST_START_MTTR_TARGET, ALTER SYSTEM CHECKPOINT)","테이블스페이스를 OFFLINE·READ ONLY로 바꾸거나 BEGIN BACKUP을 할 때 등"]],
 ["code","bash","# 백그라운드 프로세스 확인 (oracle 계정)\nps -ef | grep -E 'ora_(dbw|ckpt|lgwr)' | grep -v grep"]
]},
{ id:"arch-11", title:"로그 스위치 vs 체크포인트", min:6, body:[
 ["p","**ALTER SYSTEM SWITCH LOGFILE**은 'Redo Log Buffer를 파일에 저장하는 명령'이 아닙니다. LGWR가 지금 쓰던 그룹을 닫고 다음 그룹으로 기록 대상을 옮기는 동작입니다."],
 ["ul",["로그 시퀀스 번호(SEQUENCE#)가 1 올라갑니다.","닫힌 그룹은 체크포인트가 끝나기 전에는 ACTIVE, 끝나면 INACTIVE가 됩니다.","로그 스위치 때마다 체크포인트가 자동으로 요청되고, 백그라운드에서 비동기로 진행됩니다.","아카이브 모드면 ARCn이 닫힌 그룹을 아카이브 로그로 복사합니다."]],
 ["p","**ALTER SYSTEM CHECKPOINT** (전체 체크포인트)는 다음 순서로 진행되고, 끝날 때까지 프롬프트가 돌아오지 않습니다."],
 ["ul",["① 지금까지의 Redo를 먼저 온라인 Redo Log File에 기록 (Write-Ahead)","② DBWn이 그 시점의 더티 버퍼를 모두 데이터파일에 기록","③ CKPT가 컨트롤파일과 데이터파일 헤더의 체크포인트 SCN을 갱신","④ 더 이상 복구에 필요 없는 그룹이 ACTIVE → INACTIVE"]],
 ["tbl",[["구분","로그 스위치 체크포인트","ALTER SYSTEM CHECKPOINT"],["범위","닫힌 로그가 담고 있는 위치(RBA)까지","그 시점의 모든 더티 버퍼"],["방식","백그라운드 비동기","완료될 때까지 대기"],["목적","닫힌 그룹을 재사용 가능하게","DB 전체를 디스크에 일관되게 반영"]]],
 ["p","RAC에서 ALTER SYSTEM CHECKPOINT는 기본이 GLOBAL이라 모든 인스턴스에서 체크포인트를 수행합니다. 내 인스턴스만 하려면 ALTER SYSTEM CHECKPOINT LOCAL을 씁니다."],
 ["warn","alert 로그에서 로그 스위치('Thread 1 advanced to log sequence ...')는 항상 보이지만, 체크포인트 시작·완료 메시지는 LOG_CHECKPOINTS_TO_ALERT가 TRUE일 때만 남습니다. 19c 기본값은 FALSE라서 그냥 grep하면 안 나올 수 있어요."],
 ["code","sql","-- 랩에서 체크포인트 메시지를 보고 싶을 때\nALTER SYSTEM SET log_checkpoints_to_alert = TRUE SCOPE=BOTH;\n\n-- alert 로그 위치 확인\nSELECT value FROM v$diag_info WHERE name = 'Diag Trace';"],
 ["code","bash","# 예: PATCHDB 랩 (경로는 db_unique_name·인스턴스명에 따라 다름)\ngrep -iE 'checkpoint|advanced to log sequence' /u01/app/oracle/diag/rdbms/patchdb/PATCHDB/trace/alert_PATCHDB.log | tail -20"]
]},
{ id:"arch-12", title:"Redo Log 그룹 상태와 관리 실습", min:6, body:[
 ["p","온라인 Redo Log 그룹은 다음 순서로 돌고 돕니다."],
 ["code","text","UNUSED(신규) → CURRENT → ACTIVE → INACTIVE → (재사용) CURRENT …"],
 ["tbl",[["상태","의미"],["CURRENT","LGWR가 지금 기록 중"],["ACTIVE","스위치로 닫혔지만 체크포인트가 끝나지 않음 — 인스턴스 복구에 필요하므로 덮어쓸 수 없음"],["INACTIVE","체크포인트 완료 — 인스턴스 복구에 필요 없음. 아카이브 모드라면 아카이브까지 끝나야 재사용"],["UNUSED","한 번도 쓰이지 않은 새 그룹"]]],
 ["warn","스위치가 한 바퀴 돌아 다음에 쓸 그룹이 아직 ACTIVE이면 alert 로그에 'Checkpoint not complete'와 'cannot allocate new log'가 찍히고 DML이 멈칫합니다. 아카이브가 늦으면 'log file switch (archiving needed)' 대기가 생깁니다. 그룹 수나 크기를 늘리는 이유가 이것입니다."],
 ["code","sql","-- 상태 확인\nSELECT group#, thread#, sequence#, bytes/1024/1024 AS mb, members, status, archived\nFROM   v$log ORDER BY group#;\nSELECT group#, member, status FROM v$logfile ORDER BY group#, member;\n\n-- 그룹 추가 (예: PATCHDB 단일 인스턴스 랩)\nALTER DATABASE ADD LOGFILE GROUP 4\n  ('/u01/app/oracle/oradata/PATCHDB/redo04.log') SIZE 200M;\n\n-- 멤버 추가 (다중화)\nALTER DATABASE ADD LOGFILE MEMBER\n  '/u01/app/oracle/oradata/PATCHDB/redo01b.log' TO GROUP 1;\n\n-- RAC는 스레드(인스턴스)를 지정\n-- ALTER DATABASE ADD LOGFILE THREAD 2 GROUP 6 ('+DATAC1') SIZE 1G;"],
 ["p","**삭제 규칙**"],
 ["ul",["인스턴스(스레드)마다 온라인 Redo Log 그룹이 최소 2개는 남아야 합니다.","그룹 삭제는 INACTIVE일 때만 됩니다. CURRENT면 ALTER SYSTEM SWITCH LOGFILE, ACTIVE면 ALTER SYSTEM CHECKPOINT로 상태를 넘깁니다.","아카이브 모드라면 ARCHIVED = YES인지도 확인합니다.","멤버 삭제는 CURRENT·ACTIVE 그룹에서는 안 되고, 그룹의 마지막 유효 멤버도 지울 수 없습니다.","DROP해도 OS 파일은 자동으로 지워지지 않습니다(OMF 제외). 확인 후 직접 rm 합니다."]],
 ["code","sql","ALTER DATABASE DROP LOGFILE GROUP 4;\nALTER DATABASE DROP LOGFILE MEMBER '/u01/app/oracle/oradata/PATCHDB/redo01b.log';"],
 ["tip","새로 추가한 멤버는 v$logfile.STATUS가 INVALID로 보이다가 그 그룹이 처음 쓰이면 공백으로 바뀝니다. 정상 동작이니 놀라지 마세요."]
]},
{ id:"arch-13", title:"SCN은 언제 올라가나", min:4, body:[
 ["p","SCN(System Change Number)은 데이터베이스의 '시계'입니다. 계속 증가하는 숫자로, 읽기 일관성의 기준점, 체크포인트 위치, 복구 지점(UNTIL SCN)을 모두 SCN으로 표현합니다."],
 ["ul",["커밋하면 그 트랜잭션에 커밋 SCN이 정해집니다.","DDL도 내부적으로 커밋하므로 SCN이 올라갑니다.","사용자가 아무 작업을 안 해도 SMON·MMON, 스케줄러 잡, AWR 스냅샷 같은 내부 작업 때문에 SCN은 계속 올라갑니다.","DB Link로 다른 DB와 통신하면 두 DB의 SCN 중 큰 값으로 맞춰집니다."]],
 ["p","SELECT는 시작 시점의 SCN을 읽기 일관성 기준점으로 쓸 뿐, SCN을 올리지 않습니다."],
 ["code","sql","SELECT current_scn FROM v$database;\nSELECT dbms_flashback.get_system_change_number FROM dual;\n\n-- 데이터파일 헤더의 체크포인트 SCN\nSELECT file#, checkpoint_change#, checkpoint_time FROM v$datafile_header;\n\n-- Redo 그룹별 SCN 범위\nSELECT group#, sequence#, first_change#, next_change#, status FROM v$log;\n\n-- 행의 마지막 변경 SCN (근사값)\nSELECT ora_rowscn, empno FROM emp;"],
 ["warn","ORA_ROWSCN은 테이블을 ROWDEPENDENCIES로 만들지 않았으면 블록 단위로 관리되는 근사값입니다. 같은 블록의 다른 행이 바뀌어도 값이 같이 올라갈 수 있어서, 행 단위 변경 추적에 그대로 쓰면 안 됩니다."]
]},
{ id:"arch-14", title:"COMMIT 방식: COMMIT_LOGGING·COMMIT_WAIT", min:4, body:[
 ["tbl",[["파라미터","값","의미"],["COMMIT_LOGGING","IMMEDIATE","커밋마다 LGWR가 Redo를 바로 기록"],["","BATCH","LGWR가 Redo를 모아서 한꺼번에 기록"],["COMMIT_WAIT","WAIT","Redo가 기록된 것을 확인한 뒤 커밋 완료 반환"],["","NOWAIT","기록 완료를 기다리지 않고 바로 반환"],["","FORCE_WAIT","WAIT 강제 — 시스템 레벨로 설정하면 세션·트랜잭션 레벨 설정을 무시"]]],
 ["ul",["두 파라미터 모두 기본값이 '없음'입니다. 설정하지 않으면 기본 동작인 IMMEDIATE + WAIT로 커밋합니다.","show parameter에서 VALUE가 비어 있고 ISDEFAULT = TRUE면 '설정하지 않아서 기본 동작을 한다'는 뜻입니다.","COMMIT_WRITE는 두 파라미터를 합친 예전 파라미터로, 11g R1부터 deprecated(하위 호환용)입니다.","COMMIT_POINT_STRENGTH는 분산 트랜잭션(2PC)용이라 이 내용과 관계없습니다."]],
 ["code","sql","SELECT name, value, isdefault FROM v$parameter\nWHERE  name IN ('commit_logging','commit_wait','commit_write');\n\n-- 세션·문장 단위 예 (랩에서만)\nALTER SESSION SET commit_wait = NOWAIT;\nALTER SESSION SET commit_logging = BATCH;\nCOMMIT WRITE IMMEDIATE WAIT;\nCOMMIT WRITE BATCH NOWAIT;"],
 ["warn","NOWAIT·BATCH는 처리량을 올려 주지만, 인스턴스가 비정상 종료되면 '커밋 완료'로 응답받은 최근 트랜잭션이 사라질 수 있습니다(ACID의 Durability 포기). 정합성이 깨지지는 않지만 마지막 몇 건이 없어집니다. 운영계에서는 업무 담당자와 합의 없이 쓰면 안 됩니다."],
 ["tip","기본 방식에서 커밋 지연은 'log file sync' 대기로 보입니다. 이 대기를 줄이려고 NOWAIT부터 떠올리기보다, 커밋 횟수와 Redo 디스크 성능을 먼저 확인하는 게 순서입니다."]
]},
{ id:"arch-15", title:"랩 실습: 더티 버퍼·Redo·캐시 관찰", min:6, body:[
 ["p","랩 DB(예: PATCHDB)에서 앞 역들의 내용을 눈으로 확인해 보는 순서입니다. 운영 DB에서는 하지 마세요. 예제의 emp 테이블(SCOTT 스키마)이 없으면 실습용 테이블로 바꿔서 하면 됩니다."],
 ["p","**STEP 1. 더티 버퍼 늘었다 줄이기**"],
 ["code","sql","-- 세션 1\nUPDATE emp SET sal = sal WHERE deptno = 10;   -- 아직 커밋 안 함\nSELECT COUNT(*) FROM v$bh WHERE dirty = 'Y';   -- 증가\nSELECT xidusn, used_ublk, used_urec FROM v$transaction;  -- 진행 중 트랜잭션의 Undo 사용량\nCOMMIT;\nSELECT COUNT(*) FROM v$bh WHERE dirty = 'Y';   -- 커밋했어도 그대로일 수 있음\nALTER SYSTEM CHECKPOINT;\nSELECT COUNT(*) FROM v$bh WHERE dirty = 'Y';   -- 감소"],
 ["p","**STEP 2. 스위치와 체크포인트 전후 상태 비교**"],
 ["code","sql","SELECT group#, sequence#, status FROM v$log ORDER BY group#;\nALTER SYSTEM SWITCH LOGFILE;\nSELECT group#, sequence#, status FROM v$log ORDER BY group#;   -- 직전 그룹이 ACTIVE\nALTER SYSTEM CHECKPOINT;\nSELECT group#, sequence#, status FROM v$log ORDER BY group#;   -- INACTIVE로 바뀜"],
 ["p","**STEP 3. 물리적 읽기 vs 캐시 적중**"],
 ["code","sql","SET AUTOTRACE TRACEONLY STATISTICS\nSELECT * FROM emp;   -- 처음: physical reads 발생 가능\nSELECT * FROM emp;   -- 두 번째: consistent gets 위주 (캐시 적중)\nSET AUTOTRACE OFF\n\n-- ALTER SYSTEM FLUSH BUFFER_CACHE;  -- 랩에서만. 운영 DB에서는 전체 성능에 큰 영향"],
 ["p","**STEP 4. 커밋 대기 관찰**"],
 ["code","sql","SELECT event, total_waits, ROUND(time_waited_micro/1000) AS ms\nFROM   v$system_event\nWHERE  event IN ('log file sync','log file parallel write');"],
 ["tip","SQL 탭의 실습 DB에도 V$LOG가 들어 있어요. 'CURRENT 리두 그룹' 문제로 상태 컬럼 읽는 연습을 해 보세요."]
]}
  ];
  // arch-2(백그라운드 프로세스) 다음에 끼워 넣기
  var at = 0; arch.lessons.forEach(function (l, i) { if (l.id === "arch-2") at = i + 1; });
  Array.prototype.splice.apply(arch.lessons, [at, 0].concat(L));

  var REF = {
    "arch-5": [["Database Concepts 19c · Memory Architecture", D + "cncpt/memory-architecture.html"], ["Database Concepts 19c · Process Architecture", D + "cncpt/process-architecture.html"]],
    "arch-6": [["Database Concepts 19c · Transactions", D + "cncpt/transactions.html"], ["Database Concepts 19c · Process Architecture (LGWR·DBW)", D + "cncpt/process-architecture.html"], ["Database Concepts 19c · Data Concurrency and Consistency (Locks)", D + "cncpt/data-concurrency-and-consistency.html"]],
    "arch-7": [["Database Concepts 19c · Data Concurrency and Consistency", D + "cncpt/data-concurrency-and-consistency.html"]],
    "arch-8": [["Database Concepts 19c · Oracle Database Instance (Instance Recovery)", D + "cncpt/oracle-database-instance.html"], ["Database Concepts 19c · Process Architecture (Write-Ahead)", D + "cncpt/process-architecture.html"]],
    "arch-9": [["Database Concepts 19c · Memory Architecture (Shared Pool)", D + "cncpt/memory-architecture.html"], ["Database Reference 19c · V$LIBRARYCACHE", D + "refrn/V-LIBRARYCACHE.html"]],
    "arch-10": [["Database Concepts 19c · Process Architecture", D + "cncpt/process-architecture.html"]],
    "arch-11": [["SQL Language Reference 19c · ALTER SYSTEM", D + "sqlrf/ALTER-SYSTEM.html"], ["Database Reference 19c · LOG_CHECKPOINTS_TO_ALERT", D + "refrn/LOG_CHECKPOINTS_TO_ALERT.html"]],
    "arch-12": [["Administrator's Guide 19c · Managing the Redo Log", D + "admin/managing-the-redo-log.html"], ["Database Reference 19c · V$LOGFILE", D + "refrn/V-LOGFILE.html"]],
    "arch-13": [["Database Concepts 19c · Transactions (SCN)", D + "cncpt/transactions.html"], ["SQL Language Reference 19c · ORA_ROWSCN", D + "sqlrf/ORA_ROWSCN-Pseudocolumn.html"]],
    "arch-14": [["Database Reference 19c · COMMIT_LOGGING", D + "refrn/COMMIT_LOGGING.html"], ["Database Reference 19c · COMMIT_WAIT", D + "refrn/COMMIT_WAIT.html"]],
    "arch-15": [["Database Reference 19c · V$BH", D + "refrn/V-BH.html"], ["Database Reference 19c · V$LOG", D + "refrn/V-LOG.html"]]
  };
  L.forEach(function (l) { if (REF[l.id]) l.ref = REF[l.id]; });

  // 퀴즈는 기존 문제 뒤에 추가 (문제 번호 = 기록 ID 유지)
  arch.quiz = arch.quiz.concat([
    { q: "UPDATE 후 COMMIT이 완료됐다. 이 시점에 반드시 디스크에 기록되어 있는 것은?", o: ["변경된 데이터 블록(데이터파일)", "해당 트랜잭션의 Redo(온라인 Redo Log File)", "Undo 블록(데이터파일)", "체크포인트 SCN(컨트롤파일)"], a: 1, e: "커밋 확정은 Redo가 온라인 Redo Log File에 기록됐다는 뜻입니다. 데이터 블록은 더티 버퍼로 남아 있다가 나중에 DBWn이 씁니다." },
    { q: "Redo Log Buffer에 Redo 엔트리를 써 넣는 주체는?", o: ["LGWR", "서버 프로세스", "DBWn", "CKPT"], a: 1, e: "Redo Log Buffer를 채우는 것은 변경을 만든 서버 프로세스입니다. LGWR는 그 버퍼를 온라인 Redo Log File로 옮겨 씁니다." },
    { q: "Buffer Cache에 없는 블록을 데이터파일에서 읽어 오는 주체는?", o: ["DBWn", "서버 프로세스", "LGWR", "SMON"], a: 1, e: "읽기는 서버 프로세스가 직접 합니다. DBWn은 반대 방향(Buffer Cache → 데이터파일) 쓰기만 담당합니다." },
    { q: "'log file sync' 대기 이벤트가 뜻하는 것은?", o: ["DBWn이 데이터파일에 쓰기를 기다림", "커밋한 세션이 LGWR의 Redo 기록 완료를 기다림", "아카이브 완료를 기다림", "체크포인트 완료를 기다림"], a: 1, e: "커밋한 서버 프로세스는 LGWR가 커밋 Redo를 온라인 Redo Log File에 쓸 때까지 'log file sync'로 기다립니다." },
    { q: "Write-Ahead 규칙으로 옳은 것은?", o: ["데이터 블록을 쓰기 전에 그 변경의 Redo가 먼저 디스크에 있어야 한다", "Redo를 쓰기 전에 데이터 블록이 먼저 디스크에 있어야 한다", "Undo는 Redo로 보호되지 않는다", "커밋하면 DBWn이 즉시 데이터파일에 쓴다"], a: 0, e: "DBWn은 쓰려는 버퍼의 Redo가 아직 디스크에 없으면 LGWR에게 먼저 쓰게 하고 기다립니다." },
    { q: "인스턴스 복구의 순서로 옳은 것은?", o: ["Roll Back → Roll Forward → OPEN", "Roll Forward → OPEN → 미커밋 트랜잭션 Roll Back", "OPEN → Roll Forward → Roll Back", "Roll Forward만 하고 Roll Back은 DBA가 수동으로"], a: 1, e: "마지막 체크포인트 이후 Redo를 모두 적용(Roll Forward)한 뒤 DB를 열고, 커밋되지 않은 트랜잭션은 OPEN 이후 Undo로 되돌립니다." },
    { q: "ALTER SYSTEM SWITCH LOGFILE 직후, 방금 닫힌 그룹의 V$LOG.STATUS로 가장 흔한 값은?", o: ["CURRENT", "ACTIVE", "UNUSED", "CLEARING"], a: 1, e: "닫힌 그룹은 체크포인트가 끝나기 전까지 ACTIVE이고, 끝나면 INACTIVE가 됩니다." },
    { q: "온라인 Redo Log 그룹을 DROP할 수 있는 상태는? (아카이브 모드)", o: ["CURRENT", "ACTIVE", "INACTIVE이면서 ARCHIVED = YES", "상태와 관계없이 언제나"], a: 2, e: "그룹 삭제는 INACTIVE일 때만 되고, 아카이브 모드라면 아카이브까지 끝나 있어야 합니다. 스레드마다 최소 2개 그룹은 남아야 합니다." },
    { q: "Redo 멤버를 새로 추가했더니 V$LOGFILE.STATUS가 INVALID로 보인다. 맞는 해석은?", o: ["파일이 손상됐으니 즉시 DROP", "정상 — 그 그룹이 처음 쓰이면 공백으로 바뀐다", "ASM에서만 생기는 버그", "DB를 재기동해야 한다"], a: 1, e: "새 멤버는 아직 한 번도 쓰이지 않아 INVALID로 보이다가, 해당 그룹이 사용되면 공백(사용 중)으로 바뀝니다." },
    { q: "19c에서 LOG_CHECKPOINTS_TO_ALERT의 기본값은?", o: ["TRUE", "FALSE", "AUTO", "기본값 없음"], a: 1, e: "기본값은 FALSE입니다. 그래서 기본 설정에서는 체크포인트 시작·완료 메시지가 alert 로그에 남지 않습니다." },
    { q: "COMMIT_WAIT = NOWAIT의 위험으로 옳은 것은?", o: ["데이터 블록이 손상된다", "인스턴스 장애 시 커밋 완료로 응답받은 최근 트랜잭션이 유실될 수 있다", "Undo가 생성되지 않는다", "RAC에서는 설정할 수 없다"], a: 1, e: "Redo 기록 완료를 기다리지 않고 반환하므로, 그 사이 장애가 나면 커밋 응답을 받은 트랜잭션이 사라질 수 있습니다(Durability 포기)." },
    { q: "ROWDEPENDENCIES 없이 만든 테이블에서 ORA_ROWSCN 값의 단위는?", o: ["행 단위 정확한 값", "블록 단위 근사값", "테이블 단위", "세그먼트 단위"], a: 1, e: "기본은 블록 단위로 관리되어 같은 블록의 다른 행이 바뀌어도 값이 같이 올라갈 수 있습니다." },
    { q: "Library Cache에서 같은 SQL을 찾지 못했을 때 일어나는 일은?", o: ["소프트 파싱", "하드 파싱", "물리적 읽기", "로그 스위치"], a: 1, e: "공유 SQL 영역을 재사용하지 못하면 실행계획을 새로 만드는 하드 파싱이 일어납니다." },
    { q: "다른 세션이 UPDATE 중(미커밋)인 행을 SELECT하면?", o: ["커밋될 때까지 기다린다", "Undo로 만든 커밋된 예전 값을 바로 읽는다", "ORA-00054 에러", "미커밋 값을 읽는다"], a: 1, e: "읽기 일관성 덕분에 SELECT는 기다리지 않고, Undo로 쿼리 시작 시점의 커밋된 값을 만들어 읽습니다." }
  ]);
})();

/* ───────── v0.0.8 노선별 레슨 보강 (19c 문서·MOS 기준) ───────── */
(function () {
  var D = "https://docs.oracle.com/en/database/oracle/oracle-database/19/";
  var X = "https://docs.oracle.com/en/engineered-systems/exadata-database-machine/";
  function cat(id) { return window.DBBIG_CONTENT.filter(function (c) { return c.id === id; })[0]; }
  var MORE = {
space: { lessons: [
{ id:"space-5", title:"큰 세그먼트·리사이클빈 찾기", min:5, body:[
 ["p","테이블스페이스가 갑자기 찼다면 '무엇이 공간을 먹었나'부터 찾습니다. 세그먼트는 테이블·인덱스·LOB·파티션처럼 실제 공간을 차지하는 단위입니다."],
 ["code","sql","-- 테이블스페이스별 상위 20개 세그먼트\nSELECT owner, segment_name, partition_name, segment_type,\n       ROUND(bytes/1024/1024/1024,2) AS gb\nFROM   dba_segments\nWHERE  tablespace_name = 'USERS'\nORDER  BY bytes DESC\nFETCH FIRST 20 ROWS ONLY;\n\n-- LOB 세그먼트(SYS_LOB...)가 어느 테이블·컬럼 것인지\nSELECT owner, table_name, column_name, segment_name\nFROM   dba_lobs\nWHERE  segment_name = '&lob_segment';"],
 ["p","**리사이클빈**: DROP TABLE한 테이블은 기본적으로 바로 지워지지 않고 BIN$로 시작하는 이름으로 리사이클빈에 들어갑니다(RECYCLEBIN 파라미터 기본 ON). FLASHBACK TABLE ... TO BEFORE DROP으로 되살릴 수 있는 대신, 비우기 전까지 공간을 계속 차지합니다. 테이블스페이스 공간이 모자라면 오라클이 리사이클빈의 오래된 객체부터 자동으로 비우기도 합니다."],
 ["code","sql","SELECT owner, original_name, type, droptime, space\nFROM   dba_recyclebin ORDER BY droptime;\n\n-- 되살리기\nFLASHBACK TABLE app.orders TO BEFORE DROP;\n\n-- 비우기 (내 것 / 특정 테이블스페이스 / 전체 — 전체는 SYSDBA)\nPURGE RECYCLEBIN;\nPURGE TABLESPACE users USER app;\nPURGE DBA_RECYCLEBIN;"],
 ["warn","PURGE 후에는 FLASHBACK TABLE로 되살릴 수 없습니다. 운영계에서 DBA_RECYCLEBIN 전체를 비우기 전에는 최근에 실수로 지운 테이블이 없는지 담당자와 확인하세요."]
]}],
  quiz: [
 { q: "DROP TABLE 후 FLASHBACK TABLE ... TO BEFORE DROP으로 되살릴 수 있는 이유는?", o: ["Undo에 테이블이 남아서", "리사이클빈에 BIN$ 이름으로 남아서", "아카이브 로그에서 복원해서", "Data Pump 자동 백업 때문에"], a: 1, e: "RECYCLEBIN이 ON(기본)이면 DROP한 테이블은 BIN$ 이름으로 리사이클빈에 남고, PURGE하기 전까지 되살릴 수 있습니다." },
 { q: "SYS_LOB으로 시작하는 큰 세그먼트의 원래 테이블·컬럼을 찾는 뷰는?", o: ["DBA_LOBS", "DBA_INDEXES", "DBA_TAB_COLUMNS", "DBA_EXTENTS"], a: 0, e: "DBA_LOBS의 SEGMENT_NAME으로 소유 테이블과 컬럼을 찾을 수 있습니다." }
]},
rman: { lessons: [
{ id:"rman-5", title:"백업 검증과 정리 운영", min:5, body:[
 ["p","백업은 '있는 것'보다 '복구할 수 있는 것'이 중요합니다. 실제 복원 없이 백업이 쓸 만한지 확인하는 명령을 정기 점검에 넣어 두세요."],
 ["code","rman","rman target /\n\n# 복원에 필요한 백업이 모두 있고 읽을 수 있는지 (실제 복원 안 함)\nRESTORE DATABASE VALIDATE;\nRESTORE ARCHIVELOG ALL VALIDATE;\n\n# 데이터파일의 물리·논리 손상 검사 (백업 파일은 안 만듦)\nBACKUP VALIDATE CHECK LOGICAL DATABASE ARCHIVELOG ALL;\n\n# 현황 보고\nLIST BACKUP SUMMARY;\nREPORT NEED BACKUP;\nREPORT OBSOLETE;"],
 ["code","sql","-- VALIDATE가 찾아낸 손상 블록\nSELECT * FROM v$database_block_corruption;"],
 ["p","**정리 순서**: CROSSCHECK로 카탈로그와 실제 파일을 맞추고 → 사라진 파일(EXPIRED) 기록을 지우고 → 보존정책상 필요 없는(OBSOLETE) 백업을 지웁니다."],
 ["code","rman","CROSSCHECK BACKUP;\nCROSSCHECK ARCHIVELOG ALL;\nDELETE NOPROMPT EXPIRED BACKUP;\nDELETE NOPROMPT EXPIRED ARCHIVELOG ALL;\nDELETE NOPROMPT OBSOLETE;"],
 ["tip","Data Guard 환경이라면 Primary에서 CONFIGURE ARCHIVELOG DELETION POLICY TO APPLIED ON ALL STANDBY;를 설정해 두세요. Standby에 아직 적용되지 않은 아카이브를 RMAN이 지우지 않습니다."]
]},
{ id:"rman-6", title:"Flashback Database와 보장 복원 지점", min:5, body:[
 ["p","Flashback Database는 DB 전체를 과거 시점으로 '되감는' 기능입니다. 백업에서 복원하는 것보다 훨씬 빠릅니다. FRA에 Flashback 로그를 남기는 방식이라 FRA가 꼭 필요합니다."],
 ["code","sql","-- 상태 확인 / 켜기 (19c는 OPEN 상태에서도 가능)\nSELECT flashback_on FROM v$database;\nALTER SYSTEM SET db_flashback_retention_target = 1440 SCOPE=BOTH;  -- 분 단위, 기본 1440(하루)\nALTER DATABASE FLASHBACK ON;"],
 ["p","**패치·업그레이드 전 보장 복원 지점(Guaranteed Restore Point)** — 작업 전에 만들어 두면 작업이 잘못됐을 때 그 시점으로 되돌릴 수 있습니다. Flashback Database를 켜지 않아도 만들 수 있습니다."],
 ["code","sql","-- 작업 전\nCREATE RESTORE POINT before_ru GUARANTEE FLASHBACK DATABASE;\nSELECT name, guarantee_flashback_database, storage_size FROM v$restore_point;\n\n-- 되돌려야 할 때 (단일 인스턴스 예, RAC는 모든 인스턴스 종료 후 한 노드에서)\nSHUTDOWN IMMEDIATE;\nSTARTUP MOUNT;\nFLASHBACK DATABASE TO RESTORE POINT before_ru;\nALTER DATABASE OPEN RESETLOGS;\n\n-- 작업이 잘 끝났으면 반드시 삭제\nDROP RESTORE POINT before_ru;"],
 ["warn","보장 복원 지점은 지울 때까지 Flashback 로그를 계속 쌓습니다. 잊고 두면 FRA가 가득 차서 아카이브가 멈추고(ORA-00257) DB가 멈춥니다. 작업 계획서에 'DROP RESTORE POINT' 단계를 꼭 넣으세요."],
 ["tip","Flashback Database로는 바이너리(ORACLE_HOME) 변경은 되돌릴 수 없습니다. RU 롤백이라면 바이너리 롤백(opatch rollback 또는 out-of-place 홈 전환)과 함께 계획해야 합니다."]
]}],
  quiz: [
 { q: "백업을 실제로 복원하지 않고 복원 가능 여부만 확인하는 RMAN 명령은?", o: ["RESTORE DATABASE VALIDATE;", "BACKUP DATABASE;", "REPORT SCHEMA;", "CROSSCHECK COPY;"], a: 0, e: "RESTORE ... VALIDATE는 필요한 백업을 찾아 읽어 보기만 하고 파일을 복원하지 않습니다." },
 { q: "보장 복원 지점(GRP)을 지우지 않고 오래 두면 생기는 대표적인 문제는?", o: ["Undo가 부족해진다", "FRA가 Flashback 로그로 가득 차 아카이브가 멈출 수 있다", "SGA가 부족해진다", "Redo 그룹이 삭제된다"], a: 1, e: "GRP는 지울 때까지 Flashback 로그를 보존하므로 FRA를 계속 차지합니다. 작업 후 DROP RESTORE POINT를 잊지 마세요." },
 { q: "DB_FLASHBACK_RETENTION_TARGET의 기본값은?", o: ["60분", "1440분", "4320분", "무제한"], a: 1, e: "기본값은 1440분(하루)입니다. 목표값이며, FRA 공간이 모자라면 그보다 짧아질 수 있습니다." }
]},
rac: { lessons: [
{ id:"rac-5", title:"RAC 인스턴스 롤링 재기동", min:5, body:[
 ["p","파라미터 변경·OS 패치처럼 인스턴스 재기동이 필요할 때, RAC는 한 노드씩 돌아가며 재기동해서 서비스를 멈추지 않습니다."],
 ["p","◎ 1번 노드부터, 끝나면 2번 노드에서 같은 순서로 반복합니다."],
 ["code","bash","# oracle 계정 (DB 홈)\n# STEP 1. 현재 상태\nsrvctl status database -db DBBIG -verbose\nsrvctl status service -db DBBIG\n\n# STEP 2. 1번 노드 서비스를 2번 노드로 이동 (세션 drain 대기)\nsrvctl relocate service -db DBBIG -service OLTP_SVC -oldinst DBBIG1 -newinst DBBIG2 -drain_timeout 300\n\n# STEP 3. 남은 세션 확인 (SQL*Plus)\n#   SELECT inst_id, service_name, COUNT(*) FROM gv$session WHERE type='USER' GROUP BY inst_id, service_name;\n\n# STEP 4. 1번 인스턴스만 종료 → 기동\nsrvctl stop instance -db DBBIG -instance DBBIG1 -stopoption immediate\nsrvctl start instance -db DBBIG -instance DBBIG1\n\n# STEP 5. 서비스 원위치\nsrvctl relocate service -db DBBIG -service OLTP_SVC -oldinst DBBIG2 -newinst DBBIG1"],
 ["warn","SQL*Plus의 SHUTDOWN 대신 srvctl을 쓰는 이유: Clusterware가 '관리자가 일부러 내린 것'으로 알아야 자동 재기동하지 않고, 상태(TARGET)도 맞게 관리됩니다."],
 ["tip","파라미터를 SCOPE=SPFILE SID='*'로 바꿨다면 롤링 재기동 중에는 노드마다 값이 다른 상태가 잠시 생깁니다. RAC에서 모든 인스턴스가 같은 값이어야 하는 파라미터는 롤링으로 바꿀 수 없으니 Reference 문서의 'Oracle RAC' 항목을 먼저 확인하세요."]
]},
{ id:"rac-6", title:"OCR·Voting Disk·OLR 백업과 확인", min:5, body:[
 ["p","OCR은 클러스터 리소스 구성 정보, Voting Disk는 노드 멤버십 판단, OLR(Oracle Local Registry)은 각 노드에서 GI 하위 스택을 띄우는 데 필요한 로컬 정보입니다."],
 ["code","bash","# root 또는 grid 계정\n/u01/app/19.0.0/grid/bin/ocrcheck                    # OCR 무결성 (root로 실행해야 논리 점검까지)\n/u01/app/19.0.0/grid/bin/ocrcheck -local             # OLR 점검\n/u01/app/19.0.0/grid/bin/crsctl query css votedisk   # Voting Disk 위치·상태\n\n# OCR 자동 백업 목록과 위치\n/u01/app/19.0.0/grid/bin/ocrconfig -showbackup\n\n# 작업 전 수동 백업 (root)\n/u01/app/19.0.0/grid/bin/ocrconfig -manualbackup\n/u01/app/19.0.0/grid/bin/ocrconfig -local -manualbackup   # OLR"],
 ["p","Clusterware는 OCR을 4시간마다 자동으로 백업하고, 4시간·하루·일주일 단위로 일정 개수를 보관합니다. 실제로 남아 있는 백업과 위치는 ocrconfig -showbackup으로 확인하세요. 수동 백업(-manualbackup)은 root로 실행합니다."],
 ["tip","GI 패치·노드 추가처럼 클러스터 구성을 바꾸는 작업 전에는 ocrconfig -manualbackup과 -local -manualbackup을 작업 계획서 STEP에 넣어 두면 롤백 근거가 생깁니다."]
]}],
  quiz: [
 { q: "RAC에서 인스턴스 하나만 내릴 때 SQL*Plus SHUTDOWN 대신 srvctl stop instance를 권장하는 이유는?", o: ["더 빠르기 때문", "Clusterware가 의도적 종료로 인식해 자동 재기동하지 않고 상태를 맞게 관리하기 때문", "SQL*Plus로는 RAC 인스턴스를 내릴 수 없기 때문", "srvctl만 ABORT를 지원하기 때문"], a: 1, e: "srvctl로 내리면 리소스 TARGET이 OFFLINE으로 바뀌어 Clusterware가 의도된 종료로 다룹니다." },
 { q: "OLR(Oracle Local Registry)을 점검하는 명령은?", o: ["ocrcheck -local", "crsctl query css votedisk", "olsnodes -n", "srvctl config database"], a: 0, e: "ocrcheck -local은 각 노드의 OLR을 점검합니다." },
 { q: "Clusterware의 OCR 자동 백업 주기는?", o: ["1시간", "4시간", "하루", "자동 백업 없음"], a: 1, e: "4시간마다 자동 백업하고 4시간·하루·일주일 단위로 보관합니다. ocrconfig -showbackup으로 확인합니다." }
]},
asm: { lessons: [
{ id:"asm-4", title:"ASM 디스크 추가·교체", min:5, body:[
 ["p","새 디스크를 디스크그룹에 넣기 전, ASM이 그 디스크를 '쓸 수 있는 후보'로 보는지부터 확인합니다."],
 ["tbl",[["V$ASM_DISK.HEADER_STATUS","의미"],["CANDIDATE","아무 디스크그룹에도 속하지 않은 새 디스크 — 추가 가능"],["PROVISIONED","ASMLib·AFD 등으로 표시됐지만 아직 미사용 — 추가 가능"],["MEMBER","이미 디스크그룹에 속함"],["FORMER","예전에 속했다가 깨끗이 빠진 디스크 — 추가 가능"]]],
 ["code","sql","-- grid 계정, sqlplus / as sysasm\nSELECT path, header_status, mount_status, os_mb FROM v$asm_disk ORDER BY path;\n\n-- 디스크 추가 (리밸런스 속도 8)\nALTER DISKGROUP DATA ADD DISK '/dev/oracleasm/disks/DATA05' REBALANCE POWER 8;\n\n-- 교체: 추가와 삭제를 한 문장으로 → 리밸런스 한 번만\nALTER DISKGROUP DATA ADD DISK '/dev/oracleasm/disks/DATA06'\n  DROP DISK DATA_0001 REBALANCE POWER 8;\n\n-- 진행률\nSELECT group_number, operation, state, power, sofar, est_work, est_minutes FROM v$asm_operation;"],
 ["ul",["ASM_POWER_LIMIT 기본값은 1입니다. POWER를 높이면 빨리 끝나지만 I/O 부하가 커지니 업무 시간에는 낮게 잡습니다.","DROP DISK는 리밸런스로 데이터가 다 옮겨진 뒤에 실제로 빠집니다. V$ASM_OPERATION이 비기 전에는 물리 디스크를 빼면 안 됩니다.","같은 디스크그룹의 디스크는 크기와 성능이 같아야 균등하게 쓰입니다."]],
 ["tip","Exadata는 그리드 디스크 단위로 ASM이 자동 관리합니다. 물리 디스크 교체 흐름은 10호선 'Exadata 디스크 교체 흐름' 역을 보세요."]
]},
{ id:"asm-5", title:"ASM 인스턴스 점검 포인트", min:4, body:[
 ["code","bash","# grid 계정, 1번 노드 예\nexport ORACLE_SID=+ASM1\n\n# ASM alert 로그 (grid의 ORACLE_BASE 기준)\ntail -100 $ORACLE_BASE/diag/asm/+asm/+ASM1/trace/alert_+ASM1.log\n\nasmcmd lsdg          # 디스크그룹 상태·용량\nasmcmd lsop          # 진행 중인 리밸런스\nasmcmd lsct          # 이 ASM에 붙은 DB 인스턴스(클라이언트)"],
 ["code","sql","-- sqlplus / as sysasm\nSHOW PARAMETER asm_diskstring\nSHOW PARAMETER asm_power_limit\n\n-- 디스크그룹 호환성 속성 (기능 사용 가능 여부를 좌우)\nSELECT g.name, a.name attr, a.value\nFROM   v$asm_diskgroup g JOIN v$asm_attribute a ON a.group_number = g.group_number\nWHERE  a.name IN ('compatible.asm','compatible.rdbms','disk_repair_time','failgroup_repair_time');"],
 ["warn","compatible.asm·compatible.rdbms는 올리면 되돌릴 수 없습니다. 같은 디스크그룹을 쓰는 가장 낮은 DB 버전보다 compatible.rdbms를 높이면 그 DB가 디스크그룹을 못 씁니다."]
]}],
  quiz: [
 { q: "디스크그룹에 추가할 수 없는 디스크의 HEADER_STATUS는?", o: ["CANDIDATE", "PROVISIONED", "FORMER", "MEMBER"], a: 3, e: "MEMBER는 이미 어떤 디스크그룹에 속한 디스크입니다." },
 { q: "디스크를 교체할 때 ADD와 DROP을 한 문장으로 쓰는 이유는?", o: ["문법상 필수", "리밸런스를 한 번만 하게 하려고", "DROP을 즉시 끝내려고", "ASM_POWER_LIMIT를 무시하려고"], a: 1, e: "따로 하면 리밸런스가 두 번 돌지만, 한 문장으로 하면 한 번에 데이터가 재배치됩니다." },
 { q: "compatible.rdbms 속성에 대한 설명으로 옳은 것은?", o: ["언제든 낮출 수 있다", "한번 올리면 되돌릴 수 없다", "ASM 인스턴스 재기동 시 초기화된다", "Exadata에서는 무시된다"], a: 1, e: "디스크그룹 호환성 속성은 올리기만 가능하고 낮출 수 없습니다." }
]},
sec: { lessons: [
{ id:"sec-4", title:"PUBLIC·ANY 권한 점검 (보안 진단 대응)", min:5, body:[
 ["p","보안 진단에서 자주 지적되는 두 가지는 'PUBLIC에 열린 위험 패키지'와 '애플리케이션 계정의 ANY 시스템 권한'입니다."],
 ["code","sql","-- PUBLIC에 EXECUTE가 열린 네트워크·파일 관련 패키지\nSELECT owner, table_name, privilege\nFROM   dba_tab_privs\nWHERE  grantee = 'PUBLIC'\nAND    table_name IN ('UTL_FILE','UTL_TCP','UTL_SMTP','UTL_HTTP','UTL_INADDR','DBMS_LOB','DBMS_RANDOM');\n\n-- 오라클 기본 계정이 아닌 사용자에게 준 ANY 권한\nSELECT p.grantee, p.privilege\nFROM   dba_sys_privs p JOIN dba_users u ON u.username = p.grantee\nWHERE  p.privilege LIKE '%ANY%' AND u.oracle_maintained = 'N'\nORDER  BY 1, 2;"],
 ["p","**회수 순서 (장애 예방)**"],
 ["ul",["STEP 1. 해당 패키지를 실제로 쓰는 계정을 확인합니다 (DBA_DEPENDENCIES, 애플리케이션 담당자 확인).","STEP 2. 쓰는 계정에는 먼저 직접 GRANT EXECUTE ON UTL_FILE TO app_user; 를 합니다.","STEP 3. 그다음 REVOKE EXECUTE ON UTL_FILE FROM PUBLIC; 을 합니다.","STEP 4. INVALID 객체가 생겼는지 확인하고 utlrp.sql로 재컴파일합니다."]],
 ["warn","오라클 기본 계정(ORACLE_MAINTAINED = 'Y')이 쓰는 권한까지 일괄 회수하면 패치·업그레이드나 내부 기능이 깨질 수 있습니다. 진단 결과는 '조치 대상'과 '예외(사유 기록)'로 나눠 정리하세요."]
]},
{ id:"sec-5", title:"sqlnet.ora 접속 통제와 인증 버전", min:5, body:[
 ["p","리스너 단에서 접속 가능한 IP를 제한하려면 DB 서버의 sqlnet.ora에 허용 목록을 넣습니다."],
 ["code","text","# $ORACLE_HOME/network/admin/sqlnet.ora (RAC·리스너가 GI 홈이면 GI 홈 쪽)\nTCP.VALIDNODE_CHECKING = YES\nTCP.INVITED_NODES = (localhost, 10.10.1.11, 10.10.1.12, 10.10.20.0/24)\n\n# 접속 허용 최소 인증 프로토콜 버전 (19c 기본 12)\nSQLNET.ALLOWED_LOGON_VERSION_SERVER = 12"],
 ["ul",["허용 목록에는 DB 서버 자신(localhost·자기 IP), RAC 상대 노드, 애플리케이션·관리 서버, 백업·모니터링 서버를 빠짐없이 넣어야 합니다.","적용은 리스너를 재기동해야 확실합니다. RAC는 노드별 리스너와 SCAN 리스너가 쓰는 sqlnet.ora 위치를 각각 확인하세요.","SQLNET.ALLOWED_LOGON_VERSION_SERVER를 높이면 오래된 클라이언트·드라이버(예: 10g JDBC)가 ORA-28040으로 접속하지 못합니다."]],
 ["code","bash","# 적용 후 확인 (grid 또는 oracle 계정, 리스너 소유자)\nlsnrctl status\n# 허용되지 않은 IP에서 접속하면 클라이언트는 ORA-12537(connection closed)을 받습니다."],
 ["tip","변경 전 sqlnet.ora를 날짜 붙여 백업해 두고, 허용 목록 누락으로 접속 장애가 나면 TCP.VALIDNODE_CHECKING = NO로 되돌린 뒤 리스너를 재기동하는 롤백 절차를 계획서에 함께 적어 두세요."]
]}],
  quiz: [
 { q: "PUBLIC의 UTL_FILE EXECUTE 권한을 회수하기 전에 먼저 할 일은?", o: ["DB 재기동", "실제로 쓰는 계정에 직접 GRANT", "UTL_FILE 패키지 삭제", "PUBLIC 롤 삭제"], a: 1, e: "쓰는 계정에 먼저 직접 권한을 준 뒤 PUBLIC에서 회수해야 애플리케이션 장애가 나지 않습니다." },
 { q: "sqlnet.ora에서 접속 허용 IP 목록을 지정하는 파라미터는?", o: ["TCP.EXCLUDED_NODES", "TCP.INVITED_NODES", "SQLNET.EXPIRE_TIME", "NAMES.DIRECTORY_PATH"], a: 1, e: "TCP.VALIDNODE_CHECKING = YES와 함께 TCP.INVITED_NODES에 허용 목록을 적습니다." },
 { q: "19c에서 SQLNET.ALLOWED_LOGON_VERSION_SERVER의 기본값은?", o: ["8", "11", "12", "12a"], a: 2, e: "19c 기본값은 12입니다. 값을 높이면 오래된 클라이언트가 ORA-28040으로 접속하지 못할 수 있습니다." }
]},
dg: { lessons: [
{ id:"dg-4", title:"Failover와 Reinstate", min:5, body:[
 ["p","Switchover는 계획된 역할 교대(데이터 손실 없음)이고, Failover는 Primary가 죽었을 때 Standby를 Primary로 올리는 비상 조치입니다."],
 ["code","bash","dgmgrl sys@DBBIG_STBY\n\nDGMGRL> SHOW CONFIGURATION;\nDGMGRL> FAILOVER TO 'DBBIG_STBY';\n\n# 옛 Primary를 고친 뒤 MOUNT로 올리고 Standby로 재편입\nDGMGRL> REINSTATE DATABASE 'DBBIG';\nDGMGRL> SHOW CONFIGURATION;"],
 ["ul",["REINSTATE는 옛 Primary에 Flashback Database가 켜져 있어야 합니다. 꺼져 있었다면 Standby를 새로 만들어야(재구축) 합니다.","보호 모드가 Maximum Performance(ASYNC)라면 Failover 때 마지막 몇 초의 트랜잭션이 넘어오지 못했을 수 있습니다.","Fast-Start Failover를 쓰면 Observer가 Primary 장애를 감지해 자동으로 Failover합니다."]],
 ["warn","Primary가 살아 있는데 네트워크만 끊긴 상황에서 Failover하면 두 DB가 모두 Primary가 되는 split-brain 위험이 있습니다. 옛 Primary가 확실히 내려갔는지(또는 내릴 수 있는지) 먼저 확인하세요."]
]},
{ id:"dg-5", title:"Data Guard 상태 점검 쿼리", min:4, body:[
 ["code","sql","-- Standby에서: 전송·적용 지연\nSELECT name, value, time_computed FROM v$dataguard_stats\nWHERE  name IN ('transport lag','apply lag','apply finish time');\n\n-- 19c 프로세스 상태 (V$MANAGED_STANDBY 대체)\nSELECT name, role, action, sequence#, block# FROM v$dataguard_process;\n\n-- 마지막으로 받은/적용한 시퀀스 (Standby)\nSELECT thread#, MAX(sequence#) last_received FROM v$archived_log GROUP BY thread#;\nSELECT thread#, MAX(sequence#) last_applied FROM v$archived_log WHERE applied = 'YES' GROUP BY thread#;\n\n-- Primary에서: 전송 대상 에러\nSELECT dest_id, status, error FROM v$archive_dest_status WHERE status <> 'INACTIVE';"],
 ["tip","apply lag가 계속 커지면 Standby I/O·CPU, MRP0 상태, Gap(아카이브 누락)을 순서대로 봅니다. transport lag가 크면 네트워크나 Primary의 전송 설정을 의심합니다."]
]}],
  quiz: [
 { q: "Failover 후 옛 Primary를 REINSTATE로 재편입하려면 옛 Primary에 무엇이 켜져 있어야 하나?", o: ["Block Change Tracking", "Flashback Database", "Force Logging만", "Unified Auditing"], a: 1, e: "REINSTATE는 Flashback Database로 옛 Primary를 Failover 시점 이전으로 되돌린 뒤 Standby로 전환합니다." },
 { q: "Standby의 전송·적용 지연을 보는 뷰는?", o: ["V$DATAGUARD_STATS", "V$LOGFILE", "DBA_REGISTRY", "V$ASM_OPERATION"], a: 0, e: "V$DATAGUARD_STATS의 transport lag·apply lag로 지연을 확인합니다." }
]},
perf: { lessons: [
{ id:"perf-6", title:"SQL Plan Baseline으로 실행계획 고정", min:6, body:[
 ["p","통계 갱신이나 패치 후 같은 SQL의 실행계획(plan hash value)이 바뀌어 느려졌다면, 예전의 좋은 계획을 SQL Plan Baseline으로 고정할 수 있습니다."],
 ["code","sql","-- STEP 1. SQL의 계획 이력 확인 (AWR, Diagnostics Pack 필요)\nSELECT snap_id, plan_hash_value, executions_delta,\n       ROUND(elapsed_time_delta/NULLIF(executions_delta,0)/1000) AS avg_ms\nFROM   dba_hist_sqlstat WHERE sql_id = '&sql_id' ORDER BY snap_id;\n\n-- STEP 2. 지금 커서 캐시에 있는 좋은 계획을 Baseline으로 적재\nDECLARE n PLS_INTEGER;\nBEGIN\n  n := DBMS_SPM.LOAD_PLANS_FROM_CURSOR_CACHE(sql_id => '&sql_id', plan_hash_value => &good_phv);\n  DBMS_OUTPUT.PUT_LINE('loaded: ' || n);\nEND;\n/\n\n-- STEP 3. 확인 (ENABLED·ACCEPTED = YES)\nSELECT sql_handle, plan_name, enabled, accepted, fixed, created\nFROM   dba_sql_plan_baselines ORDER BY created DESC;"],
 ["ul",["OPTIMIZER_USE_SQL_PLAN_BASELINES 기본값은 TRUE라서, 적재하면 바로 사용됩니다.","자동 수집(OPTIMIZER_CAPTURE_SQL_PLAN_BASELINES)은 기본 FALSE입니다.","좋은 계획이 커서 캐시에 없고 AWR에만 있으면 SQL Tuning Set을 거쳐 적재하거나, 지원 도구(SQLT의 coe_xfr_sql_profile.sql)로 SQL Profile을 만드는 방법을 씁니다."]],
 ["warn","Baseline은 '응급 처치'입니다. 데이터 분포가 바뀌면 고정한 계획이 오히려 나빠질 수 있으니, 원인(통계·바인드·인덱스 변경)을 함께 찾고 정기적으로 다시 검토하세요."]
]},
{ id:"perf-7", title:"OS 자원 점검: CPU·메모리·I/O", min:5, body:[
 ["p","DB 대기 이벤트만 보고 있으면 OS 쪽 원인을 놓칩니다. 장애 시점에 서버 자원이 어땠는지 같이 보세요."],
 ["code","bash","vmstat 5 5           # r(실행 대기) > CPU 코어 수가 계속이면 CPU 부족, si/so > 0 이면 스왑 발생\niostat -xm 5 3       # %util, await(ms)로 디스크 지연 확인\nfree -g              # 메모리·스왑 사용량\nsar -u -f /var/log/sa/sa$(date +%d)   # 오늘 CPU 이력 (sysstat 설치 시)\n\n# HugePages 사용 확인 (SGA가 HugePages에 올라갔는지)\ngrep -i huge /proc/meminfo"],
 ["ul",["HugePages_Free가 HugePages_Total과 거의 같다면 SGA가 HugePages를 쓰지 못하고 있는 것입니다. alert 로그의 'Large Pages Information'을 확인하세요.","스왑이 계속 쓰이면 SGA·PGA 합계가 물리 메모리에 비해 과한지 봅니다 (PGA_AGGREGATE_LIMIT 포함).","AHF(TFA)를 설치하면 OSWatcher가 함께 돌며 장애 시점 OS 이력을 남기고, tfactl diagcollect 결과에 포함됩니다."]],
 ["tip","노드 Eviction이나 hang 분석 때는 장애 '직전 몇 분'의 OSWatcher vmstat·top 기록이 가장 중요한 증거입니다. SR에 꼭 첨부하세요."]
]}],
  quiz: [
 { q: "OPTIMIZER_USE_SQL_PLAN_BASELINES의 기본값은?", o: ["TRUE", "FALSE", "AUTO", "NONE"], a: 0, e: "기본값이 TRUE라 Baseline을 적재하면 옵티마이저가 바로 사용합니다. 자동 수집 파라미터(OPTIMIZER_CAPTURE_SQL_PLAN_BASELINES)는 기본 FALSE입니다." },
 { q: "vmstat에서 si/so 값이 계속 0보다 크다는 것은?", o: ["CPU 과부하", "스왑 입출력 발생 (메모리 부족 신호)", "디스크 정상", "네트워크 지연"], a: 1, e: "si/so는 스왑 in/out입니다. 계속 발생하면 메모리가 부족하다는 신호입니다." }
]},
patch: { lessons: [
{ id:"patch-5", title:"패치 전 점검 체크리스트", min:6, body:[
 ["p","◎ 1번 노드에서 먼저 점검하고, 같은 점검을 2번 노드에서도 반복합니다. <RU_DIR>는 압축을 푼 패치 디렉터리입니다."],
 ["code","bash","# STEP 1. 현재 패치 상태 (홈 소유자 계정)\n/u01/app/oracle/product/19.0.0/dbhome_1/OPatch/opatch lspatches\n/u01/app/oracle/product/19.0.0/dbhome_1/OPatch/opatch version     # RU README의 최소 OPatch 버전과 비교\n\n# STEP 2. 충돌 점검\ncd <RU_DIR>\n/u01/app/oracle/product/19.0.0/dbhome_1/OPatch/opatch prereq CheckConflictAgainstOHWithDetail -ph ./\n\n# STEP 3. 디스크 공간 점검\n/u01/app/oracle/product/19.0.0/dbhome_1/OPatch/opatch prereq CheckSystemSpace -ph ./\n\n# STEP 4. GI까지 opatchauto로 할 경우 분석만 (root)\n/u01/app/19.0.0/grid/OPatch/opatchauto apply <RU_DIR> -analyze"],
 ["code","sql","-- STEP 5. DB 쪽 사전 상태\nSELECT patch_id, action, status, description FROM dba_registry_sqlpatch ORDER BY action_time;\nSELECT owner, COUNT(*) FROM dba_objects WHERE status = 'INVALID' GROUP BY owner;"],
 ["code","bash","# STEP 6. 홈 백업 (root, DB·GI 중지 상태 권장)\ntar -czpf /backup/dbhome_1_$(date +%Y%m%d).tgz -C /u01/app/oracle/product/19.0.0 dbhome_1"],
 ["tip","작업 전 INVALID 객체 목록을 저장해 두면, 작업 후 생긴 INVALID가 '원래 있던 것'인지 '패치로 생긴 것'인지 바로 구분할 수 있습니다."]
]},
{ id:"patch-6", title:"datapatch 이해와 실패 대응", min:5, body:[
 ["p","opatch가 바이너리(ORACLE_HOME)를 바꾼다면, datapatch는 DB 안의 SQL 레벨 변경(딕셔너리·패키지)을 적용합니다. RU를 홈에 적용한 뒤 그 홈을 쓰는 모든 DB(모든 PDB 포함)에서 한 번씩 돌아야 합니다."],
 ["code","bash","# oracle 계정, DB OPEN 상태 (CDB면 PDB들도 OPEN)\n/u01/app/oracle/product/19.0.0/dbhome_1/OPatch/datapatch -verbose\n\n# 로그 위치\nls -lt $ORACLE_BASE/cfgtoollogs/sqlpatch/"],
 ["code","sql","SELECT patch_id, action, status, target_version, action_time\nFROM   dba_registry_sqlpatch ORDER BY action_time DESC;\n\n-- CDB에서 PDB별 확인\nSELECT con_id, patch_id, status FROM cdb_registry_sqlpatch ORDER BY con_id, action_time;"],
 ["ul",["STATUS가 WITH ERRORS면 로그에서 실패한 SQL과 ORA 에러를 찾아 원인을 해결한 뒤 datapatch를 다시 실행합니다. 이미 적용된 것은 건너뛰므로 재실행해도 됩니다.","작업 시 닫혀 있던 PDB는 나중에 열고 datapatch를 다시 돌려야 합니다.","RAC는 한 노드에서 한 번만 실행하면 됩니다(DB 단위 작업)."]],
 ["tip","datapatch 뒤에는 @?/rdbms/admin/utlrp.sql로 INVALID 객체를 재컴파일하고, 패치 전 목록과 비교하세요."]
]}],
  quiz: [
 { q: "Oracle 홈과 패치 사이의 충돌을 미리 확인하는 opatch 명령은?", o: ["opatch lsinventory -detail", "opatch prereq CheckConflictAgainstOHWithDetail -ph ./", "opatch apply -silent", "opatch util cleanup"], a: 1, e: "CheckConflictAgainstOHWithDetail로 기존 패치와의 충돌·슈퍼셋 관계를 미리 확인합니다." },
 { q: "datapatch 결과 STATUS가 WITH ERRORS일 때 올바른 대응은?", o: ["RU 전체를 롤백한다", "로그로 원인을 해결하고 datapatch를 다시 실행한다", "DB를 재생성한다", "무시해도 된다"], a: 1, e: "원인을 해결한 뒤 재실행하면 됩니다. 이미 적용된 부분은 건너뜁니다." },
 { q: "RAC DB에서 datapatch는 몇 번 실행하나?", o: ["노드 수만큼", "DB당 한 노드에서 한 번", "PDB 수만큼 노드마다", "실행하지 않아도 된다"], a: 1, e: "datapatch는 DB(딕셔너리) 단위 작업이라 한 노드에서 한 번 실행합니다. 바이너리 패치는 노드마다 합니다." }
]},
trouble: { lessons: [
{ id:"tr-5", title:"접속 장애: ORA-12514·12541·12170", min:5, body:[
 ["tbl",[["에러","뜻","먼저 볼 것"],["ORA-12541","TNS:no listener — 그 주소에 리스너가 없음","리스너 기동 여부, HOST·PORT 오타"],["ORA-12514","리스너가 요청한 SERVICE_NAME을 모름","DB 기동 여부, 서비스 등록(LREG), 서비스명 오타"],["ORA-12505","리스너가 요청한 SID를 모름","SID 대신 SERVICE_NAME 사용 여부"],["ORA-12170","접속 시간 초과","방화벽, 라우팅, 서버 다운"],["ORA-12537","접속이 닫힘","sqlnet.ora 접속 허용 목록(TCP.INVITED_NODES)"]]],
 ["code","bash","# 서버에서 (리스너 소유자 계정)\nlsnrctl status\nlsnrctl services          # 서비스가 READY로 등록됐는지\n\n# 클라이언트에서\ntnsping DBBIG\nnc -vz 10.10.1.21 1521    # 포트가 열려 있는지 (방화벽 확인)"],
 ["code","sql","-- 서비스가 리스너에 안 보일 때 (DB에서)\nSHOW PARAMETER local_listener\nSHOW PARAMETER service_names\nALTER SYSTEM REGISTER;      -- 리스너에 즉시 재등록"],
 ["tip","RAC에서 SCAN으로는 되는데 VIP로는 안 되거나 그 반대라면, local_listener·remote_listener 설정과 srvctl config scan_listener 결과를 비교해 보세요."]
]},
{ id:"tr-6", title:"DB hang 진단: hanganalyze", min:6, body:[
 ["p","DB가 응답하지 않아 일반 접속조차 안 될 때, SR에 필요한 진단 정보를 남기는 표준 절차입니다(MOS 452358.1 'How to Collect Diagnostics for Database Hanging Issues')."],
 ["code","bash","# oracle 계정 — 일반 접속이 안 될 때 prelim 모드로 붙기\nsqlplus -prelim \"/ as sysdba\""],
 ["code","sql","-- 단일 인스턴스\noradebug setmypid\noradebug unlimit\noradebug hanganalyze 3\n-- 1~2분 기다렸다가 한 번 더 (변화를 보기 위해)\noradebug hanganalyze 3\noradebug tracefile_name\n\n-- RAC: 모든 인스턴스 대상\noradebug setmypid\noradebug unlimit\noradebug -g all hanganalyze 3"],
 ["ul",["hanganalyze 결과 트레이스에서 'Chains most likely to have caused the hang' 부분이 블로킹 체인의 핵심입니다.","systemstate 덤프(oradebug dump systemstate 258)는 정보가 많지만 시스템이 클수록 오래 걸리고 부하가 큽니다. 지원 엔지니어가 요청할 때 수행하세요.","prelim 모드에서는 SQL 조회가 안 됩니다. oradebug 명령만 씁니다."]],
 ["warn","진단 수집 없이 바로 SHUTDOWN ABORT로 재기동하면 원인을 찾을 근거가 사라집니다. 서비스 영향이 허용하는 범위에서 hanganalyze 2회 + AHF 수집을 먼저 하세요."]
]}],
  quiz: [
 { q: "ORA-12514의 의미는?", o: ["리스너가 없음", "리스너가 요청한 서비스명을 모름", "접속 시간 초과", "비밀번호 오류"], a: 1, e: "리스너는 떠 있지만 요청한 SERVICE_NAME이 등록되어 있지 않은 상태입니다. DB 기동·서비스 등록을 확인합니다." },
 { q: "DB가 hang되어 일반 접속이 안 될 때 SQL*Plus로 붙는 방법은?", o: ["sqlplus -s", "sqlplus -prelim \"/ as sysdba\"", "sqlplus /nolog만", "rman target /"], a: 1, e: "prelim 모드는 SGA에 붙기만 하고 세션을 만들지 않아 hang 상태에서도 oradebug를 쓸 수 있습니다." },
 { q: "RAC 전체 인스턴스에 hanganalyze를 수행하는 명령은?", o: ["oradebug hanganalyze 3", "oradebug -g all hanganalyze 3", "oradebug dump systemstate 10", "alter system hanganalyze"], a: 1, e: "-g all 옵션으로 모든 인스턴스에서 수행합니다." }
]},
exa: { lessons: [
{ id:"exa-4", title:"Exadata 디스크 교체 흐름", min:5, body:[
 ["p","Exadata는 물리 디스크 → 셀 디스크 → 그리드 디스크 → ASM 디스크로 이어지고, 디스크 장애가 나면 ASM 쪽 처리를 셀 소프트웨어가 자동으로 해 줍니다. DBA는 '빼도 되는 상태인지'를 확인하는 게 핵심입니다."],
 ["code","bash","# celladmin 또는 root, 해당 셀에서\ncellcli -e \"list physicaldisk where status != normal detail\"\ncellcli -e \"list griddisk attributes name, status, asmmodestatus, asmdeactivationoutcome\"\ncellcli -e \"list alerthistory where severity != 'info'\""],
 ["ul",["'warning - predictive failure' 상태가 되면 해당 그리드 디스크가 ASM에서 자동으로 빠지고 리밸런스가 돕니다.","리밸런스가 끝났는지 ASM에서 V$ASM_OPERATION으로 확인한 뒤 교체합니다.","교체 대상 디스크는 서비스 LED로 표시됩니다. 새 디스크를 넣으면 셀 디스크·그리드 디스크가 다시 만들어지고 ASM에 자동으로 다시 추가됩니다(이후 리밸런스)."]],
 ["code","sql","-- ASM (grid, sysasm)\nSELECT group_number, operation, state, est_minutes FROM v$asm_operation;\nSELECT name, path, mode_status, state FROM v$asm_disk WHERE mode_status <> 'ONLINE' OR state <> 'NORMAL';"],
 ["warn","여러 셀에서 동시에 디스크를 빼면 안 됩니다. 다른 셀의 asmdeactivationoutcome이 'Yes'가 아니면 이중화가 깨진 상태일 수 있으니, 리밸런스 완료와 이중화 상태를 확인한 뒤 한 번에 하나씩 진행하세요."]
]}],
  quiz: [
 { q: "Exadata에서 물리 디스크를 빼기 전 ASM 쪽에서 확인할 것은?", o: ["V$ASM_OPERATION이 비었는지(리밸런스 완료)", "V$LOG가 CURRENT인지", "DBA_USERS 잠금 여부", "OCR 백업 여부만"], a: 0, e: "자동으로 디스크가 빠진 뒤 리밸런스가 끝났는지 확인해야 데이터 이중화가 유지됩니다." },
 { q: "predictive failure 디스크가 생겼을 때 Exadata가 자동으로 하는 일은?", o: ["DB를 재기동한다", "해당 그리드 디스크를 ASM에서 빼고 리밸런스한다", "셀을 종료한다", "아무 일도 하지 않는다"], a: 1, e: "셀 소프트웨어가 ASM 디스크를 자동으로 drop하고 리밸런스로 데이터를 옮깁니다." }
]}
  };
  var REF = {
    "space-5": [["Database Administrator's Guide 19c · Using Flashback Drop and Managing the Recycle Bin", D + "admin/managing-tables.html"]],
    "rman-5": [["Backup and Recovery User's Guide 19c (Validating Database Files and Backups 장)", D + "bradv/index.html"]],
    "rman-6": [["Backup and Recovery User's Guide 19c · Using Flashback Database and Restore Points", D + "bradv/using-flasback-database-restore-points.html"], ["Database Reference 19c · DB_FLASHBACK_RETENTION_TARGET", D + "refrn/DB_FLASHBACK_RETENTION_TARGET.html"]],
    "rac-5": [["RAC Administration 19c · Server Control Utility Reference", D + "racad/server-control-utility-reference.html"]],
    "rac-6": [["Clusterware Administration 19c · Managing Oracle Cluster Registry and Voting Files", D + "cwadd/managing-oracle-cluster-registry-and-voting-files.html"]],
    "asm-4": [["ASM Administrator's Guide 19c · Administering Oracle ASM Disk Groups", D + "ostmg/alter-diskgroups.html"]],
    "asm-5": [["ASM Administrator's Guide 19c · Managing Disk Group Attributes", D + "ostmg/manage-diskgroup-attributes.html"]],
    "sec-4": [["Security Guide 19c (부록 Keeping Your Oracle Database Secure)", D + "dbseg/index.html"]],
    "sec-5": [["Net Services Reference 19c · Parameters for sqlnet.ora", D + "netrf/parameters-for-the-sqlnet.ora.html"]],
    "dg-4": [["Data Guard Broker 19c (Switchover and Failover Operations 장)", D + "dgbkr/index.html"]],
    "dg-5": [["Database Reference 19c · V$DATAGUARD_STATS", D + "refrn/V-DATAGUARD_STATS.html"]],
    "perf-6": [["SQL Tuning Guide 19c · Managing SQL Plan Baselines", D + "tgsql/managing-sql-plan-baselines.html"]],
    "patch-5": [["Database Patch Maintenance 19c", D + "dbptc/index.html"]],
    "patch-6": [["Database Patch Maintenance 19c", D + "dbptc/index.html"]],
    "tr-5": [["Net Services Administrator's Guide 19c (Troubleshooting Oracle Net Services 장)", D + "netag/index.html"]],
    "exa-4": [["Exadata Database Machine Maintenance Guide (Maintaining Exadata Storage Servers 장)", X + "dbmmn/index.html"]], "tr-6": [["MOS 452358.1 · How to Collect Diagnostics for Database Hanging Issues", "https://support.oracle.com/epmos/faces/DocumentDisplay?id=452358.1"]]
  };
  Object.keys(MORE).forEach(function (id) {
    var c = cat(id); if (!c) return;
    MORE[id].lessons.forEach(function (l) { if (REF[l.id]) l.ref = REF[l.id]; c.lessons.push(l); });
    c.quiz = c.quiz.concat(MORE[id].quiz);   // 기존 문제 뒤에 추가 (문제 번호 = 기록 ID 유지)
  });
})();

/* ───────── v0.0.9 업그레이드·이관 노선 + 실무 레슨 + 문서 기반 퀴즈 ─────────
   실무 참고: 내맘대로긍정 블로그(positivemh.tistory.com) — 레슨 본문은 19c 공식 문서·MOS 기준으로 새로 작성하고 원문 링크만 연결 */
(function () {
  var D = "https://docs.oracle.com/en/database/oracle/oracle-database/19/";
  var B = "https://positivemh.tistory.com/";
  var MOS = "https://support.oracle.com/epmos/faces/DocumentDisplay?id=";
  var C = window.DBBIG_CONTENT;
  function cat(id) { return C.filter(function (c) { return c.id === id; })[0]; }

  /* ── 13호선: 업그레이드·이관 ── */
  C.push({ id:"mig", name:"업그레이드·이관", icon:"🚚", desc:"AutoUpgrade·롤백 계획·RMAN·Data Pump·콜드 백업",
lessons:[
{ id:"mig-1", title:"업그레이드·이관 방법 고르기", min:5, body:[
 ["p","버전을 올리는 '업그레이드'와 서버를 옮기는 '이관'은 같이 일어나는 경우가 많습니다. 다운타임, 데이터 크기, 원본 버전, 플랫폼(OS·엔디언)이 방법을 정합니다."],
 ["tbl",[["방법","언제 쓰나","특징"],["AutoUpgrade","같은 서버(또는 같은 스토리지)에서 버전만 올릴 때","19c 권장 도구. 사전 점검·Fixup·업그레이드·사후 작업을 자동화"],["RMAN 백업셋 복원 후 업그레이드","새 서버로 옮기면서 버전도 올릴 때 (같은 플랫폼)","새 홈에서 복원·복구 → OPEN RESETLOGS UPGRADE → dbupgrade"],["Data Pump (expdp/impdp)","플랫폼이 다르거나, 스키마 단위로 정리하며 옮길 때","가장 유연하지만 데이터가 크면 느림"],["콜드 백업 복사","같은 버전·같은 플랫폼으로 서버만 바꿀 때","DB를 내리고 파일을 그대로 복사. 단순하지만 다운타임이 김"],["Transportable Tablespace","대용량 + 다른 엔디언","데이터파일을 옮기고 메타데이터만 Data Pump로 이동"]]],
 ["ul",["19c로 직접 업그레이드할 수 있는 원본 버전은 11.2.0.4, 12.1.0.2, 12.2.0.1, 18c입니다. 그보다 낮으면 중간 버전을 거치거나 Data Pump를 씁니다.","19c부터 non-CDB 구조는 deprecated(21c부터 미지원)라서, 업그레이드하면서 PDB로 바꾸는 계획도 같이 세웁니다.","어떤 방법이든 '되돌리는 방법(롤백)'과 '검증 방법'을 먼저 정해 두고 시작합니다."]],
 ["tip","방법을 고를 때 가장 먼저 물을 것은 '허용 다운타임이 몇 시간인가'입니다. 몇 시간이 허용되면 AutoUpgrade·RMAN 방식, 몇 분만 허용되면 Data Guard·GoldenGate 같은 복제 기반 전환을 검토합니다."]
]},
{ id:"mig-2", title:"AutoUpgrade 따라하기", min:7, body:[
 ["p","AutoUpgrade는 19c 홈의 $ORACLE_HOME/rdbms/admin/autoupgrade.jar에 들어 있지만, 오라클은 MOS 2485457.1에서 최신 jar를 받아 쓰라고 권합니다. 원본은 11.2.0.4 이상이어야 합니다."],
 ["code","text","# /home/oracle/upg/upg.cfg  (예: 11.2.0.4 → 19c, 같은 서버)\nglobal.autoupg_log_dir=/home/oracle/upg/logs\n\nupg1.sid=ORCL\nupg1.source_home=/u01/app/oracle/product/11.2.0.4/dbhome_1\nupg1.target_home=/u01/app/oracle/product/19.0.0/dbhome_1\nupg1.start_time=NOW\nupg1.upgrade_node=localhost\n# non-CDB를 PDB로 바꾸며 올리려면 (대상 CDB가 미리 있어야 함)\n# upg1.target_cdb=CDB19"],
 ["code","bash","# oracle 계정 — 19c 홈의 Java로 실행\nexport TGT=/u01/app/oracle/product/19.0.0/dbhome_1\n\n# STEP 1. 분석만 (DB 변경 없음)\n$TGT/jdk/bin/java -jar /home/oracle/upg/autoupgrade.jar -config /home/oracle/upg/upg.cfg -mode analyze\n\n# STEP 2. 업그레이드 전 자동 조치(Fixup)\n$TGT/jdk/bin/java -jar /home/oracle/upg/autoupgrade.jar -config /home/oracle/upg/upg.cfg -mode fixups\n\n# STEP 3. 실제 업그레이드 (사전 점검·Fixup·업그레이드·사후 작업까지)\n$TGT/jdk/bin/java -jar /home/oracle/upg/autoupgrade.jar -config /home/oracle/upg/upg.cfg -mode deploy\n\n# 실행 중 콘솔 명령\n#   upg> lsj            작업 목록\n#   upg> status -job 100   작업 상세"],
 ["ul",["analyze 결과는 autoupg_log_dir 아래 <sid>/<작업번호>/prechecks 의 HTML·로그에서 확인합니다. ERROR로 나온 항목은 deploy 전에 반드시 해결합니다.","Enterprise Edition에서 deploy는 기본적으로 보장 복원 지점(GRP)을 만들고 업그레이드합니다. 문제가 생기면 그 지점으로 되돌릴 수 있습니다.","모드는 analyze · fixups · deploy · upgrade · postfixups가 있습니다. upgrade 모드는 새 홈에서 이미 UPGRADE 모드로 연 DB를 올릴 때(예: RMAN으로 옮겨 온 DB) 씁니다."]],
 ["warn","deploy가 끝나도 COMPATIBLE은 자동으로 올라가지 않습니다. 업무 검증이 끝나기 전에 COMPATIBLE을 올리면 GRP로 되돌릴 수도, 다운그레이드할 수도 없게 됩니다."]
]},
{ id:"mig-3", title:"업그레이드 롤백 계획: GRP와 COMPATIBLE", min:5, body:[
 ["p","업그레이드 작업계획서에는 '실패하면 어떻게 원래대로 돌리는가'가 반드시 들어가야 합니다. 대표적인 수단은 보장 복원 지점(GRP)입니다."],
 ["code","sql","-- 원본 DB(구버전 홈)에서 업그레이드 전에\nCREATE RESTORE POINT before_upg GUARANTEE FLASHBACK DATABASE;\nSELECT name, scn, guarantee_flashback_database FROM v$restore_point;"],
 ["p","**되돌리는 순서** (업그레이드 후 문제가 생겼을 때)"],
 ["ul",["STEP 1. 새 홈(19c)에서 DB를 SHUTDOWN IMMEDIATE","STEP 2. 새 홈에서 STARTUP MOUNT 후 FLASHBACK DATABASE TO RESTORE POINT before_upg;","STEP 3. 다시 SHUTDOWN → 환경 변수·/etc/oratab을 구버전 홈으로 되돌림","STEP 4. 구버전 홈에서 STARTUP MOUNT → ALTER DATABASE OPEN RESETLOGS;","STEP 5. 정상 확인 후 DROP RESTORE POINT before_upg;"]],
 ["ul",["COMPATIBLE을 올린 뒤에는 그 이전 시점의 GRP로 Flashback할 수 없습니다. 그래서 COMPATIBLE 변경은 '되돌릴 필요가 없다'고 확인된 뒤 마지막에 합니다.","GRP는 FRA에 Flashback 로그를 계속 쌓습니다. 업그레이드 후 안정화 기간 동안 FRA 여유 공간을 매일 확인하고, 끝나면 꼭 지웁니다.","GRP는 Enterprise Edition 기능입니다. Standard Edition이라면 업그레이드 직전의 전체 백업(콜드 백업 또는 RMAN)이 롤백 수단입니다."]],
 ["tip","작업계획서의 롤백 STEP은 실제로 랩에서 한 번 해 본 명령만 적으세요. 블로그 '내맘대로긍정'에 11g → 19c 업그레이드 후 restore point로 되돌리는 테스트가 단계별로 정리되어 있어 연습할 때 참고하기 좋습니다."]
]},
{ id:"mig-4", title:"RMAN 백업셋으로 옮기며 업그레이드", min:7, body:[
 ["p","구버전 서버의 RMAN 백업을 새 서버(19c 홈만 설치된 상태)로 가져가 복원한 뒤, 그 자리에서 업그레이드하는 방식입니다. 같은 플랫폼(예: Linux x86-64 → Linux x86-64)이어야 합니다."],
 ["p","◎ 원본 서버 (구버전)"],
 ["code","bash","# STEP 1. 업그레이드 사전 점검 (19c의 preupgrade.jar를 구버전 홈 Java로 실행)\n$ORACLE_HOME/jdk/bin/java -jar /tmp/preupgrade.jar TERMINAL TEXT\n#  → preupgrade_fixups.sql 은 원본에서 실행, postupgrade_fixups.sql 은 업그레이드 후 실행\n\n# STEP 2. 전체 백업 + 아카이브 + 컨트롤파일 + spfile\nrman target / <<'EOF'\nBACKUP AS COMPRESSED BACKUPSET DATABASE FORMAT '/backup/db_%U' PLUS ARCHIVELOG FORMAT '/backup/arc_%U';\nBACKUP CURRENT CONTROLFILE FORMAT '/backup/cf_%U';\nBACKUP SPFILE FORMAT '/backup/sp_%U';\nEOF"],
 ["p","◎ 대상 서버 (19c 홈)"],
 ["code","bash","# STEP 3. 백업 파일 복사 후, 19c 홈 환경으로 NOMOUNT (pfile은 경로·파라미터를 새 서버에 맞게 수정)\nsqlplus / as sysdba <<'EOF'\nSTARTUP NOMOUNT PFILE='/home/oracle/initORCL.ora';\nEOF\n\n# STEP 4. 컨트롤파일 복원 → MOUNT → 백업 등록 → 복원·복구\nrman target / <<'EOF'\nRESTORE CONTROLFILE FROM '/backup/cf_xxxx';\nALTER DATABASE MOUNT;\nCATALOG START WITH '/backup/' NOPROMPT;\nRUN {\n  SET NEWNAME FOR DATABASE TO '/u02/oradata/ORCL/%b';\n  RESTORE DATABASE;\n  SWITCH DATAFILE ALL;\n  RECOVER DATABASE;\n}\nEOF\n#  RECOVER 끝에 '아카이브 없음' 메시지가 나오는 것은 정상 (가진 아카이브까지 적용)"],
 ["code","sql","-- STEP 5. Redo 파일 경로를 새 서버에 맞게 바꾼 뒤 업그레이드 모드로 OPEN\nALTER DATABASE RENAME FILE '/old/redo01.log' TO '/u02/oradata/ORCL/redo01.log';\nALTER DATABASE OPEN RESETLOGS UPGRADE;"],
 ["code","bash","# STEP 6. 업그레이드 실행 (19c)\n$ORACLE_HOME/bin/dbupgrade -n 4 -l /home/oracle/upg_logs\n\n# STEP 7. 사후 작업\nsqlplus / as sysdba <<'EOF'\nSTARTUP;\n@?/rdbms/admin/utlrp.sql\n@/tmp/postupgrade_fixups.sql\nEOF"],
 ["tip","dbupgrade 대신 AutoUpgrade의 upgrade 모드를 써도 됩니다(UPGRADE 모드로 열린 DB 대상). 타임존 파일 업그레이드(DBMS_DST)와 통계 수집도 사후 작업 목록에 넣으세요."]
]},
{ id:"mig-5", title:"Data Pump 이관 실무 옵션", min:6, body:[
 ["p","Data Pump는 버전·플랫폼이 달라도 쓸 수 있는 가장 유연한 이관 도구입니다. 대용량일수록 옵션이 시간과 안정성을 좌우합니다."],
 ["code","bash","# 원본 (expdp)\nexpdp system DIRECTORY=DP_DIR DUMPFILE=app_%U.dmp FILESIZE=20G \\\n  LOGFILE=exp_app.log SCHEMAS=APP PARALLEL=8 \\\n  EXCLUDE=STATISTICS METRICS=YES LOGTIME=ALL \\\n  FLASHBACK_TIME=SYSTIMESTAMP\n#  RAC에서 덤프가 로컬 디스크면 CLUSTER=N 추가\n\n# 대상 (impdp)\nimpdp system DIRECTORY=DP_DIR DUMPFILE=app_%U.dmp LOGFILE=imp_app.log \\\n  PARALLEL=8 METRICS=YES LOGTIME=ALL \\\n  REMAP_TABLESPACE=APP_DATA:APP_DATA19 \\\n  TRANSFORM=DISABLE_ARCHIVE_LOGGING:Y"],
 ["tbl",[["옵션","효과"],["PARALLEL + %U","여러 프로세스·여러 덤프 파일로 병렬 처리"],["EXCLUDE=STATISTICS","통계를 빼고 옮긴 뒤 대상에서 새로 수집 (가져오기 시간 단축)"],["FLASHBACK_TIME=SYSTIMESTAMP","업무 중 export해도 한 시점 기준으로 일관된 데이터"],["METRICS=YES, LOGTIME=ALL","객체별 소요 시간과 타임스탬프를 로그에 남김 — 다음 리허설 시간 산정에 필수"],["TRANSFORM=DISABLE_ARCHIVE_LOGGING:Y","import 중 테이블·인덱스 Redo를 줄여 속도 향상 (FORCE LOGGING DB에서는 효과 없음)"],["VERSION=11.2","더 낮은 버전 DB로 가져갈 덤프를 만들 때"]]],
 ["warn","DISABLE_ARCHIVE_LOGGING으로 가져온 데이터는 import 직후 백업 전까지 미디어 복구로 되살릴 수 없습니다. import가 끝나면 바로 전체 백업을 받으세요."],
 ["tip","import 후에는 객체 수·INVALID 객체·행 수(주요 테이블)를 원본과 비교하는 검증 SQL을 미리 준비해 두면 이관 리허설마다 그대로 재사용할 수 있습니다."]
]},
{ id:"mig-6", title:"콜드 백업으로 서버 이관", min:5, body:[
 ["p","같은 버전·같은 플랫폼으로 서버만 바꿀 때 쓰는 가장 단순한 방법입니다. DB를 정상 종료하고 파일을 그대로 복사합니다."],
 ["p","◎ 원본 서버"],
 ["code","sql","-- STEP 1. 옮길 파일 목록 저장\nSELECT name FROM v$datafile UNION ALL\nSELECT name FROM v$tempfile UNION ALL\nSELECT member FROM v$logfile UNION ALL\nSELECT name FROM v$controlfile;\nCREATE PFILE='/backup/initORCL.ora' FROM SPFILE;\nALTER DATABASE BACKUP CONTROLFILE TO TRACE AS '/backup/cf_trace.sql';\n\n-- STEP 2. 일관된 상태로 종료 (ABORT 금지)\nSHUTDOWN IMMEDIATE;"],
 ["code","bash","# STEP 3. 데이터파일·컨트롤파일·Redo·패스워드 파일(orapwORCL) 복사\nrsync -av /u02/oradata/ORCL/ newsrv:/u02/oradata/ORCL/\nscp $ORACLE_HOME/dbs/orapwORCL newsrv:$ORACLE_HOME/dbs/"],
 ["p","◎ 대상 서버 (같은 버전·같은 RU 홈)"],
 ["code","sql","-- 경로가 같으면 바로 STARTUP. 경로가 다르면 MOUNT 후 파일 위치 변경\nSTARTUP MOUNT PFILE='/home/oracle/initORCL.ora';   -- control_files 경로는 새 위치로 수정\nALTER DATABASE RENAME FILE '/old/path/users01.dbf' TO '/u02/oradata/ORCL/users01.dbf';\nALTER DATABASE OPEN;\nCREATE SPFILE FROM PFILE='/home/oracle/initORCL.ora';"],
 ["ul",["대상 홈의 RU가 원본보다 높다면 OPEN 후 datapatch를 실행합니다.","리스너·tnsnames·/etc/oratab·크론(백업 스크립트) 같은 DB 밖 설정도 체크리스트에 넣습니다.","DB 이름이나 DBID를 바꿔야 하면 nid 유틸리티를 씁니다."]],
 ["tip","파일 수가 많으면 RENAME 대신 STEP 1에서 만든 컨트롤파일 trace의 CREATE CONTROLFILE 문(NORESETLOGS)에서 경로만 바꿔 실행하는 편이 빠릅니다."]
]}],
quiz:[
 { q: "19c로 '직접' 업그레이드할 수 없는 원본 버전은?", o: ["11.2.0.4", "12.1.0.2", "12.2.0.1", "11.2.0.3"], a: 3, e: "19c 직접 업그레이드 원본은 11.2.0.4, 12.1.0.2, 12.2.0.1, 18c입니다. 11.2.0.3은 중간 버전을 거쳐야 합니다." },
 { q: "AutoUpgrade에서 DB를 바꾸지 않고 사전 점검만 하는 모드는?", o: ["deploy", "analyze", "upgrade", "postfixups"], a: 1, e: "analyze는 읽기 전용 점검입니다. fixups는 사전 조치, deploy는 실제 업그레이드까지 수행합니다." },
 { q: "업그레이드 후 COMPATIBLE을 바로 올리면 생기는 문제는?", o: ["DB가 OPEN되지 않는다", "업그레이드 전 GRP로 되돌리거나 다운그레이드할 수 없게 된다", "리스너가 내려간다", "아카이브가 꺼진다"], a: 1, e: "COMPATIBLE을 올린 뒤에는 그 이전 시점으로 Flashback할 수 없고 다운그레이드도 막힙니다. 검증이 끝난 뒤 마지막에 올립니다." },
 { q: "RMAN으로 새 19c 서버에 복원한 구버전 DB를 여는 명령은?", o: ["ALTER DATABASE OPEN;", "ALTER DATABASE OPEN RESETLOGS UPGRADE;", "STARTUP UPGRADE NOMOUNT;", "ALTER DATABASE OPEN READ ONLY;"], a: 1, e: "불완전 복구 후이므로 RESETLOGS, 그리고 새 버전 홈에서 여는 것이므로 UPGRADE 모드로 엽니다. 이후 dbupgrade(또는 AutoUpgrade upgrade 모드)를 실행합니다." },
 { q: "Data Pump에서 업무 중 export해도 한 시점 기준의 일관된 데이터를 얻는 옵션은?", o: ["CONTENT=DATA_ONLY", "FLASHBACK_TIME=SYSTIMESTAMP", "PARALLEL=8", "COMPRESSION=ALL"], a: 1, e: "FLASHBACK_TIME(또는 FLASHBACK_SCN)으로 export 기준 시점을 고정합니다." },
 { q: "impdp의 TRANSFORM=DISABLE_ARCHIVE_LOGGING:Y 사용 후 꼭 해야 할 일은?", o: ["통계 삭제", "import 직후 전체 백업", "DB 재생성", "아카이브 모드 해제"], a: 1, e: "Redo를 줄여 가져온 데이터는 백업 전까지 미디어 복구로 되살릴 수 없으므로 바로 백업합니다." },
 { q: "콜드 백업 이관 전 원본 DB를 내릴 때 써야 하는 종료 방법은?", o: ["SHUTDOWN ABORT", "SHUTDOWN IMMEDIATE", "kill -9 pmon", "ALTER SYSTEM SUSPEND"], a: 1, e: "파일을 그대로 복사해 바로 열려면 일관된(consistent) 상태여야 합니다. ABORT는 인스턴스 복구가 필요한 상태로 남깁니다." }
]});

  /* ── 기존 노선 실무 레슨 ── */
  var MORE = {
patch: [
{ id:"patch-7", title:"비활성 패치 정리 (deleteinactivepatches)", min:5, body:[
 ["p","RU를 여러 번 적용한 홈은 $ORACLE_HOME/.patch_storage에 롤백용 파일이 계속 쌓입니다. 용량도 커지고, 새 RU를 적용할 때 충돌 검사도 느려집니다. OPatch 12.2.0.1.37부터 비활성(inactive) 패치를 정리하는 기능이 들어갔습니다(MOS 2942102.1)."],
 ["code","bash","# 홈 소유자 계정 — DB를 내리지 않고 실행 가능\n/u01/app/oracle/product/19.0.0/dbhome_1/OPatch/opatch version          # 12.2.0.1.37 이상인지\ndu -sh /u01/app/oracle/product/19.0.0/dbhome_1/.patch_storage\n\n# 지울 대상 미리보기\n/u01/app/oracle/product/19.0.0/dbhome_1/OPatch/opatch util listorderedinactivepatches\n\n# 보존 개수 설정 확인 (기본 1 = 바로 직전 RU 하나는 남김)\ngrep RETAIN_INACTIVE_PATCHES /u01/app/oracle/product/19.0.0/dbhome_1/OPatch/config/opatch.properties\n\n# 정리 실행\n/u01/app/oracle/product/19.0.0/dbhome_1/OPatch/opatch util deleteinactivepatches -silent\n\n# 결과 확인\n/u01/app/oracle/product/19.0.0/dbhome_1/OPatch/opatch util listorderedinactivepatches\ndu -sh /u01/app/oracle/product/19.0.0/dbhome_1/.patch_storage"],
 ["ul",["한 번 실행하면 RU 체인 하나만 정리됩니다. DB RU와 GI RU처럼 체인이 여러 개면 listorderedinactivepatches 결과를 보며 여러 번 실행합니다.","기본값(RETAIN_INACTIVE_PATCHES=1)은 직전 RU 하나로 되돌릴 수 있게 남깁니다. 지운 RU로는 opatch rollback을 할 수 없으니, 롤백 정책에 맞게 값을 정하세요.","실행 전 홈 백업(tar)을 받아 두는 것이 안전합니다."]],
 ["tip","블로그 '내맘대로긍정'의 테스트(19.22→19.28 누적 후 정리)에서는 .patch_storage가 약 16GB에서 4.7GB로 줄고, 다음 RU의 opatch apply 시간도 15분대에서 10분대로 줄었습니다. RU가 많이 쌓인 운영 홈일수록 효과가 큽니다."]
]}],
arch: [
{ id:"arch-16", title:"19c에서 달라진 것들 (실무 관점)", min:5, body:[
 ["p","19c는 12c Release 2 계열의 마지막 장기 지원(Long Term) 릴리스입니다. 현장에서 자주 부딪히는 변화만 추렸습니다."],
 ["ul",["Standard Edition 2에서 RAC를 더 이상 지원하지 않습니다. SE2 RAC를 쓰던 곳은 19c로 올리기 전에 EE RAC 또는 단일 인스턴스(SE High Availability 포함)로 바꿔야 합니다.","GI 설치 시 GIMR(MGMTDB)이 선택 사항이 되었습니다.","non-CDB 구조는 deprecated입니다. 21c부터는 CDB만 지원하므로 19c 기간에 PDB 전환을 계획합니다.","AutoUpgrade가 기본 업그레이드 도구가 되었습니다.","Active Data Guard에서 Standby에 들어온 DML을 Primary로 넘겨 처리하는 DML Redirection이 추가되었습니다(ADG 라이선스).","Hybrid Partitioned Table로 일부 파티션을 외부 파일에 둘 수 있습니다."]],
 ["p","**Exadata(및 Oracle Cloud)에서만 쓸 수 있는 19c 기능**"],
 ["ul",["Automatic Indexing — 실행되는 SQL을 보고 인덱스를 자동으로 만들고 검증·삭제 (DBMS_AUTO_INDEX)","Real-Time Statistics — 일반 DML 중에도 통계를 실시간으로 보강","SQL Quarantine — Resource Manager가 끊은 폭주 SQL 실행계획을 격리해 다시 돌지 않게 함","High-Frequency Automatic Statistics Collection — 자동 통계 수집을 더 자주"]],
 ["warn","이 기능들은 Exadata가 아닌 일반 EE에서 숨김 파라미터로 켜서 테스트할 수는 있어도 라이선스상 운영 사용은 안 됩니다. 고객사가 'Automatic Indexing 써도 되나요?'라고 물으면 장비가 Exadata인지부터 확인하세요."]
]}],
rac: [
{ id:"rac-7", title:"Linux 8·9에 19c 설치할 때 체크포인트", min:5, body:[
 ["p","19.3 설치 이미지는 OL/RHEL 8·9가 나오기 전에 만들어져서, 그대로 설치하면 OS 검사에서 막히거나 알려진 버그를 만납니다. 설치하면서 RU를 같이 적용하는 것이 표준입니다."],
 ["ul",["OL/RHEL 9는 19c 19.19 RU부터 인증되었고, 19c Release Notes는 OL/RHEL 9에서 19.22 이상 설치를 권장합니다. GI·RAC는 DB 단일 설치와 RPM 요구사항이 달라 별도 문서를 확인합니다.","OL/RHEL 8도 19.3 이미지 그대로보다는 최신 RU를 같이 적용해 설치합니다."]],
 ["code","bash","# ◎ 1번 노드, grid 계정 (GI 홈에 19.3 이미지를 풀어 둔 상태)\n# 설치 프로그램이 OS 버전을 인식하지 못할 때 배포판을 지정\nexport CV_ASSUME_DISTID=OL8      # 관례: OL/RHEL 8에서는 OL7, OL/RHEL 9에서는 OL8로 지정하는 경우가 많음\n\n# OPatch를 최신으로 바꾼 뒤, 설치와 동시에 RU 적용\ncd /u01/app/19.0.0/grid\n./gridSetup.sh -applyRU /u01/patch/<GI_RU_DIR>\n\n# DB 홈 (oracle 계정)\ncd /u01/app/oracle/product/19.0.0/dbhome_1\n./runInstaller -applyRU /u01/patch/<DB_RU_DIR>"],
 ["tip","설치 전에 cluvfy(runcluvfy.sh stage -pre crsinst)로 노드 간 SSH·DNS·NTP·공유 디스크를 먼저 점검하면, 설치 도중 INS-로 시작하는 에러를 크게 줄일 수 있습니다. '내맘대로긍정' 블로그에 OL 9.6 + 19c RAC 설치 과정과 설치 중 만난 INS·CRS 에러 해결 글이 정리되어 있어 랩 구축 때 참고하기 좋습니다."]
]}]
  };
  var REF = {
    "mig-1": [["Database Upgrade Guide 19c", D + "upgrd/index.html"], ["참고 블로그 · 내맘대로긍정 — 오라클 19c New Features", B + "726"]],
    "mig-2": [["Database Upgrade Guide 19c · AutoUpgrade Command-Line Parameters", D + "upgrd/autoupgrade-command-line-parameters.html"], ["MOS 2485457.1 · AutoUpgrade Tool", MOS + "2485457.1"], ["참고 블로그 · 내맘대로긍정 — 18c → 19c AutoUpgrade 가이드", B + "540"]],
    "mig-3": [["Backup and Recovery User's Guide 19c · Flashback Database and Restore Points", D + "bradv/using-flasback-database-restore-points.html"], ["참고 블로그 · 내맘대로긍정 — 11g to 19c 업그레이드 시 restore point 이용 복원", B + "1280"]],
    "mig-4": [["Database Upgrade Guide 19c", D + "upgrd/index.html"], ["참고 블로그 · 내맘대로긍정 — 11gR2 → 19c RMAN 백업셋 이용 업그레이드", B + "736"], ["참고 블로그 · 내맘대로긍정 — 11gR2 ASM RAC → 19c ASM RAC 업그레이드", B + "1234"], ["참고 블로그 · 내맘대로긍정 — preupgrade.jar 사용법", B + "1233"]],
    "mig-5": [["Database Utilities 19c · Data Pump Export·Import", D + "sutil/index.html"]],
    "mig-6": [["Administrator's Guide 19c · Managing Control Files", D + "admin/managing-control-files.html"]],
    "patch-7": [["MOS 2942102.1 · OPatch 12.2.0.1.37+ Delete Inactive Patches", MOS + "2942102.1"], ["참고 블로그 · 내맘대로긍정 — 오라클 19c OPatch 이용 비활성 패치 제거", B + "1383"]],
    "arch-16": [["Database New Features Guide 19c", D + "newft/index.html"], ["참고 블로그 · 내맘대로긍정 — 오라클 19c New Features", B + "726"]],
    "rac-7": [["Database Release Notes 19c · Issues Affecting Linux", D + "rnrdm/linux-platform-issues.html"], ["MOS 2982833.1 · 19c on OL9/RHEL9 요구사항", MOS + "2982833.1"]]
  };
  cat("mig").lessons.forEach(function (l) { if (REF[l.id]) l.ref = REF[l.id]; });
  Object.keys(MORE).forEach(function (id) { var c = cat(id); MORE[id].forEach(function (l) { if (REF[l.id]) l.ref = REF[l.id]; c.lessons.push(l); }); });

  /* ── 퀴즈 추가 (각 노선 기존 문제 뒤에 — 기록 ID 유지) ── */
  var QZ = {
patch: [
 { q: "OPatch로 .patch_storage의 비활성 패치를 정리하는 명령은?", o: ["opatch util cleanup", "opatch util deleteinactivepatches", "opatch rollback -all", "opatch lspatches -clean"], a: 1, e: "OPatch 12.2.0.1.37부터 opatch util deleteinactivepatches로 비활성 패치를 정리할 수 있습니다(MOS 2942102.1)." },
 { q: "RETAIN_INACTIVE_PATCHES 기본값 1의 의미는?", o: ["비활성 패치를 모두 지운다", "가장 최근 비활성 패치 하나는 롤백용으로 남긴다", "하루에 한 번만 실행된다", "GI 홈만 정리한다"], a: 1, e: "기본값은 직전 RU 하나로 되돌릴 수 있도록 비활성 패치 1개를 남깁니다." }
],
arch: [
 { q: "19c에서 지원이 중단된 구성은?", o: ["EE RAC", "SE2 RAC", "EE 단일 인스턴스", "Active Data Guard"], a: 1, e: "19c부터 Standard Edition 2의 RAC는 지원되지 않습니다." },
 { q: "19c Automatic Indexing을 라이선스상 운영에서 쓸 수 있는 환경은?", o: ["모든 EE", "Exadata(및 Oracle Cloud의 Exadata 기반 서비스)", "SE2", "XE"], a: 1, e: "Automatic Indexing·Real-Time Statistics·SQL Quarantine은 Exadata(EE-ES)와 Exadata 기반 클라우드에서만 사용할 수 있습니다." }
],
rac: [
 { q: "OL/RHEL 9에서 19c가 인증된 최소 RU는?", o: ["19.3", "19.11", "19.19", "19.30"], a: 2, e: "19.19부터 인증되었고, Release Notes는 19.22 이상 설치를 권장합니다." },
 { q: "GI 설치와 동시에 RU를 적용하는 gridSetup.sh 옵션은?", o: ["-patch", "-applyRU", "-silent", "-executeConfigTools"], a: 1, e: "./gridSetup.sh -applyRU <RU 디렉터리>로 설치 전에 RU를 홈에 먼저 적용합니다." },
 { q: "RAC의 기본 SCAN 리스너 개수는?", o: ["1개", "2개", "3개", "노드 수만큼"], a: 2, e: "SCAN은 보통 IP 3개로 구성되고 SCAN 리스너도 3개가 클러스터 노드에 나뉘어 뜹니다." },
 { q: "클러스터 인터커넥트·퍼블릭 네트워크 인터페이스 설정을 확인하는 명령은?", o: ["oifcfg getif", "olsnodes -s", "srvctl config scan", "crsctl query css votedisk"], a: 0, e: "oifcfg getif로 인터페이스별 용도(public / cluster_interconnect)를 확인합니다." }
],
trouble: [
 { q: "ORA-04031이 뜻하는 것은?", o: ["Shared Pool 등 SGA 영역에서 메모리를 할당하지 못함", "TEMP 부족", "아카이브 공간 부족", "리스너 미기동"], a: 0, e: "ORA-04031은 공유 메모리(주로 Shared Pool·Large Pool) 할당 실패입니다. 리터럴 SQL에 의한 단편화도 흔한 원인입니다." },
 { q: "ADRCI에서 특정 인시던트를 SR용으로 묶는 명령은?", o: ["show alert -tail 50", "ips pack incident <번호> in /tmp", "purge -age 1440", "set homepath"], a: 1, e: "ips pack incident <번호> in <디렉터리>로 인시던트 관련 트레이스를 zip 패키지로 만듭니다." },
 { q: "ORA-00257(archiver error) 상태에서 일반 사용자 접속이 어떻게 되나?", o: ["정상 접속", "아카이브 공간이 확보될 때까지 새 작업이 막힌다", "DB가 자동 재기동된다", "읽기 전용으로 바뀐다"], a: 1, e: "아카이브를 쓸 수 없으면 로그 스위치가 멈춰 DML이 진행되지 않습니다. RMAN으로 백업 후 정리하거나 FRA를 늘립니다." }
],
dg: [
 { q: "Standby Redo Log(SRL) 그룹 수 권장 기준은?", o: ["온라인 Redo 그룹 수와 같게", "스레드마다 온라인 Redo 그룹 수 + 1", "1개면 충분", "아카이브 로그 수만큼"], a: 1, e: "Data Guard 문서는 스레드마다 온라인 Redo 그룹보다 하나 더 많은 SRL 그룹을 권장합니다." },
 { q: "Primary에 FORCE LOGGING을 켜는 이유는?", o: ["성능 향상", "NOLOGGING 작업도 Redo를 남겨 Standby에 반영되게 하려고", "아카이브 용량 절감", "SRL 생성용"], a: 1, e: "NOLOGGING으로 처리된 변경은 Redo가 없어 Standby에 넘어가지 않습니다. FORCE LOGGING으로 이를 막습니다." },
 { q: "12c 이후 RECOVER MANAGED STANDBY DATABASE DISCONNECT의 기본 적용 방식은?", o: ["아카이브 단위 적용만", "Real-Time Apply (SRL에서 바로 적용)", "적용하지 않음", "Logical Apply"], a: 1, e: "12c부터는 USING CURRENT LOGFILE을 쓰지 않아도 기본이 Real-Time Apply입니다." }
],
sec: [
 { q: "Unified Auditing의 감사 기록을 조회하는 뷰는?", o: ["DBA_AUDIT_TRAIL", "UNIFIED_AUDIT_TRAIL", "V$SESSION", "DBA_FGA_AUDIT_TRAIL"], a: 1, e: "Unified Auditing 기록은 UNIFIED_AUDIT_TRAIL 뷰로 조회합니다." },
 { q: "원격에서 SYSDBA로 접속할 수 있게 해 주는 파일은?", o: ["spfile", "패스워드 파일(orapw<SID>)", "sqlnet.ora", "tnsnames.ora"], a: 1, e: "원격 SYSDBA 인증은 패스워드 파일로 합니다(REMOTE_LOGIN_PASSWORDFILE = EXCLUSIVE 기본)." }
],
space: [
 { q: "UNDO_RETENTION의 기본값은?", o: ["300초", "900초", "3600초", "0"], a: 1, e: "기본 900초(15분)입니다. 자동 Undo 관리에서는 공간이 허락하면 그보다 길게 보존하기도 합니다." },
 { q: "TEMP를 지금 사용 중인 세션을 찾는 뷰는?", o: ["V$TEMPSEG_USAGE", "DBA_TEMP_FILES", "V$UNDOSTAT", "DBA_FREE_SPACE"], a: 0, e: "V$TEMPSEG_USAGE(V$SORT_USAGE)를 V$SESSION과 조인해 어떤 세션·SQL이 TEMP를 쓰는지 봅니다." }
],
asm: [
 { q: "ASM NORMAL 이중화는 데이터를 몇 벌로 저장하나?", o: ["1벌", "2벌", "3벌", "디스크 수만큼"], a: 1, e: "NORMAL은 2-way, HIGH는 3-way 미러링입니다." },
 { q: "ASM 디스크가 일시적으로 OFFLINE됐을 때 DROP되기 전까지 기다리는 기본 시간(DISK_REPAIR_TIME)은?", o: ["1시간", "3.6시간", "12시간", "24시간"], a: 1, e: "기본 3.6시간입니다. 그 안에 디스크가 돌아오면 변경분만 재동기화합니다." }
],
perf: [
 { q: "AWR 스냅샷의 기본 수집 주기와 보존 기간은?", o: ["30분 / 7일", "60분 / 8일", "15분 / 30일", "60분 / 31일"], a: 1, e: "기본은 60분마다 수집하고 8일간 보존합니다. DBMS_WORKLOAD_REPOSITORY.MODIFY_SNAPSHOT_SETTINGS로 바꿉니다." },
 { q: "'db file sequential read' 대기가 주로 뜻하는 것은?", o: ["Full Scan의 멀티블록 읽기", "인덱스 등을 통한 단일 블록 읽기", "Redo 쓰기", "TEMP 쓰기"], a: 1, e: "sequential read는 단일 블록 읽기(주로 인덱스 경로), scattered read는 멀티블록 읽기(Full Scan)입니다." }
]
  };
  QZ.mig = [];
  Object.keys(QZ).forEach(function (id) { var c = cat(id); if (c && QZ[id].length) c.quiz = c.quiz.concat(QZ[id]); });
})();

/* ───────── v0.1.0 대규모 보강: 노선별 레슨 30개 + 퀴즈 (19c 공식 문서·MOS 기준) ───────── */
(function () {
  var D = "https://docs.oracle.com/en/database/oracle/oracle-database/19/";
  var MOS = "https://support.oracle.com/epmos/faces/DocumentDisplay?id=";
  var C = window.DBBIG_CONTENT;
  function cat(id) { return C.filter(function (c) { return c.id === id; })[0]; }
  var ADD = {
/* ───── 1호선 아키텍처 ───── */
arch: { lessons: [
{ id:"arch-17", title:"SGA 구성요소 자세히", min:5, ref:[["Database Concepts 19c · Memory Architecture", D + "cncpt/memory-architecture.html"]], body:[
 ["tbl",[["영역","담는 것","실무 포인트"],["Buffer Cache","데이터 블록","DB_CACHE_SIZE (ASMM이면 자동 조정)"],["Shared Pool","Library Cache, Dictionary Cache, Result Cache 등","리터럴 SQL이 많으면 단편화 → ORA-04031"],["Large Pool","공유 서버의 UGA, 병렬 실행 메시지 버퍼, RMAN I/O 슬레이브 버퍼","대용량 할당을 Shared Pool과 분리"],["Java Pool","DB 안 Java 실행 메모리","OJVM 사용 여부와 관련"],["Streams Pool","Data Pump, GoldenGate Integrated 추출 등","expdp/impdp가 사용 — ASMM이면 자동"],["Redo Log Buffer","Redo 엔트리","LGWR가 파일로 씀"],["In-Memory Area (옵션)","컬럼 형식 데이터","INMEMORY_SIZE, Database In-Memory 라이선스"]]],
 ["code","sql","-- 지금 SGA 구성\nSELECT name, ROUND(bytes/1024/1024) AS mb, resizeable FROM v$sgainfo ORDER BY bytes DESC;\n\n-- ASMM이 자동으로 늘리고 줄인 이력\nSELECT component, oper_type, ROUND(initial_size/1024/1024) init_mb,\n       ROUND(final_size/1024/1024) final_mb, start_time\nFROM   v$sga_resize_ops ORDER BY start_time DESC FETCH FIRST 20 ROWS ONLY;"],
 ["tip","V$SGA_RESIZE_OPS에서 Shared Pool이 커지고 Buffer Cache가 줄어드는 SHRINK/GROW가 업무 시간에 계속 반복되면, 리터럴 SQL로 Shared Pool이 부풀고 있다는 신호일 수 있습니다. 이때는 SHARED_POOL_SIZE에 최소값을 걸어 두는 방법을 검토합니다."]
]},
{ id:"arch-18", title:"PGA와 정렬·해시 작업공간", min:5, ref:[["Database Reference 19c · PGA_AGGREGATE_LIMIT", D + "refrn/PGA_AGGREGATE_LIMIT.html"], ["Database Concepts 19c · Memory Architecture (PGA)", D + "cncpt/memory-architecture.html"]], body:[
 ["p","PGA는 서버 프로세스마다 따로 쓰는 메모리입니다. 정렬(ORDER BY, GROUP BY), 해시 조인, 비트맵 병합 같은 '작업공간(work area)'이 여기서 돌고, 모자라면 TEMP로 넘칩니다."],
 ["tbl",[["작업공간 실행 방식","뜻"],["optimal","PGA 안에서 끝남 — 가장 빠름"],["one-pass","TEMP에 한 번 쓰고 한 번 읽음"],["multi-pass","TEMP를 여러 번 오감 — 매우 느림, 튜닝 대상"]]],
 ["ul",["PGA_AGGREGATE_TARGET은 '목표'일 뿐 넘을 수 있습니다.","PGA_AGGREGATE_LIMIT은 '하드 한도'입니다. 넘으면 PGA를 가장 많이 쓰는 세션의 호출이 중단되거나 세션이 종료됩니다(ORA-04036).","PGA_AGGREGATE_LIMIT 기본값은 2GB, PGA_AGGREGATE_TARGET의 200%, PROCESSES × 3MB 중 가장 큰 값입니다(RAC는 PROCESSES × 5MB 기준)."]],
 ["code","sql","SELECT name, ROUND(value/1024/1024) AS mb FROM v$pgastat\nWHERE  name IN ('aggregate PGA target parameter','total PGA allocated','maximum PGA allocated');\nSELECT name, value FROM v$pgastat WHERE name = 'over allocation count';  -- 0보다 커지면 목표가 작다는 신호\n\n-- 작업공간이 어떤 방식으로 돌았는지 분포\nSELECT optimal_executions, onepass_executions, multipasses_executions,\n       low_optimal_size/1024 AS low_kb, (high_optimal_size+1)/1024 AS high_kb\nFROM   v$sql_workarea_histogram WHERE total_executions > 0;"],
 ["warn","19c로 업그레이드한 뒤 갑자기 ORA-04036이 난다면, 업그레이드 전보다 PGA 사용이 늘었거나(병렬·대량 정렬) PGA_AGGREGATE_LIMIT을 명시적으로 낮게 설정해 둔 경우가 많습니다. 기본값보다 낮게 설정하지 마세요."]
]},
{ id:"arch-19", title:"접속 흐름: 리스너 → 서버 프로세스", min:5, ref:[["Database Concepts 19c · Process Architecture", D + "cncpt/process-architecture.html"], ["Net Services Administrator's Guide 19c", D + "netag/index.html"]], body:[
 ["p","**STEP 1.** 클라이언트가 리스너(보통 1521 포트)로 접속 요청을 보냅니다. 요청에는 SERVICE_NAME이 들어 있습니다."],
 ["p","**STEP 2.** 리스너는 그 서비스를 등록한 인스턴스(LREG가 등록)를 찾고, 전용 서버(dedicated) 방식이면 그 인스턴스의 서버 프로세스를 하나 만들어 연결을 넘깁니다. 이후 대화는 리스너를 거치지 않습니다."],
 ["p","**STEP 3.** 서버 프로세스가 인증하고 세션을 만듭니다. 이때부터 SQL은 이 서버 프로세스가 처리합니다."],
 ["code","bash","# 원격 접속으로 생긴 전용 서버 프로세스 (LOCAL=NO)\nps -ef | grep 'oracleDBBIG1 (LOCAL=NO)' | grep -v grep | wc -l\n\n# 리스너가 아는 서비스와 핸들러 상태\nlsnrctl services"],
 ["tbl",[["방식","구조","언제"],["전용 서버 (Dedicated)","세션 1개 = 서버 프로세스 1개","기본값, 대부분의 업무"],["공유 서버 (Shared)","디스패처(Dnnn)가 받아 공유 서버(Snnn)들이 나눠 처리","접속은 많은데 대부분 놀고 있을 때"],["DRCP","DB가 서버 프로세스 풀을 유지하고 빌려줌","짧은 접속이 매우 잦은 웹 애플리케이션"]]],
 ["tip","리스너는 연결을 '넘겨주는' 역할만 하므로, 이미 붙어 있는 세션은 리스너를 내려도 끊기지 않습니다. 리스너 재기동이 필요한 작업(sqlnet.ora 변경 등)을 할 때 고객에게 이 점을 설명하면 작업 승인이 수월합니다."]
]},
{ id:"arch-20", title:"파라미터 변경 범위: SCOPE·SID·정적/동적", min:5, ref:[["SQL Language Reference 19c · ALTER SYSTEM", D + "sqlrf/ALTER-SYSTEM.html"], ["Database Reference 19c · V$PARAMETER", D + "refrn/V-PARAMETER.html"]], body:[
 ["tbl",[["SCOPE","적용"],["MEMORY","지금 메모리에만 — 재기동하면 사라짐"],["SPFILE","spfile에만 — 다음 기동부터"],["BOTH","둘 다 (spfile로 기동한 경우 기본값)"]]],
 ["code","sql","-- 이 파라미터를 지금 바꿀 수 있나?\nSELECT name, value, issys_modifiable, isses_modifiable, isdefault\nFROM   v$parameter WHERE name IN ('processes','open_cursors','sga_target','db_recovery_file_dest_size');\n--  ISSYS_MODIFIABLE = IMMEDIATE : 바로 적용 / DEFERRED : 이후 새 세션부터 / FALSE : 정적(재기동 필요)\n\n-- 변경 전 백업은 습관처럼\nCREATE PFILE='/tmp/init_before_change.ora' FROM SPFILE;\n\n-- 정적 파라미터 (재기동 필요)\nALTER SYSTEM SET processes = 1500 SCOPE=SPFILE SID='*';\n\n-- RAC에서 한 인스턴스만 다르게\nALTER SYSTEM SET undo_tablespace = 'UNDOTBS2' SCOPE=BOTH SID='DBBIG2';\n\n-- spfile에서 항목 지우기 (기본값으로 되돌림)\nALTER SYSTEM RESET open_cursors SCOPE=SPFILE SID='*';\n\n-- spfile에 실제로 적힌 값\nSELECT sid, name, value FROM v$spparameter WHERE isspecified = 'TRUE' ORDER BY name;"],
 ["warn","RAC에서 SID를 빼고 SCOPE=SPFILE로 바꾸면 기본값 '*'가 적용되어 모든 인스턴스에 반영됩니다. 특정 노드만 바꾸려던 것이라면 SID를 꼭 명시하세요."]
]}],
 quiz: [
 { q: "Data Pump(expdp/impdp)가 사용하는 SGA 영역은?", o: ["Java Pool", "Streams Pool", "Redo Log Buffer", "Keep Pool"], a: 1, e: "Data Pump와 GoldenGate Integrated 추출은 Streams Pool을 씁니다. ASMM이면 자동으로 크기가 잡힙니다." },
 { q: "PGA_AGGREGATE_LIMIT을 넘으면 일어나는 일은?", o: ["경고만 남는다", "PGA를 가장 많이 쓰는 세션의 호출이 중단되거나 세션이 종료된다", "인스턴스가 재기동된다", "SGA가 줄어든다"], a: 1, e: "하드 한도라서 초과 시 PGA를 많이 쓰는 세션부터 중단·종료됩니다(ORA-04036)." },
 { q: "작업공간이 TEMP를 여러 번 오가며 처리되는 가장 느린 방식은?", o: ["optimal", "one-pass", "multi-pass", "direct-path"], a: 2, e: "multi-pass는 TEMP를 여러 번 읽고 써서 매우 느리며 튜닝 대상입니다." },
 { q: "리스너를 재기동하면 이미 접속해 있던 전용 서버 세션은?", o: ["모두 끊긴다", "끊기지 않는다", "공유 서버로 바뀐다", "읽기 전용이 된다"], a: 1, e: "리스너는 연결을 넘겨주기만 하므로 기존 세션은 유지됩니다. 새 접속만 영향을 받습니다." },
 { q: "V$PARAMETER.ISSYS_MODIFIABLE = FALSE인 파라미터를 바꾸려면?", o: ["SCOPE=MEMORY로 즉시 변경", "SCOPE=SPFILE로 바꾸고 재기동", "ALTER SESSION으로 변경", "변경 불가"], a: 1, e: "정적 파라미터는 spfile에 반영한 뒤 인스턴스를 재기동해야 적용됩니다." }
]},
/* ───── 2호선 공간관리 ───── */
space: { lessons: [
{ id:"space-6", title:"UNDO 운영 심화: V$UNDOSTAT 읽기", min:5, ref:[["Administrator's Guide 19c · Managing Undo", D + "admin/managing-undo.html"]], body:[
 ["p","자동 Undo 관리에서는 오라클이 실제 쿼리 길이를 보고 보존 시간을 스스로 조정합니다(tuned undo retention). 그 결과는 V$UNDOSTAT에 10분 단위로 남습니다."],
 ["code","sql","SELECT begin_time, end_time,\n       undoblks,                  -- 10분간 사용한 Undo 블록\n       maxquerylen,               -- 가장 오래 돈 쿼리(초)\n       tuned_undoretention,       -- 오라클이 맞춘 보존 시간(초)\n       ssolderrcnt,               -- ORA-01555 발생 건수\n       nospaceerrcnt              -- Undo 공간 부족 건수\nFROM   v$undostat\nORDER  BY begin_time DESC FETCH FIRST 24 ROWS ONLY;"],
 ["ul",["SSOLDERRCNT가 0보다 크면 ORA-01555가 실제로 났다는 뜻입니다. 같은 구간의 MAXQUERYLEN과 TUNED_UNDORETENTION을 비교하세요.","Undo 데이터파일이 AUTOEXTEND OFF면 오라클은 '현재 크기로 가능한 최대 보존'을 목표로 합니다. AUTOEXTEND ON이면 가장 긴 쿼리를 기준으로 맞춥니다.","RETENTION GUARANTEE를 걸면 보존 기간 안의 Undo를 절대 덮어쓰지 않습니다. 대신 Undo가 모자라면 DML이 실패하므로 운영계에서는 신중히 씁니다."]],
 ["code","sql","-- Undo 테이블스페이스 교체 (RAC는 인스턴스별)\nCREATE UNDO TABLESPACE undotbs_new DATAFILE '+DATAC1' SIZE 20G AUTOEXTEND ON MAXSIZE 32767M;\nALTER SYSTEM SET undo_tablespace = 'UNDOTBS_NEW' SCOPE=BOTH SID='DBBIG1';\n-- 옛 Undo는 ACTIVE 트랜잭션이 끝난 뒤에 DROP (DBA_ROLLBACK_SEGS 상태 확인)"]
]},
{ id:"space-7", title:"TEMP 관리: 추가·축소·그룹", min:4, ref:[["Administrator's Guide 19c · Managing Tablespaces", D + "admin/managing-tablespaces.html"]], body:[
 ["code","sql","-- TEMP 파일 추가\nALTER TABLESPACE temp ADD TEMPFILE '+DATAC1' SIZE 20G AUTOEXTEND ON MAXSIZE 32767M;\n\n-- 대량 작업 후 커진 TEMP 줄이기 (사용 중인 부분은 줄지 않음)\nALTER TABLESPACE temp SHRINK SPACE KEEP 10G;\nALTER TABLESPACE temp SHRINK TEMPFILE '+DATAC1/DBBIG/TEMPFILE/temp.300.111' KEEP 5G;\n\n-- TEMP 그룹: 여러 TEMP를 묶어 세션들이 나눠 쓰게\nALTER TABLESPACE temp  TABLESPACE GROUP tgrp;\nALTER TABLESPACE temp2 TABLESPACE GROUP tgrp;\nALTER DATABASE DEFAULT TEMPORARY TABLESPACE tgrp;\nSELECT group_name, tablespace_name FROM dba_tablespace_groups;"],
 ["ul",["TEMP 파일은 블록을 미리 포맷하지 않아 추가가 빠르지만, 파일시스템에서는 실제 공간을 나중에 차지하는(sparse) 경우가 있어 df로 보이는 여유와 다를 수 있습니다.","사용 중인 TEMP 파일은 DROP할 수 없습니다. V$TEMPSEG_USAGE로 사용 세션이 없는지 확인하고 진행합니다."]],
 ["tip","월말 배치처럼 특정 시점에만 TEMP가 튀는 시스템은, 그 시점에 어떤 SQL이 TEMP를 썼는지 DBA_HIST_ACTIVE_SESS_HISTORY의 TEMP_SPACE_ALLOCATED로 찾아 튜닝하는 편이 TEMP를 계속 키우는 것보다 근본적입니다."]
]},
{ id:"space-8", title:"데이터파일 온라인 이동·이름 변경", min:4, ref:[["Administrator's Guide 19c · Managing Data Files and Temp Files", D + "admin/managing-data-files-and-temp-files.html"]], body:[
 ["p","12c부터 ALTER DATABASE MOVE DATAFILE로 업무를 멈추지 않고 데이터파일을 옮기거나 이름을 바꿀 수 있습니다. 파일시스템 ↔ ASM, 디스크그룹 간 이동도 됩니다."],
 ["code","sql","-- 파일 번호·위치 확인\nSELECT file_id, file_name, ROUND(bytes/1024/1024/1024,1) gb FROM dba_data_files WHERE tablespace_name = 'USERS';\n\n-- 다른 디스크그룹으로 온라인 이동\nALTER DATABASE MOVE DATAFILE '+DATAC1/DBBIG/DATAFILE/users.260.111' TO '+DATAC2';\n\n-- 파일시스템에서 이름 변경 (원본 유지하려면 KEEP)\nALTER DATABASE MOVE DATAFILE '/u02/oradata/ORCL/users01.dbf' TO '/u03/oradata/ORCL/users01.dbf';\n\n-- 진행 상황\nSELECT sid, opname, sofar, totalwork, ROUND(sofar/totalwork*100,1) pct\nFROM   v$session_longops WHERE opname LIKE 'Online data file move%' AND sofar < totalwork;"],
 ["ul",["이동하는 동안 파일 크기만큼 대상 공간이 추가로 필요합니다.","TEMP 파일은 이 명령으로 옮기지 않습니다. 새 위치에 TEMP 파일을 추가하고 옛 파일을 지웁니다.","Data Guard Standby의 파일은 따로 옮겨야 합니다(이 명령은 실행한 DB에만 적용)."]],
 ["tip","예전처럼 테이블스페이스를 OFFLINE → OS 복사 → RENAME → ONLINE 하던 작업을 이 명령 한 줄로 대체할 수 있어서, 스토리지 교체·디스크그룹 정리 작업의 다운타임을 크게 줄일 수 있습니다."]
]},
{ id:"space-9", title:"파티셔닝 기본과 관리", min:6, ref:[["VLDB and Partitioning Guide 19c", D + "vldbg/index.html"]], body:[
 ["p","파티셔닝은 큰 테이블을 기준 컬럼 값에 따라 여러 조각(파티션)으로 나눠 저장하는 기능입니다(Enterprise Edition의 Partitioning 옵션, 별도 라이선스)."],
 ["tbl",[["방식","나누는 기준","예"],["Range","값의 범위","주문일자 월별"],["Interval","Range + 자동 생성","새 달 데이터가 들어오면 파티션 자동 생성"],["List","값 목록","지역 코드별"],["Hash","해시값","고르게 분산 (경합 완화)"],["Composite","두 방식 조합","월별 Range + 고객 Hash"]]],
 ["code","sql","CREATE TABLE app.orders (\n  order_id NUMBER, order_dt DATE, cust_id NUMBER, amount NUMBER\n)\nPARTITION BY RANGE (order_dt) INTERVAL (NUMTOYMINTERVAL(1,'MONTH'))\n(PARTITION p_2026_01 VALUES LESS THAN (DATE '2026-02-01'));\n\n-- 파티션별 행 수·크기\nSELECT partition_name, high_value, num_rows FROM dba_tab_partitions\nWHERE  table_owner = 'APP' AND table_name = 'ORDERS' ORDER BY partition_position;\n\n-- 오래된 파티션 정리 (전역 인덱스 유지)\nALTER TABLE app.orders DROP PARTITION p_2026_01 UPDATE GLOBAL INDEXES;"],
 ["ul",["WHERE 조건에 파티션 키가 있으면 필요한 파티션만 읽습니다(파티션 프루닝). 실행계획의 Pstart/Pstop으로 확인합니다.","12c부터 DROP·TRUNCATE PARTITION의 UPDATE GLOBAL INDEXES는 인덱스 정리를 나중에(비동기) 처리해 빨리 끝납니다.","Interval로 자동 생성된 파티션 이름은 SYS_P로 시작합니다. 관리 편의를 위해 이름을 바꿔 두기도 합니다."]],
 ["tip","대용량 이력 테이블의 '오래된 데이터 삭제'를 DELETE로 하면 Undo·Redo가 엄청나게 생깁니다. 월 파티션이면 DROP/TRUNCATE PARTITION 한 번으로 끝납니다. 설계 단계에서 파티션 키를 '지우는 단위'로 잡는 것이 핵심입니다."]
]}],
 quiz: [
 { q: "V$UNDOSTAT에서 ORA-01555 발생 건수를 보여주는 컬럼은?", o: ["UNDOBLKS", "SSOLDERRCNT", "MAXQUERYLEN", "NOSPACEERRCNT"], a: 1, e: "SSOLDERRCNT는 snapshot too old(ORA-01555) 발생 건수입니다." },
 { q: "Undo 테이블스페이스에 RETENTION GUARANTEE를 걸었을 때의 위험은?", o: ["ORA-01555가 늘어난다", "Undo가 모자라면 DML이 실패할 수 있다", "Redo가 사라진다", "TEMP가 커진다"], a: 1, e: "보존 기간 안의 Undo를 덮어쓰지 않으므로 공간이 부족하면 새 트랜잭션이 Undo를 얻지 못해 실패합니다." },
 { q: "12c 이후 업무 중단 없이 데이터파일 위치를 바꾸는 명령은?", o: ["ALTER TABLESPACE ... RENAME DATAFILE", "ALTER DATABASE MOVE DATAFILE", "ALTER SYSTEM MOVE FILE", "RMAN SWITCH DATAFILE"], a: 1, e: "ALTER DATABASE MOVE DATAFILE은 온라인으로 데이터파일을 이동·이름 변경합니다." },
 { q: "WHERE 조건으로 필요한 파티션만 읽는 것을 무엇이라 하나?", o: ["파티션 프루닝", "파티션 익스체인지", "파티션 머지", "파티션 스플릿"], a: 0, e: "파티션 프루닝입니다. 실행계획의 Pstart·Pstop 컬럼으로 확인합니다." },
 { q: "Interval 파티셔닝의 특징은?", o: ["Hash 분산", "범위에 맞는 새 파티션이 데이터 입력 시 자동 생성", "List 값만 허용", "파티션 수 고정"], a: 1, e: "Range의 확장으로, 정의한 간격에 해당하는 새 파티션이 필요할 때 자동으로 만들어집니다." }
]},
/* ───── 3호선 백업·복구 ───── */
rman: { lessons: [
{ id:"rman-7", title:"컨트롤파일 기록 보존과 Recovery Catalog", min:5, ref:[["Database Reference 19c · CONTROL_FILE_RECORD_KEEP_TIME", D + "refrn/CONTROL_FILE_RECORD_KEEP_TIME.html"], ["Backup and Recovery User's Guide 19c", D + "bradv/index.html"]], body:[
 ["p","RMAN은 백업 기록(메타데이터)을 기본적으로 대상 DB의 컨트롤파일에 저장합니다. 컨트롤파일의 재사용 가능한 기록은 CONTROL_FILE_RECORD_KEEP_TIME(기본 7일)이 지나면 덮어써질 수 있습니다."],
 ["warn","보존정책이 'RECOVERY WINDOW OF 14 DAYS'인데 CONTROL_FILE_RECORD_KEEP_TIME이 7일이면, 카탈로그 없이 운영할 때 8~14일 전 백업 기록이 컨트롤파일에서 사라질 수 있습니다. KEEP_TIME은 보존 기간보다 넉넉하게(예: 보존 기간 + 7일) 잡습니다."],
 ["code","sql","SHOW PARAMETER control_file_record_keep_time\nALTER SYSTEM SET control_file_record_keep_time = 21 SCOPE=BOTH;"],
 ["p","**Recovery Catalog**는 백업 기록을 별도 DB에 보관하는 방식입니다. 여러 DB의 백업 이력을 한곳에서 보고, 컨트롤파일을 통째로 잃어도 기록이 남습니다."],
 ["code","bash","# 카탈로그 DB에서 (SQL*Plus)\n#   CREATE USER rco IDENTIFIED BY \"****\" DEFAULT TABLESPACE rcat QUOTA UNLIMITED ON rcat;\n#   GRANT RECOVERY_CATALOG_OWNER TO rco;\n\nrman catalog rco@catdb\nRMAN> CREATE CATALOG;\n\n# 대상 DB 등록\nrman target / catalog rco@catdb\nRMAN> REGISTER DATABASE;\nRMAN> RESYNC CATALOG;\nRMAN> LIST INCARNATION;"],
 ["tip","카탈로그 스키마 버전은 그 카탈로그에 붙는 RMAN 클라이언트 중 가장 높은 버전 이상이어야 합니다. 19c 클라이언트로 붙었는데 버전이 낮다는 메시지가 나오면 RMAN> UPGRADE CATALOG; 을 실행합니다."]
]},
{ id:"rman-8", title:"블록 손상 찾기와 블록 단위 복구", min:5, ref:[["Backup and Recovery User's Guide 19c · Performing Block Media Recovery", D + "bradv/index.html"]], body:[
 ["p","'ORA-01578: ORACLE data block corrupted'를 만나면 파일 전체가 아니라 손상된 블록만 복구할 수 있습니다(Block Media Recovery, Enterprise Edition 기능)."],
 ["code","rman","# STEP 1. 손상 블록 전수 확인 (파일을 만들지 않음)\nVALIDATE DATABASE;\n#   또는 특정 파일만\nVALIDATE DATAFILE 7;"],
 ["code","sql","-- STEP 2. 손상 목록과 영향받는 객체\nSELECT file#, block#, blocks, corruption_type FROM v$database_block_corruption;\n\nSELECT e.owner, e.segment_name, e.segment_type\nFROM   dba_extents e JOIN v$database_block_corruption c\n       ON e.file_id = c.file# AND c.block# BETWEEN e.block_id AND e.block_id + e.blocks - 1;"],
 ["code","rman","# STEP 3. 손상 블록만 복구 (백업 + 아카이브 필요, 파일은 온라인 유지)\nRECOVER CORRUPTION LIST;\n#   또는 특정 블록\nRECOVER DATAFILE 7 BLOCK 1234;"],
 ["ul",["손상된 것이 인덱스라면 블록 복구보다 인덱스 재생성(REBUILD ONLINE 또는 DROP/CREATE)이 간단합니다.","Active Data Guard 환경에서는 Primary·Standby가 서로의 정상 블록으로 손상 블록을 자동 복구합니다.","OS 레벨에서 파일을 검사할 때는 dbv file=<파일> blocksize=8192 를 씁니다(DB 접속 불필요)."]],
 ["tip","손상이 반복된다면 스토리지·HBA·멀티패스 같은 I/O 경로 문제일 가능성이 큽니다. 블록 복구 후에도 OS 로그와 스토리지 상태를 같이 확인하세요."]
]},
{ id:"rman-9", title:"RMAN DUPLICATE로 복제 DB 만들기", min:6, ref:[["Backup and Recovery User's Guide 19c · Duplicating a Database", D + "bradv/index.html"]], body:[
 ["p","운영 DB를 그대로 복제해 테스트·개발 DB를 만들거나 Standby를 구축할 때 씁니다. 12c부터 FROM ACTIVE DATABASE 방식은 원본에서 백업셋을 만들어 네트워크로 바로 넘깁니다."],
 ["p","◎ 복제 대상 서버 (AUX)"],
 ["code","bash","# STEP 1. 최소 pfile 과 패스워드 파일 (원본 orapw 복사, 이름만 변경)\necho \"db_name=DUP\" > $ORACLE_HOME/dbs/initDUP.ora\nscp srcsrv:$ORACLE_HOME/dbs/orapwPROD $ORACLE_HOME/dbs/orapwDUP\n\n# STEP 2. NOMOUNT 상태에서도 원격 접속되도록 리스너에 정적 등록 (listener.ora)\n#   SID_LIST_LISTENER = (SID_LIST = (SID_DESC = (GLOBAL_DBNAME = DUP)(ORACLE_HOME = /u01/app/oracle/product/19.0.0/dbhome_1)(SID_NAME = DUP)))\nlsnrctl reload\n\nexport ORACLE_SID=DUP\nsqlplus / as sysdba <<'EOF'\nSTARTUP NOMOUNT;\nEOF"],
 ["code","rman","# STEP 3. 원본(target)과 복제(auxiliary)에 동시에 접속해서 복제\nrman target sys@PROD auxiliary sys@DUP\n\nDUPLICATE TARGET DATABASE TO DUP\n  FROM ACTIVE DATABASE\n  USING COMPRESSED BACKUPSET\n  SPFILE\n    SET db_unique_name='DUP'\n    SET control_files='+DATAC1'\n    SET db_file_name_convert='+DATAC1/PROD','+DATAC1/DUP'\n    SET log_file_name_convert='+DATAC1/PROD','+DATAC1/DUP'\n  NOFILENAMECHECK;"],
 ["ul",["Standby를 만들 때는 DUPLICATE TARGET DATABASE FOR STANDBY FROM ACTIVE DATABASE 를 씁니다.","복제 중 원본에 네트워크·I/O 부하가 생기므로 업무 시간을 피합니다. 채널을 늘리거나 SECTION SIZE로 큰 파일을 나눠 병렬화할 수 있습니다.","복제된 DB는 새 DBID를 받습니다(FOR STANDBY 제외)."]],
 ["warn","NOFILENAMECHECK는 원본과 같은 경로 이름을 써도 막지 않는 옵션입니다. 같은 서버나 같은 스토리지에서 실행할 때 쓰면 원본 파일을 덮어쓸 위험이 있으니, 반드시 다른 서버·다른 경로일 때만 씁니다."]
]}],
 quiz: [
 { q: "CONTROL_FILE_RECORD_KEEP_TIME의 기본값은?", o: ["1일", "7일", "14일", "31일"], a: 1, e: "기본 7일입니다. RMAN 보존 기간보다 짧으면 카탈로그 없이 운영할 때 백업 기록이 사라질 수 있습니다." },
 { q: "RMAN VALIDATE가 찾아낸 손상 블록 목록이 기록되는 뷰는?", o: ["V$BACKUP_CORRUPTION", "V$DATABASE_BLOCK_CORRUPTION", "DBA_EXTENTS", "V$RECOVER_FILE"], a: 1, e: "VALIDATE 결과의 손상 블록은 V$DATABASE_BLOCK_CORRUPTION에 기록되고, RECOVER CORRUPTION LIST가 이 목록을 복구합니다." },
 { q: "원본을 내리지 않고 네트워크로 바로 복제 DB를 만드는 DUPLICATE 옵션은?", o: ["FROM ACTIVE DATABASE", "UNTIL TIME", "NOOPEN", "SKIP READONLY"], a: 0, e: "FROM ACTIVE DATABASE는 백업 파일 없이 원본에서 바로 복제합니다. 12c부터 USING BACKUPSET으로 더 효율적입니다." },
 { q: "NOMOUNT 상태의 복제 대상 인스턴스에 원격 접속하려면 필요한 것은?", o: ["리스너에 정적 등록(SID_LIST_LISTENER)", "DB Link", "TDE 키스토어", "Data Guard 브로커"], a: 0, e: "NOMOUNT에서는 LREG가 서비스를 동적 등록하지 못하므로 listener.ora에 정적 등록이 필요합니다." }
]},
/* ───── 4호선 RAC·Grid ───── */
rac: { lessons: [
{ id:"rac-8", title:"Clusterware 로그 위치와 읽는 순서", min:5, ref:[["Clusterware Administration 19c · Troubleshooting Oracle Clusterware", D + "cwadd/index.html"]], body:[
 ["p","12.1.0.2 이후 Clusterware 로그는 ADR 구조로 바뀌었습니다. grid 계정의 ORACLE_BASE 아래에 있습니다."],
 ["code","bash","# grid 계정, 노드별 (◎ 문제가 생긴 노드부터)\ncd $ORACLE_BASE/diag/crs/$(hostname -s)/crs/trace\n\nless alert.log          # CRS 알림 로그 — 가장 먼저\nless ocssd.trc          # 노드 멤버십·heartbeat·Eviction\nless crsd.trc           # 리소스 기동·정지\nless ohasd.trc          # 하위 스택 기동 문제\nls -lt *oraagent*.trc   # 리소스별 에이전트 (DB·리스너 기동 실패 원인)"],
 ["tbl",[["메시지","뜻"],["CRS-1612 / 1611 / 1610","노드 간 네트워크 heartbeat가 misscount의 50% / 75% / 90% 동안 끊김 — Eviction 직전 경고"],["CRS-1606","Voting Disk 접근 문제"],["CRS-1607","노드가 클러스터에서 축출(Evicted)됨"]]],
 ["code","bash","# CSS 타임아웃 값\n/u01/app/19.0.0/grid/bin/crsctl get css misscount     # 네트워크 heartbeat 허용 시간(초)\n/u01/app/19.0.0/grid/bin/crsctl get css disktimeout   # Voting Disk 허용 시간(초)\n\n# 장애 시점 진단 자료 한 번에 수집 (AHF)\ntfactl diagcollect -last 2h"],
 ["tip","Eviction 원인 분석 순서: ① 축출된 노드의 ocssd.trc에서 '마지막으로 무엇을 못 받았나' → ② 살아남은 노드의 ocssd.trc → ③ 그 시점 OSWatcher(CPU·메모리·네트워크) → ④ /var/log/messages. 시간대(UTC/KST)를 맞춰 보는 것이 중요합니다."]
]},
{ id:"rac-9", title:"TAF·FAN·Application Continuity", min:5, ref:[["RAC Administration 19c · Workload Management with Dynamic Database Services", D + "racad/index.html"]], body:[
 ["p","인스턴스가 죽었을 때 애플리케이션이 얼마나 '티 안 나게' 넘어가는지는 서비스 설정과 드라이버에 달려 있습니다."],
 ["tbl",[["기술","하는 일","조건"],["TAF","끊기면 다른 인스턴스로 다시 접속하고, 진행 중이던 SELECT를 이어서 읽음","OCI 기반 클라이언트, DML은 재실행 안 됨"],["FAN","인스턴스·서비스 상태 변화를 ONS 이벤트로 즉시 알려 줌 — 커넥션 풀이 죽은 연결을 바로 버림","풀(UCP 등)이 FAN을 구독해야 함"],["Application Continuity (AC)","진행 중이던 트랜잭션을 다른 인스턴스에서 재실행(replay)","JDBC replay 드라이버·OCI 등, 서비스 FAILOVER_TYPE=TRANSACTION"],["TAC (19c)","AC를 애플리케이션 수정 없이 자동으로","FAILOVER_TYPE=AUTO"]]],
 ["code","bash","# oracle 계정 — 서비스에 AC 설정 예\nsrvctl modify service -db DBBIG -service OLTP_SVC \\\n  -failovertype TRANSACTION -commit_outcome TRUE \\\n  -failoverretry 30 -failoverdelay 10 -replay_init_time 600\n\nsrvctl config service -db DBBIG -service OLTP_SVC"],
 ["tip","장애 테스트에서 '서비스는 넘어갔는데 애플리케이션은 몇 분간 에러'가 나면, 대부분 FAN을 받지 못해 커넥션 풀이 죽은 연결을 계속 쓰는 경우입니다. 드라이버·풀 설정(ONS 포트 6200 방화벽 포함)을 먼저 확인하세요."]
]}],
 quiz: [
 { q: "19c Clusterware 알림 로그(alert.log)의 위치는?", o: ["$GRID_HOME/log/<host>/alert<host>.log", "$ORACLE_BASE/diag/crs/<host>/crs/trace/alert.log", "/var/log/crs.log", "$ORACLE_HOME/rdbms/log"], a: 1, e: "12.1.0.2 이후 ADR 구조로 grid 계정의 ORACLE_BASE/diag/crs/<호스트>/crs/trace 아래에 있습니다." },
 { q: "노드 Eviction의 직접 원인을 볼 때 가장 먼저 확인할 트레이스는?", o: ["crsd.trc", "ocssd.trc", "evmd.trc", "listener.log"], a: 1, e: "노드 멤버십과 heartbeat는 CSS(ocssd)가 관리하므로 ocssd.trc가 핵심입니다." },
 { q: "CRS-1610 메시지가 뜻하는 것은?", o: ["네트워크 heartbeat가 misscount의 90% 동안 끊김", "Voting Disk 추가", "리소스 정상 기동", "OCR 백업 완료"], a: 0, e: "1612(50%) → 1611(75%) → 1610(90%) 순으로 Eviction에 가까워짐을 경고합니다." },
 { q: "진행 중이던 트랜잭션까지 다른 인스턴스에서 재실행해 주는 기술은?", o: ["TAF", "FAN", "Application Continuity", "SCAN"], a: 2, e: "TAF는 SELECT만 이어 주고, AC는 트랜잭션을 replay합니다. 19c TAC는 이를 자동화합니다." }
]},
/* ───── 5호선 ASM ───── */
asm: { lessons: [
{ id:"asm-6", title:"ASM 디스크 장치 관리: udev·ASMLib·AFD", min:5, ref:[["ASM Administrator's Guide 19c", D + "ostmg/index.html"]], body:[
 ["p","ASM이 쓸 디스크는 재부팅 후에도 같은 이름·같은 권한(grid:asmadmin, 0660)으로 보여야 합니다. 방법은 세 가지입니다."],
 ["tbl",[["방법","특징"],["udev 규칙","OS 기본 기능. 디스크 고유 ID(WWID 등)로 이름·권한 고정. 추가 패키지 불필요"],["ASMLib (oracleasm)","oracleasm createdisk로 라벨을 붙여 관리. Linux 버전에 맞는 ASMLib 버전 확인 필요"],["AFD (ASM Filter Driver)","라벨 관리 + 오라클 외 프로그램의 쓰기를 막아(필터링) 실수로 덮어쓰는 사고 방지. 커널 버전 지원 여부 확인 필요"]]],
 ["code","bash","# udev 예 (root) — /etc/udev/rules.d/99-oracle-asmdevices.rules\n#  KERNEL==\"sd*\", ENV{ID_SERIAL}==\"36000c29xxxxxxxx\", SYMLINK+=\"oracleasm/DATA01\", OWNER=\"grid\", GROUP=\"asmadmin\", MODE=\"0660\"\nudevadm control --reload-rules && udevadm trigger\nls -l /dev/oracleasm/\n\n# ASMLib\noracleasm createdisk DATA01 /dev/sdc1\noracleasm listdisks\n\n# AFD (grid 계정)\nasmcmd afd_state\nasmcmd afd_lsdsk"],
 ["warn","멀티패스 환경에서는 개별 경로 장치(/dev/sdX)가 아니라 멀티패스 장치(/dev/mapper/...)에 규칙을 걸어야 합니다. 경로 하나가 끊기면 디스크가 사라진 것처럼 보이는 장애가 납니다."]
]},
{ id:"asm-7", title:"ACFS 기본", min:4, ref:[["ASM Administrator's Guide 19c · Oracle ACFS", D + "ostmg/index.html"], ["MOS 1369107.1 · ACFS Support On OS Platforms", MOS + "1369107.1"]], body:[
 ["p","ACFS는 ASM 디스크그룹 위에 만드는 범용 클러스터 파일시스템입니다. 모든 노드에서 같은 경로로 보이므로 공유 파일(GoldenGate trail, 배치 입출력 파일, 공용 스크립트)에 씁니다."],
 ["code","bash","# grid 계정 — STEP 1. ADVM 볼륨 생성\nasmcmd volcreate -G DATAC1 -s 100G acfsvol1\nasmcmd volinfo -G DATAC1 acfsvol1          # Volume Device: /dev/asm/acfsvol1-123 확인\n\n# root — STEP 2. 파일시스템 생성·클러스터 리소스 등록·마운트\nmkfs -t acfs /dev/asm/acfsvol1-123\nmkdir -p /acfs/share\n/u01/app/19.0.0/grid/bin/srvctl add filesystem -device /dev/asm/acfsvol1-123 -path /acfs/share -user oracle\n/u01/app/19.0.0/grid/bin/srvctl start filesystem -device /dev/asm/acfsvol1-123\n\n# 확인·확장\n/sbin/acfsutil info fs /acfs/share\n/sbin/acfsutil size +50G /acfs/share"],
 ["tip","ACFS는 커널 모듈이라 OS 커널을 올리면 그 커널을 지원하는 GI RU가 필요할 수 있습니다. OS 패치 전에 MOS 1369107.1(ACFS 지원 매트릭스)을 확인하는 것을 체크리스트에 넣으세요."]
]}],
 quiz: [
 { q: "오라클 외 프로그램이 ASM 디스크에 쓰는 것을 막아 주는 장치 관리 방식은?", o: ["udev", "ASMLib", "AFD (ASM Filter Driver)", "LVM"], a: 2, e: "AFD는 라벨 관리와 함께 비(非)오라클 I/O를 필터링해 실수로 덮어쓰는 사고를 막습니다." },
 { q: "ASM 디스크로 쓸 장치의 권장 소유자·권한은?", o: ["root:root 0644", "grid:asmadmin 0660", "oracle:dba 0777", "grid:oinstall 0600"], a: 1, e: "일반적으로 grid:asmadmin, 0660으로 ASM 인스턴스가 읽고 쓸 수 있게 합니다(환경에 따라 그룹 구성은 다를 수 있음)." },
 { q: "ACFS 볼륨을 만드는 asmcmd 명령은?", o: ["asmcmd mkdg", "asmcmd volcreate", "asmcmd cp", "asmcmd lsdsk"], a: 1, e: "asmcmd volcreate로 ADVM 볼륨을 만들고, mkfs -t acfs로 파일시스템을 만듭니다." }
]},
/* ───── 6호선 패치 ───── */
patch: { lessons: [
{ id:"patch-8", title:"패치 후 점검과 롤백 판단", min:5, ref:[["Database Patch Maintenance 19c", D + "dbptc/index.html"]], body:[
 ["p","◎ 모든 노드에서 같은 점검을 하고 결과를 작업 기록에 남깁니다."],
 ["code","bash","# STEP 1. 바이너리 패치 상태 (grid, oracle 각 홈)\n/u01/app/19.0.0/grid/OPatch/opatch lspatches\n/u01/app/oracle/product/19.0.0/dbhome_1/OPatch/opatch lspatches\n\n# STEP 2. 클러스터 패치 레벨이 노드 간 일치하는지\n/u01/app/19.0.0/grid/bin/crsctl query crs activeversion -f\n/u01/app/19.0.0/grid/bin/crsctl query crs softwarepatch\n\n# STEP 3. 리소스 상태\n/u01/app/19.0.0/grid/bin/crsctl stat res -t"],
 ["code","sql","-- STEP 4. SQL 패치 적용 결과 (PDB 포함)\nSELECT con_id, patch_id, action, status, action_time FROM cdb_registry_sqlpatch ORDER BY action_time DESC;\n\n-- STEP 5. 패치 전과 비교할 INVALID 객체\nSELECT owner, object_type, COUNT(*) FROM dba_objects WHERE status = 'INVALID' GROUP BY owner, object_type;\n\n-- STEP 6. 컴포넌트 상태\nSELECT comp_id, version_full, status FROM dba_registry ORDER BY comp_id;"],
 ["ul",["alert 로그(DB·ASM·CRS)에서 작업 시간 이후 ORA-·CRS- 에러가 없는지 확인합니다.","애플리케이션 담당자에게 서비스 접속·주요 화면 확인을 요청하고, 확인 시각을 기록합니다.","롤백 판단 기준을 미리 정해 둡니다: 예) 인스턴스 기동 실패, datapatch 재실행해도 실패, 핵심 서비스 미기동 30분 지속."]],
 ["tip","패치 전후로 같은 점검 SQL을 그대로 돌려 결과를 나란히 붙여 두면, 고객 보고서와 다음 작업 계획서에 그대로 재사용할 수 있습니다."]
]},
{ id:"patch-9", title:"OJVM 패치 이해", min:4, ref:[["MOS 1929745.1 · Oracle Recommended Patches — Oracle JavaVM Component", MOS + "1929745.1"], ["MOS 2217053.1 · RAC Rolling Install Process for the Oracle JavaVM RU", MOS + "2217053.1"]], body:[
 ["p","OJVM(Oracle JavaVM) 패치는 DB 안의 Java 엔진 보안 패치로, 분기마다 DB RU와 함께 나옵니다. RU와 OJVM을 한 번에 받을 수 있는 'Combo' 패치도 제공됩니다."],
 ["ul",["RU는 RAC 롤링 적용이 되지만, OJVM은 README의 'RAC Rolling Installable' 항목과 MOS 2217053.1을 반드시 확인해야 합니다. 조건에 따라 DB 다운타임 계획이 필요할 수 있습니다.","OJVM도 바이너리 적용(opatch apply) 후 datapatch로 SQL 부분을 반영합니다.","DB에 JAVAVM 컴포넌트가 설치되어 있는지 확인하고 계획을 세웁니다."]],
 ["code","sql","SELECT comp_id, comp_name, version_full, status FROM dba_registry WHERE comp_id IN ('JAVAVM','CATJAVA','XML');\nSELECT patch_id, description, status FROM dba_registry_sqlpatch WHERE description LIKE '%JAVAVM%' OR description LIKE '%OJVM%';"],
 ["tip","보안 진단에서 'OJVM 패치 미적용'이 지적되는 경우가 많습니다. 작업계획서에는 RU와 OJVM을 각각 적었는지, 다운타임이 필요한지 따로 표시하세요."]
]}],
 quiz: [
 { q: "클러스터 전체의 GI 패치 레벨 상태를 확인하는 명령은?", o: ["crsctl query crs activeversion -f", "srvctl status database", "olsnodes -n", "lsnrctl status"], a: 0, e: "activeversion -f는 활성 버전과 패치 레벨(rolling patch 상태 포함)을 보여줍니다." },
 { q: "CDB의 모든 PDB에 SQL 패치가 반영됐는지 볼 뷰는?", o: ["DBA_REGISTRY_SQLPATCH", "CDB_REGISTRY_SQLPATCH", "V$PATCHES", "DBA_PATCH_HISTORY"], a: 1, e: "CDB_ 뷰는 CON_ID별로 모든 컨테이너의 결과를 보여줍니다." },
 { q: "OJVM 패치를 RAC에 적용할 때 꼭 확인할 것은?", o: ["README의 RAC Rolling Installable 항목과 관련 MOS 문서", "SGA 크기", "TEMP 크기", "리스너 포트"], a: 0, e: "OJVM은 RU와 롤링 적용 조건이 달라 다운타임 계획이 필요할 수 있습니다." }
]},
/* ───── 7호선 성능튜닝 ───── */
perf: { lessons: [
{ id:"perf-8", title:"SQL Monitor로 오래 걸리는 SQL 보기", min:5, ref:[["SQL Tuning Guide 19c · Monitoring Database Operations", D + "tgsql/index.html"]], body:[
 ["p","SQL Monitor는 실행 중인 SQL이 실행계획의 어느 단계에서 시간을 쓰고 있는지 실시간으로 보여줍니다. 병렬 SQL이거나, 한 번 실행에 CPU·I/O 시간이 5초를 넘으면 자동으로 모니터링됩니다(Tuning Pack 라이선스)."],
 ["code","sql","-- 지금·최근 모니터링된 SQL\nSELECT sql_id, status, username, ROUND(elapsed_time/1e6) AS sec, sql_text\nFROM   v$sql_monitor ORDER BY sql_exec_start DESC FETCH FIRST 20 ROWS ONLY;\n\n-- 텍스트 리포트\nSET LONG 1000000 LONGCHUNKSIZE 1000000 LINESIZE 250 PAGESIZE 0\nSELECT DBMS_SQLTUNE.REPORT_SQL_MONITOR(sql_id => '&sql_id', type => 'TEXT') FROM dual;\n\n-- 5초가 안 되는 SQL도 강제로 보려면 힌트\nSELECT /*+ MONITOR */ COUNT(*) FROM app.orders WHERE order_dt >= SYSDATE - 30;"],
 ["ul",["리포트의 Activity(%) 컬럼이 큰 줄이 실제로 시간을 쓴 단계입니다.","Estimated Rows와 Actual Rows의 차이가 크면 통계·카디널리티 문제를 의심합니다.","type => 'ACTIVE'로 받은 HTML은 브라우저에서 그래프로 보여서 SR 첨부에도 좋습니다."]],
 ["tip","\"지금 이 배치가 어디까지 왔나요?\"라는 질문에는 SQL Monitor 리포트의 진행 상황(Progress)이 가장 정확한 답입니다."]
]},
{ id:"perf-9", title:"바인드 변수·하드 파싱·커서 공유", min:5, ref:[["SQL Tuning Guide 19c · Improving Real-World Performance Through Cursor Sharing", D + "tgsql/index.html"], ["Database Reference 19c · CURSOR_SHARING", D + "refrn/CURSOR_SHARING.html"]], body:[
 ["p","값만 다른 SQL을 리터럴로 계속 보내면(WHERE id = 101, WHERE id = 102 …) 매번 하드 파싱이 일어나 CPU와 Shared Pool을 낭비합니다. 바인드 변수(WHERE id = :1)를 쓰면 실행계획을 재사용합니다."],
 ["code","sql","-- 리터럴만 다르고 모양이 같은 SQL 찾기 (FORCE_MATCHING_SIGNATURE가 같음)\nSELECT force_matching_signature, COUNT(*) AS cnt, MIN(sql_id) AS sample_sql_id\nFROM   v$sql\nWHERE  force_matching_signature > 0\nGROUP  BY force_matching_signature\nHAVING COUNT(*) > 50\nORDER  BY cnt DESC FETCH FIRST 10 ROWS ONLY;\n\n-- 하드 파싱 추세\nSELECT name, value FROM v$sysstat WHERE name IN ('parse count (total)','parse count (hard)','execute count');"],
 ["ul",["CURSOR_SHARING 기본값은 EXACT입니다. FORCE로 바꾸면 리터럴을 시스템이 바인드로 바꿔 주지만, 실행계획이 바뀔 수 있어 응급 처치로만 신중히 씁니다.","바인드 값에 따라 좋은 계획이 다른 경우(데이터 쏠림), 11g부터 적응형 커서 공유가 값에 맞는 계획을 따로 만듭니다(V$SQL의 IS_BIND_SENSITIVE·IS_BIND_AWARE)."]],
 ["tip","ORA-04031과 'library cache' 계열 대기가 같이 보이면 위 쿼리로 리터럴 SQL부터 찾아 애플리케이션 팀에 전달하세요. DB 파라미터로 버티는 것보다 근본적인 해결입니다."]
]},
{ id:"perf-10", title:"실행계획의 액세스 경로 읽기", min:5, ref:[["SQL Tuning Guide 19c · Optimizer Access Paths", D + "tgsql/optimizer-access-paths.html"]], body:[
 ["tbl",[["액세스 경로","언제","메모"],["TABLE ACCESS FULL","대부분의 행을 읽거나 적절한 인덱스가 없을 때","큰 테이블은 direct path read로 버퍼 캐시를 거치지 않을 수 있음 (Exadata는 STORAGE FULL → Smart Scan)"],["INDEX UNIQUE SCAN","PK·유니크 키로 한 건","가장 효율적"],["INDEX RANGE SCAN","범위·비유니크 조건","정렬된 순서로 읽음"],["INDEX FULL SCAN","인덱스 전체를 순서대로","ORDER BY를 대신할 때"],["INDEX FAST FULL SCAN","인덱스 전체를 멀티블록으로","필요한 컬럼이 모두 인덱스에 있을 때"],["INDEX SKIP SCAN","선두 컬럼 조건 없이 다음 컬럼으로","선두 컬럼 값 종류가 적을 때만 유리"]]],
 ["p","인덱스로 읽어도 느린 대표 원인은 **클러스터링 팩터**입니다. 인덱스 순서와 테이블 행의 물리적 순서가 뒤죽박죽이면, 인덱스로 찾은 행마다 다른 테이블 블록을 읽게 됩니다."],
 ["code","sql","SELECT i.index_name, i.clustering_factor, t.blocks, t.num_rows\nFROM   dba_indexes i JOIN dba_tables t ON t.owner = i.table_owner AND t.table_name = i.table_name\nWHERE  i.table_owner = 'APP' AND i.table_name = 'ORDERS';\n-- clustering_factor가 blocks에 가까우면 좋음, num_rows에 가까우면 나쁨"],
 ["tip","\"인덱스를 만들었는데 옵티마이저가 안 탄다\"면 무조건 힌트를 넣기 전에, 조건절 컬럼에 함수·형변환이 걸려 있지 않은지(WHERE TO_CHAR(order_dt,...) = ... 같은)부터 확인하세요."]
]}],
 quiz: [
 { q: "SQL Monitor가 자동으로 모니터링하는 조건은?", o: ["모든 SQL", "병렬 실행이거나 한 번 실행의 CPU·I/O 시간이 5초 이상", "DDL만", "SYS 사용자 SQL만"], a: 1, e: "병렬 SQL 또는 5초 이상 CPU·I/O를 쓴 실행이 자동 대상입니다. MONITOR 힌트로 강제할 수 있습니다." },
 { q: "리터럴만 다르고 모양이 같은 SQL을 묶어 찾을 때 쓰는 V$SQL 컬럼은?", o: ["SQL_ID", "PLAN_HASH_VALUE", "FORCE_MATCHING_SIGNATURE", "CHILD_NUMBER"], a: 2, e: "FORCE_MATCHING_SIGNATURE는 리터럴을 바인드로 바꿨다고 가정했을 때 같은 SQL이면 같은 값입니다." },
 { q: "CURSOR_SHARING의 기본값은?", o: ["FORCE", "SIMILAR", "EXACT", "AUTO"], a: 2, e: "기본은 EXACT입니다. SIMILAR는 deprecated되었습니다." },
 { q: "인덱스 순서와 테이블 행의 물리적 순서가 얼마나 비슷한지 나타내는 값은?", o: ["BLEVEL", "CLUSTERING_FACTOR", "DISTINCT_KEYS", "LEAF_BLOCKS"], a: 1, e: "CLUSTERING_FACTOR가 테이블 블록 수에 가까우면 좋고, 행 수에 가까우면 인덱스 경유 읽기가 비쌉니다." }
]},
/* ───── 8호선 보안·계정 ───── */
sec: { lessons: [
{ id:"sec-6", title:"TDE 기본: 키스토어와 테이블스페이스 암호화", min:6, ref:[["Advanced Security Guide 19c · Transparent Data Encryption", D + "asoag/index.html"]], body:[
 ["p","TDE(Transparent Data Encryption)는 디스크에 저장되는 데이터를 암호화합니다. 애플리케이션은 바꿀 필요가 없습니다. Advanced Security 옵션 라이선스가 필요합니다."],
 ["code","sql","-- STEP 1. 키스토어 위치 지정 (19c 권장 방식, 정적 파라미터 → 재기동)\nALTER SYSTEM SET wallet_root = '/u01/app/oracle/admin/DBBIG/wallet' SCOPE=SPFILE SID='*';\n-- 재기동 후\nALTER SYSTEM SET tde_configuration = 'KEYSTORE_CONFIGURATION=FILE' SCOPE=BOTH SID='*';\n\n-- STEP 2. 키스토어 생성·열기·마스터 키 설정 (CDB 루트에서)\nADMINISTER KEY MANAGEMENT CREATE KEYSTORE IDENTIFIED BY \"****\";\nADMINISTER KEY MANAGEMENT SET KEYSTORE OPEN IDENTIFIED BY \"****\" CONTAINER=ALL;\nADMINISTER KEY MANAGEMENT SET KEY IDENTIFIED BY \"****\" WITH BACKUP CONTAINER=ALL;\n\n-- STEP 3. 재기동 때 자동으로 열리게 (auto-login)\nADMINISTER KEY MANAGEMENT CREATE AUTO_LOGIN KEYSTORE FROM KEYSTORE IDENTIFIED BY \"****\";\n\n-- STEP 4. 암호화 테이블스페이스\nCREATE TABLESPACE secure_ts DATAFILE '+DATAC1' SIZE 10G ENCRYPTION USING 'AES256' ENCRYPT;\n-- 기존 테이블스페이스를 온라인으로 암호화 (12.2+, 임시로 추가 공간 필요)\nALTER TABLESPACE users ENCRYPTION ONLINE USING 'AES256' ENCRYPT;\n\nSELECT con_id, wrl_type, status, wallet_type FROM v$encryption_wallet;\nSELECT ts#, encryptionalg, status FROM v$encrypted_tablespaces;"],
 ["warn","키스토어(wallet)를 잃어버리면 암호화된 데이터는 영영 읽을 수 없습니다. 키를 바꿀 때마다(WITH BACKUP) 키스토어를 별도 안전한 곳에 백업하고, RAC는 모든 노드가 같은 키스토어를 보도록(공유 경로 또는 복사) 구성합니다."],
 ["tip","Exadata에서는 TDE로 암호화된 데이터도 셀에서 복호화해 Smart Scan을 처리하므로, 암호화 때문에 오프로드 이점을 잃지 않습니다."]
]},
{ id:"sec-7", title:"비밀번호 검증 함수와 계정 잠금 대응", min:5, ref:[["Security Guide 19c · Managing Passwords", D + "dbseg/index.html"]], body:[
 ["code","sql","-- 오라클 제공 검증 함수 만들기 (ORA12C_VERIFY_FUNCTION 등 생성)\n@?/rdbms/admin/utlpwdmg.sql\n\n-- 프로파일에 적용\nALTER PROFILE app_profile LIMIT PASSWORD_VERIFY_FUNCTION ora12c_verify_function;\n\n-- 잠긴 계정과 잠긴 시각\nSELECT username, account_status, lock_date, profile FROM dba_users WHERE account_status LIKE '%LOCKED%';\n\n-- 누가 틀린 비밀번호로 시도했나 (Unified Auditing, ORA-01017)\nSELECT event_timestamp, dbusername, userhost, os_username, return_code\nFROM   unified_audit_trail\nWHERE  action_name = 'LOGON' AND return_code = 1017\nORDER  BY event_timestamp DESC FETCH FIRST 20 ROWS ONLY;\n\nALTER USER app_user ACCOUNT UNLOCK;"],
 ["ul",["계정이 반복해서 잠기면 '옛 비밀번호로 계속 접속을 시도하는 서버'가 있는 경우가 대부분입니다. 감사 기록의 USERHOST와 리스너 로그로 출발지를 찾습니다.","19c(19.12 RU 이후)에는 PASSWORD_ROLLOVER_TIME으로 일정 기간 옛 비밀번호와 새 비밀번호를 함께 허용하는 점진적 교체 기능이 있습니다. 여러 애플리케이션 서버의 비밀번호를 순차적으로 바꿀 때 유용합니다."]],
 ["tip","잠금 해제만 하고 원인을 그대로 두면 몇 분 뒤 다시 잠깁니다. 해제 전에 출발지 IP를 먼저 찾아 담당자에게 알리는 순서로 대응하세요."]
]}],
 quiz: [
 { q: "19c에서 TDE 키스토어 위치를 지정하는 권장 파라미터는?", o: ["ENCRYPTION_WALLET_LOCATION (sqlnet.ora)", "WALLET_ROOT", "DB_CREATE_FILE_DEST", "AUDIT_FILE_DEST"], a: 1, e: "19c는 WALLET_ROOT와 TDE_CONFIGURATION 사용을 권장합니다. sqlnet.ora의 ENCRYPTION_WALLET_LOCATION은 deprecated입니다." },
 { q: "TDE 키스토어를 잃어버리면?", o: ["DB를 재기동하면 새로 만들어진다", "암호화된 데이터를 읽을 수 없게 된다", "RMAN으로 키를 되살릴 수 있다", "아무 영향 없다"], a: 1, e: "마스터 키가 없으면 복호화가 불가능합니다. 키 변경 시마다 키스토어를 백업해야 합니다." },
 { q: "틀린 비밀번호 로그인 실패를 뜻하는 에러 코드는?", o: ["ORA-28000", "ORA-01017", "ORA-28001", "ORA-01045"], a: 1, e: "ORA-01017은 invalid username/password입니다. ORA-28000은 계정 잠김, ORA-28001은 비밀번호 만료입니다." },
 { q: "오라클 제공 비밀번호 검증 함수를 만드는 스크립트는?", o: ["utlrp.sql", "utlpwdmg.sql", "catalog.sql", "dbmsstat.sql"], a: 1, e: "?/rdbms/admin/utlpwdmg.sql을 실행하면 ORA12C_VERIFY_FUNCTION 등이 생성됩니다." }
]},
/* ───── 9호선 Data Guard ───── */
dg: { lessons: [
{ id:"dg-6", title:"Snapshot Standby로 테스트하기", min:5, ref:[["Data Guard Concepts and Administration 19c · Managing a Snapshot Standby", D + "sbydb/index.html"]], body:[
 ["p","Snapshot Standby는 Physical Standby를 잠시 '읽기·쓰기 가능한 테스트 DB'로 바꾸는 기능입니다. 테스트가 끝나면 변경을 모두 버리고 다시 Standby로 돌아갑니다. 내부적으로 보장 복원 지점을 쓰므로 FRA가 필요합니다."],
 ["code","sql","-- Standby에서 (MRP 중지, MOUNT 상태)\nALTER DATABASE RECOVER MANAGED STANDBY DATABASE CANCEL;\nALTER DATABASE CONVERT TO SNAPSHOT STANDBY;\nALTER DATABASE OPEN;\nSELECT database_role, open_mode FROM v$database;   -- SNAPSHOT STANDBY / READ WRITE\n\n-- (패치 검증·애플리케이션 테스트 수행)\n\n-- 원래대로\nSHUTDOWN IMMEDIATE;\nSTARTUP MOUNT;\nALTER DATABASE CONVERT TO PHYSICAL STANDBY;\n-- 재기동 후 MRP 시작\nALTER DATABASE RECOVER MANAGED STANDBY DATABASE DISCONNECT;"],
 ["code","bash","# 브로커를 쓰면 한 줄\ndgmgrl sys@DBBIG\nDGMGRL> CONVERT DATABASE 'DBBIG_STBY' TO SNAPSHOT STANDBY;\nDGMGRL> CONVERT DATABASE 'DBBIG_STBY' TO PHYSICAL STANDBY;"],
 ["warn","Snapshot Standby 동안에도 Primary의 Redo는 계속 받지만 적용하지 않습니다. 그 사이 Primary 장애가 나면 쌓인 Redo를 다 적용해야 해서 Failover가 오래 걸립니다. 테스트 시간을 짧게 잡으세요."]
]},
{ id:"dg-7", title:"Active Data Guard 활용", min:4, ref:[["Data Guard Concepts and Administration 19c", D + "sbydb/index.html"]], body:[
 ["p","Active Data Guard(별도 라이선스)는 Standby를 읽기 전용으로 열어 둔 채 Redo를 계속 적용합니다. 조회·리포트 업무를 Standby로 돌려 Primary 부하를 줄입니다."],
 ["code","sql","-- Standby에서\nALTER DATABASE RECOVER MANAGED STANDBY DATABASE CANCEL;\nALTER DATABASE OPEN READ ONLY;\nALTER DATABASE RECOVER MANAGED STANDBY DATABASE DISCONNECT;\nSELECT open_mode FROM v$database;   -- READ ONLY WITH APPLY"],
 ["ul",["Primary·Standby 중 한쪽에서 손상 블록을 읽으면, 다른 쪽의 정상 블록으로 자동 복구합니다(Automatic Block Media Recovery).","19c부터 ADG_REDIRECT_DML을 켜면 Standby에 들어온 가끔의 DML을 Primary로 넘겨 처리할 수 있습니다.","Standby에서 Block Change Tracking을 켜고 증분 백업을 받아 Primary 백업 부하를 덜 수 있습니다."]],
 ["warn","Standby를 READ ONLY로 연 상태에서 Redo 적용(MRP)을 돌리는 것 자체가 Active Data Guard 사용입니다. 라이선스가 없으면 Standby는 MOUNT 상태로만 적용해야 합니다."]
]}],
 quiz: [
 { q: "Snapshot Standby를 Physical Standby로 되돌리면 테스트 중 변경은?", o: ["Primary로 전송된다", "모두 버려진다", "아카이브로 남는다", "PDB로 보관된다"], a: 1, e: "내부 보장 복원 지점으로 되감은 뒤 Standby로 돌아가므로 테스트 중 변경은 모두 버려집니다." },
 { q: "Active Data Guard 사용 중인 Standby의 OPEN_MODE는?", o: ["MOUNTED", "READ WRITE", "READ ONLY WITH APPLY", "MIGRATE"], a: 2, e: "읽기 전용으로 열린 채 Redo를 적용하면 READ ONLY WITH APPLY로 표시됩니다." },
 { q: "Snapshot Standby 기간이 길어질 때의 위험은?", o: ["Primary 성능 저하", "Primary 장애 시 Failover 시간이 길어짐", "Redo 전송 중단", "아카이브 모드 해제"], a: 1, e: "Redo를 받기만 하고 적용하지 않으므로, Failover 시 쌓인 Redo를 모두 적용해야 합니다." }
]},
/* ───── 10호선 Exadata ───── */
exa: { lessons: [
{ id:"exa-5", title:"EXAchk로 헬스체크", min:4, ref:[["MOS 2550798.1 · Autonomous Health Framework (AHF) — TFA·ORAchk/EXAchk", MOS + "2550798.1"]], body:[
 ["p","EXAchk는 Exadata 전체(DB 서버·셀·스위치·GI·DB 설정)를 오라클 모범 사례와 비교해 점검하는 도구로, AHF에 포함되어 있습니다. 패치·변경 작업 전후에 돌리는 것이 표준입니다."],
 ["code","bash","# root, 1번 DB 서버에서 (AHF 설치 경로 예)\n/opt/oracle.ahf/bin/exachk -h          # 옵션 확인\n/opt/oracle.ahf/bin/exachk             # 전체 점검 (시간이 걸림)\n\n# 결과: 출력 디렉터리의 zip 안 HTML 리포트\n#  - Health Score, FAIL / WARNING / INFO 항목, 권고 조치와 MOS 문서 번호"],
 ["ul",["FAIL 항목부터 확인하고, 이미 알고 있는 예외(고객 정책)는 사유를 기록해 둡니다.","패치 전 결과와 패치 후 결과를 비교하면 작업으로 새로 생긴 문제를 빨리 찾을 수 있습니다.","AHF 자체도 주기적으로 최신 버전으로 업데이트해야 점검 항목이 최신화됩니다."]],
 ["tip","고객 정기 점검 보고서에 EXAchk Health Score 추이를 분기별로 넣으면 '관리가 잘 되고 있다'는 근거를 숫자로 보여줄 수 있습니다."]
]},
{ id:"exa-6", title:"Flash Cache·Flash Log·IORM 상태 확인", min:4, ref:[["Exadata System Software User's Guide", "https://docs.oracle.com/en/engineered-systems/exadata-database-machine/sagug/index.html"]], body:[
 ["code","bash","# celladmin 또는 root, 셀에서 (dcli로 전체 셀에 한 번에 돌려도 됨)\ncellcli -e \"list cell attributes name, flashCacheMode\"\ncellcli -e \"list flashcache detail\"        # 크기·상태\ncellcli -e \"list flashlog detail\"          # Exadata Smart Flash Log (Redo 쓰기 가속)\ncellcli -e \"list iormplan detail\"          # IORM 목표(objective)와 DB별 계획\n\n# 전체 셀 한 번에\ndcli -g ~/cell_group -l celladmin \"cellcli -e list cell attributes name, flashCacheMode\""],
 ["tbl",[["Flash Cache 모드","뜻"],["WriteThrough","읽기만 캐시, 쓰기는 디스크에 바로"],["WriteBack","쓰기도 플래시에 먼저 받아 두고 나중에 디스크로 — 쓰기 많은 업무에 유리"]]],
 ["ul",["Smart Flash Log는 Redo 쓰기를 플래시와 디스크에 동시에 보내 먼저 끝나는 쪽으로 응답해 'log file parallel write' 튀는 현상을 줄입니다.","IORM은 여러 DB가 같은 셀을 쓸 때 I/O를 나눠 주는 기능입니다. 통합 환경에서 한 DB의 배치가 다른 DB를 느리게 하면 IORM 계획부터 확인합니다."]],
 ["warn","Flash Cache 모드 변경은 셀별 절차(롤링 여부 포함)가 Exadata 버전마다 다릅니다. 반드시 해당 버전 문서 절차를 따르세요."]
]}],
 quiz: [
 { q: "EXAchk가 포함된 오라클 진단 도구 모음은?", o: ["OEM", "AHF", "OPatch", "DBCA"], a: 1, e: "EXAchk·ORAchk·TFA·OSWatcher는 Autonomous Health Framework(AHF)에 포함됩니다." },
 { q: "셀의 Flash Cache 모드를 확인하는 CellCLI 명령은?", o: ["list cell attributes name, flashCacheMode", "list griddisk", "list alerthistory", "list lun"], a: 0, e: "cell 객체의 flashCacheMode 속성으로 WriteBack/WriteThrough를 확인합니다." },
 { q: "Exadata Smart Flash Log가 줄여 주는 대기는?", o: ["db file scattered read", "log file parallel write 지연 튐", "enq: TX", "gc cr request"], a: 1, e: "Redo 쓰기를 플래시와 디스크에 동시에 보내 먼저 끝나는 쪽으로 응답해 Redo 쓰기 지연 튐을 줄입니다." }
]},
/* ───── 12호선 장애대응 ───── */
trouble: { lessons: [
{ id:"tr-7", title:"세션·프로세스 한도 초과 (ORA-00018·00020)", min:4, ref:[["Database Reference 19c · SESSIONS", D + "refrn/SESSIONS.html"], ["Database Reference 19c · PROCESSES", D + "refrn/PROCESSES.html"]], body:[
 ["tbl",[["에러","뜻"],["ORA-00020","maximum number of processes exceeded — PROCESSES 한도"],["ORA-00018","maximum number of sessions exceeded — SESSIONS 한도"]]],
 ["code","sql","-- 현재·최대 사용량과 한도\nSELECT resource_name, current_utilization, max_utilization, limit_value\nFROM   v$resource_limit WHERE resource_name IN ('processes','sessions');\n\n-- 어디서 몰려왔나\nSELECT machine, program, username, status, COUNT(*)\nFROM   v$session WHERE type = 'USER'\nGROUP  BY machine, program, username, status ORDER BY 5 DESC;"],
 ["ul",["PROCESSES는 정적 파라미터라 바꾸려면 재기동이 필요합니다. SESSIONS 기본값은 (1.5 × PROCESSES) + 22로 계산됩니다.","갑자기 한도에 닿았다면 대부분 애플리케이션 커넥션 풀 설정 변경, 커넥션 누수, 장애 후 재접속 폭주입니다. 한도를 올리기 전에 원인부터 확인합니다.","INACTIVE 세션이 대부분이면 풀의 최대 연결 수가 과한 경우입니다."]],
 ["tip","PROCESSES를 크게 올리면 PGA_AGGREGATE_LIMIT 기본값(PROCESSES × 3MB 이상)과 OS 세마포어·프로세스 한도도 함께 커져야 합니다. 변경 전 OS limits(nproc)도 같이 확인하세요."]
]},
{ id:"tr-8", title:"데드락 ORA-00060 트레이스 읽기", min:5, ref:[["MOS 60.1 · Troubleshooting ORA-60 Errors", MOS + "60.1"]], body:[
 ["p","두 세션이 서로 상대가 가진 잠금을 기다리면 오라클이 몇 초 안에 감지해 한쪽 '문장'을 롤백하고 ORA-00060을 냅니다. 트랜잭션 전체가 아니라 그 문장만 취소되므로, 애플리케이션이 이어서 커밋·롤백을 결정해야 합니다."],
 ["code","bash","# alert 로그에 트레이스 파일 이름이 남음\ngrep -n 'ORA-00060' $ORACLE_BASE/diag/rdbms/dbbig/DBBIG1/trace/alert_DBBIG1.log | tail -5\n# 그 트레이스에서 'Deadlock graph' 부분을 봄\ngrep -n -A 15 'Deadlock graph' <트레이스 파일>"],
 ["tbl",[["Deadlock graph 모양","흔한 원인"],["TX 잠금, 양쪽 모두 X 모드 대기","애플리케이션이 같은 행들을 서로 다른 순서로 수정 (로직 문제)"],["TM 잠금이 관련","인덱스 없는 외래 키(FK) — 부모 행 삭제·수정 시 자식 테이블 잠금"],["TX 잠금, S 모드 대기","블록의 ITL 부족, 비트맵 인덱스 동시 DML 등"]]],
 ["code","sql","-- 인덱스 없는 외래 키 찾기 (단일 컬럼 FK 기준 간단 버전)\nSELECT c.owner, c.table_name, cc.column_name, c.constraint_name\nFROM   dba_constraints c JOIN dba_cons_columns cc\n       ON cc.owner = c.owner AND cc.constraint_name = c.constraint_name\nWHERE  c.constraint_type = 'R' AND c.owner = 'APP'\nAND NOT EXISTS (SELECT 1 FROM dba_ind_columns ic\n                WHERE ic.table_owner = c.owner AND ic.table_name = c.table_name\n                AND ic.column_name = cc.column_name AND ic.column_position = 1);"],
 ["tip","데드락은 DB가 스스로 풀어 주므로 'DB 장애'가 아니라 대부분 애플리케이션 로직 문제입니다. 트레이스의 두 SQL과 대상 행(rowid)을 정리해 개발팀에 전달하는 것이 DBA의 몫입니다."]
]},
{ id:"tr-9", title:"RAC 노드 재부팅 후 점검 순서", min:5, ref:[["Clusterware Administration 19c", D + "cwadd/index.html"]], body:[
 ["p","◎ 재부팅된 노드에서 시작해, 살아 있던 노드와 비교합니다."],
 ["code","bash","# STEP 1. 언제, 왜 재부팅됐나 (root)\nlast -x reboot | head -5\ngrep -iE 'panic|watchdog|oom|reboot' /var/log/messages | tail -50\n\n# STEP 2. 클러스터가 정상 합류했나\n/u01/app/19.0.0/grid/bin/crsctl check cluster -all\n/u01/app/19.0.0/grid/bin/crsctl stat res -t\n\n# STEP 3. 재부팅 직전 CRS 기록 (grid)\ngrep -E 'CRS-16(06|07|10|11|12)' $ORACLE_BASE/diag/crs/$(hostname -s)/crs/trace/alert.log | tail -20\n\n# STEP 4. 진단 자료 수집 (장애 시각 전후)\ntfactl diagcollect -last 4h"],
 ["ul",["DB 인스턴스·서비스가 원래 노드로 돌아왔는지(srvctl status service) 확인합니다. 자동 복귀(-failback) 설정이 없으면 수동 relocate가 필요합니다.","DB alert 로그에서 살아 있던 노드가 죽은 인스턴스의 복구를 정상적으로 끝냈는지, 재부팅된 노드의 인스턴스가 에러 없이 OPEN됐는지 확인합니다.","OSWatcher의 재부팅 직전 몇 분(CPU·메모리·스왑)이 원인 판단의 핵심 증거입니다."]],
 ["tip","고객 보고는 '시각 → 현상 → 영향(서비스 중단 시간) → 원인(1차 판단) → 조치 → 재발 방지(SR 번호)' 순서로 쓰면 깔끔합니다."]
]}],
 quiz: [
 { q: "19c에서 SESSIONS 파라미터의 기본값 계산식은?", o: ["PROCESSES + 5", "(1.1 × PROCESSES) + 5", "(1.5 × PROCESSES) + 22", "PROCESSES × 2"], a: 2, e: "19c Reference 기준 기본값은 (1.5 × PROCESSES) + 22입니다." },
 { q: "PROCESSES·SESSIONS의 현재·최대 사용량과 한도를 한 번에 보는 뷰는?", o: ["V$RESOURCE_LIMIT", "V$SGASTAT", "V$LICENSE", "V$SYSMETRIC"], a: 0, e: "V$RESOURCE_LIMIT의 CURRENT_UTILIZATION, MAX_UTILIZATION, LIMIT_VALUE를 봅니다." },
 { q: "ORA-00060 발생 시 오라클이 롤백하는 범위는?", o: ["두 트랜잭션 전체", "한쪽 세션의 해당 문장(statement)", "인스턴스 전체", "아무것도 롤백하지 않음"], a: 1, e: "데드락을 감지하면 한쪽의 문장만 롤백합니다. 트랜잭션의 나머지 처리는 애플리케이션이 결정합니다." },
 { q: "Deadlock graph에 TM 잠금이 보일 때 의심할 대표 원인은?", o: ["인덱스 없는 외래 키", "TEMP 부족", "Redo 부족", "리스너 오류"], a: 0, e: "자식 테이블 FK 컬럼에 인덱스가 없으면 부모 행 변경 시 자식 테이블 TM 잠금이 걸려 데드락이 잘 생깁니다." }
]},
/* ───── 13호선 업그레이드·이관 ───── */
mig: { lessons: [
{ id:"mig-7", title:"non-CDB를 PDB로 전환", min:6, ref:[["Multitenant Administrator's Guide 19c · Creating a PDB Using a Non-CDB", D + "multi/index.html"]], body:[
 ["p","같은 버전·같은 RU의 non-CDB를 CDB 안의 PDB로 넣는 방법입니다. 버전이 다르면 먼저 업그레이드하거나 AutoUpgrade의 target_cdb로 업그레이드와 전환을 한 번에 합니다."],
 ["code","sql","-- ◎ non-CDB에서: 읽기 전용으로 열고 XML 생성\nSHUTDOWN IMMEDIATE;\nSTARTUP OPEN READ ONLY;\nEXEC DBMS_PDB.DESCRIBE(pdb_descr_file => '/home/oracle/ncdb.xml');\nSHUTDOWN IMMEDIATE;\n\n-- ◎ CDB 루트에서: 호환성 점검\nSET SERVEROUTPUT ON\nDECLARE ok BOOLEAN;\nBEGIN\n  ok := DBMS_PDB.CHECK_PLUG_COMPATIBILITY(pdb_descr_file => '/home/oracle/ncdb.xml', pdb_name => 'APPPDB');\n  DBMS_OUTPUT.PUT_LINE(CASE WHEN ok THEN 'COMPATIBLE' ELSE 'CHECK PDB_PLUG_IN_VIOLATIONS' END);\nEND;\n/\nSELECT type, message, status FROM pdb_plug_in_violations WHERE name = 'APPPDB' AND status <> 'RESOLVED';\n\n-- 플러그인 (NOCOPY = 원본 파일을 그대로 사용)\nCREATE PLUGGABLE DATABASE apppdb USING '/home/oracle/ncdb.xml' NOCOPY TEMPFILE REUSE;\n\n-- non-CDB 딕셔너리를 PDB 구조로 정리 (필수, 시간 걸림)\nALTER SESSION SET CONTAINER = apppdb;\n@?/rdbms/admin/noncdb_to_pdb.sql\n\nALTER PLUGGABLE DATABASE apppdb OPEN;\nALTER PLUGGABLE DATABASE apppdb SAVE STATE;"],
 ["warn","NOCOPY는 원본 데이터파일을 PDB가 그대로 가져가므로, 이후 원래 non-CDB로 되돌아갈 수 없습니다. 실행 전에 반드시 백업(또는 COPY 방식)을 준비하세요."],
 ["tip","애플리케이션은 이제 PDB 서비스명으로 접속해야 합니다. 기존 접속 문자열(SID 방식)을 쓰는 애플리케이션 목록을 미리 뽑아 두면 전환 당일 접속 장애를 막을 수 있습니다."]
]},
{ id:"mig-8", title:"타임존 파일(DST) 업그레이드", min:4, ref:[["Database Upgrade Guide 19c · Upgrading the Time Zone File Version", D + "upgrd/index.html"]], body:[
 ["p","DB는 시간대 규칙을 '타임존 파일(DST 버전)'로 가지고 있습니다. TIMESTAMP WITH TIME ZONE 데이터를 정확히 계산하려면 업그레이드 후 새 홈의 타임존 버전으로 올려야 합니다. AutoUpgrade는 필요하면 기본적으로 이 작업도 해 줍니다."],
 ["code","sql","-- 현재 DB의 타임존 버전\nSELECT * FROM v$timezone_file;\nSELECT property_name, property_value FROM database_properties WHERE property_name LIKE 'DST_%';"],
 ["code","bash","# 수동으로 할 때 (18c+ 제공 스크립트) — DB 재기동이 포함되므로 다운타임 필요\nsqlplus / as sysdba @?/rdbms/admin/utltz_upg_check.sql\nsqlplus / as sysdba @?/rdbms/admin/utltz_upg_apply.sql"],
 ["ul",["CDB는 루트와 각 PDB에서 따로 실행합니다.","Data Guard는 Primary에서만 실행하면 Redo로 반영되지만, Standby 홈에도 같은 버전의 타임존 파일(같은 RU)이 있어야 합니다.","TIMESTAMP WITH TIME ZONE 컬럼이 많은 큰 테이블이 있으면 시간이 오래 걸릴 수 있어 check 결과로 미리 가늠합니다."]],
 ["tip","업그레이드 작업계획서의 '사후 작업'에 타임존 업그레이드를 넣었는지, AutoUpgrade에 맡겼는지(timezone_upg) 명확히 적어 두세요."]
]}],
 quiz: [
 { q: "non-CDB를 PDB로 넣기 전에 XML 설명 파일을 만드는 프로시저는?", o: ["DBMS_PDB.DESCRIBE", "DBMS_PDB.SYNC_PDB", "DBMS_STATS.EXPORT", "DBMS_METADATA.GET_DDL"], a: 0, e: "읽기 전용으로 연 non-CDB에서 DBMS_PDB.DESCRIBE로 XML을 만듭니다." },
 { q: "non-CDB를 PDB로 플러그인한 뒤 반드시 실행해야 하는 스크립트는?", o: ["utlrp.sql", "noncdb_to_pdb.sql", "catcon.pl만", "utlpwdmg.sql"], a: 1, e: "noncdb_to_pdb.sql로 딕셔너리를 PDB 구조로 정리해야 정상 사용이 가능합니다." },
 { q: "AutoUpgrade와 타임존 파일 업그레이드의 관계로 옳은 것은?", o: ["절대 하지 않는다", "필요하면 기본적으로 수행한다", "Standard Edition에서만 한다", "수동 스크립트가 필수다"], a: 1, e: "19c 문서상 AutoUpgrade는 타임존 업데이트가 필요하면 기본적으로 수행합니다(timezone_upg로 제어)." },
 { q: "AutoUpgrade에서 raise_compatible=yes로 설정할 때 함께 설정해야 하는 것은?", o: ["drop_grp_after_upgrade=yes", "timezone_upg=no", "restoration=no", "target_cdb"], a: 0, e: "COMPATIBLE을 올리면 GRP로 되돌릴 수 없으므로 drop_grp_after_upgrade=yes가 함께 필요합니다." }
]}
  };
  Object.keys(ADD).forEach(function (id) {
    var c = cat(id); if (!c) return;
    ADD[id].lessons.forEach(function (l) { c.lessons.push(l); });
    c.quiz = c.quiz.concat(ADD[id].quiz);
  });
})();
