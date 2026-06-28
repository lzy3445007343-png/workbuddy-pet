const { app, BrowserWindow, ipcMain, Menu } = require("electron");

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
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  // win.webContents.openDevTools();  // 调试用，正常使用时注释掉
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
// 聊天窗口（双击宠物时切换）
// ============================================
let chatWindows = {};

function createChatWindow(parentWindow, role) {
  // 如果这角色已有聊天窗口，先关掉
  if (chatWindows[role] && !chatWindows[role].isDestroyed()) {
    chatWindows[role].close();
  }
  // 给这角色新建一个窗口
  chatWindows[role] = new BrowserWindow({
    width: 360,
    height: 480,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  chatWindows[role].loadFile("chat.html");
  // 窗口加载完后，把 API 配置传过去
  chatWindows[role].webContents.on("did-finish-load", () => {
    const config = apiConfigs[role] || { model: "", url: "", key: "" };
    chatWindows[role].webContents.send("api-config", config);
  });
  // 窗口关闭时，从字典里删掉
  chatWindows[role].on("closed", () => {
    delete chatWindows[role];
  });
}

// ============================================
// 全局变量 + 启动逻辑
// ============================================
let petWindows = {};  // 字典：按角色名存窗口
let apiConfigs = {};   // 字典：按角色名存 API 配置 { model, url, key }

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

// 接收控制面板保存的 API 配置
ipcMain.on("save-api-config", (event, role, config) => {
  apiConfigs[role] = config;
});

// JS 拖拽（替代 CSS 的 -webkit-app-region）
ipcMain.on("move-window", (event, { dx, dy }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const [x, y] = win.getPosition();
    win.setPosition(x + dx, y + dy);
  }
});

// 右键菜单
ipcMain.on("show-context-menu", (event, role) => {
  const menu = Menu.buildFromTemplate([
    {
      label: "对话",
      click: () => {
        const petWin = BrowserWindow.fromWebContents(event.sender);
        createChatWindow(petWin, role);
      }
    },
    { type: "separator" },
    {
      label: "关闭",
      click: () => {
        event.sender.send("stop-pet", role);
      }
    }
  ]);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender) });
});
ipcMain.on("toggle-chat", (event, role) => {
  const petWin = BrowserWindow.fromWebContents(event.sender);
  createChatWindow(petWin, role);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
