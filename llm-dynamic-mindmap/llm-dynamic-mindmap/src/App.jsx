// src/App.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { CytoscapeGraph } from './CytoscapeGraph';
import { GraphManager } from './graphManager.js';
import { parseYaml, cytoscapeElementsToYaml, downloadGraphAsYaml, loadYamlFile } from './yamlHandler.js';

// 設定とデータのインポート（Viteのraw import）
import configYaml from '../config/config.yaml?raw';
import stylesYaml from '../config/styles.yaml?raw';
import initialGraphYaml from '../data/initial_graph.yaml?raw';

function App() {
  // 設定の読み込み
  const config = useMemo(() => parseYaml(configYaml), []);
  const initialGraph = useMemo(() => parseYaml(initialGraphYaml), []);
  
  // 状態管理
  const [graphManager, setGraphManager] = useState(null);
  const [elements, setElements] = useState({ nodes: [], edges: [] });
  const [rootNodeId, setRootNodeId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [layoutMode, setLayoutMode] = useState('cose');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('初期化中...');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 入力状態
  const [newKeyword, setNewKeyword] = useState('');
  const [llmProvider, setLlmProvider] = useState('mock');
  const [apiKey, setApiKey] = useState('');

  // 初期化
  useEffect(() => {
    async function initialize() {
      try {
        setLoadingMessage('グラフマネージャーを初期化中...');
        console.log('🚀 アプリケーション初期化開始');
        
        // GraphManagerの初期化
        const manager = new GraphManager({
          llm: {
            provider: llmProvider,
            apiKey: apiKey,
            ...config.llm
          },
          prompts: config.prompts,
          nodeColors: config.node_colors
        });
        
        setLoadingMessage('グラフデータを読み込み中...');
        
        // 初期データの読み込み
        await manager.initFromData(initialGraph);
        
        setGraphManager(manager);
        
        // Cytoscape用要素を生成
        const cyElements = manager.toCytoscapeElements();
        setElements(cyElements);
        
        // ルートノードを設定
        const root = manager.findRootNode();
        if (root) {
          setRootNodeId(root.id);
        }
        
        console.log('✅ 初期化完了！');
        setIsLoading(false);
        
      } catch (error) {
        console.error('❌ 初期化エラー:', error);
        setLoadingMessage(`エラー: ${error.message}`);
      }
    }
    
    initialize();
  }, []);

  // LLMプロバイダー変更時
  useEffect(() => {
    if (graphManager) {
      graphManager.initLLMService({
        provider: llmProvider,
        apiKey: apiKey,
        ...config.llm
      });
    }
  }, [llmProvider, apiKey, graphManager]);

  // 要素を更新する関数
  const updateElements = useCallback(() => {
    if (graphManager) {
      const cyElements = graphManager.toCytoscapeElements();
      setElements(cyElements);
    }
  }, [graphManager]);

  // ノードクリックハンドラ
  const handleNodeClick = useCallback((nodeId) => {
    console.log('ノード選択:', nodeId);
    setSelectedNodeId(nodeId);
  }, []);

  // ノードダブルクリック（深掘り）
  const handleNodeDoubleClick = useCallback(async (nodeId) => {
    if (!graphManager || isProcessing) return;
    
    try {
      setIsProcessing(true);
      setLoadingMessage('ノードを深掘り中...');
      
      await graphManager.deepDiveNode(nodeId);
      updateElements();
      
    } catch (error) {
      console.error('深掘りエラー:', error);
      alert(`エラー: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setLoadingMessage('');
    }
  }, [graphManager, isProcessing, updateElements]);

  // キーワード追加
  const handleAddKeyword = useCallback(async () => {
    if (!graphManager || !newKeyword.trim() || isProcessing) return;
    
    try {
      setIsProcessing(true);
      setLoadingMessage('関連語を生成中...');
      
      // 選択中のノードを親として追加
      const parentId = selectedNodeId || rootNodeId;
      
      await graphManager.generateRelatedNodes(newKeyword.trim(), parentId);
      updateElements();
      
      setNewKeyword('');
      
    } catch (error) {
      console.error('キーワード追加エラー:', error);
      alert(`エラー: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setLoadingMessage('');
    }
  }, [graphManager, newKeyword, selectedNodeId, rootNodeId, isProcessing, updateElements]);

  // 親ノードに設定
  const handleSetAsRoot = useCallback(() => {
    if (selectedNodeId) {
      console.log(`親ノードに設定: ${selectedNodeId}`);
      setRootNodeId(selectedNodeId);
    }
  }, [selectedNodeId]);

  // ノード非表示
  const handleHideNode = useCallback(() => {
    if (graphManager && selectedNodeId) {
      graphManager.hideNode(selectedNodeId);
      updateElements();
      setSelectedNodeId(null);
    }
  }, [graphManager, selectedNodeId, updateElements]);

  // ノード削除
  const handleDeleteNode = useCallback(() => {
    if (graphManager && selectedNodeId) {
      const node = graphManager.getNode(selectedNodeId);
      if (confirm(`「${node?.label}」を削除しますか？`)) {
        graphManager.deleteNode(selectedNodeId);
        updateElements();
        
        if (rootNodeId === selectedNodeId) {
          const newRoot = graphManager.findRootNode();
          setRootNodeId(newRoot?.id || null);
        }
        
        setSelectedNodeId(null);
      }
    }
  }, [graphManager, selectedNodeId, rootNodeId, updateElements]);

  // 深掘りボタン
  const handleDeepDive = useCallback(async () => {
    if (selectedNodeId) {
      await handleNodeDoubleClick(selectedNodeId);
    }
  }, [selectedNodeId, handleNodeDoubleClick]);

  // 全ノード表示
  const handleShowAll = useCallback(() => {
    if (graphManager) {
      graphManager.showAllNodes();
      updateElements();
    }
  }, [graphManager, updateElements]);

  // YAML エクスポート
  const handleExport = useCallback(() => {
    if (graphManager) {
      const yamlData = graphManager.toYamlData();
      downloadGraphAsYaml(yamlData, 'mindmap_export.yaml');
    }
  }, [graphManager]);

  // YAML インポート
  const handleImport = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setIsProcessing(true);
      setLoadingMessage('ファイルを読み込み中...');
      
      const yamlData = await loadYamlFile(file);
      
      // 新しいGraphManagerを作成
      const manager = new GraphManager({
        llm: {
          provider: llmProvider,
          apiKey: apiKey,
          ...config.llm
        },
        prompts: config.prompts,
        nodeColors: config.node_colors
      });
      
      await manager.initFromData(yamlData);
      setGraphManager(manager);
      
      const cyElements = manager.toCytoscapeElements();
      setElements(cyElements);
      
      const root = manager.findRootNode();
      if (root) {
        setRootNodeId(root.id);
      }
      
    } catch (error) {
      console.error('インポートエラー:', error);
      alert(`インポートエラー: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setLoadingMessage('');
    }
  }, [llmProvider, apiKey, config]);

  // 選択中のノード情報
  const selectedNode = selectedNodeId && graphManager 
    ? graphManager.getNode(selectedNodeId) 
    : null;

  // ローディング画面
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-xl text-white">{loadingMessage}</p>
          <p className="text-sm text-slate-400 mt-2">埋め込みモデルのロードには数秒かかります...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-slate-800/90 backdrop-blur rounded-2xl shadow-xl p-6 mb-6 border border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-2">
            🧠 LLM動的マインドマップ
          </h1>
          <p className="text-slate-400">
            埋め込みベクトル + LLM連携のインタラクティブ知識グラフ
          </p>
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* 左パネル */}
          <div className="col-span-1 space-y-4">
            {/* キーワード入力 */}
            <div className="bg-slate-800/90 backdrop-blur rounded-xl shadow-lg p-4 border border-slate-700">
              <h3 className="font-bold text-white mb-3">➕ キーワード追加</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                  placeholder="新しいキーワード..."
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isProcessing}
                />
                <button
                  onClick={handleAddKeyword}
                  disabled={isProcessing || !newKeyword.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  {isProcessing ? '処理中...' : '🔍 LLMで展開'}
                </button>
              </div>
            </div>

            {/* LLM設定 */}
            <div className="bg-slate-800/90 backdrop-blur rounded-xl shadow-lg p-4 border border-slate-700">
              <h3 className="font-bold text-white mb-3">🤖 LLM設定</h3>
              <div className="space-y-2">
                <select
                  value={llmProvider}
                  onChange={(e) => setLlmProvider(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mock">モック（デモ用）</option>
                  <option value="anthropic">Claude API</option>
                  <option value="openai">OpenAI API</option>
                </select>
                {llmProvider !== 'mock' && (
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="APIキー..."
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>

            {/* レイアウト設定 */}
            <div className="bg-slate-800/90 backdrop-blur rounded-xl shadow-lg p-4 border border-slate-700">
              <h3 className="font-bold text-white mb-3">📐 レイアウト</h3>
              <select
                value={layoutMode}
                onChange={(e) => setLayoutMode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cose">力学モデル (cose)</option>
                <option value="breadthfirst">階層 (breadthfirst)</option>
                <option value="circle">円形 (circle)</option>
                <option value="concentric">同心円 (concentric)</option>
                <option value="grid">グリッド (grid)</option>
              </select>
            </div>

            {/* 選択中のノード操作 */}
            {selectedNode && (
              <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl shadow-lg p-4 border-2 border-blue-500">
                <h3 className="font-bold text-white mb-1">
                  選択中: {selectedNode.label}
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  深さ: {selectedNode.depth} 
                  {selectedNode.llmGenerated && ' | 🤖 LLM生成'}
                </p>
                <div className="space-y-2">
                  <button
                    onClick={handleDeepDive}
                    disabled={isProcessing}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    🔍 深掘り
                  </button>
                  <button
                    onClick={handleSetAsRoot}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    🎯 ルートに設定
                  </button>
                  <button
                    onClick={handleHideNode}
                    className="w-full bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    👁️ 非表示
                  </button>
                  <button
                    onClick={handleDeleteNode}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    🗑️ 削除
                  </button>
                </div>
              </div>
            )}

            {/* 統計情報 */}
            <div className="bg-slate-800/90 backdrop-blur rounded-xl shadow-lg p-4 border border-slate-700">
              <h3 className="font-bold text-white mb-3">📊 統計情報</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">ノード数:</span>
                  <span className="font-bold text-blue-400">{elements.nodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">エッジ数:</span>
                  <span className="font-bold text-green-400">{elements.edges.length}</span>
                </div>
              </div>
            </div>

            {/* ファイル操作 */}
            <div className="bg-slate-800/90 backdrop-blur rounded-xl shadow-lg p-4 border border-slate-700">
              <h3 className="font-bold text-white mb-3">💾 ファイル</h3>
              <div className="space-y-2">
                <button
                  onClick={handleExport}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  📤 YAML エクスポート
                </button>
                <label className="block w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition text-center cursor-pointer">
                  📥 YAML インポート
                  <input
                    type="file"
                    accept=".yaml,.yml"
                    onChange={handleImport}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={handleShowAll}
                  className="w-full bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  👁️ 全表示
                </button>
              </div>
            </div>
          </div>

          {/* グラフ表示エリア */}
          <div className="col-span-3">
            <div className="bg-slate-800/90 backdrop-blur rounded-2xl shadow-xl p-6 border border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  📊 知識グラフ
                  {rootNodeId && graphManager && (
                    <span className="text-blue-400 ml-2">
                      (ルート: {graphManager.getNode(rootNodeId)?.label})
                    </span>
                  )}
                </h2>
                {isProcessing && (
                  <div className="flex items-center text-yellow-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
                    {loadingMessage}
                  </div>
                )}
              </div>
              
              <CytoscapeGraph
                nodes={elements.nodes}
                edges={elements.edges}
                rootNodeId={rootNodeId}
                selectedNodeId={selectedNodeId}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                layoutMode={layoutMode}
              />

              <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                <h3 className="font-bold text-white mb-2">💡 使い方</h3>
                <ul className="text-sm text-slate-300 space-y-1">
                  <li>• <strong>クリック</strong>: ノードを選択</li>
                  <li>• <strong>ダブルクリック</strong>: LLMでノードを深掘り</li>
                  <li>• <strong>キーワード追加</strong>: 新しい概念をLLMで展開</li>
                  <li>• <strong>YAML エクスポート</strong>: グラフをYAML形式で保存</li>
                  <li>• モックモードではAPIキー不要でデモ動作します</li>
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
