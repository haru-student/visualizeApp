import { sendLogData } from "./log.js";

async function initMonaco() {
  if (typeof require === 'undefined') {
    throw new Error('RequireJSが読み込まれていません');
  }

  require.config({
    paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.34.1/min/vs' }
  });

  return new Promise((resolve) => {
    require(['vs/editor/editor.main'], function () {
      const editor = monaco.editor.create(
        document.getElementById('code-editor'),
        {
          language: 'csharp',
          theme: 'vs-dark',
          automaticLayout: true
        }
      );
      window.editorInstance = editor;
      resolve(editor); // ← ここが超重要
    });
  });
}

function getTestId() {
  const app = document.getElementById("code-editor");
  return app.dataset.testId; 
}

async function init() {
  const testId = getTestId();
  const editor = await initMonaco(); 
  const res = await fetch(`/data/${testId}/code.txt`);
  const text = await res.text();
  window.editorInstance.setValue(text);

  sendLogData('start', null, null, null, null);
}

init();