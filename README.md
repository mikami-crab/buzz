# buzz

エレクトロンで作ってるからね。  

* Cloud Text-to-Speech API を有効にする(クレカ必須だけど月100万文字まで無料 ※2021/3/1現在)  
* サービス アカウントを作成し、認証用JSONをダウンロードする  
* `$env:GOOGLE_APPLICATION_CREDENTIALS="(上記jsonのファイルパス)"`(Windows以外は知らん) を実行してから `npx electron src`  
* 起動後、「discord bot token」にbotのトークンを、「youtube live id」にライブチャットURL `https://www.youtube.com/watch?v=xxxx` のxxxx部分をいれる(渋谷のライブカメラ `lkIJYc4UH60` が適度にライブチャットされてておススメ)  
* 自身がボイチャに接続後、どこのチャンネルでもいいので `/buzz join` コマンドを実行するとbuzzが召喚される  
* ~~うごかない。~~ 動いた。 ~~join後、ずっとランプが点灯してる。~~ 1回喋るとランプが消える。ログイン後一度何か喋らせた方がいいかもね。
