const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

// 🌍 L'adresse de votre serveur Cloud
const CLOUD_URL = 'https://ecomanageapp.com';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    autoHideMenuBar: true, // Cache la barre de menu pour faire plus "Logiciel"
    webPreferences: {
      // 🚨 IMPORTANT: On n'injecte PAS preload.js
      // Cela force le frontend React à utiliser le saasApiBridge.ts
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/vite.svg') // Optionnel: icône
  });

  // Si on est en développement local, on charge le serveur Vite local
  // Sinon (en production), on charge DIRECTEMENT le Cloud
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    console.log(`[SaaS Client] Connexion au serveur: ${CLOUD_URL}`);
    win.loadURL(CLOUD_URL);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
