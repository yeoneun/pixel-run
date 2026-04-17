import { viewport } from "./config.js";
import { Girlfriend } from "./Girlfriend.js";

const TITLE_FONT = "'Press Start 2P', monospace";

const Phase = {
  CLEAR_OBSTACLES: "clear_obstacles", // 장애물 등장 중단, 기존 장애물 빠져나감
  GIRLFRIEND_ENTER: "girlfriend_enter", // 여친 쥐 오른쪽에서 등장
  DINO_RUN: "dino_run", // 주인공이 오른쪽으로 이동
  MEET: "meet", // 만남 → 하트 스프라이트
  SHOW_TEXT: "show_text", // "Love wins all" + ↻
  EXIT: "exit", // 다시하기: 오른쪽 캐릭터 퇴장
  DONE: "done",
};

const GF_ENTER_SPEED = 2;
const DINO_RUN_SPEED = 3;
const EXIT_SPEED = 4;

export class HappyEnding {
  constructor() {
    this.phase = Phase.DONE;
    this.girlfriend = null;
    this.dino = null;
    this.meetX = 0;
    this.showText = false;
    this.onComplete = null;
    this.timer = 0;
  }

  start(dino) {
    this.phase = Phase.GIRLFRIEND_ENTER;
    this.dino = dino;
    this.girlfriend = new Girlfriend();
    // 여친 쥐를 화면 오른쪽 밖에 배치
    this.girlfriend.x = viewport.width + 10;
    // 만남 지점: 화면 중앙보다 약간 오른쪽
    this.meetX = viewport.width * 0.6;
    this.showText = false;
    this.timer = 0;
    this.onComplete = null;
  }

  update(obstacles) {
    if (this.phase === Phase.DONE) return;

    this.girlfriend?.update();

    switch (this.phase) {
      case Phase.CLEAR_OBSTACLES:
        // 기존 장애물이 화면 밖으로 빠져나가기를 기다림
        this.timer++;
        if (!obstacles || obstacles.length === 0 || this.timer > 120) {
          this.phase = Phase.GIRLFRIEND_ENTER;
          this.girlfriend.x = viewport.width + 10;
        }
        break;

      case Phase.GIRLFRIEND_ENTER:
        // 여친 쥐가 오른쪽에서 들어옴
        this.girlfriend.x -= GF_ENTER_SPEED;
        if (this.girlfriend.x <= this.meetX + 40) {
          this.girlfriend.x = this.meetX + 40;
          this.phase = Phase.DINO_RUN;
        }
        break;

      case Phase.DINO_RUN:
        // 주인공이 오른쪽으로 이동
        this.dino.x += DINO_RUN_SPEED;
        if (this.dino.x >= this.meetX) {
          this.dino.x = this.meetX;
          this.phase = Phase.MEET;
          this.timer = 0;
        }
        break;

      case Phase.MEET:
        // 만남 → happy 스프라이트 전환
        this.dino.happy = true;
        this.girlfriend.happy = true;
        this.timer++;
        if (this.timer > 30) {
          this.phase = Phase.SHOW_TEXT;
          this.showText = true;
        }
        break;

      case Phase.SHOW_TEXT:
        // 대기 — 사용자 입력으로 restart
        break;

      case Phase.EXIT:
        // 오른쪽 캐릭터들 퇴장
        this.dino.x += EXIT_SPEED;
        this.girlfriend.x += EXIT_SPEED;
        if (this.girlfriend.x > viewport.width + 50) {
          this.phase = Phase.DONE;
          if (this.onComplete) this.onComplete();
        }
        break;
    }
  }

  triggerExit(onComplete) {
    this.phase = Phase.EXIT;
    this.showText = false;
    this.onComplete = onComplete;
  }

  isShowingText() {
    return this.phase === Phase.SHOW_TEXT;
  }

  isActive() {
    return this.phase !== Phase.DONE;
  }

  shouldStopSpawning() {
    return this.phase !== Phase.DONE;
  }

  draw(ctx, colors) {
    if (this.phase === Phase.DONE) return;

    // 여친 쥐
    if (this.girlfriend && this.phase !== Phase.CLEAR_OBSTACLES) {
      this.girlfriend.draw(ctx, colors.fg);
    }

    // "Love wins all" 텍스트
    if (this.showText) {
      ctx.fillStyle = colors.fg;
      ctx.font = `24px ${TITLE_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Love wins all", viewport.width / 2, viewport.height / 2 - 30);

      // Restart icon — circular arrow
      const cx = viewport.width / 2;
      const cy = viewport.height / 2 + 5;
      const r = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, r, -Math.PI * 0.8, Math.PI * 0.6);
      ctx.strokeStyle = colors.fg;
      ctx.lineWidth = 2;
      ctx.stroke();
      const tipX = cx + r * Math.cos(Math.PI * 0.6);
      const tipY = cy + r * Math.sin(Math.PI * 0.6);
      ctx.beginPath();
      ctx.moveTo(tipX - 4, tipY - 4);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(tipX + 4, tipY - 2);
      ctx.strokeStyle = colors.fg;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
