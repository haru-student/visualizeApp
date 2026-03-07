import { sendLogData } from "./log.js";
import { initMemoModule } from "./memo.js";
import { updateCallGraph } from "./visualize.js";

const SAMPLE_CODE = `using System;

class Program
{
    public static void Main()
    {
        Console.WriteLine("=== Start ===");

        Counter.CountTo(3); // メソッド呼び出し（別クラス）

        Console.WriteLine("=== End ===");
        Console.ReadLine();
    }
}

class Counter
{
    public static void CountTo(int limit)
    {
        for (int i = 1; i <= limit; i++)
        {
            Console.WriteLine($"Number: {i}");
        }

        int j = 0;
        while (j < limit)
        {
            if (j % 2 == 0)
            {
                Console.WriteLine($"Even: {j}");
            }
            else
            {
                Console.WriteLine($"Odd: {j}");
            }
            j++;
        }
    }
}
`;

function setSampleButtonDisabled(disabled) {
    const sampleButton = document.getElementById('sampleButton');
    if (!sampleButton) return;
    sampleButton.disabled = disabled;
}

function waitForRequire(timeoutMs = 8000, intervalMs = 100) {
    return new Promise((resolve) => {
        if (typeof require !== 'undefined') {
            resolve(true);
            return;
        }

        const startedAt = Date.now();
        const timer = setInterval(() => {
            if (typeof require !== 'undefined') {
                clearInterval(timer);
                resolve(true);
                return;
            }
            if (Date.now() - startedAt >= timeoutMs) {
                clearInterval(timer);
                resolve(false);
            }
        }, intervalMs);
    });
}

// monaco editorの設定
async function initMonaco() {
    const requireReady = await waitForRequire();
    if (requireReady) {
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
                        setSampleButtonDisabled(false);
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

                    await response.json();
                    updateCallGraph();
                    // 開始のログ送信
                    sendLogData('start', null, null, null, null);
                }, 1000);
            });
        }, function (err) {
            console.error('Monaco Editor の読み込みに失敗しました', err);
        });
    } else {
        console.error('RequireJSが読み込まれていません');
    }
}

// アップロード画面の設定
function initUpload() {
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
}

function initSampleButton() {
    const sampleButton = document.getElementById('sampleButton');
    if (!sampleButton) return;

    sampleButton.addEventListener('click', function (event) {
        event.preventDefault();
        if (!window.editorInstance) {
            console.warn("Monaco Editorがまだ初期化されていません");
            return;
        }
        setSampleButtonDisabled(true);

        window.editorInstance.setValue(SAMPLE_CODE);
        window.editorInstance.focus();
    });
}
function initView() {
    document.getElementById('toggleEditor').addEventListener('change', updateView);
    document.getElementById('toggleVisual').addEventListener('change', updateView);
    const mq = window.matchMedia('(max-width: 767px)');
    mq.addEventListener('change', onViewPortChanged);
    onViewPortChanged();
}

//画面表示の変更。エディターと可視化の標示
function updateView() {
    const editorCol = document.getElementById('editor-col');
    const visualCol = document.getElementById('visual-col');

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
        editorCol.classList.remove('w-100');
        visualCol.classList.add('w-100');
    } else {
        editorCol.classList.remove('w-100');
        visualCol.classList.remove('w-100');
    }

    if (window.editorInstance) {
        window.editorInstance.layout();
    }
}

function onViewPortChanged(e) {
    const editorCol = document.getElementById('editor-col');
    const uploadMessage = document.getElementById('uploadMessage');
    const visualCol = document.getElementById('visual-col');
    const isMobile = e?.matches ?? window.matchMedia('(max-width: 767px)').matches;

    if (isMobile) {
        uploadMessage.textContent = 'csファイルをアップロードしてください';
        editorCol.classList.add('d-none');
        visualCol.classList.add('w-100');
        visualCol.classList.remove('d-none');
    } else {
        uploadMessage.textContent = 'コードを書くか、csファイルをアップロードしてください';
        updateView();
    }
}

//初期化
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("uploadSection").style.display = "block";
    document.getElementById("visualSection").style.display = "none";
    document.getElementById('legend').classList.add('d-none');
    initMonaco();
    initUpload();
    initSampleButton();
    initView();
    initMemoModule();
    document.cookie = "test=; Max-Age=0; path=/";
    document.cookie = "type=; Max-Age=0; path=/";
});

