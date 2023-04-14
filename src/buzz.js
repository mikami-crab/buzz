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

// 人名

document.querySelector('#buttonShocho').addEventListener('click', () => {
  // 
  sendBuzzCommand('shocho')
});
document.querySelector('#buttonUyat').addEventListener('click', () => {
  // 
  sendBuzzCommand('uyatsan')
});
document.querySelector('#buttonAnesan').addEventListener('click', () => {
  // 
  sendBuzzCommand('anesan')
});
document.querySelector('#buttonTsukimi').addEventListener('click', () => {
  // 
  sendBuzzCommand('tsukimisan')
});
document.querySelector('#buttonBitton').addEventListener('click', () => {
  // 
  sendBuzzCommand('bittonsan')
});
document.querySelector('#buttonKomachan').addEventListener('click', () => {
  // 
  sendBuzzCommand('komachan')
});
document.querySelector('#buttonOyakata').addEventListener('click', () => {
  // 
  sendBuzzCommand('oyakata')
});
document.querySelector('#buttonKabadachon').addEventListener('click', () => {
  // 
  sendBuzzCommand('kaba')
});
document.querySelector('#buttonTaisho').addEventListener('click', () => {
  // 
  sendBuzzCommand('taisho')
});
document.querySelector('#buttonFumeichan').addEventListener('click', () => {
  // 
  sendBuzzCommand('fumeichan')
});
document.querySelector('#buttonMokasan').addEventListener('click', () => {
  // 
  sendBuzzCommand('mokasan')
});
document.querySelector('#buttonKuroaya').addEventListener('click', () => {
  // 
  sendBuzzCommand('kuroaya')
});
document.querySelector('#buttonMochiduki').addEventListener('click', () => {
  // 
  sendBuzzCommand('mochiduki')
});
document.querySelector('#buttonYoyo').addEventListener('click', () => {
  // 
  sendBuzzCommand('yoyo')
});

// おしゃべり
document.querySelector('#buttonNg').addEventListener('click', () => {
  // 
  sendBuzzCommand('ng')
});
document.querySelector('#buttonTm').addEventListener('click', () => {
  // 
  sendBuzzCommand('tm')
});
document.querySelector('#buttonKm').addEventListener('click', () => {
  // 
  sendBuzzCommand('km')
});
document.querySelector('#buttonNgTmKm').addEventListener('click', () => {
  // 
  sendBuzzCommand('ngtmkm')
});
document.querySelector('#buttonKl').addEventListener('click', () => {
  // 
  sendBuzzCommand('kl')
});
document.querySelector('#buttonTsuyoi').addEventListener('click', () => {
  // 
  sendBuzzCommand('tsuyoi')
});
document.querySelector('#buttonThankyou').addEventListener('click', () => {
  // 
  sendBuzzCommand('thankyou')
});
document.querySelector('#buttonArigato').addEventListener('click', () => {
  // 
  sendBuzzCommand('arigato')
});
document.querySelector('#buttonWelcome').addEventListener('click', () => {
  // 
  sendBuzzCommand('welcome')
});
document.querySelector('#buttonYoukoso').addEventListener('click', () => {
  // 
  sendBuzzCommand('youkoso')
});

document.querySelector('#buttoniscrazy').addEventListener('click', () => {
  // 
  sendBuzzCommand('iscrazy')
});
document.querySelector('#buttonispretty').addEventListener('click', () => {
  // 
  sendBuzzCommand('ispretty')
});
document.querySelector('#buttonisbeautiful').addEventListener('click', () => {
  // 
  sendBuzzCommand('isbeautiful')
});
document.querySelector('#buttonismarvelous').addEventListener('click', () => {
  // 
  sendBuzzCommand('ismarvelous')
});
document.querySelector('#buttonisfabulous').addEventListener('click', () => {
  // 
  sendBuzzCommand('isfabulous')
});

document.querySelector('#buttonOuen').addEventListener('click', () => {
  sendJingle('donpafu.mp3')
});
document.querySelector('#buttonHyoshigi').addEventListener('click', () => {
  sendJingle('hyoushi.mp3')
});
document.querySelector('#buttonKeihou').addEventListener('click', () => {
  sendJingle('keihou.mp3')
});
document.querySelector('#buttonBirasurappu').addEventListener('click', () => {
  sendJingle('birasurappu.mp3')
});
document.querySelector('#buttonWadaiko').addEventListener('click', () => {
  sendJingle('wadaiko.mp3')
});
document.querySelector('#buttonMondai').addEventListener('click', () => {
  sendJingle('deden.mp3')
});
document.querySelector('#buttonSeikai').addEventListener('click', () => {
  sendJingle('pinpon.mp3')
});
document.querySelector('#buttonHazure').addEventListener('click', () => {
  sendJingle('bubu.mp3')
});
document.querySelector('#buttonKansei').addEventListener('click', () => {
  sendJingle('kansei_hakushu.mp3')
});

document.querySelector('#buttonWarai').addEventListener('click', () => {
  sendJingle('warai.mp3')
});

document.querySelector('#buttonOh').addEventListener('click', () => {
  sendJingle('oh.mp3')
});

function sendBuzzCommand(commandText) {
  // 各パラメーターをメインスレッドに送信
  window.ipcRenderer.send('asynchronous-buzz-command', commandText);
}

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