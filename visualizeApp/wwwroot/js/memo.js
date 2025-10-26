// memo.js
let openNode;
let panel, title, textarea, closeBtn, saveBtn;

export function initMemoModule() {
    panel = document.getElementById("memo-panel");
    title = document.getElementById("memo-title");
    textarea = document.getElementById("memo-text");
    closeBtn = document.getElementById("close-memo");
    saveBtn = document.getElementById("save-memo");
    closeBtn.addEventListener("click", () => closeMemo());
    saveBtn.addEventListener("click", () => saveMemo());
}

export function openMemo(nodeId) {
    openNode = nodeId;

    // 対象ノードのIDをセット
    //   title.textContent = `Node: ${nodeId}`;
    //   textarea.value = "";

    // 表示
    panel.classList.add("open");
    console.log(`Memo opened for node ${nodeId}`);
    }

function closeMemo() {
    panel.classList.remove("open");
}

function saveMemo() {
    // openNodeをもとにjsonに保存
    panel.classList.remove("open");
}

