// preload.js for Electron + Extension bridge
const { contextBridge, ipcRenderer } = require('electron');

console.log('[PRELOAD] Bridge loaded - enabling extension <-> main comms');

// Expose safe APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Extension status
  getExtensionStatus: () => {
    console.log('[PRELOAD] Extension ping from renderer');
    return {
      id: chrome.runtime?.id || 'unknown',
      ready: true,
      timestamp: Date.now()
    };
  },
  
  // Main process comms
  sendToMain: (channel, data) => ipcRenderer.invoke(channel, data),
  
  // Magic button helpers
  showMagicButton: (data) => {
    console.log('[PRELOAD] Magic button trigger:', data);
    // Trigger main process if needed
  }
});

// Force extension detection
window.__SyncShareReady__ = true;
window.addEventListener('load', () => {
  console.log('[PRELOAD] Window loaded - extension ready');
});

