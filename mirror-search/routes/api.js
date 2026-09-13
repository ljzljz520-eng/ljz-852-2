const express = require('express');
const db = require('../db');

const router = express.Router();

const rowToPackage = (row, withFiles = false) => {
  const pkg = {
    id: row.id,
    name: row.name,
    version: row.version,
    description: row.description,
    license: row.license,
    sizeBytes: row.size_bytes,
    releaseNotes: row.release_notes,
    indexedAt: row.indexed_at,
    tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
  };
  if (withFiles) {
    try { pkg.files = JSON.parse(row.files || '[]'); } catch { pkg.files = []; }
  }
  return pkg;
};

const PACKAGE_SELECT = `
  SELECT p.*, GROUP_CONCAT(t.name) AS tags
  FROM packages p
  LEFT JOIN package_tags pt ON pt.package_id = p.id
  LEFT JOIN tags t ON t.id = pt.tag_id
`;

// 检查关键词是否命中屏蔽词
function findBlockedWord(keyword) {
  const words = db.prepare('SELECT word FROM blocked_words').all();
  const lower = keyword.toLowerCase();
  return words.find(w => w.word && lower.includes(w.word.toLowerCase()));
}

// 记录搜索日志
function logSearch(req, keyword, tags, count, blocked) {
  db.prepare(
    'INSERT INTO search_logs (keyword, tags, results_count, blocked, ip) VALUES (?, ?, ?, ?, ?)'
  ).run(keyword, tags, count, blocked ? 1 : 0, req.ip || '');
}

// GET /api/search?q=关键词&tags=a,b&page=1&pageSize=10
router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  const tags = (req.query.tags || '').split(',').map(s => s.trim()).filter(Boolean);
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10));

  // 屏蔽词检查
  const hit = q && findBlockedWord(q);
  if (hit) {
    logSearch(req, q, tags.join(','), 0, true);
    return res.status(451).json({ error: `搜索词包含被屏蔽的内容`, blocked: true });
  }

  const where = [];
  const params = {};
  if (q) {
    where.push('(p.name LIKE @q OR p.description LIKE @q OR p.license LIKE @q)');
    params.q = `%${q}%`;
  }
  tags.forEach((t, i) => {
    where.push(`EXISTS (
      SELECT 1 FROM package_tags pt${i}
      JOIN tags tg${i} ON tg${i}.id = pt${i}.tag_id
      WHERE pt${i}.package_id = p.id AND tg${i}.name = @tag${i}
    )`);
    params[`tag${i}`] = t;
  });
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(
    `SELECT COUNT(*) AS c FROM packages p ${whereSql}`
  ).get(params).c;

  const rows = db.prepare(`
    ${PACKAGE_SELECT}
    ${whereSql}
    GROUP BY p.id
    ORDER BY p.indexed_at DESC, p.id DESC
    LIMIT @limit OFFSET @offset
  `).all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });

  logSearch(req, q, tags.join(','), total, false);

  res.json({
    total,
    page,
    pageSize,
    results: rows.map(r => rowToPackage(r)),
  });
});

// GET /api/tags — 全部标签及包数量
router.get('/tags', (req, res) => {
  const rows = db.prepare(`
    SELECT t.name, COUNT(pt.package_id) AS count
    FROM tags t
    LEFT JOIN package_tags pt ON pt.tag_id = t.id
    GROUP BY t.id
    ORDER BY count DESC, t.name
  `).all();
  res.json(rows);
});

// GET /api/packages/:id — 单条记录详情 + 相关项目
router.get('/packages/:id', (req, res) => {
  // ID 必须是纯数字,避免 parseInt('1abc') 之类被静默截断而命中错误记录
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ error: '无效的 ID' });
  }
  const id = parseInt(req.params.id, 10);
  const row = db.prepare(`${PACKAGE_SELECT} WHERE p.id = ? GROUP BY p.id`).get(id);
  if (!row) return res.status(404).json({ error: '记录不存在' });

  // 相关项目:共享标签优先,其次同许可证,按收录时间倒序
  const related = db.prepare(`
    ${PACKAGE_SELECT}
    WHERE p.id != @id AND (
      EXISTS (
        SELECT 1 FROM package_tags pt1
        JOIN package_tags pt2 ON pt2.tag_id = pt1.tag_id AND pt2.package_id = @id
        WHERE pt1.package_id = p.id
      )
      OR (p.license != '' AND p.license = (SELECT license FROM packages WHERE id = @id))
    )
    GROUP BY p.id
    ORDER BY (
      SELECT COUNT(*) FROM package_tags pt1
      JOIN package_tags pt2 ON pt2.tag_id = pt1.tag_id AND pt2.package_id = @id
      WHERE pt1.package_id = p.id
    ) DESC, p.indexed_at DESC
    LIMIT 6
  `).all({ id });

  res.json({
    ...rowToPackage(row, true),
    related: related.map(r => rowToPackage(r)),
  });
});

module.exports = router;
