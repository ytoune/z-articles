---
title: グローバル変数が定義されているかどうかを「短い文字数」で確かめる
emoji: 🔍
type: tech
topics: [javascript, nodejs]
published: true
---

グローバル変数が定義されているかどうかを確かめるコードとして下記が有名です。

```js
// window が定義されているかどうか
'undefined' !== typeof window
```

これを短く書く方法として下記があります。

```js
// window が定義されているかどうか
'u' > typeof window
```

ブラウザ上では `self.window` の方が短いですが  
上記はブラウザ上かどうかを判断する場合などで使えます。

# 説明

`typeof` で得られる文字列のうち辞書順で最も後ろにくるのが `undefined` であることを利用しています。  
なので `'t' > typeof window` でも同じ結果が得られます。

```js
;[
  'undefined',
  'object',
  'boolean',
  'number',
  'bigint',
  'string',
  'symbol',
  'function',
]
  .sort()
  .map(s => ['u' > s, 'u' < s, s])
```

| `'u' > s` | `'u' < s` | `s`           |
| :-------- | :-------- | :------------ |
| `true`    | `false`   | `"bigint"`    |
| `true`    | `false`   | `"boolean"`   |
| `true`    | `false`   | `"function"`  |
| `true`    | `false`   | `"number"`    |
| `true`    | `false`   | `"object"`    |
| `true`    | `false`   | `"string"`    |
| `true`    | `false`   | `"symbol"`    |
| `false`   | `true`    | `"undefined"` |

正直読みやすいとは言い難いのですが  
どうしても他にファイルサイズを削れる場所がない場合に使えるかもしれません…

# 追記 Tuple と Record について

現在 (2024/01/06) Records & Tuples Proposal が Stage 2 になっています。  
追加されると[`typeof` が `'record'` や `'tuple'` を返す場合が増えます](https://github.com/tc39/proposal-record-tuple?tab=readme-ov-file#typeof)。  
その場合は上記の `'t' > typeof window` が使えなくなるので注意が必要です。
