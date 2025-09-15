function visualize(data, posX = 0, posY = 0) {
  if(window.drawMethodCallLines && window.drawMethodCallLines.size > 0){
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
  deepestY.push(y + height);
  const nodes = data.Nodes;
  const links = data.Links;

  if (nodes.length === 0) {
    console.warn("No nodes found in the data");
    return;
  }

  drawNode(x, y, minWidth, height, nodes[0].Label);
  saveCordinates(nodes[0], x, y, minWidth, height);
  x += minWidth / 2;
  y[0] += height + lenLink;
  let connects = links.filter(function (link) {
    return link.Node1 == nodes[0].Id;
  });
  while (connects.length > 0) {
    let connect = connects[0];
    let source = nodes[connect.Node1];
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
        drawNode(tmpX, tmpY, minWidth, 120, target.Label);
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
        drawNode(0, tmpY, minWidth, height, target.Label);
        saveCordinates(target, 0, tmpY, minWidth, height);
      } else if (target.Type == "if") {
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

        if (!target.drawn) {
          nodes[target.Id].drawn = true;
          saveCordinates(target, tmpX, tmpY, minWidth * 2, height);
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
          drawIfNode(target.x, target.y, minWidth, ifHeight, target.Label);
          saveCordinates(target, target.x, target.y, minWidth * 2, ifHeight);
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
        drawNode(tmpX, tmpY, tmpWidth, height, target.Label);
        saveCordinates(target, tmpX, tmpY, tmpWidth, height);
      }
    } else if (connect.Type == "loop") {
      if (target.Type == "if" || target.Type == "else if") {
        let tmpX = source.x + source.width + lenLink / 2;
        let tmpY = source.y + source.height / 2;
        if (!target.drawn) {
          nodes[target.Id].drawn = true;
          saveCordinates(target, tmpX, tmpY, minWidth * 2, height);
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
          drawIfNode(target.x, target.y, minWidth, ifHeight, target.Label);
          saveCordinates(target, target.x, target.y, minWidth * 2, ifHeight);
        }
      } else if (target.Type == "loop") {
        let tmpX = x + target.Depth * (minWidth + lenLink);
        let tmpY = source.y + source.height / 2;
        drawNode(tmpX, tmpY, minWidth, 120, target.Label);
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
        drawNode(tmpX, tmpY, tmpWidth, height, target.Label);
        saveCordinates(target, tmpX, tmpY, tmpWidth, height);
      }
    } else if (connect.Type == "true") {
      if (target.Type == "for") {
        let tmpX = source.x + source.width + lenLink / 2;
        let tmpY = source.y;
        drawNode(tmpX, tmpY, minWidth, 120, target.Label);
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
        let tmpX = source.x + source.width + lenLink / 2;
        let tmpY = source.y;
        if (!target.drawn) {
          nodes[target.Id].drawn = true;
          saveCordinates(target, tmpX, tmpY, minWidth * 2, height);
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
          drawIfNode(target.x, target.y, minWidth, ifHeight, target.Label);
          saveCordinates(target, target.x, target.y, minWidth * 2, ifHeight);
        }
      } else {
        let tmpWidth = decideWidth(target.Label, minWidth);
        let tmpX = source.x + source.width + lenLink / 2;
        let tmpY = source.y;
        drawNode(tmpX, tmpY, tmpWidth, height, target.Label);
        saveCordinates(target, tmpX, tmpY, tmpWidth, height);
      }
    } else if (connect.Type == "false") {
      if (target.Type == "else if" || target.Type == "if") {
        let tmpX = source.x + source.width + lenLink / 2;
        let tmpY = source.y + source.height;
        if (!target.drawn) {
          nodes[target.Id].drawn = true;
          saveCordinates(target, tmpX, tmpY, minWidth * 2, height);
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
          drawIfNode(target.x, target.y, minWidth, ifHeight, target.Label);
          saveCordinates(target, target.x, target.y, minWidth * 2, ifHeight);
        }
      } else if (target.Type == "loop") {
        let tmpX = source.x + source.width + lenLink / 2;
        let tmpY = source.y + source.height;
        drawNode(tmpX, tmpY, minWidth, 120, target.Label);
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
        let tmpX = source.x + source.width + lenLink / 2;
        let tmpY = source.y + source.height;
        drawNode(tmpX, tmpY, tmpWidth, height, target.Label);
        saveCordinates(target, tmpX, tmpY, tmpWidth, height);
      }
    }
    deepestY[target.Depth] = target.y + target.height;
    drawLink(source, target, connect);
    if(target.Type == "methodCall"){
      console.log("methodCall link:",target.Label, source.x, source.y, target.x, target.y);
      drawMethodCallLink(target.Label, target.x + target.width, target.y + target.height / 2);
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

  function drawNode(x, y, width, height, label) {
    svg
      .append("rect")
      .attr("x", x)
      .attr("y", y)
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "white")
      .attr("stroke", "black")
      .attr("stroke-width", 1);
    svg
      .append("text")
      .attr("x", x + width / 2)
      .attr("y", y + height / 2)
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .text(label);
  }
  function drawIfNode(x, y, width, height, label) {
    const points = [
      [x, y],
      [x, y + height],
      [x + width * 2, y + height],
      [x + 1.5 * width, y + height / 2],
      [x + width * 2, y],
    ]
      .map(([px, py]) => `${px},${py}`)
      .join(" ");

    svg
      .append("polygon")
      .attr("points", points)
      .attr("fill", "white")
      .attr("stroke", "black")
      .attr("stroke-width", 1);
    svg
      .append("text")
      .attr("x", x + width)
      .attr("y", y + height / 2)
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .text(label);
  }
  function drawLink(source, target, link) {
    let x1, y1, x2, y2;

    if (link.Type === "loop") {
      x1 = source.x + source.width;
      y1 = source.y + source.height / 2;
      x2 = target.x;
      y2 = target.y;
    } else if (link.Type === "true") {
      x1 = source.x + source.width;
      y1 = source.y;
      x2 = target.x;
      y2 = target.y;
    } else if (link.Type === "false") {
      x1 = source.x + source.width;
      y1 = source.y + source.height;
      x2 = target.x;
      y2 = target.y;
    } else {
      x1 = source.x;
      y1 = source.y + source.height;
      x2 = target.x;
      y2 = target.y;

      if (source.Type === "start") {
        x1 = source.x + source.width / 2;
        y1 = source.y + source.height;
      }
      if (target.Type === "end") {
        x2 = target.x + target.width / 2;
        y2 = target.y;
      }
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
