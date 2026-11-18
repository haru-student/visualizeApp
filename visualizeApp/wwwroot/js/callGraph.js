import { sendLogData } from "./log.js";
import { closeMemoEditor, hideMemo, openMemoEditor, showMemo } from "./memo.js";
import { constrainGraphNode } from "./graphBounds.js";
import { GraphChunks } from "./graphChunks.js";
let chunkState = null;
const selectedNodeIds = new Set();
let cancelPendingClick = () => {};
let padRevision = 0;
let getPadData = null;
let getMethodCallNode = null;
let registeredPadScreen = null;
let graphResizeObserver = null;
const nodeBounds = new WeakMap();

export function registerPadModuleForScreen(screen, module) {
  getPadData = module?.getPadData ?? null;
  getMethodCallNode = module?.getMethodCallNode ?? null;
  registeredPadScreen = screen ?? null;
}

export async function drawCallGraph(data) {
    cancelPendingClick();
    chunkState = new GraphChunks(data);
    selectedNodeIds.clear();
    initChunkControls();
    renderCallGraph(true);
}

function renderCallGraph(initial = false) {
    cancelPendingClick();
    const data = chunkState.project();
    if (getPadData === null || getMethodCallNode === null) {
      throw new Error("PADモジュールが未登録です。registerPadModuleForScreen を先に呼び出してください。");
    }
    window.graphData = data;
    window.currentSimulation?.stop();
    graphResizeObserver?.disconnect();
    window.currentSimulation = null;
    window.displayedMethods = null;
    window.displayedPAD = "";
    window.registeredPadScreen = registeredPadScreen;
    const svg = d3.select("#graph-layer")
    const { width, height } = svg.node().getBoundingClientRect();
    graphResizeObserver = new ResizeObserver(() => {
        const viewport = svg.node().getBoundingClientRect();
        if (viewport.width <= 0 || viewport.height <= 0) return;
        window.currentSimulation?.force("center")
            ?.x(viewport.width / 2).y(viewport.height / 2);
        window.currentSimulation?.force("x")?.x(viewport.width / 2);
        window.currentSimulation?.force("y")?.y(viewport.height / 2);
        renderGraphPositions();
    });
    graphResizeObserver.observe(svg.node());

    let clickTimeout = null;
    cancelPendingClick = () => {
        clearTimeout(clickTimeout);
        clickTimeout = null;
    };

    svg.selectAll("*").remove();

    createClassColorScale(chunkState.nodes);
    svg.on("click.chunk-selection", event => {
        if (event.target !== svg.node()) return;
        cancelPendingClick();
        selectedNodeIds.clear();
        refreshChunkSelection();
    });
    const drag = d3.drag()
        .clickDistance(4)
        .on("start", function () {
            hideMemo();
            d3.select(this).style("cursor", "grabbing");
        })
        .on("drag", (event, d) => {
            clearTimeout(clickTimeout);
            clickTimeout = null;
            d.x = d.fx = event.x;
            d.y = d.fy = event.y;
            d.vx = d.vy = 0;
            renderGraphPositions();
        })
        .on("end", function () {
            d3.select(this).style("cursor", "grab");
        });

    if (initial && data.nodes.length === 1 && !data.nodes[0].isChunk) {
        Object.assign(data.nodes[0], { x: 50, y: 30, fx: 50, fy: 30 });
    }
    if (!initial) {
        // Keep the surrounding diagram in place when membership or expansion changes.
        data.nodes.forEach(node => {
            node.fx = node.x;
            node.fy = node.y;
        });
    }
    // 複数ノードの場合はforceレイアウト
    const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id).distance(108))
        .force("charge", d3.forceManyBody().strength(-230))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("x", d3.forceX(width / 2).strength(0.025))
        .force("y", d3.forceY(height / 2).strength(0.025))
        .force("collide", d3.forceCollide(d => Math.max(64, nodeWidth(d) / 2 + 16)));

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


    svg.append("g")
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
          if (event.defaultPrevented) return;
          event.stopPropagation();
          cancelPendingClick();
          if (event.ctrlKey || event.metaKey) {
              const occupied = chunkState.chunks.some(chunk => chunk.memberNodeIds.includes(d.id));
              if (!d.isChunk && !occupied) {
                  if (selectedNodeIds.has(d.id)) selectedNodeIds.delete(d.id);
                  else selectedNodeIds.add(d.id);
                  refreshChunkSelection();
              }
              return;
          }
          if (d.isChunk || event.detail > 1) return;
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
      .on("dblclick", (event, d) => {
        event.stopPropagation();
        event.preventDefault();
        cancelPendingClick();
        if (event.ctrlKey || event.metaKey) return;
        closeMemoEditor();
        if (d.isChunk) mutateChunks(() => chunkState.expand(d));
        else handleOpenPAD(d);
      })
      .on("mouseenter", function (event, d) {
        if (d.isChunk) return;
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

    node.style("cursor", "grab").style("user-select", "none").call(drag);

    node.append("rect")
        .attr("x", d => -nodeWidth(d) / 2)
        .attr("y", -20)
        .attr("width", d => nodeWidth(d))
        .attr("height", 40)
        .attr("rx", 6)
        .attr("fill", "#fff")
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5);


    node.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .text(d => d.isChunk ? d.label : d.label.split('.').pop());
    node.append("title").text(d => {
        const owner = chunkState.chunks.find(chunk => chunk.memberNodeIds.includes(d.id));
        if (d.isChunk) return `${d.label}\n${chunkState.nodes.filter(n => d.memberNodeIds.includes(n.id)).map(n => n.label).join("\n")}\nダブルクリックで展開`;
        return owner ? `${d.label}\nチャンク: ${owner.label}` : `${d.label}\nCtrl / ⌘ + クリックで選択`;
    });

    simulation.on("tick", renderGraphPositions);
    window.currentSimulation = simulation;
    renderGraphPositions();
    refreshChunkSelection();
    if (initial && data.nodes.length === 1 && !data.nodes[0].isChunk) {
        window.displayedMethods = data.nodes[0].label;
        getPadData(data.nodes[0].x, data.nodes[0].y);
    }
}

function nodeWidth(node) {
    return node.isChunk ? Math.max(120, (Array.from(node.label).length + 6) * 16) : 80;
}

function mutateChunks(action) {
    cancelPendingClick();
    closeMemoEditor();
    hideMemo();
    clearArgNodes();
    if (window.displayedMethods != null) closePad();
    action();
    selectedNodeIds.clear();
    renderCallGraph();
}

function initChunkControls() {
    document.getElementById("chunk-create").onclick = () => {
        cancelPendingClick();
        closeMemoEditor();
        const name = window.prompt("チャンク名を入力してください");
        if (!name?.trim() || !chunkState.create(name, selectedNodeIds)) return;
        mutateChunks(() => {});
    };
}

function refreshChunkSelection() {
    d3.select("#graph-layer").selectAll("g.nodeStyle")
        .classed("chunk-selected", d => selectedNodeIds.has(d.id));
    document.getElementById("chunk-create").hidden = selectedNodeIds.size < 2;
}

function renderGraphPositions() {
        const svg = d3.select("#graph-layer");
        const { width, height } = svg.node().getBoundingClientRect();
        svg.selectAll("g.nodeStyle").each(function (d) {
            if (!nodeBounds.has(this)) nodeBounds.set(this, this.getBBox());
            constrainGraphNode(d, nodeBounds.get(this), width, height);
        });
        svg.selectAll("line.graph-link")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => offsetLine(d.source, d.target).x)
            .attr("y2", d => offsetLine(d.source, d.target).y);

        svg.selectAll("g.nodeStyle")
            .attr("transform", d => `translate(${d.x},${d.y})`);
        d3.select("#pad-layer").selectAll("g.pad-content")
            .attr("transform", d => {
                const offset = getPadOffset(d);
                return `translate(${offset.x},${offset.y})`;
            });
        svg.selectAll("line.overlay-link, g.arg-node").each(function () {
            this.updatePosition?.();
        });
}

function getPadOffset(anchor) {
    return {
        x: (anchor.node.fx ?? anchor.node.x) - anchor.x,
        y: (anchor.node.fy ?? anchor.node.y) - anchor.y
    };
}

export function registerPadPosition(x, y) {
    const node = window.graphData?.nodes.find(n => n.label === window.displayedMethods);
    const anchor = { node: node ?? { x, y }, x, y };
    const offset = getPadOffset(anchor);
    return d3.select("#pad-layer").append("g")
        .attr("class", "pad-content")
        .datum(anchor)
        .attr("transform", `translate(${offset.x},${offset.y})`);
}

function offsetLine(source, target) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: target.x, y: target.y };
    const halfWidth = nodeWidth(target) / 2;
    const boundary = Math.min(Math.abs(dx) > 0 ? halfWidth * len / Math.abs(dx) : Infinity,
        Math.abs(dy) > 0 ? 20 * len / Math.abs(dy) : Infinity);
    const ratio = Math.max(0, len - boundary) / len;
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
    closePad();
    return;
}
function openPadForNode(d) {
  padRevision++;
  // 初期配置の途中でも、PADを開いた時点の配置を保持する。
  window.currentSimulation?.stop();

  window.displayedMethods = d.label;
  getPadData(d.x, d.y);

  // 対象ノードから出るリンクを隠す
  d3.select("#graph-layer").selectAll("line.graph-link")
    .filter(l => l && l.source && l.source.id === d.id)
    .style("display", "none");

  const args = (d.parameters ?? "")
    .split(",")
    .map(p => p.trim())
    .filter(p => p.length > 0);
  drawArgNode(d, args);

  // PADを表示ログ
  sendLogData('openPAD', d.label.split('.')[0], d.label.split('.')[1], null, null);
}



function switchPad(newNode) {
  if(window.methodCallLines && window.methodCallLines.size > 0) {
    window.methodCallLines.forEach(line => line.remove()); // DOMから削除
    window.methodCallLines.clear();                        // 参照もクリア
  }
  d3.select("#graph-layer").selectAll("line")
      .style("display", null);
  window.displayedMethods = null;
  window.displayedPAD = "";
  d3.select("#pad-layer").selectAll("*").remove();
  openPadForNode(newNode);
}

function closePad() {
  padRevision++;
  //PADを閉じる
  window.displayedMethods = null;
  d3.select("#pad-layer").selectAll("*").remove();
  window.displayedPAD = "";

  if(window.methodCallLines && window.methodCallLines.size > 0) {
    window.methodCallLines.forEach(line => line.remove()); // DOMから削除
    window.methodCallLines.clear();                        // 参照もクリア
  }

  //コールグラフの再表示
  d3.select("#graph-layer").selectAll("line")
      .style("display", null);

  // PADを閉じるログ
  sendLogData('closePAD', null, null, null, null);
}

export function drawMethodCallLink(label, arg = null, x, y) {
  const svg = d3.select("#graph-layer");
  if (!window.methodCallLines) window.methodCallLines = new Map();
  const targetNodeSel = visibleMethodNode(label);
  if (targetNodeSel.empty()) return;

  const line = svg.append("line")
    .attr("class", "overlay-link")
    .attr("stroke", "rgba(0,0,0,1)")
    .attr("stroke-width", 2)
    .attr("marker-end", "url(#arrowhead)");

  window.methodCallLines.set(label, line);

  // drawCallGraph と同じく tick イベントで毎回座標更新
  const anchor = d3.select("#pad-layer g.pad-content").datum();
  line.node().updatePosition = () => {
    const targetNode = targetNodeSel.datum(); // 最新座標を参照
    const offset = anchor ? getPadOffset(anchor) : { x: 0, y: 0 };
    const source = { x: x + offset.x, y: y + offset.y };
    const targetOffset = offsetLine(source, targetNode);
    line
      .attr("x1", source.x)
      .attr("y1", source.y)
      .attr("x2", targetOffset.x)
      .attr("y2", targetOffset.y);
  };
  line.node().updatePosition();
}

function visibleMethodNode(label) {
  return d3.select("#graph-layer").selectAll("g.nodeStyle").filter(d =>
    d.isChunk ? chunkState.nodes.some(n => n.label === label && d.memberNodeIds.includes(n.id)) : d.label === label);
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
  const stateAtRequest = chunkState;
  const revisionAtRequest = padRevision;
  let nodes = await getMethodCallNode();
  if (stateAtRequest !== chunkState || revisionAtRequest !== padRevision || window.displayedMethods !== target.label) return;
  let idCount = 1000; // メモのための一時的なid。要検討
  nodes.forEach(n => {
    let clickTimeout = null;
    let text = "";
    const { calledClass, calledMethod, argumentsText } = parseMethodCallNode(n);

    if (target.label.split('.')[0] !== calledClass || target.label.split('.')[1] !== calledMethod) {
      return;
    }
    const sourceNodeSel = visibleMethodNode(n.Class + "." + n.Method);
    if (sourceNodeSel.empty()) return;
    const sourceNode = sourceNodeSel.datum();

    const argList = argumentsText.length > 0 ? argumentsText.split(',').map(a => a.trim()) : [];
    for (let i = 0; i < args.length; i++) {
      text += `${args[i]} = ${argList[i] ?? ""}\n`;
    }
    // ===== rect + text で引数ノードを描画 =====

    // グループ作成
    const argGroup = d3.select("#graph-layer")
      .append("g")
      .attr("class", "arg-node")
      .on("click", event => {
          event.stopPropagation();
          if (event.ctrlKey || event.metaKey || event.detail > 1) return;
          clearTimeout(clickTimeout);
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
    const argTexts = argGroup.append("text")
      .attr("font-size", 15)
      .attr("fill", "#333")
      .attr("text-anchor", "start")
      .attr("class", "arg-node");

    // 複数行対応（\n で分割）
    text.split("\n").forEach((line, i) => {
      argTexts.append("tspan")
        .attr("x", 0)
        .attr("dy", i === 0 ? "1em" : "1.2em")
        .text(line);
    });

    // text のサイズを取得
    const bbox = argTexts.node().getBBox();
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

    argGroup.node().updatePosition = () => {
        const sourcePos = { x: sourceNode.x, y: sourceNode.y }; // ★追加
        const targetPos = { x: target.x, y: target.y };         // ★追加

        // ★追加：矢印と同じ offset を使う
        const targetOffset = offsetLine(sourcePos, targetPos);
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
      };
    argGroup.node().updatePosition();
    idCount++;
  });
}

function parseMethodCallNode(node) {
  const calledClass = node.CalledClass ?? node.calledClass;
  const calledMethod = node.CalledMethod ?? node.calledMethod;
  const argumentsText = (node.Arguments ?? node.arguments ?? "").trim();

  if (calledClass && calledMethod) {
    return { calledClass, calledMethod, argumentsText };
  }

  const label = (node.Label ?? node.label ?? "").toString();
  const [callExpr, destination] = label.split("/,,,/");
  let parsedClass = "";
  let parsedMethod = "";
  if (destination) {
    const parts = destination.trim().split(".");
    parsedClass = parts[0] ?? "";
    parsedMethod = parts[1] ?? "";
  }

  let parsedArgs = "";
  const leftParen = callExpr?.lastIndexOf("(") ?? -1;
  const rightParen = callExpr?.lastIndexOf(")") ?? -1;
  if (leftParen >= 0 && rightParen > leftParen) {
    parsedArgs = callExpr.slice(leftParen + 1, rightParen).trim();
  }

  return {
    calledClass: parsedClass,
    calledMethod: parsedMethod,
    argumentsText: parsedArgs
  };
}
function clearArgNodes() {
  d3.select("#graph-layer")
    .selectAll("g.arg-node")
    .remove();
}
