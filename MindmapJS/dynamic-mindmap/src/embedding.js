// src/embedding.js
import { pipeline } from '@xenova/transformers';

let embedder = null;

/**
 * 埋め込みモデルの初期化（初回のみ）
 * Xenova/multilingual-e5-small: 日本語対応の軽量モデル
 */
export async function initEmbedding() {
  if (!embedder) {
    console.log('🔄 埋め込みモデルをロード中...');
    console.time('モデルロード時間');
    
    try {
      embedder = await pipeline(
        'feature-extraction',
        'Xenova/multilingual-e5-small',
        { quantized: true }  // 軽量化版を使用
      );
      
      console.timeEnd('モデルロード時間');
      console.log('✅ 埋め込みモデルのロード完了！');
    } catch (error) {
      console.error('❌ モデルロードエラー:', error);
      throw error;
    }
  }
  return embedder;
}

/**
 * テキストから埋め込みベクトルを生成
 * @param {string} text - 入力テキスト
 * @returns {Promise<number[]>} 384次元の埋め込みベクトル
 */
export async function getEmbedding(text) {
  try {
    const model = await initEmbedding();
    
    const output = await model(text, {
      pooling: 'mean',      // 平均プーリング
      normalize: true       // ベクトル正規化
    });
    
    return Array.from(output.data);
  } catch (error) {
    console.error(`❌ 埋め込み生成エラー (text: "${text}"):`, error);
    throw error;
  }
}

/**
 * 複数のテキストから埋め込みベクトルを一括生成
 * @param {string[]} texts - テキストの配列
 * @returns {Promise<number[][]>} 埋め込みベクトルの配列
 */
export async function getBatchEmbeddings(texts) {
  console.log(`📊 ${texts.length}個のテキストから埋め込みを生成中...`);
  console.time('バッチ埋め込み生成');
  
  try {
    const model = await initEmbedding();
    const embeddings = [];
    
    for (let i = 0; i < texts.length; i++) {
      const output = await model(texts[i], {
        pooling: 'mean',
        normalize: true
      });
      embeddings.push(Array.from(output.data));
      
      // 進捗表示
      if ((i + 1) % 5 === 0 || i === texts.length - 1) {
        console.log(`  ${i + 1}/${texts.length} 完了`);
      }
    }
    
    console.timeEnd('バッチ埋め込み生成');
    console.log('✅ バッチ埋め込み生成完了！');
    
    return embeddings;
  } catch (error) {
    console.error('❌ バッチ埋め込み生成エラー:', error);
    throw error;
  }
}
