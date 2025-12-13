# アプリの起動とアクセス方法

## 起動手順

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

## 起動確認

起動すると、コンソールに次のように表示される。

```
Now listening on: http://[::]:5000
```

これはポート 5000 で待ち受けていることを意味する。

---

## ブラウザからのアクセス

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

## IP アドレスの確認方法（Windows）

```powershell
ipconfig
```

表示される IPv4 Address を使用する。

---

## 停止方法

```
Ctrl + C
```

実行中の Web サーバーを停止する。

---

## 補足

- CSS / JavaScript などの静的ファイルは  
  publish/wwwroot フォルダから配信される
- 必ず publish フォルダに移動してから実行すること
