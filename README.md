# Pixel Run (Promo Dino Game)

온라인 스토어 프로모션용 크롬 다이노 스타일 게임. 커스텀 스프라이트(쥐 캐릭터)로 교체 가능하고,
일정 점수에 도달하면 해피엔딩 연출이 재생된다. iframe으로 스토어 페이지에 삽입되는 것을 전제로 한다.

- **프론트엔드**: 의존성 없는 바닐라 JS + Canvas 게임 (GitHub Pages 배포)
- **백엔드**: NestJS + Prisma + PostgreSQL (Railway 배포). 스프라이트 이미지 저장, 게임 설정, 어드민 인증 제공
- **어드민**: 스프라이트 업로드 / 해피엔딩 점수 설정용 페이지 (`/admin.html`)

> 상세 기획/개발 문서는 [`docs/`](docs/) 참고. (`promo-dino-game-spec.md` = 기획, `promo-dino-game-dev.md` = 개발 상세, `promo-dino-game-steps.md` = 구현 단계)
> `doc/study-guide.md`는 스터디용 자료로 앱 코드와 무관하다.

---

## 저장소 구조

```
pixel-run/
├── frontend/              # 바닐라 JS Canvas 게임 (빌드 불필요, 정적 호스팅)
│   ├── index.html         # 게임 페이지
│   ├── admin.html         # 어드민 페이지
│   ├── js/
│   │   ├── env.js         # window.__DINO_API_URL__ (백엔드 URL) — 환경별 설정 지점
│   │   ├── config.js      # 물리/속도/뷰포트 등 게임 상수
│   │   ├── Game.js        # 메인 루프 + 상태 머신 (loading→intro→playing→gameover/happyending)
│   │   ├── SpriteLoader.js# 서버 스프라이트 preload + placeholder fallback
│   │   ├── Dino/Obstacle/Ground/Cloud/NightMode/Score/...  # 게임 엔티티
│   │   ├── Intro/DeathAnimation/HappyEnding/Girlfriend.js  # 연출 시퀀스
│   │   └── utils.js       # 충돌 판정, placeholder 렌더, 폰트 헬퍼
│   └── assets/
│       ├── sprite-config.json  # 스프라이트 크기/hitbox/파일명 메타데이터 (게임의 진실 공급원)
│       ├── fonts/ icons/
├── backend/               # NestJS API
│   ├── src/
│   │   ├── main.ts        # bootstrap, CORS, iframe(frame-ancestors) 헤더
│   │   ├── auth/          # 비밀번호 로그인 + Bearer 토큰 가드
│   │   ├── sprites/       # 스프라이트 업로드/조회/삭제 (DB BYTEA 저장)
│   │   ├── settings/      # game_settings 조회/변경 (해피엔딩 점수 등)
│   │   └── database/      # PrismaService (전역 모듈)
│   ├── prisma/            # schema.prisma + migrations + seed.ts
│   └── Dockerfile
├── docker-compose.yml     # 로컬 PostgreSQL (포트 5433)
└── .github/workflows/     # GitHub Pages 배포 (프론트엔드)
```

---

## 로컬 개발

### 1. 백엔드

```bash
# 1) PostgreSQL 기동 (포트 5433)
docker compose up -d

# 2) 의존성 설치 + Prisma 클라이언트 생성
cd backend
npm install
npx prisma generate

# 3) 마이그레이션 적용 (테이블 생성 + happy_ending_score 시드까지 멱등 처리됨)
npx prisma migrate deploy

# 4) 개발 서버 (watch)
npm run start:dev      # http://localhost:3001
```

기본 로컬 DB 접속 문자열은 코드에 하드코딩된 fallback이 있다:
`postgresql://dino:dino1234@localhost:5433/dino?schema=public` (docker-compose 값과 일치).

### 2. 프론트엔드

빌드가 없다. 정적 파일을 그대로 서빙하면 된다.

```bash
cd frontend
python3 -m http.server 8080   # http://localhost:8080
```

> **중요**: `frontend/js/env.js`는 `window.__DINO_API_URL__`에 **프로덕션 백엔드 URL**을 하드코딩한다.
> 로컬 백엔드에 붙이려면 이 값을 `http://localhost:3001`로 바꾸거나 빈 문자열로 두어야 한다.
> (env.js가 값을 설정하지 못한 경우의 코드 기본값은 `http://localhost:3001`)

---

## 환경 변수 (백엔드)

| 변수 | 기본값 | 설명 |
| ---- | ------ | ---- |
| `DATABASE_URL` | `postgresql://dino:dino1234@localhost:5433/dino?schema=public` | PostgreSQL 접속 문자열 |
| `ADMIN_PASSWORD` | `admin1234` | 어드민 로그인 비밀번호. **프로덕션에서 반드시 변경** |
| `PORT` | `3001` | 서버 포트 |
| `ALLOWED_ORIGINS` | (없음 → 모두 허용) | CORS/iframe 허용 도메인. 쉼표 구분. 예: `https://store.example.com` |

---

## API 요약

| 메서드 | 경로 | 인증 | 설명 |
| ------ | ---- | ---- | ---- |
| POST | `/admin/login` | — | `{ password }` → `{ token }` |
| GET | `/settings` | — | 전체 게임 설정 `{ key: value }` |
| PATCH | `/admin/settings` | Bearer | 설정 변경 (`{ happy_ending_score: "10000" }`) |
| GET | `/sprites/:key` | — | 스프라이트 이미지 바이너리 (게임/어드민이 사용) |
| POST | `/admin/sprites/:key` | Bearer | 이미지 업로드 (multipart `image`, webp/png/svg) |
| GET | `/admin/sprites/:key` | Bearer | 스프라이트 메타데이터 |
| DELETE | `/admin/sprites/:key` | Bearer | 스프라이트 삭제 |

스프라이트 `key`는 `frontend/assets/sprite-config.json`의 파일명(확장자 제외)과 일치해야 한다
(예: `dino-run-1`, `obstacle-fly-1`).

---

## 배포

- **프론트엔드**: `main` 브랜치 push 시 GitHub Actions가 `frontend/`를 GitHub Pages로 배포
  (`.github/workflows/deploy-pages.yml`).
- **백엔드**: Railway. `Dockerfile`이 빌드 후 `prisma migrate deploy && npm run start:prod`를 실행한다.
  환경 변수는 Railway 대시보드에서 설정.

---

## 테스트

```bash
cd backend
npm test
```

> `settings`/`sprites` 컨트롤러 스펙은 실제 PostgreSQL이 필요한 **통합 테스트**다.
> `docker compose up -d` 후 실행해야 통과한다 (DB 없이 실행하면 연결 단계에서 실패).

---

## 알려진 한계 / 미구현 (인수인계 참고)

기획서(`docs/promo-dino-game-spec.md`)·구현 단계 문서에는 아래 항목이 포함/완료로 기재돼 있으나,
**현재 코드베이스에는 구현되어 있지 않다.** 인계받는 쪽에서 필요 여부를 판단할 것.

- **랭킹/점수 저장 시스템 미구현**: 기획의 핵심 기능인 연락처+점수 랭킹(상위 N개 보관, 어드민 랭킹
  관리 UI)이 백엔드(`scores` 모듈)·DB(`scores` 테이블)·어드민 탭 모두 존재하지 않는다.
  프론트엔드 `Score.save()`는 빈 스텁이다. (`steps.md`에는 완료 `[x]`로 표기돼 있어 문서와 코드가 어긋남)
- **어드민 인증 강화 미구현**: 로그인 시도 횟수 제한(기획상 5회 실패 시 차단), 토큰 만료가 없다.
  토큰은 서버 메모리(`Set`)에 보관되어 **서버 재시작 시 전부 무효화**된다. 비활동 자동 로그아웃은
  프론트엔드(`admin.js`, 30분)에만 존재한다.
- **스프라이트 업로드 시 픽셀 크기 검증 미구현**: 기획상 지정 크기와 다르면 업로드를 거부해야 하나,
  현재는 MIME 타입(webp/png/svg)만 검증한다.

---

## 참고: 게임 동작 개요

- `Game.js`가 단일 `requestAnimationFrame` 루프에서 상태별 `update()`/`draw()`를 분기한다.
- 좌표계는 논리 뷰포트(`config.js`의 `REFERENCE_WIDTH/HEIGHT`)를 기준으로 하고, `resize()`에서
  화면 비율에 맞춰 `contain` 방식으로 스케일한다 (지면은 항상 하단 고정).
- 스프라이트는 서버에서 로드하되 실패하면 컬러 박스 placeholder로 그려져, 이미지가 없어도 전체
  플로우가 동작한다. 크기/hitbox의 진실 공급원은 `sprite-config.json`이다.
```
