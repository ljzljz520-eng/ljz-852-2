const express = require('express');
const db = require('../db');

const router = express.Router();

// 简单令牌鉴权:请求头 X-Admin-Token,默认 admin-token(可用环境变量覆盖)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-token';
router.use((req, res, next) => {
  if (req.get('X-Admin-Token') !== ADMIN_TOKEN) {
    return res.status(401).json({ error: '未授权,请提供有效的管理令牌' });
  }
  next();
});

// ---- 屏蔽词维护 ----
router.get('/blocked-words', (req, res) => {
  res.json(db.prepare('SELECT * FROM blocked_words ORDER BY id DESC').all());
});

router.post('/blocked-words', (req, res) => {
  const word = (req.body.word || '').trim();
  if (!word) return res.status(400).json({ error: '屏蔽词不能为空' });
  if (word.length > 64) return res.status(400).json({ error: '屏蔽词过长' });
  try {
    const info = db.prepare('INSERT INTO blocked_words (word) VALUES (?)').run(word);
    res.status(201).json({ id: info.lastInsertRowid, word });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: '该屏蔽词已存在' });
    }
    throw e;
  }
});

router.delete('/blocked-words/:id', (req, res) => {
  const info = db.prepare('DELETE FROM blocked_words WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: '记录不存在' });
  res.json({ ok: true });
});

// ---- 搜索日志查看 ----
router.get('/search-logs', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
  const keyword = (req.query.keyword || '').trim();

  const where = keyword ? 'WHERE keyword LIKE ?' : '';
  const args = keyword ? [`%${keyword}%`] : [];

  const total = db.prepare(`SELECT COUNT(*) AS c FROM search_logs ${where}`).get(...args).c;
  const rows = db.prepare(`
    SELECT * FROM search_logs ${where}
    ORDER BY id DESC LIMIT ? OFFSET ?
  `).all(...args, pageSize, (page - 1) * pageSize);

  res.json({ total, page, pageSize, logs: rows });
});

// 日志统计概览
router.get('/stats', (req, res) => {
  const packages = db.prepare('SELECT COUNT(*) AS c FROM packages').get().c;
  const tags = db.prepare('SELECT COUNT(*) AS c FROM tags').get().c;
  const searches = db.prepare('SELECT COUNT(*) AS c FROM search_logs').get().c;
  const blockedWords = db.prepare('SELECT COUNT(*) AS c FROM blocked_words').get().c;
  const blockedHits = db.prepare('SELECT COUNT(*) AS c FROM search_logs WHERE blocked = 1').get().c;
  const hotKeywords = db.prepare(`
    SELECT keyword, COUNT(*) AS count FROM search_logs
    WHERE keyword != '' AND blocked = 0
    GROUP BY keyword ORDER BY count DESC LIMIT 10
  `).all();
  res.json({ packages, tags, searches, blockedWords, blockedHits, hotKeywords });
});

module.exports = router;
