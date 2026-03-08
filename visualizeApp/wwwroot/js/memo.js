// memo.js
import { sendLogData } from "./log.js";

let editingId = null;
let editingClass = null;
let editingMethod = null;
let hoverId = null;
let hoverClass = null;
let hoverMethod = null;
let memoData = [];
let panel, textarea, closeBtn, saveBtn;
let tip = null;
let isTipShown = false;
let fallbackTooltip = null;

let memoTimer = null;
let d3TipFactory = null;
let d3TipFactoryPromise = null;

function loadD3TipFactory() {
  if (d3TipFactory) return Promise.resolve(d3TipFactory);
  if (d3TipFactoryPromise) return d3TipFactoryPromise;

  d3TipFactoryPromise = import("https://cdn.skypack.dev/d3-tip@0.9.1")
    .then((mod) => {
      d3TipFactory = mod?.default ?? null;
      return d3TipFactory;
    })
    .catch((err) => {
      console.warn("d3-tip の読み込みに失敗しました。メモの表示をフォールバックします。", err);
      d3TipFactory = null;
      return null;
    });

  return d3TipFactoryPromise;
}

export function initMemoModule() {
  panel = document.getElementById("memo-panel");
  textarea = document.getElementById("memo-text");
  closeBtn = document.getElementById("close-memo");
  saveBtn = document.getElementById("save-memo");

  closeBtn.addEventListener("click", () => closeMemoEditor());
  saveBtn.addEventListener("click", () => saveMemo());
  loadD3TipFactory().then(() => initMemoTooltip());
}

export function openMemoEditor(node) {
  if (
    panel.classList.contains("open") &&
    editingId === node.Id &&
    editingClass === node.Class &&
    editingMethod === node.Method
  ) {
    return;
  }

  editingId = node.Id;
  editingClass = node.Class;
  editingMethod = node.Method;

  const existing = getMemoData(editingClass, editingMethod, editingId);
  textarea.value = existing !== null ? existing.Memo : "";

  panel.classList.add("open");
  sendLogData("openMemoEditor", editingClass, editingMethod, editingId, null);
}

export function closeMemoEditor() {
  if (!panel.classList.contains("open")) return;

  panel.classList.remove("open");
  sendLogData("closeMemoEditor", editingClass, editingMethod, editingId, null);
}

function saveMemo() {
  const existing = getMemoData(editingClass, editingMethod, editingId);
  if (existing !== null) {
    existing.Memo = textarea.value;
  } else {
    memoData.push({
      Class: editingClass,
      Method: editingMethod,
      Id: editingId,
      Memo: textarea.value,
    });
  }

  panel.classList.remove("open");
  sendLogData("updateMemo", editingClass, editingMethod, editingId, {
    Memo: textarea.value,
  });
}

function getMemoData(className, methodName, id) {
  const existing = memoData.find(
    (m) => m.Class === className && m.Method === methodName && m.Id === id
  );
  return existing ?? null;
}

function initMemoTooltip() {
  if (!d3TipFactory) return;

  tip = d3TipFactory()
    .attr("class", "d3-tip memo-tooltip")
    .offset([-10, 0])
    .html((d) => `<div>${d.Memo}</div>`);

  const svg = d3.select("#pad-layer");
  svg.call(tip);
}

function ensureFallbackTooltip() {
  if (fallbackTooltip) return fallbackTooltip;

  const el = document.createElement("div");
  el.className = "memo-tooltip";
  el.style.position = "fixed";
  el.style.display = "none";
  el.style.pointerEvents = "none";
  el.style.zIndex = "20";
  document.body.appendChild(el);

  fallbackTooltip = el;
  return fallbackTooltip;
}

function showFallbackTooltip(memo, element) {
  const el = ensureFallbackTooltip();
  el.textContent = memo;

  const rect = element.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top - 12;

  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.transform = "translate(-50%, -100%)";
  el.style.display = "block";
}

function hideFallbackTooltip() {
  if (!fallbackTooltip) return;
  fallbackTooltip.style.display = "none";
}

// ノードホバー時にメモの表示
export function showMemo(detail, element) {
  hoverClass = detail.Class;
  hoverMethod = detail.Method;
  hoverId = detail.Id;

  const existing = getMemoData(hoverClass, hoverMethod, hoverId);
  if (existing === null || existing.Memo === "") return;

  const memo = existing.Memo;

  if (memoTimer !== null) {
    clearTimeout(memoTimer);
    memoTimer = null;
  }

  memoTimer = setTimeout(() => {
    try {
      if (tip === null) initMemoTooltip();

      if (tip) {
        tip.show({ Memo: memo }, element);
      } else {
        showFallbackTooltip(memo, element);
      }

      isTipShown = true;
      sendLogData("showMemo", hoverClass, hoverMethod, hoverId, { Memo: memo });
    } catch (e) {
      console.warn("Tooltip failed:", e, element);
    }

    memoTimer = null;
  }, 300);
}

// ホバーアウト時にメモを非表示
export function hideMemo() {
  if (memoTimer !== null) {
    clearTimeout(memoTimer);
    memoTimer = null;
    return;
  }

  if (!isTipShown) {
    hideFallbackTooltip();
    return;
  }

  isTipShown = false;
  if (tip) {
    tip.hide();
  }
  hideFallbackTooltip();

  const memo = getMemoData(hoverClass, hoverMethod, hoverId)?.Memo ?? null;
  sendLogData("hideMemo", hoverClass, hoverMethod, hoverId, { Memo: memo });
}
