import { viewport } from './config.js';
import { spriteLoader } from './SpriteLoader.js';
import { drawPlaceholder } from './utils.js';

// Animation phases
const Phase = {
  FREEZE: 'freeze',     // 쥐 멈춤 + dead 스프라이트
  AIRBORNE: 'airborne', // 위로 던져진 후 중력으로 자연 낙하
  DONE: 'done',
};

const FREEZE_DURATION = 20;
const LAUNCH_SPEED = -4;   // 초기 상승 속도
const GRAVITY = 0.25;       // 중력 가속도

export class DeathAnimation {
  constructor() {
    this.phase = Phase.DONE;
    this.timer = 0;

    // 캐릭터 상태
    this.dinoX = 0;
    this.dinoY = 0;
    this.dinoWidth = 0;
    this.dinoHeight = 0;

    // 장애물 상태
    this.obsX = 0;
    this.obsY = 0;
    this.obsWidth = 0;
    this.obsHeight = 0;
    this.obsType = '';
    this.obsSpriteKeys = [];

    // 공통 수직 오프셋 (float/fall 시 적용)
    this.offsetY = 0;
    this.vy = 0;

    // 프레임 애니메이션
    this.frame = 0;
    this.frameTimer = 0;

    this.onComplete = null;
  }

  start(dino, obstacle, onComplete) {
    this.phase = Phase.FREEZE;
    this.timer = 0;
    this.offsetY = 0;
    this.vy = 0;
    this.frame = 0;
    this.frameTimer = 0;
    this.onComplete = onComplete || null;

    // 캐릭터 위치/크기 캡처
    this.dinoX = dino.x;
    this.dinoY = dino.y;
    this.dinoWidth = dino.width;
    this.dinoHeight = dino.height;

    // 장애물 위치/크기 캡처
    this.obsX = obstacle.x;
    this.obsY = obstacle.y;
    this.obsWidth = obstacle.width;
    this.obsHeight = obstacle.height;
    this.obsType = obstacle.type;
    this.obsSpriteKeys = obstacle._spriteKeys ? [...obstacle._spriteKeys] : [];
  }

  update() {
    if (this.phase === Phase.DONE) return;

    // 프레임 애니메이션
    this.frameTimer++;
    if (this.frameTimer > 8) {
      this.frameTimer = 0;
      this.frame = 1 - this.frame;
    }

    switch (this.phase) {
      case Phase.FREEZE:
        this.timer++;
        if (this.timer >= FREEZE_DURATION) {
          this.phase = Phase.AIRBORNE;
          this.vy = LAUNCH_SPEED;
        }
        break;

      case Phase.AIRBORNE:
        this.vy += GRAVITY;
        this.offsetY += this.vy;
        // canvas 밖으로 충분히 벗어나면 완료
        if (this.offsetY > viewport.height) {
          this.phase = Phase.DONE;
          if (this.onComplete) this.onComplete();
        }
        break;
    }
  }

  draw(ctx) {
    if (this.phase === Phase.DONE) return;

    // Dino (dead 스프라이트)
    const dinoDrawY = this.dinoY - this.dinoHeight + this.offsetY;
    const dinoSpriteKey = 'dino-dead-1';
    const dinoImg = spriteLoader.getImage(dinoSpriteKey);
    if (dinoImg) {
      ctx.drawImage(dinoImg, this.dinoX, dinoDrawY, this.dinoWidth, this.dinoHeight);
    } else {
      drawPlaceholder(ctx, this.dinoX, dinoDrawY, this.dinoWidth, this.dinoHeight, 'DEAD');
    }

    // Obstacle
    const obsDrawY = this.obsY - this.obsHeight + this.offsetY;
    const obsKey = this.obsSpriteKeys[this.frame] || this.obsSpriteKeys[0];
    if (obsKey) {
      const obsImg = spriteLoader.getImage(obsKey);
      if (obsImg) {
        ctx.drawImage(obsImg, this.obsX, obsDrawY, this.obsWidth, this.obsHeight);
        return;
      }
    }
    drawPlaceholder(ctx, this.obsX, obsDrawY, this.obsWidth, this.obsHeight, this.obsType);
  }

  isComplete() {
    return this.phase === Phase.DONE;
  }
}
