const { app, BrowserWindow, ipcMain } = require("electron");

// ============================================
// 宠物窗口
// ============================================
function createPetWindow(role = "🐱") {
  const win = new BrowserWindow({
    width: 200,
    height: 200,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile("index.html");
    win.webContents.on("did-finish-load", () => {
    win.webContents.send("set-role", role);
  });

  return win;
}

// ============================================
// 控制面板窗口
// ============================================
function createControlPanel() {
  const panel = new BrowserWindow({
    width: 420,
    height: 520,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  panel.loadFile("control.html");
  return panel;
}

// ============================================
// 全局变量 + 启动逻辑
// ============================================
let petWindows = {};  // 字典：按角色名存窗口

app.whenReady().then(() => {
  // 启动后先打开控制面板
  createControlPanel();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createControlPanel();
    }
  });
});

// 启动桌宠
ipcMain.on("start-pet", (event, role) => {
  // 如果这个角色已经开着，不重复创建
  if (petWindows[role] && !petWindows[role].isDestroyed()) {
    return;
  }
  petWindows[role] = createPetWindow(role);
});

// 关闭桌宠（带角色名）
ipcMain.on("stop-pet", (event, role) => {
  if (petWindows[role] && !petWindows[role].isDestroyed()) {
    petWindows[role].close();
    delete petWindows[role];  // 从字典里删掉
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
