import {
  CANVAS_WIDTH, CANVAS_HEIGHT, INITIAL_SPEED, MAX_SPEED,
  SPEED_INCREMENT, MIN_OBSTACLE_GAP,
} from './config.js';
import { SPRITES } from './sprites.js';
import { drawPixels, checkCollision } from './utils.js';
import { spriteLoader } from './SpriteLoader.js';
import { saveScore, loadRanking } from './api.js';
import { Dino } from './Dino.js';
import { Obstacle } from './Obstacle.js';
import { Ground } from './Ground.js';
import { Cloud } from './Cloud.js';
import { NightMode } from './NightMode.js';
import { Score } from './Score.js';

const State = {
  LOADING: 'loading',
  INTRO: 'intro',
  PLAYING: 'playing',
  GAMEOVER: 'gameover',
  HAPPYENDING: 'happyending',
};

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

class Game {
  constructor() {
    this.state = State.LOADING;
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
        this.state = State.INTRO;
      })
      .catch((err) => {
        console.warn('[Game] SpriteLoader init failed, transitioning to INTRO anyway:', err);
        this.state = State.INTRO;
      });

    this.loop();
  }

  bindEvents() {
    const handleAction = (action) => {
      if (action === 'jump') {
        if (this.state === State.INTRO) {
          this.start();
        } else if (this.state === State.GAMEOVER) {
          if (this.gameOverDelay <= 0) this.restart();
        } else if (this.state === State.PLAYING) {
          this.dino.jump();
        }
        // LOADING, HAPPYENDING: jump 무시
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

    // Touch support
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const y = touch.clientY - rect.top;
      if (y > rect.height * 0.6) {
        handleAction('duckStart');
      } else {
        handleAction('jump');
      }
    });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleAction('duckEnd');
    });

    // Responsive canvas
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const maxW = window.innerWidth * 0.95;
    const maxH = window.innerHeight * 0.8;
    const ratio = CANVAS_WIDTH / CANVAS_HEIGHT;

    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }

    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
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
    this.score.highScore = parseInt(localStorage.getItem('dinoHighScore') || '0', 10);
    this.obstacleTimer = 0;
    this.ground = new Ground();
    this.nightMode = new NightMode();
    this.dino.jump();
  }

  spawnObstacle() {
    const types = ['cactusSmall', 'cactusLarge', 'cactusDouble'];
    // Pterodactyls after score 200
    if (Math.floor(this.score.value) > 200) {
      types.push('ptero');
    }
    const type = types[Math.floor(Math.random() * types.length)];
    this.obstacles.push(new Obstacle(type, CANVAS_WIDTH + 10, this.speed));
  }

  update() {
    switch (this.state) {
      case State.LOADING:
        // SpriteLoader preload 진행 중 — 대기
        break;

      case State.INTRO:
        // 입력 대기 — 별도 업데이트 없음
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
    this.nightMode.update(Math.floor(this.score.value));

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

    const playerName = document.getElementById('playerName').value.trim() || 'anonymous';
    const finalScore = Math.floor(this.score.value);
    saveScore(playerName, finalScore).then(() => loadRanking());
  }

  draw() {
    const colors = this.nightMode.getColors();

    // Background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    document.body.style.background = colors.bg;

    switch (this.state) {
      case State.LOADING:
        this.drawLoading(colors);
        break;

      case State.INTRO:
        this.drawIntro(colors);
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
  }

  drawLoading(colors) {
    ctx.fillStyle = colors.fg;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  }

  drawIntro(colors) {
    // Ground + Clouds (배경 요소)
    this.ground.draw(ctx, colors.fg);
    for (const cloud of this.clouds) cloud.draw(ctx, colors.cloudFg);

    // Dino (대기 자세)
    this.dino.draw(ctx, colors.fg);

    ctx.fillStyle = colors.fg;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS SPACE TO START', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.font = '9px monospace';
    ctx.fillText('or tap the screen', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 5);
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
    ctx.fillText('G A M E  O V E R', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 15);

    // Restart icon
    const rx = CANVAS_WIDTH / 2 - 12;
    const ry = CANVAS_HEIGHT / 2;
    drawPixels(ctx, SPRITES.restart, rx, ry, 2.2, colors.fg);
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

// ── Start ──
new Game();
