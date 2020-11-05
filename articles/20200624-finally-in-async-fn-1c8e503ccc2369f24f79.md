---
title: "finally で async ジェネレータの反復完了時、中断時、エラー発生時の全てで処理を行う"
emoji: "🪂"
type: "tech"
topics: ["javascript", "typescript", "generator", "asyncawait"]
published: true
---

DB やファイルなどからデータをたくさん取り出して
それぞれのデータに対して何かしたい場合は多くあると思います

```ts
async function* readLines() {
  console.log('ファイル開く処理')
  for (let i = 1; i <= 5; ++i)
    yield { textContent: `${i} 番目の行` }
  console.log('ファイル閉じる処理')
}
for await (const line of readLines()) {
  console.log(line.textContent)
}
// ファイル開く処理
// 1 番目の行
// 2 番目の行
// 3 番目の行
// 4 番目の行
// 5 番目の行
// ファイル閉じる処理
```

## 解決すべき課題

上記の `readLines` には問題があります

```ts
async function* readLines() {
  console.log('ファイル開く処理')
  for (let i = 1; i <= 5; ++i)
    yield { textContent: `${i} 番目の行` }
  console.log('ファイル閉じる処理')
}
let tmp = 0
for await (const line of readLines()) {
  console.log(line.textContent)
  if (++tmp >= 3) break
}
// ファイル開く処理
// 1 番目の行
// 2 番目の行
// 3 番目の行
```

途中で `break` すると *ファイル閉じる処理* が実行されません

あるいは途中でエラーが起こると…

```ts
async function* readLines() {
  console.log('ファイル開く処理')
  for (let i = 1; i <= 5; ++i) {
    if (3 === i) throw new Error('何かエラー')
    yield { textContent: `${i} 番目の行` }
  }
  console.log('ファイル閉じる処理')
}
for await (const line of readLines()) {
  console.log(line.textContent)
}
// ファイル開く処理
// 1 番目の行
// 2 番目の行
// Error: 何かエラー
```

こちらでも *ファイル閉じる処理* が実行されません

## finally を使う

反復完了時、または中断時、そしてエラー発生時の全てで処理を行うには `finally` が使えます

```ts
async function* readLines() {
  console.log('ファイル開く処理')
  try {
    for (let i = 1; i <= 5; ++i)
      yield { textContent: `${i} 番目の行` }
  } finally {
    console.log('ファイル閉じる処理')
  }
}
let tmp = 0
for await (const line of readLines()) {
  console.log(line.textContent)
  if (++tmp >= 3) break
}
// ファイル開く処理
// 1 番目の行
// 2 番目の行
// 3 番目の行
// ファイル閉じる処理
```

```ts
async function* readLines() {
  console.log('ファイル開く処理')
  try {
    for (let i = 1; i <= 5; ++i) {
      if (3 === i) throw new Error('何かエラー')
      yield { textContent: `${i} 番目の行` }
    }
  } finally {
    console.log('ファイル閉じる処理')
  }
}
for await (const line of readLines()) {
  console.log(line.textContent)
}
// ファイル開く処理
// 1 番目の行
// 2 番目の行
// ファイル閉じる処理
// Error: 何かエラー
```
