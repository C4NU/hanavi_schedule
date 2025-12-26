# Docker 배포 가이드

이 프로젝트는 Docker를 사용하여 손쉽게 배포할 수 있도록 구성되어 있습니다. 이 가이드는 일반적인 Docker 환경과 **Synology NAS** 환경에서의 설치 방법을 모두 다룹니다.

## 📁 폴더 구조

```
.
├── .dockerignore        # (프로젝트 루트) Docker 빌드 제외 설정
├── docker/              # Docker 관련 파일
│   ├── Dockerfile       # 이미지 빌드 명세
│   ├── docker-compose.yml
│   └── README.md        # 배포 가이드 (본 문서)
└── ...
```

---

## ✅ 사전 준비 (필수)

컨테이너를 실행하기 전에 **환경 변수 파일**이 준비되어야 합니다.

1. 프로젝트 루트 경로(`docker` 폴더의 상위 폴더)에 `.env.local` 파일이 있는지 확인하십시오.
2. 이 파일에는 다음과 같은 필수 설정값이 포함되어야 합니다:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - (선택) Firebase 관련 설정

> **주의**: `.env.local` 파일이 없으면 컨테이너가 실행되더라도 DB 연결 오류가 발생할 수 있습니다.

---

## 🚀 일반 실행 방법 (Linux / Mac / Windows)

터미널(CLI) 환경에서 `docker-compose`를 사용하여 실행하는 방법입니다.

### 1. 실행

터미널을 열고 `docker` 폴더로 이동하여 다음 명령어를 실행합니다.

```bash
# docker 폴더 내부에서 실행 시
docker-compose up -d --build
```

(참고: 프로젝트 루트에서 실행할 경우 `-f docker/docker-compose.yml` 옵션 필요)

### 2. 종료

컨테이너를 중지하고 제거하려면 다음을 실행합니다.

```bash
docker-compose down
```

---

## 📦 Synology NAS 배포 방법

Synology NAS의 **Container Manager**(구 Docker 패키지)를 사용한 배포 방법입니다.

### 1단계: 파일 업로드
Synology File Station을 통해 프로젝트 전체 폴더를 NAS의 원하는 위치(예: `/volume1/docker/hanavi_schedule`)에 업로드합니다.
- **중요**: 소스 코드를 빌드해야 하므로 `src`, `public`, `package.json` 등을 포함한 전체 코드가 필요합니다. (`node_modules`는 제외 가능)

### 2단계: 프로젝트 생성
1. **Container Manager** 앱 실행.
2. 좌측 메뉴에서 **프로젝트(Project)** 선택 → **생성(Create)** 클릭.
3. 설정 입력:
   - **프로젝트 이름**: 예) `hanavi-schedule`
   - **경로**: 업로드한 폴더 내의 `/docker` 폴더를 선택합니다.
     - (이 경로에 `docker-compose.yml`이 존재해야 함)
   - **소스**: '기존 docker-compose.yml 사용' 선택.
4. **다음** 버튼을 눌러 진행하면, 이미지를 자동으로 빌드하고 컨테이너를 실행합니다.

> **⚠️ 주의사항**: NAS의 CPU 성능에 따라 초기 빌드(npm install 및 build)에 **5분~10분 이상** 소요될 수 있습니다. 실패한 것처럼 보여도 로그를 확인하며 기다려주세요.

---

## 🔄 업데이트 방법

소스 코드가 변경되었을 때 서비스를 업데이트하는 방법입니다.

1. **파일 덮어쓰기**: 변경된 소스 코드를 서버(또는 NAS)에 업로드하여 덮어씁니다.
2. **재빌드 및 재시작**:
   - **CLI**: `docker-compose up -d --build` (자동으로 변경사항 감지하여 재빌드)
   - **Synology**: 프로젝트 메뉴에서 해당 프로젝트 선택 → **작업(Action)** → **빌드(Build)** 또는 **다시 시작** 선택.
