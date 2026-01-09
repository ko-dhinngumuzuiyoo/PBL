// src/CytoscapeGraph.jsx
import { useEffect, useRef, useCallback } from 'react';
import cytoscape from 'cytoscape';

/**
 * Cytoscapeグラフ表示コンポーネント
 */
export function CytoscapeGraph({ 
  nodes = [], 
  edges = [], 
  rootNodeId = null,
  selectedNodeId = null,
  onNodeClick,
  onNodeDoubleClick,
  layoutMode = 'cose',
  stylesheet = null
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  // デフォルトスタイルシート
  const defaultStylesheet = [
    // ノードの基本スタイル
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'width': 50,
        'height': 50,
        'font-size': '12px',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#1e293b',
        'text-outline-width': 2,
        'text-outline-color': '#ffffff',
        'border-width': 2,
        'border-color': '#3b82f6',
        'transition-property': 'background-color, border-color, width, height',
        'transition-duration': '0.3s'
      }
    },
    // ルートノードのスタイル
    {
      selector: 'node.root',
      style: {
        'background-color': '#3b82f6',
        'width': 80,
        'height': 80,
        'font-size': '16px',
        'font-weight': 'bold',
        'border-width': 4,
        'border-color': '#1e40af',
        'z-index': 100
      }
    },
    // 選択中のノードのスタイル
    {
      selector: 'node.selected',
      style: {
        'border-width': 4,
        'border-color': '#f59e0b',
        'z-index': 99
      }
    },
    // LLM生成ノード
    {
      selector: 'node[llmGenerated]',
      style: {
        'border-style': 'dashed'
      }
    },
    // 新規追加ノード
    {
      selector: 'node.new',
      style: {
        'background-color': '#22c55e',
        'border-color': '#16a34a'
      }
    },
    // エッジの基本スタイル
    {
      selector: 'edge',
      style: {
        'width': 2,
        'line-color': '#94a3b8',
        'curve-style': 'bezier',
        'opacity': 0.7,
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#94a3b8',
        'arrow-scale': 0.8
      }
    },
    // 関係性ラベル付きエッジ
    {
      selector: 'edge[relation]',
      style: {
        'label': 'data(relation)',
        'font-size': '10px',
        'text-rotation': 'autorotate',
        'text-margin-y': -10,
        'color': '#64748b',
        'text-outline-color': '#ffffff',
        'text-outline-width': 1
      }
    },
    // ホバー時
    {
      selector: 'node:active',
      style: {
        'overlay-opacity': 0.2,
        'overlay-color': '#3b82f6'
      }
    },
    // 深さベースの色
    {
      selector: 'node[depth = 0]',
      style: { 'background-color': '#3b82f6' }
    },
    {
      selector: 'node[depth = 1]',
      style: { 'background-color': '#8b5cf6' }
    },
    {
      selector: 'node[depth = 2]',
      style: { 'background-color': '#ec4899' }
    },
    {
      selector: 'node[depth = 3]',
      style: { 'background-color': '#f97316' }
    }
  ];

  // グラフ初期化
  useEffect(() => {
    if (!containerRef.current) return;

    // Cytoscapeインスタンスを作成
    cyRef.current = cytoscape({
      container: containerRef.current,
      
      elements: {
        nodes: nodes,
        edges: edges
      },

      style: stylesheet || defaultStylesheet,

      layout: getLayoutConfig(layoutMode, rootNodeId),

      // インタラクション設定
      minZoom: 0.2,
      maxZoom: 3,
      wheelSensitivity: 0.2
    });

    // ノードクリックイベント
    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeId = node.data('id');
      console.log('ノードクリック:', node.data('label'), 'ID:', nodeId);
      if (onNodeClick) {
        onNodeClick(nodeId);
      }
    });

    // ノードダブルクリックイベント
    cyRef.current.on('dbltap', 'node', (evt) => {
      const node = evt.target;
      const nodeId = node.data('id');
      console.log('ノードダブルクリック:', node.data('label'));
      if (onNodeDoubleClick) {
        onNodeDoubleClick(nodeId);
      }
    });

    // 背景クリックで選択解除
    cyRef.current.on('tap', (evt) => {
      if (evt.target === cyRef.current) {
        console.log('背景クリック - 選択解除');
        if (onNodeClick) {
          onNodeClick(null);
        }
      }
    });

    console.log('✅ Cytoscapeグラフを初期化しました');
    console.log(`  ノード数: ${nodes.length}`);
    console.log(`  エッジ数: ${edges.length}`);
    console.log(`  レイアウト: ${layoutMode}`);

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, []); // 初回のみ

  // 要素の更新
  useEffect(() => {
    if (!cyRef.current) return;

    // 要素を更新
    cyRef.current.elements().remove();
    cyRef.current.add([...nodes, ...edges]);
    
    // ルートノードにクラスを追加
    if (rootNodeId) {
      cyRef.current.$(`node[id="${rootNodeId}"]`).addClass('root');
    }
    
    // 選択ノードにクラスを追加
    if (selectedNodeId) {
      cyRef.current.$(`node[id="${selectedNodeId}"]`).addClass('selected');
    }

    // レイアウトを実行
    const layout = cyRef.current.layout(getLayoutConfig(layoutMode, rootNodeId));
    layout.run();
    
  }, [nodes, edges, rootNodeId, selectedNodeId]);

  // レイアウトモードの変更
  useEffect(() => {
    if (!cyRef.current || nodes.length === 0) return;

    const layout = cyRef.current.layout(getLayoutConfig(layoutMode, rootNodeId));
    layout.run();
  }, [layoutMode]);

  // 選択状態の更新
  useEffect(() => {
    if (!cyRef.current) return;
    
    // 全ノードから選択クラスを削除
    cyRef.current.$('node').removeClass('selected');
    
    // 選択ノードにクラスを追加
    if (selectedNodeId) {
      cyRef.current.$(`node[id="${selectedNodeId}"]`).addClass('selected');
    }
  }, [selectedNodeId]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full bg-slate-50 rounded-xl border-2 border-slate-200"
      style={{ minHeight: '600px' }}
    />
  );
}

/**
 * レイアウト設定を取得
 */
function getLayoutConfig(layoutMode, rootNodeId) {
  const baseConfig = {
    animate: true,
    animationDuration: 500,
    fit: true,
    padding: 50
  };

  switch (layoutMode) {
    case 'breadthfirst':
      return {
        name: 'breadthfirst',
        ...baseConfig,
        directed: true,
        spacingFactor: 1.5,
        roots: rootNodeId ? `#${rootNodeId}` : undefined
      };
    
    case 'circle':
      return {
        name: 'circle',
        ...baseConfig,
        startAngle: 0,
        sweep: 2 * Math.PI
      };
    
    case 'grid':
      return {
        name: 'grid',
        ...baseConfig,
        rows: undefined,
        cols: undefined
      };
    
    case 'concentric':
      return {
        name: 'concentric',
        ...baseConfig,
        concentric: (node) => {
          const depth = node.data('depth') || 0;
          return 10 - depth;
        },
        levelWidth: () => 1
      };
    
    case 'cose':
    default:
      return {
        name: 'cose',
        ...baseConfig,
        nodeRepulsion: 8000,
        idealEdgeLength: 100,
        edgeElasticity: 100,
        nestingFactor: 1.2,
        gravity: 1,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      };
  }
}

export default CytoscapeGraph;
