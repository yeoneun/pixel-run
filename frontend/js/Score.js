import { viewport } from "./config.js";

const SCORE_PER_TICK = 1;

export class Score {
  constructor() {
    this.value = 0;
  }

  get displayValue() {
    return Math.floor(this.value / 10) * 50;
  }

  update() {
    this.value += SCORE_PER_TICK;
  }

  save() {}

  draw(ctx, color) {
    ctx.fillStyle = color;
    ctx.font = "16px 'Press Start 2P', monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(this.displayValue).padStart(5, "0"), viewport.width - 10, 32);
  }
}
