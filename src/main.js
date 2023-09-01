const { 
    joinVoiceChannel, entersState, VoiceConnectionStatus, createAudioResource, StreamType, createAudioPlayer, AudioPlayerStatus, NoSubscriberBehavior, generateDependencyReport  
} = require("@discordjs/voice");
console.log(generateDependencyReport());
const LiveChat = require('youtube-chat').LiveChat;
const { app, Menu, BrowserWindow } = require('electron');
const { ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
//const Discord = require('discord.js');
const { Client, GatewayIntentBits } = require('discord.js');

const Store = require('electron-store');
const store = new Store();

// Creates a client
const textToSpeechClient = new textToSpeech.TextToSpeechClient();

let mainWindow;

const discordClient = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages]
});

const discordClientJingle = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages]
});

let voiceChannel = null;

let connection = null;
let player = null;

let connectionJingle = null;
let playerJingle = null;

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
        if (connectionJingle != null) {
            connectionJingle.disconnect();
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

function addAudioToQueue(path, voiceChannel, deleteFlg = true, file = null) {
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
        // if (queue[0].file != null) {
        //     const dispatcher = connection.play(queue[0].file, {
        //         volume: 0.5,
        //     });
        // }

        console.log('playAudio play : ' + buzzPlayQueue[0].path);
        
        const resource = createAudioResource(buzzPlayQueue[0].path,
        {
          inputType: StreamType.Arbitrary,
          inlineVolume: true,
        });
        resource.volume.setVolume(0.5);
        player.play(resource);


        // const dispatcher = connection.play(queue[0].path, {
        //     volume: 0.5,
        // });
        // dispatcher.on('finish', () => {
        //     console.log('playAudio finish');
        //     // 再生し終わった音声ファイルを削除する
        //     if (queue[0].deleteFlg) {
        //         fs.unlinkSync(queue[0].path, function (err) {
        //             if (err) {
        //                 throw (err);
        //             }
        //         });
        //         console.log(`playAudio mp3 deleted`);
        //     }
        //     queue.shift()
        //     isPlaying = false;
        //     playAudio()
        // });
    }
}

// UI側からの各パラメーター受信
ipcMain.on('asynchronous-discordserverstart', (event, discordbottoken, discordbottokenjingl, texttospeechapikey, gcpprojectid) => {

    process.env.GOOGLE_APPLICATION_CREDENTIALS = texttospeechapikey;

    store.set("discord_bot_token", discordbottoken);
    store.set("discord_bot_token_jingle", discordbottokenjingl);
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
                            console.log("/buzz join");
                            // connection = await message.member.voice.channel.join();
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
                              
                            player.on(AudioPlayerStatus.Idle, () => {
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
                                playAudio()
                            });
                            
                            connection.subscribe(player);
                            createSpeech("BUZZ has started", "en");
                        } else if (args[0] === "shutdown" || args[0] === "exit") {
                            console.log("/buzz shutdown or exit");
                            connection.disconnect();
                            connection = null;
                        } else if (args[0] === "tran" || args[0] === "translate") {
                            console.log("/buzz tran or translate");
                            const sourceLanguageCode = args[1];
                            const targetLanguageCode = args[2];
                            const text = args[3];
                            const honyaku = translateTextBasic(text, targetLanguageCode);
                            honyaku.then(function (result1) {
                                createSpeech(text, sourceLanguageCode);
                                createSpeech(result1, targetLanguageCode);
                                message.reply(result1);
                            })
                            // translateText(text, sourceLanguageCode, targetLanguageCode);
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

    discordClientJingle.on("ready", () => {
        discordClientJingle.user.setPresence({ game: { name: 'A well well darling' } });
        console.log("jingle ready...");
    });

    // discordのメッセージ受信イベント
    discordClientJingle.on("messageCreate", async message => {

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
                            connectionJingle = joinVoiceChannel(
                                {
                                    channelId: message.member.voice.channel.id,
                                    guildId: message.guild.id,
                                    adapterCreator: message.guild.voiceAdapterCreator
                                });
                                
                            playerJingle = createAudioPlayer({
                                behaviors: {
                                  noSubscriber: NoSubscriberBehavior.Pause,
                                },
                              });
                            connectionJingle.subscribe(playerJingle);
                            
                            const resourceJingle = createAudioResource(`audio/kansei_hakushu.mp3`,
                                {
                                    inputType: StreamType.Arbitrary,
                                    inlineVolume: true,
                                }
                            );
                            resourceJingle.volume.setVolume(0.5);
                            playerJingle.play(resourceJingle);
                            // connectionJingle.play(`audio/kansei_hakushu.mp3`, {
                            //     volume: 0.5,
                            // });
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

    // client1つしかメッセージが受信できず、かつあと勝ちになるため、Jingleは廃止
    //discordClientJingle.login(discordbottokenjingl);
});

// バズコマンド処理
function buzzCommand(args) {
    console.log("buzzCommand start : " + args[0]);
    if (args[0] == "tran" || args[0] == "translate") {
        console.log("/buzz tran or translate");
        const sourceLanguageCode = args[1];
        const targetLanguageCode = args[2];
        const text = args.slice(3).join(" ");
        const honyaku = translateTextBasic(text, targetLanguageCode);
        honyaku.then(function (result1) {
            createSpeech(text, sourceLanguageCode);
            createSpeech(result1, targetLanguageCode);
            //message.reply(result1);
        })
    } else if (args[0] == "speak" || args[0] == "tts") {
        console.log("/buzz speak");
        const languageCode = args[1];
        const text = args.slice(2).join(" ");
        createSpeech(text, languageCode);
    } else if (args[0] == "dice") {
        console.log("/buzz dice");
        const members = args[1].split(',');

        const memberIndex = Math.floor(Math.random() * members.length);

        createSpeech(members.join(" ") + "で抽選します。考え中……考え中……考え中……。選ばれたのは" + members[memberIndex] + "です。", "ja");
    } else if (args[0] == "jingle") {
        console.log("/buzz jingle");
        const mp3FileName = args[1];
        console.log('jingle play : ' + mp3FileName);
        
        const resourceJingle = createAudioResource(`audio/${mp3FileName}`,
            {
                inputType: StreamType.Arbitrary,
                inlineVolume: true,
            }
        );
        playerJingle.play(resourceJingle);
    } else if (args[0] == "ng") {
        createSpeech("nice Gandhi", "en");
    } else if (args[0] == "tm") {
        createSpeech("tamani mendy", "en");
    } else if (args[0] == "km") {
        createSpeech("kanojo wa itsumo milk tea", "en");
    } else if (args[0] == "ngtm") {
        createSpeech("nice Gandhi, tamani mendy", "en");
    } else if (args[0] == "ngtmkm") {
        createSpeech("nice Gandhi, tamani mendy, kanojo wa itsumo milk tea", "en");
    } else if (args[0] == "ops") {
        createSpeech("oppai no perapera source", "en");
    } else if (args[0] == "kl") {
        createSpeech("kill leader", "en");
    } else if (args[0] == "tsuyoi") {
        createSpeech("tsuyoi", "en");
    } else if (args[0] == "welcome") {
        createSpeech("welcome", "en");
    } else if (args[0] == "youkoso") {
        createSpeech("yoh-koso", "en");
    } else if (args[0] == "thankyou") {
        createSpeech("thank you", "en");
    } else if (args[0] == "arigato") {
        createSpeech("ari-ga-toh", "en");
    } else if (args[0] == "iscrazy") {
        createSpeech("is crazy", "en");
    } else if (args[0] == "ispretty") {
        createSpeech("is pretty", "en");
    } else if (args[0] == "isbeautiful") {
        createSpeech("is beautiful", "en");
    } else if (args[0] == "isfabulous") {
        createSpeech("is fabulous", "en");
    } else if (args[0] == "ismarvelous") {
        createSpeech("is marvelous", "en");
    }
    //
    else if (args[0] == "anesan") {
        createSpeech("a-Ne saan", "en");
    } else if (args[0] == "tsukimisan") {
        createSpeech("tsukimi saan", "en");
    } else if (args[0] == "shocho") {
        createSpeech("shochoh", "en");
    } else if (args[0] == "uyatsan") {
        createSpeech("u-yat saan", "en");
    } else if (args[0] == "mikamilion") {
        createSpeech("mikami lion", "en");
    } else if (args[0] == "oyakata") {
        createSpeech("oyakata", "en");
    } else if (args[0] == "taisho") {
        createSpeech("udon taisho", "en");
    } else if (args[0] == "bittonsan") {
        createSpeech("bit-ton saan", "en");
    } else if (args[0] == "komachan") {
        createSpeech("koma chan", "en");
    } else if (args[0] == "kaba") {
        createSpeech("kaba-da-chon saan", "en");
    } else if (args[0] == "fumeichan") {
        createSpeech("fumei chan", "en");
    } else if (args[0] == "mokasan") {
        createSpeech("moka saan", "en");
    }
    //
    else if (args[0] == "kuroaya") {
        createSpeech("kuro-aya", "en");
    }
    else if (args[0] == "mochiduki") {
        createSpeech("mochizuki saan", "en");
    }
    else if (args[0] == "yoyo") {
        createSpeech("yoh yoh saan", "en");
    }
    console.log("buzzCommand end");
}

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
        var messageText = '';
        comment.message.forEach(element => messageText += element.text);
        // 画面側にチャット内容を送信
        event.reply('asynchronous-liveId-reply', comment.author.name + 'さん, ' + messageText);

        const input = messageText.replace(prefix, "").split(" ")
        const command = input[0]
        const args = input.slice(1);

        if (command === "buzz") {
            buzzCommand(args);
        } else {
            // 英語の場合
            if (messageText.match(/^[\x20-\x7e]*$/)) {
                const honyaku = translateTextBasic(messageText, "ja");
                honyaku.then(function (result1) {
                    createSpeech(comment.author.name + 'さん, ' + result1, "ja");
                    createSpeech(messageText, "en");
                    // createSpeech(result1, "ja");
                })
            // 中国語の場合
            } else if (messageText.match(/^[一-龥]*$/)) {
                const honyaku = translateTextBasic(messageText, "ja");
                honyaku.then(function (result1) {
                    createSpeech(comment.author.name + 'さん, ' + result1, "ja");
                    createSpeech(messageText, "zh_CN");
                    // createSpeech(, "ja");
                })
            } else {
                let wavenetName = "ja-JP-Wavenet-A";
                if (comment.author.name == "お母さん") {
                    wavenetName = "ja-JP-Wavenet-C";
                    createSpeech('おかあさん, ' + messageText, "ja", wavenetName);
                    return;
                }
                createSpeech(comment.author.name + 'さん, ' + messageText, "ja", wavenetName);
            }
        }
    });

    // live chat エラーイベント
    liveChat.on('error', (err) => {
        console.log('error');
    });

    // youtube liveに接続する
    liveChat.start();

    console.log('asynchronous-liveId_end');
})

ipcMain.on('asynchronous-buzz-command', (event, commandText) => {
    const args = commandText.replace(prefix, "").split(" ")
    buzzCommand(args);
});

ipcMain.on('asynchronous-jingle', (event, mp3FileName) => {
    console.log('jingle play : ' + mp3FileName);
    
    const resourceJingle = createAudioResource(`audio/${mp3FileName}`,
        {
            inputType: StreamType.Arbitrary,
            inlineVolume: true,
        }
    );
    resourceJingle.volume.setVolume(0.5);
    playerJingle.play(resourceJingle);
});

async function createSpeech2(text, languageCode, name) {
    
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
        voice: { languageCode: languageCode,name: name, ssmlGender: 'NEUTRAL' },
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

    addAudioToQueue(`audio/${a}.mp3`, voiceChannel, true, response.audioContent);

    if (!isPlaying) {
        await playAudio()
    }
}
async function createSpeech(text, languageCode, name = "") {

    if (connection != null) {
        console.log("createSpeech discord connected")
    } else {
        console.log("createSpeech discord disconnected, skip text-to-speech")
        return;
    }

    if (languageCode == "ja-JP") {

    }

    // Construct the request
    const request = {
        input: { text: text },
        // Select the language and SSML voice gender (optional)
        voice: { languageCode: languageCode, ssmlGender: 'WaveNet', name: name },
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

    addAudioToQueue(`audio/${a}.mp3`, voiceChannel, true, response.audioContent);

    if (!isPlaying) {
        await playAudio()
    }
}



// Imports the Google Cloud client library
const { Translate } = require('@google-cloud/translate').v2;

// Creates a client
const translateBasic = new Translate();

// async function translateTextBasic(text, target) {
async function translateTextBasic(text, target) {
    // Translates the text into the target language. "text" can be a string for
    // translating a single piece of text, or an array of strings for translating
    // multiple texts.
    //let [translations] = await translateBasic.translate(text, target);
    console.log(`text - target: ${text} - ${target}`);
    let [translations] = await translateBasic.translate(text, target);
    translations = Array.isArray(translations) ? translations : [translations];
    let result = "";
    translations.forEach((translation, i) => {
        result = result + `${translation}`;
        //console.log(`${text[i]} => (${target}) ${translation}`);
    });
    console.log(result);
    return result;
}

const { TranslationServiceClient } = require('@google-cloud/translate');
const location = 'global';
//const location = 'us-central1';

// 未使用
// Instantiates a client
const translationClient = new TranslationServiceClient();
async function translateText(text, sourceLanguageCode, targetLanguageCode) {
    // Construct request
    console.log(`gcpProjectId - location: ${gcpProjectId} - ${location}`);
    const request = {
        parent: `projects/${gcpProjectId}/locations/${location}`,
        contents: [text],
        mimeType: 'text/plain', // mime types: text/plain, text/html
        sourceLanguageCode: sourceLanguageCode,
        targetLanguageCode: targetLanguageCode,
        //model: `projects/${gcpProjectId}/locations/${location}/models/general/base`
    };

    var result = "";

    try {
        // Run request
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

// UI側からの各パラメーター受信
ipcMain.on('asynchronous-init-param', (event, discordbottoken) => {

    // 画面側にチャット内容を送信
    event.reply('asynchronous-init-param-reply',
        store.get("discord_bot_token"),
        store.get("text_to_speech_api_key_path"),
        store.get("discord_bot_token_jingle"),
        store.get("gcp_project_id"));
});