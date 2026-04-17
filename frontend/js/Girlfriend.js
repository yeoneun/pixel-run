import { viewport } from './config.js';
import { spriteLoader } from './SpriteLoader.js';
import { drawPlaceholder } from './utils.js';

export class Girlfriend {
  constructor() {
    const config = spriteLoader.getConfig();
    const gfConfig = config?.girlfriend;

    this.width = gfConfig?.size?.w || 35;
    this.height = gfConfig?.size?.h || 38;

    this.x = 0;
    this.y = viewport.groundY;
    this.happy = false;

    this.frame = 0;
    this.frameTimer = 0;
  }

  update() {
    this.frameTimer++;
    if (this.frameTimer > 6) {
      this.frameTimer = 0;
      this.frame = 1 - this.frame;
    }
  }

  _getSpriteKey() {
    if (this.happy) return `girlfriend-happy-${this.frame + 1}`;
    return `girlfriend-idle-${this.frame + 1}`;
  }

  _getLabel() {
    return this.happy ? 'GF-HAPPY' : 'GF-IDLE';
  }

  draw(ctx, color) {
    const drawY = this.y - this.height;
    const img = spriteLoader.getImage(this._getSpriteKey());
    if (img) {
      ctx.drawImage(img, this.x, drawY, this.width, this.height);
    } else {
      drawPlaceholder(ctx, this.x, drawY, this.width, this.height, this._getLabel());
    }
  }
}
