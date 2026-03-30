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

export async function updateScore(id, playerName, score) {
  try {
    const res = await fetch(`${API_URL}/scores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_name: playerName, score }),
    });
    return await res.json();
  } catch (e) {
    console.warn('Failed to update score:', e);
  }
}

export async function deleteScore(id) {
  try {
    await fetch(`${API_URL}/scores/${id}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('Failed to delete score:', e);
  }
}

export async function loadRanking() {
  const container = document.getElementById('ranking-body');
  try {
    const res = await fetch(`${API_URL}/scores`);
    const data = await res.json();
    if (!data.length) {
      container.innerHTML = '<p class="empty-msg">No records yet</p>';
      return;
    }
    let html = '<table><tr><th>#</th><th>Player</th><th>Score</th><th></th></tr>';
    data.forEach((row, i) => {
      html += `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(row.player_name)}</td>
        <td class="score-col">${row.score}</td>
        <td class="action-col">
          <button class="btn-edit" data-id="${row.id}" data-name="${escapeHtml(row.player_name)}" data-score="${row.score}">✎</button>
          <button class="btn-delete" data-id="${row.id}">✕</button>
        </td>
      </tr>`;
    });
    html += '</table>';
    container.innerHTML = html;

    container.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        await deleteScore(btn.dataset.id);
        loadRanking();
      });
    });

    container.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const newName = prompt('이름:', btn.dataset.name);
        if (newName === null) return;
        const newScore = prompt('점수:', btn.dataset.score);
        if (newScore === null) return;
        await updateScore(btn.dataset.id, newName, Number(newScore));
        loadRanking();
      });
    });
  } catch (e) {
    container.innerHTML = '<p class="empty-msg">Server offline</p>';
  }
}

loadRanking();
