# 動的階層マインドマップ - セットアップガイド

## 📦 プロジェクト内容

このアーカイブには、埋め込みベクトルベースの動的マインドマップシステムの完全な実装が含まれています。

## 🚀 クイックスタート

### 1. ファイルの展開

```bash
tar -xzf dynamic-mindmap.tar.gz
cd dynamic-mindmap
```

### 2. Node.jsのインストール確認

Node.js 18以上が必要です。

```bash
node --version
npm --version
```

インストールされていない場合は https://nodejs.org/ からダウンロードしてください。

### 3. 依存関係のインストール

```bash
npm install
```

初回は数分かかる場合があります。

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` が自動的に開きます。

## 📊 初回起動時の注意

- **初回ロード時**: 埋め込みモデル（約50-100MB）をダウンロードするため、数十秒かかります
- **2回目以降**: キャッシュされるため、高速に起動します

## 🎯 実装されている機能

### Phase 1-3 (完成✅)

- ✅ 埋め込みベクトル生成（Transformers.js）
- ✅ 類似度計算（コサイン類似度）
- ✅ 動的階層構築
- ✅ Cytoscape.jsグラフ可視化
- ✅ ノード選択・操作
- ✅ 親ノード変更
- ✅ 非表示・削除機能
- ✅ 類似度閾値調整

### Phase 4 (未実装)

- ⏳ Claude API統合（探索機能）

## 🔧 トラブルシューティング

### npm installでエラーが出る場合

```bash
# キャッシュクリア
npm cache clean --force

# 再インストール
rm -rf node_modules package-lock.json
npm install
```

### ポート3000が使用中の場合

vite.config.jsの`port: 3000`を別の番号（例：3001）に変更してください。

### ブラウザでグラフが表示されない

F12でコンソールを開き、エラーメッセージを確認してください。

## 📁 ファイル構造

```
dynamic-mindmap/
├── src/
│   ├── App.jsx              # メインUI
│   ├── CytoscapeGraph.jsx   # グラフ表示
│   ├── embedding.js         # 埋め込み生成
│   ├── similarity.js        # 類似度計算
│   ├── hierarchy.js         # 階層構築
│   ├── main.jsx            # エントリーポイント
│   └── index.css           # スタイル
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🎨 カスタマイズ

### 初期ノードの変更

`src/App.jsx`の`INITIAL_NODE_TEXTS`配列を編集：

```javascript
const INITIAL_NODE_TEXTS = [
  'あなたの',
  'テーマを',
  'ここに',
  '追加'
];
```

### 類似度閾値のデフォルト値

`src/App.jsx`の`useState(0.6)`を変更：

```javascript
const [threshold, setThreshold] = useState(0.7); // 70%に変更
```

### グラフのレイアウト

`src/CytoscapeGraph.jsx`の`layoutMode`を変更：

- `'breadthfirst'` - ツリー型（デフォルト）
- `'cose'` - 力学レイアウト
- `'circle'` - 円形配置

## 🌐 本番環境へのデプロイ

### ビルド

```bash
npm run build
```

`dist/`フォルダが生成されます。

### 静的ホスティング

生成された`dist/`フォルダを以下のサービスにデプロイできます：

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

## 📚 次のステップ

### Phase 4の実装（探索機能）

Claude APIを統合して、新しいノードを自動生成する機能を追加できます。

詳細は`README.md`の「今後の拡張」セクションを参照してください。

## 💡 使い方のヒント

1. **最初は「機械学習」が親ノード**になっています
2. **他のノードをクリック→「親ノードに設定」**で視点を変更
3. **類似度閾値を下げる**と、より多くの関連ノードが表示されます
4. **グラフをドラッグ**して見やすい位置に調整できます

## 🐛 バグ報告・質問

問題が発生した場合は、以下の情報を添えてご連絡ください：

- OS（Windows/Mac/Linux）
- Node.jsバージョン
- ブラウザとバージョン
- コンソールのエラーメッセージ

---

開発を楽しんでください！🚀
