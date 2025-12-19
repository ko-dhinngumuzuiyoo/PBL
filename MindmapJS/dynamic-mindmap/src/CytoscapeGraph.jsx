// src/CytoscapeGraph.jsx
import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';

export function CytoscapeGraph({ 
  nodes = [], 
  edges = [], 
  rootNodeId = null,
  selectedNodeId = null,
  onNodeClick,
  layoutMode = 'breadthfirst'  // 'breadthfirst' or 'cose'
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Cytoscapeインスタンスを作成
    cyRef.current = cytoscape({
      container: containerRef.current,
      
      elements: {
        nodes: nodes,
        edges: edges
      },

      style: [
        // ノードの基本スタイル
        {
          selector: 'node',
          style: {
            'background-color': '#93c5fd',
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
            'border-color': '#3b82f6'
          }
        },
        // ルートノードのスタイル
        {
          selector: `node[id="${rootNodeId}"]`,
          style: {
            'background-color': '#3b82f6',
            'width': 70,
            'height': 70,
            'font-size': '14px',
            'font-weight': 'bold',
            'border-width': 3,
            'border-color': '#1e40af'
          }
        },
        // 選択中のノードのスタイル
        {
          selector: `node[id="${selectedNodeId}"]`,
          style: {
            'background-color': '#a855f7',
            'border-width': 3,
            'border-color': '#7c3aed'
          }
        },
        // エッジのスタイル
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#94a3b8',
            'target-arrow-color': '#94a3b8',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.6
          }
        },
        // ホバー時
        {
          selector: 'node:active',
          style: {
            'overlay-opacity': 0.2,
            'overlay-color': '#3b82f6'
          }
        }
      ],

      layout: {
        name: layoutMode,
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 50,
        // breadthfirst用の設定
        directed: true,
        spacingFactor: 1.5,
        roots: rootNodeId ? `#${rootNodeId}` : undefined
      },

      // インタラクション設定
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.2
    });

    // ノードクリックイベント
    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target;
      const nodeId = parseInt(node.data('id'));
      console.log('ノードクリック:', node.data('label'), 'ID:', nodeId);
      if (onNodeClick) {
        onNodeClick(nodeId);
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
  }, [nodes, edges, rootNodeId, selectedNodeId, layoutMode, onNodeClick]);

  // レイアウトの再適用
  useEffect(() => {
    if (cyRef.current && nodes.length > 0) {
      const layout = cyRef.current.layout({
        name: layoutMode,
        animate: true,
        animationDuration: 500,
        fit: true,
        padding: 50,
        directed: true,
        spacingFactor: 1.5,
        roots: rootNodeId ? `#${rootNodeId}` : undefined
      });
      
      layout.run();
    }
  }, [layoutMode, rootNodeId]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full bg-gray-50 rounded-xl border-2 border-gray-200"
      style={{ minHeight: '600px' }}
    />
  );
}
