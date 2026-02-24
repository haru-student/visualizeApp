# アプリの実行方法
- [ローカル環境](#ローカル環境)
- [公開中の確認用URL](#公開中の確認用url)

## ローカル環境

開発中は `dotnet run` を使用してローカル実行できる。

### 0. Cosmos DB 接続情報（操作ログ保存用）を設定する

ローカルでも本番でも、操作ログは Cosmos DB に保存される。
ただし、**キーはリポジトリに含めず**、以下のどちらかで設定する。

- 優先1: 環境変数
  - `COSMOS_ENDPOINT`
  - `COSMOS_KEY`
- 優先2: 設定値 `Cosmos:Endpoint` / `Cosmos:Key`（ローカルは User Secrets 推奨）

ローカルでは User Secrets の利用例:

```bash
dotnet user-secrets init --project visualizeApp/visualizeApp.csproj
dotnet user-secrets set "Cosmos:Endpoint" "https://<your-account>.documents.azure.com:443/" --project visualizeApp/visualizeApp.csproj
dotnet user-secrets set "Cosmos:Key" "<your-cosmos-key>" --project visualizeApp/visualizeApp.csproj
```

Azure 本番環境では App Service の「環境変数（Application Settings）」に `COSMOS_ENDPOINT` / `COSMOS_KEY` を設定する。

### 1. アプリを起動する

```bash
dotnet run
```

---

### 2. ブラウザからアクセスする

起動時に表示される URL（例）にアクセスする。
http://localhost:5059

※ ポート番号は環境によって異なる場合がある。

---

### 補足

- この方法は **開発・デバッグ用**
- Cosmos DB 接続情報が正しく設定されていれば、ローカルでも操作ログが保存される

## 公開中の確認用URL

試しに触ってみたい場合は、以下の URL にアクセスしてください。

- https://viz-app-cfbsfgc4gwbscygs.japanwest-01.azurewebsites.net

実験ページは以下の URL です。被験者番号は適当な半角の数字を入力して下さい。（現在実験を行っていないため、数字は何でも大丈夫です）

- https://viz-app-cfbsfgc4gwbscygs.japanwest-01.azurewebsites.net/test

※ Azure の無料枠で運用しているため、まれにアクセスできない場合があります。
