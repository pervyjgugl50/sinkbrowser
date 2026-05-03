# SyncShare Browser - Альтернатива с UserScript

Если вы предпочитаете использовать расширение в виде UserScript вместо отдельного браузера, 
вы можете установить его в любой современный браузер.

## Установка UserScript версии

### Шаг 1: Установите менеджер UserScript

Для вашего браузера установите одно из расширений:

- **Tampermonkey** (рекомендуется)
  - [Chrome/Edge](https://chrome.google.com/webstore/detail/tampermonkey/)
  - [Firefox](https://addons.mozilla.org/firefox/addon/tampermonkey/)
  
- **Violentmonkey**
  - [Chrome/Edge](https://chrome.google.com/webstore/detail/violentmonkey/)
  - [Firefox](https://addons.mozilla.org/firefox/addon/violentmonkey/)

### Шаг 2: Создайте новый скрипт

1. Кликните на иконку Tampermonkey/Violentmonkey
2. Выберите "Создать новый скрипт"
3. Вставьте код скрипта (см. ниже)

### Шаг 3: Сохраните и активируйте

1. Нажмите Ctrl+S или File → Save
2. Убедитесь, что скрипт включен (переключатель в положение ON)

## Код UserScript

Создайте файл `syncshare-userscript.js` со следующим содержимым:

```javascript
// ==UserScript==
// @name         SyncShare for Modly
// @namespace    https://syncshare.ru/
// @version      2.11.0
// @description  Расширение SyncShare для работы с системой тестирования Modly
// @author       SyncShare
// @match        *://*/mod/quiz/attempt.php*
// @match        *://*/mod/quiz/review.php*
// @match        *://*/mod/quiz/summary.php*
// @match        *://*/mod/quiz/view.php*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @connect      syncshare.ru
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // Конфигурация
    const API_URL = 'https://syncshare.ru/api/';
    const DEBUG = false;

    function log(message, data = null) {
        if (DEBUG) {
            console.log('[SyncShare]', message, data || '');
        }
    }

    // Получение данных из страницы
    function getQuizData() {
        const url = new URL(window.location.href);
        const cmid = url.searchParams.get('cmid');
        const attempt = url.searchParams.get('attempt');

        return {
            host: window.location.host,
            quizId: cmid ? parseInt(cmid) : null,
            attemptId: attempt ? parseInt(attempt) : null,
            quizName: document.title
        };
    }

    // Отправка данных на сервер
    function sendData(endpoint, data) {
        log('Отправка данных:', { endpoint, data });

        GM_xmlhttpRequest({
            method: 'POST',
            url: API_URL + endpoint,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(data),
            onload: function(response) {
                log('Ответ сервера:', response);
            },
            onerror: function(error) {
                console.error('[SyncShare] Ошибка отправки:', error);
            }
        });
    }

    // Сбор данных о вопросах
    function collectQuestions() {
        const questions = [];
        const questionElements = document.querySelectorAll('.que');

        questionElements.forEach((el, index) => {
            const questionData = {
                id: el.id || index,
                type: el.dataset.questiontype || 'unknown',
                content: el.innerText.substring(0, 500)
            };
            questions.push(questionData);
        });

        return questions;
    }

    // Инициализация на странице прохождения теста
    function initAttemptPage() {
        log('Инициализация на странице попытки');

        const quizData = getQuizData();
        const questions = collectQuestions();

        // Отправляем данные о попытке
        sendData('v2/quiz/attempt', {
            quizMeta: quizData,
            questions: questions
        });

        // Добавляем кнопку для запроса подсказок
        addHintButton();
    }

    // Инициализация на странице просмотра результатов
    function initReviewPage() {
        log('Инициализация на странице просмотра');

        const quizData = getQuizData();
        const questions = collectQuestions();
        const reviewSummary = extractReviewSummary();

        sendData('v2/quiz/review', {
            quizMeta: quizData,
            questions: questions,
            reviewSummary: reviewSummary
        });
    }

    // Инициализация на странице сводки
    function initSummaryPage() {
        log('Инициализация на странице сводки');

        const quizData = getQuizData();
        const tableHtml = document.querySelector('.generaltable')?.outerHTML || null;

        sendData('v2/quiz/attempt/summary', {
            quizMeta: quizData,
            tableHtml: tableHtml
        });
    }

    // Извлечение сводки результатов
    function extractReviewSummary() {
        const summaryTable = document.querySelector('.quizreviewsummary');
        return summaryTable ? summaryTable.innerText : null;
    }

    // Добавление кнопки для запроса подсказок
    function addHintButton() {
        const button = document.createElement('button');
        button.textContent = '💡 Подсказка';
        button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            padding: 10px 20px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;

        button.addEventListener('click', () => {
            requestHint();
        });

        document.body.appendChild(button);
        log('Кнопка подсказки добавлена');
    }

    // Запрос подсказки
    function requestHint() {
        const quizData = getQuizData();
        const selectedQuestion = getSelectedQuestion();

        log('Запрос подсказки:', selectedQuestion);

        GM_xmlhttpRequest({
            method: 'GET',
            url: API_URL + 'v2/quiz/solution?' + new URLSearchParams({
                host: quizData.host,
                courseId: quizData.quizId?.toString() || '',
                quizId: quizData.quizId?.toString() || '',
                attemptId: quizData.attemptId?.toString() || '',
                questionIdentity: selectedQuestion?.id || '',
                questionType: selectedQuestion?.type || ''
            }),
            onload: function(response) {
                try {
                    const solution = JSON.parse(response.responseText);
                    showHint(solution);
                } catch (e) {
                    console.error('[SyncShare] Ошибка парсинга ответа:', e);
                }
            },
            onerror: function(error) {
                console.error('[SyncShare] Ошибка запроса подсказки:', error);
                alert('Не удалось получить подсказку. Проверьте соединение.');
            }
        });
    }

    // Получение выбранного вопроса
    function getSelectedQuestion() {
        const activeElement = document.activeElement;
        const questionEl = activeElement?.closest('.que');

        if (questionEl) {
            return {
                id: questionEl.id,
                type: questionEl.dataset.questiontype || 'unknown'
            };
        }

        // Если вопрос не выбран, берем первый
        const firstQuestion = document.querySelector('.que');
        if (firstQuestion) {
            return {
                id: firstQuestion.id,
                type: firstQuestion.dataset.questiontype || 'unknown'
            };
        }

        return null;
    }

    // Показ подсказки
    function showHint(solution) {
        if (!solution || solution.length === 0) {
            alert('Подсказка недоступна для этого вопроса');
            return;
        }

        const hintModal = document.createElement('div');
        hintModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
        `;

        content.innerHTML = `
            <h2 style="margin-top: 0;">💡 Подсказка</h2>
            <div>${solution.map(s => `<p>${s.anchor || s}</p>`).join('')}</div>
            <button onclick="this.closest('div[style*=fixed]').remove()" 
                    style="margin-top: 20px; padding: 10px 20px; background: #4CAF50; 
                           color: white; border: none; border-radius: 5px; cursor: pointer;">
                Закрыть
            </button>
        `;

        hintModal.appendChild(content);
        document.body.appendChild(hintModal);

        // Закрытие по клику вне окна
        hintModal.addEventListener('click', (e) => {
            if (e.target === hintModal) {
                hintModal.remove();
            }
        });
    }

    // Определение типа страницы и инициализация
    function init() {
        const url = window.location.href;

        if (url.includes('mod/quiz/attempt.php')) {
            initAttemptPage();
        } else if (url.includes('mod/quiz/review.php')) {
            initReviewPage();
        } else if (url.includes('mod/quiz/summary.php')) {
            initSummaryPage();
        } else if (url.includes('mod/quiz/view.php')) {
            log('Страница просмотра теста');
        }
    }

    // Регистрация команд меню
    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('🔧 Настройки SyncShare', () => {
            alert('Настройки SyncShare\n\nВерсия: 2.11.0\nAPI: ' + API_URL);
        });

        GM_registerMenuCommand('📊 Отладка', () => {
            const enabled = !DEBUG;
            alert('Режим отладки: ' + (enabled ? 'ВКЛ' : 'ВЫКЛ'));
        });
    }

    // Запуск после загрузки страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    log('SyncShare UserScript загружен');
})();
```

## Преимущества UserScript подхода

✅ **Работает в любом браузере**: Chrome, Firefox, Edge, Яндекс.Браузер
✅ **Не требует сборки**: Просто скопируйте и вставьте код
✅ **Легко обновлять**: Замените код скрипта на новую версию
✅ **Минимальные требования**: Только расширение для UserScript

## Недостатки

❌ **Требует установки расширения**: Tampermonkey или аналог
❌ **Ограниченный функционал**: Некоторые функции могут быть недоступны
❌ **Зависимость от браузера**: Настройки браузера могут влиять на работу

## Настройка для закрытой сети

### Изменение API URL

Если ваш сервер SyncShare находится в локальной сети, измените строку:

```javascript
const API_URL = 'https://syncshare.ru/api/';
```

На ваш локальный адрес:

```javascript
const API_URL = 'https://your-server.local/api/';
```

### Отключение внешних запросов

Убедитесь, что в `@connect` указан только ваш сервер:

```javascript
// @connect      your-server.local
```

## Обновление скрипта

1. Откройте панель управления Tampermonkey
2. Найдите скрипт "SyncShare for Modly"
3. Нажмите "Редактировать"
4. Замените код на новую версию
5. Сохраните (Ctrl+S)

## Решение проблем

### Скрипт не работает

1. Убедитесь, что скрипт включен (переключатель ON)
2. Проверьте соответствие URL (@match директивы)
3. Откройте консоль разработчика (F12) и проверьте ошибки

### Нет соединения с сервером

1. Проверьте доступность сервера API
2. Убедитесь, что CORS настроен правильно
3. Проверьте сетевые настройки и прокси

### Ошибки безопасности

В некоторых случаях браузер может блокировать скрипт. Решение:
- Добавьте сайт в исключения
- Разрешите выполнение скриптов на домене
- Используйте HTTPS для API

## Сравнение подходов

| Характеристика | Electron Browser | UserScript |
|---------------|------------------|------------|
| Изоляция | Полная | Зависит от браузера |
| Установка | Один EXE файл | Требует Tampermonkey |
| Обновления | Пересборка EXE | Замена кода скрипта |
| Работа offline | ✅ Да | ⚠️ Частично |
| Права админа | Не нужны | Не нужны |
| Размер | ~150 MB | ~10 KB |

Выбирайте подход в зависимости от ваших требований!
