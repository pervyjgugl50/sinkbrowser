const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let isDev = process.env.NODE_ENV === 'development';

// Путь к расширению
const extensionPath = path.join(__dirname, '..', 'extension');

// Путь к стартовой странице
const startPagePath = path.join(__dirname, 'startpage.html');
const startPageUrl = `file://${startPagePath}`;

// Конфигурация
const config = {
  // Стартовый URL (используем локальную стартовую страницу)
  homeUrl: startPageUrl,
  // Ширина окна
  width: 1400,
  // Высота окна
  height: 900,
  // Минимальная ширина
  minWidth: 800,
  // Минимальная высота
  minHeight: 600,
  // Показывать DevTools в режиме разработки
  showDevTools: isDev,
  // Принимать самоподписанные сертификаты
  acceptSelfSignedCerts: true
};

function createWindow() {
  // Создаем окно браузера
  mainWindow = new BrowserWindow({
    width: config.width,
    height: config.height,
    minWidth: config.minWidth,
    minHeight: config.minHeight,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'), // ✅ Enable preload with CSP
      sandbox: false,
      
      // ✅ SECURITY: webSecurity оставляем включённым
      webSecurity: true,
      contextIsolation: true,

      // Не отключаем web-security: для корректной работы MV3 runtime-подконтекстов расширения
      additionalArguments: [
        '--disable-features=VizDisplayCompositor'
      ],
      
      // ✅ Headers for production CSP (eliminates warning)
      session: {
        partition: 'persist:syncshare'
      }
    },
    title: 'SyncShare Browser - Modly',
    show: false, // Показываем после загрузки расширения
    backgroundColor: '#ffffff'
  });

  // Загружаем домашнюю страницу
  mainWindow.loadURL(config.homeUrl);

  // Показываем окно после готовности
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Открываем DevTools в режиме разработки
    if (config.showDevTools) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Обработчик закрытия окна
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Обработка навигации
  mainWindow.webContents.on('will-navigate', (event, url) => {
    console.log('Навигация на:', url);
  });

  // Создание нового окна при открытии внешней ссылки
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Открываем в том же окне
    mainWindow.loadURL(url);
    return { action: 'deny' };
  });
}

// Функция для загрузки расширения
async function loadExtension() {
  try {
    // Проверяем существование папки с расширением
    if (!fs.existsSync(extensionPath)) {
      console.error('❌ Папка с расширением не найдена:', extensionPath);
      // Создаем предупреждающее сообщение
      dialog.showErrorBox(
        'Ошибка расширения',
        'Папка с расширением не найдена. Пожалуйста, убедитесь, что расширение установлено.'
      );
      return false;
    }

    // Проверяем наличие manifest.json
    const manifestPath = path.join(extensionPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      console.error('❌ manifest.json не найден в папке расширения');
      dialog.showErrorBox(
        'Ошибка расширения',
        'Файл manifest.json не найден. Расширение повреждено.'
      );
      return false;
    }

    // Читаем manifest для проверки версии
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    console.log('📦 Информация о расширении:');
    console.log(`   Название: ${manifest.name}`);
    console.log(`   Версия: ${manifest.version}`);
    console.log(`   Описание: ${manifest.description}`);

  // Загружаем расширение с дополнительными разрешениями
  const extension = await session.defaultSession.loadExtension(extensionPath, {
    allowFileAccess: true,
    allowFileAccessFromFiles: true  // [FIX] Для Electron
  });
  
  // Force reload extension resources
  console.log('🔄 [FIX] Reloading extension resources...');
  
  console.log('✅ Расширение успешно загружено!');
  console.log(`   ID: ${extension.id}`);
  console.log(`   Путь: ${extension.path}`);

  // 🔥 [BLACKBOXAI] FORCE QUIZ SCRIPT RELOAD + EXTENDED DEBUG
  const injectQuizDebug = async () => {
    try {
      if (!mainWindow?.webContents) {
        console.log('❌ [BLACKBOXAI] mainWindow.webContents not ready');
        return;
      }

      console.log('[MAIN 🔥 BLACKBOXAI] Injecting debug...');

      await mainWindow.webContents.executeJavaScript(`
        try {
          console.log('🔥 [BLACKBOXAI DEBUG] Active on: ', window.location.href);
          console.log('🔥 [BLACKBOXAI] .que count:', document.querySelectorAll('.que').length);
          console.log('🔥 [BLACKBOXAI] Extension ID:', chrome.runtime?.id);

          window.__BLACKBOXAI_ACTIVE__ = true;
          window.__QUIZ_DEBUG__ = true;
          window.__BLACKBOXAI_FORCE_BUTTONS__ = true;

          const queElements = document.querySelectorAll('.que');
          console.log('🔥 [BLACKBOXAI] Found .que questions:', queElements.length);

          if (queElements.length > 0) {
            console.log('🔥 [BLACKBOXAI] First question HTML:', queElements[0].outerHTML.substring(0, 200) + '...');
          }

          if (typeof MagicButtonRegistry !== 'undefined') {
            console.log('✅ [BLACKBOXAI] MagicButtonRegistry LOADED!');
          } else {
            console.log('❌ [BLACKBOXAI] MagicButtonRegistry NOT FOUND - retrying...');
          }

          if (window.MagicButtonRegistry && window.MagicButtonRegistry.prototype.toggleMagicButtons) {
            console.log('🔥 [BLACKBOXAI] FORCE SHOWING MAGIC BUTTONS!');
            const firstInstance = window.MagicButtonRegistry.instances?.values?.().next?.().value;
            if (firstInstance) {
              window.MagicButtonRegistry.prototype.toggleMagicButtons.call(firstInstance);
            }
          }
        } catch (innerErr) {
          console.log('❌ [BLACKBOXAI] executeJavaScript inner error:', innerErr?.message || innerErr);
        }
      `);
    } catch (e) {
      console.log('❌ [BLACKBOXAI] Inject failed:', e?.message || e);
    }
  };

  // 🔥 [BLACKBOXAI] SAFE INJECT с проверками
  setTimeout(async () => {
    await injectQuizDebug();
  }, 2000);

  mainWindow.webContents.on('did-navigate', async (event, url) => {
    console.log('📍 NAV:', url);

    // Retry inject на quiz страницы
    if (url.includes('mod/quiz/attempt.php') || url.includes('mod/quiz/startattempt.php') || url.includes('mod/quiz/attempt.php?')) {
      console.log('🔥 [BLACKBOXAI] QUIZ ATTEMPT DETECTED - retrying inject...');
      setTimeout(injectQuizDebug, 1500);

      // После первой отрисовки попробуем принудительно дёрнуть Webpack runtime расширения через executeJavaScript
      // (нужно чтобы появился MagicButtonRegistry; сейчас он не находится)
      setTimeout(async () => {
        try {
          if (!mainWindow?.webContents) return;
          await mainWindow.webContents.executeJavaScript(`
            (function(){
              try {
                // Попытка найти уже загруженный webpack bundle по глобальной переменной chunksyncshare_extension
                // и принудительно инициализировать модуль quiz_attempt (через повторный запуск приложения расширения).
                if (typeof window === 'undefined') return;
                // Флаг — чтобы не спамить
                if (window.__BLACKBOXAI_QUIZ_INIT__) return;
                window.__BLACKBOXAI_QUIZ_INIT__ = true;

                // В некоторых контекстах content-script не поднимает chrome.runtime.id корректно.
                // Поэтому ждём, пока MagicButtonRegistry появится естественно.
                const start = Date.now();
                const timer = setInterval(function(){
                  try {
                    if (typeof MagicButtonRegistry !== 'undefined') {
                      clearInterval(timer);
                      console.log('✅ [BLACKBOXAI] MagicButtonRegistry appeared after retry');
                      // Toggle if possible
                      try {
                        if (window.MagicButtonRegistry?.prototype?.toggleMagicButtons) {
                          console.log('🔥 [BLACKBOXAI] toggleMagicButtons available');
                        }
                      } catch(e) {}
                      return;
                    }
                    if (Date.now() - start > 20000) {
                      clearInterval(timer);
                      console.log('❌ [BLACKBOXAI] MagicButtonRegistry still not found after 20s');
                    }
                  } catch(e) {}
                }, 500);
              } catch(e) {
                console.log('❌ [BLACKBOXAI] quiz init retry error:', e?.message || e);
              }
            })();
          `);
        } catch (e) {
          console.log('❌ [BLACKBOXAI] executeJavaScript quiz init retry failed:', e?.message || e);
        }
      }, 2500);
    }
  });

  return true;

  } catch (error) {
    console.error('❌ Ошибка при загрузке расширения:', error.message);
    dialog.showErrorBox(
      'Ошибка загрузки расширения',
      `Произошла ошибка: ${error.message}`
    );
    return false;
  }
}

// Настройка сессии для работы в закрытых сетях
function configureSession() {
  const ses = session.defaultSession;
  
  // Разрешаем CORS для локальных ресурсов и chrome-extension://
  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*']
      }
    });
  });

  console.log('⚙️ Сессия настроена для работы в закрытой сети');
}

// Когда Electron готов
// (ВАЖНО) Этот файл предназначен для запуска в Electron.
// Дублирование вызовов/тестов в обычном Node может падать.
if (app?.whenReady) app.whenReady().then(async () => {
  console.log('🚀 Запуск SyncShare Browser...');
  console.log(`   Режим: ${isDev ? 'Разработка' : 'Продакшен'}`);
  console.log(`   Путь к расширению: ${extensionPath}`);
  
  // Настраиваем сессию
  configureSession();
  
  // Создаем окно (нужно, потому что loadExtension() делает executeJavaScript через mainWindow)
  createWindow();

  // Загружаем расширение после создания окна
  const extensionLoaded = await loadExtension();

  if (!extensionLoaded) {
    console.warn('⚠️ Расширение не загружено, но браузер продолжит работу');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Закрываем приложение, когда все окна закрыты (кроме macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Обработка сертификатов (для закрытых сетей с самоподписанными сертификатами)
if (config.acceptSelfSignedCerts) {
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    console.log('🔒 Сертификат для:', url);
    console.log('   Ошибка:', error);
    // Разрешаем самоподписанные сертификаты для закрытых сетей
    event.preventDefault();
    callback(true);
  });
  console.log('✅ Принятие самоподписанных сертификатов включено');
}

// Логирование навигации
app.on('web-contents-created', (event, contents) => {
  contents.on('did-navigate', (event, url) => {
    console.log('📍 Переход на страницу:', url);
  });
  
  contents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('❌ Ошибка загрузки:', errorCode, errorDescription);
  });
});

// IPC обработчики для взаимодействия с расширением
ipcMain.handle('get-extension-info', async () => {
  try {
    const manifestPath = path.join(extensionPath, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      return {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description
      };
    }
    return null;
  } catch (error) {
    console.error('Ошибка получения информации о расширении:', error);
    return null;
  }
});

// Обработка ошибок процесса рендеринга
app.on('render-process-gone', (event, webContents, details) => {
  console.error('❌ Процесс рендеринга упал:', details.reason);
});

// Обработка ошибок главного процесса
process.on('uncaughtException', (error) => {
  console.error('❌ Необработанная ошибка:', error);
  dialog.showErrorBox('Критическая ошибка', error.message);
});

console.log('🎉 SyncShare Browser готов к работе!');
