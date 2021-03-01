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
const testToSpeechClient = new textToSpeech.TextToSpeechClient();

let mainWindow;
const discordClient = new Discord.Client();

let voiceChannel = null;

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
    if (queue.length >= 1 && !isPlaying ) {
        console.log('playAudio play');
        queue[0].voiceChannel.join().then(connection => {
            console.log('playAudio join then');
            const dispatcher = connection.play(queue[0].path);
            dispatcher.on('finish', () => {
                console.log('playAudio finish');
                queue.shift()
                playAudio()
                isPlaying = true
            })
        })
    } else {
        console.log('playAudio skip');
        isPlaying = false
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

    discordClient.on("message", async message => {
        
        if (message.author.bot) {
            // ボットの場合処理を抜ける
            return;
        } else {
            // ボットでは無い場合

            // 発言者が現在いるボイスチャンネルを取得する
            const authorChannelId = message.member.voice.channel.id
            
            const connection = message.client.voice.connections.find(connection => connection.channel.id === authorChannelId);
            
            if (message.user == message.client.user || authorChannelId == null) {
                return;
            }

            // buzzコマンド用処理
            if (message.content.startsWith(prefix)) {

                const input = message.content.replace(prefix, "").split(" ")
                const command = input[0]
                const args = input.slice(1);

                if (command === "buzz") {
                    if (args.length > 0) {
                        if (args[0] === "join") {
                            await message.member.voice.channel.join();
                            voiceChannel = message.member.voice.channel;
                        } else if (args[0] === "shutdown" || args[0] === "exit" )  {
                            message.client.voice.connections.each(connection => {
                                connection.disconnect();
                                message.member.voice.channel.disconnect();
                            })
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

    discordClient.login(discordbottoken);
    liveChat.start();

    console.log('asynchronous-liveId_end');
})

// text to speech
async function createSpeech(text) {

    if (voiceChannel != null) {
        console.log("connect voice channel")
    } else {
        console.log("not connect voice channel")
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
    const [response] = await testToSpeechClient.synthesizeSpeech(request);
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