import { viewport, GRAVITY, JUMP_VELOCITY } from './config.js';
import { spriteLoader } from './SpriteLoader.js';
import { drawPlaceholder } from './utils.js';

export class Dino {
  constructor() {
    this.x = 25;
    this.y = viewport.groundY;
    this.ducking = false;
    this.jumping = false;
    this.dead = false;
    this.happy = false;
    this.vy = 0;
    this.frame = 0;
    this.frameTimer = 0;
  }

  get width() {
    const config = spriteLoader.getConfig();
    if (this.ducking && config?.dino?.duckSize) return config.dino.duckSize.w;
    if (config?.dino?.size) return config.dino.size.w;
    return this.ducking ? 118 : 88;
  }

  get height() {
    const config = spriteLoader.getConfig();
    if (this.ducking && config?.dino?.duckSize) return config.dino.duckSize.h;
    if (config?.dino?.size) return config.dino.size.h;
    return this.ducking ? 60 : 96;
  }

  get hitbox() {
    const config = spriteLoader.getConfig();
    const drawY = this.y - this.height;

    if (this.ducking && config?.dino?.duckHitbox) {
      const hb = config.dino.duckHitbox;
      return { x: this.x + hb.x, y: drawY + hb.y, w: hb.w, h: hb.h };
    }
    if (config?.dino?.hitbox) {
      const hb = config.dino.hitbox;
      return { x: this.x + hb.x, y: drawY + hb.y, w: hb.w, h: hb.h };
    }
    return { x: this.x + 4, y: drawY, w: this.width - 8, h: this.height };
  }

  jump() {
    if (!this.jumping) {
      this.jumping = true;
      this.vy = JUMP_VELOCITY;
      this.ducking = false;
    }
  }

  duck(active) {
    if (this.jumping) {
      if (active) this.vy = Math.max(this.vy, 4);
      return;
    }
    this.ducking = active;
  }

  update() {
    if (this.jumping) {
      this.vy += GRAVITY;
      this.y += this.vy;
      if (this.y >= viewport.groundY) {
        this.y = viewport.groundY;
        this.jumping = false;
        this.vy = 0;
      }
    } else {
      this.y = viewport.groundY;
    }
    this.frameTimer++;
    if (this.frameTimer > 6) {
      this.frameTimer = 0;
      this.frame = 1 - this.frame;
    }
  }

  _getSpriteKey() {
    if (this.happy) return `dino-happy-${this.frame + 1}`;
    if (this.dead) return `dino-dead-${this.frame + 1}`;
    if (this.ducking) return `dino-duck-${this.frame + 1}`;
    if (this.jumping) return `dino-jump-${this.frame + 1}`;
    return `dino-run-${this.frame + 1}`;
  }

  _getLabel() {
    if (this.happy) return 'HAPPY';
    if (this.dead) return 'DEAD';
    if (this.ducking) return 'DUCK';
    if (this.jumping) return 'JUMP';
    return 'RUN';
  }

  draw(ctx, color) {
    const w = this.width;
    const h = this.height;
    const drawY = this.y - h;

    const img = spriteLoader.getImage(this._getSpriteKey());
    if (img) {
      ctx.drawImage(img, this.x, drawY, w, h);
    } else {
      drawPlaceholder(ctx, this.x, drawY, w, h, this._getLabel());
    }
  }
}
