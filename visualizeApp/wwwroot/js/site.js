//画面表示の変更。エディターと可視化の標示
function updateView() {
    const editorCol = document.querySelector('.col-4');
    const visualCol = document.querySelector('.col-8');

    const showEditor = document.getElementById('toggleEditor').checked;
    const showVisual = document.getElementById('toggleVisual').checked;

    editorCol.classList.toggle('d-none', !showEditor);
    visualCol.classList.toggle('d-none', !showVisual);

    if (showEditor && showVisual) {
        editorCol.classList.remove('w-100');
        visualCol.classList.remove('w-100');
    } else if (showEditor) {
        editorCol.classList.add('w-100');
        visualCol.classList.remove('w-100');
    } else if (showVisual) {
        visualCol.classList.add('w-100');
        editorCol.classList.remove('w-100');
    }

    if (window.editorInstance) {
        window.editorInstance.layout();
    }
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("uploadSection").style.display = "block";
    document.getElementById("visualSection").style.display = "none";
    document.getElementById('legend').classList.add('d-none');
    updateView();
    callGraphData = "";
});

//monaco editorの設定。変更が加えられたらpostリクエスト送信.
document.addEventListener('DOMContentLoaded', function () {
    if (typeof require !== 'undefined') {
        require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.34.1/min/vs' } });

        require(['vs/editor/editor.main'], function () {
            // Monaco Editor 初期化
            const editor = monaco.editor.create(document.getElementById('code-editor'), {
                language: 'csharp',
                theme: 'vs-dark',
                automaticLayout: true
            });
            window.editorInstance = editor;

            // 行ハイライト
            window.highlightDecoration = [];

            function highlightLine(lineNumber) {
                if (!lineNumber || lineNumber < 1) return;
                const model = editor.getModel();
                if (!model || model.getLineCount() < 3) {
                    window.highlightDecoration = editor.deltaDecorations(window.highlightDecoration, []);
                    return;
                }

                const maxColumn = model.getLineMaxColumn(lineNumber);
                window.highlightDecoration = editor.deltaDecorations(window.highlightDecoration, [
                    {
                        range: new monaco.Range(lineNumber, 1, lineNumber, maxColumn),
                        options: {
                            isWholeLine: true,
                            className: 'highlight-line'
                        }
                    }
                ]);
            }
            // window.editorInstance.highlightLine = highlightLine;
            window.highlightLine = highlightLine;

            // 編集時のデバウンス送信
            let debounceTimer;
            editor.onDidChangeModelContent(function () {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(async () => {
                    const editedCode = editor.getValue();
                    if (editedCode.trim() === "") {
                        document.getElementById("uploadButton").disabled = false;
                        document.getElementById("uploadSection").style.display = "block";
                        document.getElementById("visualSection").style.display = "none";
                        document.getElementById('legend').classList.add('d-none');
                        return;
                    }
                    const blob = new Blob([editedCode], { type: "text/plain" });
                    const file = new File([blob], "edited.cs");

                    const formData = new FormData();
                    formData.append('csFile', file);

                    const response = await fetch('/Home/ProcessFile', {
                        method: 'POST',
                        body: formData
                    }).catch(err => {
                        console.error("Fetch error:", err);
                    });

                    if (!response || !response.ok) {
                        console.error("サーバーからの応答が不正です");
                        return;
                    }
                    updateCallGraph();
                }, 1000);
            });
        });
    } else {
        console.error('RequireJSが読み込まれていません');
    }
});

// ファイルアップロード処理。editorへの標示のみ行い、postリクエストはeditorのほうから
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('uploadForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const fileInput = document.getElementById('csFile');
        if (fileInput.files.length === 0) {
            alert('ファイルを選択してください');
            return;
        }

        document.getElementById("uploadButton").disabled = true;

        const file = fileInput.files[0];

        // 読み込んでエディタに表示
        const reader = new FileReader();
        reader.onload = function (e) {
            const content = e.target.result;
            if (window.editorInstance) {
                window.editorInstance.setValue(content);
            }
        };
        reader.onerror = function () {
            alert("ファイルの読み込みに失敗しました。");
        };
        reader.readAsText(file);
    });
});

//標示しているコールグラフ。比較を行い、変更があれば再描画
callGraphData = "";
// padDiagram.json の存在チェックと可視化
function updateCallGraph() {
    fetch("/data/callGraph.json", { cache: "no-store" })
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
                    if(data.nodes.length > 1 && window.displayedMethods != null){
                        getPadData(100, 200);
                    }
                    else if(data.nodes.length === 1 && window.displayedMethods != null){
                        getPadData(50, 30);
                    }
                    else if(data.nodes.length === 0){
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

//PADで標示しているメソッド
window.displayedMethods = null;
window.displayedPAD = "";
//jsonから必要なPADデータの取得
function getPadData(posX, posY) {
    const svg = d3.select("#pad-layer");

    if (window.displayedMethods == null) {
        d3.select("#pad-layer").selectAll("*").remove();
        window.displayedPAD = "";
        return;
    }

    fetch("/data/padDiagram.json", { cache: "no-store" })
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
            visualize(filtered, posX, posY);
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