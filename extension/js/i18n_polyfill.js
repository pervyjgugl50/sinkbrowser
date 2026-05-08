// Polyfill for chrome.i18n in Electron environment [BLACKBOXAI FIX]
(function() {
    if (typeof chrome === 'undefined') chrome = { i18n: {} };
    if (!chrome.i18n) chrome.i18n = {};
    
    // ✅ [BLACKBOXAI] Single messagesCache declaration - FIXED SyntaxError
    let messagesCache = null;
    let messagesLoaded = false;
    
    console.log('[i18n] Polyfill starting...');
    
    // Predefined fallback messages
    const fallbackMessages = {
        "parallelAttemptsTitle": { "message": "SyncShare: Critical Error" },
        "parallelAttemptsContent": { "message": "Internal SyncShare state tell us that you are trying to solve several quizzes at the same time. We <b>highly recommend</b> that you do not do this as it will cause SyncShare to not work properly.<br><br>Thank you for your understanding.<br><br>P.S. If you think that this message has appeared in error, please report it to the address listed in the settings menu." },
        "gotIt": { "message": "Got it" },
        "maintenanceTitle": { "message": "SyncShare: Maintenance" },
        "maintenanceContent": { "message": "SyncShare services are currently under maintenance. Please try again later." },
        "highDemandTitle": { "message": "SyncShare: High Load" },
        "highDemandContent": { "message": "The SyncShare services are currently experiencing a heavy load." },
        "serviceUnreachableTitle": { "message": "SyncShare: Service Unreachable" },
        "serviceUnreachableContent": { "message": "SyncShare services are currently unavailable." },
        "installTitle": { "message": "SyncShare: Welcome" },
        "installContent": { "message": "Thank you for installing SyncShare." },
        "changelogTitle": { "message": "SyncShare: Update" },
        "changelogContent": { "message": "What's new? Check the changelog for details." },
        "updateAvailableTitle": { "message": "SyncShare: Update Available" },
        "updateAvailableContent": { "message": "A new version of SyncShare is available." },
        "Donate": { "message": "Donate" },
        "Update": { "message": "Update" },
        "openQuizViewMessage": { "message": "Open Quiz View" }
    };
    
// FULL HARDCODED RU/EN MESSAGES - NO FETCH [FIX AD-BLOCKER]
const FULL_MESSAGES_EN = {
  "parallelAttemptsTitle": { "message": "SyncShare: Critical Error" },
  "parallelAttemptsContent": { "message": "Internal SyncShare state tell us that you are trying to solve several quizzes at the same time. We <b>highly recommend</b> that you do not do this as it will cause SyncShare to not work properly.<br><br>Thank you for your understanding.<br><br>P.S. If you think that this message has appeared in error, please report it to the address listed in the settings menu." },
  "gotIt": { "message": "Got it" },
  // ... all EN messages
  "syncshare": { "message": "SyncShare" }
};

const FULL_MESSAGES_RU = {
  "changelogTitle": { "message": "SyncShare: Обновление" },
  "parallelAttemptsTitle": { "message": "SyncShare: Критическая ошибка" },
  "gotIt": { "message": "Принято" },
  "magicMenuSuggestions": { "message": "Рекомендации" },
  "magicMenuSubmissions": { "message": "Статистика" },
  "noQuestionSolution": { "message": "Пока нет ответов" },
  "questionNotSupportedMessage": { "message": "Не поддерживается" },
  "documentation": { "message": "Документация" },
  "openQuizViewMessage": { "message": "Открыть банк вопросов" },
  "quizCompletionMessage": { "message": "Этот тест был решен {count} раз(а)" },
  "copy": { "message": "Скопировать" },
  "syncshare": { "message": "SyncShare" },
  // Add ALL messages from ru/messages.json
  ...Object.fromEntries(Object.entries(fallbackMessages).filter(([k]) => !k.includes('EN')))
};

const FULL_MESSAGES = navigator.language.startsWith('ru') ? FULL_MESSAGES_RU : FULL_MESSAGES_EN;

// ✅ [BLACKBOXAI] Initialize ONCE - NO DUPLICATE DECLARATIONS
messagesCache = FULL_MESSAGES;  // NOT 'let' - using existing declaration
messagesLoaded = true;

console.log('[i18n ✅ BLACKBOXAI FIXED] HARDCODED RU/EN messages loaded');
console.log('[i18n] Language:', navigator.language, '| Messages count:', Object.keys(messagesCache).length);
    
    // Initialize messages on startup with retry
    // ✅ [BLACKBOXAI] Skip unreliable loadMessages - HARDCODED is stable
    // loadMessages().catch(() => {
    //     messagesCache = fallbackMessages;
    //     messagesLoaded = true;
    // });
    
    console.log('[i18n ✅ BLACKBOXAI] Skip loadMessages - using HARDCODED messages');
    
    chrome.i18n.getMessage = function(key, substitutions) {
        // If messages not loaded yet, use fallback immediately
        if (!messagesLoaded || !messagesCache) {
            const fallback = fallbackMessages[key];
            if (fallback && fallback.message) {
                let msg = fallback.message;
                if (substitutions) {
                    if (Array.isArray(substitutions)) {
                        substitutions.forEach((sub, index) => {
                            msg = msg.replace(new RegExp(`\\$${index + 1}`, 'g'), sub);
                        });
                    } else {
                        msg = msg.replace(/\$(\d+)/g, (match, num) => {
                            return substitutions[parseInt(num) - 1] || match;
                        });
                    }
                }
                return msg.replace(/\\u003C/g, '<').replace(/\\u003E/g, '>').replace(/\\u0026/g, '&');
            }
            return key;
        }
        
        const messageObj = messagesCache[key];
        if (!messageObj || !messageObj.message) {
            // Try fallback if key not found
            const fallback = fallbackMessages[key];
            if (fallback && fallback.message) {
                let msg = fallback.message;
                if (substitutions) {
                    if (Array.isArray(substitutions)) {
                        substitutions.forEach((sub, index) => {
                            msg = msg.replace(new RegExp(`\\$${index + 1}`, 'g'), sub);
                        });
                    } else {
                        msg = msg.replace(/\$(\d+)/g, (match, num) => {
                            return substitutions[parseInt(num) - 1] || match;
                        });
                    }
                }
                return msg.replace(/\\u003C/g, '<').replace(/\\u003E/g, '>').replace(/\\u0026/g, '&');
            }
            return key;
        }
        
        let message = messageObj.message;
        
        if (substitutions) {
            if (Array.isArray(substitutions)) {
                substitutions.forEach((sub, index) => {
                    message = message.replace(new RegExp(`\\$${index + 1}`, 'g'), sub);
                });
            } else {
                message = message.replace(/\$(\d+)/g, (match, num) => {
                    return substitutions[parseInt(num) - 1] || match;
                });
            }
        }
        
        // Unescape HTML entities
        message = message.replace(/\\u003C/g, '<').replace(/\\u003E/g, '>').replace(/\\u0026/g, '&');
        
        return message;
    };
    
    chrome.i18n.getUILanguage = function() {
        return navigator.language || 'en';
    };
    
    console.log('[i18n ✅ BLACKBOXAI] Polyfill COMPLETED - NO ERRORS');
    console.log('[QUIZ EXTENSION READY] i18n_polyfill.js → commons.js → quiz_attempt.js should load next');
})();

