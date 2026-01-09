// src/similarity.js

/**
 * コサイン類似度を計算
 * @param {number[]} vec1 - ベクトル1
 * @param {number[]} vec2 - ベクトル2
 * @returns {number} 類似度（-1〜1、正規化済みなら0〜1）
 */
export function cosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    console.warn('無効なベクトル:', { 
      vec1Length: vec1?.length, 
      vec2Length: vec2?.length 
    });
    return 0;
  }

  const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
  const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
  
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }
  
  return dotProduct / (mag1 * mag2);
}

/**
 * ユークリッド距離を計算
 * @param {number[]} vec1 - ベクトル1
 * @param {number[]} vec2 - ベクトル2
 * @returns {number} 距離
 */
export function euclideanDistance(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    return Infinity;
  }
  
  const sumSquares = vec1.reduce((sum, val, i) => {
    const diff = val - vec2[i];
    return sum + diff * diff;
  }, 0);
  
  return Math.sqrt(sumSquares);
}

/**
 * ノードの類似度を計算して並び替え
 * @param {Object} targetNode - 基準ノード（vectorプロパティ必須）
 * @param {Object[]} allNodes - 全ノード
 * @param {number} threshold - 類似度の閾値（0-1）
 * @returns {Object[]} 類似度の高い順に並べたノード（閾値以上）
 */
export function findSimilarNodes(targetNode, allNodes, threshold = 0.6) {
  if (!targetNode || !targetNode.vector) {
    console.error('targetNodeまたはvectorが無効:', targetNode);
    return [];
  }

  const similarNodes = allNodes
    .filter(node => node.id !== targetNode.id && node.vector)  // 自分自身を除外
    .map(node => ({
      ...node,
      similarity: cosineSimilarity(targetNode.vector, node.vector)
    }))
    .filter(node => node.similarity >= threshold)  // 閾値以上
    .sort((a, b) => b.similarity - a.similarity);  // 類似度順

  return similarNodes;
}

/**
 * 全ノード間の類似度マトリックスを計算
 * @param {Object[]} nodes - ノード配列（vectorプロパティ必須）
 * @returns {Map<string, Map<string, number>>} 類似度マトリックス
 */
export function computeSimilarityMatrix(nodes) {
  const matrix = new Map();
  
  for (const nodeA of nodes) {
    if (!nodeA.vector) continue;
    
    const row = new Map();
    for (const nodeB of nodes) {
      if (!nodeB.vector || nodeA.id === nodeB.id) continue;
      row.set(nodeB.id, cosineSimilarity(nodeA.vector, nodeB.vector));
    }
    matrix.set(nodeA.id, row);
  }
  
  return matrix;
}

/**
 * 類似度に基づいてエッジを自動生成
 * @param {Object[]} nodes - ノード配列
 * @param {number} threshold - 類似度閾値
 * @param {number} maxEdgesPerNode - ノードあたりの最大エッジ数
 * @returns {Array} エッジ配列
 */
export function generateSimilarityEdges(nodes, threshold = 0.7, maxEdgesPerNode = 3) {
  const edges = [];
  const edgeSet = new Set(); // 重複防止
  
  for (const node of nodes) {
    if (!node.vector) continue;
    
    const similarNodes = findSimilarNodes(node, nodes, threshold);
    const topSimilar = similarNodes.slice(0, maxEdgesPerNode);
    
    for (const similar of topSimilar) {
      // 無向グラフとして扱う（A-B と B-A を同一視）
      const edgeKey = [node.id, similar.id].sort().join('-');
      
      if (!edgeSet.has(edgeKey)) {
        edges.push({
          source: node.id,
          target: similar.id,
          similarity: similar.similarity,
          relation: `類似度: ${(similar.similarity * 100).toFixed(1)}%`
        });
        edgeSet.add(edgeKey);
      }
    }
  }
  
  return edges;
}

/**
 * ノードのクラスタリング（簡易版）
 * @param {Object[]} nodes - ノード配列
 * @param {number} threshold - クラスタリング閾値
 * @returns {Array<Array>} クラスタの配列
 */
export function clusterNodes(nodes, threshold = 0.7) {
  const clusters = [];
  const assigned = new Set();
  
  for (const node of nodes) {
    if (assigned.has(node.id) || !node.vector) continue;
    
    const cluster = [node];
    assigned.add(node.id);
    
    // 類似ノードを同じクラスタに追加
    const similarNodes = findSimilarNodes(node, nodes, threshold);
    for (const similar of similarNodes) {
      if (!assigned.has(similar.id)) {
        cluster.push(similar);
        assigned.add(similar.id);
      }
    }
    
    clusters.push(cluster);
  }
  
  return clusters;
}
