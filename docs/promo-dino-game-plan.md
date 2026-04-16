# Promo Dino Game PRD

> 작성일: 2026-03-30
> 최종 수정: 2026-04-16 (클라이언트 기획 변경 반영)
> 대상 파일: `frontend/`, `backend/` (수정), 어드민 페이지 (신규), 인프라 설정 (신규)
> Figma: https://www.figma.com/design/gsANyIQ6n0utFXjlexeXq5/Untitled?node-id=23-407

---

## 1. 개요 / 현황 분석

온라인 스토어 프로모션용 크롬 다이노 게임. 커스텀 캐릭터(쥐)로 교체 가능하고, 일정 점수 도달 시 해피엔딩 연출이 재생된다. iframe으로 삽입되므로 완전히 독립적으로 동작해야 한다.

| 항목 | 현재 | 필요 |
| ---- | ---- | ---- |
| 캐릭터 | 픽셀아트 하드코딩 (`sprites.js`) | 이미지 파일 교체 가능한 스프라이트 시스템 (어드민 업로드) |
| 장애물 | 선인장/익룡 픽셀아트 하드코딩 3종+비행1종 | 이미지 파일 교체 가능, 5종+비행1종 |
| 인트로 화면 | 없음 (바로 idle 상태) | 타이틀 "Run Dude Run!" + preload 후 시작 |
| 게임 종료 | 장애물 충돌 시 게임오버만 존재 | 게임오버 + 해피엔딩 시나리오 |
| 점수 | 1점 단위 증가 | 50점 단위 증가 |
| 게임오버 UI | 다시하기/순위작성 버튼 | 사망 애니메이션 + 다시하기 아이콘(↻)만 |
| 랭킹 UI | 게임 화면에 랭킹 + edit/delete 노출 | 유저에게 미노출, 어드민 페이지 별도 |
| 유저 정보 | player_name만 저장 | 이름 + 연락처 + userAgent + IP 저장 |
| API URL | `http://localhost:3001` 하드코딩 | 환경별 설정 가능 |
| 배포 | GitHub Pages (프론트만) | 프론트 + 백엔드 모두 프로덕션 배포 |
| iframe | 미지원 | iframe 삽입 최적화 |
| 화면 크기 | canvas 600x150 고정 | 모바일 375x208, PC 1920px 폭 |
| 폰트 | 미지정 | EXEPixelPerfect (픽셀 폰트) |
| 점프 입력 | 캔버스 영역만 | 페이지 전체 영역 |

---

## 2. 디자인 명세

### 2.0 인트로 화면

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                                                 │
│             Run Dude Run!                       │
│                                                 │
│                                                 │
│  ─────────────────────────────────────────────── │
│                                                 │
└─────────────────────────────────────────────────┘

        ↓ 이미지 preload 완료 후

┌─────────────────────────────────────────────────┐
│                                                 │
│                                                 │
│             Run Dude Run!                       │
│                                                 │
│         PRESS SPACE TO START                    │
│  ─────────────────────────────────────────────── │
│           or tap the screen                     │
└─────────────────────────────────────────────────┘

        ↓ Space/Tap 입력 시

┌─────────────────────────────────────────────────┐
│                                                 │
│                    ↓ (타이틀 아래로 떨어짐)       │
│             Run Dude Run!                       │
│                                                 │
│  🐭→                                            │  ← 쥐가 좌측에서 달려나옴
│  ─────────────────────────────────────────────── │
│                                                 │
└─────────────────────────────────────────────────┘
```

- 타이틀 "Run Dude Run!"을 canvas 중앙에 표시
- SpriteLoader가 모든 이미지 preload 완료 → "PRESS SPACE TO START" 텍스트 표시 + 입력 리스닝 시작
- Space/Tap → 타이틀이 아래로 떨어지는 애니메이션 + 캐릭터(쥐)가 좌측에서 달려나오며 게임 시작

### 2.1 게임 화면

```
┌─────────────────────────────────────────────────┐
│  HI 00350    00650                              │  ← 점수 (우상단, 50점 단위)
│                                                 │
│                                                 │
│                                                 │
│        🐭          🌵       🌵🌵    🦅          │  ← 캐릭터 + 장애물 (5종+비행1종)
│  ─────────────────────────────────────────────── │  ← 지면
│                                                 │
└─────────────────────────────────────────────────┘
```

- 랭킹, 이름 입력란 없음 — 게임 화면은 canvas만
- 점수는 50점 단위로 증가
- 점프 입력: 페이지 전체 영역 클릭/탭 시 점프
- 반응형: 모바일 375x208, PC 1920px 폭 기준 스케일링

### 2.2 Game Over 상태

```
┌─────────────────────────────────────────────────┐
│  HI 00350    00650                              │
│                                                 │
│              Game Over                          │
│                                                 │
│                                                 │
│  ─────────────────────────────────────────────── │
│                                                 │
│                  ↻                               │  ← 다시하기 아이콘
│                                                 │
└─────────────────────────────────────────────────┘
```

**사망 애니메이션**:
1. 장애물 충돌 → 쥐 멈춤 + 죽은 쥐 스프라이트 적용
2. 쥐와 장애물이 함께 공중에 뜸
3. 아래로 떨어지며 사라짐
4. "Game Over" 표시 + ↻ 아이콘

- ↻ 클릭 → "Game Over" 사라짐 + 쥐 왼쪽에서 재등장 → 게임 restart

### 2.3 해피엔딩 화면

```
┌─────────────────────────────────────────────────┐
│                               10000              │
│                                                 │
│            Love wins all                        │
│                                                 │
│                     🐭♥🐭(흰)                    │  ← 둘 다 눈이 하트
│  ─────────────────────────────────────────────── │
│                                                 │
│                  ↻                               │  ← 다시하기 아이콘
│                                                 │
└─────────────────────────────────────────────────┘
```

**해피엔딩 흐름**:
1. 트리거 점수 도달 → 장애물 등장 중단
2. 여친 쥐(흰색) 화면 오른쪽에 대기
3. 주인공이 오른쪽으로 달려감 (기존 제자리 달리기와 다름)
4. 여친 쥐에 도달 → 두 쥐 눈이 하트
5. "Love wins all" + ↻ 아이콘

- ↻ 클릭 → 텍스트 사라짐 + 오른쪽 캐릭터들 퇴장 + 쥐 왼쪽에서 재등장 → 게임 restart

### 2.4 모바일 레이아웃

```
┌──────────────────────┐
│   HI 00350   00650    │
│                      │
│    🐭     🌵   🦅   │
│  ──────────────────  │
│                      │
│         ↻            │
│                      │
└──────────────────────┘
```

동일 구조. canvas CSS 스케일링 + 모바일 375x208 기준.

---

## 3. 상태 머신

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
                                   │ gameover  │        │happyending │
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
- `gameover`: 충돌 → 사망 애니메이션 → "Game Over" + ↻ 아이콘
  - ↻ 클릭 → `playing`
- `happyending`: 트리거 점수 도달 → 여친 쥐 등장 → 만남 → "Love wins all" + ↻ 아이콘
  - ↻ 클릭 → `playing`

---

## 4. 핵심 기능 명세

### 4.1 커스텀 스프라이트 시스템

**현재**: `sprites.js`에 픽셀 좌표 배열로 하드코딩. `drawPixels()`로 1색 렌더링.

**변경**: 이미지 파일 기반 스프라이트 시스템으로 전환. 기존 픽셀아트는 제거. 이미지는 서버에서 동적으로 로드하며, 어드민에서 업로드하여 교체.

**이미지 포맷**: WebP 권장 (PNG 대비 30~50% 용량 절감, 모든 모던 브라우저 지원). PNG도 허용 (fallback 호환성).

**모든 이미지는 2프레임 루프로 동작** — 달리기, 숙이기, 날아다니는 장애물 모두 2장 교대.

**각 아이템별 권장 이미지 크기**:

| 아이템 | 파일 | 크기 (px) | 비고 |
| ------ | ---- | --------- | ---- |
| 캐릭터 달리기 | dino-run-1.webp, dino-run-2.webp | 88 x 96 | 2프레임 루프 |
| 캐릭터 숙이기 | dino-duck-1.webp, dino-duck-2.webp | 118 x 60 | 2프레임 루프, 넓고 낮게 |
| 캐릭터 점프 | dino-jump-1.webp, dino-jump-2.webp | 88 x 96 | 2프레임 루프 |
| 캐릭터 사망 | dino-dead-1.webp, dino-dead-2.webp | 88 x 96 | 2프레임 루프 |
| 해피엔딩 쥐 | dino-happy-1.webp, dino-happy-2.webp | 추후 확정 | 눈이 하트 |
| 여친 쥐 (대기) | girlfriend-idle-1.webp, girlfriend-idle-2.webp | 추후 확정 | 해피엔딩 시 등장 |
| 해피엔딩 여친 쥐 | girlfriend-happy-1.webp, girlfriend-happy-2.webp | 추후 확정 | 눈이 하트 |
| 장애물 1 | obstacle-1-1.webp, obstacle-1-2.webp | 추후 확정 | 지면 장애물 |
| 장애물 2 | obstacle-2-1.webp, obstacle-2-2.webp | 추후 확정 | 지면 장애물 |
| 장애물 3 | obstacle-3-1.webp, obstacle-3-2.webp | 추후 확정 | 지면 장애물 |
| 장애물 4 | obstacle-4-1.webp, obstacle-4-2.webp | 추후 확정 | 지면 장애물 |
| 장애물 5 | obstacle-5-1.webp, obstacle-5-2.webp | 추후 확정 | 지면 장애물 |
| 날아다니는 장애물 | obstacle-fly-1.webp, obstacle-fly-2.webp | 84 x 60 | 공중 장애물, 2프레임 루프 |
| 지면 타일 | ground.webp | 2400 x 24 | 가로로 반복 스크롤 |

> 크기는 canvas 기준. 실제 렌더링 시 scale 적용.
> 초기 구현 시 이미지 리소스 없이 컬러 박스+라벨 placeholder로 동작해야 함. sprites.js fallback 제거.

**`sprite-config.json` 예시**:

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
    { "type": "obstacle-1", "sprites": ["obstacle-1-1.webp", "obstacle-1-2.webp"], "size": { "w": 34, "h": 70 }, "hitbox": { "x": 2, "y": 0, "w": 30, "h": 70 } },
    { "type": "obstacle-2", "sprites": ["obstacle-2-1.webp", "obstacle-2-2.webp"], "size": { "w": 50, "h": 96 }, "hitbox": { "x": 2, "y": 0, "w": 46, "h": 96 } },
    { "type": "obstacle-3", "sprites": ["obstacle-3-1.webp", "obstacle-3-2.webp"], "size": { "w": 80, "h": 96 }, "hitbox": { "x": 2, "y": 0, "w": 76, "h": 96 } },
    { "type": "obstacle-4", "sprites": ["obstacle-4-1.webp", "obstacle-4-2.webp"], "size": { "w": 50, "h": 96 }, "hitbox": { "x": 2, "y": 0, "w": 46, "h": 96 } },
    { "type": "obstacle-5", "sprites": ["obstacle-5-1.webp", "obstacle-5-2.webp"], "size": { "w": 50, "h": 96 }, "hitbox": { "x": 2, "y": 0, "w": 46, "h": 96 } }
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

> 장애물 4, 5의 size/hitbox는 실제 이미지 리소스 수령 후 확정 필요.

**이미지 교체 방법**: 어드민 페이지에서 이미지 업로드 → 서버에 저장 → 즉시 반영 (프론트엔드 재배포 불필요).

**placeholder (초기 구현)**: 실제 이미지 리소스가 준비되기 전까지, `sprite-config.json`의 size 정보를 기반으로 **해당 크기의 컬러 박스 + 라벨 텍스트**로 임시 렌더링. 기존 `sprites.js` 픽셀아트 fallback은 **제거**한다.

**preload 전략**: 인트로(loading) 화면에서 서버로부터 모든 스프라이트 이미지를 프리로드. 이미지가 없거나 로드 실패 시 해당 아이템은 컬러 박스 placeholder로 렌더링. 모든 로드 시도 완료 후 `intro` 상태로 전환하여 "PRESS SPACE TO START" 표시.

### 4.2 점수 시스템

- **점수 증가**: 50점 단위 (기존 1점 단위에서 변경)
- **속도 증가**: 크롬 다이노 게임의 속도 증가 패턴을 그대로 적용
- **해피엔딩 트리거**: 일정 점수 도달 시 해피엔딩 진입. 트리거 점수는 어드민에서 변경 가능.

**DB 스키마**:

```sql
CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  player_name VARCHAR(50) NOT NULL,
  contact VARCHAR(100) NOT NULL,
  score INTEGER NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_unique_contact
  ON scores (contact);
```

**게임 설정 테이블**:

```sql
CREATE TABLE IF NOT EXISTS game_settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**상위 N개만 보관**:

```sql
DELETE FROM scores
WHERE id NOT IN (
  SELECT id FROM scores ORDER BY score DESC LIMIT $1
);
```

- N 값은 환경변수 `MAX_RANKING_SIZE`로 설정 (기본값: 500)

**API 변경**:

| Method | Path | 용도 | 인증 |
| ------ | ---- | ---- | ---- |
| GET | /scores | TOP N 조회 | 어드민 |
| PATCH | /scores/:id | 수정 | 어드민 |
| DELETE | /scores/:id | 삭제 | 어드민 |
| POST | /admin/login | 어드민 인증 | 없음 |
| POST | /admin/sprites/:key | 이미지 업로드 | 어드민 |
| GET | /sprites/:key | 게임용 이미지 조회 | 없음 |
| GET | /settings | 게임 설정 조회 | 없음 |
| PATCH | /admin/settings | 게임 설정 변경 | 어드민 |

### 4.3 어드민 페이지

별도 HTML 페이지 (`frontend/admin.html` 또는 별도 경로).

```
┌─────────────────────────────────────────────────┐
│              DINO GAME ADMIN                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  [로그인 폼]                                     │
│  비밀번호: [____________]  [로그인]               │
│                                                 │
└─────────────────────────────────────────────────┘

        ↓ 로그인 성공 후

┌─────────────────────────────────────────────────┐
│  DINO GAME ADMIN                    [로그아웃]   │
├─────────────────────────────────────────────────┤
│                                                 │
│  [랭킹 관리] [이미지 관리] [게임 설정]            │
│                                                 │
│  ── 랭킹 관리 ──                                 │
│  #  | 연락처          | 점수 | 날짜              │
│  1  | 010-****-5678  | 1200 | 03-30             │
│  ...                                            │
│  각 행: [수정] [삭제]                             │
│                                                 │
│  ── 이미지 관리 ──                                │
│  달리는 쥐: [현재 이미지] [업로드]                 │
│  장애물 1~5: [현재 이미지] [업로드]               │
│  ...                                            │
│                                                 │
│  ── 게임 설정 ──                                  │
│  해피엔딩 트리거 점수: [10000] [저장]             │
│                                                 │
└─────────────────────────────────────────────────┘
```

**인증**: 간단한 API Key 또는 비밀번호 기반. 환경변수 `ADMIN_PASSWORD`로 설정.
- 로그인 → 서버에서 세션 토큰 또는 JWT 발급 → 이후 요청에 Bearer 토큰 포함
- → **구현 시점에 결정** (세션 vs JWT vs 단순 API Key).

**이미지 업로드 관리**:
- 업로드 시 픽셀 크기 검증 (지정 크기와 불일치 시 업로드 거부)
- WebP/PNG 포맷만 허용
- 업로드 즉시 반영

**해피엔딩 점수 관리**:
- 해피엔딩 트리거 점수를 어드민에서 변경 가능
- 변경 시 즉시 반영

### 4.4 iframe 삽입 최적화

```html
<!-- 스토어 페이지에서 삽입 -->
<iframe
  src="https://your-domain.com/dino-game.html"
  width="100%"
  height="300"
  frameborder="0"
  allow="autoplay"
  style="max-width: 640px;"
></iframe>
```

고려 사항:
- `Content-Security-Policy: frame-ancestors` 설정으로 허용 도메인 제한
- iframe 내 포커스 처리 (클릭 시 자동 포커스)

### 4.5 API URL 설정

```javascript
// api.js — 환경별 API URL
const API_URL = window.__DINO_API_URL__
  || document.currentScript?.dataset?.apiUrl
  || 'https://your-api-domain.com';
```

---

## 5. 아키텍처 설계

```
┌─ Frontend: 게임 (Static / GitHub Pages) ──────────┐
│                                                     │
│  dino-game.html (iframe으로 삽입)                    │
│    ├─ js/Game.js          (게임 루프 + 상태 머신)    │
│    ├─ js/SpriteLoader.js  (이미지 preload)           │  ← 신규
│    ├─ js/Intro.js         (인트로 연출)              │  ← 신규
│    ├─ js/HappyEnding.js   (해피엔딩 연출)            │  ← 신규
│    ├─ js/DeathAnimation.js(사망 애니메이션)           │  ← 신규
│    ├─ js/Girlfriend.js    (여친 쥐 캐릭터)           │  ← 신규
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
│  sprites 테이블                                      │  ← 신규
└─────────────────────────────────────────────────────┘
```

### 설계 결정 근거

**왜 이미지 스프라이트 시스템인가?**
- 현재 `sprites.js`의 픽셀 좌표 배열은 캐릭터 교체가 사실상 불가능
- 이미지 파일 교체만으로 캐릭터를 바꿀 수 있어야 프로모션마다 재사용 가능
- 대안: sprite sheet 한 장 → 교체 편의성이 떨어져 기각

**왜 이미지를 서버에 저장하는가?**
- 기존: 정적 파일 교체 + 프론트엔드 재배포 필요
- 변경: 어드민에서 업로드 → 즉시 반영, 재배포 불필요

**왜 WebP인가?**
- PNG 대비 30~50% 용량 절감 → 모바일 로딩 속도 개선
- 2025년 기준 모든 모던 브라우저 지원 (IE 미지원이지만 대상 아님)
- PNG도 허용하여 디자이너가 WebP 변환을 못 하는 경우 대응

**왜 인트로 화면을 추가하는가?**
- preload 시간 동안 빈 화면 대신 브랜드 노출 (Run Dude Run!)
- 이미지 로드 완료 전 게임 시작을 방지하여 렌더링 깨짐 방지

**왜 유저 화면에서 랭킹을 숨기는가?**
- 프로모션 목적상 순위 경쟁보다 참여 유도가 중요
- 연락처 등 개인정보가 포함되므로 유저에게 직접 노출 부적절
- 어드민이 별도로 관리하여 경품 지급 등에 활용

**왜 NestJS를 유지하는가?**
- 이미 구축된 코드가 있고, CRUD가 단순하여 서버리스 전환 대비 이점 없음
- userAgent/IP 추출 등 서버 사이드 로직이 필요
- 이미지 업로드/서빙 로직도 NestJS에서 처리
- 단, 배포 플랫폼은 변경 필요 (아래 인프라 섹션 참조)

---

## 6. 컴포넌트 구조

```
Game (게임 루프 + 상태 머신)
  ├─ SpriteLoader (이미지 preload + placeholder)        ← 신규
  ├─ Intro (타이틀 표시 + 떨어지는 연출)                ← 신규
  ├─ Dino (캐릭터 — 이미지 or placeholder 렌더링)
  ├─ Girlfriend (여친 쥐)                               ← 신규
  ├─ Obstacle (장애물 — 5종 + 비행 1종)
  ├─ Ground (지면 — 이미지 타일 or placeholder)
  ├─ Cloud (구름)
  ├─ NightMode (밤/낮 전환)
  ├─ Score (점수 표시 — 50점 단위)
  ├─ HappyEnding (해피엔딩 연출)                        ← 신규
  ├─ DeathAnimation (사망 애니메이션)                    ← 신규
  └─ api.js (서버 통신)

Admin (어드민 페이지)                                   ← 신규
  └─ admin.js (로그인 + 랭킹 CRUD + 이미지 업로드 + 게임 설정)
```

**재사용 컴포넌트 테이블**:

| 컴포넌트 | 경로 | 용도 |
| -------- | ---- | ---- |
| Game | `frontend/js/Game.js` | 게임 메인 루프 (수정: happyending 상태 추가) |
| SpriteLoader | `frontend/js/SpriteLoader.js` | 이미지 preload + placeholder 시스템 (신규) |
| Intro | `frontend/js/Intro.js` | 인트로 연출 (신규) |
| HappyEnding | `frontend/js/HappyEnding.js` | 해피엔딩 연출 (신규) |
| DeathAnimation | `frontend/js/DeathAnimation.js` | 사망 애니메이션 (신규) |
| Girlfriend | `frontend/js/Girlfriend.js` | 여친 쥐 캐릭터 (신규) |
| Dino | `frontend/js/Dino.js` | 캐릭터 로직 (수정: 이미지 렌더링, 해피엔딩 스프라이트) |
| Obstacle | `frontend/js/Obstacle.js` | 장애물 로직 (수정: 5종, 이미지 렌더링) |
| Ground | `frontend/js/Ground.js` | 지면 로직 (수정: 이미지 타일) |
| Score | `frontend/js/Score.js` | 점수 표시 (수정: 50점 단위) |
| api.js | `frontend/js/api.js` | API 통신 (수정: 스프라이트/설정 API) |
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
    HappyEnding.js           # 해피엔딩 연출
    DeathAnimation.js        # 사망 애니메이션
    Girlfriend.js            # 여친 쥐 캐릭터
    admin.js                 # 어드민 페이지 로직
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
      sprites.controller.ts  # 이미지 API
      sprites.service.ts     # 이미지 저장/조회
    settings/
      settings.module.ts     # 게임 설정 모듈
      settings.controller.ts # 설정 API
      settings.service.ts    # 설정 저장/조회
```

### 수정

```
frontend/
  dino-game.html     # 랭킹/이름입력 제거, ↻ 아이콘 추가
  css/dino-game.css  # 아이콘 스타일, 폰트(EXEPixelPerfect) 추가
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

### 8.1 게임 시작 ~ 게임오버/해피엔딩

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
게임 루프 (점수 50점 단위 증가, 페이지 전체 점프 입력)
  │
  ├─ 충돌 → [gameover 상태]
  │   ├─ 사망 애니메이션 → "Game Over" + ↻
  │   └─ ↻ → [playing 상태]
  │
  └─ 트리거 점수 도달 → [happyending 상태]
       ├─ 여친 쥐 등장 → 만남 → "Love wins all" + ↻
       └─ ↻ → [playing 상태]
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
  │   ├─ 랭킹 관리: GET /scores → 조회/수정/삭제
  │   ├─ 이미지 관리: POST /admin/sprites/:key → 업로드
  │   └─ 게임 설정: PATCH /admin/settings → 해피엔딩 점수 변경
  │
  └─ 실패 → 에러 메시지
```

### 8.3 스프라이트 교체 플로우 (운영자)

```
1. 어드민 페이지 로그인
2. 이미지 관리에서 교체할 스프라이트 선택
3. 새 이미지 업로드 (픽셀 크기 자동 검증)
4. 업로드 즉시 게임에 반영
```

---

## 9. 인프라 / 배포 계획

### 서버 비용 최소화 전략

| 옵션 | 프론트엔드 | 백엔드 | DB | 월 비용 |
| ---- | --------- | ------ | -- | ------- |
| **A. Supabase + NestJS** | GitHub Pages | Supabase에 NestJS 배포 불가, 별도 필요 | Supabase PostgreSQL (500MB 무료) | $0 (DB만) |
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
2. `Intro.js` 신규 작성 — 타이틀 "Run Dude Run!" + 떨어지는 애니메이션 연출
3. `Game.js` 수정 — 상태 머신 확장
4. `Dino.js` 수정 — 이미지 있으면 `drawImage`, 없으면 placeholder
5. `Obstacle.js` 수정 — 5종 장애물
6. `Ground.js` 수정 — 이미지 타일 or placeholder
7. `sprites.js` 제거 + 관련 import 정리
8. `utils.js` — `drawPixels()` 제거, `drawPlaceholder()` 추가
9. `Score.js` 수정 — 50점 단위
10. 폰트(EXEPixelPerfect) 적용
11. 점프 입력 영역 → 페이지 전체

→ **리뷰 후 다음 Step 진행**

### Step 2: 게임오버 UX + 사망 연출

1. `DeathAnimation.js` 신규 작성
2. `dino-game.html` 수정 — ↻ 아이콘 추가
3. `dino-game.css` 수정 — 아이콘 스타일
4. `Game.js` 수정 — gameover 시 사망 애니메이션 + ↻ 아이콘
5. 다시하기 연출

→ **리뷰 후 다음 Step 진행**

### Step 3: 해피엔딩 시나리오

1. `HappyEnding.js` 신규 작성
2. `Girlfriend.js` 신규 작성
3. `Dino.js` 수정 — 해피엔딩 스프라이트
4. `Game.js` 수정 — happyending 상태 전환
5. 다시하기 연출

→ **리뷰 후 다음 Step 진행**

### Step 4: 백엔드 + 어드민 페이지

1. `database.module.ts` — game_settings, sprites 테이블 추가
2. `sprites/` 모듈 신규
3. `settings/` 모듈 신규
4. `auth/` 모듈 신규
5. `admin.html` + `admin.css` + `admin.js` 신규
6. 랭킹 관리 + 이미지 업로드 + 해피엔딩 점수 관리

→ **리뷰 후 다음 Step 진행**

### Step 5: iframe 최적화 + 배포

1. `main.ts` — CORS origin 설정, `frame-ancestors` 헤더
2. 배포 플랫폼 선택 및 설정
3. GitHub Actions 배포 워크플로우 수정 (백엔드 포함)
4. iframe 삽입 테스트 (PC + 모바일)

→ **리뷰 후 완료**

---

## 11. 열린 결정 사항

| 항목 | 옵션 | 결정 시점 |
| ---- | ---- | --------- |
| 배포 플랫폼 | Railway vs Fly.io vs Render | Step 5 시작 전 |
| 랭킹 보관 수 (N) | 100 / 500 | Step 4 |
| 어드민 인증 방식 | 단순 API Key vs JWT vs 세션 | Step 4 |
| 이미지 저장 방식 | DB (BYTEA) vs 파일 스토리지 (S3/로컬) | Step 4 |
| 프로모션 종료 후 데이터 처리 | 삭제 / 아카이브 / 유지 | 프로모션 기획 확정 시 |
| 부모 페이지와 postMessage 통신 | 필요 여부는 스토어 측 요구사항에 따라 | Step 5 |
| PC 게임 크기 | canvas 내부 해상도 변경 vs CSS 스케일링 | Step 1 |
| 해피엔딩 기본 트리거 점수 | 클라이언트 확인 필요 | Step 3 |
| 해피엔딩 시 점수 처리 | 최종 점수 고정 / 보너스 점수 등 | Step 3 |
| 장애물 등장 패턴 | 5종 장애물의 등장 순서/빈도/조합 규칙 | Step 1 |
| 폰트 라이선스 | EXEPixelPerfect 사용 확정 여부 | Step 1 |
| 신규 스프라이트 크기 | 해피엔딩 쥐, 여친 쥐, 장애물 1~5 정확한 크기 | 이미지 리소스 수령 시 |
| 숙이기 스프라이트 | 클라이언트에 요청 중 (2026-04-16) | 이미지 리소스 수령 시 |

---

## 12. 참고 파일

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
