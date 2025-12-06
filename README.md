# 하나비 스케줄 (Hanabi Schedule)

하나비 버추얼 아이돌의 주간 스케줄을 보여주는 반응형 웹 앱(PWA)입니다.

## ✨ 기능
- **반응형 디자인**: 데스크탑과 모바일 모두 지원
- **PWA 지원**: 홈 화면에 추가하여 앱처럼 사용 가능
- **방송인 필터**: 원하는 방송인만 선택하여 볼 수 있습니다
- **이미지 저장**: 시간표를 이미지로 다운로드하거나 공유할 수 있습니다 (Web Share API)
- **캘린더 저장**: 주간 스케줄을 .ics 파일로 내보내어 캘린더에 등록할 수 있습니다
- **오프라인 지원**: 서비스 워커를 통한 기본 오프라인 기능
- **푸시 알림**: 스케줄 업데이트 시 브라우저 알림 수신 (Firebase Cloud Messaging)
- **실시간 업데이트**: Google Sheets 연동을 통한 데이터 자동 업데이트

## 🚀 시작하기

### 필수 요구사항
- Node.js 20.x 이상
- npm 또는 yarn

### 설치 방법

1.  **저장소 클론**
    ```bash
    git clone https://github.com/C4NU/hanavi_schedule.git
    cd hanavi_schedule
    ```

2.  **의존성 설치**
    ```bash
    npm install
    ```

3.  **환경 변수 설정**
    `.env.local.sample` 파일을 참고하여 `.env.local` 파일을 생성하고 필요한 변수를 설정합니다.

4.  **개발 서버 실행**
    ```bash
    npm run dev
    ```

## 📱 PWA 설치 (모바일)

### iOS (Safari)
1. Safari에서 사이트 접속
2. 공유 버튼 (상단 또는 하단) 클릭
3. "홈 화면에 추가" 선택
4. 이름 확인 후 "추가"

### Android (Chrome)
1. Chrome에서 사이트 접속
2. 메뉴 (⋮) 클릭
3. "홈 화면에 추가" 또는 "앱 설치" 선택

### Desktop (Chrome/Edge)
1. 주소창 오른쪽의 설치 아이콘 클릭
2. "설치" 버튼 클릭

## 🎨 사용 방법

### 방송인 필터
- "필터" 버튼을 클릭하여 필터 패널 열기
- 원하는 방송인을 체크/해제
- "전체 선택" 또는 "전체 해제"로 빠른 설정

### 이미지/캘린더 저장
- "이미지로 저장" 버튼: 현재 스케줄을 이미지 파일로 저장하거나 공유
- "캘린더로 저장" 버튼: 스케줄을 캘린더 앱에 추가할 수 있는 파일로 내보내기

### 알림 설정
- 최초 접속 시 또는 "알림 설정" 버튼을 통해 알림 권한 요청
- "허용" 시 스케줄 업데이트 알림 수신 가능

## 🔧 기술 스택
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **PWA**: next-pwa
- **Data Fetching**: SWR
- **Export**: html2canvas, ics
- **Notifications**: Firebase Cloud Messaging (FCM)

## 📝 데이터 편집

`google_sheets` 폴더 내의 `하나비 방송 스케줄.ods` 파일을 사용하여 데이터 구조를 파악하거나 수정할 수 있습니다.
실제 서비스는 Google Sheets와 연동되어 작동합니다.

1. Google Cloud Console에서 서비스 계정 생성 및 키 발급
2. Google Sheet에 서비스 계정 이메일 공유 (뷰어 권한)
3. 환경 변수 설정

## 🚀 Vercel 배포

1. Vercel에 프로젝트 연결
2. 환경 변수 설정 (다음 항목들을 설정해야 합니다):
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT`
   - `ADMIN_SECRET`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
3. 자동 빌드 및 배포

## 📊 자동 업데이트 (Google Apps Script)
구글 시트의 변경사항을 실시간으로 감지하여 푸시 알림을 전송합니다.
1. `docs/setup_guide.md`의 **6. 자동 알림 켜기** 섹션을 참고하여 Google Apps Script를 설정하세요.
2. 이제 스케줄 시트를 수정하면 자동으로 사용자에게 알림이 전송됩니다.

## 📄 라이선스

MIT
