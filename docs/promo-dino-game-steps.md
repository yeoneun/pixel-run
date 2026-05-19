# Promo Dino Game 구현 단계 (Implementation Steps)

> 작성일: 2026-04-16
> 관련 문서: `promo-dino-game-spec.md` (기획), `promo-dino-game-dev.md` (개발 상세)
> Figma: https://www.figma.com/design/gsANyIQ6n0utFXjlexeXq5/Untitled?node-id=23-407

---

## 규칙

- 각 Step은 **리뷰 → 커밋 → 다음 Step** 순서로 진행한다.
- 각 Step은 **이전 Step의 context 없이도** 독립적으로 수행 가능하도록 작성한다.
- 각 Step에는 **수정/생성 대상 파일**, **참고 파일**, **완료 조건**을 명시한다.
- 열린 결정 사항은 해당 Step 시작 전 확정한다.
- **각 Step 완료 후 게임이 정상 동작해야 한다** (화면 깨짐, 콘솔 에러 없음).
- **Additive first**: 새 코드를 추가한 뒤, 기존 코드는 모든 소비자가 전환된 후에 제거한다.

---

## Phase 1: 프론트엔드 기반 시스템 (스프라이트 + 인트로 + 상태 머신)

> 목표: 기존 픽셀아트 시스템을 이미지 기반 스프라이트 시스템으로 교체하고, 인트로 화면과 상태 머신을 구축한다.

### Step 1-1: SpriteLoader + placeholder 시스템

**목표**: 서버에서 이미지를 로드하고, 이미지가 없을 때 컬러 박스 placeholder로 렌더링하는 시스템 구축. **기존 렌더링은 유지한다.**

**생성 파일**:
- `frontend/assets/sprite-config.json` — 스프라이트 메타데이터 (크기, hitbox, 파일명)
- `frontend/js/SpriteLoader.js` — 이미지 preload + placeholder 관리

**수정 파일**:
- `frontend/js/utils.js` — `drawPlaceholder(ctx, x, y, w, h, label)` **추가** (drawPixels는 유지)
- `frontend/js/Game.js` — SpriteLoader import + init 호출 (fire-and-forget)

**참고 파일**:
- `frontend/js/sprites.js` — 현재 픽셀아트 구조 (이 Step에서 건드리지 않음)
- `frontend/js/config.js` — 현재 설정 구조
- `promo-dino-game-dev.md` §3 "커스텀 스프라이트 시스템 구현" — `sprite-config.json` 전체 스키마, placeholder 렌더링 방식

**작업 내용**:
1. `sprite-config.json` 작성 — dev 문서 §3의 JSON 스키마 그대로 사용
2. `SpriteLoader.js` 작성:
   - `sprite-config.json`을 fetch하여 메타데이터 로드
   - 각 스프라이트 키에 대해 이미지 로드 시도 (`new Image()` + `Promise.all`)
   - 로드 실패 시 해당 키를 placeholder 맵에 등록 (에러가 아닌 정상 흐름)
   - `getImage(key)` — 로드된 Image 객체 반환, 없으면 null
   - `getSize(key)` — config에서 크기 정보 반환
   - `isLoaded()` — 전체 preload 완료 여부
   - `export const spriteLoader = new SpriteLoader()` 싱글턴 export
3. `utils.js` 수정:
   - `drawPlaceholder(ctx, x, y, w, h, label)` **추가** — 반투명 컬러 박스 + 중앙 라벨 텍스트
   - ⚠️ `drawPixels()`는 **제거하지 않는다** (Dino/Obstacle/NightMode/Game이 아직 사용 중)
4. `Game.js` 수정:
   - `import { spriteLoader } from './SpriteLoader.js';` 추가
   - constructor에서 `spriteLoader.init().catch(console.warn)` fire-and-forget 호출

**완료 조건**:
- [x] `SpriteLoader`가 config를 파싱하고 preload를 시도할 수 있다
- [x] 서버 이미지 없이도 placeholder 크기/라벨이 정상 렌더링된다 (콘솔에서 수동 테스트)
- [x] **게임이 기존 픽셀아트로 정상 플레이된다** (화면 깨짐 없음)
- [x] 콘솔에서 SpriteLoader 초기화 로그 확인 가능

**열린 결정**: 없음

---

### Step 1-2: Game.js 상태 머신 확장

**목표**: 기존 Game.js의 상태 머신을 `loading → intro → playing → gameover / happyending`으로 확장.

**수정 파일**:
- `frontend/js/Game.js` — 상태 머신 확장

**참고 파일**:
- `frontend/js/Game.js` — 현재 상태 머신 구조
- `promo-dino-game-dev.md` §2 "상태 머신" — 전체 상태 다이어그램
- `promo-dino-game-spec.md` §3 "화면 흐름도"

**작업 내용**:
1. 상태 enum 정의: `LOADING`, `INTRO`, `PLAYING`, `GAMEOVER`, `HAPPYENDING`
2. `LOADING` 상태 추가:
   - SpriteLoader의 preload 완료를 기다림
   - ⚠️ 성공/실패 **모두** `INTRO`로 전환 (이미지 로드 실패해도 게임 진행 가능)
3. `INTRO` 상태 추가:
   - 입력 리스닝 시작 (Space/Tap)
   - 입력 시 `PLAYING`으로 전환
4. `PLAYING` 상태:
   - 기존 게임 루프 유지
   - 충돌 시 `GAMEOVER`로 전환 (기존 로직 유지, 추후 Step에서 사망 애니메이션 추가)
   - 해피엔딩 점수 체크 로직은 placeholder만 (추후 Step 3-1에서 구현)
5. `GAMEOVER` 상태:
   - 기존 gameover 로직 유지
   - 다시하기 시 `PLAYING`으로 전환
6. `HAPPYENDING` 상태:
   - 빈 상태로 선언만 (추후 Step 3-1에서 구현)
7. 상태별 `update()` / `draw()` 분기 처리

**완료 조건**:
- [x] `loading → intro → playing → gameover → playing` 전환이 동작한다
- [x] 이미지 로드 실패 시에도 LOADING → INTRO 전환이 정상 진행된다
- [x] 각 상태에서 의도하지 않은 입력이 무시된다
- [x] happyending 상태가 선언되어 있다 (빈 상태)
- [x] **게임 플레이가 정상 동작한다**

**열린 결정**: 없음

---

### Step 1-3: Intro 화면 연출

**목표**: 인트로 화면 (타이틀 표시 → "PRESS SPACE TO START" → 시작 연출) 구현.

**생성 파일**:
- `frontend/js/Intro.js` — 인트로 화면 연출

**수정 파일**:
- `frontend/js/Game.js` — Intro 컴포넌트 연동
- `frontend/css/dino-game.css` — 폰트(EXEPixelPerfect) 추가

**참고 파일**:
- `promo-dino-game-spec.md` §2.0 "인트로 화면" — 화면 레이아웃, 연출 흐름
- `promo-dino-game-dev.md` §8.1 "게임 시작 ~ 게임오버" — 데이터 흐름

**작업 내용**:
1. `Intro.js` 작성:
   - `LOADING` 상태: 타이틀 "Run Dude Run!" canvas 중앙에 표시 (EXEPixelPerfect 폰트)
   - `INTRO` 상태: "PRESS SPACE TO START" + "or tap the screen" 텍스트 추가
   - 시작 시 연출: 타이틀이 아래로 떨어지는 애니메이션 (gravity 적용)
   - 캐릭터 좌측에서 달려나오는 연출 트리거
2. `Game.js` 수정:
   - `LOADING` → `INTRO` 전환 시 Intro 컴포넌트 활성화
   - `INTRO` → `PLAYING` 전환 시 시작 연출 트리거
3. `dino-game.css` 수정:
   - EXEPixelPerfect @font-face 추가

**완료 조건**:
- [x] 페이지 로드 시 "Run Dude Run!" 타이틀이 표시된다
- [x] preload 완료 후 "PRESS SPACE TO START" 텍스트가 나타난다
- [x] Space/Tap 입력 시 타이틀이 아래로 떨어지고 캐릭터가 좌측에서 등장한다
- [x] EXEPixelPerfect 폰트가 적용되어 있다
- [x] **시작 연출 후 게임 플레이가 정상 동작한다**

**열린 결정**:
- 폰트 라이선스 확인 필요 (EXEPixelPerfect 사용 확정 여부)

---

### Step 1-4: Dino 이미지 렌더링 전환

**목표**: Dino.js를 픽셀아트 렌더링에서 이미지/placeholder 렌더링으로 전환.

**수정 파일**:
- `frontend/js/Dino.js` — 이미지 렌더링 + placeholder fallback

**참고 파일**:
- `frontend/js/Dino.js` — 현재 캐릭터 로직 (hitbox, 상태별 스프라이트 전환)
- `frontend/js/SpriteLoader.js` — Step 1-1에서 작성한 이미지 로더
- `frontend/assets/sprite-config.json` — dino 섹션 (size, hitbox, duckSize, duckHitbox)

**작업 내용**:
1. 기존 `sprites.js` 기반 렌더링 코드 제거 (Dino.js에서의 import만 제거)
2. SpriteLoader에서 dino 이미지 로드:
   - run: `dino-run-1`, `dino-run-2` (2프레임 루프)
   - duck: `dino-duck-1`, `dino-duck-2` (2프레임 루프)
   - jump: `dino-jump-1`, `dino-jump-2` (2프레임 루프)
   - dead: `dino-dead-1`, `dino-dead-2` (2프레임 루프)
3. 이미지 있으면 `ctx.drawImage()`, 없으면 `drawPlaceholder()` 호출
4. hitbox는 `sprite-config.json`의 값 사용:
   - 기본: `{ x: 4, y: 0, w: 80, h: 96 }`
   - duck: `{ x: 4, y: 8, w: 110, h: 52 }`
5. duck 상태 시 크기 변경: 88x96 → 118x60

**완료 조건**:
- [x] Dino가 placeholder 박스로 렌더링된다 (이미지 없는 상태)
- [x] run/duck/jump 상태별로 다른 placeholder 라벨이 표시된다
- [x] hitbox가 config 기반으로 동작한다
- [x] 2프레임 루프 애니메이션이 동작한다
- [x] **점프, 엎드리기, 충돌 등 게임 플레이가 정상 동작한다**

**열린 결정**: 없음

---

### Step 1-5: Obstacle 이미지 렌더링 전환 (5종 + 비행 1종)

**목표**: 장애물을 5종 지면 장애물 + 1종 비행 장애물로 확장하고 이미지/placeholder 렌더링으로 전환.

**수정 파일**:
- `frontend/js/Obstacle.js` — 5종 장애물 + 이미지 렌더링

**참고 파일**:
- `frontend/js/Obstacle.js` — 현재 장애물 로직 (타입별 분기, 스폰 간격)
- `frontend/assets/sprite-config.json` — obstacles, flyingObstacles 섹션

**작업 내용**:
1. 기존 선인장/익룡 픽셀아트 렌더링 제거 (Obstacle.js에서의 sprites.js import만 제거)
2. `sprite-config.json`의 obstacles 배열 기반으로 5종 지면 장애물 구현:
   - 각 장애물별 size, hitbox 적용
   - 2프레임 루프 애니메이션
3. flyingObstacles 1종 구현 (84x60, 공중 위치)
4. 장애물 스폰 시 5종 중 랜덤 선택
5. 이미지 있으면 `drawImage`, 없으면 `drawPlaceholder`

**완료 조건**:
- [x] 5종 지면 장애물이 랜덤으로 등장한다
- [x] 비행 장애물이 공중 높이에서 등장한다
- [x] 각 장애물별 hitbox가 config 기반으로 동작한다
- [x] placeholder 렌더링이 장애물별로 다른 라벨을 표시한다
- [x] **충돌 판정, 게임오버 등 게임 플레이가 정상 동작한다**

**열린 결정**:
- 장애물 등장 패턴 (5종의 등장 순서/빈도/조합 규칙) — 기본은 랜덤, 커스텀 규칙 필요 시 확정

---

### Step 1-6: Ground 이미지 타일 전환

**목표**: 지면 렌더링을 이미지 기반 타일로 전환.

**수정 파일**:
- `frontend/js/Ground.js` — 이미지 타일 렌더링 전환

**참고 파일**:
- `frontend/js/Ground.js` — 현재 지면 로직
- `frontend/assets/sprite-config.json` — ground 섹션 (2400x24, tileWidth)

**작업 내용**:
1. `Ground.js` 수정:
   - SpriteLoader에서 ground 이미지 로드
   - 이미지 있으면 `drawImage`로 타일 렌더링 (가로 반복 스크롤)
   - 없으면 기존 fillRect 방식 유지 (placeholder)
   - ground 크기: 2400x24, tileWidth: 2400

**완료 조건**:
- [x] 지면이 placeholder 또는 이미지로 타일 렌더링된다
- [x] 스크롤이 정상 동작한다
- [x] **게임 플레이가 정상 동작한다**

**열린 결정**: 없음

---

### Step 1-7: NightMode + restart 전환 → sprites.js 삭제 + drawPixels 제거

**목표**: sprites.js의 마지막 소비자(NightMode, Game.js restart)를 전환한 뒤, sprites.js와 drawPixels를 안전하게 제거.

> ⚠️ 이 Step 시작 시점에 sprites.js를 사용하는 파일은 NightMode.js(moon, star)와 Game.js(restart)뿐이다.
> Step 1-4에서 Dino.js, Step 1-5에서 Obstacle.js가 이미 전환되었으므로 이 Step에서 나머지를 전환하고 삭제한다.

**수정 파일**:
- `frontend/js/NightMode.js` — moon/star를 SpriteLoader 기반 or canvas 직접 렌더링으로 전환
- `frontend/js/Game.js` — restart 아이콘을 SpriteLoader 기반 or canvas 직접 렌더링으로 전환, sprites.js import 제거
- `frontend/js/utils.js` — `drawPixels()` 제거

**삭제 파일**:
- `frontend/js/sprites.js` — 픽셀아트 데이터 전체 제거

**참고 파일**:
- `frontend/js/NightMode.js` — 현재 moon/star 렌더링 (drawPixels 사용)
- `frontend/js/Game.js` — 현재 restart 아이콘 렌더링 (drawPixels 사용)
- `frontend/js/sprites.js` — 삭제 전 참조 확인용

**작업 내용**:
1. `NightMode.js` 수정:
   - `sprites.js` import 제거
   - `drawPixels` import 제거
   - moon: SpriteLoader 이미지 or `drawPlaceholder` or 간단한 canvas arc
   - star: SpriteLoader 이미지 or `drawPlaceholder` or 간단한 canvas fillRect
2. `Game.js` 수정:
   - `sprites.js` import 제거
   - `drawPixels` import 제거
   - restart 아이콘: SpriteLoader 이미지 or `drawPlaceholder` or canvas 직접 그리기
3. `utils.js` 수정:
   - `drawPixels()` 함수 제거 (이 시점에서 import하는 파일 0개)
4. `sprites.js` 삭제:
   - 파일 삭제
   - 모든 import 참조가 제거되었는지 최종 확인

**완료 조건**:
- [x] NightMode moon/star가 정상 렌더링된다 (새 방식)
- [x] restart 아이콘이 정상 렌더링된다 (새 방식)
- [x] `sprites.js` 파일이 삭제되고 참조 에러가 없다
- [x] `drawPixels` 참조 에러가 없다
- [x] **밤/낮 전환, 게임오버 restart 표시 등 게임 플레이가 정상 동작한다**

**열린 결정**: 없음

---

### Step 1-8: 점프 입력 확장 (페이지 전체)

**목표**: 점프 입력 영역을 canvas에서 페이지 전체로 확장.

**수정 파일**:
- `frontend/js/Game.js` — 점프 입력 영역 변경

**참고 파일**:
- `frontend/js/Game.js` — 현재 입력 처리 코드

**작업 내용**:
1. `Game.js` 수정:
   - 점프 입력: canvas 영역 → `document` 레벨 이벤트 리스너로 변경
   - Space, ArrowUp, 터치(touchstart) 모두 페이지 전체에서 동작

**완료 조건**:
- [x] 페이지 어디를 클릭/탭해도 점프가 동작한다
- [x] 기존 키보드(Space, ArrowUp) 입력이 정상 동작한다
- [x] 엎드리기(ArrowDown) 입력이 정상 동작한다
- [x] **게임 플레이가 정상 동작한다**

**열린 결정**: 없음

---

### Step 1-9: Score 50점 단위 + 반응형 canvas

**목표**: 점수 증가를 50점 단위로 변경하고, 모바일/PC 반응형 스케일링 적용.

**수정 파일**:
- `frontend/js/Score.js` — 50점 단위 증가
- `frontend/js/Game.js` — canvas 반응형 스케일링
- `frontend/dino-game.html` — canvas/viewport 설정
- `frontend/css/dino-game.css` — 반응형 스타일

**참고 파일**:
- `frontend/js/Score.js` — 현재 점수 로직
- `promo-dino-game-spec.md` §4.2 "점수 시스템", §2.4 "모바일 레이아웃"

**작업 내용**:
1. `Score.js` 수정:
   - 기존 1점 단위 → 50점 단위 증가
   - 표시 포맷: 5자리 (예: 00650)
   - 속도 증가 패턴은 크롬 다이노 기본 유지
2. 반응형 canvas 스케일링:
   - 모바일 기준: 375x208
   - PC 기준: 1920px 폭
   - CSS transform scale 기반 스케일링
   - `dino-game.html`에 viewport meta 설정

**완료 조건**:
- [x] 점수가 50점 단위로 증가한다 (0, 50, 100, 150...)
- [x] 점수 표시가 5자리 포맷이다 (00050, 00100...)
- [x] 모바일/PC에서 canvas가 적절히 스케일링된다
- [x] 속도 증가 패턴이 정상 동작한다
- [x] **게임 플레이가 정상 동작한다**

**열린 결정**:
- PC 게임 크기: canvas 내부 해상도 변경 vs CSS 스케일링 → 이 Step 시작 전 확정

---

## Phase 2: 게임오버 UX + 사망 연출

> 목표: 게임오버 시 사망 애니메이션과 다시하기 UX를 구현한다.

### Step 2-1: DeathAnimation 컴포넌트

**목표**: 사망 애니메이션 시퀀스 (표정 변화 → 공중 부유 → 낙하) 구현.

**생성 파일**:
- `frontend/js/DeathAnimation.js` — 사망 애니메이션 시퀀스

**참고 파일**:
- `promo-dino-game-spec.md` §2.2 "Game Over 상태" — 사망 애니메이션 흐름
- `promo-dino-game-dev.md` §8.1 — gameover 데이터 흐름
- `frontend/js/Dino.js` — 캐릭터 위치/상태 참고

**작업 내용**:
1. `DeathAnimation.js` 작성:
   - Phase 1: 쥐 멈춤 + 죽은 쥐 스프라이트 적용 (`dino-dead-1`, `dino-dead-2`)
   - Phase 2: 쥐와 충돌한 장애물이 함께 공중으로 떠오름 (y값 감소)
   - Phase 3: 아래로 낙하하며 canvas 밖으로 사라짐 (y값 증가)
   - 시퀀스 완료 콜백 제공 (`onComplete`)
2. `start(dino, obstacle)` — 애니메이션 시작
3. `update(deltaTime)` — 매 프레임 호출
4. `draw(ctx)` — 현재 상태 렌더링
5. `isComplete()` — 시퀀스 완료 여부

**완료 조건**:
- [x] 충돌 시 캐릭터 표정이 변한다 (dead 스프라이트/placeholder)
- [x] 캐릭터+장애물이 함께 위로 떠오른다
- [x] 아래로 떨어지며 사라진다
- [x] 시퀀스 완료 후 콜백이 호출된다
- [x] **게임 플레이가 정상 동작한다**

**열린 결정**: 없음

---

### Step 2-2: 게임오버 UI + 다시하기 연출

**목표**: 게임오버 화면 UI 변경 (기존 버튼 제거 → "Game Over" + ↻ 아이콘) + 다시하기 연출.

**수정 파일**:
- `frontend/dino-game.html` — 랭킹/이름입력 UI 제거, ↻ 아이콘 추가
- `frontend/css/dino-game.css` — ↻ 아이콘 스타일
- `frontend/js/Game.js` — gameover 시 DeathAnimation 연동, ↻ 아이콘 표시/숨김, 다시하기 연출
- `frontend/js/api.js` — `loadRanking()` 자동호출(86행) 제거

> ⚠️ 랭킹/이름입력 UI 제거 시 함께 정리할 것:
> - `api.js` 86행의 `loadRanking()` 자동 호출 제거 (DOM 요소가 없으면 에러)
> - `Game.js` `gameOver()` 201행의 `playerName` DOM 참조 제거

**참고 파일**:
- `frontend/dino-game.html` — 현재 HTML 구조 (랭킹/입력란 제거 대상)
- `frontend/js/DeathAnimation.js` — Step 2-1에서 작성한 사망 애니메이션
- `promo-dino-game-spec.md` §2.2 — Game Over 상태 레이아웃

**작업 내용**:
1. `dino-game.html` 수정:
   - 기존 랭킹 테이블, 이름 입력 폼, 순위 작성 버튼 제거
   - canvas 아래에 ↻ 아이콘 요소 추가 (기본 hidden)
2. `dino-game.css` 수정:
   - ↻ 아이콘 스타일 (클릭 가능한 영역, 중앙 정렬)
3. `api.js` 수정:
   - `loadRanking()` 자동 호출 제거 (86행)
4. `Game.js` 수정:
   - 충돌 감지 → `GAMEOVER` 상태 전환 → DeathAnimation.start() 호출
   - `gameOver()`에서 playerName DOM 참조 제거
   - 사망 애니메이션 완료 → canvas에 "Game Over" 텍스트 렌더링 + ↻ 아이콘 표시
   - ↻ 클릭 →:
     - "Game Over" 텍스트 사라짐
     - ↻ 아이콘 숨김
     - 캐릭터가 왼쪽 밖에서 달려나오며 `PLAYING` 상태 전환
   - 게임 재시작 시 점수/속도 초기화

**완료 조건**:
- [x] 충돌 시 사망 애니메이션이 재생된다
- [x] 애니메이션 완료 후 "Game Over" + ↻ 아이콘이 표시된다
- [x] 기존 랭킹/이름입력 UI가 제거되었다
- [x] ↻ 클릭 시 텍스트 사라짐 + 캐릭터 재등장 후 게임이 재시작된다
- [x] 재시작 시 점수가 0으로 초기화된다
- [x] **콘솔 에러 없이 게임 플레이가 정상 동작한다**

**열린 결정**: 없음

---

## Phase 3: 해피엔딩 시나리오

> 목표: 해피엔딩 트리거, 여친 쥐 캐릭터, 엔딩 연출을 구현한다.

### Step 3-1: Girlfriend 캐릭터 + HappyEnding 연출

**목표**: 여친 쥐 캐릭터와 해피엔딩 연출 시퀀스 전체 구현.

**생성 파일**:
- `frontend/js/Girlfriend.js` — 여친 쥐 캐릭터
- `frontend/js/HappyEnding.js` — 해피엔딩 연출 시퀀스

**수정 파일**:
- `frontend/js/Dino.js` — 해피엔딩 스프라이트 (눈이 하트: `dino-happy-1`, `dino-happy-2`)
- `frontend/js/Game.js` — happyending 상태 전환, 트리거 점수 체크, 다시하기 연출

**참고 파일**:
- `promo-dino-game-spec.md` §2.3 "해피엔딩 화면" — 연출 흐름, 레이아웃
- `promo-dino-game-dev.md` §8.1 — happyending 데이터 흐름
- `frontend/assets/sprite-config.json` — girlfriend 섹션

**작업 내용**:
1. `Girlfriend.js` 작성:
   - idle 상태: 화면 오른쪽에 대기 (2프레임 루프: `girlfriend-idle-1`, `girlfriend-idle-2`)
   - happyEnding 상태: 눈이 하트 (2프레임 루프: `girlfriend-happy-1`, `girlfriend-happy-2`)
   - 이미지 없으면 placeholder 렌더링
   - 크기: `sprite-config.json`의 girlfriend.size
2. `HappyEnding.js` 작성:
   - Phase 1: 장애물 등장 중단 (새 장애물 스폰 정지)
   - Phase 2: 여친 쥐 화면 오른쪽에 등장 (idle 스프라이트)
   - Phase 3: 주인공이 오른쪽으로 이동 (기존 제자리 달리기 → 실제 x좌표 이동)
   - Phase 4: 주인공이 여친 쥐에 도달 → 두 캐릭터 모두 happyEnding 스프라이트로 전환
   - Phase 5: "Love wins all" 텍스트 + ↻ 아이콘 표시
   - 시퀀스 완료 콜백 제공
3. `Dino.js` 수정:
   - happyEnding 상태 추가 (`dino-happy-1`, `dino-happy-2`)
   - happyEnding 시 x좌표 이동 가능하도록 수정
4. `Game.js` 수정:
   - `PLAYING` 상태에서 매 프레임 점수 체크:
     - 점수 >= 해피엔딩 트리거 점수 → `HAPPYENDING` 상태 전환
     - 트리거 점수는 `GET /settings`로 로드 (로드 실패 시 기본값 10000)
   - `HAPPYENDING` 상태에서 HappyEnding.update()/draw() 호출
   - ↻ 클릭 시 다시하기 연출:
     - "Love wins all" 텍스트 사라짐
     - 오른쪽 캐릭터들(여친 쥐 등)이 오른쪽으로 이동하며 퇴장
     - 주인공이 왼쪽에서 재등장
     - `PLAYING` 상태 전환, 점수/속도 초기화

**완료 조건**:
- [x] 트리거 점수 도달 시 장애물 등장이 중단된다
- [x] 여친 쥐가 화면 오른쪽에 등장한다 (placeholder 포함)
- [x] 주인공이 오른쪽으로 이동하여 여친 쥐에 도달한다
- [x] 도달 시 두 캐릭터 모두 해피엔딩 스프라이트로 전환된다
- [x] "Love wins all" + ↻ 아이콘이 표시된다
- [x] ↻ 클릭 시 오른쪽 캐릭터 퇴장 + 주인공 재등장 후 게임 재시작된다
- [x] **게임 플레이가 정상 동작한다**

**열린 결정**:
- 해피엔딩 기본 트리거 점수 (클라이언트 확인 필요)
- 해피엔딩 시 점수 처리 (최종 점수 고정 / 보너스 점수 등)

---

## Phase 4: 백엔드 확장 + 어드민 페이지

> 목표: 서버에 인증, 스프라이트 관리, 게임 설정 기능을 추가하고, 어드민 페이지를 구축한다.

### Step 4-1: DB 스키마 확장 (game_settings + sprites 테이블)

**목표**: PostgreSQL에 게임 설정과 스프라이트 저장 테이블을 추가하고, scores 테이블에 contact/userAgent/IP 필드를 반영.

**수정 파일**:
- `backend/src/database/database.module.ts` — 스키마 변경 (game_settings, sprites 테이블 추가)

**참고 파일**:
- `backend/src/database/database.module.ts` — 현재 DB 연결 설정
- `promo-dino-game-dev.md` §4 "DB 스키마 + 시스템" — 전체 SQL 스키마

**작업 내용**:
1. `game_settings` 테이블 생성:
   ```sql
   CREATE TABLE IF NOT EXISTS game_settings (
     key VARCHAR(50) PRIMARY KEY,
     value TEXT NOT NULL,
     updated_at TIMESTAMP DEFAULT NOW()
   );
   INSERT INTO game_settings (key, value) VALUES ('happy_ending_score', '10000');
   ```
2. `sprites` 테이블 생성:
   ```sql
   CREATE TABLE IF NOT EXISTS sprites (
     key VARCHAR(100) PRIMARY KEY,
     image_data BYTEA NOT NULL,
     mime_type VARCHAR(20) NOT NULL,
     width INTEGER,
     height INTEGER,
     updated_at TIMESTAMP DEFAULT NOW()
   );
   ```
3. `scores` 테이블 확인/수정:
   - `contact VARCHAR(100) NOT NULL` 필드 존재 확인
   - `user_agent TEXT`, `ip_address VARCHAR(45)` 필드 존재 확인
   - `UNIQUE INDEX` on contact 존재 확인

**완료 조건**:
- [x] 서버 시작 시 game_settings, sprites 테이블이 생성된다
- [x] game_settings에 초기 데이터(happy_ending_score=10000)가 삽입된다
- [x] scores 테이블에 contact, user_agent, ip_address 필드가 있다
- [x] **서버가 정상 시작되고 기존 API가 동작한다**

**열린 결정**:
- 이미지 저장 방식: DB (BYTEA) vs 파일 스토리지 → 이 Step에서 확정 (문서 기본값: DB BYTEA)

---

### Step 4-2: 어드민 인증 모듈

**목표**: 어드민 API 보호를 위한 인증 시스템 구현.

**생성 파일**:
- `backend/src/auth/auth.module.ts` — 인증 모듈
- `backend/src/auth/auth.guard.ts` — API 가드
- `backend/src/auth/auth.controller.ts` — 로그인 엔드포인트 (필요 시)

**수정 파일**:
- `backend/src/app.module.ts` — auth 모듈 등록

**참고 파일**:
- `backend/src/scores/scores.controller.ts` — 기존 API 구조 참고
- `promo-dino-game-dev.md` §4 "어드민 인증" — 인증 방식 옵션

**작업 내용**:
1. `POST /admin/login` 엔드포인트:
   - 요청: `{ password: string }`
   - 환경변수 `ADMIN_PASSWORD`와 비교
   - 성공 → 토큰(JWT or 세션) 반환
   - 실패 → 401
2. `AuthGuard` 작성:
   - `Authorization: Bearer <token>` 헤더 검증
   - 유효하지 않으면 401 반환
3. 기존 scores 엔드포인트에 AuthGuard 적용:
   - `GET /scores`, `PATCH /scores/:id`, `DELETE /scores/:id`

**완료 조건**:
- [x] `POST /admin/login`이 비밀번호 검증 후 토큰을 반환한다
- [x] 토큰 없이 어드민 API 호출 시 401이 반환된다
- [x] 유효한 토큰으로 어드민 API가 동작한다
- [x] **서버가 정상 시작되고 기존 게임 플레이에 영향이 없다**

**열린 결정**:
- 인증 방식: 단순 API Key vs JWT vs 세션 → 이 Step에서 확정

---

### Step 4-3: 스프라이트 관리 API

**목표**: 이미지 업로드/조회 API 구현.

**생성 파일**:
- `backend/src/sprites/sprites.module.ts`
- `backend/src/sprites/sprites.controller.ts`
- `backend/src/sprites/sprites.service.ts`

**수정 파일**:
- `backend/src/app.module.ts` — sprites 모듈 등록

**참고 파일**:
- `promo-dino-game-dev.md` §4 "API 명세" — sprites 관련 엔드포인트
- `backend/src/scores/scores.service.ts` — DB 쿼리 패턴 참고

**작업 내용**:
1. `POST /admin/sprites/:key` (인증 필요):
   - multipart/form-data로 이미지 수신
   - WebP/PNG만 허용
   - 픽셀 크기 검증 (sprite-config.json 기준 크기와 비교)
   - DB에 BYTEA로 저장 (key, image_data, mime_type, width, height)
   - 이미 존재하면 UPDATE (UPSERT)
2. `GET /admin/sprites/:key` (인증 필요):
   - 이미지 메타 조회 (key, mime_type, width, height, updated_at)
3. `GET /sprites/:key` (인증 불필요):
   - 이미지 바이너리 반환
   - Content-Type 헤더 설정 (image/webp or image/png)
   - 캐시 헤더 설정 (Cache-Control)
   - 없으면 404

**완료 조건**:
- [x] 이미지 업로드가 정상 동작한다
- [x] 비허용 포맷 업로드 시 에러가 반환된다
- [x] `GET /sprites/:key`로 이미지 바이너리를 받을 수 있다
- [x] 존재하지 않는 키 조회 시 404가 반환된다
- [x] 프론트엔드 SpriteLoader에서 이미지를 로드할 수 있다
- [x] **서버가 정상 시작되고 기존 기능에 영향이 없다**

**열린 결정**: 없음

---

### Step 4-4: 게임 설정 API

**목표**: 해피엔딩 트리거 점수 등 게임 설정 조회/변경 API 구현.

**생성 파일**:
- `backend/src/settings/settings.module.ts`
- `backend/src/settings/settings.controller.ts`
- `backend/src/settings/settings.service.ts`

**수정 파일**:
- `backend/src/app.module.ts` — settings 모듈 등록

**참고 파일**:
- `promo-dino-game-dev.md` §4 "API 명세" — settings 관련 엔드포인트

**작업 내용**:
1. `GET /settings` (인증 불필요):
   - game_settings 테이블 전체 조회
   - `{ happy_ending_score: "10000" }` 형태로 반환
2. `PATCH /admin/settings` (인증 필요):
   - 요청: `{ key: string, value: string }` 또는 `{ happy_ending_score: "15000" }`
   - game_settings 테이블 UPDATE
   - updated_at 자동 갱신

**완료 조건**:
- [x] `GET /settings`로 게임 설정을 조회할 수 있다
- [x] `PATCH /admin/settings`로 해피엔딩 점수를 변경할 수 있다
- [x] 변경된 값이 `GET /settings`에 즉시 반영된다
- [x] 프론트엔드에서 해피엔딩 트리거 점수를 로드할 수 있다
- [x] **서버가 정상 시작되고 기존 기능에 영향이 없다**

**열린 결정**: 없음

---

### Step 4-5: scores 서비스 강화 (userAgent/IP + 상위 N개 정리)

**목표**: 점수 저장 시 userAgent/IP 자동 수집, contact 기반 유니크 처리, 상위 N개만 보관.

**수정 파일**:
- `backend/src/scores/scores.service.ts` — userAgent/IP 저장 + 상위 N개 정리 로직
- `backend/src/scores/scores.controller.ts` — Request 객체에서 userAgent/IP 추출

**참고 파일**:
- `backend/src/scores/scores.service.ts` — 현재 저장 로직
- `promo-dino-game-dev.md` §4 "상위 N개만 보관" — DELETE 쿼리

**작업 내용**:
1. 점수 저장 시:
   - `req.headers['user-agent']` → user_agent 필드
   - `req.ip` → ip_address 필드
   - contact 기반 UPSERT (동일 contact 시 점수가 높으면 갱신)
2. INSERT/UPDATE 후 상위 N개만 보관:
   ```sql
   DELETE FROM scores WHERE id NOT IN (
     SELECT id FROM scores ORDER BY score DESC LIMIT $1
   );
   ```
   - N = 환경변수 `MAX_RANKING_SIZE` (기본값: 500)

**완료 조건**:
- [x] 점수 저장 시 userAgent, IP가 자동으로 기록된다
- [x] 동일 contact로 재제출 시 높은 점수로 갱신된다
- [x] 상위 N개를 초과하는 데이터가 자동 삭제된다
- [x] **서버가 정상 시작되고 기존 기능에 영향이 없다**

**열린 결정**:
- 랭킹 보관 수 (N): 100 / 500 → 이 Step에서 확정

---

### Step 4-6: 어드민 프론트엔드 페이지

**목표**: 어드민 HTML 페이지 (로그인 + 랭킹 관리 + 이미지 업로드 + 게임 설정) 구현.

**생성 파일**:
- `frontend/admin.html` — 어드민 페이지
- `frontend/css/admin.css` — 어드민 스타일
- `frontend/js/admin.js` — 어드민 로직

**참고 파일**:
- `promo-dino-game-spec.md` §4.3 "어드민 페이지" — UI 레이아웃, 기능 목록
- `promo-dino-game-dev.md` §8.2 "어드민 플로우" — 데이터 흐름
- `frontend/js/api.js` — API 통신 패턴 참고

**작업 내용**:
1. `admin.html`:
   - 로그인 폼 (비밀번호 입력)
   - 로그인 후: 탭 구성 (랭킹 관리 / 이미지 관리 / 게임 설정)
2. `admin.js`:
   - 로그인: `POST /admin/login` → 토큰 sessionStorage 저장
   - 랭킹 관리:
     - `GET /scores` → 전체 테이블 표시
     - 연락처 마스킹 (예: `010-****-5678`), 클릭 시 전체 표시
     - 각 행: [수정] → `PATCH /scores/:id`, [삭제] → `DELETE /scores/:id`
   - 이미지 관리:
     - 각 스프라이트별 현재 이미지 표시 + 업로드 버튼
     - `POST /admin/sprites/:key`로 업로드
   - 게임 설정:
     - 해피엔딩 트리거 점수 표시 + 변경
     - `PATCH /admin/settings`
   - 자동 로그아웃 (일정 시간 비활동 시)
3. `admin.css`:
   - 기본 어드민 스타일 (테이블, 폼, 탭 등)

**완료 조건**:
- [x] 비밀번호 입력 후 로그인이 동작한다
- [x] 랭킹 목록이 표시되고, 수정/삭제가 동작한다
- [x] 연락처가 마스킹되어 표시된다
- [x] 이미지 업로드가 동작하고 결과가 표시된다
- [x] 해피엔딩 점수 변경이 동작한다
- [x] 일정 시간 비활동 시 자동 로그아웃된다
- [x] **어드민 페이지가 정상 동작하고, 게임 플레이에 영향이 없다**

**열린 결정**: 없음

---

## Phase 5: iframe 최적화 + 배포

> 목표: 스토어 페이지 iframe 삽입 최적화, CORS/보안 설정, 프로덕션 배포.

### Step 5-1: CORS + iframe 보안 설정

**목표**: 서버에 CORS 설정과 iframe frame-ancestors 보안 헤더를 적용.

**수정 파일**:
- `backend/src/main.ts` — CORS origin, Content-Security-Policy 헤더

**참고 파일**:
- `backend/src/main.ts` — 현재 서버 설정
- `promo-dino-game-dev.md` §9 "CORS / iframe 보안" — 설정 코드

**작업 내용**:
1. `main.ts` 수정:
   - `app.enableCors({ origin: [허용 도메인 목록] })`
   - `Content-Security-Policy: frame-ancestors 'self' https://허용-스토어-도메인` 헤더 추가
2. 허용 도메인은 환경변수로 관리 (`ALLOWED_ORIGINS`)

**완료 조건**:
- [x] 허용된 도메인에서 API 호출 시 CORS 에러가 없다
- [x] 허용되지 않은 도메인에서 iframe 삽입 시 차단된다
- [x] 허용 도메인을 환경변수로 변경할 수 있다
- [x] **서버가 정상 시작되고 기존 기능에 영향이 없다**

**열린 결정**:
- 부모 페이지와 postMessage 통신 필요 여부 (스토어 측 요구사항에 따라)

---

### Step 5-2: 배포 설정 + GitHub Actions

**목표**: 백엔드 프로덕션 배포 설정 및 CI/CD 파이프라인 구성.

**수정 파일**:
- `.github/workflows/deploy-pages.yml` — 배포 워크플로우 수정 (백엔드 포함)
- 배포 플랫폼별 설정 파일 (Railway: `railway.json` / Fly.io: `fly.toml` 등)

**참고 파일**:
- `.github/workflows/deploy-pages.yml` — 현재 배포 워크플로우
- `promo-dino-game-dev.md` §9 "인프라 / 배포" — 플랫폼 비교

**작업 내용**:
1. 배포 플랫폼 선택 (Railway / Fly.io / Render)
2. 백엔드 배포 설정:
   - Dockerfile 또는 플랫폼별 설정 파일
   - 환경변수 설정 (DATABASE_URL, ADMIN_PASSWORD, ALLOWED_ORIGINS, MAX_RANKING_SIZE)
3. GitHub Actions 워크플로우:
   - 프론트엔드: GitHub Pages 배포 (기존)
   - 백엔드: 선택한 플랫폼으로 자동 배포 추가
4. 프론트엔드 `api.js`의 API_URL을 프로덕션 도메인으로 설정

**완료 조건**:
- [ ] 백엔드가 프로덕션 환경에 배포된다
- [ ] 프론트엔드가 프로덕션 API를 정상적으로 호출한다
- [ ] GitHub push 시 자동 배포가 동작한다
- [ ] 환경변수가 올바르게 설정되어 있다

**열린 결정**:
- 배포 플랫폼: Railway vs Fly.io vs Render → 이 Step 시작 전 확정

---

### Step 5-3: iframe 삽입 테스트 + 최종 검증

**목표**: 실제 스토어 페이지에서 iframe 삽입 테스트 및 전체 기능 검증.

**수정 파일**: 테스트 중 발견되는 이슈에 따라 결정

**작업 내용**:
1. iframe 삽입 테스트:
   - PC (1920px 폭) + 모바일 (375px 폭) 환경에서 확인
   - iframe 내 자동 포커스 동작 확인
   - 점프 입력이 iframe 내에서 정상 동작하는지 확인
2. 전체 기능 검증 체크리스트:
   - [ ] 인트로 → 게임 시작 → 게임오버 → 다시하기 플로우
   - [ ] 인트로 → 게임 시작 → 해피엔딩 → 다시하기 플로우
   - [ ] 점수 50점 단위 증가
   - [ ] 속도 증가 패턴
   - [ ] 사망 애니메이션 (표정 변화 → 공중 부유 → 낙하)
   - [ ] 해피엔딩 연출 (여친 쥐 등장 → 만남 → 하트)
   - [ ] 어드민 로그인
   - [ ] 어드민 랭킹 관리 (조회/수정/삭제)
   - [ ] 어드민 이미지 업로드 → 게임에 즉시 반영
   - [ ] 어드민 해피엔딩 점수 변경 → 게임에 반영
   - [ ] 이미지 없이 placeholder로 전체 플로우 동작
   - [ ] 모바일 터치 점프
   - [ ] iframe 보안 (허용/비허용 도메인)

**완료 조건**:
- [ ] 위 체크리스트 전체 통과
- [ ] PC + 모바일 환경 모두 정상 동작
- [ ] iframe 삽입 시 게임이 정상 플레이 가능하다

**열린 결정**: 없음

---

## 전체 Step 요약

| Phase | Step | 목표 | 주요 파일 |
| ----- | ---- | ---- | --------- |
| **1** | 1-1 | SpriteLoader + placeholder (추가만) | SpriteLoader.js, sprite-config.json, utils.js, Game.js |
| | 1-2 | 상태 머신 확장 | Game.js |
| | 1-3 | 인트로 화면 연출 | Intro.js, Game.js, dino-game.css |
| | 1-4 | Dino 이미지 렌더링 전환 | Dino.js |
| | 1-5 | Obstacle 5종 + 이미지 전환 | Obstacle.js |
| | 1-6 | Ground 이미지 타일 전환 | Ground.js |
| | 1-7 | NightMode + restart 전환 → sprites.js/drawPixels 제거 | NightMode.js, Game.js, utils.js, sprites.js 삭제 |
| | 1-8 | 점프 입력 확장 (페이지 전체) | Game.js |
| | 1-9 | Score 50점 + 반응형 canvas | Score.js, Game.js, dino-game.html |
| **2** | 2-1 | 사망 애니메이션 컴포넌트 | DeathAnimation.js |
| | 2-2 | 게임오버 UI + 다시하기 | dino-game.html, Game.js, api.js |
| **3** | 3-1 | 해피엔딩 전체 (Girlfriend + 연출) | Girlfriend.js, HappyEnding.js, Dino.js, Game.js |
| **4** | 4-1 | DB 스키마 확장 | database.module.ts |
| | 4-2 | 어드민 인증 모듈 | auth/ |
| | 4-3 | 스프라이트 관리 API | sprites/ |
| | 4-4 | 게임 설정 API | settings/ |
| | 4-5 | scores 서비스 강화 | scores.service.ts, scores.controller.ts |
| | 4-6 | 어드민 프론트엔드 | admin.html, admin.js, admin.css |
| **5** | 5-1 | CORS + iframe 보안 | main.ts |
| | 5-2 | 배포 설정 + CI/CD | deploy workflow, 플랫폼 설정 |
| | 5-3 | iframe 테스트 + 최종 검증 | 전체 |

---

## 원본 대비 변경 사항

| 원본 | 재구성 | 변경 이유 |
|------|--------|-----------|
| 1-1에서 `drawPixels` 제거 | 1-1은 추가만, 제거는 **1-7**로 이동 | 소비자(Dino/Obstacle/NightMode/Game)가 아직 사용 중이라 화면 깨짐 |
| 1-2 LOADING 상태가 이미지 로드 실패 시 처리 불명확 | 성공/실패 **모두 INTRO 전환** 명시 | 이미지 없으면 무한 로딩 위험 |
| 1-6에서 Ground + sprites.js 삭제 + 점프 확장 합본 | **1-6**(Ground), **1-7**(NightMode+restart→삭제), **1-8**(점프 확장)으로 3분할 | 삭제 시점에 NightMode/Game.js가 아직 sprites.js 참조, 무관한 작업 묶여있음 |
| NightMode/restart 렌더링 전환 Step 없음 | **1-7**에 추가 | sprites.js 삭제 전 모든 소비자 전환 필요 |
| 2-2에서 `api.js` 정리 미언급 | `api.js` loadRanking 자동호출 제거 + Game.js playerName 참조 제거 명시 | HTML에서 DOM 제거 시 참조 에러 발생 |
| 1-7 (Score+반응형) | **1-9**로 넘버링 변경 | Step 추가(1-7, 1-8)로 밀림 |
