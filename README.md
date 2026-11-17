# 디비빅SQL 설치형 패키지 (v0.0.3)

claude.ai 링크 없이 폰에 앱처럼 설치해서 쓰는 버전입니다.
앱 파일이 기기에 저장되므로 지하철에서 데이터가 끊겨도 레슨·퀴즈·SQL 실습이 동작합니다.

## claude.ai 버전과 다른 점

| 기능 | claude.ai 버전 | 설치형 |
|---|---|---|
| 레슨·퀴즈·SQL 실습 | O | O (오프라인 가능) |
| AI 코치 / AI 문제 생성 | O | X (Claude 연결 필요) |
| 계정 동기화 | O | X (기기 저장) |
| 듣기 | Claude 음성 | 폰 내장 음성 |
| 홈 화면 아이콘 | claude.ai 아이콘 | 아바타 아이콘 |

학습 기록 옮기기: claude.ai 버전 ⚙️ 설정 → 학습 기록 백업 "복사" → 설치형 ⚙️ 설정 → "붙여넣기"

---

## 방법 A. 개인 설치 (무료, 추천) — GitHub Pages + Chrome 앱 설치

GitHub 계정: `DBbig-0118`
앱 주소: **https://dbbig-0118.github.io**  (GitHub Pages 주소는 소문자로 표시됨)

STEP 1. 저장소 생성 (PC 브라우저)
- https://github.com/new 접속
- Repository name: `DBbig-0118.github.io`  ← 계정명과 정확히 같아야 루트 주소로 열림
- Public 선택 → README 등 체크하지 말고 "Create repository"
- 주의: Public 저장소이므로 앱 내용은 누구나 볼 수 있습니다.

STEP 2-1. 파일 업로드 — 웹에서 (git 설치 불필요, Windows 권장)
- zip 파일을 풀기 (압축 푼 폴더 안에 index.html 이 바로 보여야 함)
- 저장소 화면 → "uploading an existing file" 링크 (또는 Add file → Upload files)
- 압축 푼 폴더 **안의 파일 전부**를 선택해 드래그 (폴더째 말고 파일들만)
- 맨 아래 "Commit changes" 클릭

STEP 2-2. 파일 업로드 — git 명령으로 (선택)
```bash
git clone https://github.com/DBbig-0118/DBbig-0118.github.io.git
cd DBbig-0118.github.io
unzip ~/Downloads/dbbigsql-pwa-v0.0.3.zip -d .
ls -la            # index.html, sw.js, .nojekyll 확인
git add -A
git commit -m "디비빅SQL v0.0.3"
git push origin main
```

STEP 3. 배포 확인
- 저장소 → Settings → Pages: Source "Deploy from a branch", Branch `main` / `/(root)` 확인
- 저장소 → Actions 탭에서 "pages build and deployment" 초록색 체크 확인 (1~2분)
- PC 브라우저로 https://dbbig-0118.github.io 접속해서 앱이 뜨는지 확인

STEP 4. 폰에 설치
- 폰 Chrome으로 https://dbbig-0118.github.io 접속
- ⋮ 메뉴 → "앱 설치" (또는 "홈 화면에 추가" → 설치)
- 아바타 아이콘으로 앱 서랍·홈 화면에 생성됨
- 설치 후 한 번은 온라인 상태에서 앱을 열어 두어야 오프라인 캐시가 채워집니다.

STEP 5. 업데이트
- 웹: 새 버전 zip을 풀어 같은 방식으로 파일 전부 업로드 → Commit (같은 이름 파일은 덮어씀)
- git: 새 zip을 같은 폴더에 `unzip -o` 로 덮어쓰고 `git add -A && git commit -m "v0.0.x" && git push`
- 앱을 다시 열면(온라인일 때) 새 버전이 반영됩니다. 학습 기록은 폰에 따로 저장되어 유지됩니다.

---

## 방법 B. APK 만들기 (Bubblewrap / TWA) — 개인 설치 또는 플레이스토어용

방법 A로 사이트를 먼저 올려 두어야 합니다. PC에 Node.js 18 이상 필요 (JDK·Android SDK는 bubblewrap이 처음 실행 때 설치를 안내).

STEP 1. Bubblewrap 설치
```bash
npm install -g @bubblewrap/cli
```

STEP 2. 프로젝트 생성
```bash
mkdir -p ~/dbbigsql-android && cd ~/dbbigsql-android
bubblewrap init --manifest=https://dbbig-0118.github.io/manifest.webmanifest
```
- 패키지명 예: `io.github.dbbig_0118.dbbigsql`  (Android 패키지명에는 하이픈(-)을 쓸 수 없어서 밑줄로 바꿈)
- 서명 키(keystore) 생성 질문에 답하고 **keystore 파일과 비밀번호를 반드시 따로 보관** (잃어버리면 같은 앱으로 업데이트 불가)

STEP 3. 빌드
```bash
bubblewrap build
ls -l app-release-signed.apk app-release-bundle.aab
```

STEP 4. 주소창 없이 열리게 하기 (Digital Asset Links)
```bash
bubblewrap fingerprint generateAssetLinks
```
- 생성된 `assetlinks.json`을 GitHub 저장소의 `.well-known/assetlinks.json` 위치에 올리고 push
- 확인: `https://dbbig-0118.github.io/.well-known/assetlinks.json` 이 열려야 함

STEP 5. 폰에 개인 설치
- `app-release-signed.apk`를 폰으로 옮겨 실행 → "출처를 알 수 없는 앱" 설치 허용
- 또는 USB 디버깅 켜고 PC에서:
```bash
adb install -r app-release-signed.apk
```
- 참고: Google의 Android 개발자 인증(사이드로드 앱도 등록된 개발자 앱이어야 설치) 제도가 2026년 9월 일부 국가부터 시작됐고 2027년 이후 전 세계로 확대 예정입니다. 확대 후에는 Android Developer Console 등록이 필요할 수 있습니다.

---

## 방법 C. 플레이스토어 등록

STEP 1. Google Play Console 개발자 계정 생성 (1회 등록비, 본인 인증)

STEP 2. 앱 만들기 → `app-release-bundle.aab` 업로드
- 스토어 등록정보(아이콘 512px: `icon-512-full.png`, 스크린샷), 콘텐츠 등급, 데이터 보안 양식, 개인정보처리방침 URL 필요
- 개인정보처리방침 URL: **https://dbbig-0118.github.io/privacy.html** (이 패키지에 포함)
- 시행일·연락처 이메일은 privacy.html 안의 `연락처` 부분을 본인 이메일로 고친 뒤 올리세요.

STEP 3. 비공개 테스트 (2023-11-13 이후 만든 개인 계정은 필수)
- 테스터 12명 이상이 14일 연속 참여해야 프로덕션 신청 가능
- 테스터는 테스트 링크로 참여해 Play에서 설치해야 함(APK 직접 설치는 인정 안 됨)

STEP 4. Play 앱 서명 키 반영
- Play Console → 앱 무결성 → 앱 서명 키의 SHA-256 지문을 `assetlinks.json`에 추가하고 다시 push
- 빠뜨리면 Play에서 받은 앱 상단에 주소창이 보입니다.

STEP 5. 프로덕션 액세스 신청 → 심사 → 출시

---

포함 파일: index.html, app.js, content.js, problems.js, engine.js, schema.js, sql-asm.js(SQLite 엔진, MIT 라이선스 — LICENSE-sql.js.txt), sw.js(오프라인 캐시), manifest.webmanifest, privacy.html(개인정보처리방침), 아이콘 3종, .nojekyll
