---
title: "TensorFlow.js の optimizer.minimize が最適化する変数はどれか"
emoji: "🔎"
type: "tech"
topics: ["javascript", "tensorflow", "tensorflowjs"]
published: true
---

[tfjs-examples](https://github.com/tensorflow/tfjs-examples) 内の [polynomial-regression-core/index.js](https://github.com/tensorflow/tfjs-examples/blob/master/polynomial-regression-core/index.js) を読んでいて
`optimizer.minimize` が __弄る対象とする変数__ がどうやって決まるのか分からなかった。

## 結論

`optimizer.minimize` 内で __使用している変数を調べる関数__ を呼んでる。
上記 `index.js` の 103 ~ 107 行目を下記のように変更しても動きは同じ。

```js
optimizer.minimize(() => {
  // Feed the examples into the model
  const pred = predict(xs);
  return loss(pred, ys);
}, false, [a, b, c, d]); // 3 つ目の引数が varList
```

## 読んだコード

`Optimizer` の定義。

[optimizers/optimizer.ts](https://github.com/tensorflow/tfjs-core/blob/master/src/optimizers/optimizer.ts)

## 試したこと

### 44 行目に下記のコードを追加した。

```js
const e = tf.variable(tf.scalar(Math.random()));
```

実行したが `train` 前後で `e` は変化しなかった。

### `optimizer.minimize` の 3 つ目の引数に `[a, b, c]` を指定した。

107 行目を下記に変更。

```js
}, false, [a, b, c]);
```

`train` 前後で `d` が変化しなくなった。
