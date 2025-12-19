// src/similarity.js

/**
 * コサイン類似度を計算
 * @param {number[]} vec1 - ベクトル1
 * @param {number[]} vec2 - ベクトル2
 * @returns {number} 類似度（0-1）
 */
export function cosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) {
    console.error('無効なベクトル:', { vec1Length: vec1?.length, vec2Length: vec2?.length });
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
 * ノードの類似度を計算して並び替え
 * @param {Object} targetNode - 基準ノード
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
    .filter(node => node.id !== targetNode.id)  // 自分自身を除外
    .map(node => ({
      ...node,
      similarity: cosineSimilarity(targetNode.vector, node.vector)
    }))
    .filter(node => node.similarity >= threshold)  // 閾値以上
    .sort((a, b) => b.similarity - a.similarity);  // 類似度順

  return similarNodes;
}
