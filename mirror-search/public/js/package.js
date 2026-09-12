const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function fmtSize(bytes) {
  if (bytes >= 1 << 20) return (bytes / (1 << 20)).toFixed(1) + ' MB';
  if (bytes >= 1 << 10) return (bytes / (1 << 10)).toFixed(1) + ' KB';
  return bytes + ' B';
}

async function load() {
  const id = location.pathname.split('/').pop();
  const res = await fetch('/api/packages/' + id);
  if (!res.ok) {
    $('#detail').innerHTML = '<p class="error">记录不存在或已删除。</p>';
    return;
  }
  const p = await res.json();
  document.title = `${p.name} ${p.version} - 开源镜像包搜索站`;

  $('#detail').innerHTML = `
    <h2>${esc(p.name)} <span class="version">v${esc(p.version)}</span></h2>
    <p class="desc">${esc(p.description)}</p>
    <dl>
      <dt>许可证</dt><dd><span class="badge">${esc(p.license)}</span></dd>
      <dt>体积</dt><dd>${fmtSize(p.sizeBytes)}(${p.sizeBytes.toLocaleString()} 字节)</dd>
      <dt>收录时间</dt><dd>${esc(p.indexedAt)}</dd>
      <dt>标签</dt><dd>${p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join(' ') || '无'}</dd>
    </dl>
    <h3>版本说明</h3>
    <pre>${esc(p.releaseNotes || '暂无版本说明。')}</pre>
    <h3>文件列表(${(p.files || []).length})</h3>
    <ul class="file-list">
      ${(p.files || []).map(f => `<li>📄 ${esc(f)}</li>`).join('') || '<li>无文件记录</li>'}
    </ul>`;

  $('#related').innerHTML = p.related.length ? p.related.map(r => `
    <div class="related-card">
      <a href="/package/${r.id}">${esc(r.name)} v${esc(r.version)}</a>
      <p>${esc(r.description)}</p>
      <p><span class="badge">${esc(r.license)}</span> · ${fmtSize(r.sizeBytes)}</p>
    </div>`).join('') : '<p class="meta">暂无相关项目。</p>';
}
load();
