---
title: Unicode 文字列の幅を計測する
emoji: 📏
type: tech
topics: [unicode, rust, javascript, typescript]
published: true
---

JavaScript ( Web 上 ) で Unicode 文字列の幅を計測したくなったので調べました。

表示上の幅を測る場合 [canvas の measureText](https://developer.mozilla.org/ja/docs/Web/API/CanvasRenderingContext2D/measureText) があります。  
フォントに依存してしまう、絵文字の幅がおかしい？などの注意点はあるもののピクセル単位で計測できるのは便利そうです。

今回は環境に依存しない方法を探したかったので他の方法を探しました。

# [unicode-width - crates.io: Rust Package Registry](https://crates.io/crates/unicode-width)

unicode width でググったら出てきた良さげなライブラリ。

```rust
fn main() {
  let teststr = "Ｈｅｌｌｏ, ｗｏｒｌｄ!";
  let width = UnicodeWidthStr::width(teststr);
  println!("{}", teststr);
  println!("The above string is {} columns wide.", width);
  let width = teststr.width_cjk();
  println!("The above string is {} columns wide (CJK).", width);
}
```

他に見つかったライブラリがメンテナンスされてなかったりするなか  
Unicode 14 にも対応できていて今後の準備もできているようで良さそうに見えました。

Rust 製なので JavaScript から使う場合 wasm 化などの手間があるのが難点ですが  
直接数値がえられるため Unicode の定義をしっかり読まなくても使えます。

# [easta - npm](https://www.npmjs.com/package/easta)

Unicode の East Asian Width を得られるライブラリ。

日本語などの表示では半角英数字などのような半角文字とは別に全角文字が使われます。  
これらの文字の幅に関する定義が [Unicode Standard Annex #11](http://www.unicode.org/reports/tr11/) でされているようです。

Ambiguous, Fullwidth, Halfwidth, Narrow, Wide または Neutral ( =東アジアではない ) の 6 つの値のいずれかが各 Unicode 文字に割り当てられています。

Narrow と Halfwidth は半角、 Wide と Fullwidth は全角として  
日本語などのコンテキストでは Ambiguous も全角とすれば概ね問題ないのですが  
Neutral は easta の範囲外なので別途対処が要ります…。  
たとえば制御文字は文字が表示されないので幅を 0 をして扱いたいですが ç は 1 にしたいです。

下記のようなスクリプトで UnicodeData を生成して…

```typescript
import { writeFile } from 'fs/promises'
import { join } from 'path'

const gen = async () => {
  const UnicodeData = await fetch(
    'https://www.unicode.org/Public/UNIDATA/UnicodeData.txt',
  )
    .then(async r => await r.text())
    .then(t =>
      Object.fromEntries(
        t
          .split('\n')
          .map(t => t.trim().split(';'))
          .filter(t => t[0] && t[2])
          .map((t): [number, string] => [parseInt(t[0] ?? '', 16), t[2] ?? '']),
      ),
    )
  await writeFile(
    join(__dirname, '../src/gen/UnicodeData.ts'),
    `export const UnicodeData = ${JSON.stringify(UnicodeData)} as const\n`,
  )
}

gen().catch(x => {
  console.error(x)
})
```

上記の `unicode-width` を参考にして下記のように getWidth を書きました。

```typescript
import easta from 'easta'
import { UnicodeData } from './gen/UnicodeData'
export const getWidth = (str: string): number => {
  const list = str.match(/./giu)
  if (!list) return 0
  return list.map((r): number => size(r, true)).reduce((q, w) => q + w, 0)
}
const size = (char: string, isCjk: boolean) => {
  const w = easta(c)
  const k = c.codePointAt(0)
  if (!k) return 0
  const w2 = UnicodeData[k as unknown as keyof typeof UnicodeData]
  if ('Me' === w2 || 'Mn' === w2 || 'Cf' === w2 || 'Cc' === w2) return 0
  if ('Cs' === w2) return 2
  if ('F' === w || 'W' === w) return 2
  if ('A' === w) return isCjk ? 2 : 1
  if ('N' === w && ('Zl' === w2 || 'Zp' === w2)) return 1
  return 1
}
```

Unicode の仕様を読み込む必要があるなど大変な点もありますが  
最近の等幅フォントは全角が半角の 1.5 倍ほどの幅だったりするのでカスタマイズできるのは便利です。

# 感想

Unicode とてもむずかしい…
