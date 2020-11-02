---
title: "Julia のマクロを Rust で書き直してみて感じたこと"
emoji: "🤔"
type: "idea"
topics: ["rust", "macro"]
published: true
---

[こちら](https://nbviewer.jupyter.org/gist/genkuroki/460eb0e6122c04094a4b8b69c1c2bd79#MIT%E3%81%A7%E3%81%AE%E8%AC%9B%E7%BE%A9%E3%81%AE%E5%AE%BF%E9%A1%8C%E3%81%AE%E8%A7%A3%E7%AD%94%E3%81%AE%E3%82%B3%E3%83%BC%E3%83%89)の `E₁_taylor64` を Rust で書き直してみました

:::details 実装全体

```rust
fn e1_taylor_coefficients(n: isize) -> Vec<f64> {
  use natural_constants::math::euler_mascheroni;
  if n < 0 {
    panic!("n ≥ 0 is required");
  }
  if n == 0 {
    return vec![];
  }
  if n == 1 {
    return vec![-euler_mascheroni];
  }
  let mut term = 1.0;
  let mut terms = vec![-euler_mascheroni, term];
  for k in 2..=n {
    let k = k as f64;
    term = -term * (k - 1.0) / (k * k);
    terms.push(term);
  }
  terms
}

fn evalpoly64_impl(ident: proc_macro2::Ident, coefficients: &[f64]) -> proc_macro2::TokenStream {
  use quote::quote;
  let mut code = quote::quote! { 0.0 };
  let mut cs = coefficients.iter().copied().collect::<Vec<_>>();
  cs.reverse();
  for (i, c) in cs.into_iter().enumerate() {
    code = if 0 == i {
      quote! { #c as f64 }
    } else {
      quote! { #c as f64 + #ident * (#code) }
    }
  }
  quote::quote! {{ let #ident = #ident as f64; #code }}
}

#[proc_macro]
pub fn e1_taylor64(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
  use proc_macro2::{
    TokenStream,
    TokenTree::{Ident, Literal, Punct},
  };
  let input = TokenStream::from(input);
  let vec = input.into_iter().collect::<Vec<_>>();
  let (z, n) = match &vec[..] {
    [Ident(z), Punct(_), Literal(n)] => (z, n.to_string().parse::<isize>().unwrap()),
    _ => panic!("e1_taylor64 requires (ident, isize). eg let z = 2f64; e1_taylor64!(z, 12)"),
  };
  let c = e1_taylor_coefficients(n);
  let ident = z.to_owned();
  let pl = evalpoly64_impl(ident.clone(), &c);
  let gen = quote::quote! {{
    let t = #ident as f64;
    let pl = #pl;
    pl - t.log(std::f64::consts::E)
  }};
  gen.into()
}
```

:::

:::details Julia とは？

最近、数値計算系の界隈で注目されているらしいです ^[https://muuuminsan.hatenablog.com/entry/2020/10/08/021903]
Python のような動的プログラミング言語ですが C の半分程度という優秀な速度が特徴です
裏で LLVM を使っているらしく実行ファイルや共有ライブラリにコンパイルできるらしいです
Scheme のような健全で強力なマクロが使えます

:::

# Rust で書く上で困ったこと

## 定義できる場所に制限がある

手続型マクロは `fn(TokenStream) -> TokenStream` の形であり
定義するためには手続型マクロだけを公開するライブラリ上である必要があります

つまりファイルの分割が常に必要になります

## eval がない

Rust には eval がありません（ REPL もないですね ）
引数の TokenStream を部分的に eval したいといった場合に困りました

例えば、`evalpoly64` というマクロを考えます
これは１つの変数と複数の整数をもとにコードを生成します

```rust
let num = evalpoly64!(x, [1.0, 2.0, 3.0, 4.0]);
```

$$
 \begin{aligned}
 evalpoly(x, [1, 2, 3, 4]) &= x^3 + 2x^2 + 3x + 4 \\\\ 
 &= 4 + x (3 + x (2 + x))
 \end{aligned}
$$

展開後

```rust
let num = 4.0 + x * (3.0 + x * (2.0 + x * 1.0));
```

これは macro_rules でも定義できます

```rust
macro_rules! evalpoly64 {
  ( $i: ident ) => {
    0.0
  };
  ( $i: ident, [ $x:expr ] ) => {
    $x
  };
  ( $i: ident, [$h:expr, $( $x:expr ),+] ) => {
    $h + $i * (evalpoly64!($i, [$($x),*]))
  };
}
```

これを手続型マクロで書いてみます

```rust
fn evalpoly64_impl(ident: proc_macro2::Ident, coefficients: &[f64]) -> proc_macro2::TokenStream {
  use quote::quote;
  let mut code = quote::quote! { 0.0 };
  let mut cs = coefficients.iter().copied().collect::<Vec<_>>();
  cs.reverse();
  for (i, c) in cs.into_iter().enumerate() {
    code = if 0 == i {
      quote! { #c as f64 }
    } else {
      quote! { #c as f64 + #ident * (#code) }
    }
  }
  quote::quote! {{ let #ident = #ident as f64; #code }}
}

#[proc_macro]
pub fn evalpoly64(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
  use proc_macro2::{
    TokenStream,
    TokenTree::{Group, Ident, Literal, Punct},
  };
  let message = "evalpoly64 requires (ident, [f64]). eg let z = 2f64; evalpoly64!(z, [1, 2, 3])";
  let input = TokenStream::from(input);
  let vec = input.into_iter().collect::<Vec<_>>();
  let (z, n) = match &vec[..] {
    [Ident(z), Punct(_), Group(a)] => (z, a),
    [Ident(z), Punct(_), Group(a), Punct(_)] => (z, a),
    _ => panic!(message),
  };
  let ident = z.to_owned();
  let mut list: Vec<f64> = vec![];
  let mut lit = true;
  for t in n.stream() {
    if lit {
      match t {
        Literal(l) => list.push(l.to_string().parse().unwrap()),
        _ => panic!(message),
      }
    } else {
      match t {
        Punct(_) => {}
        _ => panic!(message),
      }
    }
    lit = !lit;
  }
  let gen = evalpoly64_impl(ident, &list);
  gen.into()
}
```

長いですね
やりたいことは `evalpoly64_impl` の中身なのですが
`TokenStream` から `Ident` と `&[f64]` を得るために長いコードが要ります

他に手続型マクロ内でマクロを展開して TokenStream を得たい場合がありましたが諦めて関数を実装したりしました
（上記の `evalpoly64` を展開できないので `evalpoly64_impl` を変わりに書きました）

# まとめ

eval があるともっと書きやすいのではないかと思うのですが
マクロで書かなくても最適化で同様のコードが生成されるようになる方が rust っぽいのかなとも思います
