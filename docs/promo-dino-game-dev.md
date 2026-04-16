# Promo Dino Game 개발 문서

> 작성일: 2026-03-30
> 최종 수정: 2026-04-16 (클라이언트 기획 변경 반영)
> 관련 기획서: `promo-dino-game-spec.md`
> 대상 파일: `frontend/`, `backend/` (수정), 어드민 페이지 (신규), 인프라 설정 (신규)
> Figma: https://www.figma.com/design/gsANyIQ6n0utFXjlexeXq5/Untitled?node-id=23-407

---

## 1. 아키텍처 설계

```
┌─ Frontend: 게임 (Static / GitHub Pages) ──────────┐
│                                                     │
│  dino-game.html (iframe으로 삽입)                    │
│    ├─ js/Game.js          (게임 루프 + 상태 머신)    │
│    ├─ js/SpriteLoader.js  (이미지 preload)           │  ← 신규
│    ├─ js/Intro.js         (인트로 연출)              │  ← 신규
│    ├─ js/HappyEnding.js   (해피엔딩 연출)            │  ← 신규
│    ├─ js/DeathAnimation.js(사망 애니메이션)           │  ← 신규
│    ├─ js/Dino.js          (캐릭터)                   │
│    ├─ js/Obstacle.js      (장애물)                   │
│    ├─ js/api.js           (서버 통신)                │
│    └─ assets/sprites/     (placeholder 이미지)       │
│                                                     │
│  admin.html (별도 페이지, iframe 아님)               │  ← 신규
│    └─ js/admin.js                                   │  ← 신규
│                                                     │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS
                      ▼
┌─ Backend (NestJS) ──────────────────────────────────┐
│                                                     │
│  GET    /scores              (전체 조회, 어드민)     │
│  PATCH  /scores/:id          (수정, 어드민)          │
│  DELETE /scores/:id          (삭제, 어드민)          │
│  POST   /admin/login         (어드민 인증)           │  ← 신규
│  POST   /admin/sprites/:key  (이미지 업로드)         │  ← 신규
│  GET    /admin/sprites/:key  (이미지 조회)           │  ← 신규
│  GET    /sprites/:key        (게임용 이미지 조회)    │  ← 신규
│  GET    /settings            (게임 설정 조회)        │  ← 신규
│  PATCH  /admin/settings      (게임 설정 변경)        │  ← 신규
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
│                                                     │
│  game_settings 테이블                                │  ← 신규
│  - key, value (해피엔딩 점수 등)                     │
│                                                     │
│  sprites 테이블 (또는 파일 스토리지)                  │  ← 신규
│  - key, image_data, mime_type, updated_at           │
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
- 이미지 업로드/서빙 로직도 NestJS에서 처리
- 단, 배포 플랫폼은 변경 필요 (아래 인프라 섹션 참조)

**왜 sprite sheet가 아닌 개별 이미지 파일인가?**
- sprite sheet 한 장은 교체 편의성이 떨어짐
- 개별 파일이면 어드민에서 이미지별 교체 가능 → 프로모션마다 재사용 가능

**왜 이미지를 서버에 저장하는가?**
- 기존: `assets/sprites/` 폴더에 정적 파일 → 교체 시 프론트엔드 재배포 필요
- 변경: 서버에 업로드 → 어드민에서 즉시 교체, 재배포 불필요

---

## 2. 상태 머신

```
┌────────┐  preload 완료  ┌────────┐  Space/Tap  ┌──────────┐
│loading │──────────────▶│  intro │────────────▶│ playing  │
└────────┘               └────────┘             └──────────┘
                                                     │
                                          ┌──────────┴──────────┐
                                          │                     │
                                       충돌                  클리어
                                          │                     │
                                          ▼                     ▼
                                   ┌───────────┐        ┌────────────┐
                                   │ gameover  │        │happyending │  ← 신규
                                   └───────────┘        └────────────┘
                                          │                     │
                                          │  ↻ 클릭             │  ↻ 클릭
                                          │                     │
                                          └──────────┬──────────┘
                                                     │
                                                     ▼
                                               ┌──────────┐
                                               │ playing  │
                                               └──────────┘
```

- `loading`: 페이지 로드 → SpriteLoader가 이미지 preload 중. 타이틀만 표시.
- `intro`: preload 완료 → "PRESS SPACE TO START" 표시, 입력 리스닝
- `playing`: Space/Tap → 타이틀 떨어지는 연출 + 캐릭터 등장 → 게임 루프
- `gameover`: 충돌 → 사망 애니메이션 (표정 변화 → 공중 부유 → 낙하) → "Game Over" + ↻ 아이콘
  - ↻ 클릭 → "Game Over" 사라짐 + 캐릭터 왼쪽에서 재등장 → `playing`
- `happyending`: 트리거 점수 도달 → 장애물 중단 → 여친 쥐 등장 → 만남 → "Love wins all" + ↻ 아이콘
  - ↻ 클릭 → "Love wins all" 사라짐 + 오른쪽 캐릭터들 퇴장 + 캐릭터 왼쪽에서 재등장 → `playing`

---

## 3. 커스텀 스프라이트 시스템 구현

**현재**: `sprites.js`에 픽셀 좌표 배열로 하드코딩. `drawPixels()`로 1색 렌더링.

**변경**: 이미지 파일 기반 스프라이트 시스템으로 전환. 기존 픽셀아트는 제거. 이미지는 서버에서 동적으로 로드.

**이미지 로드 방식**:
- 게임 시작 시 `GET /sprites/:key` API로 서버에서 이미지를 로드
- 서버에 이미지가 없는 경우 → 컬러 박스 placeholder로 렌더링
- 어드민에서 이미지 업로드 시 서버에 저장 → 프론트엔드 재배포 없이 반영

**`sprite-config.json`** (프론트엔드에서 스프라이트 메타데이터 정의):

```json
{
  "format": "webp",
  "dino": {
    "run": ["dino-run-1.webp", "dino-run-2.webp"],
    "duck": ["dino-duck-1.webp", "dino-duck-2.webp"],
    "jump": ["dino-jump-1.webp", "dino-jump-2.webp"],
    "dead": ["dino-dead-1.webp", "dino-dead-2.webp"],
    "happyEnding": ["dino-happy-1.webp", "dino-happy-2.webp"],
    "size": { "w": 88, "h": 96 },
    "duckSize": { "w": 118, "h": 60 },
    "hitbox": { "x": 4, "y": 0, "w": 80, "h": 96 },
    "duckHitbox": { "x": 4, "y": 8, "w": 110, "h": 52 }
  },
  "girlfriend": {
    "idle": ["girlfriend-idle-1.webp", "girlfriend-idle-2.webp"],
    "happyEnding": ["girlfriend-happy-1.webp", "girlfriend-happy-2.webp"],
    "size": { "w": 88, "h": 96 }
  },
  "obstacles": [
    {
      "type": "obstacle-1",
      "sprites": ["obstacle-1-1.webp", "obstacle-1-2.webp"],
      "size": { "w": 34, "h": 70 },
      "hitbox": { "x": 2, "y": 0, "w": 30, "h": 70 }
    },
    {
      "type": "obstacle-2",
      "sprites": ["obstacle-2-1.webp", "obstacle-2-2.webp"],
      "size": { "w": 50, "h": 96 },
      "hitbox": { "x": 2, "y": 0, "w": 46, "h": 96 }
    },
    {
      "type": "obstacle-3",
      "sprites": ["obstacle-3-1.webp", "obstacle-3-2.webp"],
      "size": { "w": 80, "h": 96 },
      "hitbox": { "x": 2, "y": 0, "w": 76, "h": 96 }
    },
    {
      "type": "obstacle-4",
      "sprites": ["obstacle-4-1.webp", "obstacle-4-2.webp"],
      "size": { "w": 50, "h": 96 },
      "hitbox": { "x": 2, "y": 0, "w": 46, "h": 96 }
    },
    {
      "type": "obstacle-5",
      "sprites": ["obstacle-5-1.webp", "obstacle-5-2.webp"],
      "size": { "w": 50, "h": 96 },
      "hitbox": { "x": 2, "y": 0, "w": 46, "h": 96 }
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

> 장애물 4, 5의 size/hitbox는 실제 이미지 리소스 수령 후 확정 필요. 현재 값은 임시.

**placeholder (초기 구현)**: 실제 이미지 리소스가 준비되기 전까지, `sprite-config.json`의 size 정보를 기반으로 **해당 크기의 컬러 박스 + 라벨 텍스트**로 임시 렌더링. 기존 `sprites.js` 픽셀아트 fallback은 **제거**한다.

```
예시: 88x96 크기의 반투명 초록 박스 + "dino-run" 라벨
┌──────────┐
│ dino-run │  ← 컬러 박스 placeholder
└──────────┘
```

**preload 전략**: 인트로(loading) 화면에서 서버로부터 모든 스프라이트 이미지를 `new Image()` + `Promise.all`로 프리로드. 이미지가 없거나 로드 실패 시 해당 아이템은 컬러 박스 placeholder로 렌더링. 모든 로드 시도 완료 후 `intro` 상태로 전환하여 "PRESS SPACE TO START" 표시.

---

## 4. DB 스키마 + 시스템

### scores 테이블

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

### game_settings 테이블 (신규)

```sql
CREATE TABLE IF NOT EXISTS game_settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 초기 데이터
INSERT INTO game_settings (key, value) VALUES
  ('happy_ending_score', '10000');
```

### sprites 테이블 (신규)

```sql
CREATE TABLE IF NOT EXISTS sprites (
  key VARCHAR(100) PRIMARY KEY,        -- 예: "dino-run-1", "obstacle-1-1"
  image_data BYTEA NOT NULL,           -- 이미지 바이너리
  mime_type VARCHAR(20) NOT NULL,      -- "image/webp" 또는 "image/png"
  width INTEGER,                       -- 픽셀 너비
  height INTEGER,                      -- 픽셀 높이
  updated_at TIMESTAMP DEFAULT NOW()
);
```

> 대안: 파일 스토리지 (로컬 디스크 또는 S3). DB에 직접 저장하면 배포가 간단하지만 이미지가 많아지면 성능 저하 가능. 구현 시점에 결정.

### 상위 N개만 보관

```sql
-- INSERT 후 실행
DELETE FROM scores
WHERE id NOT IN (
  SELECT id FROM scores ORDER BY score DESC LIMIT $1
);
```

- N 값은 환경변수 `MAX_RANKING_SIZE`로 설정 (기본값: 500)

### API 명세

| Method | Path | 용도 | 인증 |
| ------ | ---- | ---- | ---- |
| GET | /scores | TOP N 조회 | 어드민 |
| PATCH | /scores/:id | 수정 | 어드민 |
| DELETE | /scores/:id | 삭제 | 어드민 |
| POST | /admin/login | 어드민 인증 | 없음 |
| POST | /admin/sprites/:key | 이미지 업로드 | 어드민 |
| GET | /admin/sprites/:key | 이미지 메타 조회 | 어드민 |
| GET | /sprites/:key | 게임용 이미지 조회 (바이너리) | 없음 |
| GET | /settings | 게임 설정 조회 (해피엔딩 점수 등) | 없음 |
| PATCH | /admin/settings | 게임 설정 변경 | 어드민 |

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
  ├─ Girlfriend (여친 쥐 — 해피엔딩 시 등장)            ← 신규
  ├─ Obstacle (장애물 — 이미지 or placeholder 렌더링)
  ├─ Ground (지면 — 이미지 타일 or placeholder)
  ├─ Cloud (구름)
  ├─ NightMode (밤/낮 전환)
  ├─ Score (점수 표시 — 50점 단위)
  ├─ HappyEnding (해피엔딩 연출 시퀀스)                 ← 신규
  ├─ DeathAnimation (사망 애니메이션 시퀀스)             ← 신규
  └─ api.js (서버 통신)

Admin (어드민 페이지)                                   ← 신규
  └─ admin.js (로그인 + 랭킹 CRUD + 이미지 업로드 + 게임 설정)
```

**재사용 컴포넌트 테이블**:

| 컴포넌트 | 경로 | 용도 |
| -------- | ---- | ---- |
| Game | `frontend/js/Game.js` | 게임 메인 루프 (수정: 상태 머신 확장, happyending 상태 추가) |
| SpriteLoader | `frontend/js/SpriteLoader.js` | 이미지 preload + placeholder 시스템 (신규) |
| Intro | `frontend/js/Intro.js` | 인트로 연출 (신규) |
| HappyEnding | `frontend/js/HappyEnding.js` | 해피엔딩 연출 시퀀스 (신규) |
| DeathAnimation | `frontend/js/DeathAnimation.js` | 사망 애니메이션 시퀀스 (신규) |
| Girlfriend | `frontend/js/Girlfriend.js` | 여친 쥐 캐릭터 (신규) |
| Dino | `frontend/js/Dino.js` | 캐릭터 로직 (수정: 이미지 렌더링, 해피엔딩 스프라이트) |
| Obstacle | `frontend/js/Obstacle.js` | 장애물 로직 (수정: 5종 장애물, 이미지 렌더링) |
| Ground | `frontend/js/Ground.js` | 지면 로직 (수정: 이미지 타일) |
| Score | `frontend/js/Score.js` | 점수 표시 (수정: 50점 단위) |
| api.js | `frontend/js/api.js` | API 통신 (수정: URL 설정, 스프라이트/설정 API) |
| sprites.js | `frontend/js/sprites.js` | 제거 대상 (placeholder 시스템으로 대체) |
| admin.js | `frontend/js/admin.js` | 어드민 페이지 로직 (신규: 이미지 업로드 + 설정 관리 포함) |

---

## 7. 파일 구조

### 신규 생성

```
frontend/
  js/
    SpriteLoader.js          # 이미지 preload + placeholder 로직
    Intro.js                 # 인트로 화면 연출
    HappyEnding.js           # 해피엔딩 연출 시퀀스
    DeathAnimation.js        # 사망 애니메이션 시퀀스
    Girlfriend.js            # 여친 쥐 캐릭터
    admin.js                 # 어드민 페이지 로직 (이미지 업로드 + 설정 관리 포함)
  css/
    admin.css                # 어드민 페이지 스타일
  admin.html                 # 어드민 페이지
  assets/
    sprites/
      sprite-config.json     # 스프라이트 메타데이터

backend/
  src/
    auth/
      auth.module.ts         # 어드민 인증 모듈
      auth.guard.ts          # API Key / JWT 가드
    sprites/
      sprites.module.ts      # 이미지 업로드/서빙 모듈
      sprites.controller.ts  # 이미지 API 엔드포인트
      sprites.service.ts     # 이미지 저장/조회 로직
    settings/
      settings.module.ts     # 게임 설정 모듈
      settings.controller.ts # 설정 API 엔드포인트
      settings.service.ts    # 설정 저장/조회 로직
```

### 수정

```
frontend/
  dino-game.html     # 랭킹/이름입력 제거, ↻ 아이콘 추가
  css/dino-game.css  # 다시하기 아이콘 스타일, 폰트(EXEPixelPerfect) 추가
  js/
    Game.js          # 상태 머신 확장 (happyending 추가), 점프 입력 영역 확장
    Dino.js          # 이미지 렌더링 + 해피엔딩 스프라이트
    Obstacle.js      # 5종 장애물, 이미지 렌더링
    Ground.js        # 이미지 타일 렌더링
    Score.js         # 50점 단위 증가
    api.js           # API URL 설정, 스프라이트/설정 API 통신
    config.js        # 스프라이트 경로 설정

backend/
  src/
    scores/
      scores.service.ts      # 상위 N개 정리 + userAgent/IP 저장
      scores.controller.ts   # 어드민 가드 적용
    database/
      database.module.ts     # 스키마 변경 (game_settings, sprites 테이블 추가)
    main.ts                  # CORS 설정, frame-ancestors 헤더
```

---

## 8. 데이터 흐름

### 8.1 게임 시작 ~ 게임오버

```
페이지 로드 → [loading 상태]
  │
  ├─ 타이틀 "Run Dude Run!" 표시
  ├─ GET /settings → 해피엔딩 트리거 점수 로드
  ├─ SpriteLoader: GET /sprites/:key → 이미지 preload
  │   ├─ 성공 → 이미지 로드 완료
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
  ├─ Obstacle.update() + draw(5종 장애물 + 비행 장애물)
  ├─ Score.update() (50점 단위 증가)
  ├─ 점프 입력: 페이지 전체 영역 리스닝
  │
  ├─ 충돌 → [gameover 상태]
  │   │
  │   ├─ DeathAnimation 시작
  │   │   ├─ 쥐 멈춤 + 죽은 쥐 스프라이트 적용
  │   │   ├─ 쥐 + 장애물 함께 공중 부유
  │   │   └─ 아래로 낙하하며 사라짐
  │   │
  │   ├─ "Game Over" 표시 + ↻ 아이콘
  │   │
  │   └─ ↻ 클릭 → "Game Over" 사라짐 + 캐릭터 재등장 → [playing 상태]
  │
  └─ 해피엔딩 트리거 점수 도달 → [happyending 상태]
       │
       ├─ 장애물 등장 중단
       ├─ 여친 쥐(Girlfriend) 화면 오른쪽에 대기
       ├─ 주인공 오른쪽으로 이동
       ├─ 만남 → 두 쥐 눈이 하트
       ├─ "Love wins all" 표시 + ↻ 아이콘
       │
       └─ ↻ 클릭
            ├─ "Love wins all" 사라짐
            ├─ 오른쪽 캐릭터들 오른쪽으로 퇴장
            └─ 캐릭터 왼쪽에서 재등장 → [playing 상태]
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
  │   ── 랭킹 관리 ──
  │   GET /scores (Authorization 헤더)
  │     │
  │     ▼
  │   전체 랭킹 테이블 표시
  │     ├─ [수정] → PATCH /scores/:id
  │     └─ [삭제] → DELETE /scores/:id
  │
  │   ── 이미지 관리 ──
  │   각 스프라이트별:
  │     ├─ 현재 이미지 표시 (GET /admin/sprites/:key)
  │     └─ [업로드] → POST /admin/sprites/:key (multipart/form-data)
  │         ├─ 픽셀 크기 검증 → 불일치 시 거부
  │         └─ 성공 → 즉시 반영
  │
  │   ── 게임 설정 ──
  │   GET /settings → 현재 해피엔딩 트리거 점수 표시
  │     └─ [저장] → PATCH /admin/settings { happy_ending_score: N }
  │
  └─ 실패 → 에러 메시지
```

### 8.3 스프라이트 교체 플로우 (운영자)

```
1. 어드민 페이지 로그인
2. 이미지 관리 탭에서 교체할 스프라이트 선택
3. 새 이미지 업로드 (픽셀 크기 자동 검증)
4. 업로드 즉시 게임에 반영 (프론트엔드 재배포 불필요)
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

1. `SpriteLoader.js` 신규 작성 — 서버에서 이미지 로드 + 컬러 박스 placeholder
2. `Intro.js` 신규 작성 — 타이틀 "Run Dude Run!" 표시 + 떨어지는 애니메이션 연출
3. `Game.js` 수정 — 상태 머신 확장 (`loading` → `intro` → `playing` → `gameover` → `happyending`)
4. `Dino.js` 수정 — 이미지 있으면 `drawImage`, 없으면 컬러 박스+라벨 placeholder
5. `Obstacle.js` 수정 — 5종 장애물, 동일 패턴
6. `Ground.js` 수정 — 이미지 타일 or placeholder
7. `sprites.js` 제거 + 관련 import 정리
8. `utils.js` — `drawPixels()` 제거, `drawPlaceholder()` 추가
9. `Score.js` 수정 — 50점 단위 증가
10. 폰트(EXEPixelPerfect) 적용
11. 점프 입력 영역 → 페이지 전체로 확장

→ **리뷰 후 다음 Step 진행**

### Step 2: 게임오버 UX + 사망 연출

1. `DeathAnimation.js` 신규 작성 — 표정 변화 → 공중 부유 → 낙하 시퀀스
2. `dino-game.html` 수정 — 랭킹/이름입력 제거, ↻ 아이콘 추가
3. `dino-game.css` 수정 — ↻ 아이콘 스타일
4. `Game.js` 수정 — gameover 시 사망 애니메이션 → ↻ 아이콘 표시/숨김 로직
5. 다시하기 시 "Game Over" 사라짐 + 캐릭터 재등장 연출

→ **리뷰 후 다음 Step 진행**

### Step 3: 해피엔딩 시나리오

1. `HappyEnding.js` 신규 작성 — 해피엔딩 연출 시퀀스
2. `Girlfriend.js` 신규 작성 — 여친 쥐 캐릭터 (대기 + 해피엔딩 스프라이트)
3. `Dino.js` 수정 — 해피엔딩 스프라이트 (눈이 하트)
4. `Game.js` 수정 — happyending 상태 전환, 트리거 점수 체크
5. 다시하기 시 오른쪽 캐릭터 퇴장 + 캐릭터 재등장 연출

→ **리뷰 후 다음 Step 진행**

### Step 4: 백엔드 + 어드민 페이지

1. `database.module.ts` — game_settings, sprites 테이블 추가
2. `sprites/` 모듈 신규 — 이미지 업로드/서빙 API
3. `settings/` 모듈 신규 — 게임 설정 API
4. `auth/` 모듈 신규 — 로그인 + 가드
5. `admin.html` + `admin.css` + `admin.js` 신규 작성
6. 랭킹 관리 + 이미지 업로드 + 해피엔딩 점수 관리

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
| `frontend/css/dino-game.css` | 현재 스타일 — 아이콘/폰트 스타일 추가 대상 |
| `backend/src/scores/scores.service.ts` | DB 쿼리 패턴 참고 |
| `backend/src/scores/scores.controller.ts` | API 엔드포인트 구조 참고 |
| `backend/src/database/database.module.ts` | DB 연결 설정, 스키마 변경 대상 |
| `backend/src/main.ts` | 서버 설정 — CORS/헤더 변경 대상 |
| `.github/workflows/deploy-pages.yml` | 현재 배포 워크플로우 |
