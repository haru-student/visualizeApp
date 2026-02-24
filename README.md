# アプリの実行方法
- [ローカル環境](#ローカル環境)
- [公開中の確認用URL](#公開中の確認用url)

## ローカル環境

開発中は `dotnet run` を使用してローカル実行できる。

### 0. Cosmos DB 接続情報（操作ログ保存用）を設定する

ローカルでも本番でも、操作ログは Cosmos DB に保存される。
ただし、**キーはリポジトリに含めず**、以下の順で読み込む。

1. `.env`（ローカル平文。Git 管理外）
2. `.env.enc` + `ENV_FILE_PASSPHRASE`（暗号化ファイルを復号して読み込み）
3. OS 環境変数 (`COSMOS_ENDPOINT` / `COSMOS_KEY`)
4. 設定値 `Cosmos:Endpoint` / `Cosmos:Key`（User Secrets 含む）

#### .env の作成

```bash
cp .env.example .env
```

`.env` に以下を設定する。

```dotenv
COSMOS_ENDPOINT=https://<your-account>.documents.azure.com:443/
COSMOS_KEY=<your-cosmos-key>
```

#### （推奨）.env を暗号化して .env.enc を使う

`.env.enc` を作成する例（OpenSSL）:

```bash
openssl enc -aes-256-cbc -pbkdf2 -salt -in .env -out .env.enc -a
```

起動時に復号するため、`ENV_FILE_PASSPHRASE` を設定してから実行する。

```bash
export ENV_FILE_PASSPHRASE='<opensslで使用したパスフレーズ>'
dotnet run
```

> 補足: アプリ側は `.env.enc` の復号に対応しており、復号できない場合は警告ログのみ出して起動を継続する。

#### User Secrets を使う場合

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
