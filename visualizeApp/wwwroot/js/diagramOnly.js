import { drawCallGraph } from "./callGraph.js";
import { sendLogData } from "./log.js";
import { initMemoModule } from "./memo.js";
import { drawPAD } from "./pad.js";
import { getTestId } from "./test.js";

let testCallGraphPath = "";

let callGraphData = "";
// padDiagram.json の存在チェックと可視化
function updateCallGraph() {
    fetch(testCallGraphPath, { cache: "no-store" })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(data => {
            if (data) {
                document.getElementById('legend').classList.remove('d-none');
                const newData = JSON.stringify(data);
                if (newData != callGraphData) {
                    d3.select("#graph-layer").selectAll("*").remove();
                    d3.select("#pad-layer").selectAll("*").remove();
                    drawCallGraph(data);
                    callGraphData = newData;
                }
                else {
                    if(data.nodes.length > 1 && window.displayedMethods != null){
                        getPadData(100, 200);
                    }
                    else if(data.nodes.length === 1 && window.displayedMethods != null){
                        getPadData(50, 30);
                    }
                    else if(data.nodes.length === 0){
                        document.getElementById('legend').classList.add('d-none');
                    }
                }
            }
            else {
                document.getElementById('legend').classList.add('d-none');
            }
        })
        .catch(() => {
            document.getElementById('legend').classList.add('d-none');
        });
}

let testPADPath = "";
// PADで標示しているメソッド
window.displayedMethods = null;
window.displayedPAD = "";
// jsonから必要なPADデータの取得
export function getPadData(posX, posY) {
    const svg = d3.select("#pad-layer");

    if (window.displayedMethods == null) {
        d3.select("#pad-layer").selectAll("*").remove();
        window.displayedPAD = "";
        return;
    }

    fetch(testPADPath, { cache: "no-store" })
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

export function getMethodCallNode() {
    return fetch(testPADPath, { cache: "no-store" })
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
function init() {
    const testId = getTestId();
    if (testId) {
        testCallGraphPath = `/data/${testId}/callGraph.json`;
        testPADPath = `/data/${testId}/padDiagram.json`;
        updateCallGraph();

        if (window.initializedDiagram) return;

        initMemoModule();
        if (testId !== 'tmp')
            sendLogData('start', null, null, null, null);

        document.cookie = `test=${testId}; path=/; max-age=${60 * 60 * 24}`;
        document.cookie = `type=diagram; path=/; max-age=${60 * 60 * 24}`;
        
        window.initializedDiagram = true;
    } else {
        window.location = "/test";
    }
}

init();

