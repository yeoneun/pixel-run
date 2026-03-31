# Promo Dino Game 개발 문서

> 작성일: 2026-03-30
> 관련 기획서: `promo-dino-game-spec.md`
> 대상 파일: `frontend/`, `backend/` (수정), 어드민 페이지 (신규), 인프라 설정 (신규)
> Figma: 없음

---

## 1. 아키텍처 설계

```
┌─ Frontend: 게임 (Static / GitHub Pages) ──────────┐
│                                                     │
│  dino-game.html (iframe으로 삽입)                    │
│    ├─ js/Game.js          (게임 루프 + 상태 머신)    │
│    ├─ js/SpriteLoader.js  (이미지 preload)           │  ← 신규
│    ├─ js/Intro.js         (인트로 연출)              │  ← 신규
│    ├─ js/Dino.js          (캐릭터)                   │
│    ├─ js/Obstacle.js      (장애물)                   │
│    ├─ js/api.js           (서버 통신)                │
│    └─ assets/sprites/     (교체 가능한 이미지)        │  ← 신규
│                                                     │
│  admin.html (별도 페이지, iframe 아님)               │  ← 신규
│    └─ js/admin.js                                   │  ← 신규
│                                                     │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS
                      ▼
┌─ Backend (NestJS) ──────────────────────────────────┐
│                                                     │
│  POST   /scores              (점수 저장, UPSERT)    │
│  GET    /scores              (전체 조회, 어드민)     │
│  GET    /scores/check?score= (랭킹 진입 확인)       │
│  PATCH  /scores/:id          (수정, 어드민)          │
│  DELETE /scores/:id          (삭제, 어드민)          │
│  POST   /admin/login         (어드민 인증)           │  ← 신규
│                                                     │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─ Database (PostgreSQL) ─────────────────────────────┐
│  scores 테이블                                       │
│  - player_name, contact, score, user_agent,         │
│    ip_address, created_at                           │
│  - UNIQUE(contact) → 유저당 최고점만                │
│  - 상위 N개만 유지                                   │
└─────────────────────────────────────────────────────┘
```

### 설계 결정 근거

**왜 WebP인가?**
- PNG 대비 30~50% 용량 절감 → 모바일 로딩 속도 개선
- 2025년 기준 모든 모던 브라우저 지원 (IE 미지원이지만 대상 아님)
- PNG도 허용하여 디자이너가 WebP 변환을 못 하는 경우 대응

**왜 NestJS를 유지하는가?**
- 이미 구축된 코드가 있고, CRUD가 단순하여 서버리스 전환 대비 이점 없음
- userAgent/IP 추출 등 서버 사이드 로직이 필요하여 Supabase 직접 접근보다 NestJS가 적합
- 단, 배포 플랫폼은 변경 필요 (아래 인프라 섹션 참조)

**왜 sprite sheet가 아닌 개별 이미지 파일인가?**
- sprite sheet 한 장은 교체 편의성이 떨어짐
- 개별 파일이면 디자이너가 직접 캐릭터를 바꿀 수 있어 프로모션마다 재사용 가능

---

## 2. 상태 머신

```
┌────────┐  preload 완료  ┌────────┐  Space/Tap  ┌──────────┐  충돌  ┌───────────┐
│loading │──────────────▶│  intro │────────────▶│ playing  │──────▶│ gameover  │
└────────┘               └────────┘             └──────────┘       └───────────┘
                                                     ▲                    │
                                                     │  '다시하기' 클릭    │
                                                     └────────────────────┘
                                                     ▲                    │
                                                     │  '순위작성' → 제출/취소 후 '다시하기'
                                                     └────────────────────┘
```

- `loading`: 페이지 로드 → SpriteLoader가 이미지 preload 중. 타이틀만 표시.
- `intro`: preload 완료 → "PRESS SPACE TO START" 표시, 입력 리스닝
- `playing`: Space/Tap → 타이틀 떨어지는 연출 + 캐릭터 등장 → 게임 루프
- `gameover`: 충돌 → GAME OVER + '다시하기'/'순위작성' 버튼 표시
  - '다시하기' → `playing`
  - '순위작성' → 입력 폼 → 제출/취소 → 버튼 복귀 (여전히 `gameover`)

---

## 3. 커스텀 스프라이트 시스템 구현

**현재**: `sprites.js`에 픽셀 좌표 배열로 하드코딩. `drawPixels()`로 1색 렌더링.

**변경**: 이미지 파일 기반 스프라이트 시스템으로 전환. 기존 픽셀아트는 제거.

**파일 구조**:

```
frontend/
  assets/
    sprites/
      sprite-config.json
      dino-run-1.webp
      dino-run-2.webp
      dino-duck-1.webp
      dino-duck-2.webp
      dino-jump-1.webp
      dino-jump-2.webp
      dino-dead-1.webp
      dino-dead-2.webp
      obstacle-sm-1.webp
      obstacle-sm-2.webp
      obstacle-lg-1.webp
      obstacle-lg-2.webp
      obstacle-db-1.webp
      obstacle-db-2.webp
      obstacle-fly-1.webp
      obstacle-fly-2.webp
      ground.webp
```

**`sprite-config.json`**:

```json
{
  "format": "webp",
  "dino": {
    "run": ["dino-run-1.webp", "dino-run-2.webp"],
    "duck": ["dino-duck-1.webp", "dino-duck-2.webp"],
    "jump": ["dino-jump-1.webp", "dino-jump-2.webp"],
    "dead": ["dino-dead-1.webp", "dino-dead-2.webp"],
    "size": { "w": 88, "h": 96 },
    "duckSize": { "w": 118, "h": 60 },
    "hitbox": { "x": 4, "y": 0, "w": 80, "h": 96 },
    "duckHitbox": { "x": 4, "y": 8, "w": 110, "h": 52 }
  },
  "obstacles": [
    {
      "type": "small",
      "sprites": ["obstacle-sm-1.webp", "obstacle-sm-2.webp"],
      "size": { "w": 34, "h": 70 },
      "hitbox": { "x": 2, "y": 0, "w": 30, "h": 70 }
    },
    {
      "type": "large",
      "sprites": ["obstacle-lg-1.webp", "obstacle-lg-2.webp"],
      "size": { "w": 50, "h": 96 },
      "hitbox": { "x": 2, "y": 0, "w": 46, "h": 96 }
    },
    {
      "type": "double",
      "sprites": ["obstacle-db-1.webp", "obstacle-db-2.webp"],
      "size": { "w": 80, "h": 96 },
      "hitbox": { "x": 2, "y": 0, "w": 76, "h": 96 }
    }
  ],
  "flyingObstacles": [
    {
      "sprites": ["obstacle-fly-1.webp", "obstacle-fly-2.webp"],
      "size": { "w": 84, "h": 60 },
      "hitbox": { "x": 2, "y": 2, "w": 80, "h": 56 }
    }
  ],
  "ground": {
    "sprite": "ground.webp",
    "size": { "w": 2400, "h": 24 },
    "tileWidth": 2400
  }
}
```

**placeholder (초기 구현)**: 실제 이미지 리소스가 준비되기 전까지, `sprite-config.json`의 size 정보를 기반으로 **해당 크기의 컬러 박스 + 라벨 텍스트**로 임시 렌더링. 기존 `sprites.js` 픽셀아트 fallback은 **제거**한다.

```
예시: 88x96 크기의 반투명 초록 박스 + "dino-run" 라벨
┌──────────┐
│ dino-run │  ← 컬러 박스 placeholder
└──────────┘
```

**preload 전략**: 인트로(loading) 화면에서 `sprite-config.json` → 모든 이미지를 `new Image()` + `Promise.all`로 프리로드. 이미지 파일이 없거나 로드 실패 시 해당 아이템은 컬러 박스 placeholder로 렌더링. 모든 로드 시도 완료 후 `intro` 상태로 전환하여 "PRESS SPACE TO START" 표시.

---

## 4. DB 스키마 + 점수 시스템

### 스키마

```sql
CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  player_name VARCHAR(50) NOT NULL,
  contact VARCHAR(100) NOT NULL,       -- 연락처 (전화번호 등)
  score INTEGER NOT NULL,
  user_agent TEXT,                      -- 자동 저장
  ip_address VARCHAR(45),              -- 자동 저장 (IPv6 대응)
  created_at TIMESTAMP DEFAULT NOW()
);

-- contact를 유저 고유 식별자로 사용
CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_unique_contact
  ON scores (contact);
```

### UPSERT (최고 점수만 유지)

```sql
INSERT INTO scores (player_name, contact, score, user_agent, ip_address)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (contact)
DO UPDATE SET score = GREATEST(scores.score, EXCLUDED.score),
              player_name = EXCLUDED.player_name,
              user_agent = EXCLUDED.user_agent,
              ip_address = EXCLUDED.ip_address,
              created_at = NOW()
WHERE EXCLUDED.score > scores.score;
```

### 상위 N개만 보관

```sql
-- INSERT 후 실행
DELETE FROM scores
WHERE id NOT IN (
  SELECT id FROM scores ORDER BY score DESC LIMIT $1
);
```

- N 값은 환경변수 `MAX_RANKING_SIZE`로 설정 (기본값: 100)

### contact validation

- 전화번호 형식: `010-XXXX-XXXX` (하이픈 포함, 정규식 검증)
- 클라이언트: 입력 시 실시간 포맷팅 + 제출 전 검증
- 서버: 동일 정규식으로 재검증, 불일치 시 400 에러
- 저장 시 하이픈 제거하여 정규화 (`01012345678`) → DB에는 숫자만 저장
- → **연락처 형식은 구현 시점에 최종 결정** (전화번호 vs 이메일 vs 기타)

### API 명세

| Method | Path | 용도 | 인증 |
| ------ | ---- | ---- | ---- |
| POST | /scores | 점수 저장 (이름, 연락처, 점수 / userAgent·IP는 서버에서 추출) | 없음 |
| GET | /scores | TOP N 조회 | 어드민 |
| GET | /scores/check?score=N | 해당 점수가 랭킹에 들 수 있는지 확인 | 없음 (선택사항) |
| PATCH | /scores/:id | 수정 | 어드민 |
| DELETE | /scores/:id | 삭제 | 어드민 |
| POST | /admin/login | 어드민 인증 | 없음 |

### 어드민 인증

- 환경변수 `ADMIN_PASSWORD`로 설정
- 로그인 → 서버에서 세션 토큰 또는 JWT 발급 → 이후 요청에 Bearer 토큰 포함
- 또는 단순하게: API Key를 `Authorization` 헤더에 넣는 방식
- → **구현 시점에 결정** (세션 vs JWT vs 단순 API Key)

---

## 5. API URL 설정

```javascript
// api.js — 환경별 API URL
const API_URL = window.__DINO_API_URL__
  || document.currentScript?.dataset?.apiUrl
  || 'https://your-api-domain.com';
```

---

## 6. 컴포넌트 구조

```
Game (게임 루프 + 상태 머신)
  ├─ SpriteLoader (이미지 preload + placeholder)        ← 신규
  ├─ Intro (타이틀 표시 + 떨어지는 연출)                ← 신규
  ├─ Dino (캐릭터 — 이미지 or placeholder 렌더링)
  ├─ Obstacle (장애물 — 이미지 or placeholder 렌더링)
  ├─ Ground (지면 — 이미지 타일 or placeholder)
  ├─ Cloud (구름)
  ├─ NightMode (밤/낮 전환)
  ├─ Score (점수 표시)
  └─ api.js (서버 통신)

Admin (어드민 페이지)                                   ← 신규
  └─ admin.js (로그인 + 랭킹 CRUD)
```

**재사용 컴포넌트 테이블**:

| 컴포넌트 | 경로 | 용도 |
| -------- | ---- | ---- |
| Game | `frontend/js/Game.js` | 게임 메인 루프 (수정: 상태 머신 확장) |
| SpriteLoader | `frontend/js/SpriteLoader.js` | 이미지 preload + placeholder 시스템 (신규) |
| Intro | `frontend/js/Intro.js` | 인트로 연출 (신규) |
| Dino | `frontend/js/Dino.js` | 캐릭터 로직 (수정: 이미지 렌더링) |
| Obstacle | `frontend/js/Obstacle.js` | 장애물 로직 (수정: 이미지 렌더링) |
| Ground | `frontend/js/Ground.js` | 지면 로직 (수정: 이미지 타일) |
| Score | `frontend/js/Score.js` | 점수 표시 (유지) |
| api.js | `frontend/js/api.js` | API 통신 (수정: URL 설정, 순위작성) |
| sprites.js | `frontend/js/sprites.js` | 제거 대상 (placeholder 시스템으로 대체) |
| admin.js | `frontend/js/admin.js` | 어드민 페이지 로직 (신규) |

---

## 7. 파일 구조

### 신규 생성

```
frontend/
  js/
    SpriteLoader.js          # 이미지 preload + placeholder 로직
    Intro.js                 # 인트로 화면 연출
    admin.js                 # 어드민 페이지 로직
  css/
    admin.css                # 어드민 페이지 스타일
  admin.html                 # 어드민 페이지
  assets/
    sprites/
      sprite-config.json     # 스프라이트 메타데이터
      (이미지 파일들)

backend/
  src/
    auth/
      auth.module.ts         # 어드민 인증 모듈
      auth.guard.ts          # API Key / JWT 가드
```

### 수정

```
frontend/
  dino-game.html     # 랭킹/이름입력 제거, 다시하기/순위작성 버튼 추가
  css/dino-game.css  # 버튼/입력 폼 스타일 추가
  js/
    Game.js          # 상태 머신 확장 (loading→intro→playing→gameover), SpriteLoader 통합
    Dino.js          # 이미지 렌더링 분기 추가
    Obstacle.js      # 이미지 렌더링 분기 추가
    Ground.js        # 이미지 타일 렌더링 분기 추가
    api.js           # API URL 설정, 순위작성 API, 랭킹/관리 제거
    config.js        # 스프라이트 경로 설정 추가

backend/
  src/
    scores/
      scores.service.ts      # UPSERT + 상위 N개 정리 + userAgent/IP 저장
      scores.controller.ts   # 어드민 가드 적용, 점수 체크 API 추가
    database/
      database.module.ts     # 스키마 변경 (contact, user_agent, ip_address 추가)
    main.ts                  # CORS 설정, frame-ancestors 헤더
```

---

## 8. 데이터 흐름

### 8.1 게임 시작 ~ 점수 저장

```
페이지 로드 → [loading 상태]
  │
  ├─ 타이틀 "Hellodude / Running Mouse" 표시
  ├─ SpriteLoader: sprite-config.json → 이미지 preload
  │   ├─ 성공 → 모든 이미지 로드 완료
  │   └─ 실패 → 컬러 박스 placeholder 사용
  │
  ▼
preload 완료 → [intro 상태]
  │
  ├─ "PRESS SPACE TO START" 표시
  ├─ 입력 리스닝 시작
  │
  ▼
Space/Tap → [playing 상태]
  │
  ├─ 타이틀 아래로 떨어지는 애니메이션
  ├─ 캐릭터(쥐) 좌측에서 달려나옴
  │
  ▼
게임 루프
  │
  ├─ Dino.update() + draw(이미지 or placeholder)
  ├─ Obstacle.update() + draw(이미지 or placeholder)
  ├─ Score.update()
  │
  ▼
충돌 → [gameover 상태]
  │
  ├─ GAME OVER 표시 (canvas 내)
  ├─ '다시하기' / '순위작성' 버튼 표시 (HTML)
  │
  ├─ '다시하기' 클릭 → [playing 상태]
  │
  └─ '순위작성' 클릭
       │
       ├─ 이름/연락처 입력 폼 표시
       │
       ├─ '제출' 클릭
       │   │
       │   ▼
       │   POST /scores { player_name, contact, score }
       │     │
       │     ▼
       │   서버: req.headers['user-agent'] + req.ip 추출
       │     │
       │     ▼
       │   UPSERT (최고 점수만 유지) → 상위 N개 초과분 DELETE
       │     │
       │     ▼
       │   "점수가 저장되었습니다!" → 버튼 복귀
       │
       └─ '취소' 클릭 → 버튼 복귀
```

### 8.2 어드민 플로우

```
admin.html 접속
  │
  ▼
비밀번호 입력 → POST /admin/login
  │
  ├─ 성공 → 토큰 저장 (sessionStorage)
  │   │
  │   ▼
  │   GET /scores (Authorization 헤더)
  │     │
  │     ▼
  │   전체 랭킹 테이블 표시
  │     ├─ [수정] → PATCH /scores/:id
  │     └─ [삭제] → DELETE /scores/:id
  │
  └─ 실패 → 에러 메시지
```

### 8.3 스프라이트 교체 플로우 (운영자)

```
1. assets/sprites/ 폴더의 WebP/PNG 파일 교체
2. sprite-config.json에서 size/hitbox 조정 (필요 시)
3. 프론트엔드 배포 (정적 파일만)
4. 캐시 무효화 (CDN 사용 시)
```

---

## 9. 인프라 / 배포

### 서버 비용 비교

| 옵션 | 프론트엔드 | 백엔드 | DB | 월 비용 |
| ---- | --------- | ------ | -- | ------- |
| **A. Supabase + NestJS** | GitHub Pages | 별도 필요 | Supabase PostgreSQL (500MB 무료) | $0 (DB만) |
| **B. Railway** | GitHub Pages | Railway (NestJS, $5 크레딧/월) | Railway PostgreSQL (500MB) | $0~5 |
| **C. Render** | GitHub Pages | Render free tier (cold start 있음) | Render PostgreSQL (무료 90일) | $0 |
| **D. Fly.io** | GitHub Pages | Fly.io free tier (3 shared VMs) | Fly.io PostgreSQL (1GB 무료) | $0 |

**권장: 옵션 B (Railway)** — NestJS 코드 그대로 배포 + DB 함께 제공 + $5 무료 크레딧이면 소규모 프로모션 충분.

**대안: 옵션 D (Fly.io)** — 완전 무료 + PostgreSQL 1GB.

→ **구현 시점에 결정**. 트래픽 예측과 운영 편의성에 따라 선택.

### CORS / iframe 보안

```typescript
// main.ts
app.enableCors({
  origin: ['https://your-store.com', 'https://www.your-store.com'],
});

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self' https://your-store.com");
  next();
});
```

---

## 10. 구현 순서

### Step 1: 인트로 화면 + 스프라이트 시스템

1. `SpriteLoader.js` 신규 작성 — `sprite-config.json` 파싱 + 이미지 preload + 컬러 박스 placeholder
2. `Intro.js` 신규 작성 — 타이틀 표시 + 떨어지는 애니메이션 연출
3. `Game.js` 수정 — 상태 머신 확장 (`loading` → `intro` → `playing` → `gameover`)
4. `Dino.js` 수정 — 이미지 있으면 `drawImage`, 없으면 컬러 박스+라벨 placeholder
5. `Obstacle.js` 수정 — 동일 패턴
6. `Ground.js` 수정 — 이미지 타일 or placeholder
7. `sprites.js` 제거 + 관련 import 정리
8. `utils.js` — `drawPixels()` 제거, `drawPlaceholder()` 추가

→ **리뷰 후 다음 Step 진행**

### Step 2: 게임오버 UX + 순위작성

1. `dino-game.html` 수정 — 랭킹/이름입력 제거, '다시하기'/'순위작성' 버튼 + 입력 폼 추가
2. `dino-game.css` 수정 — 버튼/폼 스타일
3. `Game.js` 수정 — gameover 시 버튼 표시/숨김 로직
4. `api.js` 수정 — `saveScore()`에 이름, 연락처 추가, API URL 설정 가능하게
5. 유저 정보 `sessionStorage` 저장/복원 로직 추가
6. 연락처 입력 실시간 포맷팅 + 클라이언트 validation

→ **리뷰 후 다음 Step 진행**

### Step 3: 백엔드 개선 (DB 스키마 + UPSERT + 어드민 인증)

1. `database.module.ts` — 스키마 변경 (contact, user_agent, ip_address, unique index)
2. `scores.service.ts` — UPSERT 로직 + 상위 N개 정리 + userAgent/IP 저장
3. `scores.controller.ts` — req에서 userAgent/IP 추출, 어드민 가드 적용
4. `auth/` 모듈 신규 — 로그인 + 가드
5. Rate limiting 추가 (POST /scores)

→ **리뷰 후 다음 Step 진행**

### Step 4: 어드민 페이지

1. `admin.html` + `admin.css` + `admin.js` 신규 작성
2. 로그인 → 전체 랭킹 조회 → 수정/삭제

→ **리뷰 후 다음 Step 진행**

### Step 5: iframe 최적화 + 배포

1. `main.ts` — CORS origin 설정, `frame-ancestors` 헤더
2. 배포 플랫폼 선택 및 설정
3. GitHub Actions 배포 워크플로우 수정 (백엔드 포함)
4. iframe 삽입 테스트 (PC + 모바일)

→ **리뷰 후 완료**

---

## 11. 참고 파일

| 파일 | 용도 |
| ---- | ---- |
| `frontend/js/sprites.js` | 현재 픽셀아트 스프라이트 — 제거 대상 |
| `frontend/js/utils.js` | `drawPixels()` → `drawPlaceholder()`로 대체 |
| `frontend/js/Game.js` | 게임 메인 루프 — 상태 머신 확장 대상 |
| `frontend/js/Dino.js` | 캐릭터 로직 — hitbox, 렌더링 방식 참고 |
| `frontend/js/Obstacle.js` | 장애물 로직 — 타입별 분기 참고 |
| `frontend/js/api.js` | API 통신 — 현재 엔드포인트 구조 참고 |
| `frontend/dino-game.html` | 현재 HTML 구조 — 랭킹/입력란 제거 대상 |
| `frontend/css/dino-game.css` | 현재 스타일 — 버튼/폼 스타일 추가 대상 |
| `backend/src/scores/scores.service.ts` | DB 쿼리 패턴 참고 |
| `backend/src/scores/scores.controller.ts` | API 엔드포인트 구조 참고 |
| `backend/src/database/database.module.ts` | DB 연결 설정, 스키마 변경 대상 |
| `backend/src/main.ts` | 서버 설정 — CORS/헤더 변경 대상 |
| `.github/workflows/deploy-pages.yml` | 현재 배포 워크플로우 |
