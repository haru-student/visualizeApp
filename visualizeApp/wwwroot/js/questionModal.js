import { sendLogData } from "./log.js";

let qIds = [];
let testId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const openBtn = document.getElementById('answerBtn');
    const container = document.getElementById('questionContainer');

    if (openBtn) openBtn.disabled = true;

    try {
        container.replaceChildren();
        testId = getTestId();
        if (!testId) {
            if (openBtn) {
                openBtn.disabled = true;
            }
            return;
        }

        const response = await fetch(`/data/${testId}/question.json`, {
        cache: 'no-store'
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const questions = await response.json();
        
        if (!container) throw new Error("questionContainer が見つかりません");

        questions.forEach(q => {

            let html = `<div class="mb-4">
                            <label for="q-${q.id}" class="form-label fw-bold">Q${q.id}. ${q.question}</label>`;
            
            if (q.type === 'textarea') {
                html += `<textarea class="form-control" name="q-${q.id}" id="q-${q.id}" rows="5"></textarea>`;
            }  else if (q.type === 'text') {
                html += `<input type="text" class="form-control" name="q-${q.id}" id="q-${q.id}">`;
            }
            
            html += `</div>`;
            container.insertAdjacentHTML('beforeend', html);
            qIds.push(q.id);
        });
        initSubmitBtn();
        // 正常に終了したらボタンを有効化する
        if (openBtn) openBtn.disabled = false;

    } catch (error) {
        console.error("問題の読み込みに失敗しました:", error);
        
        if (openBtn) {
            openBtn.disabled = true;
        }
    }
});

function initSubmitBtn() {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.addEventListener("click", () => {
        let q_a = {};
        qIds.forEach(id => {
            const answer = document.getElementById(`q-${id}`).value;
            q_a[`q${id}`] = answer;
        })
        if (testId !== 'tmp') {
            var result = confirm('解答を送信しますか？');
            if (result) {
                sendLogData('submit', null, null, null, q_a);
                window.location = "/test";
                document.cookie = `${testId}=done; path=/; max-age=${60 * 60 * 24}`;
            }
        } else {
            var result = confirm('解答を送信しますか？');
            if (result)
                window.location = "/test";
        }
    });
}

function getTestId() {
  const el = document.getElementById("testHeader");
  const value = el.dataset.testId;
  return value ?? null;
}
