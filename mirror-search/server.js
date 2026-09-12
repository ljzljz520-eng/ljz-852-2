const express = require('express');
const path = require('path');
require('./db'); // 初始化数据库

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', require('./routes/api'));
app.use('/api/admin', require('./routes/admin'));

app.get('/package/:id', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'package.html')));
app.get('/admin', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// 统一错误处理
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '服务器内部错误' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`镜像搜索站已启动: http://localhost:${PORT}`));
