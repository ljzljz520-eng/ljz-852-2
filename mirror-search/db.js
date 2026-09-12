const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'data', 'mirror.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS packages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,                -- 项目名
  version       TEXT NOT NULL,                -- 版本
  description   TEXT DEFAULT '',              -- 简介
  license       TEXT DEFAULT '',              -- 许可证
  size_bytes    INTEGER DEFAULT 0,            -- 体积(字节)
  files         TEXT DEFAULT '[]',            -- 文件列表(JSON 数组)
  release_notes TEXT DEFAULT '',              -- 版本说明
  indexed_at    TEXT NOT NULL DEFAULT (datetime('now')),  -- 收录时间
  UNIQUE(name, version)
);

CREATE TABLE IF NOT EXISTS tags (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS package_tags (
  package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (package_id, tag_id)
);

CREATE TABLE IF NOT EXISTS blocked_words (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  word       TEXT NOT NULL UNIQUE,            -- 屏蔽词
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS search_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword       TEXT DEFAULT '',              -- 搜索关键词
  tags          TEXT DEFAULT '',              -- 搜索标签(逗号分隔)
  results_count INTEGER DEFAULT 0,            -- 命中数量
  blocked       INTEGER DEFAULT 0,            -- 是否命中屏蔽词
  ip            TEXT DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_packages_name ON packages(name);
CREATE INDEX IF NOT EXISTS idx_packages_indexed_at ON packages(indexed_at);
CREATE INDEX IF NOT EXISTS idx_search_logs_created_at ON search_logs(created_at);
`);

module.exports = db;
