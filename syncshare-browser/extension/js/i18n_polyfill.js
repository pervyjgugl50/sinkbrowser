// Polyfill for chrome.i18n in Electron environment
(function() {
    if (!chrome.i18n) {
        chrome.i18n = {};
    }
    
    // Cache for messages
    let messagesCache = null;
    
    // Load messages from _locales
    async function loadMessages() {
        if (messagesCache) return messagesCache;
        
        try {
            const locale = chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : 'en';
            const locales = ['en', 'ru'];
            let messages = {};
            
            for (const loc of locales) {
                try {
                    const response = await fetch(chrome.runtime.getURL(`_locales/${loc}/messages.json`));
                    if (response.ok) {
                        const data = await response.json();
                        messages = { ...messages, ...data };
                    }
                } catch (e) {
                    console.warn(`Could not load messages for ${loc}:`, e);
                }
            }
            
            messagesCache = messages;
            return messages;
        } catch (e) {
            console.error('Failed to load i18n messages:', e);
            return {};
        }
    }
    
    // Initialize messages on startup
    loadMessages();
    
    chrome.i18n.getMessage = function(key, substitutions) {
        if (!messagesCache) {
            console.warn(`i18n message "${key}" requested before messages loaded`);
            return key;
        }
        
        const messageObj = messagesCache[key];
        if (!messageObj || !messageObj.message) {
            console.warn(`i18n message "${key}" not found`);
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
