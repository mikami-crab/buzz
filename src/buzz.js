//import {LiveChat} from 'youtube-chat';
//import { ipcRenderer, remote } from 'electron';
// なぜかグローバル変数をconstに入れられない。
//const { ipcRenderer } = window.ipcRenderer;
//const { remote } = window.remote;
function getData() {
    //alert(document.getElementById('youtubeliveid').value);
    // 非同期メッセージの送信
    window.ipcRenderer.send('asynchronous-liveId', document.getElementById('youtubeliveid').value);
}

document.querySelector('#buttonLoad').addEventListener('click', () => {
    getData()
})

// チャンネル 'asynchronous-reply' で非同期メッセージの受信を待機
window.ipcRenderer.on('asynchronous-liveId-reply', (event, arg) => {
  // 受信時のコールバック関数
  console.log(arg) // pong
});

/** ↓↓未使用サンプル↓↓ */
// チャンネル 'asynchronous-reply' で非同期メッセージの受信を待機
window.ipcRenderer.on('asynchronous-reply', (event, arg) => {
  // 受信時のコールバック関数
  console.log(arg) // pong
});
// 非同期メッセージの送信
window.ipcRenderer.send('asynchronous-message', 'ping')

// 同期メッセージを送信して、返信内容を表示する
const retValue = window.ipcRenderer.sendSync('synchronous-message', 'ping');
console.log(retValue) // pong

function showMessageBox() {
    var win = window.remote.getCurrentWindow();
    var options = {
        type: 'info',
        buttons: ['OK', 'テスト', 'Cancel', 'sample', 'Yes', 'No'],
        title: 'タイトル',
        message: 'メッセージ',
        detail: '詳細メッセージ'
    };

    dialog.showMessageBox(win, options);
}