// 生成示例数据: node seed.js
const db = require('./db');

const insertPkg = db.prepare(`
  INSERT OR IGNORE INTO packages (name, version, description, license, size_bytes, files, release_notes, indexed_at)
  VALUES (@name, @version, @description, @license, @size_bytes, @files, @release_notes, @indexed_at)
`);
const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
const linkTag = db.prepare(`
  INSERT OR IGNORE INTO package_tags (package_id, tag_id)
  VALUES (?, (SELECT id FROM tags WHERE name = ?))
`);
const getPkgId = db.prepare('SELECT id FROM packages WHERE name = ? AND version = ?');

const samples = [
  {
    name: 'nginx', version: '1.27.1', license: 'BSD-2-Clause',
    description: '高性能 HTTP 与反向代理服务器',
    size: 1835008, tags: ['web', 'proxy', 'server'],
    files: ['nginx-1.27.1.tar.gz', 'nginx-1.27.1.tar.gz.asc', 'CHANGES'],
    notes: '修复 HTTP/3 若干稳定性问题;新增 proxy_pass_trailers 指令。',
  },
  {
    name: 'nginx', version: '1.26.2', license: 'BSD-2-Clause',
    description: '高性能 HTTP 与反向代理服务器(稳定分支)',
    size: 1794048, tags: ['web', 'proxy', 'server'],
    files: ['nginx-1.26.2.tar.gz', 'nginx-1.26.2.tar.gz.asc'],
    notes: '稳定分支安全更新,修复 CVE-2024-7347。',
  },
  {
    name: 'redis', version: '7.4.0', license: 'RSALv2/SSPLv1',
    description: '内存键值数据库,支持多种数据结构',
    size: 3518464, tags: ['database', 'cache', 'nosql'],
    files: ['redis-7.4.0.tar.gz', 'redis-7.4.0.tar.gz.sha256'],
    notes: '新增 hash 字段过期时间;性能优化;修复若干复制问题。',
  },
  {
    name: 'redis', version: '7.2.5', license: 'BSD-3-Clause',
    description: '内存键值数据库(旧许可分支)',
    size: 3387392, tags: ['database', 'cache', 'nosql'],
    files: ['redis-7.2.5.tar.gz'],
    notes: '修复安全漏洞 CVE-2024-31449。',
  },
  {
    name: 'postgresql', version: '16.4', license: 'PostgreSQL',
    description: '功能强大的开源关系型数据库',
    size: 29360128, tags: ['database', 'sql', 'server'],
    files: ['postgresql-16.4.tar.gz', 'postgresql-16.4.tar.gz.sha256', 'RELEASE_NOTES'],
    notes: '季度累积更新,修复 pg_dump 与逻辑复制相关问题。',
  },
  {
    name: 'mysql', version: '8.4.2', license: 'GPL-2.0',
    description: '流行的开源关系型数据库 LTS 版',
    size: 52428800, tags: ['database', 'sql', 'server'],
    files: ['mysql-8.4.2.tar.gz', 'mysql-8.4.2.tar.gz.asc'],
    notes: 'LTS 维护版本,修复 InnoDB 崩溃恢复缺陷。',
  },
  {
    name: 'python', version: '3.12.5', license: 'PSF-2.0',
    description: 'Python 语言解释器 CPython 实现',
    size: 26738688, tags: ['language', 'runtime'],
    files: ['Python-3.12.5.tgz', 'Python-3.12.5.tgz.asc', 'python-3.12.5-amd64.exe'],
    notes: '安全与错误修复版本,修复 ssl 模块 CVE-2024-6923。',
  },
  {
    name: 'node', version: '20.17.0', license: 'MIT',
    description: '基于 V8 的 JavaScript 运行时',
    size: 26214400, tags: ['language', 'runtime', 'javascript'],
    files: ['node-v20.17.0.tar.gz', 'node-v20.17.0-linux-x64.tar.xz', 'SHASUMS256.txt'],
    notes: '修复路径遍历漏洞 CVE-2024-36138;升级 npm 至 10.8.2。',
  },
  {
    name: 'vim', version: '9.1.0700', license: 'Vim',
    description: '高度可配置的文本编辑器',
    size: 17563648, tags: ['editor', 'tool'],
    files: ['vim-9.1.0700.tar.gz'],
    notes: '包含 9.1 系列累积补丁至 0700。',
  },
  {
    name: 'curl', version: '8.10.0', license: 'curl',
    description: '命令行网络传输工具与库',
    size: 4325376, tags: ['network', 'tool', 'http'],
    files: ['curl-8.10.0.tar.gz', 'curl-8.10.0.tar.gz.asc'],
    notes: '新增 --keepalive-cnt;修复 WebSocket 若干问题。',
  },
  {
    name: 'openssl', version: '3.3.2', license: 'Apache-2.0',
    description: 'TLS/SSL 与加密算法工具库',
    size: 17825792, tags: ['security', 'crypto', 'network'],
    files: ['openssl-3.3.2.tar.gz', 'openssl-3.3.2.tar.gz.sha256'],
    notes: '修复 CVE-2024-6119(X.509 名称检查缓冲区问题)。',
  },
  {
    name: 'git', version: '2.46.0', license: 'GPL-2.0',
    description: '分布式版本控制系统',
    size: 11534336, tags: ['vcs', 'tool'],
    files: ['git-2.46.0.tar.gz', 'git-2.46.0.tar.gz.sign'],
    notes: '新增 git config get 子命令;改进 rebase --update-refs。',
  },
  {
    name: 'ffmpeg', version: '7.0.2', license: 'LGPL-2.1/GPL-2.0',
    description: '音视频录制、转换与流媒体处理框架',
    size: 16777216, tags: ['media', 'video', 'audio', 'tool'],
    files: ['ffmpeg-7.0.2.tar.xz', 'ffmpeg-7.0.2.tar.xz.sha256'],
    notes: '修复解码器多个崩溃问题。',
  },
  {
    name: 'sqlite', version: '3.46.1', license: 'Public-Domain',
    description: '嵌入式关系型数据库引擎',
    size: 3145728, tags: ['database', 'sql', 'embedded'],
    files: ['sqlite-autoconf-3460100.tar.gz', 'sqlite-amalgamation-3460100.zip'],
    notes: '修复查询规划器边界情况;改进 JSON 函数性能。',
  },
  {
    name: 'httpd', version: '2.4.62', license: 'Apache-2.0',
    description: 'Apache HTTP 服务器',
    size: 7340032, tags: ['web', 'server'],
    files: ['httpd-2.4.62.tar.gz', 'httpd-2.4.62.tar.gz.asc'],
    notes: '修复 CVE-2024-40898 与 CVE-2024-40725。',
  },
];

const insertBlocked = db.prepare('INSERT OR IGNORE INTO blocked_words (word) VALUES (?)');
['盗版', '破解版', 'warez'].forEach(w => insertBlocked.run(w));

const tx = db.transaction(() => {
  let day = 0;
  for (const s of samples) {
    const indexedAt = `2026-0${(day % 8) + 1}-${String(10 + (day % 15)).padStart(2, '0')} 10:00:00`;
    insertPkg.run({
      name: s.name, version: s.version, description: s.description,
      license: s.license, size_bytes: s.size,
      files: JSON.stringify(s.files), release_notes: s.notes,
      indexed_at: indexedAt,
    });
    const { id } = getPkgId.get(s.name, s.version);
    s.tags.forEach(t => { insertTag.run(t); linkTag.run(id, t); });
    day++;
  }
});
tx();

console.log(`已写入 ${samples.length} 条示例数据`);
