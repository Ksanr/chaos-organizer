const Koa = require('koa');
const Router = require('@koa/router');
const cors = require('@koa/cors');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');
const logger = require('koa-logger');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const multer = require('@koa/multer');

const app = new Koa();
const router = new Router();

const serverless = require('serverless-http');


// Настройка хранилища для файлов
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    const unique = uuidv4() + path.extname(file.originalname);
    cb(null, unique);
  },
});
const upload = multer({ storage });

// Хранилище сообщений в памяти
const messages = [];
const demoMessages = [
  {
    id: uuidv4(),
    type: 'text',
    text: '🎉 Добро пожаловать в Chaos Organizer! Это демо-сообщение.',
    timestamp: Date.now() - 86400000,
    pinned: false,
  },
  {
    id: uuidv4(),
    type: 'text',
    text: 'Вы можете отправлять ссылки: https://github.com/Ksanr/chaos-organizer',
    timestamp: Date.now() - 7200000,
    pinned: false,
  },
  {
    id: uuidv4(),
    type: 'text',
    text: 'Попробуйте прикрепить изображение, видео или аудио через кнопку 📎 или перетаскиванием в чат.',
    timestamp: Date.now() - 3600000,
    pinned: false,
  },
];
messages.push(...demoMessages);
const PAGE_SIZE = 10;

// Middleware
app.use(logger());
app.use(cors({ origin: '*' }));
app.use(bodyParser());
app.use(serve('./uploads'));

// Префикс для всех API-роутов
router.prefix('/api');

// Роут для получения сообщений с пагинацией
router.get('/messages', (ctx) => {
  const { page = 1 } = ctx.query;
  const pageNum = parseInt(page, 10);
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
  const total = sorted.length;
  const start = Math.max(0, total - pageNum * PAGE_SIZE);
  const end = total - (pageNum - 1) * PAGE_SIZE;
  const result = sorted.slice(start, end);
  ctx.body = {
    data: result,
    total: total,
    hasMore: start > 0,
  };
});

router.post('/messages/text', (ctx) => {
  const { text, pinned = false, geo = null, isCommand = false, commandAnswer = null } = ctx.request.body;
  const message = {
    id: uuidv4(),
    type: 'text',
    text,
    timestamp: Date.now(),
    pinned,
    geo,
    isCommand,
    commandAnswer,
  };
  messages.push(message);
  ctx.body = message;
});

// Роут для загрузки файла — закомментирован, так как Vercel не хранит файлы постоянно
// router.post('/messages/file', upload.single('file'), (ctx) => { ... });

router.get('/messages/search', (ctx) => {
  const { q } = ctx.query;
  if (!q) {
    ctx.body = [];
    return;
  }
  const lowerQ = q.toLowerCase();
  const results = messages.filter(msg => {
    if (msg.type === 'text') return msg.text.toLowerCase().includes(lowerQ);
    if (msg.type !== 'text' && msg.originalName) return msg.originalName.toLowerCase().includes(lowerQ);
    return false;
  });
  results.sort((a, b) => a.timestamp - b.timestamp);
  ctx.body = results.slice(-50);
});

router.post('/messages/pin/:id', (ctx) => {
  const { id } = ctx.params;
  messages.forEach(msg => { msg.pinned = false; });
  const msg = messages.find(m => m.id === id);
  if (msg) {
    msg.pinned = true;
    ctx.body = msg;
  } else {
    ctx.status = 404;
    ctx.body = { error: 'Message not found' };
  }
});

router.delete('/messages/pin', (ctx) => {
  messages.forEach(msg => { msg.pinned = false; });
  ctx.body = { success: true };
});

router.get('/messages/pinned', (ctx) => {
  const pinned = messages.find(m => m.pinned === true);
  ctx.body = pinned || null;
});

app.use(router.routes()).use(router.allowedMethods());

// ⚠️ ВАЖНО: для Vercel не используем app.listen()
// Экспортируем приложение как серверную функцию
// module.exports = app;
const handler = serverless(app);
module.exports = handler;