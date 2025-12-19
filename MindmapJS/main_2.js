// main.js: グラフ累積と新規接続の表示ロジックを修正した最終コード

// ===============================================
// グローバル変数
// ===============================================
let cy; 
let loadGroupCounter = 0; 
let activeNode = null; 
const nodeMenu = document.getElementById('node-menu');

// ===============================================
// ユーティリティ関数
// ===============================================

/**
 * ランダムな16進数の色コードを生成する関数
 */
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

/**
 * CSVテキストをCytoscape.js形式のelementsオブジェクトに変換する
 */
function csvToJsonForCytoscape(csvText) {
    const lines = csvText.trim().split(/\r?\n/); 
    if (lines.length <= 1) {
        return { elements: { nodes: [], edges: [] } };
    }
    
    const dataLines = lines.slice(1);
    const nodesSet = new Set();
    const edges = [];
    const edgeSet = new Set(); // 修正: エッジの重複をチェックするためのSet
    let edgeCount = 0; // エッジに一意なIDを割り当てるためのカウンター

    dataLines.forEach(line => {
        const parts = line.split(',');
        if (parts.length < 2) return;
        
        const source = parts[0].trim();
        const target = parts[1].trim();

        if (source && target) {
            // 修正箇所: 無向グラフ対応のため、sourceとtargetをソートして一意なキーを作成
            const sortedNodes = [source, target].sort();
            const edgeKey = `${sortedNodes[0]}-${sortedNodes[1]}`; 

            // すでに同じエッジが存在するかチェック (A-B と B-A を同一視)
            if (!edgeSet.has(edgeKey)) {
                edgeCount++;
                edges.push({
                    data: {
                        id: `e${edgeCount}_${edgeKey}`, // 一意なエッジIDを付与
                        source: source,
                        target: target
                    }
                });
                edgeSet.add(edgeKey); // 新しいエッジを追加した後にSetに記録
            }
            nodesSet.add(source);
            nodesSet.add(target);
        }
    });

    const nodes = Array.from(nodesSet).map(id => ({
        data: { id: id }
    }));

    return {
        elements: {
            nodes: nodes,
            edges: edges
        }
    };
}
// ===============================================
// ノードメニュー操作関数
// ===============================================

/**
 * ノードの出次元ブランチ全体を非表示にする (たたむ)
 */
function collapseNeighbors(node) {
    if (!node) return;
    
    let elementsToHide = cy.collection(); //要素の入れ物を新しく作成する
    
    node.successors().forEach(ele => { // succrssors : 出力ノードの取得
        elementsToHide = elementsToHide.union(ele);
    });
    
    elementsToHide = elementsToHide.union(node.outgoers('edge')); // コレクション内のノードから出てくるエッジおよびそのターゲットを取得

    elementsToHide.hide();
    node.show(); 
    
    console.log(`ノード ${node.id()} 以降のブランチを非表示にしました。非表示要素数: ${elementsToHide.length}`);
}

/**
 * クリックノードの次ノード方向のブランチのみを再表示にする (広げる)
 */
function expandNeighbors(node) {
    if (!node) return;
    
    let elementsToExpand = cy.collection();
    
    node.successors().forEach(ele => {
        elementsToExpand = elementsToExpand.union(ele);
    });

    elementsToExpand = elementsToExpand.union(node.outgoers('edge'));

    elementsToExpand.filter(':hidden').show();
    node.show(); 
    
    console.log(`ノード ${node.id()} 以降のブランチを再表示しました。`);
}

/**
 * ノードのハイライトを切り替える
 */
function toggleHighlight(node) {
    if (!node) return;
    
    node.toggleClass('highlighted');
    console.log(`ノード ${node.id()} のハイライト状態を切り替えました。`);
}

/**
 * ノードメニューを非表示にする
 */
function hideMenu() {
    if (nodeMenu) {
        nodeMenu.style.display = 'none';
    }
    activeNode = null;
}

// ===============================================
// グラフ読み込み・追加関数
// ===============================================

/**
 * グラフを初期化するか、既存のグラフに要素を追加する関数。
 */
function loadGraphData(elements, loadColor) {
    if (!cy) {
        // --- グラフの初回初期化 ---
        cy = cytoscape({
            container: document.getElementById('cy'),
            elements: elements,
            style: [
                { selector: 'node', style: { 'background-color': 'data(loadColor)', 'label': 'data(id)', 'text-valign': 'center', 'color': '#000', 'font-size': '12px', 'padding': '10px' } },
                { selector: 'edge', style: { 'width': 3, 'line-color': '#ccc', 'curve-style': 'bezier' } }, // 修正: 矢印を削除し無向グラフに対応
                { selector: '.highlighted', style: { 'border-width': 4,'background-color':'#ff0000', 'border-color': '#ff0000', 'transition-property': 'background-color, border-color, border-width', 'transition-duration': '0.3s' } }
            ],
            layout: { name: 'breadthfirst', animate: true, fit: true, padding: 50 }
        });

        // ノードクリック時のイベントリスナー (メニュー表示)
        cy.on('tap', 'node', function(evt){
            hideMenu(); 
            activeNode = evt.target;
            const cyPosition = activeNode.renderedPosition();
            const cyContainer = cy.container();
            
            if (nodeMenu) {
                const menuWidth = nodeMenu.offsetWidth || 150; 
                const menuHeight = nodeMenu.offsetHeight || 90; 
                nodeMenu.style.left = (cyContainer.offsetLeft + cyPosition.x - (menuWidth / 2)) + 'px';
                nodeMenu.style.top = (cyContainer.offsetTop + cyPosition.y - menuHeight - 15) + 'px';
                nodeMenu.style.display = 'block';
            }
        });

        // グラフの背景クリックでメニューを非表示にする
        cy.on('tap', function(evt){
            if (evt.target === cy) {
                hideMenu();
            }
        });

    } else {
        // --- 既存のグラフに要素を追加 (累積) ---
        
        // 修正1: 新しい要素から既存の重複エッジをフィルタリング
        const newElements = { nodes: elements.nodes || [], edges: [] };
        const existingElements = cy.elements();

        // 既存のエッジのキー（ソート済みIDのペア）をSetに保持 (無向グラフの重複チェック用)
        const existingEdgeKeys = new Set();
        existingElements.edges().forEach(e => {
            const sorted = [e.source().id(), e.target().id()].sort();
            existingEdgeKeys.add(`${sorted[0]}-${sorted[1]}`);
        });

        // 新しいエッジをチェックし、重複しないもののみを`newElements`に追加
        (elements.edges || []).forEach(edgeData => {
            const source = edgeData.data.source;
            const target = edgeData.data.target;
            const sorted = [source, target].sort();
            const newEdgeKey = `${sorted[0]}-${sorted[1]}`;

            // 新しいエッジが既存のグラフに存在しない場合のみ追加
            if (!existingEdgeKeys.has(newEdgeKey)) {
                newElements.edges.push(edgeData);
            }
        });

        // 1. フィルタリングされた新しい要素をグラフに追加
        cy.add(newElements);
        
        // 2. 新しく追加された要素を特定（フィルタリング後に追加されたノードとエッジ）
        // cy.add()は重複するノードIDを無視するため、ノードは自動的に重複せずに結合されます。
        // エッジは上記のフィルタリングで重複を排除しました。
        const newlyAddedElements = cy.elements(`[loadColor = "${loadColor}"]`);
        const newlyAddedEdges = newlyAddedElements.filter('edge');

        // 3. 【修正ロジック】新しい接続を処理
        newlyAddedEdges.forEach(edge => {
            const sourceNode = edge.source();
            const targetNode = edge.target();
            
            // 接続の起点となるノード (sourceNode または targetNode) が古いノードであるかチェック
            const isSourceOldNode = sourceNode.data('loadColor') !== loadColor;
            const isTargetOldNode = targetNode.data('loadColor') !== loadColor;
            
            // どちらか一方でも古いノードであれば、そのノードの色を新しい色に更新
            if (isSourceOldNode) {
                // 3-1. 【要望1: 色の統一】古いノードの色を新しい色に更新
                sourceNode.data('loadColor', loadColor);
                sourceNode.style('background-color', loadColor);
                
                // 3-2. 【要望2: 接続の復活と拡張】古いノードが非表示の場合、接続を復活させる
                if (!sourceNode.visible()) {
                    sourceNode.show();
                    console.log(`非表示だった古いノード ${sourceNode.id()} に新規接続ができたため、表示しました。`);
                }
            }

             if (isTargetOldNode) {
                // 3-1. 【要望1: 色の統一】古いノードの色を新しい色に更新
                targetNode.data('loadColor', loadColor);
                targetNode.style('background-color', loadColor);
                
                // 3-2. 【要望2: 接続の復活と拡張】古いノードが非表示の場合、接続を復活させる
                if (!targetNode.visible()) {
                    targetNode.show();
                    console.log(`非表示だった古いノード ${targetNode.id()} に新規接続ができたため、表示しました。`);
                }
            }
            // 新規エッジは必ず表示し、関連ノードも表示を保証
            edge.show();
            // 新しいノード（loadColorがloadColorであるノード）は、
            // 新規エッジが追加された時点で自動的に表示されます。
        });

        // 4. 追加したノードをすべて含めてレイアウトを調整する
        cy.layout({ 
            name: 'breadthfirst',
            fit: true,
            padding: 50,
            animate:true,
            animationDuration:500
        }).run();

        console.log("新しい要素が既存のグラフに追加されました。");
    }
}

// ===============================================
// 4. メニューボタンとクリアボタンのイベント設定
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    const highlightButton = document.getElementById('menu-highlight');
    const collapseButton = document.getElementById('menu-collapse');
    const expandButton = document.getElementById('menu-expand'); 
    const clearButton = document.getElementById('clearGraphButton');
    const exportButton = document.getElementById('exportGraphButton');

    if (highlightButton) {
        highlightButton.addEventListener('click', () => {
            if (activeNode) {
                toggleHighlight(activeNode);
                hideMenu();
            }
        });
    }

    if (collapseButton) {
        collapseButton.addEventListener('click', () => {
            if (activeNode) {
                collapseNeighbors(activeNode); 
                hideMenu();
            }
        });
    }

    if (expandButton) {
        expandButton.addEventListener('click', () => {
            if (activeNode) {
                expandNeighbors(activeNode);
                hideMenu();
            }
        });
    }

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            clearGraph();
        });
    }
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            exportVisibleGraphToJson();
        });
    }
});


// ===============================================
// ユーティリティ関数に追加
// ===============================================

/**
 * 現在表示されているグラフ要素をJSON形式でエクスポートし、ダウンロードする
 */
function exportVisibleGraphToJson() {
    if (!cy) {
        alert("グラフがロードされていません。");
        return;
    }

    // 表示されている要素のみをフィルタリング
    const visibleElements = cy.elements(':visible');
    
    const elementsToExport = {
        edges: []
    };

    visibleElements.forEach(ele => {
        if (ele.isEdge()) {
            // エッジのsourceとtargetのみを取得
            elementsToExport.edges.push({
                data: {
                    source: ele.data('source'),
                    target: ele.data('target')
                }
            });
        }
    });

    // JSONオブジェクトを文字列に変換
    const jsonString = JSON.stringify({ elements: elementsToExport }, null, 2);
    
    // ダウンロード用のBlobとURLを作成
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    // aタグを動的に生成し、ダウンロードを実行
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visible_graph.json';
    document.body.appendChild(a);
    a.click();
    
    // 後片付け
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("表示されているグラフ要素がJSONとしてエクスポートされました。");
}

/**
 * グラフ上の全ての要素を削除し、関連するグローバル変数をリセットする
 */
function clearGraph() {
    if (cy) {
        // 全ての要素を削除し、cyコンテナを空にする
        cy.remove(cy.elements()); 
        cy.destroy(); // Cytoscapeインスタンスを破棄 (完全にリセットする場合)
        cy = null;    // インスタンスをnullに設定
    }
    // 関連するグローバル変数をリセット
    loadGroupCounter = 0; 
    activeNode = null; 
    hideMenu(); 

    console.log("グラフが完全にクリアされました。");
}

// ===============================================
// 5. ファイル入力のイベントリスナー
// ===============================================

const fileInput = document.getElementById('csvFileInput');

fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
        const fileContent = e.target.result;
        let elementsData;
        const fileName = file.name.toLowerCase();

        // 1. データパース (CSV)
        if (fileName.endsWith('.csv')) {
            try {
                const graphJson = csvToJsonForCytoscape(fileContent);
                elementsData = graphJson.elements;
            } catch (error) {
                console.error("CSVファイルの処理に失敗しました:", error);
                alert("CSVファイルの処理中にエラーが発生しました。");
                return;
            }

        } else {
            alert("サポートされていないファイル形式です。CSVファイルを選択してください。");
            return;
        }

        if (!elementsData || (!elementsData.nodes && !elementsData.edges)) {
             alert("ファイルから有効なグラフデータ（elements）を抽出できませんでした。");
             return;
        }

        // 2. 動的な色とグループIDを割り当て
        const newLoadColor = getRandomColor();
        loadGroupCounter++; 

        if (elementsData.nodes) {
            elementsData.nodes.forEach(node => {
                // 既存ノードとの重複チェックはCytoscapeが自動で行うため、ここでは色属性のみを付与
                node.data.loadColor = newLoadColor; 
                node.data.loadGroup = loadGroupCounter;
            });
        }
        if (elementsData.edges) {
             elementsData.edges.forEach(edge => {
                edge.data.loadColor = newLoadColor;
                edge.data.loadGroup = loadGroupCounter;
                // 修正箇所: IDが既に付与されているため、ここでは変更不要。
                // ただし、念のため `data` の構造を再確認し、意図通りにIDが渡っていることを確認。
                // `csvToJsonForCytoscape`で`id`を付与済みなので、ここでは追加の処理は不要です。
                // Cytoscape.jsが自動的にIDを認識します。
            });
        }

        // 3. グラフの読み込み/追加処理を実行
        loadGraphData(elementsData, newLoadColor);
    };

    reader.readAsText(file);
});