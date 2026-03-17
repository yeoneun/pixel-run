import { escapeHtml } from './utils.js';

const API_URL = 'http://localhost:3001';

export async function saveScore(playerName, score) {
  try {
    await fetch(`${API_URL}/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_name: playerName, score }),
    });
  } catch (e) {
    console.warn('Failed to save score:', e);
  }
}

export async function loadRanking() {
  const body = document.getElementById('ranking-body');
  try {
    const res = await fetch(`${API_URL}/scores`);
    const data = await res.json();
    if (!data.length) {
      body.innerHTML = '<p class="empty-msg">No records yet</p>';
      return;
    }
    let html = '<table><tr><th>#</th><th>Player</th><th>Score</th></tr>';
    data.forEach((row, i) => {
      html += `<tr><td>${i + 1}</td><td>${escapeHtml(row.player_name)}</td><td class="score-col">${row.score}</td></tr>`;
    });
    html += '</table>';
    body.innerHTML = html;
  } catch (e) {
    body.innerHTML = '<p class="empty-msg">Server offline</p>';
  }
}

loadRanking();
