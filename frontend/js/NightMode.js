import { viewport, NIGHT_CYCLE_SCORE, NIGHT_TRANSITION_FRAMES } from './config.js';
import { lerpColor } from './utils.js';
import { spriteLoader } from './SpriteLoader.js';

export class NightMode {
  constructor() {
    this.active = false;
    this.opacity = 0;
    this.moonX = viewport.width - 60;
    this.moonY = 20;
    this.stars = [];
    for (let i = 0; i < 5; i++) {
      this.stars.push({
        x: 50 + Math.random() * (viewport.width - 100),
        y: 10 + Math.random() * 40,
      });
    }
    this.phase = 0;
  }

  update(score) {
    const cycle = Math.floor(score / NIGHT_CYCLE_SCORE);
    const shouldBeNight = cycle % 2 === 1;

    if (shouldBeNight && !this.active) {
      this.active = true;
      this.phase = (this.phase + 1) % 6;
      for (let i = 0; i < this.stars.length; i++) {
        this.stars[i].x = 50 + Math.random() * (viewport.width - 100);
        this.stars[i].y = 10 + Math.random() * 40;
      }
    } else if (!shouldBeNight && this.active) {
      this.active = false;
    }

    const target = this.active ? 1 : 0;
    this.opacity += (target - this.opacity) * (1 / NIGHT_TRANSITION_FRAMES);
    if (Math.abs(this.opacity - target) < 0.01) this.opacity = target;
  }

  getColors() {
    const t = this.opacity;
    const bg = lerpColor([247, 247, 247], [32, 33, 36], t);
    const fg = lerpColor([0, 0, 0], [200, 200, 200], t);
    return {
      bg: `rgb(${bg[0]},${bg[1]},${bg[2]})`,
      fg: `rgb(${fg[0]},${fg[1]},${fg[2]})`,
      cloudFg: `rgba(${fg[0]},${fg[1]},${fg[2]},0.3)`,
    };
  }

  draw(ctx, color) {
    if (this.opacity < 0.01) return;
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = color;

    // Moon — crescent arc
    const mx = this.moonX;
    const my = this.moonY;
    ctx.beginPath();
    ctx.arc(mx + 7, my + 7, 7, 0, Math.PI * 2);
    ctx.fill();
    // Phase shadow
    if (this.phase > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const offset = this.phase * 2;
      ctx.beginPath();
      ctx.arc(mx + 7 + offset, my + 7, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Stars — small cross pattern
    for (const star of this.stars) {
      ctx.fillRect(star.x + 1, star.y, 1, 3);
      ctx.fillRect(star.x, star.y + 1, 3, 1);
    }

    ctx.globalAlpha = 1;
  }
}
