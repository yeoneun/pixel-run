import {
  viewport, REFERENCE_HEIGHT, INITIAL_SPEED, MAX_SPEED,
  SPEED_INCREMENT, MIN_OBSTACLE_GAP,
} from './config.js';
import { checkCollision } from './utils.js';
import { spriteLoader } from './SpriteLoader.js';
import { Dino } from './Dino.js';
import { Obstacle } from './Obstacle.js';
import { Ground } from './Ground.js';
import { Cloud } from './Cloud.js';
import { NightMode } from './NightMode.js';
import { Score } from './Score.js';
import { Intro } from './Intro.js';

const State = {
  LOADING: 'loading',
  INTRO: 'intro',
  STARTING: 'starting',
  PLAYING: 'playing',
  GAMEOVER: 'gameover',
  HAPPYENDING: 'happyending',
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = viewport.width;
canvas.height = viewport.height;

class Game {
  constructor() {
    this.state = State.LOADING;
    this.intro = new Intro();
    this.dino = new Dino();
    this.ground = new Ground();
    this.obstacles = [];
    this.clouds = [];
    this.nightMode = new NightMode();
    this.score = new Score();
    this.speed = INITIAL_SPEED;
    this.obstacleTimer = 0;
    this.cloudTimer = 0;
    this.gameOverDelay = 0;

    // Pre-populate clouds
    for (let i = 0; i < 3; i++) {
      this.clouds.push(new Cloud(100 + i * 200, 15 + Math.random() * 40));
    }

    this.bindEvents();

    // SpriteLoader init → LOADING → INTRO
    spriteLoader.init()
      .then(() => {
        console.log('[Game] SpriteLoader ready, transitioning to INTRO');
        this.intro.onPreloadComplete();
        this.state = State.INTRO;
      })
      .catch((err) => {
        console.warn('[Game] SpriteLoader init failed, transitioning to INTRO anyway:', err);
        this.intro.onPreloadComplete();
        this.state = State.INTRO;
      });

    this.loop();
  }

  bindEvents() {
    const handleAction = (action) => {
      if (action === 'jump') {
        if (this.state === State.INTRO) {
          this.startIntroAnimation();
        } else if (this.state === State.GAMEOVER) {
          if (this.gameOverDelay <= 0) this.restart();
        } else if (this.state === State.PLAYING) {
          this.dino.jump();
        }
        // LOADING, STARTING, HAPPYENDING: jump 무시
      }
      if (action === 'duckStart' && this.state === State.PLAYING) {
        this.dino.duck(true);
      }
      if (action === 'duckEnd' && this.state === State.PLAYING) {
        this.dino.duck(false);
      }
    };

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleAction('jump');
      }
      if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleAction('duckStart');
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowDown') {
        handleAction('duckEnd');
      }
    });

    // Touch support (page-wide)
    document.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const y = touch.clientY - rect.top;
      if (y > rect.height * 0.6) {
        handleAction('duckStart');
      } else {
        handleAction('jump');
      }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleAction('duckEnd');
    }, { passive: false });

    // Responsive canvas
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    viewport.scale = window.innerHeight / REFERENCE_HEIGHT;
    viewport.width = canvas.width / viewport.scale;
    viewport.height = REFERENCE_HEIGHT;
  }

  startIntroAnimation() {
    this.state = State.STARTING;
    this.intro.triggerStartAnimation();
    // Dino를 화면 밖으로 이동 (Intro가 진입 위치를 관리)
    this.dino.x = -50;
  }

  start() {
    this.state = State.PLAYING;
    this.dino.jump();
  }

  restart() {
    this.state = State.PLAYING;
    this.dino = new Dino();
    this.obstacles = [];
    this.speed = INITIAL_SPEED;
    this.score = new Score();
    this.obstacleTimer = 0;
    this.ground = new Ground();
    this.nightMode = new NightMode();
    this.dino.jump();
  }

  spawnObstacle() {
    const types = ['obstacle-1', 'obstacle-2', 'obstacle-3', 'obstacle-4', 'obstacle-5'];
    if (this.score.displayValue > 200) {
      types.push('flying');
    }
    const type = types[Math.floor(Math.random() * types.length)];
    this.obstacles.push(new Obstacle(type, viewport.width + 10, this.speed));
  }

  update() {
    switch (this.state) {
      case State.LOADING:
        this.intro.update();
        break;

      case State.INTRO:
        this.intro.update();
        break;

      case State.STARTING:
        this.intro.update();
        this.dino.x = this.intro.getDinoX();
        this.dino.update();
        if (this.intro.isStartAnimationComplete()) {
          this.start();
        }
        break;

      case State.PLAYING:
        this.updatePlaying();
        break;

      case State.GAMEOVER:
        if (this.gameOverDelay > 0) this.gameOverDelay--;
        break;

      case State.HAPPYENDING:
        // 추후 Step 3-1에서 구현
        break;
    }
  }

  updatePlaying() {
    // Speed up
    if (this.speed < MAX_SPEED) {
      this.speed += SPEED_INCREMENT;
    }

    this.dino.update();
    this.ground.update(this.speed);
    this.score.update();
    this.nightMode.update(this.score.displayValue);

    // Obstacles
    this.obstacleTimer++;
    const minGap = Math.max(MIN_OBSTACLE_GAP - this.speed * 3, 40);
    if (this.obstacleTimer > minGap + Math.random() * 40) {
      this.spawnObstacle();
      this.obstacleTimer = 0;
    }

    for (const obs of this.obstacles) {
      obs.speed = this.speed;
      obs.update();
    }
    this.obstacles = this.obstacles.filter((o) => o.x > -50);

    // Clouds
    this.cloudTimer++;
    if (this.cloudTimer > 120 + Math.random() * 80) {
      this.clouds.push(new Cloud());
      this.cloudTimer = 0;
    }
    for (const cloud of this.clouds) cloud.update();
    this.clouds = this.clouds.filter((c) => c.x > -60);

    // Collision
    const dinoHB = this.dino.hitbox;
    for (const obs of this.obstacles) {
      if (checkCollision(dinoHB, obs.hitbox)) {
        this.gameOver();
        return;
      }
    }

    // TODO: Step 3-1에서 해피엔딩 트리거 점수 체크 추가
  }

  gameOver() {
    this.state = State.GAMEOVER;
    this.score.save();
    this.gameOverDelay = 20; // Prevent instant restart

  }

  draw() {
    const colors = this.nightMode.getColors();

    ctx.save();
    ctx.scale(viewport.scale, viewport.scale);

    // Background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    document.body.style.background = colors.bg;

    switch (this.state) {
      case State.LOADING:
        this.drawLoading(colors);
        break;

      case State.INTRO:
        this.drawIntro(colors);
        break;

      case State.STARTING:
        this.drawStarting(colors);
        break;

      case State.PLAYING:
        this.drawPlaying(colors);
        break;

      case State.GAMEOVER:
        this.drawPlaying(colors);
        this.drawGameOver(colors);
        break;

      case State.HAPPYENDING:
        this.drawPlaying(colors);
        // 추후 Step 3-1에서 해피엔딩 연출 추가
        break;
    }

    ctx.restore();
  }

  drawLoading(colors) {
    this.ground.draw(ctx, colors.fg);
    this.intro.draw(ctx, colors);
  }

  drawIntro(colors) {
    // Ground + Clouds (배경 요소)
    for (const cloud of this.clouds) cloud.draw(ctx, colors.cloudFg);
    this.ground.draw(ctx, colors.fg);

    // Dino (대기 자세)
    this.dino.draw(ctx, colors.fg);

    // Intro overlay (타이틀 + 프롬프트)
    this.intro.draw(ctx, colors);
  }

  drawStarting(colors) {
    for (const cloud of this.clouds) cloud.draw(ctx, colors.cloudFg);
    this.ground.draw(ctx, colors.fg);
    this.dino.draw(ctx, colors.fg);
    this.intro.draw(ctx, colors);
  }

  drawPlaying(colors) {
    // Night elements (moon, stars)
    this.nightMode.draw(ctx, colors.fg);

    // Clouds
    for (const cloud of this.clouds) cloud.draw(ctx, colors.cloudFg);

    // Ground
    this.ground.draw(ctx, colors.fg);

    // Obstacles
    for (const obs of this.obstacles) obs.draw(ctx, colors.fg);

    // Dino
    this.dino.draw(ctx, colors.fg);

    // Score
    this.score.draw(ctx, colors.fg);
  }

  drawGameOver(colors) {
    ctx.fillStyle = colors.fg;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('G A M E  O V E R', viewport.width / 2, viewport.height / 2 - 15);

    // Restart icon — circular arrow via canvas arcs
    const cx = viewport.width / 2;
    const cy = viewport.height / 2 + 12;
    const r = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI * 0.8, Math.PI * 0.6);
    ctx.strokeStyle = colors.fg;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Arrow tip
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

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

// ── Start ──
new Game();
