# BUZZ!!

弱小 youtuber 向けアプリ

## アプリ起動

`npx electron src`

## DOSCORD こまんど　はう・とぅ・ゆーず

### 接続

`/buzz join`

### 接続解除

`/buzz shutdown`

### 翻訳

翻訳前と翻訳後のテキストを読み上げます。
コマンド実行後、翻訳されたテキストがリプライされます。

`/buzz tran [ソース言語コード] [ターゲット言語コード] [テキスト]`

※言語コードは ISO-639-1。以下リンクに言語コード一覧ありマス。  
https://cloud.google.com/translate/docs/languages?hl=ja

例:日本語を台湾語に翻訳したい場合  
`/buzz tran ja zh-TW こんにちは`

### 話す

指定した言語のテキスト読み上げます。

`/buzz speak [言語コード] [テキスト]`

※言語コードは ISO-639-1。以下リンクに言語コード(ry  
https://cloud.google.com/translate/docs/languages?hl=ja

例:英語で読み上げる場合  
`/buzz tran en oppai no perapera source`

### ジングル

ジングルを鳴らします

`/buzz jingle [mp3ファイル名]`

※ファイル名は以下を参照してください。  
https://github.com/shun178/buzz/tree/main/audio

例:笑い声を再生する  
`/buzz jingle warai.mp3`
