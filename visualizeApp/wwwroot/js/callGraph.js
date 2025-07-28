function drawCallGraph(data) {
    const svg = d3.select("#graph-layer")
    const width = +svg.attr("width") || 800;
    const height = +svg.attr("height") || 600;

    svg.selectAll("*").remove();

    if (data.nodes.length === 1) {
        // ノードが1つだけのときは中央に長方形で表示
        const node = svg.append("g")
            .attr("transform", `translate(${50}, ${30})`)
            .on("click", () => {
                const [className, methodName] = data.nodes[0].label.split(/\./); 
                getPadData(className, methodName, 0, 0);
            });

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

        return;
    }

    // 複数ノードの場合はforceレイアウト
    const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2));

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
        .attr("marker-end", "url(#arrowhead)");


    const node = svg.append("g")
        .attr("stroke", "#333")
        .attr("stroke-width", 1.5)
        .selectAll("g")
        .data(data.nodes)
        .enter().append("g")
        .classed("nodeStyle", true)
        .on("click", (event, d) => {
            const [className, methodName] = d.label.split(/\./);  
            getPadData(className, methodName, d.x, d.y);
            //d.fx = 50;
            //d.fy = 30;

            //simulation.alpha(1).restart();

            //const [className, methodName] = d.label.split(/\./);
            //getPadData(className, methodName, 0, 0);
        });

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

