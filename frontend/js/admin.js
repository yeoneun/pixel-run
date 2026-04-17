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
  loadRanking();
  loadSprites();
  loadSettings();
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

// --- Ranking ---
function maskContact(contact) {
  if (!contact || contact.length < 7) return contact || '-';
  return contact.slice(0, 3) + '-****-' + contact.slice(-4);
}

async function loadRanking() {
  const res = await apiCall('/scores');
  if (!res) return;
  const scores = await res.json();
  const tbody = document.querySelector('#ranking-table tbody');
  tbody.innerHTML = '';

  scores.forEach((s, i) => {
    const tr = document.createElement('tr');
    const contactCell = document.createElement('td');
    contactCell.className = 'contact-masked';
    contactCell.textContent = maskContact(s.contact);
    contactCell.addEventListener('click', () => {
      contactCell.textContent = contactCell.textContent.includes('*')
        ? (s.contact || '-')
        : maskContact(s.contact);
    });

    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${escapeHtml(s.player_name)}</td>
    `;
    tr.appendChild(contactCell);
    tr.innerHTML += `
      <td>${s.score.toLocaleString()}</td>
      <td>${new Date(s.created_at).toLocaleDateString('ko-KR')}</td>
      <td>
        <button class="action-btn edit-btn" data-id="${s.id}">수정</button>
        <button class="action-btn delete delete-btn" data-id="${s.id}">삭제</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editScore(btn.dataset.id));
  });
  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteScore(btn.dataset.id));
  });
}

async function editScore(id) {
  const res = await apiCall(`/scores/${id}`);
  if (!res) return;
  const score = await res.json();

  const newName = prompt('이름:', score.player_name);
  if (newName === null) return;
  const newScore = prompt('점수:', score.score);
  if (newScore === null) return;

  await apiCall(`/scores/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_name: newName, score: parseInt(newScore, 10) }),
  });
  loadRanking();
}

async function deleteScore(id) {
  if (!confirm('정말 삭제하시겠습니까?')) return;
  await apiCall(`/scores/${id}`, { method: 'DELETE' });
  loadRanking();
}

// --- Sprites ---
const SPRITE_KEYS = [
  'dino-run-1', 'dino-run-2',
  'dino-duck-1', 'dino-duck-2',
  'dino-jump-1', 'dino-jump-2',
  'dino-dead-1', 'dino-dead-2',
  'dino-happy-1', 'dino-happy-2',
  'girlfriend-idle-1', 'girlfriend-idle-2',
  'girlfriend-happy-1', 'girlfriend-happy-2',
  'obstacle-1-1', 'obstacle-1-2',
  'obstacle-2-1', 'obstacle-2-2',
  'obstacle-3-1', 'obstacle-3-2',
  'obstacle-4-1', 'obstacle-4-2',
  'obstacle-5-1', 'obstacle-5-2',
  'obstacle-fly-1', 'obstacle-fly-2',
  'ground',
];

function loadSprites() {
  const grid = document.getElementById('sprites-grid');
  grid.innerHTML = '';

  SPRITE_KEYS.forEach(key => {
    const card = document.createElement('div');
    card.className = 'sprite-card';
    card.innerHTML = `
      <div class="sprite-key">${key}</div>
      <img src="${API_URL}/sprites/${key}" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'">
      <div class="no-image" style="display:none">No Image</div>
      <br>
      <input type="file" accept="image/webp,image/png" id="file-${key}">
      <button class="upload-btn" data-key="${key}">업로드</button>
      <div class="upload-status hidden"></div>
    `;
    grid.appendChild(card);

    const btn = card.querySelector('.upload-btn');
    const fileInput = card.querySelector('input[type="file"]');
    btn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => uploadSprite(key, fileInput, card));
  });
}

async function uploadSprite(key, fileInput, card) {
  const file = fileInput.files[0];
  if (!file) return;

  const status = card.querySelector('.upload-status');
  status.textContent = '업로드 중...';
  status.classList.remove('hidden');

  const formData = new FormData();
  formData.append('image', file);

  const res = await apiCall(`/admin/sprites/${key}`, {
    method: 'POST',
    body: formData,
  });

  if (res && res.ok) {
    status.textContent = '업로드 완료';
    status.style.color = '#38a169';
    const img = card.querySelector('img');
    img.src = `${API_URL}/sprites/${key}?t=${Date.now()}`;
    img.style.display = '';
    card.querySelector('.no-image').style.display = 'none';
  } else {
    const err = res ? await res.json() : { message: '서버 오류' };
    status.textContent = `실패: ${err.message}`;
    status.style.color = '#e53e3e';
  }
  fileInput.value = '';
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

// --- Utility ---
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  if (getToken()) {
    showAdminPanel();
  } else {
    initLogin();
  }
});
