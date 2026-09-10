"use strict";
// =========================================================
// メモ帳アプリ 詳細画面（本日のメモ 編集画面）- detail.ts (TypeScript ソース)
//
// detail.html からは直接読み込めないため、コンパイル後の
// detail.js を <script src="detail.js"> で読み込む構成です。
//
//   tsc detail.ts --target ES2020 --outFile detail.js
//
// -----------------------------------------------------------
// 機能一覧 No.2 を実装しています。
//   処理ID   : S-002
//   処理名   : 遷移実行
//   場所     : 基本画面＞識別ID:T-009（編集ボタン）
//   アクション: 選択した日付の詳細画面に遷移する。
//   ※ index.html（script.ts）側で detail.html?day=15 の形式で
//     日付を渡しているため、ここではURLクエリパラメータ「day」を
//     読み取り、その日付の内容（⑯入力・⑳ToDoリスト）を表示します。
//     試験実装のため、9/10・9/15・9/22の3日分のみデータがあります。
//
// ※ 登録・削除・保存など、他の機能一覧の行はまだ未実装です。
//    入力欄・チェックボックスは現時点でも読み取り専用のままです。
//
// ※ このファイルのサンプルデータ（memoData）は、index.html側の
//    script.ts に定義されているものと同じ内容を、試験実装として
//    重複して持たせています。保存機能（S-005）を実装する際は、
//    共通のデータソース（例：共有のdata.jsファイルや保存領域）に
//    まとめることを想定しています。
// =========================================================
const EMPTY_LINES = Array.from({ length: 10 }, () => ({
    text: "",
    checked: false,
}));
function makeLines(lines) {
    const result = EMPTY_LINES.map((line) => ({ ...line }));
    lines.forEach((line, index) => {
        if (index < result.length) {
            result[index] = line;
        }
    });
    return result;
}
// 日付ごとの詳細画面データ（仮データ・試験実装）
const detailData = {
    10: {
        memoLines: makeLines([
            { text: "14:00〜 定例会議", checked: true },
            { text: "資料を事前に確認しておく", checked: false },
            { text: "買い物リストの整理", checked: false },
            { text: "", checked: false },
            { text: "", checked: true },
            { text: "", checked: true },
        ]),
        todos: [
            { label: "企画書のレビュー", done: false },
            { label: "メールの返信", done: false },
            { label: "週次報告の提出", done: true },
            { label: "資料の印刷", done: false },
        ],
    },
    15: {
        memoLines: makeLines([
            { text: "15:00〜 歯科検診", checked: false },
            { text: "帰りにクリーニング店に立ち寄る", checked: false },
        ]),
        todos: [
            { label: "検診の予約確認", done: true },
            { label: "クリーニング受け取り", done: false },
        ],
    },
    22: {
        memoLines: makeLines([]),
        todos: [],
    },
};
/** URLの ?day=15 からその値を取得する（無ければ null） */
function getDayFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("day");
    if (value === null)
        return null;
    const day = Number(value);
    return Number.isNaN(day) ? null : day;
}
/** 識別ID:T-014（見出し4）：日付表示を更新する（2026年9月固定） */
function renderDateHeading(day) {
    const headingEl = document.getElementById("date-heading");
    if (!headingEl)
        return;
    const dayText = String(day).padStart(2, "0");
    headingEl.textContent = `2026/09/${dayText}`;
}
/** 識別ID:T-016・T-017（入力欄・チェックボックス）を更新する */
function renderInputList(day) {
    const listEl = document.getElementById("input-list");
    if (!listEl)
        return;
    const data = detailData[day];
    const lines = data ? data.memoLines : EMPTY_LINES;
    listEl.innerHTML = "";
    lines.forEach((line) => {
        const li = document.createElement("li");
        li.className = "input-list__row";
        const input = document.createElement("input");
        input.type = "text";
        input.className = "input-list__field";
        input.value = line.text;
        input.readOnly = true;
        const check = document.createElement("span");
        check.className = "input-list__check" + (line.checked ? " is-checked" : "");
        li.appendChild(input);
        li.appendChild(check);
        listEl.appendChild(li);
    });
}
/** 識別ID:T-020（ToDoリスト 参照表示）を更新する */
function renderTodoList(day) {
    const todoEl = document.getElementById("todo-display");
    if (!todoEl)
        return;
    const data = detailData[day];
    const todos = data ? data.todos : [];
    todoEl.innerHTML = "";
    if (todos.length === 0) {
        const li = document.createElement("li");
        li.className = "todo-list__empty";
        li.textContent = "この日のToDoはありません";
        todoEl.appendChild(li);
        return;
    }
    todos.forEach((todo) => {
        const li = document.createElement("li");
        li.className = "todo-list__item" + (todo.done ? " is-done" : "");
        const check = document.createElement("span");
        check.className = "todo-list__check";
        const label = document.createElement("span");
        label.className = "todo-list__label";
        label.textContent = todo.label;
        li.appendChild(check);
        li.appendChild(label);
        todoEl.appendChild(li);
    });
}
document.addEventListener("DOMContentLoaded", () => {
    const day = getDayFromQuery() ?? 10; // dayが無い場合は本日(10日)を既定表示とする
    renderDateHeading(day);
    renderInputList(day);
    renderTodoList(day);
});
