# YouTube Thumbnail Extractor

YouTubeの動画URLからサムネイルを取得し、1920×1080のJPEGで保存するWebツールです。サーバーは不要で、処理はすべてブラウザ内で行います。複数URLの一括取得、プレビュー、ZIP保存、ブラウザ内の履歴に対応しています。

GitHub Pagesで公開すると、ページを開くだけで使えます。

## 使い方

1. YouTubeの動画URLを入力します。複数の場合は改行で区切ります。
2. 「サムネイルを取得」を押します。同じ動画は重複を除いて取得します。
3. 「確認して保存」でプレビューを開き、JPEGを保存します。元画像に切り替えて保存することもできます。
4. 一括保存では「ZIPで保存」を押し、対象画像を確認してダウンロードします。
5. 過去の画像は「履歴」から再保存・削除できます。

watch URL、youtu.be、Shorts、embed、LiveのURLに対応しています。URLは1回につき50件まで、同時取得数は1〜5件です。

## 出力

1920×1080、16:9、sRGB、品質95のJPEGです。元画像が16:9以外の場合は中央を基準にクロップします。元画像を拡大しても画質は上がりません。履歴は利用中のブラウザのIndexedDBに保存され（最大100件）、端末間では共有されません。

## 開発

Node.js 22以上が必要です。

```sh
npm ci
npm run dev      # http://127.0.0.1:3011
npm test
npm run build    # out/ に静的ファイルを書き出し
```

画像はブラウザから `i.ytimg.com`、タイトルは YouTube の oEmbed から直接取得します（どちらもCORS許可済み）。公開は `npm run build` の `out/` を `gh-pages` ブランチへ置いて行います（`NEXT_PUBLIC_BASE_PATH=/youtube-thumbnail-extractor` を付けてビルド）。

## 利用上の注意

利用する権利のある画像を対象に、[YouTubeの利用規約](https://www.youtube.com/t/terms)に従って利用してください。動画の公開状態や地域制限によっては取得できない場合があります。
