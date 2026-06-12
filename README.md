# Chaos Organizer

[![Build status](https://ci.appveyor.com/api/projects/status/github/ksanr/chaos-organizer?svg=true)](https://ci.appveyor.com/project/ksanr/chaos-organizer)

**Демо:** [GitHub Pages](https://ksanr.github.io/chaos-organizer)  
**Бэкенд API:** [Render](https://chaos-organizer-backend.onrender.com)

## Реализованные функции

### Обязательные
- Текстовые сообщения и ссылки (кликабельны)
- Загрузка изображений, видео, аудио (Drag&Drop и кнопка)
- Скачивание файлов
- Ленивая подгрузка (по 10 сообщений)

### Дополнительные (5 шт.)
1. Синхронизация между вкладками (BroadcastChannel)
2. Поиск по сообщениям
3. Отправка геолокации
4. Закрепление сообщений (pin)
5. Поддержка emoji (выбор из панели)

## Запуск локально

npm install     # в папках backend и frontend
npm run dev     # в папке backend - запустить сервер на порту 3000
npm start       # в папке frontend - в другом терминале запустить клиент на порту 8080