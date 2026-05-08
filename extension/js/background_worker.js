// === SyncShare Background Worker (Clean Version) ===
// Версия: 2.0 (Исправленная для Manifest V3)

console.log('[SyncShare] Background worker started successfully.');

// Обработка установки расширения (вместо onStartup, который вызывал ошибку)
chrome.runtime.onInstalled.addListener((details) => {
    console.log('[SyncShare] Extension installed/updated:', details.reason);
});

// Обработка сообщений от контент-скриптов
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
        sendResponse({ status: 'ok', message: 'Background worker is alive' });
    }
    return true; // Для асинхронного ответа
});

// Логирование активности (для отладки)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
        // Можно добавить логику здесь при необходимости
    }
});

console.log('[SyncShare] All listeners registered.');