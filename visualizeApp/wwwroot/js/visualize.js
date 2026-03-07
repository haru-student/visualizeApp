import { drawCallGraph, registerPadModuleForScreen } from "./callGraph.js";
import { drawPAD } from "./pad.js";

let callGraphData = "";
// callGraph の取得と可視化
export function updateCallGraph() {
    fetch(`/api/visualize/call-graph`, { cache: "no-store" })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(data => {
            if (data) {
                document.getElementById("uploadSection").style.display = "none";
                document.getElementById("visualSection").style.display = "block";
                document.getElementById('legend').classList.remove('d-none');
                const newData = JSON.stringify(data);
                if (newData != callGraphData) {
                    d3.select("#graph-layer").selectAll("*").remove();
                    d3.select("#pad-layer").selectAll("*").remove();
                    drawCallGraph(data);
                    callGraphData = newData;
                }
                else {
                    if (data.nodes.length > 1 && window.displayedMethods != null) {
                        getPadData(100, 200);
                    }
                    else if (data.nodes.length === 1 && window.displayedMethods != null) {
                        getPadData(50, 30);
                    }
                    else if (data.nodes.length === 0) {
                        document.getElementById("uploadSection").style.display = "block";
                        document.getElementById("visualSection").style.display = "none";
                        document.getElementById('legend').classList.add('d-none');
                    }
                }
            }
            else {
                document.getElementById("uploadSection").style.display = "block";
                document.getElementById("visualSection").style.display = "none";
                document.getElementById('legend').classList.add('d-none');
            }
        })
        .catch(() => {
            document.getElementById("uploadButton").disabled = false;
            document.getElementById("uploadSection").style.display = "block";
            document.getElementById("visualSection").style.display = "none";
            document.getElementById('legend').classList.add('d-none');
        });
}

// PADで標示しているメソッド
window.displayedMethods = null;
window.displayedPAD = "";

// jsonから必要なPADデータの取得
export function getPadData(posX, posY) {
    if (window.displayedMethods == null) {
        d3.select("#pad-layer").selectAll("*").remove();
        window.displayedPAD = "";
        return;
    }

    fetch(`/api/visualize/pad-diagram`, { cache: "no-store" })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(data => {
            const [className, methodName] = window.displayedMethods.split(/\./);
            const filtered = extractMethodDiagram(data, className, methodName);

            if (filtered.Nodes.length === 0) {
                throw new Error("対象のノードが存在しません");
            }
            const newPAD = JSON.stringify(filtered);
            if (newPAD === window.displayedPAD) {
                console.log("同じPADなので再描画しません");
                return;
            }
            d3.select("#pad-layer").selectAll("*").remove();
            drawPAD(filtered, posX, posY);
            window.displayedPAD = newPAD;
        })
        .catch(err => {
            console.error(err);
        });
}

export function getMethodCallNode() {
    return fetch(`/api/visualize/pad-diagram`, { cache: "no-store" })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(data => {
            return data.Nodes.filter(
                node => node.Type === "methodCall"
            );
        })
        .catch(err => {
            console.error(err);
            return [];
        });
}

function extractMethodDiagram(fullDiagram, className, methodName) {
    const nodes = fullDiagram.Nodes.filter(
        node => node.Class === className && node.Method === methodName
    );

    const links = fullDiagram.Links.filter(
        link => link.Class === className && link.Method === methodName
    );

    return {
        Nodes: nodes,
        Links: links
    };
}

registerPadModuleForScreen("index", { getPadData, getMethodCallNode });
