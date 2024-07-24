---
title: ts-fix で足りない import を自動で追加してみる
emoji: 👌
type: tech
topics: [typescript, tsfix]
published: true
---

# はじめに

TypeScript を書いていて大規模な置換などを行うと  
足りない import が大量発生したときに手動で対応すると大変です。

VSCode などを使っていると知っているかもしれませんが  
TypeScript の本体には[足りない import を追加する機能があります](https://github.com/microsoft/TypeScript/blob/97ed8fc13bd021d667d1e421924c7f64ff6e6e32/src/services/codefixes/importFixes.ts)。

これを tsserver などから叩くこともできると思うのですが…私には難しかったです。  
別の手段を探してみました。

# ts-fix が便利そう

Microsoft のエンジニアさんが作ったと思われる下記の ts-fix という CLI ツールを使えば  
TypeScript の codefix を CLI で適用できそうでした。  
[microsoft/ts-fix: CLI for applying TypeScript codefixes](https://github.com/microsoft/ts-fix)

```shell
# インストールしてみる
pnpm add ts-fix@https://github.com/microsoft/ts-fix.git
# ヘルプを表示 ( -h には未対応？ )
pnpm exec ts-fix --help
```

試しに下記のコマンドを入力してみたのですが上手くいきません。

```shell
# 実行
pnpm exec ts-fix --fixName import --write
```

コードを確認したところ import は対応しない修正扱いされているようです。  
[/src/index.ts#L262](https://github.com/microsoft/ts-fix/blob/9a4839d1a081a51f037155d4ad91a0e4489ca3f3/src/index.ts#L262)

# 無理やり動かしてみる

import の修正には対応していないのですが  
下記のイシューにもあるように対応しない扱いしている１行をコメントアウトすることで動きそうです。  
https://github.com/microsoft/ts-fix/issues/31

```diff typescript
  function isNotAppliedFix(fixAndDiagnostic: FixAndDiagnostic): boolean {
    return !fixAndDiagnostic.fix.changes.length
-     || fixAndDiagnostic.fix.fixName === 'import'
+     // || fixAndDiagnostic.fix.fixName === 'import'
      || fixAndDiagnostic.fix.fixName === 'fixMissingFunctionDeclaration'
      || fixAndDiagnostic.fix.fixName === 'fixMissingMember'
      || fixAndDiagnostic.fix.fixName === 'spelling';
  }
```

私も試しに小さな環境を作ってみたら動きました。

```typescript:hoge.ts
export const Hoge = 'hoge'
```

```typescript:index.ts
console.log(Hoge)
```

上記の状態でコマンドを実行すると下記のように修正されました。

```typescript:index.ts
import { Hoge } from "./hoge";

console.log(Hoge)
```

あとからフォーマッタをかけ直す必要はありそうです。

# インポート対象が複数ある場合は選べなさそう

上記の変更前の状態で同名の値を持つ別のファイルを追加してみました。

```typescript:hoge2.ts
export const Hoge = 'hoge2'
```

この場合は `import { Hoge } from "./hoge";` のみが追加され  
`import { Hoge } from "./hoge2";` は追加されませんでした。

対話モードでの実行なども試してみましたがどれをインポートするかは選べなさそうです。

```shell
# 対話モード
ts-fix -f import -w --interactiveMode
```

# おわりに

小さなプロジェクトでしか試してないので大きなプロジェクトでは問題があるかもしれませんが  
git のワーキングツリーが空でない場合は標準では動かないなど困った修正をしないように気を使ってあるようです。

ぜひ試してみてください。
