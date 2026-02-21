import { drawMethodCallLink } from "./callGraph.js";
import { hideMemo, openMemoEditor, showMemo } from "./memo.js";

export function drawPAD(data, posX = 0, posY = 0) {
  if(window.methodCallLines && window.methodCallLines.size > 0){
    window.methodCallLines.forEach(line => line.remove()); // DOMから削除
    window.methodCallLines.clear();                        // 参照もクリア
  }
  const svg = d3.select("#pad-layer");
  let x = posX;
  let y = posY + 50;

  svg
    .append("line")
    .attr("x1", posX)
    .attr("y1", posY + 20)
    .attr("x2", x)
    .attr("y2", y)
    .attr("stroke", "black")
    .attr("stroke-width", 1);

  let deepestY = [];
  let height = 40;
  let minWidth = 100;
  const lenLink = 40;
  const nodes = data.Nodes;
  const links = data.Links;

  if (nodes.length === 0) {
    console.warn("No nodes found in the data");
    return;
  }
  let connects = [];
  if(nodes[0].Type === "if"){
    nodes[0].drawn = true;
    let tmpLink = {
      Node1: -1,
      Node2: 0,
      Type: "normal",
      Class: nodes[0].Class,
      Method: nodes[0].Method
    };
    connects.unshift(tmpLink);
    deepestY.push(y + height);
    let width = decideWidth(nodes[0], minWidth);
    saveCordinates(nodes[0], x, y, width, height);
  } else if(nodes[0].Type === "loop"){
    drawNode(x, y, minWidth, 120, nodes[0]);
    svg
      .append("line")
      .attr("x1", x + 6)
      .attr("y1", y)
      .attr("x2", x + 6)
      .attr("y2", y + 120)
      .attr("stroke", "black")
      .attr("stroke-width", 1);
    saveCordinates(nodes[0], x, y, minWidth, 120);
    deepestY.push(y + 120);
  } else {
    let tmpWidth = decideWidth(nodes[0].Label, minWidth);
    drawNode(x, y, tmpWidth, height, nodes[0]);
    saveCordinates(nodes[0], x, y, tmpWidth, height);
    deepestY.push(y + height);
  }
  if(nodes[0].Type == "methodCall"){
    let c_m = nodes[0].Label;
    if (nodes[0].Label.indexOf("/,,,/") !== -1) {
      c_m = nodes[0].Label.split("/,,,/")[1];
    }
    c_m = c_m.split('(')[0];
    let arg = "";
    arg = nodes[0].Label.split('(')[1].replace(/\)$/, "");
    drawMethodCallLink(c_m, arg, nodes[0].x + nodes[0].width, nodes[0].y);
  }
  let filteredLinks = links.filter((link) => link.Node1 === nodes[0].Id);
  if (nodes[0].Type == "if" || nodes[0].Type == "else if") {
    filteredLinks = filteredLinks.filter((link) => link.Type === "true");
  } 
  connects.unshift(...filteredLinks);
  while (connects.length > 0) {
    let connect = connects[0];
    let source;
    if(connect.Node1 !== -1){
      source = nodes[connect.Node1];
    }
    let target = nodes[connect.Node2];
    if (connect.Type == "normal") {
      if (target.Type == "loop") {
        let tmpX = source.x;
        if (target.Depth == 0) {
          tmpX = x;
        }
        let tmpY = 0;
        for (let i = target.Depth; i < deepestY.length; i++) {
          if (tmpY < deepestY[i]) {
            tmpY = deepestY[i];
          }
        }
        tmpY += lenLink;
        drawNode(tmpX, tmpY, minWidth, 120, target);
        saveCordinates(target, tmpX, tmpY, minWidth, 120);
        svg
          .append("line")
          .attr("x1", tmpX + 6)
          .attr("y1", tmpY)
          .attr("x2", tmpX + 6)
          .attr("y2", tmpY + 120)
          .attr("stroke", "black")
          .attr("stroke-width", 1);
      } else if (target.Type == "end") {
        let tmpY = 0;
        for (let i = target.Depth; i < deepestY.length; i++) {
          if (tmpY < deepestY[i]) {
            tmpY = deepestY[i];
          }
        }
        tmpY += lenLink;
        drawNode(0, tmpY, minWidth, height, target);
        saveCordinates(target, 0, tmpY, minWidth, height);
      } else if (target.Type == "if") {
        let tmpX;
        if (target.Depth == 0 || connect.Node1 === -1) {
          tmpX = x;
        } else {
          tmpX = source.x;
        }
        let tmpY = 0;
        for (let i = target.Depth; i < deepestY.length; i++) {
          if (tmpY < deepestY[i]) {
            tmpY = deepestY[i];
          }
        }
        tmpY += lenLink / 2;

        if (!target.drawn) {
          nodes[target.Id].drawn = true;
          let width = decideWidth(target.Label, minWidth) * 0.7;
          saveCordinates(target, tmpX, tmpY, width, height);
          connects.unshift(connect);
        } else {
          nodes[target.Id].drawn = false;
          let deepest = 0;
          for (let i = target.Depth + 1; i < deepestY.length; i++) {
            if (deepest < deepestY[i]) {
              deepest = deepestY[i];
            }
          }
          let ifHeight = deepest - target.y + lenLink / 2;
          let width = decideWidth(target.Label, minWidth) * 0.7;
          drawIfNode(target.x, target.y, width, ifHeight, target);
          saveCordinates(target, target.x, target.y, width, ifHeight);
        }
      } else {
        let tmpWidth = decideWidth(target.Label, minWidth);
        let tmpX;
        if (target.Depth == 0) {
          tmpX = x;
        } else {
          tmpX = source.x;
        }
        let tmpY = 0;
        for (let i = target.Depth; i < deepestY.length; i++) {
          if (tmpY < deepestY[i]) {
            tmpY = deepestY[i];
          }
        }
        tmpY += lenLink / 2;
        drawNode(tmpX, tmpY, tmpWidth, height, target);
        saveCordinates(target, tmpX, tmpY, tmpWidth, height);
      }
    } else if (connect.Type == "loop") {
      if (target.Type == "if" || target.Type == "else if") {
        let tmpX = source.x + source.width + lenLink / 2;
        let tmpY = source.y + source.height / 2;
        if (!target.drawn) {
          nodes[target.Id].drawn = true;
          let width = decideWidth(target.Label, minWidth) * 0.7;
          saveCordinates(target, tmpX, tmpY, width, height);
          connects.unshift(connect);
        } else {
          nodes[target.Id].drawn = false;
          let deepest = 0;
          for (let i = target.Depth + 1; i < deepestY.length; i++) {
            if (deepest < deepestY[i]) {
              deepest = deepestY[i];
            }
          }
          let ifHeight = deepest - target.y + lenLink / 2;
          let width = decideWidth(target.Label, minWidth) * 0.7;
          drawIfNode(target.x, target.y, width, ifHeight, target);
          saveCordinates(target, target.x, target.y, width, ifHeight);
        }
      } else if (target.Type == "loop") {
        let tmpX = x + target.Depth * (minWidth + lenLink);
        let tmpY = source.y + source.height / 2;
        drawNode(tmpX, tmpY, minWidth, 120, target);
        saveCordinates(target, tmpX, tmpY, minWidth, 120);
        svg
          .append("line")
          .attr("x1", tmpX + 6)
          .attr("y1", tmpY)
          .attr("x2", tmpX + 6)
          .attr("y2", tmpY + 120)
          .attr("stroke", "black")
          .attr("stroke-width", 1);
      } else {
        let tmpX = source.x + source.width + lenLink / 2;
        let tmpY = source.y + source.height / 2;
        let tmpWidth = decideWidth(target.Label, minWidth);
        drawNode(tmpX, tmpY, tmpWidth, height, target);
        saveCordinates(target, tmpX, tmpY, tmpWidth, height);
      }
    } else if (connect.Type == "true") {
      if (target.Type == "loop") {
        let tmpX = source.x + source.width * 2 + lenLink / 2;
        let tmpY = source.y;
        drawNode(tmpX, tmpY, minWidth, 120, target);
        saveCordinates(target, tmpX, tmpY, minWidth, 120);
        svg
          .append("line")
          .attr("x1", tmpX + 6)
          .attr("y1", tmpY)
          .attr("x2", tmpX + 6)
          .attr("y2", tmpY + 120)
          .attr("stroke", "black")
          .attr("stroke-width", 1);
      } else if (target.Type == "if") {
        let tmpX = source.x + source.width * 2 + lenLink / 2;
        let tmpY = source.y;
        if (!target.drawn) {
          nodes[target.Id].drawn = true;
          let width = decideWidth(target.Label, minWidth) * 0.7;
          saveCordinates(target, tmpX, tmpY, width, height);
          connects.unshift(connect);
        } else {
          nodes[target.Id].drawn = false;
          let deepest = 0;
          for (let i = target.Depth + 1; i < deepestY.length; i++) {
            if (deepest < deepestY[i]) {
              deepest = deepestY[i];
            }
          }
          let ifHeight = deepest - target.y + lenLink / 2;
          let width = decideWidth(target.Label, minWidth) * 0.7;
          drawIfNode(target.x, target.y, width, ifHeight, target);
          saveCordinates(target, target.x, target.y, width, ifHeight);
        }
      } else {
        let tmpWidth = decideWidth(target.Label, minWidth);
        let tmpX = source.x + source.width * 2 + lenLink / 2;
        let tmpY = source.y;
        drawNode(tmpX, tmpY, tmpWidth, height, target);
        saveCordinates(target, tmpX, tmpY, tmpWidth, height);
      }
    } else if (connect.Type == "false") {
      if (target.Type == "else if" || target.Type == "if") {
        let tmpX = source.x + source.width * 2 + lenLink / 2;
        let tmpY = source.y + source.height;
        if (!target.drawn) {
          nodes[target.Id].drawn = true;
          let width = decideWidth(target.Label, minWidth) * 0.7;
          saveCordinates(target, tmpX, tmpY, width, height);
          connects.unshift(connect);
        } else {
          nodes[target.Id].drawn = false;
          let deepest = 0;
          for (let i = target.Depth + 1; i < deepestY.length; i++) {
            if (deepest < deepestY[i]) {
              deepest = deepestY[i];
            }
          }
          let ifHeight = deepest - target.y + lenLink / 2;
          let width = decideWidth(target.Label, minWidth) * 0.7;
          drawIfNode(target.x, target.y, width, ifHeight, target);
          saveCordinates(target, target.x, target.y, width, ifHeight);
        }
      } else if (target.Type == "loop") {
        let tmpX = source.x + source.width * 2 + lenLink / 2;
        let tmpY = source.y + source.height;
        drawNode(tmpX, tmpY, minWidth, 120, target);
        saveCordinates(target, tmpX, tmpY, minWidth, 120);
        svg
          .append("line")
          .attr("x1", tmpX + 6)
          .attr("y1", tmpY)
          .attr("x2", tmpX + 6)
          .attr("y2", tmpY + 120)
          .attr("stroke", "black")
          .attr("stroke-width", 1);
      } else {
        let tmpWidth = decideWidth(target.Label, minWidth);
        let tmpX = source.x + source.width * 2 + lenLink / 2;
        let tmpY = source.y + source.height;
        drawNode(tmpX, tmpY, tmpWidth, height, target);
        saveCordinates(target, tmpX, tmpY, tmpWidth, height);
      }
    }
    deepestY[target.Depth] = target.y + target.height;
    drawLink(source, target, connect);
    if(target.Type == "methodCall"){
      let c_m = target.Label;
      let arg = target.Label;
      if (target.Label.indexOf("/,,,/") !== -1) {
        c_m = target.Label.split("/,,,/")[1];
        arg = arg.split("/,,,/")[0];
      }
      arg = arg.split('(')[1];
      if (arg.indexOf(";") !== -1) {
        arg = arg.replace(/;/g, "");
      }
      if (arg.indexOf(")") !== -1) {
        arg = arg.replace(/\)$/, "");
      }
      c_m = c_m.split('(')[0];

      drawMethodCallLink(c_m, arg, target.x + target.width, target.y);
    }
    connects.shift();
    let filteredLinks = links.filter((link) => link.Node1 === target.Id);
    if (target.Type == "if" || target.Type == "else if") {
      if (target.drawn) {
        filteredLinks = filteredLinks.filter((link) => link.Type === "true");
      } else {
        filteredLinks = filteredLinks.filter((link) => link.Type != "true");
      }
    }
    connects.unshift(...filteredLinks);
  }

function drawNode(x, y, width, height, node) {
  const g = svg.append("g")
    .attr("class", "pad-node")
    .on("mouseenter", function () {
      d3.select(this).select("rect")
        .attr("fill", "#ffff99"); // ホバー時の背景色
      if (window.highlightLine && node.LineNumber) {
        window.highlightLine(node.LineNumber);
      }
      showMemo(node, this);
    })
    .on("mouseleave", function () {
      d3.select(this).select("rect")
        .attr("fill", "white");

      if (window.editorInstance && window.highlightDecoration) {
        window.highlightDecoration = window.editorInstance.deltaDecorations(
          window.highlightDecoration,
          []
        );
      }
      hideMemo();
    })
    .on("click", () => openMemoEditor(node));

  g.append("rect")
    .attr("x", x)
    .attr("y", y)
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "white")
    .attr("stroke", "black")
    .attr("stroke-width", 1);
  
  if (node.Type == "loop" && node.Label != ";;") {
    const lines = node.Label.split(/(?<=;)/);
    const text = g.append("text")
      .attr("x", x + width / 2)
      .attr("y", y + height / 2)
      .attr("text-anchor", "middle")
      .attr("dy", ".35em");

    lines.forEach((line, i) => {
      text.append("tspan")
        .attr("x", x + width / 2)
        .attr("dy", i === 0 ? 0 : 16) 
        .text(line);
});
  } else if (node.Type === 'methodCall') {
    let methodLabel = node.Label;
    if (node.Label.indexOf("/,,,/") !== -1) {
      methodLabel = node.Label.split("/,,,/")[0];
    }
      g.append("text")
        .attr("x", x + width / 2)
        .attr("y", y + height / 2)
        .attr("text-anchor", "middle")
        .attr("dy", ".35em")
        .text(methodLabel);
  }
  else {
    g.append("text")
      .attr("x", x + width / 2)
      .attr("y", y + height / 2)
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .text(node.Label);
  }
}

function drawIfNode(x, y, width, height, node) {
  const g = svg.append("g")
    .attr("class", "pad-node if-node")
    .on("mouseenter", function () {
      d3.select(this).select("polygon")
        .attr("fill", "#ffff99"); // ホバー時の背景色
      if (window.highlightLine && node.LineNumber) {
        window.highlightLine(node.LineNumber);
      }
      showMemo(node, this);
    })
    .on("mouseleave", function () {
      d3.select(this).select("polygon")
        .attr("fill", "white");
    if (window.editorInstance && window.highlightDecoration) {
      window.highlightDecoration = window.editorInstance.deltaDecorations(
        window.highlightDecoration,
        []
      );
    }
    hideMemo();
    })
    .on("click", () => openMemoEditor(node));

  const points = [
    [x, y],
    [x, y + height],
    [x + width * 2, y + height],
    [x + 1.5 * width, y + height / 2],
    [x + width * 2, y],
  ]
    .map(([px, py]) => `${px},${py}`)
    .join(" ");

  g.append("polygon")
    .attr("points", points)
    .attr("fill", "white")
    .attr("stroke", "black")
    .attr("stroke-width", 1);

  g.append("text")
    .attr("x", x + 20)
    .attr("y", y + height / 2)
    .attr("text-anchor", "start") 
    .attr("dy", ".35em")
    .text(node.Label);
}

  function drawLink(source, target, link) {
    let x1, y1, x2, y2;
    let sourceX = source ? source.x : x;
    let sourceY = source ? source.y : y;
    let sourceWidth = source ? source.width : 0;
    let sourceHeight = source ? source.height : 0;

    if (link.Type === "loop") {
      x1 = sourceX + sourceWidth;
      y1 = sourceY + sourceHeight / 2;
      x2 = target.x;
      y2 = target.y;
    } else if (link.Type === "true") {
      x1 = sourceX + sourceWidth;
      y1 = sourceY;
      x2 = target.x;
      y2 = target.y;
    } else if (link.Type === "false") {
      x1 = sourceX + sourceWidth;
      y1 = sourceY + sourceHeight;
      x2 = target.x;
      y2 = target.y;
    } else {
      x1 = sourceX;
      y1 = sourceY + sourceHeight;
      x2 = target.x;
      y2 = target.y;
    }
    svg
      .append("line")
      .attr("x1", x1)
      .attr("y1", y1)
      .attr("x2", x2)
      .attr("y2", y2)
      .attr("stroke", "black")
      .attr("stroke-width", 1);
  }
  function saveCordinates(target, x, y, width, height) {
    nodes[target.Id].x = x;
    nodes[target.Id].y = y;
    nodes[target.Id].width = width;
    nodes[target.Id].height = height;
  }

  function decideWidth(label, minWidth) {
    const padding = 10;

    const tempText = svg
      .append("text")
      .attr("x", 1000)
      .attr("y", 1000)
      .attr("text-anchor", "start")
      .attr("dy", ".35em")
      .text(label);

    const textNode = tempText.node();
    let textWidth = 0;

    if (textNode) {
      textWidth = textNode.getComputedTextLength();
    }

    const width = textWidth + 2 * padding;

    tempText.remove();
    return Math.max(minWidth, width);
  }
}