// src/hierarchy.js
import { cosineSimilarity } from './similarity.js';

/**
 * 動的階層構造を構築
 * @param {Object} rootNode - ルートノード
 * @param {Object[]} allNodes - 全ノード
 * @param {Set<number>} hiddenIds - 非表示ノードのIDセット
 * @param {number} maxDepth - 最大階層の深さ
 * @param {number} threshold - 類似度の閾値
 * @returns {Object} 階層構造のツリー
 */
export function buildDynamicHierarchy(rootNode, allNodes, hiddenIds = new Set(), maxDepth = 3, threshold = 0.6) {
  if (!rootNode) {
    console.error('rootNodeが無効です');
    return null;
  }

  const used = new Set([rootNode.id]);
  
  /**
   * 再帰的に階層を構築
   */
  function buildLevel(parentNode, currentDepth) {
    if (currentDepth >= maxDepth) {
      return [];
    }
    
    // 親ノードと類似度が高い子ノードを選択
    const candidates = allNodes
      .filter(node => !used.has(node.id) && !hiddenIds.has(node.id))
      .map(node => ({
        ...node,
        similarity: cosineSimilarity(parentNode.vector, node.vector)
      }))
      .filter(node => node.similarity > threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);  // 各親から最大3つの子
    
    // 使用済みマーク
    candidates.forEach(node => used.add(node.id));
    
    // 再帰的に子階層を構築
    return candidates.map(child => ({
      ...child,
      depth: currentDepth + 1,
      children: buildLevel(child, currentDepth + 1)
    }));
  }
  
  const hierarchy = {
    ...rootNode,
    depth: 0,
    children: buildLevel(rootNode, 0)
  };
  
  console.log('📊 階層構造:', {
    root: hierarchy.text,
    totalNodesInTree: countNodes(hierarchy),
    maxDepth: getMaxDepth(hierarchy)
  });
  
  return hierarchy;
}

/**
 * ツリー内のノード総数をカウント
 */
function countNodes(node) {
  if (!node.children || node.children.length === 0) {
    return 1;
  }
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

/**
 * ツリーの最大深さを取得
 */
function getMaxDepth(node, currentDepth = 0) {
  if (!node.children || node.children.length === 0) {
    return currentDepth;
  }
  return Math.max(...node.children.map(child => getMaxDepth(child, currentDepth + 1)));
}

/**
 * 階層構造をCytoscape用のフラットな要素リストに変換
 * @param {Object} hierarchy - 階層構造のツリー
 * @returns {{ nodes: Array, edges: Array }}
 */
export function hierarchyToElements(hierarchy) {
  const nodes = [];
  const edges = [];
  
  function traverse(node, parentId = null) {
    nodes.push({
      data: {
        id: String(node.id),
        label: node.text,
        similarity: node.similarity,
        depth: node.depth
      }
    });
    
    if (parentId !== null) {
      edges.push({
        data: {
          id: `edge-${parentId}-${node.id}`,
          source: String(parentId),
          target: String(node.id)
        }
      });
    }
    
    if (node.children) {
      node.children.forEach(child => traverse(child, node.id));
    }
  }
  
  traverse(hierarchy);
  
  return { nodes, edges };
}
