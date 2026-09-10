"use strict";
// =========================================================
// メモ帳アプリ 基本画面 - script.ts (TypeScript ソース)
//
// index.html からは直接読み込めないため、コンパイル後の
// script.js を <script src="script.js"> で読み込む構成です。
//
//   tsc script.ts --target ES2020 --outFile script.js
//
// -----------------------------------------------------------
// 機能一覧 No.1 を実装しています。
//   処理ID   : S-001
//   処理名   : 選択実行
//   場所     : 基本画面＞識別ID:T-008（カレンダーの日付選択）
//   アクション: 識別ID:T-006（カレンダー(月単位)）から選択した
//              日付の識別ID:T-016（入力＝本日のメモ 各行の内容）を、
//              識別ID:T-005（本日のメモ）と識別ID:T-007（ToDoリスト）
//              に表示させる。
//
// 機能一覧 No.2 を実装しています。
//   処理ID   : S-002
//   処理名   : 遷移実行
//   場所     : 基本画面＞識別ID:T-009（編集ボタン）
//   アクション: 選択した日付の詳細画面（detail.html）に遷移する。
//
// 機能一覧 No.3・No.4 を実装しています（表示側）。
//   処理ID   : S-003（チェックマーク登録）/ S-004（チェックマーク削除）
//   場所     : 詳細画面＞識別ID:T-017（チェックボックス）
//   アクション: T-017で、チェックを入れた行をToDoリストに表示する／
//              チェックを外した行をToDoリストから削除する。
//   ※ チェックボックス自体の操作は detail.html 側で行います。
//     このファイルでは、detail.html 側での操作結果（どの行が
//     チェックされているか）を localStorage 経由で読み込み、
//     識別ID:T-005（本日のメモ）と識別ID:T-007（ToDoリスト）の
//     表示に反映しています。
//
// ※ 保存・遷移・確定など、他の機能一覧の行はまだ未実装です。
// ※ 日付ごとのメモ・ToDoデータは、識別ID:T-016（本日のメモ 各行の
//    入力内容）を唯一のデータソースとして、
//      ・本日のメモ（T-005）＝ 全行のテキストを連結したもの
//      ・ToDoリスト（T-007） ＝ チェックが入っている行のテキスト
//    としてその都度導出しています。試験実装のため、
//    9/10・9/15・9/22の3日分のみ初期データがあります。
// =========================================================
const LINES_PER_DAY = 10;
const STORAGE_KEY = "memoAppLines";
function emptyLines() {
    return Array.from({ length: LINES_PER_DAY }, () => ({ text: "", checked: false }));
}
function padLines(lines) {
    const result = emptyLines();
    lines.forEach((line, index) => {
        if (index < result.length) {
            result[index] = line;
        }
    });
    return result;
}
// 日付ごとの初期データ（仮データ・試験実装）
// ※ detail.ts 側にも同じ内容を用意しています（重複）。
//    保存機能（S-005）を実装する際は、共通のデータソースに
//    まとめることを想定しています。
const DEFAULT_LINES = {
    10: padLines([
        { text: "14:00〜 定例会議", checked: false },
        { text: "資料を事前に確認しておく", checked: true },
        { text: "買い物リストの整理", checked: true },
        { text: "企画書のレビューを行う", checked: true },
        { text: "メールの返信をする", checked: false },
        { text: "週次報告を提出する", checked: true },
    ]),
    15: padLines([
        { text: "15:00〜 歯科検診", checked: false },
        { text: "帰りにクリーニング店に立ち寄る", checked: true },
        { text: "検診の予約を確認する", checked: true },
    ]),
    22: padLines([]),
};
function readStore() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    }
    catch {
        return {};
    }
}
/** その日の識別ID:T-016（本日のメモ 各行）を読み込む */
function loadLines(day) {
    const store = readStore();
    const key = String(day);
    if (store[key])
        return padLines(store[key]);
    if (DEFAULT_LINES[day])
        return DEFAULT_LINES[day];
    return emptyLines();
}
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
/** 識別ID:T-005（本日のメモ）の表示を更新する */
function renderMemo(day) {
    const memoEl = document.getElementById("memo-display");
    if (!memoEl)
        return;
    const lines = loadLines(day);
    const memoText = lines
        .map((line) => line.text)
        .filter((text) => text.trim() !== "")
        .join("\n");
    if (memoText) {
        memoEl.innerHTML = escapeHtml(memoText).replace(/\n/g, "<br>");
    }
    else {
        memoEl.innerHTML = '<span class="empty-message">この日のメモは登録されていません</span>';
    }
}
/** 識別ID:T-007（ToDoリスト）の表示を更新する
 *  処理ID:S-003「チェックマーク登録」・S-004「チェックマーク削除」の反映
 */
function renderTodoList(day) {
    const todoEl = document.getElementById("todo-display");
    if (!todoEl)
        return;
    const lines = loadLines(day);
    const todoLabels = lines
        .filter((line) => line.checked && line.text.trim() !== "")
        .map((line) => line.text);
    todoEl.innerHTML = "";
    if (todoLabels.length === 0) {
        const li = document.createElement("li");
        li.className = "todo-list__empty";
        li.textContent = "この日のToDoはありません";
        todoEl.appendChild(li);
        return;
    }
    todoLabels.forEach((label) => {
        const li = document.createElement("li");
        li.className = "todo-list__item";
        const check = document.createElement("span");
        check.className = "todo-list__check";
        const labelEl = document.createElement("span");
        labelEl.className = "todo-list__label";
        labelEl.textContent = label;
        li.appendChild(check);
        li.appendChild(labelEl);
        todoEl.appendChild(li);
    });
}
let selectedDay = null;
/**
 * 識別ID:T-008（選択）：カレンダーで日付を選択したときの処理
 * 処理ID:S-001「選択実行」
 */
function selectDay(day, dayButton) {
    const table = dayButton.closest(".calendar__table");
    if (table) {
        table.querySelectorAll("td.is-selected").forEach((td) => {
            td.classList.remove("is-selected");
        });
    }
    const cell = dayButton.closest("td");
    if (cell) {
        cell.classList.add("is-selected");
    }
    selectedDay = day;
    renderMemo(day);
    renderTodoList(day);
}
/**
 * 識別ID:T-009（編集ボタン）：選択した日付の詳細画面に遷移する処理
 * 処理ID:S-002「遷移実行」
 */
function goToDetail() {
    if (selectedDay === null)
        return;
    window.location.href = "detail.html?day=" + encodeURIComponent(String(selectedDay));
}
document.addEventListener("DOMContentLoaded", () => {
    const dayButtons = document.querySelectorAll(".calendar__day");
    dayButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const day = Number(button.dataset.day);
            if (!Number.isNaN(day)) {
                selectDay(day, button);
            }
        });
    });
    // 初期表示：本日の日付（2026/09/10）を選択状態にする
    const initialButton = document.querySelector('.calendar__day[data-day="10"]');
    if (initialButton) {
        selectDay(10, initialButton);
    }
    const editButton = document.getElementById("edit-button");
    if (editButton) {
        editButton.addEventListener("click", goToDetail);
    }
});
