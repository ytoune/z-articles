---
title: 経済を回してみた
emoji: 🤣
type: idea
topics: [preact, nextjs, クソアプリ]
published: true
---

https://twitter.com/nixeneko/status/1360916737789583368

[経済って文字を回転させるWebサービス](https://ytoune.github.io/keizai-mawasu/)を作りました

この程度ならすぐ作れるだろうと思ったのですが  
制作の過程でいくつか学びがあったので書いていきます  

# Next.js と Preact を組み合わせる

React で書きつつ予め html を生成しておきたかったので  
Next.js を SSG 用途で使うことにしました  
ファイルサイズを下げるため React の代わりに Preact を入れて使います  

[以前](./20201224-nextjs-on-preact)は React の代わりに Preact を入れるだけだったのですが  
Fast Refresh が効かないという話を Twitter でつぶやいたらアドバイスを受けました  

```shell
yarn add next preact preact-render-to-string \
  github:preact-compat/react#1.0.0 github:preact-compat/react-dom#1.0.0
yarn add -D @types/node @types/react typescript
```

https://twitter.com/Abdullah_Mzaien/status/1352913838769897472

便利なものがあると知ったのでより調査を進めた結果  
[Next.js の公式 リポジトリの examples に Preact と組み合わせる例](https://github.com/vercel/next.js/blob/canary/examples/using-preact/next.config.js)があり  
next-plugin-preact の存在を知りましたので今回はそれを使いました  

```shell
yarn add -D next-plugin-preact webpack@^4
```

Next.js に webpack がバンドルされるようになった都合で webpack@^4 を別途インストールする必要があります

# animationiteration イベント

経済という文字を回転させるだけだと寂しいので  
回転させた回数を表示させたいと思いました  

回転は CSS により行うので  
CSS アニメーションが終わった時点でそれを検知したいです  
ちょうど良いイベントがありました  

> animationiteration イベントは、 CSS アニメーションの反復が1回分終了し、次の回が始まったときに発生します。

https://developer.mozilla.org/ja/docs/Web/API/HTMLElement/animationiteration_event より引用  

```ts
const ref = useRef<HTMLParagraphElement>(null)
useLayoutEffect(() => {
  if (!ref.current) return
  ref.current.addEventListener('animationiteration', () => {
    setcount(c => c + 1)
  })
}, [ref])
```

# その他

scss で初めて for を使ってみたり  
Lighthouse で満点をとるためにちょっといじったりしました  

作ってて楽しかったです  

ソースコードは[こちら](https://github.com/ytoune/keizai-mawasu)になります

---

![image](https://user-images.githubusercontent.com/14814410/108663802-bcaa3880-7514-11eb-9952-aea6276eb777.png)
