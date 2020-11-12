---
title: "Rust で WebAssembly を書いて Deno で実行する"
emoji: "🦖"
type: "tech"
topics: ["rust", "webassembly", "deno", "wasmpack"]
published: true
---

# TL;DR

```shell
cargo generate --git https://github.com/rustwasm/wasm-pack-template -n myproject
cd myproject
# deno は alert がないので代わりに console.log する
sed -i -e "s/fn alert(s: &str);/#[wasm_bindgen(js_namespace = console, js_name = log)] fn alert(s: \\&str);/" src/lib.rs

wasm-pack build --target web --out-name index
# deno は fetch('file:// ...') をサポートしていない
sed -i -e "s#input = import\\.meta\\.url\\.replace(/\\\\\\.js$/, '_bg\\.wasm');#input = import.meta.url.replace(/\\\\.js$/, '_bg.wasm'); if ('undefined' !== typeof Deno) input = new WebAssembly.Module(await Deno.readFile(new URL(input).pathname));#" pkg/index.js

echo "import * as pkg from './pkg/index.js'
await pkg.default()
pkg.greet()" >| app.ts
deno run --allow-read app.ts
```

`Hello, myproject!` と表示されたら成功です。

# プロジェクトの作成

```shell
cargo generate --git https://github.com/rustwasm/wasm-pack-template -n myproject
cd myproject
```

### `command not found: cargo`

cargo は Rust 用の便利なコマンドです。
[rustup をインストール](https://rustup.rs)するとついてきます。

### `error: no such subcommand: generate`

cargo-generate はテンプレートをもとにプロジェクトを初期化（ファイルを作成）してくれます。
今回の場合は [https://github.com/rustwasm/wasm-pack-template](https://github.com/rustwasm/wasm-pack-template) から src と Cargo.toml をコピペするだけでも代用できます。

[インストールするならこちらを参考に](https://github.com/ashleygwilliams/cargo-generate#installation)。

# Rust を書く

```shell
sed -i -e "s/fn alert(s: &str);/#[wasm_bindgen(js_namespace = console, js_name = log)] fn alert(s: \\&str);/" src/lib.rs
```

:::message
Deno v1.5.0 で alert が追加されたので、このセクションは飛ばしても大丈夫です
https://github.com/denoland/deno/blob/master/Releases.md#150--20201027
:::

初期化時点で js の alert を呼び出す処理が書かれていますが
deno に alert はないので代わりに console.log を呼ぶように編集しています。

```diff
  #[wasm_bindgen]
  extern "C" {
-   fn alert(s: &str);
+   #[wasm_bindgen(js_namespace = console, js_name = log)] fn alert(s: &str);
  }
```

# WebAssembly を作成

```shell
wasm-pack build --target web --out-name index
sed -i -e "s#input = import\\.meta\\.url\\.replace(/\\\\\\.js$/, '_bg\\.wasm');#input = import.meta.url.replace(/\\\\.js$/, '_bg.wasm'); if ('undefined' !== typeof Deno) input = new WebAssembly.Module(await Deno.readFile(new URL(input).pathname));#" pkg/index.js
```

deno はブラウザとの互換性を重視しています。
将来的には `wasm-pack build --target web` だけで問題なく動くようになるのではないかと思います。

現状でも `wasm-pack` で作成したライブラリを web サーバーにおけば動くと思うのですが
ローカルで作成・実行までやろうとすると
ローカルのファイルを fetch で取ろうとして（ `fetch('file:///user/rithmety/myproject/pkg/index_bg.wasm')` ）エラーが発生します。
[deno が file:// を fetch できるようにする計画はあるようです。](https://github.com/denoland/deno/issues/2150)

今回はランタイムを直に編集して対応しています。
（ Windows だと `new URL(input).pathname` の部分が期待通りに動かないかもしれません。 ）

```diff
  async function init(input) {
    if (typeof input === 'undefined') {
-     input = import.meta.url.replace(/\.js$/, '_bg.wasm');
+     input = import.meta.url.replace(/\.js$/, '_bg.wasm'); if ('undefined' !== typeof Deno) input = new WebAssembly.Module(await Deno.readFile(new URL(input).pathname));
    }
```

### `command not found: wasm-pack`

[wasm-pack をインストール](https://rustwasm.github.io/wasm-pack/installer/)してください。

# deno で実行してみる

```shell
echo "import * as pkg from './pkg/index.js'
await pkg.default()
pkg.greet()" >| app.ts
deno run --allow-read app.ts
```

deno はトップレベルの await に対応しているのでシンプルに書けます。

```ts
import * as pkg from './pkg/index.js'
await pkg.default()
pkg.greet()
```

`Hello, myproject!` と表示されたら成功です。

### `command not found: deno`

[deno をインストール](https://deno.land/#installation)してください。

# 参考

[wasm-pack の公式マニュアル](https://rustwasm.github.io/docs/wasm-pack/introduction.html) を参考にしました。
