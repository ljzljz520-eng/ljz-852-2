const state = { q: '', tags: new Set(), page: 1, pageSize: 10 };

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtSize(bytes) {
  if (bytes >= 1 << 20) return (bytes / (1 << 20)).toFixed(1) + ' MB';
  if (bytes >= 1 << 10) return (bytes / (1 << 10)).toFixed(1) + ' KB';
  return bytes + ' B';
}

async function loadTags() {
  const tags = await (await fetch('/api/tags')).json();
  $('#tagCloud').innerHTML = tags.map(t =>
    `<span class="tag" data-tag="${esc(t.name)}">${esc(t.name)} (${t.count})</span>`).join('');
  document.querySelectorAll('.tag').forEach(el => el.addEventListener('click', () => {
    const name = el.dataset.tag;
    state.tags.has(name) ? state.tags.delete(name) : state.tags.add(name);
    el.classList.toggle('active');
    state.page = 1;
    search();
  }));
}

async function search() {
  const params = new URLSearchParams({
    q: state.q, tags: [...state.tags].join(','),
    page: state.page, pageSize: state.pageSize,
  });
  const res = await fetch('/api/search?' + params);
  const data = await res.json();

  if (res.status === 451) {
    $('#results').innerHTML = '';
    $('#pagination').innerHTML = '';
    $('#searchMeta').textContent = '⚠️ ' + data.error;
    return;
  }

  $('#searchMeta').textContent =
    `共 ${data.total} 条结果` +
    (state.q ? `,关键词:"${state.q}"` : '') +
    (state.tags.size ? `,标签:${[...state.tags].join('、')}` : '');

  $('#results').innerHTML = data.results.map(p => `
    <article class="result-card">
      <h3><a href="/package/${p.id}">${esc(p.name)}</a><span class="version">v${esc(p.version)}</span></h3>
      <p class="desc">${esc(p.description)}</p>
      <div class="info">
        <span class="badge">${esc(p.license)}</span>
        <span>体积 ${fmtSize(p.sizeBytes)}</span>
        <span>收录于 ${esc(p.indexedAt)}</span>
        <span>${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join(' ')}</span>
      </div>
    </article>`).join('') || '<p class="meta">未找到匹配的镜像包。</p>';

  const pages = Math.ceil(data.total / data.pageSize);
  let html = '';
  for (let i = 1; i <= pages && i <= 20; i++) {
    html += `<button class="${i === data.page ? 'current' : ''}" data-page="${i}">${i}</button>`;
  }
  $('#pagination').innerHTML = html;
  document.querySelectorAll('#pagination button').forEach(b =>
    b.addEventListener('click', () => { state.page = +b.dataset.page; search(); }));
}

$('#searchBtn').addEventListener('click', () => {
  state.q = $('#keyword').value.trim();
  state.page = 1;
  search();
});
$('#keyword').addEventListener('keydown', e => {
  if (e.key === 'Enter') { state.q = e.target.value.trim(); state.page = 1; search(); }
});

loadTags();
search();
