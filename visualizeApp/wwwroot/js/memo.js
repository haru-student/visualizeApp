// memo.js
import d3Tip from "https://cdn.skypack.dev/d3-tip@0.9.1";

let openId;
let openClass;
let openMethod;
let memoData = [];
let panel, textarea, closeBtn, saveBtn;
let tip = null;

export function initMemoModule() {
  panel = document.getElementById("memo-panel");
  textarea = document.getElementById("memo-text");
  closeBtn = document.getElementById("close-memo");
  saveBtn = document.getElementById("save-memo");
  closeBtn.addEventListener("click", () => closeMemoEditor());
  saveBtn.addEventListener("click", () => saveMemo());
  initMemoTooltip();
}

export function openMemoEditor(node) {
  openId = node.Id;
  openClass = node.Class;
  openMethod = node.Method;

  const existing = getMemoData();
  if (existing !== null) {
    textarea.value = existing.Memo;
  } else {
    textarea.value = "";
  }
  // 表示
  panel.classList.add("open");
}

export function closeMemoEditor() {
  panel.classList.remove("open");
}

function saveMemo() {
  const existing = getMemoData();
  if (existing !== null) {
    existing.Memo = textarea.value;
  } else {
    memoData.push({
      Class: openClass,
      Method: openMethod,
      Id: openId,
      Memo: textarea.value,
    });
  }
  panel.classList.remove("open");
}

function getMemoData() {
  const existing = memoData.find(
    (m) => m.Class === openClass && m.Method === openMethod && m.Id === openId
  );
  if (existing) {
    return existing;
  } else {
    return null;
  }
}

function initMemoTooltip() {
  tip = d3Tip()
    .attr("class", "d3-tip memo-tooltip")
    .offset([-10, 0])
    .html((d) => `<div>${d.Memo}</div>`);

  // あなたの SVG の ID に合わせて
  const svg = d3.select("#pad-layer");
  svg.call(tip);
}

//ノードホバー時にメモの表示
export function showMemo(detail, element) {
  openClass = detail.Class;
  openMethod = detail.Method;
  openId = detail.Id;
  const memoData = getMemoData();
  if (memoData === null || memoData.Memo === "") return;

  const memo = memoData !== null ? memoData.Memo : "メモがありません";

  if (tip === null) initMemoTooltip();

  try {
    tip.show({ Memo: memo }, element);
  } catch (e) {
    console.warn("Tooltip failed:", e, element);
  }
}

// ホバーアウト時にメモを非表示
export function hideMemo() {
  if (tip) tip.hide();
}
