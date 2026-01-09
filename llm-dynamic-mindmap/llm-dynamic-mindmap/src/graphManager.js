// src/graphManager.js
import { getEmbedding, getBatchEmbeddings } from './embedding.js';
import { cosineSimilarity, findSimilarNodes } from './similarity.js';
import { createLLMService } from './llmService.js';

/**
 * グラフマネージャークラス
 * ノード・エッジの管理とLLM連携を担当
 */
export class GraphManager {
  constructor(config = {}) {
    this.nodes = new Map(); // id -> node
    this.edges = new Map(); // id -> edge
    this.config = config;
    this.nextNodeId = 1;
    this.nextEdgeId = 1;
    this.llmService = null;
    this.prompts = config.prompts || {};
    this.nodeColors = config.nodeColors || {};
    
    // LLMサービスの初期化
    if (config.llm) {
      this.initLLMService(config.llm);
    }
  }
  
  /**
   * LLMサービスを初期化
   */
  initLLMService(llmConfig) {
    const provider = llmConfig.provider || 'mock';
    const providerConfig = llmConfig[provider] || {};
    
    this.llmService = createLLMService(provider, {
      ...providerConfig,
      apiKey: llmConfig.apiKey || providerConfig.apiKey
    });
    
    console.log(`🤖 LLMサービス初期化: ${provider}`);
  }
  
  /**
   * 初期データからグラフを構築
   * @param {Object} graphData - YAML形式のグラフデータ
   */
  async initFromData(graphData) {
    console.log('📊 グラフデータを初期化中...');
    
    // ノードの追加
    if (graphData.nodes && Array.isArray(graphData.nodes)) {
      const texts = graphData.nodes.map(n => n.label || n.id);
      
      // 埋め込みベクトルを一括生成
      console.log('🔄 埋め込みベクトルを生成中...');
      const vectors = await getBatchEmbeddings(texts);
      
      graphData.nodes.forEach((node, i) => {
        this.addNode({
          id: node.id,
          label: node.label || node.id,
          depth: node.depth || 0,
          vector: vectors[i],
          visible: node.visible !== false,
          expanded: node.expanded || false
        });
      });
    }
    
    // エッジの追加
    if (graphData.edges && Array.isArray(graphData.edges)) {
      graphData.edges.forEach(edge => {
        this.addEdge({
          source: edge.source,
          target: edge.target,
          relation: edge.relation || ''
        });
      });
    }
    
    console.log(`✅ グラフ初期化完了: ${this.nodes.size}ノード, ${this.edges.size}エッジ`);
  }
  
  /**
   * ノードを追加
   * @param {Object} nodeData - ノードデータ
   * @returns {Object} 追加されたノード
   */
  addNode(nodeData) {
    const id = nodeData.id || `node_${this.nextNodeId++}`;
    
    const node = {
      id,
      label: nodeData.label || id,
      depth: nodeData.depth || 0,
      vector: nodeData.vector || null,
      color: this.getColorForDepth(nodeData.depth || 0),
      visible: nodeData.visible !== false,
      expanded: nodeData.expanded || false,
      llmGenerated: nodeData.llmGenerated || false,
      createdAt: new Date().toISOString(),
      ...nodeData
    };
    
    this.nodes.set(id, node);
    return node;
  }
  
  /**
   * エッジを追加
   * @param {Object} edgeData - エッジデータ
   * @returns {Object} 追加されたエッジ
   */
  addEdge(edgeData) {
    const id = edgeData.id || `edge_${this.nextEdgeId++}`;
    
    // 重複チェック
    const existingEdge = this.findEdge(edgeData.source, edgeData.target);
    if (existingEdge) {
      console.log(`⚠️ エッジ重複: ${edgeData.source} - ${edgeData.target}`);
      return existingEdge;
    }
    
    const edge = {
      id,
      source: String(edgeData.source),
      target: String(edgeData.target),
      relation: edgeData.relation || '',
      weight: edgeData.weight || 1.0,
      ...edgeData
    };
    
    this.edges.set(id, edge);
    return edge;
  }
  
  /**
   * エッジを検索（無向グラフとして）
   */
  findEdge(source, target) {
    for (const edge of this.edges.values()) {
      if ((edge.source === String(source) && edge.target === String(target)) ||
          (edge.source === String(target) && edge.target === String(source))) {
        return edge;
      }
    }
    return null;
  }
  
  /**
   * ノードを取得
   * @param {string} id - ノードID
   */
  getNode(id) {
    return this.nodes.get(String(id));
  }
  
  /**
   * 全ノードを配列で取得
   */
  getAllNodes() {
    return Array.from(this.nodes.values());
  }
  
  /**
   * 全エッジを配列で取得
   */
  getAllEdges() {
    return Array.from(this.edges.values());
  }
  
  /**
   * ノードの隣接ノードを取得
   * @param {string} nodeId - ノードID
   */
  getNeighbors(nodeId) {
    const neighbors = [];
    
    for (const edge of this.edges.values()) {
      if (edge.source === String(nodeId)) {
        const targetNode = this.nodes.get(edge.target);
        if (targetNode) neighbors.push(targetNode);
      } else if (edge.target === String(nodeId)) {
        const sourceNode = this.nodes.get(edge.source);
        if (sourceNode) neighbors.push(sourceNode);
      }
    }
    
    return neighbors;
  }
  
  /**
   * 深さに応じた色を取得
   */
  getColorForDepth(depth) {
    const colorKey = `depth_${depth}`;
    return this.nodeColors[colorKey] || this.nodeColors.default || '#6b7280';
  }
  
  /**
   * Cytoscape形式の要素を生成
   */
  toCytoscapeElements() {
    const nodes = [];
    const edges = [];
    
    for (const node of this.nodes.values()) {
      if (node.visible !== false) {
        nodes.push({
          data: {
            id: String(node.id),
            label: node.label,
            depth: node.depth,
            color: node.color,
            llmGenerated: node.llmGenerated
          }
        });
      }
    }
    
    for (const edge of this.edges.values()) {
      const sourceNode = this.nodes.get(edge.source);
      const targetNode = this.nodes.get(edge.target);
      
      if (sourceNode?.visible !== false && targetNode?.visible !== false) {
        edges.push({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            relation: edge.relation
          }
        });
      }
    }
    
    return { nodes, edges };
  }
  
  /**
   * LLMを使って関連ノードを生成
   * @param {string} keyword - キーワード
   * @param {string} parentId - 親ノードID（オプション）
   */
  async generateRelatedNodes(keyword, parentId = null) {
    if (!this.llmService) {
      throw new Error('LLMサービスが初期化されていません');
    }
    
    console.log(`🔍 LLMで関連語を生成: "${keyword}"`);
    
    // LLMで関連語を取得
    const promptTemplate = this.prompts.expand_keyword || 
      'キーワード: {keyword}\n関連する概念を5〜8個、JSON形式で出力してください。';
    
    const relatedWords = await this.llmService.generateRelatedWords(keyword, promptTemplate);
    
    if (!relatedWords || relatedWords.length === 0) {
      console.warn('⚠️ LLMから関連語が返されませんでした');
      return [];
    }
    
    // 親ノードの深さを取得
    const parentNode = parentId ? this.getNode(parentId) : null;
    const parentDepth = parentNode ? parentNode.depth : -1;
    
    // 埋め込みベクトルを生成
    const texts = relatedWords.map(w => w.word);
    const vectors = await getBatchEmbeddings(texts);
    
    // ノードを追加
    const newNodes = [];
    for (let i = 0; i < relatedWords.length; i++) {
      const { word, relation } = relatedWords[i];
      
      // 既存ノードとの重複チェック
      const existingNode = this.findNodeByLabel(word);
      if (existingNode) {
        // 既存ノードとのエッジを追加
        if (parentId && !this.findEdge(parentId, existingNode.id)) {
          this.addEdge({
            source: parentId,
            target: existingNode.id,
            relation
          });
        }
        continue;
      }
      
      const node = this.addNode({
        label: word,
        depth: parentDepth + 1,
        vector: vectors[i],
        llmGenerated: true
      });
      
      newNodes.push(node);
      
      // 親ノードとのエッジを追加
      if (parentId) {
        this.addEdge({
          source: parentId,
          target: node.id,
          relation
        });
      }
    }
    
    console.log(`✅ ${newNodes.length}個の新規ノードを追加`);
    return newNodes;
  }
  
  /**
   * ノードを深掘り
   * @param {string} nodeId - ノードID
   */
  async deepDiveNode(nodeId) {
    const node = this.getNode(nodeId);
    if (!node) {
      throw new Error(`ノードが見つかりません: ${nodeId}`);
    }
    
    if (!this.llmService) {
      throw new Error('LLMサービスが初期化されていません');
    }
    
    // 既存の隣接ノードを取得
    const neighbors = this.getNeighbors(nodeId);
    const neighborLabels = neighbors.map(n => n.label);
    
    // ルートテーマを検索
    const rootNode = this.findRootNode();
    const rootTheme = rootNode ? rootNode.label : node.label;
    
    console.log(`🔍 ノード「${node.label}」を深掘り中...`);
    
    // LLMで深掘り
    const promptTemplate = this.prompts.deep_dive || 
      '中心テーマ: {root_theme}\n現在のノード: {current_node}\n既存の関連ノード: {existing_neighbors}\n新しい関連概念を提案してください。';
    
    const relatedWords = await this.llmService.deepDive(
      node,
      neighborLabels,
      rootTheme,
      promptTemplate
    );
    
    if (!relatedWords || relatedWords.length === 0) {
      console.warn('⚠️ 深掘り結果が空でした');
      return [];
    }
    
    // 埋め込みベクトルを生成して追加
    const texts = relatedWords.map(w => w.word);
    const vectors = await getBatchEmbeddings(texts);
    
    const newNodes = [];
    for (let i = 0; i < relatedWords.length; i++) {
      const { word, relation } = relatedWords[i];
      
      // 重複チェック
      const existingNode = this.findNodeByLabel(word);
      if (existingNode) {
        if (!this.findEdge(nodeId, existingNode.id)) {
          this.addEdge({
            source: nodeId,
            target: existingNode.id,
            relation
          });
        }
        continue;
      }
      
      const newNode = this.addNode({
        label: word,
        depth: node.depth + 1,
        vector: vectors[i],
        llmGenerated: true
      });
      
      newNodes.push(newNode);
      
      this.addEdge({
        source: nodeId,
        target: newNode.id,
        relation
      });
    }
    
    // ノードを展開済みにマーク
    node.expanded = true;
    
    console.log(`✅ 深掘り完了: ${newNodes.length}個の新規ノード`);
    return newNodes;
  }
  
  /**
   * ラベルでノードを検索
   */
  findNodeByLabel(label) {
    const lowerLabel = label.toLowerCase();
    for (const node of this.nodes.values()) {
      if (node.label.toLowerCase() === lowerLabel) {
        return node;
      }
    }
    return null;
  }
  
  /**
   * ルートノードを検索（depth=0のノード）
   */
  findRootNode() {
    for (const node of this.nodes.values()) {
      if (node.depth === 0) {
        return node;
      }
    }
    return this.nodes.values().next().value;
  }
  
  /**
   * 類似ノードを検索
   */
  findSimilarNodes(nodeId, threshold = 0.6) {
    const node = this.getNode(nodeId);
    if (!node || !node.vector) return [];
    
    return findSimilarNodes(node, this.getAllNodes(), threshold);
  }
  
  /**
   * ノードを削除
   */
  deleteNode(nodeId) {
    const node = this.nodes.get(String(nodeId));
    if (!node) return false;
    
    // 関連エッジを削除
    for (const [edgeId, edge] of this.edges.entries()) {
      if (edge.source === String(nodeId) || edge.target === String(nodeId)) {
        this.edges.delete(edgeId);
      }
    }
    
    this.nodes.delete(String(nodeId));
    return true;
  }
  
  /**
   * ノードを非表示
   */
  hideNode(nodeId) {
    const node = this.nodes.get(String(nodeId));
    if (node) {
      node.visible = false;
      return true;
    }
    return false;
  }
  
  /**
   * ノードを表示
   */
  showNode(nodeId) {
    const node = this.nodes.get(String(nodeId));
    if (node) {
      node.visible = true;
      return true;
    }
    return false;
  }
  
  /**
   * 全ノードを表示
   */
  showAllNodes() {
    for (const node of this.nodes.values()) {
      node.visible = true;
    }
  }
  
  /**
   * グラフをクリア
   */
  clear() {
    this.nodes.clear();
    this.edges.clear();
    this.nextNodeId = 1;
    this.nextEdgeId = 1;
  }
  
  /**
   * YAML形式でエクスポート
   */
  toYamlData() {
    return {
      metadata: {
        title: 'エクスポートされたマインドマップ',
        exportedAt: new Date().toISOString(),
        nodeCount: this.nodes.size,
        edgeCount: this.edges.size
      },
      nodes: this.getAllNodes().map(node => ({
        id: node.id,
        label: node.label,
        depth: node.depth,
        visible: node.visible,
        expanded: node.expanded,
        llmGenerated: node.llmGenerated
      })),
      edges: this.getAllEdges().map(edge => ({
        source: edge.source,
        target: edge.target,
        relation: edge.relation
      }))
    };
  }
}
