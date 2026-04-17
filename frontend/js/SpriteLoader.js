const API_URL = window.__DINO_API_URL__ || 'http://localhost:3001';
const SPRITE_API_BASE = `${API_URL}/sprites`;
const CONFIG_PATH = '../assets/sprite-config.json';

class SpriteLoader {
  constructor() {
    this.config = null;
    this.images = new Map();
    this.placeholders = new Set();
    this._loaded = false;
  }

  async init() {
    try {
      const res = await fetch(new URL(CONFIG_PATH, import.meta.url));
      this.config = await res.json();
      console.log('[SpriteLoader] Config loaded:', Object.keys(this.config));
    } catch (err) {
      console.warn('[SpriteLoader] Failed to load config:', err);
      this._loaded = true;
      return;
    }

    const keys = this._collectSpriteKeys();
    console.log(`[SpriteLoader] Preloading ${keys.length} sprites...`);

    const promises = keys.map((key) => this._loadImage(key));
    await Promise.all(promises);

    this._loaded = true;
    console.log(
      `[SpriteLoader] Preload complete. Loaded: ${this.images.size}, Placeholders: ${this.placeholders.size}`
    );
  }

  _collectSpriteKeys() {
    const keys = [];
    if (!this.config) return keys;

    const collectFromArray = (arr) => {
      for (const filename of arr) {
        keys.push(filename.replace(/\.\w+$/, ''));
      }
    };

    // dino
    if (this.config.dino) {
      for (const state of ['run', 'duck', 'jump', 'dead', 'happyEnding']) {
        if (this.config.dino[state]) {
          collectFromArray(this.config.dino[state]);
        }
      }
    }

    // girlfriend
    if (this.config.girlfriend) {
      for (const state of ['idle', 'happyEnding']) {
        if (this.config.girlfriend[state]) {
          collectFromArray(this.config.girlfriend[state]);
        }
      }
    }

    // obstacles
    if (this.config.obstacles) {
      for (const obs of this.config.obstacles) {
        collectFromArray(obs.sprites);
      }
    }

    // flyingObstacles
    if (this.config.flyingObstacles) {
      for (const obs of this.config.flyingObstacles) {
        collectFromArray(obs.sprites);
      }
    }

    // ground
    if (this.config.ground && this.config.ground.sprite) {
      keys.push(this.config.ground.sprite.replace(/\.\w+$/, ''));
    }

    return keys;
  }

  _loadImage(key) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(key, img);
        resolve();
      };
      img.onerror = () => {
        this.placeholders.add(key);
        resolve();
      };
      img.src = `${SPRITE_API_BASE}/${key}`;
    });
  }

  getImage(key) {
    return this.images.get(key) || null;
  }

  getSize(category, subcategory) {
    if (!this.config) return null;

    if (category === 'dino') {
      if (subcategory === 'duck') return this.config.dino.duckSize;
      return this.config.dino.size;
    }

    if (category === 'girlfriend') {
      return this.config.girlfriend.size;
    }

    if (category === 'obstacle') {
      const obs = this.config.obstacles.find((o) => o.type === subcategory);
      return obs ? obs.size : null;
    }

    if (category === 'flyingObstacle') {
      return this.config.flyingObstacles[0]?.size || null;
    }

    if (category === 'ground') {
      return this.config.ground.size;
    }

    return null;
  }

  getConfig() {
    return this.config;
  }

  isLoaded() {
    return this._loaded;
  }
}

export const spriteLoader = new SpriteLoader();
