const LiveChat = require('youtube-chat').LiveChat;
const { app, Menu, BrowserWindow } = require('electron');
const { ipcMain } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            preload: `${__dirname}/preload.js`,
            enableRemoteModule: true
        }, width: 800, height: 600
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    // 開発ツールを有効化
    mainWindow.webContents.openDevTools();

    Menu.setApplicationMenu(null);

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// 非同期メッセージの受信と返信
ipcMain.on('asynchronous-liveId', (event, arg) => {
    console.log(arg);

    const liveChat = new LiveChat({ liveId: arg });
    // Emit at start of observation chat.
    liveChat.on('start', (liveId) => {
        console.log('start');
    });
    // Emit at end of observation chat.
    liveChat.on('end', (reason) => {
        console.log('end');
    });
    // Emit at receive chat.
    liveChat.on('comment', (comment) => {
        console.log('comment');
        console.log(comment.author.name);
        event.reply('asynchronous-liveId-reply', comment.author.name);
    });
    // Emit when an error occurs
    liveChat.on('error', (err) => {
        console.log('error');
    });
    console.log('asynchronous-liveId_end');
    liveChat.start();
})


/** ↓↓未使用サンプル↓↓ */
// 非同期メッセージの受信と返信
ipcMain.on('asynchronous-message', (event, arg) => {
    // 受信したコマンドの引数を表示する
    console.log(arg) // ping

    // 送信元のチャンネル('asynchronous-reply')に返信する
    event.reply('asynchronous-reply', 'pong')
})

// 同期メッセージの受信と返信
ipcMain.on('synchronous-message', (event, arg) => {
    console.log(arg) // ping

    // 非同期との違いは reply を使うか returnValue を使うか
    event.returnValue = 'pong'
})
