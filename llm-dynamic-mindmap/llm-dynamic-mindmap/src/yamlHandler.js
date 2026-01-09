// src/yamlHandler.js
import yaml from 'js-yaml';

/**
 * YAMLテキストをパースしてJavaScriptオブジェクトに変換
 * @param {string} yamlText - YAMLテキスト
 * @returns {Object} パースされたオブジェクト
 */
export function parseYaml(yamlText) {
  try {
    return yaml.load(yamlText);
  } catch (error) {
    console.error('YAML パースエラー:', error);
    throw error;
  }
}

/**
 * JavaScriptオブジェクトをYAML文字列に変換
 * @param {Object} obj - 変換するオブジェクト
 * @returns {string} YAML文字列
 */
export function stringifyYaml(obj) {
  try {
    return yaml.dump(obj, {
      indent: 2,
      lineWidth: 120,
      noRefs: true
    });
  } catch (error) {
    console.error('YAML 変換エラー:', error);
    throw error;
  }
}

/**
 * YAML形式のグラフデータをCytoscape形式に変換
 * @param {Object} yamlGraph - YAML形式のグラフデータ
 * @returns {{ nodes: Array, edges: Array }} Cytoscape形式の要素
 */
export function yamlToCytoscapeElements(yamlGraph) {
  const nodes = [];
  const edges = [];
  
  // ノードの変換
  if (yamlGraph.nodes && Array.isArray(yamlGraph.nodes)) {
    yamlGraph.nodes.forEach(node => {
      nodes.push({
        data: {
          id: String(node.id),
          label: node.label || node.id,
          depth: node.depth || 0,
          visible: node.visible !== false,
          expanded: node.expanded || false,
          ...node // その他のプロパティも保持
        }
      });
    });
  }
  
  // エッジの変換
  if (yamlGraph.edges && Array.isArray(yamlGraph.edges)) {
    yamlGraph.edges.forEach((edge, index) => {
      edges.push({
        data: {
          id: edge.id || `edge-${edge.source}-${edge.target}-${index}`,
          source: String(edge.source),
          target: String(edge.target),
          relation: edge.relation || '',
          weight: edge.weight || 1.0
        }
      });
    });
  }
  
  return { nodes, edges };
}

/**
 * Cytoscape形式の要素をYAML形式に変換
 * @param {{ nodes: Array, edges: Array }} elements - Cytoscape形式の要素
 * @param {Object} metadata - メタデータ（オプション）
 * @returns {Object} YAML形式のグラフデータ
 */
export function cytoscapeElementsToYaml(elements, metadata = {}) {
  const yamlGraph = {
    metadata: {
      title: metadata.title || 'マインドマップ',
      description: metadata.description || '',
      created_at: new Date().toISOString(),
      ...metadata
    },
    nodes: [],
    edges: []
  };
  
  // ノードの変換
  if (elements.nodes && Array.isArray(elements.nodes)) {
    elements.nodes.forEach(node => {
      const nodeData = node.data || node;
      yamlGraph.nodes.push({
        id: nodeData.id,
        label: nodeData.label,
        depth: nodeData.depth || 0,
        visible: nodeData.visible !== false,
        expanded: nodeData.expanded || false
      });
    });
  }
  
  // エッジの変換
  if (elements.edges && Array.isArray(elements.edges)) {
    elements.edges.forEach(edge => {
      const edgeData = edge.data || edge;
      yamlGraph.edges.push({
        source: edgeData.source,
        target: edgeData.target,
        relation: edgeData.relation || ''
      });
    });
  }
  
  return yamlGraph;
}

/**
 * YAML形式のスタイル定義をCytoscape形式に変換
 * @param {Object} yamlStyles - YAML形式のスタイル定義
 * @returns {Array} Cytoscape形式のスタイルシート
 */
export function yamlStylesToCytoscape(yamlStyles) {
  const stylesheet = [];
  
  for (const [key, value] of Object.entries(yamlStyles)) {
    if (value && value.selector && value.style) {
      stylesheet.push({
        selector: value.selector,
        style: value.style
      });
    }
  }
  
  return stylesheet;
}

/**
 * 設定YAMLからアプリケーション設定を読み込む
 * @param {string} configYaml - 設定YAMLテキスト
 * @returns {Object} 設定オブジェクト
 */
export function loadConfig(configYaml) {
  const config = parseYaml(configYaml);
  
  return {
    app: config.app || {},
    llm: config.llm || { provider: 'mock' },
    prompts: config.prompts || {},
    graph: config.graph || {},
    nodeColors: config.node_colors || {},
    similarity: config.similarity || { default_threshold: 0.6 }
  };
}

/**
 * グラフデータをYAMLファイルとしてダウンロード
 * @param {Object} graphData - グラフデータ
 * @param {string} filename - ファイル名
 */
export function downloadGraphAsYaml(graphData, filename = 'mindmap.yaml') {
  const yamlContent = stringifyYaml(graphData);
  const blob = new Blob([yamlContent], { type: 'text/yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * YAMLファイルを読み込む
 * @param {File} file - ファイルオブジェクト
 * @returns {Promise<Object>} パースされたYAMLデータ
 */
export function loadYamlFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const yamlData = parseYaml(e.target.result);
        resolve(yamlData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
    reader.readAsText(file);
  });
}
