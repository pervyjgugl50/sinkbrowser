// Background script i18n polyfill for Electron
(function() {
    if (!chrome.i18n) {
        chrome.i18n = {};
    }
    
    // Pre-loaded messages
    const messages = {
        "magicMenuSuggestions": { "message": "Suggestions" },
        "magicMenuSubmissions": { "message": "Submissions" },
        "noQuestionSolution": { "message": "No answer yet" },
        "questionNotSupportedMessage": { "message": "Question unsupported" },
        "documentation": { "message": "Documentation" },
        "openQuizViewMessage": { "message": "Open question bank" },
        "quizCompletionMessage": { "message": "This quiz has been solved {count} time(s)" },
        "copy": { "message": "Copy" },
        "syncshare": { "message": "SyncShare" }
    };
    
    chrome.i18n.getMessage = function(key, substitutions) {
        const messageObj = messages[key];
        if (!messageObj || !messageObj.message) {
            console.warn(`[SyncShare] i18n message "${key}" not found`);
            return key;
        }
        
        let message = messageObj.message;
        
        if (substitutions) {
            if (typeof substitutions === 'object') {
                Object.keys(substitutions).forEach(k => {
                    message = message.replace(new RegExp(`\\{${k}\\}`, 'g'), substitutions[k]);
                });
            } else if (Array.isArray(substitutions)) {
                substitutions.forEach((sub, index) => {
                    message = message.replace(new RegExp(`\\$${index + 1}`, 'g'), sub);
                });
            }
        }
        
        return message;
    };
    
    chrome.i18n.getUILanguage = function() {
        return 'en';
    };
    
    console.log('[SyncShare Background] i18n polyfill initialized');
})();
