---
title: "TypeScript で web サーバを書く"
emoji: "🎼"
type: "tech"
topics: ["typescript", "nodejs", "lambda"]
published: true
---

Node.js の入ったサーバ または AWS Lambda + API Gateway へのデプロイを目的とした
web サーバを TypeScript で書いていくための個人的なベストプラクティスをまとめました

# デプロイする web サーバの例

```ts:src/app.ts
import fastify from 'fastify'
export const app = fastify()
app.get('/ping', async (request, reply) => {
  return { pong: 1 }
})
```

# AWS Lambda + API Gateway への対応

Node.js の入ったサーバへのデプロイであれば下記のみで十分ですが…

```ts:src/server.ts
import { app } from '~/app'
app.listen(8080, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})
```

AWS Lambda + API Gateway へのデプロイする場合、下記も用意します

```ts:src/lambda.ts
import awsLambdaFastify from 'aws-lambda-fastify'
import { app } from '~/app'
const proxy = awsLambdaFastify(app, { binaryMimeTypes: ['application/octet-stream'] })
exports.handler = proxy
```

ローカルで探索的テストしたりするときに便利なので Lambda に上げるとしても上記 `server.ts` を用意しておくと便利です

# ts-node-dev

実際に動かしながら試す場合 ts-node-dev を使うことで
変更されたファイルのみを再トランスパイルして node を再実行してくれます

```json:package.json
"scripts": {
  "dev": "ts-node-dev --files -r tsconfig-paths/register -r dotenv/config -O '{\"module\":\"commonjs\"}' src/server.ts"
}
```

### `-r tsconfig-paths/register`

`tsconfig` の `paths` の設定を読むようにします
これによって `import { app } from '~/app'` のようなコードが（開発時に）動くようにします

### `-r dotenv/config`

ローカルでの環境変数を `.env` から読めるようにします

### `-O '{\"module\":\"commonjs\"}'`

詳細は後述しますがバンドラが Tree Shaking できるように
tsconfig は `module: "esnext"` としていることが多いです
Node.js はそのままでは esmodule を解釈できないのでここで対応してます

# ts-jest

jest が TypeScript を読めるようにします

```json:package.json
"jest": {
  "transform": {
    "^.+\\.(js|jsx|ts|tsx)$": "ts-jest"
  }
}
```

# parcel or webpack or ncc

ファイル容量を減らす効果もあるのですが
`import { app } from '~/app'` のように書けるようにするために使ってることが多いです

ncc は使ったことがないのですが設定不要で
tsconfig の paths を見てくれるらしいので、これが一番楽かもしれません

私は parcel を使うことが多いです
ライブラリがうまくバンドルできないことがあり
（DB を触るライブラリとか wasm を含むライブラリとか）
`node_modules` 以外を `dist/lambda.js` にまとめたのち
`yarn install --production --modules-folder dist/node_modules` でライブラリをインストールして
本番環境に投げるような実装がやりやすいです

```json:package.json
"scripts": {
  "prebuild": "rimraf dist",
  "build": "parcel build --target node src/lambda.ts --no-cache",
  "postbulid": "yarn install --production --modules-folder dist/node_modules"
}
```

（そろそろ parcel v2 が来そうなのですが上記は parcel v1 でのやり方です）

# あとがき

正直 web サーバを書くなら NestJS や Blitz.js のような
フレームワークを使った方が良いのではと思っています
