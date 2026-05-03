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
      // Разрешаем загрузку расширений
      allowRunningInsecureContent: false,
      webSecurity: true,
      // Отключаем preload для безопасности
      preload: null,
      sandbox: false
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

    // Загружаем расширение
    const extension = await session.defaultSession.loadExtension(extensionPath, {
      allowFileAccess: true
    });
    
    console.log('✅ Расширение успешно загружено!');
    console.log(`   ID: ${extension.id}`);
    console.log(`   Путь: ${extension.path}`);
    
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
  
  // Разрешаем CORS для локальных ресурсов
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
app.whenReady().then(async () => {
  console.log('🚀 Запуск SyncShare Browser...');
  console.log(`   Режим: ${isDev ? 'Разработка' : 'Продакшен'}`);
  console.log(`   Путь к расширению: ${extensionPath}`);
  
  // Настраиваем сессию
  configureSession();
  
  // Загружаем расширение перед созданием окна
  const extensionLoaded = await loadExtension();
  
  if (!extensionLoaded) {
    console.warn('⚠️ Расширение не загружено, но браузер продолжит работу');
  }
  
  // Создаем окно
  createWindow();

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
