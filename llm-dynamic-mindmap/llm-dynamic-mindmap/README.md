# LLM動的マインドマップ

埋め込みベクトル + LLM連携のインタラクティブな知識グラフシステム

## 特徴

- 🧠 **埋め込みベクトル**: Transformers.jsで意味的類似度を計算
- 🤖 **LLM連携**: Claude API / OpenAI API で関連概念を自動生成
- 📊 **Cytoscape.js**: インタラクティブなグラフ可視化
- 📁 **YAML対応**: 設定・データをYAML形式で管理
- 🔄 **動的更新**: ノードクリックで深掘り、キーワード入力で展開
- 🚀 **完全フロントエンド**: バックエンド不要で動作

## アーキテクチャ

```
人間の入力 → LLMが関連語句生成 → グラフに動的追加 → ノードクリック → 深掘り
     ↑                                                               │
     └───────────────────────────────────────────────────────────────┘
```

## ファイル構成

```
llm-dynamic-mindmap/
├── config/
│   ├── config.yaml      # アプリ設定・LLMプロンプト
│   └── styles.yaml      # Cytoscapeスタイル定義
├── data/
│   └── initial_graph.yaml  # 初期マインドマップデータ
├── src/
│   ├── App.jsx              # メインコンポーネント
│   ├── CytoscapeGraph.jsx   # グラフ表示コンポーネント
│   ├── graphManager.js      # グラフデータ管理・LLM連携
│   ├── llmService.js        # LLM APIサービス
│   ├── embedding.js         # 埋め込みベクトル生成
│   ├── similarity.js        # 類似度計算
│   ├── yamlHandler.js       # YAML処理
│   ├── main.jsx            # エントリーポイント
│   └── index.css           # スタイル
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` が自動的に開きます。

## 使い方

### 基本操作

1. **ノード選択**: グラフ上のノードをクリック
2. **深掘り**: ノードをダブルクリック、またはサイドバーの「深掘り」ボタン
3. **キーワード追加**: サイドバーにキーワードを入力して「LLMで展開」
4. **レイアウト変更**: ドロップダウンでアルゴリズムを選択

### LLM設定

- **モック**: APIキー不要、デモ用のモックデータを使用
- **Claude API**: Anthropic APIキーを入力
- **OpenAI API**: OpenAI APIキーを入力

### YAMLエクスポート/インポート

- 「YAML エクスポート」でグラフをファイル保存
- 「YAML インポート」で既存のYAMLファイルを読み込み

## YAML設定ファイル

### config.yaml

アプリケーションの動作設定、LLMプロンプトを定義:

```yaml
llm:
  provider: mock  # anthropic, openai, mock
  
prompts:
  expand_keyword: |
    キーワード: {keyword}
    関連する概念を5〜8個提案してください...
```

### initial_graph.yaml

初期マインドマップデータをYAMLで定義:

```yaml
nodes:
  - id: "ml"
    label: "機械学習"
    depth: 0

edges:
  - source: "ml"
    target: "deep_learning"
    relation: "発展形"
```

YAMLの利点:
- コメント記述可能
- 人間が編集しやすい
- アンカー・エイリアスで設定再利用

## 技術スタック

- **React 18** - UIフレームワーク
- **Vite** - ビルドツール
- **Cytoscape.js** - グラフ可視化
- **Transformers.js** - 埋め込みモデル (multilingual-e5-small)
- **js-yaml** - YAML処理
- **Tailwind CSS** - スタイリング

## 埋め込みモデル

**Xenova/multilingual-e5-small**
- 384次元の埋め込みベクトル
- 日本語対応
- 量子化版（軽量）
- 初回ロード: 約50-100MB

## カスタマイズ

### プロンプトの変更

`config/config.yaml` の `prompts` セクションを編集:

```yaml
prompts:
  expand_keyword: |
    あなたは[専門分野]の専門家です。
    キーワード: {keyword}
    [カスタム指示]
```

### スタイルの変更

`config/styles.yaml` を編集するか、`src/CytoscapeGraph.jsx` のデフォルトスタイルシートを変更

### 初期データの変更

`data/initial_graph.yaml` を編集してカスタムの初期マインドマップを設定

## 開発者向け

### ビルド

```bash
npm run build
```

`dist/` フォルダに本番用ビルドが生成されます。

### デプロイ

生成された `dist/` フォルダを以下のサービスにデプロイ可能:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

## ライセンス

MIT
