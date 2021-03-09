function connect() {
    // 各パラメーターをメインスレッドに送信
    window.ipcRenderer.send('asynchronous-liveId', document.getElementById('discordbottoken').value, document.getElementById('texttospeechapikey').value, document.getElementById('youtubeliveid').value);
}

document.querySelector('#buttonLoad').addEventListener('click', () => {
    connect()
})

// チャットコメント受信
window.ipcRenderer.on('asynchronous-liveId-reply', (event, arg) => {
  // 受信時のコールバック関数
  console.log(arg)
  document.getElementById('chatcomment').value = arg;
  
});

// 保存した設定値受信
window.ipcRenderer.on('asynchronous-init-param-reply', (event, arg1, arg2) => {
  // 受信時のコールバック関数
  document.getElementById('discordbottoken').value = arg1;
  document.getElementById('texttospeechapikey').value = arg2;
  
});

window.ipcRenderer.send('asynchronous-init-param', '');