const API_URL = window.__DINO_API_URL__ || 'http://localhost:3001';
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30분

let idleTimer = null;

function getToken() {
  return sessionStorage.getItem('admin_token');
}

function setToken(token) {
  sessionStorage.setItem('admin_token', token);
}

function clearToken() {
  sessionStorage.removeItem('admin_token');
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    clearToken();
    location.reload();
  }, IDLE_TIMEOUT);
}

async function apiCall(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    clearToken();
    location.reload();
    return null;
  }
  return res;
}

// --- Login ---
function initLogin() {
  const form = document.getElementById('login-form');
  const error = document.getElementById('login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.classList.add('hidden');
    const password = document.getElementById('password-input').value;

    try {
      const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        error.textContent = '비밀번호가 올바르지 않습니다.';
        error.classList.remove('hidden');
        return;
      }
      const data = await res.json();
      setToken(data.token);
      showAdminPanel();
    } catch {
      error.textContent = '서버에 연결할 수 없습니다.';
      error.classList.remove('hidden');
    }
  });
}

// --- Admin Panel ---
function showAdminPanel() {
  document.getElementById('login-section').classList.add('hidden');
  document.getElementById('admin-panel').classList.remove('hidden');
  resetIdleTimer();
  document.addEventListener('click', resetIdleTimer);
  document.addEventListener('keydown', resetIdleTimer);

  initTabs();
  loadSprites();
  loadSettings();
  document.getElementById('save-sprites-btn').addEventListener('click', saveAllChanges);
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
    });
  });

  document.getElementById('logout-btn').addEventListener('click', () => {
    clearToken();
    location.reload();
  });
}

// --- Sprites ---
const SPRITE_SECTIONS = [
  {
    id: 'dino',
    title: '공룡 (Dino)',
    sprites: [
      { key: 'dino-run-1', label: '달리기 1', size: '44×53' },
      { key: 'dino-run-2', label: '달리기 2', size: '44×53' },
      { key: 'dino-duck-1', label: '숙이기 1', size: '59×34' },
      { key: 'dino-duck-2', label: '숙이기 2', size: '59×34' },
      { key: 'dino-jump-1', label: '점프', size: '44×53' },
      { key: 'dino-dead-1', label: '죽음', size: '44×53' },
      { key: 'dino-happy-1', label: '해피엔딩', size: '44×53' },
    ]
  },
  {
    id: 'girlfriend',
    title: '여자친구 (Girlfriend)',
    sprites: [
      { key: 'girlfriend-idle-1', label: '대기', size: '44×53' },
      { key: 'girlfriend-happy-1', label: '해피엔딩', size: '44×53' },
    ]
  },
  {
    id: 'obstacles',
    title: '장애물 (Obstacles)',
    sprites: [
      { key: 'obstacle-1-1', label: '장애물 1', size: '27×21' },
      { key: 'obstacle-2-1', label: '장애물 2', size: '60×21' },
      { key: 'obstacle-3-1', label: '장애물 3', size: '52×38' },
      { key: 'obstacle-4-1', label: '장애물 4', size: '52×38' },
      { key: 'obstacle-5-1', label: '장애물 5', size: '52×38' },
      { key: 'obstacle-fly-1', label: '날개 장애물 1', size: '47×58' },
      { key: 'obstacle-fly-2', label: '날개 장애물 2', size: '47×58' },
    ]
  },
];

// Preview sprite layout: key → { x, y, w, h } in game coordinates (600×270)
const PREVIEW_LAYOUT = {
  'dino-run-1':        { x: 50,  w: 44, h: 53 },
  'girlfriend-idle-1': { x: 530, w: 44, h: 53 },
  'obstacle-1-1':      { x: 160, w: 27, h: 21 },
  'obstacle-2-1':      { x: 220, w: 60, h: 21 },
  'obstacle-3-1':      { x: 310, w: 52, h: 38 },
  'obstacle-fly-1':    { x: 420, w: 47, h: 58, flying: true },
};

const pendingChanges = new Map(); // key → { action: 'upload'|'delete', file: File|null, objectUrl: string|null }

function loadSprites() {
  const container = document.getElementById('sprites-container');
  container.innerHTML = '';

  SPRITE_SECTIONS.forEach(section => {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'sprite-section';
    sectionEl.innerHTML = `<h3 class="sprite-section-title">${section.title}</h3>`;

    const grid = document.createElement('div');
    grid.className = 'sprites-grid';

    section.sprites.forEach(sprite => {
      const card = document.createElement('div');
      card.className = 'sprite-card';
      card.id = `card-${sprite.key}`;
      card.innerHTML = `
        <div class="sprite-label">${sprite.label}</div>
        <div class="sprite-key">${sprite.key}</div>
        <img src="${API_URL}/sprites/${sprite.key}" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'">
        <div class="no-image" style="display:none">No Image</div>
        <div class="sprite-size">권장: ${sprite.size}px</div>
        <input type="file" accept="image/webp,image/png,image/svg+xml" id="file-${sprite.key}">
        <div class="sprite-actions">
          <button class="upload-btn" data-key="${sprite.key}">파일 선택</button>
          <button class="delete-btn" data-key="${sprite.key}">삭제</button>
        </div>
        <div class="upload-status hidden"></div>
      `;
      grid.appendChild(card);

      const btn = card.querySelector('.upload-btn');
      const fileInput = card.querySelector('input[type="file"]');
      btn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => stageUpload(sprite.key, fileInput, card));

      const delBtn = card.querySelector('.delete-btn');
      delBtn.addEventListener('click', () => stageDelete(sprite.key, card));
    });

    sectionEl.appendChild(grid);
    container.appendChild(sectionEl);
  });

  drawPreview();
}

function stageUpload(key, fileInput, card) {
  const file = fileInput.files[0];
  if (!file) return;

  const old = pendingChanges.get(key);
  if (old && old.objectUrl) URL.revokeObjectURL(old.objectUrl);

  const objectUrl = URL.createObjectURL(file);
  pendingChanges.set(key, { action: 'upload', file, objectUrl });

  const img = card.querySelector('img');
  img.src = objectUrl;
  img.style.display = '';
  card.querySelector('.no-image').style.display = 'none';
  card.classList.add('pending');

  const status = card.querySelector('.upload-status');
  status.textContent = '저장 대기 중';
  status.style.color = '#d69e2e';
  status.classList.remove('hidden');

  fileInput.value = '';
  updateSaveButton();
  drawPreview();
}

function stageDelete(key, card) {
  if (!confirm(`"${key}" 스프라이트를 삭제하시겠습니까?`)) return;

  const old = pendingChanges.get(key);
  if (old && old.objectUrl) URL.revokeObjectURL(old.objectUrl);

  pendingChanges.set(key, { action: 'delete', file: null, objectUrl: null });

  const img = card.querySelector('img');
  img.style.display = 'none';
  card.querySelector('.no-image').style.display = 'inline-flex';
  card.classList.add('pending');

  const status = card.querySelector('.upload-status');
  status.textContent = '삭제 대기 중';
  status.style.color = '#e53e3e';
  status.classList.remove('hidden');

  updateSaveButton();
  drawPreview();
}

function updateSaveButton() {
  const btn = document.getElementById('save-sprites-btn');
  const count = pendingChanges.size;
  if (count > 0) {
    btn.disabled = false;
    btn.textContent = `변경사항 저장 (${count}건)`;
  } else {
    btn.disabled = true;
    btn.textContent = '변경사항 저장';
  }
}

async function saveAllChanges() {
  const btn = document.getElementById('save-sprites-btn');
  btn.disabled = true;
  btn.textContent = '저장 중...';

  const entries = [...pendingChanges.entries()];
  let success = 0;
  let fail = 0;

  for (const [key, change] of entries) {
    const card = document.getElementById(`card-${key}`);
    const status = card ? card.querySelector('.upload-status') : null;

    if (change.action === 'upload') {
      const formData = new FormData();
      formData.append('image', change.file);
      const res = await apiCall(`/admin/sprites/${key}`, { method: 'POST', body: formData });
      if (res && res.ok) {
        success++;
        if (card) {
          const img = card.querySelector('img');
          img.src = `${API_URL}/sprites/${key}?t=${Date.now()}`;
          img.style.display = '';
          card.querySelector('.no-image').style.display = 'none';
          card.classList.remove('pending');
          if (status) {
            status.textContent = '업로드 완료';
            status.style.color = '#38a169';
          }
        }
      } else {
        fail++;
        if (status) {
          const err = res ? await res.json() : { message: '서버 오류' };
          status.textContent = `실패: ${err.message}`;
          status.style.color = '#e53e3e';
        }
      }
    } else if (change.action === 'delete') {
      const res = await apiCall(`/admin/sprites/${key}`, { method: 'DELETE' });
      if (res && res.ok) {
        success++;
        if (card) {
          card.classList.remove('pending');
          if (status) {
            status.textContent = '삭제 완료';
            status.style.color = '#38a169';
          }
        }
      } else {
        fail++;
        if (status) {
          const err = res ? await res.json() : { message: '서버 오류' };
          status.textContent = `삭제 실패: ${err.message}`;
          status.style.color = '#e53e3e';
        }
      }
    }

    if (change.objectUrl) URL.revokeObjectURL(change.objectUrl);
    if (fail === 0) pendingChanges.delete(key);
  }

  if (fail === 0) pendingChanges.clear();
  updateSaveButton();
  drawPreview();
}

// --- Preview ---
function drawPreview() {
  const canvas = document.getElementById('preview-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 600, H = 270;
  const groundY = H - 30;

  // Build draw queue
  const drawQueue = [];
  for (const [key, layout] of Object.entries(PREVIEW_LAYOUT)) {
    const pending = pendingChanges.get(key);
    if (pending && pending.action === 'delete') continue;

    let imgSrc;
    if (pending && pending.objectUrl) {
      imgSrc = pending.objectUrl;
    } else {
      imgSrc = `${API_URL}/sprites/${key}`;
    }

    let y;
    if (layout.flying) {
      y = groundY - layout.h - 60;
    } else {
      y = groundY - layout.h;
    }

    drawQueue.push({ imgSrc, x: layout.x, y, w: layout.w, h: layout.h, key });
  }

  // Load all images first, then draw everything at once
  const imageResults = new Map();
  let loaded = 0;
  const total = drawQueue.length;

  if (total === 0) {
    renderPreviewCanvas(ctx, W, H, groundY, drawQueue, imageResults);
    return;
  }

  drawQueue.forEach(item => {
    const img = new Image();
    img.onload = () => {
      imageResults.set(item.key, img);
      loaded++;
      if (loaded === total) renderPreviewCanvas(ctx, W, H, groundY, drawQueue, imageResults);
    };
    img.onerror = () => {
      imageResults.set(item.key, null);
      loaded++;
      if (loaded === total) renderPreviewCanvas(ctx, W, H, groundY, drawQueue, imageResults);
    };
    img.src = item.imgSrc;
  });
}

function renderPreviewCanvas(ctx, W, H, groundY, drawQueue, imageResults) {
  ctx.clearRect(0, 0, W, H);

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
  skyGrad.addColorStop(0, '#e8f4fd');
  skyGrad.addColorStop(1, '#f7f7f7');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H);

  // Grid lines for scale
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Ground line
  ctx.fillStyle = '#535353';
  ctx.fillRect(0, groundY, W, 1);

  // Ground area
  ctx.fillStyle = '#f0ebe0';
  ctx.fillRect(0, groundY + 1, W, H - groundY - 1);

  // Draw sprites
  drawQueue.forEach(item => {
    const img = imageResults.get(item.key);
    if (img) {
      ctx.drawImage(img, item.x, item.y, item.w, item.h);
    } else {
      // Placeholder for missing sprites
      ctx.fillStyle = '#ddd';
      ctx.fillRect(item.x, item.y, item.w, item.h);
      ctx.strokeStyle = '#bbb';
      ctx.strokeRect(item.x, item.y, item.w, item.h);
      ctx.fillStyle = '#999';
      ctx.font = '7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.key, item.x + item.w / 2, item.y + item.h / 2 + 3);
      ctx.textAlign = 'left';
    }

    // Size label
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${item.w}×${item.h}`, item.x + item.w / 2, item.y + item.h + 10);
    ctx.textAlign = 'left';
  });

  // Title
  ctx.fillStyle = '#aaa';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('게임 화면 미리보기 (600×270)', 4, 12);

  // Scale markers
  ctx.fillStyle = '#ccc';
  ctx.font = '8px sans-serif';
  ctx.fillText('0', 2, H - 2);
  ctx.textAlign = 'right';
  ctx.fillText('600px', W - 2, H - 2);
  ctx.textAlign = 'left';
}

// --- Settings ---
async function loadSettings() {
  const res = await fetch(`${API_URL}/settings`);
  if (!res.ok) return;
  const settings = await res.json();
  document.getElementById('happy-ending-score').value = settings.happy_ending_score || 10000;

  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
}

async function saveSettings() {
  const value = document.getElementById('happy-ending-score').value;
  const status = document.getElementById('settings-status');

  const res = await apiCall('/admin/settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ happy_ending_score: value }),
  });

  if (res && res.ok) {
    status.textContent = '저장되었습니다.';
    status.style.color = '#38a169';
  } else {
    status.textContent = '저장에 실패했습니다.';
    status.style.color = '#e53e3e';
  }
  status.classList.remove('hidden');
  setTimeout(() => status.classList.add('hidden'), 3000);
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  if (getToken()) {
    showAdminPanel();
  } else {
    initLogin();
  }
});
