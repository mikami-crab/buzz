const { 
    joinVoiceChannel, entersState, VoiceConnectionStatus, createAudioResource, StreamType, createAudioPlayer, AudioPlayerStatus, NoSubscriberBehavior, generateDependencyReport  
} = require("@discordjs/voice");
console.log(generateDependencyReport());
const { LiveChat } = require("youtube-chat");
const { EmojiItem } = require("youtube-chat/dist/types/data");
const { app, Menu, BrowserWindow } = require('electron');
const { ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
const { Client, GatewayIntentBits } = require('discord.js');
const { Translate } = require('@google-cloud/translate').v2;
const Store = require('electron-store');
const { TranslationServiceClient } = require('@google-cloud/translate');

const textToSpeechClient = new textToSpeech.TextToSpeechClient();
const store = new Store();
const translateBasic = new Translate();
const translationClient = new TranslationServiceClient();
const location = 'global';

let mainWindow;

const discordClient = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages]
});

let voiceChannel = null;

let connection = null;
let player = null;

let buzzPlayQueue = [];
let isPlaying = false;
let gcpProjectId = "";

prefix = "/";

function createWindow() {
    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false,
            preload: `${__dirname}/preload.js`,
            enableRemoteModule: true,
            nativeWindowOpen: true 
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
        if (connection != null) {
            connection.disconnect();
        }
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

// UI側からの各パラメーター受信
ipcMain.on('asynchronous-init-param', (event, discordbottoken) => {
    // 画面側にチャット内容を送信
    event.reply('asynchronous-init-param-reply',
        store.get("discord_bot_token"),
        store.get("text_to_speech_api_key_path"),
        store.get("gcp_project_id"));
});

// UI側からの各パラメーター受信
ipcMain.on('asynchronous-discordserverstart', (event, discordbottoken, texttospeechapikey, gcpprojectid) => {

    process.env.GOOGLE_APPLICATION_CREDENTIALS = texttospeechapikey;

    store.set("discord_bot_token", discordbottoken);
    store.set("text_to_speech_api_key_path", texttospeechapikey);
    store.set("gcp_project_id", gcpprojectid); // AutoML未使用。使っていない。

    gcpProjectId = gcpprojectid;

    discordClient.on("ready", () => {
        discordClient.user.setPresence({ game: { name: 'Watch your step darling' } });
        console.log("ready...");
    });

    // discordのメッセージ受信イベント
    discordClient.on("messageCreate", async message => {
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
                const memberVC = message.member.voice.channel;
                if (!memberVC) {
                    console.log("接続先のVCが見つかりません。");
                  }
                  if (!memberVC.joinable) {
                    console.log("VCに接続できません。");
                  }
                  if (!memberVC.speakable) {
                    console.log("VCで音声を再生する権限がありません。");
                  }
                if (command === "buzz") {
                    if (args.length > 0) {
                        if (args[0] === "join") {
                            connection = joinVoiceChannel(
                                {
                                    channelId: memberVC.id,
                                    guildId: message.guild.id,
                                    adapterCreator: message.guild.voiceAdapterCreator
                                });
                            player = createAudioPlayer({
                                behaviors: {
                                  noSubscriber: NoSubscriberBehavior.Pause,
                                },
                            });
                              
                            player.on(AudioPlayerStatus.Idle, async () => {
                                console.log('playAudio finish');
                                // 再生し終わった音声ファイルを削除する
                                if (buzzPlayQueue.length <= 0) {
                                    return;
                                }
                                if (buzzPlayQueue[0].deleteFlg) {
                                    fs.unlinkSync(buzzPlayQueue[0].path, function (err) {
                                        if (err) {
                                            throw (err);
                                        }
                                    });
                                    console.log(`playAudio mp3 deleted`);
                                }
                                buzzPlayQueue.shift()
                                isPlaying = false;
                                await playAudio().catch((code) => { console.error("error:" + code);});
                            });
                            
                            connection.subscribe(player);
                            await createSpeech("BUZZ has started", "en").catch((code) => { console.error("error:" + code);});
                        } else if (args[0] === "shutdown" || args[0] === "exit") {
                            console.log("/buzz shutdown or exit");
                            connection.disconnect();
                            connection = null;
                        } else if (args[0] === "tran" || args[0] === "translate") {
                            console.log("/buzz tran or translate");
                            const sourceLanguageCode = args[1];
                            const targetLanguageCode = args[2];
                            const text = args[3];
                            const honyaku = await translateTextBasic(text, targetLanguageCode).catch((code) => { console.error("error:" + code);});
                            await createSpeech(text, sourceLanguageCode).catch((code) => { console.error("error:" + code);});
                            await createSpeech(honyaku, targetLanguageCode).catch((code) => { console.error("error:" + code);});
                            await message.reply(result1).catch((code) => { console.error("error:" + code);});
                        } else {
                            buzzCommand(args);
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

    // discordにログインする
    discordClient.login(discordbottoken);
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
    liveChat.on('chat', async (chatItem) => {
        var messageText = '';
        chatItem.message.forEach(function( messageItem ) {
            try {
                if (messageItem instanceof EmojiItem) {
                    console.log("messageItem.alt       : " + messageItem.alt);
                    console.log("messageItem.emojiText : " + messageItem.emojiText);
                    messageText += messageItem.alt;
                } else {
                    console.log("messageItem.text      : " + messageItem.text);
                    messageText += messageItem.text;
                }
            } catch (error) {
                console.error(error);
            }
        });
        // 画面側にチャット内容を送信
        event.reply('asynchronous-liveId-reply', chatItem.author.name + 'さん, ' + messageText);

        const input = messageText.replace(prefix, "").split(" ")
        const command = input[0]
        const args = input.slice(1);

        if (command === "buzz") {
            buzzCommand(args);
        } else {
            messageText = messageText.replace("undefined", "");
            let authorName = chatItem.author.name + 'さん, ';
            let wavenetName = "ja-JP-Neural2-B";
            let wavenetNameEn = "en-US-Neural2-H";
            let wavenetNameZh = "cmn-TW-Wavenet-A";
            if (chatItem.author.name == "お母さん") {
                authorName = "おかあさん, "
                wavenetName = "ja-JP-Neural2-C";
                wavenetNameEn = "en-US-Neural2-D";
                wavenetNameZh = "cmn-TW-Wavenet-B";
            } else if (chatItem.author.name.includes("ハメ子")) {
                wavenetName = "ja-JP-Neural2-D";
                wavenetNameEn = "en-US-Neural2-A";
                wavenetNameZh = "cmn-TW-Wavenet-C";
            }
            // 英語の場合
            if (messageText.match(/^[\x20-\x7e]*$/)) {
                const honyaku = await translateTextBasic(messageText, "ja-jp").catch((code) => { console.error("error:" + code);});
                await createSpeech(authorName + ', ' + honyaku, "ja-jp", wavenetName).catch((code) => { console.error("error:" + code);});
                await createSpeech(messageText, "en", wavenetNameEn).catch((code) => { console.error("error:" + code);});
            // 中国語の場合
            } else if (messageText.match(/^([一-龥．\. 　]|[\x20-\x7e])*$/)) {
                const honyaku = await translateTextBasic(messageText, "ja-jp").catch((code) => { console.error("error:" + code);});
                await createSpeech(authorName + ', ' + honyaku, "ja-jp", wavenetName).catch((code) => { console.error("error:" + code);});
                await createSpeech(messageText, "zh_CN", wavenetNameZh).catch((code) => { console.error("error:" + code);});
            } else {
                await createSpeech(authorName + ', ' + messageText, "ja-jp", wavenetName).catch((code) => { console.error("error:" + code);});
            }
        }
    });

    // live chat エラーイベント
    liveChat.on('error', (err) => {
        console.log(err);
    });

    // youtube liveに接続する
    liveChat.start();
})

ipcMain.on('asynchronous-buzz-command', (event, commandText) => {
    const args = commandText.replace(prefix, "").split(" ")
    buzzCommand(args);
});

async function addAudioToQueue(path, voiceChannel, deleteFlg = true, file = null) {
    buzzPlayQueue.push(
        { path: path, voiceChannel: voiceChannel, deleteFlg: deleteFlg, file: file }
    );
}

async function playAudio() {
    console.log('playAudio start');

    // キューがないなら何もしない
    if (buzzPlayQueue.length == 0) {
        console.log('playAudio no queue');
        return;
    }

    // キューが残ってて再生できる状態の場合
    if (buzzPlayQueue.length >= 1 && !isPlaying) {
        isPlaying = true;

        console.log('playAudio play : ' + buzzPlayQueue[0].path);
        
        const resource = createAudioResource(buzzPlayQueue[0].path,
        {
          inputType: StreamType.Arbitrary,
          inlineVolume: true,
        });

        resource.volume.setVolume(0.5);
        player.play(resource);
    }
}

// バズコマンド処理
async function buzzCommand(args) {
    console.log("buzzCommand start : " + args[0]);
    if (args[0] == "tran" || args[0] == "translate") {
        console.log("/buzz tran or translate");
        const sourceLanguageCode = args[1];
        const targetLanguageCode = args[2];
        const text = args.slice(3).join(" ");
        const honyaku = await translateTextBasic(text, targetLanguageCode).catch((code) => { console.error("error:" + code);});
        await createSpeech(text, sourceLanguageCode).catch((code) => { console.error("error:" + code);});
        await createSpeech(honyaku, targetLanguageCode).catch((code) => { console.error("error:" + code);});
    } else if (args[0] == "speak" || args[0] == "tts") {
        console.log("/buzz speak");
        const languageCode = args[1];
        const text = args.slice(2).join(" ");
        await createSpeech(text, languageCode).catch((code) => { console.error("error:" + code);});
    } else if (args[0] == "dice") {
        console.log("/buzz dice");
        const members = args[1].split(',');

        const memberIndex = Math.floor(Math.random() * members.length);

        await createSpeech(members.join(" ") + "で抽選します。考え中……考え中……考え中……。選ばれたのは" + members[memberIndex] + "です。", "ja-jp").catch((code) => { console.error("error:" + code);});
    }
    console.log("buzzCommand end");
}

async function createSpeech(text, languageCode, name = "") {

    if (connection == null) {
        console.log("discord connection is null, skip text-to-speech")
        return;
    }

    const request = {
        input: { text: text },
        voice: { languageCode: languageCode, ssmlGender: 'SSML_VOICE_GENDER_UNSPECIFIED', name: name },
        audioConfig: { audioEncoding: 'MP3' },
    };

    const [response] = await textToSpeechClient.synthesizeSpeech(request).catch((code) => { console.error("error:" + code);});

    if (response == null) {
        return;
    }

    var date = new Date();
    var a = date.getTime();
    fs.writeFileSync(
        `audio/${a}.mp3`,
        response.audioContent
    );

    addAudioToQueue(`audio/${a}.mp3`, voiceChannel, true, response.audioContent);

    if (!isPlaying) {
        await playAudio().catch((code) => { console.error("error:" + code);});
    }
}

async function translateTextBasic(text, target) {
    console.log(`text - target: ${text} - ${target}`);
    let [translations] = await translateBasic.translate(text, target).catch((code) => { console.error("error:" + code);});
    translations = Array.isArray(translations) ? translations : [translations];
    let result = "";
    translations.forEach((translation, i) => {
        result = result + `${translation}`;
    });
    return result;
}

async function translateText(text, sourceLanguageCode, targetLanguageCode) {
    console.log(`gcpProjectId - location: ${gcpProjectId} - ${location}`);
    const request = {
        parent: `projects/${gcpProjectId}/locations/${location}`,
        contents: [text],
        mimeType: 'text/plain', // mime types: text/plain, text/html
        sourceLanguageCode: sourceLanguageCode,
        targetLanguageCode: targetLanguageCode,
    };

    var result = "";

    try {
        const [response] = await translationClient.translateText(request);

        for (const translation of response.translations) {
            console.log(`Translation: ${translation.translatedText}`);
            result = result + translation.translatedText;
        }

        for (const translation of response.translations) {
            console.log(`Translation: ${translation.translatedText}`);
        }
    } catch (error) {
        console.error(error.details);
    }

    return result;
}