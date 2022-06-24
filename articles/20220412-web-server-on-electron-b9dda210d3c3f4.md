---
title: Electron 上で Next.js などの Web フレームワークを使いたい
emoji: 💨
type: tech
topics: [electron, typescript, nextjs, fastify, javascript]
published: true
---

Electron でのアプリの開発は安全のためメインプロセスとレンダラープロセスの間では IPC 通信を使うなどなど面倒。
もっと楽にやりとりしたい…と考えたときに各種 Web フレームワークの技術を再利用できると便利そうに見えた。

この記事ではメインプロセスに http サーバを用意してレンダラープロセスから
`next://next.app` のような指定のプロトコルでアクセス時に内部の http サーバにつなげていく。

というわけで書いてみたコードが下記になります。
プロジェクト全体は[こちら](https://gitlab.com/yt-practice/electron-next-20220301/-/tree/main/)。

```typescript
import { app, BrowserWindow, protocol } from 'electron'
import fastify from 'fastify'
import next from 'next'

const isDev = process.env.NODE_ENV !== 'production'
const nextApp = next({
  dev: isDev,
  minimalMode: true,
  customServer: true,
  hostname: 'next.app',
})
const handle = nextApp.getRequestHandler()

type ValidMethod =
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'OPTIONS'
  | 'PATCH'
  | 'POST'
  | 'PUT'
const isValid = (m: string): m is ValidMethod =>
  'DELETE' === m ||
  'GET' === m ||
  'HEAD' === m ||
  'OPTIONS' === m ||
  'PATCH' === m ||
  'POST' === m ||
  'PUT' === m

app.on('ready', () => {
  const fApp = fastify({ logger: { level: 'error' }, pluginTimeout: 0 })
  fApp.addHook('onRequest', (req, res, done) => {
    // @ts-expect-error: ignore
    req.raw.originalRequest ||= req.raw
    done()
  })
  if (isDev) {
    fApp.get('/_next/*', async (req, reply) => {
      await handle(req.raw, reply.raw).then(() => {
        reply.sent = true
      })
    })
  }
  fApp.all('/*', async (req, reply) => {
    await handle(req.raw, reply.raw)
      .then(() => {
        console.log('found')
        reply.sent = true
      })
      .catch(x => {
        console.log('not found')
        console.error(x)
        throw x
      })
  })
  fApp.setNotFoundHandler(async (req, reply) => {
    await nextApp.render404(req.raw, reply.raw).then(() => {
      reply.sent = true
    })
  })
  protocol.registerBufferProtocol('next', (req, done) => {
    if (!isValid(req.method)) throw new Error('unknown method.')
    const buf =
      req.uploadData && Buffer.concat(req.uploadData.map(d => d.bytes))
    const url = new URL(req.url)
    fApp.inject(
      {
        method: req.method,
        url: url.pathname,
        query: Object.fromEntries(url.searchParams.entries()),
        payload: buf,
        headers: req.headers,
      },
      (err, res) => {
        if (err) {
          console.error(err)
          done({ error: 500, data: '' })
          return
        }
        done({
          statusCode: res.statusCode,
          // @ts-expect-error: ignore
          headers: res.headers,
          data: res.rawPayload,
        })
      },
    )
  })
  nextApp
    .prepare()
    .then(async () => {
      const mainWindow = new BrowserWindow({
        title: 'test',
        width: 800,
        height: 600,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      })
      await mainWindow.loadURL('next://next.app/')
    })
    .catch(x => {
      console.error(x)
    })
})

// Quit the app once all windows are closed
app.on('window-all-closed', () => {
  app.quit()
})
```

上記の例では Next.js を使っているが Fastify に繋げられるならなんでも OK 。

Electron の `protocol.registerBufferProtocol` を使ってレンダラープロセスからの `next://` へのアクセスに対し
Fastify の `inject` メソッドを使ってレスポンスを生成している。
( `inject` メソッドは AWS Lambda などのサーバーレスな環境のために用意されているようだ。 )

これだけでプロダクション環境で動かせるようになったので開発環境を良い感じに整えようと思っていたら
やる気のでないまま 3 ヶ月経っていたので一旦ここまでで投げます。
