# アプリの実行方法
- [ローカル環境](#ローカル環境)
- [公開中の確認用URL](#公開中の確認用url)

## ローカル環境

開発中は `dotnet run` を使用してローカル実行できる。

### 1. Program.cs を一部コメントアウトする

`Program.cs` の以下の設定は、ローカル実行では不要なためコメントアウトする。

```csharp
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(5000);
});
```

※ `dotnet run` では launchSettings.json の設定が使われるため。

---

### 2. アプリを起動する

```bash
dotnet run
```

---

### 3. ブラウザからアクセスする

起動時に表示される URL（例）にアクセスする。
http://localhost:5059

※ ポート番号は環境によって異なる場合がある。

---

### 補足

- この方法は **開発・デバッグ用**
- DB には接続していないため、操作ログは保存されない

## 公開中の確認用URL

試しに触ってみたい場合は、以下の URL にアクセスしてください。

- https://viz-app-cfbsfgc4gwbscygs.japanwest-01.azurewebsites.net

実験ページは以下です。

- https://viz-app-cfbsfgc4gwbscygs.japanwest-01.azurewebsites.net/test

※ Azure の無料枠で運用しているため、まれにアクセスできない場合があります。
