document.querySelector('#buttonDiscordStart').addEventListener('click', () => {
  discordServerStart()
});

function discordServerStart() {
  // 各パラメーターをメインスレッドに送信
  window.ipcRenderer.send('asynchronous-discordserverstart', 
  document.getElementById('discordbottoken').value, 
  document.getElementById('discordbottokenjingle').value, 
  document.getElementById('texttospeechapikey').value, 
  document.getElementById('gcpprojectid').value);
}

document.querySelector('#buttonKansei').addEventListener('click', () => {
  sendJingle('kansei_hakushu1.mp3')
});

document.querySelector('#buttonWarai').addEventListener('click', () => {
  sendJingle('warai2.mp3')
});

document.querySelector('#buttonOh').addEventListener('click', () => {
  sendJingle('oh.mp3')
});

function sendJingle(mp3Name) {
  // 各パラメーターをメインスレッドに送信
  window.ipcRenderer.send('asynchronous-jingle', mp3Name);
}

document.querySelector('#buttonLoad').addEventListener('click', () => {
  connect()
});

function connect() {
  // 各パラメーターをメインスレッドに送信
  window.ipcRenderer.send('asynchronous-liveId', document.getElementById('youtubeliveid').value);
}

document.querySelector('#fileOpen').addEventListener('click', () => {
  openFileDialog()
});

function openFileDialog() {
  let filenames = window.remote.dialog.showOpenDialogSync(null, {
    properties: ['openFile'],
    title: 'Select a json file',
    defaultPath: '.',
    filters: [
      { name: 'json file', extensions: ['json'] }
    ]
  });
  // キャンセルで閉じた場合
  if (filenames === undefined) {
    return;
  }

  try {
    document.getElementById('texttospeechapikey').value = filenames[0];
  } catch (error) {
    return;
  }

}

// チャットコメント受信
window.ipcRenderer.on('asynchronous-liveId-reply', (event, arg) => {
  // 受信時のコールバック関数
  console.log(arg)
  document.getElementById('chatcomment').value = arg;

});

// 保存した設定値受信
window.ipcRenderer.on('asynchronous-init-param-reply', (event, arg1, arg2, arg3, arg4) => {
  // 受信時のコールバック関数
  document.getElementById('discordbottoken').value = arg1;
  document.getElementById('texttospeechapikey').value = arg2;
  document.getElementById('discordbottokenjingle').value = arg3;
  document.getElementById('gcpprojectid').value = arg4;
});

window.ipcRenderer.send('asynchronous-init-param', '');