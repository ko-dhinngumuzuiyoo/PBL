// src/App.jsx
import { useState, useEffect, useMemo } from 'react';
import { CytoscapeGraph } from './CytoscapeGraph';
import { getEmbedding, getBatchEmbeddings } from './embedding';
import { buildDynamicHierarchy, hierarchyToElements } from './hierarchy';

// 初期ノードデータ（テキストのみ、ベクトルは後で生成）
const INITIAL_NODE_TEXTS = [
  '機械学習',
  '教師あり学習',
  '教師なし学習', 
  '深層学習',
  'ニューラルネットワーク',
  '統計学',
  '回帰分析',
  '最小二乗法',
  'データ分析',
  'クラスタリング',
  'K-means',
  '決定木',
  'SVM',
  '確率論',
  'ベイズ統計'
];

function App() {
  const [nodes, setNodes] = useState([]);
  const [rootNodeId, setRootNodeId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [threshold, setThreshold] = useState(0.6);
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('初期化中...');
  const [nextId, setNextId] = useState(16);

  // 初期化：埋め込みベクトルを生成
  useEffect(() => {
    async function initialize() {
      try {
        setLoadingMessage('埋め込みモデルをロード中...');
        console.log('🚀 アプリケーション初期化開始');
        
        // 初期ノードの埋め込みを生成
        setLoadingMessage('ノードの埋め込みを生成中...');
        const vectors = await getBatchEmbeddings(INITIAL_NODE_TEXTS);
        
        const initialNodes = INITIAL_NODE_TEXTS.map((text, i) => ({
          id: i + 1,
          text: text,
          vector: vectors[i]
        }));
        
        setNodes(initialNodes);
        setRootNodeId(1);  // 最初のノード（機械学習）をルートに
        
        console.log('✅ 初期化完了！');
        console.log(`  ノード数: ${initialNodes.length}`);
        
        setIsLoading(false);
      } catch (error) {
        console.error('❌ 初期化エラー:', error);
        setLoadingMessage(`エラー: ${error.message}`);
      }
    }
    
    initialize();
  }, []);

  // 階層構造を構築
  const hierarchy = useMemo(() => {
    if (nodes.length === 0 || !rootNodeId) return null;
    
    const rootNode = nodes.find(n => n.id === rootNodeId);
    if (!rootNode) return null;
    
    return buildDynamicHierarchy(rootNode, nodes, hiddenIds, 3, threshold);
  }, [nodes, rootNodeId, hiddenIds, threshold]);

  // Cytoscape用の要素に変換
  const { nodes: cyNodes, edges: cyEdges } = useMemo(() => {
    if (!hierarchy) return { nodes: [], edges: [] };
    return hierarchyToElements(hierarchy);
  }, [hierarchy]);

  // ノード選択ハンドラ
  const handleNodeClick = (nodeId) => {
    console.log('ノード選択:', nodeId);
    setSelectedNodeId(nodeId);
  };

  // 親ノードに設定
  const handleSetAsRoot = () => {
    if (selectedNodeId) {
      console.log(`親ノードに設定: ${selectedNodeId}`);
      setRootNodeId(selectedNodeId);
    }
  };

  // 非表示
  const handleHide = () => {
    if (selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId);
      console.log(`ノード非表示: ${node?.text}`);
      setHiddenIds(prev => new Set([...prev, selectedNodeId]));
      setSelectedNodeId(null);
    }
  };

  // 削除
  const handleDelete = () => {
    if (selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId);
      if (confirm(`「${node?.text}」を削除しますか？`)) {
        console.log(`ノード削除: ${node?.text}`);
        setNodes(prev => prev.filter(n => n.id !== selectedNodeId));
        
        // ルートノードを削除した場合
        if (rootNodeId === selectedNodeId) {
          const remainingNodes = nodes.filter(n => n.id !== selectedNodeId);
          if (remainingNodes.length > 0) {
            setRootNodeId(remainingNodes[0].id);
          }
        }
        
        setSelectedNodeId(null);
      }
    }
  };

  // 非表示を全て解除
  const handleUnhideAll = () => {
    console.log('全ノードを表示');
    setHiddenIds(new Set());
  };

  // 選択中のノード情報
  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;

  // フィルタリングされたノードリスト
  const visibleNodes = nodes.filter(n => !hiddenIds.has(n.id));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700">{loadingMessage}</p>
          <p className="text-sm text-gray-500 mt-2">初回は数秒かかります...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🔄 動的階層マインドマップ
          </h1>
          <p className="text-gray-600">
            埋め込みベクトルベースの類似度計算 | Cytoscape.js可視化
          </p>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* 左パネル */}
          <div className="col-span-1 space-y-4">
            {/* 統計情報 */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="font-bold text-gray-800 mb-3">📊 統計情報</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">総ノード数:</span>
                  <span className="font-bold text-blue-600">{nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">表示中:</span>
                  <span className="font-bold text-green-600">{visibleNodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">非表示:</span>
                  <span className="font-bold text-gray-600">{hiddenIds.size}</span>
                </div>
              </div>
            </div>

            {/* 類似度閾値 */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="font-bold text-gray-800 mb-3">⚙️ 設定</h3>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                類似度閾値: {(threshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.4"
                max="0.9"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* 選択中のノード操作 */}
            {selectedNode && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-lg p-4 border-2 border-blue-300">
                <h3 className="font-bold text-gray-800 mb-3">
                  選択中: {selectedNode.text}
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={handleSetAsRoot}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    🎯 親ノードに設定
                  </button>
                  <button
                    onClick={handleHide}
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    👁️ 非表示
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>
            )}

            {/* 非表示ノードリスト */}
            {hiddenIds.size > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-gray-800">非表示中</h3>
                  <button
                    onClick={handleUnhideAll}
                    className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                  >
                    全て表示
                  </button>
                </div>
                <div className="space-y-1 text-sm">
                  {Array.from(hiddenIds).map(id => {
                    const node = nodes.find(n => n.id === id);
                    return node ? (
                      <div key={id} className="text-gray-600">
                        • {node.text}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* ノードリスト */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="font-bold text-gray-800 mb-3">📋 ノード一覧</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {visibleNodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => handleNodeClick(node.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
                      node.id === selectedNodeId
                        ? 'bg-purple-500 text-white'
                        : node.id === rootNodeId
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    {node.text}
                    {node.id === rootNodeId && ' 🎯'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* グラフ表示エリア */}
          <div className="col-span-3">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  階層構造（親: {nodes.find(n => n.id === rootNodeId)?.text}）
                </h2>
                <div className="text-sm text-gray-600">
                  ノード: {cyNodes.length} | エッジ: {cyEdges.length}
                </div>
              </div>
              
              <CytoscapeGraph
                nodes={cyNodes}
                edges={cyEdges}
                rootNodeId={rootNodeId}
                selectedNodeId={selectedNodeId}
                onNodeClick={handleNodeClick}
                layoutMode="breadthfirst"
              />

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-bold text-gray-800 mb-2">使い方</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• グラフ上のノードをクリックして選択</li>
                  <li>• 🎯 親ノードに設定：選択したノードを中心に階層を再構築</li>
                  <li>• 👁️ 非表示：一時的に階層から除外</li>
                  <li>• 🗑️ 削除：完全に削除</li>
                  <li>• 類似度閾値を調整して表示される子ノードを変更</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
