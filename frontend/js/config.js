export const REFERENCE_HEIGHT = 270;
// 세로로 긴 화면에서 과확대를 막기 위한 최소 가로 가시 영역(논리 px).
// 가로비(w/h)가 REFERENCE_WIDTH/REFERENCE_HEIGHT 이상인 화면은 기존처럼 높이에 맞춰 스케일되고,
// 그보다 좁은(세로로 긴) 화면은 이 너비가 보이도록 너비에 맞춰 스케일된다.
export const REFERENCE_WIDTH = 360;

// Viewport: Game.js resize()에서 디스플레이 크기에 맞게 업데이트
// 논리 좌표계: 화면 비율에 따라 width/height가 가변(contain 방식).
// 항상 최소 REFERENCE_WIDTH × REFERENCE_HEIGHT 영역이 보이며 지면은 하단에 고정된다.
export const viewport = {
  width: REFERENCE_WIDTH,
  height: REFERENCE_HEIGHT,
  scale: 1,
  get groundY() { return this.height - 30; },
};
export const GRAVITY = 0.84;
export const JUMP_VELOCITY = -16.1;
export const INITIAL_SPEED = 3;
export const MAX_SPEED = 10;
export const SPEED_INCREMENT = 0.001;
export const MIN_OBSTACLE_GAP = 126;
export const NIGHT_CYCLE_SCORE = 3500;
export const NIGHT_TRANSITION_FRAMES = 60;
