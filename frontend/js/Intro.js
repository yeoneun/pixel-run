import { viewport } from "./config.js";
import { fitFontSize } from "./utils.js";

const TITLE_FONT = "'Press Start 2P', monospace";
const TITLE_TEXT = "Run\nDude\nRun";
const TITLE_FONT_SIZE = 28;
const PROMPT_TEXT = "PRESS SPACE TO START";
const SUB_PROMPT_TEXT = "or tap the screen";

const TITLE_GRAVITY = 0.25;
const DINO_RUN_SPEED = 4;
const DINO_START_X = -50;
const DINO_TARGET_X = 25;
const BLINK_INTERVAL = 50;

export class Intro {
  constructor() {
    this.titleY = 0;
    this.titleVy = 0;
    this.titleFalling = false;
    this.titleFallen = false;

    this.dinoEntering = false;
    this.dinoX = DINO_START_X;

    this.showPrompt = false;
    this.promptBlink = 0;

    this.startAnimationComplete = false;
  }

  onPreloadComplete() {
    this.showPrompt = true;
  }

  triggerStartAnimation() {
    this.titleFalling = true;
    this.titleVy = -1;
    this.dinoEntering = false;
    this.dinoX = DINO_START_X;
  }

  update() {
    this.promptBlink++;

    // Keep title centered until animation starts
    if (!this.titleFalling) {
      this.titleY = viewport.height / 2 - 30;
    }

    // Title fall animation
    if (this.titleFalling && !this.titleFallen) {
      this.titleVy += TITLE_GRAVITY;
      this.titleY += this.titleVy;
      if (this.titleY > viewport.height + 50) {
        this.titleFallen = true;
        this.dinoEntering = true;
        this.dinoX = DINO_START_X;
      }
    }

    // Dino entering from left (타이틀 낙하 완료 후 시작)
    if (this.dinoEntering) {
      this.dinoX += DINO_RUN_SPEED;
      if (this.dinoX >= DINO_TARGET_X) {
        this.dinoX = DINO_TARGET_X;
        this.dinoEntering = false;
        this.startAnimationComplete = true;
      }
    }
  }

  isStartAnimationComplete() {
    return this.startAnimationComplete;
  }

  getDinoX() {
    return this.dinoX;
  }

  draw(ctx, colors) {
    const cx = viewport.width / 2;
    // 타이틀은 항상 한 줄로 표시하고, 좁은 화면에서는 폰트 크기를 줄여 맞춘다.
    const titleText = TITLE_TEXT.split("\n").join(" ");
    const titleSize = fitFontSize(
      ctx,
      titleText,
      viewport.width * 0.9,
      TITLE_FONT_SIZE,
      (s) => `bold ${s}px ${TITLE_FONT}`,
    );

    // Title
    if (!this.titleFallen) {
      ctx.fillStyle = colors.fg;
      ctx.font = `bold ${titleSize}px ${TITLE_FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(titleText, cx, this.titleY);
    }

    // Prompt text (blink effect) — 타이틀 아래에 배치
    if (this.showPrompt && !this.titleFalling) {
      const visible = Math.floor(this.promptBlink / BLINK_INTERVAL) % 2 === 0;
      if (visible) {
        const promptSize = fitFontSize(
          ctx,
          PROMPT_TEXT,
          viewport.width * 0.9,
          12,
          (s) => `${s}px ${TITLE_FONT}`,
        );
        ctx.fillStyle = colors.fg;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const promptY = this.titleY + titleSize * 1.2 + promptSize;
        ctx.font = `${promptSize}px ${TITLE_FONT}`;
        ctx.fillText(PROMPT_TEXT, cx, promptY);
        ctx.fillText(SUB_PROMPT_TEXT, cx, promptY + promptSize + 8);
      }
    }
  }
}
