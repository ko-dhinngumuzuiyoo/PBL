// src/llmService.js

/**
 * LLMサービスのベースクラス
 */
class BaseLLMService {
  constructor(config = {}) {
    this.config = config;
  }
  
  async generateRelatedWords(keyword, context = {}) {
    throw new Error('generateRelatedWords must be implemented');
  }
  
  async deepDive(nodeInfo, existingNeighbors, rootTheme) {
    throw new Error('deepDive must be implemented');
  }
  
  parseJsonResponse(text) {
    try {
      // JSONを含むテキストからJSON部分を抽出
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(text);
    } catch (error) {
      console.error('JSON パースエラー:', error);
      console.error('元のテキスト:', text);
      return [];
    }
  }
}

/**
 * Anthropic Claude APIサービス
 */
export class AnthropicService extends BaseLLMService {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || '';
    this.model = config.model || 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens || 1024;
    this.temperature = config.temperature || 0.7;
  }
  
  async callAPI(prompt) {
    if (!this.apiKey) {
      throw new Error('Anthropic API キーが設定されていません');
    }
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Anthropic API エラー: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    return data.content[0].text;
  }
  
  async generateRelatedWords(keyword, promptTemplate) {
    const prompt = promptTemplate.replace('{keyword}', keyword);
    const response = await this.callAPI(prompt);
    return this.parseJsonResponse(response);
  }
  
  async deepDive(nodeInfo, existingNeighbors, rootTheme, promptTemplate) {
    const prompt = promptTemplate
      .replace('{root_theme}', rootTheme)
      .replace('{current_node}', nodeInfo.label)
      .replace('{existing_neighbors}', existingNeighbors.join(', '));
    
    const response = await this.callAPI(prompt);
    return this.parseJsonResponse(response);
  }
}

/**
 * OpenAI APIサービス
 */
export class OpenAIService extends BaseLLMService {
  constructor(config = {}) {
    super(config);
    this.apiKey = config.apiKey || '';
    this.model = config.model || 'gpt-4o-mini';
    this.maxTokens = config.maxTokens || 1024;
    this.temperature = config.temperature || 0.7;
  }
  
  async callAPI(prompt) {
    if (!this.apiKey) {
      throw new Error('OpenAI API キーが設定されていません');
    }
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API エラー: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  async generateRelatedWords(keyword, promptTemplate) {
    const prompt = promptTemplate.replace('{keyword}', keyword);
    const response = await this.callAPI(prompt);
    return this.parseJsonResponse(response);
  }
  
  async deepDive(nodeInfo, existingNeighbors, rootTheme, promptTemplate) {
    const prompt = promptTemplate
      .replace('{root_theme}', rootTheme)
      .replace('{current_node}', nodeInfo.label)
      .replace('{existing_neighbors}', existingNeighbors.join(', '));
    
    const response = await this.callAPI(prompt);
    return this.parseJsonResponse(response);
  }
}

/**
 * モックLLMサービス（APIキー不要、デモ用）
 */
export class MockLLMService extends BaseLLMService {
  constructor(config = {}) {
    super(config);
    this.delay = config.delay || 500; // シミュレーション用の遅延
  }
  
  // トピック別のモックデータ
  mockData = {
    'default': [
      { word: '基礎概念', relation: '基本となる概念' },
      { word: '応用例', relation: '実践的な応用' },
      { word: '関連技術', relation: '技術的な関連' },
      { word: '歴史的背景', relation: '発展の経緯' },
      { word: '最新動向', relation: '現在のトレンド' }
    ],
    '機械学習': [
      { word: 'ニューラルネットワーク', relation: '基盤技術' },
      { word: 'データ前処理', relation: '必要なステップ' },
      { word: '特徴量エンジニアリング', relation: '重要な技術' },
      { word: 'モデル評価', relation: '品質確認' },
      { word: 'ハイパーパラメータ', relation: '調整要素' },
      { word: '過学習', relation: '注意すべき問題' }
    ],
    '深層学習': [
      { word: '勾配降下法', relation: '最適化手法' },
      { word: '活性化関数', relation: '構成要素' },
      { word: 'バッチ正規化', relation: '安定化技術' },
      { word: 'ドロップアウト', relation: '正則化手法' },
      { word: 'GPU計算', relation: '高速化技術' },
      { word: 'フレームワーク', relation: '開発ツール' }
    ],
    'Transformer': [
      { word: 'Self-Attention', relation: '核心メカニズム' },
      { word: 'Multi-Head Attention', relation: '拡張機能' },
      { word: 'Position Encoding', relation: '位置情報' },
      { word: 'Feed Forward', relation: '構成層' },
      { word: 'Layer Normalization', relation: '正規化' },
      { word: '大規模言語モデル', relation: '発展形' }
    ],
    'データサイエンス': [
      { word: '統計分析', relation: '基礎スキル' },
      { word: 'データ可視化', relation: '表現技術' },
      { word: 'SQL', relation: 'データ操作' },
      { word: 'Python', relation: '主要言語' },
      { word: 'Pandas', relation: 'データ処理' },
      { word: 'ビッグデータ', relation: '大規模処理' }
    ],
    'AI': [
      { word: '機械学習', relation: '主要技術' },
      { word: '自然言語処理', relation: '応用分野' },
      { word: 'コンピュータビジョン', relation: '応用分野' },
      { word: 'ロボティクス', relation: '応用分野' },
      { word: '倫理・法規制', relation: '社会的課題' },
      { word: 'AGI', relation: '将来目標' }
    ],
    'Python': [
      { word: 'NumPy', relation: '数値計算' },
      { word: 'Pandas', relation: 'データ分析' },
      { word: 'Matplotlib', relation: '可視化' },
      { word: 'Scikit-learn', relation: '機械学習' },
      { word: 'TensorFlow', relation: '深層学習' },
      { word: 'PyTorch', relation: '深層学習' }
    ]
  };
  
  async delay_ms(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  findBestMatch(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    for (const key of Object.keys(this.mockData)) {
      if (lowerKeyword.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerKeyword)) {
        return this.mockData[key];
      }
    }
    return this.mockData['default'];
  }
  
  async generateRelatedWords(keyword, promptTemplate = '') {
    console.log(`🤖 [Mock LLM] キーワード「${keyword}」の関連語を生成中...`);
    
    await this.delay_ms(this.delay);
    
    const results = this.findBestMatch(keyword);
    
    // ランダムに5-7個選択
    const count = 5 + Math.floor(Math.random() * 3);
    const shuffled = [...results].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    
    console.log(`✅ [Mock LLM] ${selected.length}個の関連語を生成しました`);
    return selected;
  }
  
  async deepDive(nodeInfo, existingNeighbors, rootTheme, promptTemplate = '') {
    console.log(`🤖 [Mock LLM] ノード「${nodeInfo.label}」を深掘り中...`);
    
    await this.delay_ms(this.delay);
    
    // 既存ノードを避けた結果を生成
    const allResults = this.findBestMatch(nodeInfo.label);
    const filtered = allResults.filter(item => 
      !existingNeighbors.some(n => 
        n.toLowerCase().includes(item.word.toLowerCase()) ||
        item.word.toLowerCase().includes(n.toLowerCase())
      )
    );
    
    // 結果が少ない場合はデフォルトから追加
    let results = filtered;
    if (results.length < 3) {
      const defaults = this.mockData['default'].filter(item =>
        !existingNeighbors.some(n => 
          n.toLowerCase().includes(item.word.toLowerCase())
        )
      );
      results = [...results, ...defaults].slice(0, 5);
    }
    
    // ランダムに選択
    const count = 4 + Math.floor(Math.random() * 3);
    const selected = [...results].sort(() => Math.random() - 0.5).slice(0, count);
    
    console.log(`✅ [Mock LLM] ${selected.length}個の深掘り結果を生成しました`);
    return selected;
  }
}

/**
 * LLMサービスファクトリー
 * @param {string} provider - プロバイダー名 (anthropic, openai, mock)
 * @param {Object} config - 設定
 * @returns {BaseLLMService} LLMサービスインスタンス
 */
export function createLLMService(provider, config = {}) {
  switch (provider.toLowerCase()) {
    case 'anthropic':
      return new AnthropicService(config);
    case 'openai':
      return new OpenAIService(config);
    case 'mock':
    default:
      return new MockLLMService(config);
  }
}
