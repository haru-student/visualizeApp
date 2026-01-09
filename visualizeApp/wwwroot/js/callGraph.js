import { sendLogData } from "./log.js";
import { closeMemoEditor, hideMemo, openMemoEditor, showMemo } from "./memo.js";
let getPadData = null;
let getMethodCallNode = null;

export async function loadPadModule() {
  if (location.pathname.startsWith("/Test")) {
    ({ getPadData, getMethodCallNode } = await import("./diagramOnly.js"));
  } else {
    ({ getPadData, getMethodCallNode } = await import("./visualize.js"));
  }
}

export async function drawCallGraph(data) {
    if (getPadData === null || getMethodCallNode === null)
      await loadPadModule();
    window.graphData = data;
    const svg = d3.select("#graph-layer")
    const width = +svg.attr("width") || 800;
    const height = +svg.attr("height") || 600;

    let clickTimeout = null;

    svg.selectAll("*").remove();

    const color = createClassColorScale(data.nodes);

    if (data.nodes.length === 1) {
        // ノードが1つだけのときは中央に長方形で表示
        const node = svg.append("g")
            .attr("transform", `translate(${50}, ${30})`)

        node.append("rect")
            .attr("x", -40)
            .attr("y", -20)
            .attr("width", 80)
            .attr("height", 40)
            .attr("rx", 6)
            .attr("fill", "#fff") 
            .attr("stroke", "#333")
            .attr("stroke-width", 1.5);

        node.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .text(data.nodes[0].label.split('.').pop());
        
        window.displayedMethods = data.nodes[0].label;
        getPadData(50, 30);

        return;
    }
    // 複数ノードの場合はforceレイアウト
    const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide(80));

    // そして marker はこう定義
    svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)  // ← これがポイント
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#333");


    const link = svg.append("g")
        .attr("stroke", "#333")
        .attr("stroke-width", 2)
        .selectAll("line")
        .data(data.links)
        .enter().append("line")
        .classed("nodeStyle", true)
        .attr("class", "graph-link") 
        .attr("marker-end", "url(#arrowhead)");


    const node = svg.append("g")
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5)
        .selectAll("g")
        .data(data.nodes)
        .enter().append("g")
        .classed("nodeStyle", true)
        .on("click", (event, d) => {
          // ダブルクリック判定
          if (clickTimeout !== null) {
              clearTimeout(clickTimeout);
              clickTimeout = null;

              closeMemoEditor();
              handleOpenPAD(d);
              return;
          }

          clickTimeout = setTimeout(() => {
            let tmp = {
              Id: -1,
              Class: d.label.split('.')[0],
              Method: d.label.split('.')[1]
            };

            openMemoEditor(tmp);
            clickTimeout = null;
          }, 300);
        })
      .on("mouseenter", function (event, d) {
        d3.select(this).select("rect")
          .transition().duration(120)
          .attr("stroke-width", 2); 
        let tmp = {
          Id: -1,
          Class: d.label.split('.')[0],
          Method: d.label.split('.')[1]
        };
        showMemo(tmp, this);
      })
      .on("mouseleave", function () {
        d3.select(this).select("rect")
          .transition().duration(120)
          .attr("stroke-width", 1.5); 
        hideMemo();
      });

    node.append("rect")
        .attr("x", -40)
        .attr("y", -20)
        .attr("width", 80)
        .attr("height", 40)
        .attr("rx", 6)
        .attr("fill", d => color(getClassName(d))) 
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5);


    node.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .text(d => d.label.split('.').pop());

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => offsetLine(d.source, d.target).x)
            .attr("y2", d => offsetLine(d.source, d.target).y);

        node
            .attr("transform", d => `translate(${d.x},${d.y})`);
    });
    window.currentSimulation = simulation;
}

function offsetLine(source, target, offset = 40) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ratio = (len - offset) / len;
    return {
        x: source.x + dx * ratio,
        y: source.y + dy * ratio
    };
}

function handleOpenPAD(d) {
  clearArgNodes();
  if(window.displayedMethods == null)
    openPadForNode(d);
  else if(window.displayedMethods != d.label)
    switchPad(d);
  else
    resetGraphLayout();
    return;
}
function openPadForNode(d) {
  d.fx = 100;
  d.fy = 200;

  const nodes = window.graphData.nodes; 

  // 他ノードを散らす（現状ロジックそのまま）
  nodes.forEach(n => {
    if (n.id !== d.id) {
      n.fx = n.fx;
      n.fy = 30 + Math.random() * 170;
    }
  });

  window.displayedMethods = d.label;
  getPadData(d.fx, d.fy);

  // 対象ノードから出るリンクを隠す
  d3.select("#graph-layer").selectAll("line.graph-link")
    .filter(l => l && l.source && l.source.id === d.id)
    .style("display", "none");

  // ===== ③ 修正ここから =====
  window.currentSimulation.alpha(0.8).restart();

  // 衝突解決のための減衰フェーズ
  setTimeout(() => {
    window.currentSimulation.alphaTarget(0);
  }, 600);

  // 完全に落ち着いてから停止
  setTimeout(() => {
    window.currentSimulation.stop();
  }, 1200);
  
  const args = d.parameters
    .split(",")
    .map(p => p.trim());
  drawArgNode(d, args);

  // PADを表示ログ
  sendLogData('openPAD', d.label.split('.')[0], d.label.split('.')[1], null, null);
}



function switchPad(newNode) {
  const nodes = window.graphData.nodes; 
  nodes.forEach(n => {
      n.fx = null;
      n.fy = null;
  });
  if(window.methodCallLines && window.methodCallLines.size > 0) {
    window.methodCallLines.forEach(line => line.remove()); // DOMから削除
    window.methodCallLines.clear();                        // 参照もクリア
  }
  d3.select("#graph-layer").selectAll("line")
      .style("display", null);
  window.displayedMethods = null;
  displayedPAD = "";
  d3.select("#pad-layer").selectAll("*").remove();
  openPadForNode(newNode);
}

function resetGraphLayout() {
  //PADを閉じる
  window.displayedMethods = null;
  d3.select("#pad-layer").selectAll("*").remove();
  window.displayedPAD = "";

  //ノードの固定を解除
  const nodes = window.graphData.nodes;
  nodes.forEach(n => {
    n.fx = null;
    n.fy = null;
  });
  if(window.methodCallLines && window.methodCallLines.size > 0) {
    window.methodCallLines.forEach(line => line.remove()); // DOMから削除
    window.methodCallLines.clear();                        // 参照もクリア
  }

  //コールグラフの再表示
  d3.select("#graph-layer").selectAll("line")
      .style("display", null);

  // force を再加熱して再レイアウト
  window.currentSimulation.alpha(1).restart();

  // PADを閉じるログ
  sendLogData('closePAD', null, null, null, null);
}

export function drawMethodCallLink(label, arg = null, x, y) {
  const svg = d3.select("#graph-layer");
  if (!window.methodCallLines) window.methodCallLines = new Map();
  const targetNodeSel = svg.selectAll("g.nodeStyle").filter(d => d.label === label);
  if (targetNodeSel.empty()) return;

  const line = svg.append("line")
    .attr("class", "overlay-link")
    .attr("stroke", "rgba(0,0,0,1)")
    .attr("stroke-width", 2)
    .attr("marker-end", "url(#arrowhead)");

  window.methodCallLines.set(label, line);

  // drawCallGraph と同じく tick イベントで毎回座標更新
  window.currentSimulation.on("tick.drawMethodCall_" + label, () => {
    const targetNode = targetNodeSel.datum(); // 最新座標を参照
    const targetOffset = offsetLine({ x, y }, targetNode, 40);
    line
      .attr("x1", x)
      .attr("y1", y)
      .attr("x2", targetOffset.x)
      .attr("y2", targetOffset.y);
  });
  if (window.currentSimulation) {
    window.currentSimulation.alpha(0.3).restart();

    // 数百ms後に再び止める（動き続けないように）
    setTimeout(() => {
      window.currentSimulation.alphaTarget(0);
      window.currentSimulation.stop();
    }, 100);
  }
}

function createClassColorScale(nodes, legendSelector = "#legend") {
  // ノードのラベルからクラス名を抽出
  const classNames = Array.from(new Set(nodes.map(d => getClassName(d))));

  let brightColors;
  if (classNames.length === 1) {
    // ★ クラスが1つなら白を割り当てる
    d3.select(legendSelector).classed("d-none", true);
    return d3.scaleOrdinal()
      .domain(classNames)
      .range(["#ffffff"]); 
  } else {
    brightColors = classNames.map((_, i) => {
      const c = d3.hsl(d3.interpolateRainbow(i / classNames.length));
      c.l = Math.min(0.75, c.l + 0.25); // 明度を上げる
      return c.formatHex();
    });
  }
  // ← ここでちゃんと scaleOrdinal を作る
  const color = d3.scaleOrdinal()
    .domain(classNames)
    .range(brightColors);
  d3.select(legendSelector).classed("d-none", false);
  // 凡例描画
  const legend = d3.select(legendSelector).html("");
  classNames.forEach(name => {
    const row = legend.append("div")
      .attr("class", "d-flex align-items-center mb-2");

    row.append("div")
      .attr("class", "legend-color")
      .style("width", "14px")
      .style("height", "14px")
      .style("border", "1px solid #333")
      .style("border-radius", "3px")
      .style("margin-right", "6px")
      .style("background", color(name));

    row.append("span")
      .style("color", "#222")
      .text(name);
  });

  return color;
}

// 補助関数
function getClassName(node) {
  return node.label.split(".")[0];
}

// 引数のノードの描画
async function drawArgNode(target, args) {
  let nodes = await getMethodCallNode();
  let idCount = 1000; // メモのための一時的なid。要検討
  nodes.forEach(n => {
    let clickTimeout = null;
    let c_m = n.Label;
    let text = "";
    if (n.Label.indexOf("/,,,/") !== -1) {
      c_m = n.Label.split("/,,,/")[1];
    }
    if (target.label.split('.')[0] !== c_m.split('.')[0] || target.label.split('.')[1] !== c_m.split('.')[1]) {
      return;
    }
    let arg = n.Label
      .split("/,,,/")[0]
      .split("(")[1]
      .replace(/[)\s;]+$/g, "");
    let argList = arg.split(',');
    for (let i = 0; i < args.length; i++) {
      text += `${args[i]} = ${argList[i]}\n`;
    }
    // ===== rect + text で引数ノードを描画 =====

    // グループ作成
    const argGroup = d3.select("#graph-layer")
      .append("g")
      .attr("class", "arg-node")
      .on("click", (event, d) => {
          // ダブルクリック判定
          if (clickTimeout !== null) {
              clearTimeout(clickTimeout);
              clickTimeout = null;

              closeMemoEditor();
              handleOpenPAD(d);
              return;
          }

          clickTimeout = setTimeout(() => {
            let tmp = {
              Id: idCount,
              Class: target.label.split('.')[0],
              Method: target.label.split('.')[1]
            };

            openMemoEditor(tmp);
            clickTimeout = null;
          }, 300);
        })
      .on("mouseenter", function (event, d) {
        d3.select(this).select("rect")
          .transition().duration(120)
          .attr("stroke-width", 2); 
        let tmp = {
          Id: idCount,
          Class: target.label.split('.')[0],
          Method: target.label.split('.')[1]
        };
        showMemo(tmp, this);
      })
      .on("mouseleave", function () {
        d3.select(this).select("rect")
          .transition().duration(120)
          .attr("stroke-width", 1.5); 
        hideMemo();
      });

    // text（複数行）
    const argText = argGroup.append("text")
      .attr("font-size", 15)
      .attr("fill", "#333")
      .attr("text-anchor", "start")
      .attr("class", "arg-node");

    // 複数行対応（\n で分割）
    text.split("\n").forEach((line, i) => {
      argText.append("tspan")
        .attr("x", 0)
        .attr("dy", i === 0 ? "1em" : "1.2em")
        .text(line);
    });

    // text のサイズを取得
    const bbox = argText.node().getBBox();
    const padding = 6;

    // rect（背景）
    const argRect = argGroup.insert("rect", "text")
      .attr("x", bbox.x - padding)
      .attr("y", bbox.y - padding)
      .attr("width", bbox.width + padding * 2)
      .attr("height", bbox.height + padding * 2)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", "#fff")
      .attr("stroke", "#333")
      .attr("stroke-width", 1);

    const svg = d3.select("#graph-layer");
    const sourceNodeSel = svg.selectAll("g.nodeStyle").filter(d => d.label === n.Class+"." + n.Method);
    const sourceNode = sourceNodeSel.datum();
    window.currentSimulation.on(
      "tick.argNode_" + target.label,
      () => {
        const sourcePos = { x: sourceNode.x, y: sourceNode.y }; // ★追加
        const targetPos = { x: target.x, y: target.y };         // ★追加

        // ★追加：矢印と同じ offset を使う
        const targetOffset = offsetLine(sourcePos, targetPos, 40);
        // argGroup 自体のサイズを取得
        const groupBBox = argGroup.node().getBBox();

        // 中心補正
        const centerX = groupBBox.width / 2;
        const centerY = groupBBox.height / 2;
        // 追加：矢印のど真ん中
        const midX = (sourcePos.x + targetOffset.x) / 2 - centerX;
        const midY = (sourcePos.y + targetOffset.y) / 2 - centerY;

        // 修正：毎 tick で位置を反映
        argGroup.attr(
          "transform",
          `translate(${midX}, ${midY})`
        );
      }
    );
    idCount++;
  });
}
function clearArgNodes() {
  d3.select("#graph-layer")
    .selectAll("g.arg-node")
    .remove();
}
