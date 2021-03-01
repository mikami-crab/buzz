const LiveChat = require('youtube-chat').LiveChat;
const { app, Menu, BrowserWindow } = require('electron');
const { ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
const Discord = require('discord.js');

// Creates a client
const textToSpeechClient = new textToSpeech.TextToSpeechClient();

let mainWindow;
const discordClient = new Discord.Client();

let voiceChannel = null;
let connection = null;

let queue = []
let isPlaying = false

prefix = "/"

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

function addAudioToQueue(path, voiceChannel) {
    queue.push(
        { path: path, voiceChannel: voiceChannel }
    );
}

function playAudio() {
    console.log('playAudio start');

    // キューがないなら何もしない
    if (queue.length == 0) {
        console.log('playAudio no queue');
        return;
    }
    if (queue.length >= 1 && !isPlaying ) {
        isPlaying = true;
        console.log('playAudio play : ' + queue[0].path);
        const dispatcher = connection.play(queue[0].path, {
            volume: 0.5,
          });
        dispatcher.on('finish', () => {
            console.log('playAudio finish');
            // 再生し終わった音声ファイルを削除する
            fs.unlinkSync(queue[0].path, function(err){
                if(err){
                  throw(err);
                }
                console.log(`deleted`);
              });
            queue.shift()
            isPlaying = false;
            playAudio()});
        // queue[0].voiceChannel.join().then(connection => {
        //     console.log('playAudio join then');
        //     const dispatcher = connection.play(queue[0].path);
        //     dispatcher.on('finish', () => {
        //         console.log('playAudio finish');
        //         // 再生し終わった音声ファイルを削除する
        //         fs.unlink(queue[0].path, function(err){
        //             if(err){
        //               throw(err);
        //             }
        //             console.log(`deleted`);
        //           });
        //         queue.shift()
        //         playAudio()
        //         isPlaying = true
        //     })
        // })
    }
}

// 非同期メッセージの受信と返信
ipcMain.on('asynchronous-liveId', (event, discordbottoken, texttospeechapikey, youtubeliveid) => {

    const liveChat = new LiveChat({ liveId: youtubeliveid });
    
    // live chat 開始イベント
    liveChat.on('start', (liveId) => {
        console.log('start');
    });
    
    // live chat 終了イベント
    liveChat.on('end', (reason) => {
        console.log('end');
    });

    // live chat コメント取得イベント
    liveChat.on('comment', (comment) => {
        var messageaaa = comment.author.name + 'さん, ';
        comment.message.forEach(element => messageaaa += element.text);
        event.reply('asynchronous-liveId-reply', messageaaa);
        createSpeech(messageaaa);
    });

    // live chat エラーイベント
    liveChat.on('error', (err) => {
        console.log('error');
    });

    discordClient.on("ready", () => {
        discordClient.user.setPresence({ game: { name: 'Watch your step darling' } });
        console.log("ready...");
    });

    // discordのメッセージ受信イベント
    discordClient.on("message", async message => {
        
        if (message.author.bot) {
            // ボットの場合処理を抜ける
            return;
        } else {
            // ボットでは無い場合

            // 発言者が現在いるボイスチャンネルを取得する
            const authorChannelId = message.member.voice.channel.id
            
            if (message.user == message.client.user || authorChannelId == null) {
                return;
            }

            // buzzコマンド
            if (message.content.startsWith(prefix)) {

                const input = message.content.replace(prefix, "").split(" ")
                const command = input[0]
                const args = input.slice(1);

                if (command === "buzz") {
                    if (args.length > 0) {
                        if (args[0] === "join") {
                            console.log("/buzz join");
                            connection = await message.member.voice.channel.join();
                        } else if (args[0] === "shutdown" || args[0] === "exit" )  {
                            console.log("/buzz shutdown or exit");
                            connection.disconnect();
                            connection = null;
                        }
                    }
                }

            } else if (connection != null) {
                // チャットメッセージから何かを発する予定はない
                // 何か喋らせたいときはここに追加
            }
            let msg = message.content;
            let channel = message.channel;
            let author = message.author.username;
            return;
        }
    }
    );

    // discordにログインする
    discordClient.login(discordbottoken);
    // youtube liveに接続する
    liveChat.start();

    console.log('asynchronous-liveId_end');
})

// text to speech
async function createSpeech(text) {

    if (connection != null) {
        console.log("createSpeech discord connected")
    } else {
        console.log("createSpeech discord disconnected, skip text-to-speech")
        return;
    }

    // Construct the request
    const request = {
        input: { text: text },
        // Select the language and SSML voice gender (optional)
        voice: { languageCode: 'ja-JP', ssmlGender: 'NEUTRAL' },
        // select the type of audio encoding
        audioConfig: { audioEncoding: 'MP3' },
    };

    // Performs the text-to-speech request
    const [response] = await textToSpeechClient.synthesizeSpeech(request);
    // Write the binary audio content to a local file
    //const writeFile = util.promisify(fs.writeFile);
    //await writeFile('output.mp3', response.audioContent, 'binary');
    console.log('Audio content written to file: output.mp3');
    
    var date = new Date();
    var a = date.getTime();
    fs.writeFileSync(
        `audio/${a}.mp3`,
        response.audioContent
    );
    addAudioToQueue(`audio/${a}.mp3`, voiceChannel)

    if (!isPlaying) {
        playAudio()
    }
}

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