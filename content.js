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
