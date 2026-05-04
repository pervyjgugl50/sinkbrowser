// Polyfill for chrome.i18n in Electron environment
(function() {
    if (!chrome.i18n) {
        chrome.i18n = {};
    }
    
    // Cache for messages
    let messagesCache = null;
    let messagesLoaded = false;
    
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
    
    // Load messages from _locales
    async function loadMessages() {
        if (messagesCache) return messagesCache;
        
        try {
            const locale = chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : 'en';
            const locales = ['en', 'ru'];
            let messages = { ...fallbackMessages };
            
            for (const loc of locales) {
                try {
                    const url = chrome.runtime.getURL(`_locales/${loc}/messages.json`);
                    const response = await fetch(url, { 
                        method: 'GET',
                        credentials: 'omit',
                        cache: 'no-cache'
                    });
                    if (response.ok) {
                        const data = await response.json();
                        messages = { ...messages, ...data };
                    }
                } catch (e) {
                    console.debug(`Could not load messages for ${loc}:`, e.message);
                }
            }
            
            messagesCache = messages;
            messagesLoaded = true;
            return messages;
        } catch (e) {
            console.error('Failed to load i18n messages:', e);
            messagesCache = fallbackMessages;
            messagesLoaded = true;
            return messagesCache;
        }
    }
    
    // Initialize messages on startup with retry
    loadMessages().catch(() => {
        messagesCache = fallbackMessages;
        messagesLoaded = true;
    });
    
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
    
    console.log('[SyncShare] i18n polyfill initialized');
})();
