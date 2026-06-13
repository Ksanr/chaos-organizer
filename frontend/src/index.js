import './style.css';
import 'emoji-picker-element';

// Конфигурация API
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://chaos-organizer-backend.pxxl.click'
  : 'http://localhost:3000';

// DOM элементы
const messagesContainer = document.querySelector('.messages-list');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const fileInput = document.getElementById('file-input');
const geoBtn = document.getElementById('geo-btn');
const emojiBtn = document.getElementById('emoji-btn');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const pinnedContainer = document.querySelector('.pinned-message');

// Состояние
let currentPage = 1;
let hasMore = true;
let isLoading = false;
let allMessages = [];

// --- Вспомогательные функции ---
function createMessageElement(msg, isOwn = false) {
  const div = document.createElement('div');
  div.className = `message ${isOwn ? 'own' : ''}`;
  div.dataset.id = msg.id;

  // Содержимое в зависимости от типа
  let content = '';
  if (msg.type === 'text') {
    let text = escapeHtml(msg.text);
    // Преобразуем ссылки в кликабельные
    text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    content = `<div class="message-text">${text}</div>`;
  } else if (msg.type === 'image') {
    content = `<img src="${API_BASE}${msg.fileUrl}" alt="image" style="max-width: 200px; max-height: 200px; cursor: pointer;" onclick="window.open('${API_BASE}${msg.fileUrl}')">`;
  } else if (msg.type === 'video') {
    content = `<video controls src="${API_BASE}${msg.fileUrl}" style="max-width: 200px;"></video>`;
  } else if (msg.type === 'audio') {
    content = `<audio controls src="${API_BASE}${msg.fileUrl}"></audio>`;
  } else if (msg.type === 'file') {
    content = `<a href="${API_BASE}${msg.fileUrl}" download class="message-file">📄 ${msg.originalName}</a>`;
  }

  // Геолокация (если есть)
  if (msg.geo) {
    content += `<div class="message-geo">📍 ${msg.geo.lat}, ${msg.geo.lng}</div>`;
  }

  // Кнопка закрепления (pin)
  const pinBtn = document.createElement('span');
  pinBtn.textContent = msg.pinned ? '📌' : '📌';
  pinBtn.className = 'pin-indicator';
  pinBtn.style.opacity = msg.pinned ? '1' : '0.3';
  pinBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (msg.pinned) {
      await fetch(`${API_BASE}/api/messages/pin`, { method: 'DELETE' });
    } else {
      await fetch(`${API_BASE}/api/messages/pin/${msg.id}`, { method: 'POST' });
    }
    loadPinnedMessage();
    loadMessages(true); // перезагружаем список
  });

  div.innerHTML = content;
  div.append(pinBtn);
  return div;
}

// Экранирование HTML
function escapeHtml(str) {
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Загрузка сообщений с сервера (ленивая подгрузка)
async function loadMessages(reset = false) {
  if (isLoading) return;
  if (reset) {
    currentPage = 1;
    hasMore = true;
    allMessages = [];
    messagesContainer.innerHTML = '';
    messagesContainer.scrollTop = messagesContainer.scrollHeight; // 0;
  }
  if (!hasMore) return;

  // Запоминаем текущую высоту и прокрутку (если не сброс)
  let oldScrollHeight = 0;
  let oldScrollTop = 0;
  if (!reset && messagesContainer.children.length > 0) {
    oldScrollHeight = messagesContainer.scrollHeight;
    oldScrollTop = messagesContainer.scrollTop;
  }

  isLoading = true;
  try {
    const response = await fetch(`${API_BASE}/api/messages?page=${currentPage}`);
    const { data, hasMore: more } = await response.json();
    if (reset) {
      allMessages = data;
    } else {
      allMessages = [...data, ...allMessages];
    }
    // Отрисовка с сохранением порядка (новые снизу)
    hasMore = more;
    if (hasMore) currentPage++;
    renderMessages();

    // Восстанавливаем прокрутку, если добавляли сверху
    if (!reset && oldScrollHeight && messagesContainer.scrollHeight > oldScrollHeight) {
      const delta = messagesContainer.scrollHeight - oldScrollHeight;
      messagesContainer.scrollTop = oldScrollTop + delta;
    } else if (!reset) {
      messagesContainer.scrollTop = oldScrollTop;
    } else {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

  } catch (error) {
    console.error('Ошибка загрузки сообщений:', error);
  } finally {
    isLoading = false;
  }
}

// Рендер всех сообщений
function renderMessages() {
  const container = messagesContainer;
  // Очищаем
  while (container.firstChild) {
    container.firstChild.remove();
  }
  // Добавляем сообщения (самые старые сверху, новые снизу)
  allMessages.forEach(msg => {
    const el = createMessageElement(msg, false);
    container.append(el);
  });
  // Прокручиваем вниз
  //container.scrollTop = container.scrollHeight;
}

// Загрузка закреплённого сообщения
async function loadPinnedMessage() {
  try {
    const res = await fetch(`${API_BASE}/api/messages/pinned`);
    if (res.status === 204) {                 // нет закреплённого сообщения
      pinnedContainer.classList.remove('show');
      return;
    }
    const pinned = await res.json();
    if (pinned && pinned.id) {
      pinnedContainer.innerHTML = `<strong>📌 Закреплено:</strong> ${pinned.type === 'text' ? pinned.text : pinned.originalName || 'Сообщение'}
        <button id="unpin-btn" style="margin-left: 12px; background: none; border: none; cursor: pointer; font-size: 14px;">🗑 Открепить</button>`;
      pinnedContainer.classList.add('show');
      // обработчик для кнопки открепления
      const unpinBtn = document.getElementById('unpin-btn');
      if (unpinBtn) {
        unpinBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await fetch(`${API_BASE}/api/messages/pin`, { method: 'DELETE' });
          await loadPinnedMessage();     // обновляем виджет
          await loadMessages(true);      // перезагружаем список сообщений (чтобы убрать 📌 у сообщения)
        });
      }
    } else {
      pinnedContainer.classList.remove('show');
    }
  } catch (err) {
    console.error(err);
  }
}

// Отправка текстового сообщения
async function sendTextMessage(text) {
  if (!text.trim()) return;
  const response = await fetch(`${API_BASE}/api/messages/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const newMsg = await response.json();
  allMessages.push(newMsg);
  allMessages.sort((a, b) => a.timestamp - b.timestamp);
  renderMessages();
  messageInput.value = '';
  closeEmojiPicker();
  // Синхронизация с другими вкладками
  broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: newMsg });
}

// Отправка файла
async function sendFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/api/messages/file`, {
    method: 'POST',
    body: formData,
  });
  const newMsg = await response.json();
  allMessages.push(newMsg);
  closeEmojiPicker();
  renderMessages();
  broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: newMsg });
}

// Отправка геолокации
function sendGeo() {
  if (!navigator.geolocation) {
    alert('Геолокация не поддерживается');
    return;
  }
  navigator.geolocation.getCurrentPosition(async (position) => {
    const geo = { lat: position.coords.latitude, lng: position.coords.longitude };
    const response = await fetch(`${API_BASE}/api/messages/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '📍 Моя геопозиция', geo }),
    });
    const newMsg = await response.json();
    allMessages.push(newMsg);
    closeEmojiPicker();
    renderMessages();
    broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: newMsg });
  }, () => alert('Не удалось получить геолокацию'));
}

// Поиск сообщений (доп. функция)
async function searchMessages(query) {
  if (!query.trim()) {
    searchResults.classList.remove('show');
    return;
  }
  const res = await fetch(`${API_BASE}/api/messages/search?q=${encodeURIComponent(query)}`);
  const results = await res.json();
  console.log('Поиск:', query, results);   //отладочная строка
  searchResults.innerHTML = '';
  if (results.length === 0) {
    const div = document.createElement('div');
    div.textContent = 'Ничего не найдено';
    div.style.padding = '8px';
    searchResults.append(div);
  } else {
    results.forEach(msg => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      const preview = msg.type === 'text' ? msg.text.substring(0, 50) : (msg.originalName || 'Файл');
      item.textContent = preview;
      item.addEventListener('click', () => {
        // Ищем элемент сообщения в DOM
        const msgEl = document.querySelector(`.message[data-id="${msg.id}"]`);
        if (msgEl) {
          msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          searchResults.classList.remove('show');
        } else {
          // Сообщение не загружено – можно подгрузить все сообщения (упрощённо)
          alert(`Сообщение "${preview}" найдено, но ещё не загружено. Обновите список, чтобы увидеть его.`);
        }
      });
      searchResults.append(item);
    });
  }
  searchResults.classList.add('show');
  console.log('searchResults innerHTML:', searchResults.innerHTML);
  console.log('classList:', searchResults.classList);
}

// --- Синхронизация между вкладками (BroadcastChannel) ---
const broadcastChannel = new BroadcastChannel('chaos_sync');
broadcastChannel.onmessage = (event) => {
  const { type, message } = event.data;
  if (type === 'NEW_MESSAGE') {
    allMessages.push(message);
    renderMessages();
  } else if (type === 'PIN_UPDATED') {
    loadPinnedMessage();
    loadMessages(true);
  }
};

// --- Обработка ленивой подгрузки (при скролле вверх) ---
messagesContainer.addEventListener('scroll', () => {
  if (messagesContainer.scrollTop === 0 && !isLoading && hasMore) {
    loadMessages();
  }
});

// --- Drag & Drop для файлов ---
messagesContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
});
messagesContainer.addEventListener('drop', async (e) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files);
  for (const file of files) {
    await sendFile(file);
  }
});

// --- Инициализация emoji-picker ---
let picker = null;
emojiBtn.addEventListener('click', () => {
  if (!picker) {
    picker = document.createElement('emoji-picker');
    emojiBtn.after(picker);
    picker.addEventListener('emoji-click', (event) => {
      messageInput.value += event.detail.unicode;
      messageInput.focus();
    });
  } else {
    if (document.body.contains(picker)) {
      picker.remove();
    } else {
      emojiBtn.after(picker);
    }
  }
});

// Закрытие панели эмодзи
function closeEmojiPicker() {
  if (picker && document.body.contains(picker)) {
    picker.remove();
  }
}

// --- Обработчики UI ---
sendBtn.addEventListener('click', () => sendTextMessage(messageInput.value));
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendTextMessage(messageInput.value);
});
fileInput.addEventListener('change', (e) => {
  Array.from(e.target.files).forEach(file => sendFile(file));
  fileInput.value = '';
});
geoBtn.addEventListener('click', sendGeo);
searchInput.addEventListener('input', (e) => searchMessages(e.target.value));
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchMessages(searchInput.value);
  }
});
document.addEventListener('click', (e) => {
  if (!searchResults.contains(e.target) && e.target !== searchInput) {
    searchResults.classList.remove('show');
  }
});

// Загрузка начальных данных
loadMessages(true);
loadPinnedMessage();