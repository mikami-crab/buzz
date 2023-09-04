document.querySelector('#buttonDiscordStart').addEventListener('click', () => {
  discordServerStart()
});

function discordServerStart() {
  // 各パラメーターをメインスレッドに送信
  window.ipcRenderer.send('asynchronous-discordserverstart', 
  document.getElementById('discordbottoken').value, 
  document.getElementById('texttospeechapikey').value, 
  document.getElementById('gcpprojectid').value);
}

function sendBuzzCommand(commandText) {
  // 各パラメーターをメインスレッドに送信
  window.ipcRenderer.send('asynchronous-buzz-command', commandText);
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
window.ipcRenderer.on('asynchronous-init-param-reply', (event, arg1, arg2, arg4) => {
  // 受信時のコールバック関数
  document.getElementById('discordbottoken').value = arg1;
  document.getElementById('texttospeechapikey').value = arg2;
  document.getElementById('gcpprojectid').value = arg4;
});

window.ipcRenderer.send('asynchronous-init-param', '');