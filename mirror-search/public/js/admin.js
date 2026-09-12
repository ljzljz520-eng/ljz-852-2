const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let token = sessionStorage.getItem('adminToken') || '';
let logState = { page: 1, keyword: '' };

async function api(path, opts = {}) {
  const res = await fetch('/api/admin' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
  });
  if (res.status === 401) { showLogin(); throw new Error('unauthorized'); }
  return res.json();
}

function showLogin() {
  $('#loginBox').hidden = false;
  $('#adminPanel').hidden = true;
}

async function boot() {
  try {
    await loadStats(); await loadWords(); await loadLogs();
    $('#loginBox').hidden = true;
    $('#adminPanel').hidden = false;
  } catch { /* 未授权 */ }
}

async function loadStats() {
  const s = await api('/stats');
  $('#stats').innerHTML = [
    ['收录包数', s.packages], ['标签数', s.tags], ['搜索次数', s.searches],
    ['屏蔽词数', s.blockedWords], ['拦截次数', s.blockedHits],
  ].map(([label, num]) =>
    `<div class="stat-card"><div class="num">${num}</div><div class="label">${label}</div></div>`
  ).join('');
  $('#hotKeywords').innerHTML = s.hotKeywords.length
    ? s.hotKeywords.map(k => `<li>${esc(k.keyword)} — ${k.count} 次</li>`).join('')
    : '<li class="meta">暂无数据</li>';
}

async function loadWords() {
  const words = await api('/blocked-words');
  $('#wordList').innerHTML = words.map(w => `
    <tr>
      <td>${w.id}</td><td>${esc(w.word)}</td><td>${esc(w.created_at)}</td>
      <td><button class="danger" data-id="${w.id}">删除</button></td>
    </tr>`).join('');
  document.querySelectorAll('#wordList .danger').forEach(b =>
    b.addEventListener('click', async () => {
      if (!confirm('确定删除该屏蔽词?')) return;
      await api('/blocked-words/' + b.dataset.id, { method: 'DELETE' });
      loadWords(); loadStats();
    }));
}

async function loadLogs() {
  const params = new URLSearchParams({
    page: logState.page, pageSize: 20, keyword: logState.keyword,
  });
  const data = await api('/search-logs?' + params);
  $('#logList').innerHTML = data.logs.map(l => `
    <tr>
      <td>${l.id}</td><td>${esc(l.keyword) || '<em>空</em>'}</td>
      <td>${esc(l.tags)}</td><td>${l.results_count}</td>
      <td>${l.blocked ? '<span class="blocked-yes">是</span>' : '否'}</td>
      <td>${esc(l.ip)}</td><td>${esc(l.created_at)}</td>
    </tr>`).join('') || '<tr><td colspan="7" class="meta">暂无日志</td></tr>';

  const pages = Math.ceil(data.total / data.pageSize);
  let html = '';
  for (let i = 1; i <= pages && i <= 20; i++) {
    html += `<button class="${i === data.page ? 'current' : ''}" data-page="${i}">${i}</button>`;
  }
  $('#logPagination').innerHTML = html;
  document.querySelectorAll('#logPagination button').forEach(b =>
    b.addEventListener('click', () => { logState.page = +b.dataset.page; loadLogs(); }));
}

$('#loginBtn').addEventListener('click', () => {
  token = $('#tokenInput').value.trim();
  sessionStorage.setItem('adminToken', token);
  $('#loginMsg').textContent = '';
  boot().catch(() => { $('#loginMsg').textContent = '令牌无效,请重试。'; });
});

$('#addWordBtn').addEventListener('click', async () => {
  const word = $('#newWord').value.trim();
  const res = await fetch('/api/admin/blocked-words', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
    body: JSON.stringify({ word }),
  });
  const data = await res.json();
  if (!res.ok) { $('#wordMsg').textContent = data.error; return; }
  $('#wordMsg').textContent = '';
  $('#newWord').value = '';
  loadWords(); loadStats();
});

$('#logSearchBtn').addEventListener('click', () => {
  logState.keyword = $('#logKeyword').value.trim();
  logState.page = 1;
  loadLogs();
});

if (token) boot(); else showLogin();
