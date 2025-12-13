# アプリの実行方法
- [本番環境](#本番環境)
- [ローカル環境](#ローカル環境)

## 本番環境

### 起動手順

```bash
dotnet clean
dotnet publish -c Release
cd bin/Release/net8.0/publish
dotnet visualizeApp.dll
```

- dotnet clean  
  古い build / publish の成果物を削除する
- dotnet publish -c Release  
  本番用の実行ファイル（publish フォルダ）を作成する
- dotnet visualizeApp.dll  
  Web サーバー（Kestrel）を起動する

---

### 起動確認

起動すると、コンソールに次のように表示される。

```
Now listening on: http://[::]:5000
```

これはポート 5000 で待ち受けていることを意味する。

---

### ブラウザからのアクセス

ブラウザを開いて、次の URL にアクセスする。

```
http://your-ip-address:5000
```

例：

```
http://192.168.11.5:5000
```

your-ip-address は、アプリを起動している PC の IP アドレスに置き換える。

---

### IP アドレスの確認方法（Windows）

```powershell
ipconfig
```

表示される IPv4 Address を使用する。

---

### 停止方法

```
Ctrl + C
```

実行中の Web サーバーを停止する。

---

### 補足

- CSS / JavaScript などの静的ファイルは  
  publish/wwwroot フォルダから配信される
- 必ず publish フォルダに移動してから実行すること

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
- 他 PC からのアクセスはできない
- 公開・実験用途では `dotnet publish` を使用する

