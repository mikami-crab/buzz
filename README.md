# buzz -弱小youtuber向けアプリ-

## こまんど　はう・とぅ・ゆーず  

### 接続
`/buzz join`

### 接続解除
`/buzz shutdown`

### 翻訳  
翻訳前と翻訳後の言葉をDISCORD上で喋らせることができます

`/buzz tran [ソース言語コード] [ターゲット言語コード] [テキスト]`  

※言語コードはISO-639-1。詳細は以下のURLを参照してください。  
https://cloud.google.com/translate/docs/languages?hl=ja

例:日本語から台湾語に翻訳したい場合  
`/buzz tran ja zh-TW こんにちは`
コマンド実行後、翻訳した言葉がリプライされます。

## 開発環境とか

エレクトロンで作ってるからね。  

* Cloud Text-to-Speech API を有効にする(クレカ必須だけど月100万文字まで無料 ※2021/3/1現在)  
* サービス アカウントを作成し、認証用JSONをダウンロードする  
* `$env:GOOGLE_APPLICATION_CREDENTIALS="(上記jsonのファイルパス)"`(Windows以外は知らん) を実行してから `npx electron src`  
* 起動後、「discord bot token」にbotのトークンを、「youtube live id」にライブチャットURL `https://www.youtube.com/watch?v=xxxx` のxxxx部分をいれる(渋谷のライブカメラ `lkIJYc4UH60` が適度にライブチャットされてておススメ)  
* 自身がボイチャに接続後、どこのチャンネルでもいいので `/buzz join` コマンドを実行するとbuzzが召喚される  
* ~~うごかない。~~ 動いた。 ~~join後、ずっとランプが点灯してる。~~ 1回喋るとランプが消える。ログイン後一度何か喋らせた方がいいかもね。
