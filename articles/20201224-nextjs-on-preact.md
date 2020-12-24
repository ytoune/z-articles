---
title: Next.js の React を preact に差し替えるとどれくらいファイルサイズが減るのか？
emoji: 📐
type: tech
topics: [react, preact, nextjs, nodejs]
published: true
---

preact が React より軽量らしいので実際にはかってみます
実際に試したコードのレポジトリは[こちら](https://gitlab.com/yt-practice/next-bundle-analyzer-20201224)

# インストール

## react

```shell
yarn add next react react-dom \
  @types/node @types/react typescript @next/bundle-analyzer
```

## preact

```shell
yarn add next preact preact-render-to-string \
  github:preact-compat/react#1.0.0 github:preact-compat/react-dom#1.0.0 \
  @types/node @types/react typescript @next/bundle-analyzer
```

# ファイルサイズ

## react

`next build && next start` して chrome でアクセスしてみる

![image](https://user-images.githubusercontent.com/14814410/103083764-93f2e900-4620-11eb-8deb-9648185941da.png)

`@next/bundle-analyzer` で計測

![image](https://user-images.githubusercontent.com/14814410/103083140-0367d900-461f-11eb-9207-4023c457b61f.png)

## preact

`next build && next start` して chrome でアクセスしてみる

![image](https://user-images.githubusercontent.com/14814410/103083783-9e14e780-4620-11eb-80f3-5e4cc2edb4f9.png)

`@next/bundle-analyzer` で計測

![image](https://user-images.githubusercontent.com/14814410/103083290-635e7f80-461f-11eb-8117-401a50d090ad.png)

# まとめ

| | transferred | chunks
| :-- | :-- | :--
| react | 522 kB | 416.92 KB
| preact | 39.8 kB | 301.24 KB

transferred が実際に chrome でアクセスして確認したサイズで
chunks が `@next/bundle-analyzer` で All に表示されたサイズです

`@next/bundle-analyzer` での計測結果にあまり差がないのが気になりますが
いずれにしても preact にした方がファイルサイズは小さくできそうです
