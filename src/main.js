const LiveChat = require('youtube-chat').LiveChat;
const { app, Menu, BrowserWindow } = require('electron');
const { ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
const Discord = require('discord.js');

const Store = require('electron-store');
const store = new Store();

// Creates a client
const textToSpeechClient = new textToSpeech.TextToSpeechClient();

let mainWindow;

const discordClient = new Discord.Client();

const discordClientJingle = new Discord.Client();

let voiceChannel = null;
let connection = null;
let connectionJingle = null;

let queue = [];
let isPlaying = false;
let gcpProjectId = "";

prefix = "/";

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
    //mainWindow.webContents.openDevTools();

    Menu.setApplicationMenu(null);

    mainWindow.on('closed', () => {
        mainWindow = null;
        connection.disconnect();
        connectionJingle.disconnect();
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

function addAudioToQueue(path, voiceChannel, deleteFlg = true) {
    queue.push(
        { path: path, voiceChannel: voiceChannel, deleteFlg: deleteFlg }
    );
}

function playAudio() {
    console.log('playAudio start');

    // キューがないなら何もしない
    if (queue.length == 0) {
        console.log('playAudio no queue');
        return;
    }

    // キューが残ってて再生できる状態の場合
    if (queue.length >= 1 && !isPlaying) {
        isPlaying = true;
        console.log('playAudio play : ' + queue[0].path);
        const dispatcher = connection.play(queue[0].path, {
            volume: 0.5,
        });
        dispatcher.on('finish', () => {
            console.log('playAudio finish');
            // 再生し終わった音声ファイルを削除する
            if (queue[0].deleteFlg) {
                fs.unlinkSync(queue[0].path, function (err) {
                    if (err) {
                        throw (err);
                    }
                    console.log(`deleted`);
                });
            }
            queue.shift()
            isPlaying = false;
            playAudio()
        });
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

// UI側からの各パラメーター受信
ipcMain.on('asynchronous-discordserverstart', (event, discordbottoken, discordbottokenjingl, texttospeechapikey, gcpprojectid) => {

    process.env.GOOGLE_APPLICATION_CREDENTIALS = texttospeechapikey;

    store.set("discord_bot_token", discordbottoken);
    store.set("discord_bot_token_jingle", discordbottokenjingl);
    store.set("text_to_speech_api_key_path", texttospeechapikey);
    store.set("gcp_project_id", gcpprojectid);

    gcpProjectId = gcpprojectid;

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
                        } else if (args[0] === "shutdown" || args[0] === "exit") {
                            console.log("/buzz shutdown or exit");
                            connection.disconnect();
                            connection = null;
                        } else if (args[0] === "tran" || args[0] === "translate") {
                            console.log("/buzz tran or translate");
                            const sourceLanguageCode = args[1];
                            const targetLanguageCode = args[2];
                            const text = args[3];

                            translateText(text, sourceLanguageCode, targetLanguageCode)
                        }
                    }
                }

            } else if (connection != null) {
                // チャットメッセージから何かを喋らせる予定はない
                // 何か喋らせたいときはここに追加
            }
            return;
        }
    }
    );

    discordClientJingle.on("ready", () => {
        discordClientJingle.user.setPresence({ game: { name: 'A well well darling' } });
        console.log("jingle ready...");
    });

    // discordのメッセージ受信イベント
    discordClientJingle.on("message", async message => {

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
                            connectionJingle = await message.member.voice.channel.join();
                        } else if (args[0] === "shutdown" || args[0] === "exit") {
                            console.log("/buzz shutdown or exit");
                            connectionJingle.disconnect();
                            connectionJingle = null;
                        }
                    }
                }

            } else if (connectionJingle != null) {
                // チャットメッセージから何かを喋らせる予定はない
                // 何か喋らせたいときはここに追加
            }
            return;
        }
    }
    );

    // discordにログインする
    discordClient.login(discordbottoken);
    discordClientJingle.login(discordbottokenjingl);
});

// UI側からの各パラメーター受信
ipcMain.on('asynchronous-liveId', (event, youtubeliveid) => {

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
        // 画面側にチャット内容を送信
        event.reply('asynchronous-liveId-reply', messageaaa);
        //
        createSpeech(messageaaa);
    });

    // live chat エラーイベント
    liveChat.on('error', (err) => {
        console.log('error');
    });

    // youtube liveに接続する
    liveChat.start();

    console.log('asynchronous-liveId_end');
})

ipcMain.on('asynchronous-jingle', (event, mp3FileName) => {
    console.log('jingle play : ' + mp3FileName);
    connectionJingle.play(`audio/${mp3FileName}`, {
        volume: 0.7,
    });
});

// text to speech
async function createSpeech(text) {
    createSpeech(text, 'ja-JP');
}

async function createSpeech(text, languageCode) {

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

const { TranslationServiceClient } = require('@google-cloud/translate').v3beta1;
//const location = 'global';
const location = 'us-central1';

// Instantiates a client
const translationClient = new TranslationServiceClient();
async function translateText(text, sourceLanguageCode, targetLanguageCode) {
    // Construct request
    console.log(`gcpProjectId - location: ${gcpProjectId} - ${location}`);
    const request = {
        parent: translationClient.locationPath(gcpProjectId, location),
        contents: [text],
        mimeType: 'text/plain', // mime types: text/plain, text/html
        sourceLanguageCode: sourceLanguageCode,
        targetLanguageCode: targetLanguageCode,
        model: `projects/${gcpProjectId}/locations/${location}/models/general/base`
    };

    // Run request
    const [response] = await translationClient.translateText(request);

    var result = "";
    for (const translation of response.translations) {
        console.log(`Translation: ${translation.translatedText}`);
        result = result + translation.translatedText;
    }

    return result;
}

// UI側からの各パラメーター受信
ipcMain.on('asynchronous-init-param', (event, discordbottoken) => {

    // 画面側にチャット内容を送信
    event.reply('asynchronous-init-param-reply',
        store.get("discord_bot_token"),
        store.get("text_to_speech_api_key_path"),
        store.get("discord_bot_token_jingle"),
        store.get("gcp_project_id"));
});