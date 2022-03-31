---
title: SvelteKit で MPA やってみる
emoji: 🐋
type: tech
topics: [svelte, sveltekit, mpa, javascript]
published: true
---

# はじめに

下記の記事を前提にしてるので先に読んだ方が分かりやすいかも。

https://zenn.dev/sesere/articles/c3917db32777af

記事の内容をざっくりまとめると SPA は下記のつらみがあるので避けたいねという感じ。

- スクロールや「戻る」がおかしくなったりしがち
- json のやり取り時に個人情報などが混ざりがち
- バグの原因が難しくなりがち
- ドキュメント少ない

読んでいて違和感を感じたのが Rails や Laravel と Next.js や Nuxt の比較をしているように読めてしまった点。
Rails/Laravel = MPA ではないし Next.js/Nuxt = SPA ではない…。

たとえば [Laravel Livewire](https://laravel-livewire.com/) による SPA や
[SvelteKit の Page options による No JavaScript なページ](https://kit.svelte.dev/docs/page-options#hydrate)による MPA など。

( Blitz.js や Remix は Next.js と同様に最初のみ SSR で以降は SPA のように振る舞うので今回は関係ない )

なので軽く SvelteKit で MPA やってみて上記のつらみが減るか確かめてみる。

# 設定をいじる

`svelte.config.js` の `kit.browser.hydrate` と `kit.browser.router` を `false` にすると
一切の JavaScript がクライアントサイドに渡らなくなる。

```js:svelte.config.js
import adapter from '@sveltejs/adapter-auto'
import preprocess from 'svelte-preprocess'
/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: preprocess(),
  kit: {
    adapter: adapter(),
    browser: {
      hydrate: false,
      router: false,
    },
  },
}
export default config
```

あとは普通に作っていけば MPA になる。

# web 標準の挙動

クライアントサイドで一切の JavaScript を使わないので web 標準の挙動は問題ない。

# セキュアなデータの流出しやすさ

注意が必要なのは hydration をオフにしていても hydration 用のコードが生成されるという点。

```html
{#if isAdmin}
<p>password は hogehoge です</p>
{/if}
<p>password: <input type="password" name="password" /></p>
```

例として上記のようなコードを書いていた場合
`password は hogehoge です` という文字列が hydration 用のコードに埋め込まれてしまう。

hydration をオフにしているのでこれらのコードは要らない。
ビルド後に `.svelte-kit/output/client/_app` を消してしまえば大丈夫そう。

`load` から直に DB を叩くなどの実装にすれば余計なエンドポイントも要らないので
Rails でレガシーな開発をする際と同様に気をつける程度で良さそうだが…
SvelteKit の想定する使い方でないので将来困る可能性は否めない。
( 処理内容によってはビルドでこけるかもしれない？ )

`client/_app` を消せば `load` の実装は隠せそうなので
DB などへのアクセスは強権限なトークンを `load` に埋めつつそれを必要とするエンドポイントとして実装した方が良さそう。

# エラーの分かりやすさ

Rails などでの MPA と比較しても難しくはないと思う。
少なくとも SPA にありがちなスタックトレースが追えなくなるようなエラーは少ないはず。
SPA を目的とする処理の都合に基づくエラーが現れることがあれば解決は大変かもしれない。

# ドキュメントの多さ

ドキュメントは足りないと感じることがある…。
Next.js であれば見つかるような公式サイトの複数のページを横断したまとめ記事のようなものなどが少ない気がする。
SvelteKit は最初のみ SSR + hydration でページ遷移は SPA のように行うのが標準の使い方だと思うが
MPA をすると SSR のみになるので Svelte や SvelteKit に関するドキュメントが見つかれば概ね参考になることが多そう。

特殊なビルドをする都合上それにそれに関するエラーが出た場合は困りそう。

# SvelteKit で MPA やるときならではのつらみ

**一切の JavaScript が使えない。**

せっかく Svelte を使っているのにクライアントサイドで動的なことをやるのが面倒。

現在の SvelteKit は hydration するかどうかの指定の最小単位がページ単位になっており
かつ設定ファイルの `browser.hydrate` を `false` にしているとページの hydration を有効にできない。
つまり Svelte で動的に動かしたい場合そのページ以外の全ページで hydration をオフにする必要があり面倒。
加えて、JS の有効なページのために `.svelte-kit/output/client/_app` が消せなくない。
[コンポーネント単位の hydration が実装](https://github.com/sveltejs/kit/issues/1390)されても `client/_app` が使われそう。

別途作った JavaScript を script タグで読み込むという方法はあるが
Rails にすら Webpacker があることを考えると動的な要素の追加は Rails/Laravel より面倒かも…。

とはいえ SSR で使っているコンポーネントを使い回しやすいのは利点。

# 感想

Remix の loader や Next.js の getServerSideProps や SvelteKit の load が返す内容に
気を使ったりしないでやれるのはコスト的には減りそうだが…
`browser.hydrate` はいずれ有効化する可能性を意識して開発する方が良さそうに思う。

Rails は触ったことがないが Laravel より SvelteKit で MPA やる方が楽かどうかはどちらとも言い難い。

元記事の表現を借りれば「ドキュメントが少ない代わりに view の書きやすい Rails/Laravel」。

css やコンポーネントの編集時に F5 を押さなくても確認しやすいとか
TypeScript による静的型チェックが便利なのは特に良い点。
( 最近は Ruby でも静的型検査が公式により手厚くなったらしい…？ )

MPA から SPA にしたくなった際のコストも比較的低そう。

個人的には良さげに思えたのでぜひ試してみてほしい。
